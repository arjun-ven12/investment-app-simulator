document.addEventListener('DOMContentLoaded', async () => {
    await fetchRewards();
    setupRewardHistoryButton();
    setupGrandPrizeWinnersButton();
    setupSpinWheel();
});

// Fetch all rewards
const fetchRewards = async () => {
    try {
        const response = await fetch(`/rewards/rewards`);
        if (!response.ok) throw new Error('Failed to fetch rewards');

        const rewards = await response.json();
        console.log('Fetched rewards:', rewards);
        displayRewards(rewards);
    } catch (error) {
        console.error('Error fetching rewards:', error.message);
    }
};

const displayRewards = (rewards) => {
    const rewardsContainer = document.querySelector('.rewards-container');
    rewardsContainer.innerHTML = '';

    const rewardImages = {
        "Amazon": "../img/amazon image.png",
        "Starbucks": "../img/starbucks logo.jpg",
        "Apple": "../img/apple logo.png",
        "Target": "../img/target logo.png",
        "Best Buy": "../img/best buy logo.png",
        "Netflix": "../img/netflix logo.png",
        "Walmart": "../img/walmart logo.jpg",
        "Playstation": "../img/playstation logo.jpg",
        "Xbox": "../img/xbox logo.avif",
        "Nike": "../img/nike logo.jpg",
        "Win Or Lose": "../img/win or lose.jpg",
    };

    const rewardColors = {
        "Amazon": "orange",
        "Starbucks": "green",
        "Apple": "white",
        "Target": "red",
        "Best Buy": "white",
        "Netflix": "red",
        "Walmart": "blue",
        "PlayStation": "#003087",
        "Xbox": "#107c10",
        "Nike": "white",
        "Win Or Lose": "#FFD700"
    };

    const buttonColors = {
        "Amazon": "orange",
        "Starbucks": "green",
        "Apple": "white",
        "Target": "red",
        "Best Buy": "white",
        "Netflix": "red",
        "Walmart": "blue",
        "PlayStation": "#003087",
        "Xbox": "#107c10",
        "Nike": "black",
        "Win Or Lose": "black"
    };


    rewards.forEach(reward => {
        const giftCard = document.createElement('div');
        giftCard.classList.add('gift-card');

        const buttonColor = buttonColors[reward.rewardName] || 'gray';
        const textColor = reward.rewardName === 'Nike' ? 'white' : reward.rewardName === 'Win Or Lose' ? 'gold' : 'black';

        giftCard.innerHTML = `
            <img src="${rewardImages[reward.rewardName] || '../img/default.png'}" alt="${reward.rewardName} Gift Card">
            <h2 style="color: ${rewardColors[reward.rewardName] || 'white'};">${reward.rewardName}</h2>
            <p>${reward.rewardDescription}</p>
            <button class="redeem-btn" 
                style="background-color: ${buttonColor}; 
                       color: ${textColor};"
                onclick="redeemReward(${reward.id})">
                Redeem for $${reward.cost}
            </button>
        `;

        rewardsContainer.appendChild(giftCard);
    });
};

// 🎰 **Spin for Reward Function**
const spinForReward = async () => {
    const userId = getUserId();
    if (!userId) return alert("User not logged in!");

    const spinWheel = document.getElementById("spin-wheel");
    const spinResult = document.getElementById("spin-result");
    const spinButton = document.getElementById("spin-button");

    // Disable spin button
    spinButton.disabled = true;

    try {
        // Start spin animation
        spinWheel.classList.add("spinning");

        // Simulate spin time (2 seconds)
        setTimeout(async () => {
            spinWheel.classList.remove("spinning");

            // Fetch spin result from backend
            const response = await fetch(`/rewards/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();
            if (data.error) {
                alert(data.error);
                spinButton.disabled = false;
                return;
            }

            // Display spin result
            spinResult.innerHTML = `🎉 You won a <b>${data.reward}</b> Gift Card! 🎁<br> Gift Code: <b>${data.cardCode}</b>`;
            spinButton.disabled = false;
        }, 2000);
    } catch (error) {
        console.error('Error spinning reward:', error);
        alert("An error occurred while spinning. Please try again.");
        spinButton.disabled = false;
    }
};

// Setup spin wheel
const setupSpinWheel = () => {
    const spinContainer = document.createElement("div");
    spinContainer.classList.add("spin-container");

    spinContainer.innerHTML = `
        <h1>Spend $30000 to spin the Wheel to win a random giftcard!</h1>
        <h2>Will you bust or perhaps take it all?</h2>
        <div id="spin-wheel">🎡</div>
        <button id="spin-button" onclick="spinForReward()">Spin for $30,000</button>
        <p id="spin-result"></p>
    `;

    document.body.appendChild(spinContainer);
};

// Setup buttons container to ensure they are side by side
const setupButtonsContainer = () => {
    let container = document.querySelector('.button-container');
    if (!container) {
        container = document.createElement('div');
        container.classList.add("button-container");

        const rewardsContainer = document.querySelector('.rewards-container');
        rewardsContainer.insertAdjacentElement('afterend', container);
    }
    return container;
};

// Setup Grand Prize Winners Button
const setupGrandPrizeWinnersButton = () => {
    const container = setupButtonsContainer();
    
    let winnersButton = document.querySelector('.winners-btn');
    if (!winnersButton) {
        winnersButton = document.createElement('button');
        winnersButton.textContent = "View Grand Prize Winners";
        winnersButton.classList.add("winners-btn");
        winnersButton.onclick = fetchGrandPrizeWinners;
        container.appendChild(winnersButton);
    }
};

// Fetch Grand Prize Winners
const fetchGrandPrizeWinners = async () => {
    try {
        const response = await fetch(`/rewards/winners`);
        if (!response.ok) throw new Error('Failed to fetch grand prize winners');

        const data = await response.json();
        if (data.error) return alert(data.error);

        displayGrandPrizeWinners(data);
        alert("🏆 Successfully displayed grand prize winners!");
    } catch (error) {
        console.error('Error fetching grand prize winners:', error);
        alert("Nobody won the grand prize yet! Check back later!");
    }
};

// 🎖 **Display Grand Prize Winners Table**
const displayGrandPrizeWinners = (winners) => {
    let existingWinners = document.querySelector('.grand-prize-winners');
    if (existingWinners) existingWinners.remove();

    const winnersContainer = document.createElement('div');
    winnersContainer.classList.add('grand-prize-winners');

    winnersContainer.innerHTML = `
        <h2>Grand Prize Winners</h2>
        <p>See who won the grand prize!</p>
        <table class="winner-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Won At</th>
                </tr>
            </thead>
            <tbody>
                ${winners.map(winner => `
                    <tr>
                        <td>${winner.username}</td>
                        <td>${new Date(winner.wonAt).toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const historyContainer = document.querySelector('.reward-history');
    if (historyContainer) {
        historyContainer.insertAdjacentElement('afterend', winnersContainer);
    } else {
        document.body.appendChild(winnersContainer);
    }

    adjustTablesLayout();
};

// 🎖 **Responsive Tables: Reward History & Grand Prize Winners**
const adjustTablesLayout = () => {
    const history = document.querySelector('.reward-history');
    const winners = document.querySelector('.grand-prize-winners');

    if (history && winners) {
        history.style.display = "inline-block";
        winners.style.display = "inline-block";
        history.style.width = "48%";
        winners.style.width = "48%";
    }
};

// Redeem a reward
const redeemReward = async (rewardId) => {
    const userId = getUserId();
    if (!userId) return alert("User not logged in!");

    try {
        const response = await fetch(`/rewards/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, rewardId })
        });

        const data = await response.json();
        if (data.error) {
            alert(data.error);
        } else {
            alert(`Reward redeemed successfully! Gift Card Code: ${data.cardCode}`);
            fetchRewardHistory();
        }
    } catch (error) {
        console.error('Error redeeming reward:', error);
        alert("Failed to redeem reward. Please try again later.");
    }
};

// Setup button to fetch reward history
const setupRewardHistoryButton = () => {
    const container = setupButtonsContainer();
    
    let historyButton = document.querySelector('.history-btn');
    if (!historyButton) {
        historyButton = document.createElement('button');
        historyButton.textContent = "View My Reward History";
        historyButton.classList.add("history-btn");
        historyButton.onclick = fetchRewardHistory;
        container.appendChild(historyButton);
    }
};

// Fetch reward history
const fetchRewardHistory = async () => {
    const userId = getUserId();
    if (!userId) return alert("User not logged in!");

    try {
        const response = await fetch(`/rewards/history/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch reward history');

        const data = await response.json();
        if (data.error) return alert(data.error);

        displayRewardHistory(data);
        alert("✅ Successfully displayed reward history!");
    } catch (error) {
        console.error('Error fetching reward history:', error);
        alert("No reward that was redeemed previously to display!");
    }
};

// Display reward history in Microsoft Rewards style
const displayRewardHistory = (rewards) => {
    const existingHistory = document.querySelector('.reward-history');
    if (existingHistory) existingHistory.remove();

    const historyContainer = document.createElement('div');
    historyContainer.classList.add('reward-history');

    historyContainer.innerHTML = `
        <h2>Order History</h2>
        <p>Click "Get Code" to reveal your gift card code, or use "Redeem Code" to go to the respective store.</p>
        <table class="reward-table">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Reward</th>
                    <th>Cost</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${rewards.map(reward => {
                    const codeId = `code-${Math.random().toString(36).substring(7)}`;
                    return `
                        <tr>
                            <td>Sent</td>
                            <td>${new Date(reward.dateOrdered).toLocaleDateString()}</td>
                            <td>${reward.rewardName} - ${reward.rewardDescription}</td>
                            <td>$${reward.cost}</td>
                            <td>
                                <button class="toggle-code-btn" style="background-color: blue; color: white;" onclick="toggleCode('${codeId}')">Get Code</button>
                                <button class="redeem-store-btn" style="background-color: black; color: white;" onclick="redeemGiftCard('${reward.rewardName}')">Redeem Code</button>
                                <p id="${codeId}" class="gift-code" style="display: none;">${reward.cardCode}</p>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    document.body.appendChild(historyContainer);
};

// Toggle function for "Get Code" button
const toggleCode = (codeId) => {
    const codeElement = document.getElementById(codeId);
    const getCodeButton = document.querySelector(`[onclick="toggleCode('${codeId}')"]`);

    if (codeElement.style.display === "none") {
        codeElement.style.display = "block";
        getCodeButton.textContent = "Hide Code";
        getCodeButton.style.backgroundColor = "purple";
    } else {
        codeElement.style.display = "none";
        getCodeButton.textContent = "Get Code";
        getCodeButton.style.backgroundColor = "blue";
    }
};

// Open gift card redeem page
const redeemGiftCard = (rewardName) => {
    const giftCardStores = {
        "Amazon": "https://www.amazon.com/gc/redeem",
        "Starbucks": "https://www.starbucks.com/card",
        "Apple": "https://apps.apple.com/redeem",
        "Target": "https://www.target.com/c/gift-cards/-/N-5xsxu",
        "Best Buy": "https://www.bestbuy.com/gift-card-balance",
        "Netflix": "https://www.netflix.com/redeem",
        "Walmart": "https://www.walmart.com/c/kp/redeem-cards",
        "PlayStation": "https://www.playstation.com/en-sg/",
        "Xbox": "https://www.xbox.com/en-SG/redeem",
        "Nike": "https://www.nike.com/help/a/gift-card-redeem"
    };

    const redeemUrl = giftCardStores[rewardName];
    if (redeemUrl) {
        window.open(redeemUrl, "_blank");
    } else {
        alert("No redeem page available for this reward.");
    }
};

// Get user ID from local storage
const getUserId = () => localStorage.getItem('userId');