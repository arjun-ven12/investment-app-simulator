const prisma = require('./prismaClient');

module.exports.getReferralStats = function getReferralStats(userId) {
    if (!userId || typeof userId !== 'number') {
        throw new Error(`Invalid user ID: ${userId}`);
    }

    return prisma.referral
        .findFirst({
            where: { userId }, 
        })
        .then(referral => {
            console.log('Referral object from database:', referral); // Debug log
            if (!referral) {
                throw new Error(`Referral data for user ID "${userId}" not found`);
            }

            // Prepare referral stats
            return {
                referralSignups: referral.referralSignups,
                successfulReferrals: referral.successfulReferrals,
                rewardsExchanged: referral.rewardsExchanged,
                creditsEarned: referral.creditsEarned,
                referralLink: referral.referralLink,
            };
        })
        .catch(error => {
            console.error('Error fetching referral stats:', error.message);
            throw error;
        });
};

module.exports.updateReferral = async function updateReferral(userId, referralLink) {
    try {
        const referral = await prisma.referral.findUnique({
            where: { referralLink },
        });

        if (!referral) {
            throw new Error('Referral link not found!');
        }

        // Fetch the user data to check the creation time
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found!');
        }

        // Convert `createdAt` from GMT to GMT+8
        const userCreatedAtGMT = new Date(user.createdAt);
        const userCreatedAtGMTPlus8 = new Date(userCreatedAtGMT.getTime() + 8 * 60 * 60 * 1000);

        // Get the current time in GMT+8
        const currentTimeGMTPlus8 = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);

        // Calculate the time difference in hours
        const timeDifferenceInHours = (currentTimeGMTPlus8 - userCreatedAtGMTPlus8) / (1000 * 60 * 60);

        if (timeDifferenceInHours > 5) {
            throw new Error('You cannot use the referral system after 5 hours of account creation!');
        }

        // Check the `successfulReferrals` for the user
        const userReferralStats = await prisma.referral.findFirst({
            where: { userId },
            select: { successfulReferrals: true },
            select: { referralSignups: true },
        });

        if (!userReferralStats) {
            throw new Error('User has no referrals!');
        }

        if (userReferralStats.successfulReferrals > 5 || userReferralStats.referralSignups > 5) {
            throw new Error('You cannot use the referral system as you have exceeded the maximum successful referrals limit!');
        }

        const userReferral = await prisma.referral.findFirst({
            where: { userId, referralLink },
        });

        if (userReferral) {
            throw new Error('You cannot use your own referral link!');
        }

        const usage = await prisma.referralUsage.findFirst({
            where: { userId, referralId: referral.id },
        });

        if (usage) {
            throw new Error('Referral link has already been used by this user!');
        }

        const newCreditsEarned = referral.creditsEarned + (referral.successfulReferrals + 1) * 100;

        const [updatedReferral] = await prisma.$transaction([
            prisma.referral.update({
                where: { id: referral.id },
                data: {
                    referralSignups: { increment: 1 },
                    successfulReferrals: { increment: 1 },
                    creditsEarned: newCreditsEarned,
                },
            }),
            prisma.referralUsage.create({
                data: { userId, referralId: referral.id },
            }),
            prisma.user.update({
                where: { id: referral.userId },
                data: { wallet: { increment: newCreditsEarned } },
            }),
        ]);

        return updatedReferral;
    } catch (error) {
        throw error; // Pass the error to the controller for further handling
    }
};

module.exports.createReferral = function createReferral(userId, referralLink) {
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedUserId)) {
        throw new Error(`Invalid userId: ${userId}`);
    }

    return prisma.referral.create({
        data: {
            userId: parsedUserId,
            referralLink,
            referralSignups: 0,
            successfulReferrals: 0,
            rewardsExchanged: 0,
            creditsEarned: 0,
            wallet: 100000
        }
    })
    .then(function (referral) {
        console.log('Referral created successfully!');
        return referral;
    })
    .catch(function (error) {
        console.error('Error creating referral:', error);
        throw error;
    });
};


