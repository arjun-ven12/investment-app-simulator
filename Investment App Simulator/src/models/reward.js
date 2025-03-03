const prisma = require('./prismaClient');

module.exports.getAllRewards = function getAllRewards() {
    return prisma.reward
        .findMany() 
        .then(rewards => {
            console.log('Rewards fetched from database:', rewards); // Debug log

            if (!rewards || rewards.length === 0) {
                throw new Error('No rewards found in the database.');
            }

            return rewards.map(reward => ({
                id: reward.id,
                rewardName: reward.rewardName,
                rewardDescription: reward.rewardDescription,
                cost: reward.cost
            }));
        })
        .catch(error => {
            console.error('Error fetching rewards:', error.message);
            throw error;
        });
};


function generateGiftCardCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    
    for (let i = 0; i < 15; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Format it like a real gift card (XXX-XXX-XXXXX)
    return `${code.slice(0, 5)}-${code.slice(5, 10)}-${code.slice(10, 15)}`;
}

module.exports.redeemReward = async function redeemReward(userId, rewardId) {
    if (!userId || !rewardId) {
        throw new Error('User ID and Reward ID are required');
    }

    try {
        // Ensure userId and rewardId are integers
        userId = parseInt(userId, 10);
        rewardId = parseInt(rewardId, 10);

        if (isNaN(userId) || isNaN(rewardId)) {
            throw new Error('Invalid User ID or Reward ID format');
        }

        // Fetch user wallet balance
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { wallet: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Fetch reward details
        const reward = await prisma.reward.findUnique({
            where: { id: rewardId },
            select: { cost: true }
        });

        if (!reward) {
            throw new Error('Reward not found');
        }

        // Check if user has enough money
        if (user.wallet < reward.cost) {
            throw new Error('Unable to redeem, not enough money!');
        }

        // Deduct reward cost from user wallet
        await prisma.user.update({
            where: { id: userId },
            data: { wallet: user.wallet - reward.cost }
        });

        // Generate a random gift card code
        const cardCode = generateGiftCardCode();

        // Insert redemption record with the generated gift card code
        const redemption = await prisma.redeemBy.create({
            data: {
                userId,
                rewardId,
                cardCode
            }
        });

        // **Increment rewardsExchanged in Referral table**
        await prisma.referral.updateMany({
            where: { userId: userId },
            data: { rewardsExchanged: { increment: 1 } }
        });

        console.log('Reward redeemed successfully:', redemption);
        return { 
            message: 'Reward redeemed successfully!',
            cardCode // Return the generated gift card code
        };
    } catch (error) {
        console.error('Error redeeming reward:', error.message);
        throw error;
    }
};


module.exports.getRedeemByUserId = async function getRedeemByUserId(userId) {
    if (!userId) {
        throw new Error('User ID is required');
    }

    try {
        userId = parseInt(userId, 10);
        if (isNaN(userId)) {
            throw new Error('Invalid User ID format');
        }

        const redeemedRewards = await prisma.redeemBy.findMany({
            where: { userId },
            include: {
                reward: true,
            }
        });

        if (!redeemedRewards.length) {
            throw new Error('No redeemed rewards found');
        }

        return redeemedRewards.map(redeem => ({
            rewardName: redeem.reward.rewardName,
            rewardDescription: redeem.reward.rewardDescription,
            cost: redeem.reward.cost,
            dateOrdered: redeem.dateOrdered,
            cardCode: redeem.cardCode
        }));
    } catch (error) {
        console.error('Error fetching redeemed rewards:', error.message);
        throw error;
    }
};

module.exports.spinReward = async function spinReward(userId) {
    if (!userId) {
        throw new Error('User ID is required');
    }

    try {
        userId = parseInt(userId, 10);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { wallet: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const spinCost = 30000;
        if (user.wallet < spinCost) {
            throw new Error('Not enough funds to spin the wheel!');
        }

        const rewards = await prisma.reward.findMany();
        const weightedRewards = [];

        rewards.forEach(reward => {
            for (let i = 0; i < reward.probability * 100; i++) {
                weightedRewards.push(reward);
            }
        });

        const randomIndex = Math.floor(Math.random() * weightedRewards.length);
        const selectedReward = weightedRewards[randomIndex];

        const cardCode = generateGiftCardCode();

        await prisma.user.update({
            where: { id: userId },
            data: { wallet: user.wallet - spinCost }
        });

        await prisma.redeemBy.create({
            data: {
                userId,
                rewardId: selectedReward.id,
                cardCode
            }
        });

        return {
            message: `🎉 You won a ${selectedReward.rewardName} Gift Card!`,
            reward: selectedReward.rewardName,
            cardCode
        };
    } catch (error) {
        console.error('Error spinning reward:', error.message);
        throw error;
    }
};

module.exports.getGrandPrizeWinners = async function getGrandPrizeWinners() {
    try {
        const grandPrizeWinners = await prisma.redeemBy.findMany({
            where: { rewardId: 11 }, // Grand Prize Reward ID
            include: { user: true },
            orderBy: { dateOrdered: 'desc' }
        });

        if (!grandPrizeWinners.length) {
            throw new Error('No grand prize winners found.');
        }

        return grandPrizeWinners.map(winner => ({
            username: winner.user.username,
            wonAt: winner.dateOrdered.toLocaleString()
        }));
    } catch (error) {
        console.error('Error fetching grand prize winners:', error.message);
        throw error;
    }
};