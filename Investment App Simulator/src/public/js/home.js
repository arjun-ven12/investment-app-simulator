
// home.js
document.addEventListener("DOMContentLoaded", async () => {
  // -------------------------------
  // ELEMENTS
  // -------------------------------
  const usernameEl = document.getElementById("username");
  const walletEl = document.getElementById("wallet");
  const walletToggle = document.getElementById("walletToggle");

  const leaderboardBody = document.getElementById("leaderboard-body");

  const tabStocksBtn = document.getElementById("tab-stocks");
  const tabOptionsBtn = document.getElementById("tab-options");
  const portfolioStocks = document.getElementById("portfolio-stocks");
  const portfolioOptions = document.getElementById("portfolio-options");

  const stocksContainer = portfolioStocks.querySelector(".trading-card2");
  const optionsContainer = document.getElementById("options-portfolio-card");

  let isWalletVisible = false;
  let portfolioChart = null;

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  // -------------------------------
  // USER INFO
  // -------------------------------
  async function fetchUserDetails() {
    if (!userId) return null;
    if (!token) return null;

    try {
      const res = await fetch(`/user/get/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success === false) {
        console.error("Failed to fetch user details:", data.message);
        return null;
      }
      return data.user || data;
    } catch (err) {
      console.error("Error fetching user details:", err);
      return null;
    }
  }
// Utility function to capitalize the first letter of each word in a string.
// This handles multi-word names (e.g., 'john doe' -> 'John Doe').
const capitalizeName = (str) => {
    if (!str) return '';
    // Ensure string is lowercased first, split by space, capitalize each word, and rejoin.
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

async function renderUserInfo() {
    // Assuming usernameEl and walletEl are defined globally or earlier in this scope
    const user = await fetchUserDetails();
    
    if (!user) {
      usernameEl.textContent = "Guest";
      walletEl.textContent = "****";
      return;
    }

    // Use the utility function to ensure the username is capitalized, regardless of the original data casing.
    const capitalizedUsername = capitalizeName(user.username);

    // Update the DOM elements
    usernameEl.textContent = capitalizedUsername;
    walletEl.setAttribute("data-value", user.wallet);
    walletEl.textContent = "****"; // hidden by default
}

  walletToggle.addEventListener("click", () => {
    const walletValue = walletEl.getAttribute("data-value");
    if (isWalletVisible) {
      walletEl.textContent = "****";
      walletToggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      walletEl.textContent = `$${walletValue}`;
      walletToggle.innerHTML = '<i class="fas fa-eye"></i>';
    }
    isWalletVisible = !isWalletVisible;
  });

  // -------------------------------
  // LEADERBOARD
  // -------------------------------
  async function renderLeaderboard() {
    try {
      const res = await fetch("/leaderboard");
      const data = await res.json();
      const leaderboard = data.leaderboard || [];
      leaderboardBody.innerHTML = "";

      leaderboard.forEach(entry => {
        const row = document.createElement("tr");
        const profitLossClass = entry.profitLossPercent >= 0 ? "positive" : "negative";

        row.innerHTML = `
          <td>${entry.rank}</td>
          <td>${entry.username}</td>
          <td class="${profitLossClass}">${entry.profitLossPercent}%</td>
          <td>${entry.lastTrade || "N/A"}</td>
        `;
        leaderboardBody.appendChild(row);
      });
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      leaderboardBody.innerHTML = `<tr><td colspan="4">Error: ${err.message}</td></tr>`;
    }
  }

  // -------------------------------
  // STOCKS PORTFOLIO
  // -------------------------------

  async function fetchStocksPortfolio() {
    if (!userId) return;
    try {
      const res = await fetch(`/stocks/portfolio/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const portfolio = await res.json();
      renderStocksPortfolio(portfolio);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      stocksContainer.innerHTML = `<p>Error fetching portfolio: ${err.message}</p>`;
    }
  }

  function renderStocksPortfolio(portfolio) {
    stocksContainer.innerHTML = "";

    const { openPositions = [], closedPositions = [] } = portfolio;

    if (openPositions.length === 0 && closedPositions.length === 0) {
      stocksContainer.innerHTML = `<p>You don't own any stocks yet.</p>`;
      return;
    }

    // Open Positions
    const openColumns = openPositions.map(stock => `
      <div class="stock-column">
        <h3>${stock.symbol} (${stock.companyName})</h3>
        <p><strong>Quantity:</strong> ${stock.quantity}</p>
        <p><strong>Avg Buy Price:</strong> $${parseFloat(stock.avgBuyPrice).toFixed(2)}</p>
        <p><strong>Current Price:</strong> $${parseFloat(stock.currentPrice).toFixed(2)}</p>
        <p><strong>Total Invested:</strong> $${parseFloat(stock.totalInvested).toFixed(2)}</p>
        <p><strong>Current Value:</strong> $${parseFloat(stock.currentValue).toFixed(2)}</p>
        <p><strong>Unrealized P/L:</strong> $${parseFloat(stock.unrealizedProfitLoss).toFixed(2)} (${stock.unrealizedProfitLossPercent})</p>
        <p><strong>Realized P/L:</strong> $${parseFloat(stock.realizedProfitLoss).toFixed(2)}</p>
      </div>
    `).join("");

    // Closed Positions
    const closedColumns = closedPositions.map(stock => `
      <div class="stock-column closed">
        <h3>${stock.symbol} (${stock.companyName})</h3>
        <p><strong>Total Bought Qty:</strong> ${stock.totalBoughtQty}</p>
        <p><strong>Total Bought Value:</strong> $${parseFloat(stock.totalBoughtValue).toFixed(2)}</p>
        <p><strong>Total Sold Value:</strong> $${parseFloat(stock.totalSoldValue).toFixed(2)}</p>
        <p><strong>Realized P/L:</strong> $${parseFloat(stock.realizedProfitLoss).toFixed(2)}</p>
      </div>
    `).join("");

    stocksContainer.innerHTML = `
      <div class="portfolio-layout">
        <div class="positions-section">
          ${openPositions.length ? `<h2>Open Positions</h2><div class="stock-grid">${openColumns}</div>` : ""}
          ${closedPositions.length ? `<h2>Closed Positions</h2><div class="stock-grid">${closedColumns}</div>` : ""}
        </div>
        ${openPositions.length ? `<div class="portfolio-chart-container"><canvas id="portfolioPieChart"></canvas></div>` : ""}
      </div>
    `;

    // Pie chart
    if (openPositions.length > 0) {
      if (portfolioChart) portfolioChart.destroy();

      const labels = openPositions.map(stock => stock.symbol);
      const data = openPositions.map(stock => parseFloat(stock.totalInvested));
      const ctx = document.getElementById("portfolioPieChart").getContext("2d");

   portfolioChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor:  [
          '#8faefd9a', // Strong Buy
          '#6d93fa61', // Buy
          '#5277e541', // Hold
          '#3c5dc9a8', // Sell
          '#2a3d7399'  // Strong Sell
        ],
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#fff' } },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(2);
                return `${context.label}: $${context.raw} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    }
  }

  // -------------------------------
  // OPTIONS PORTFOLIO
  // -------------------------------
  async function fetchOptionsPortfolio() {
    if (!userId) return;
    try {
      const res = await fetch(`/options/portfolio?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to fetch options portfolio");
      const data = await res.json();
      const portfolio = data.portfolio || [];
      renderOptionsPortfolio(portfolio);
    } catch (err) {
      console.error("Error loading options portfolio:", err);
      optionsContainer.innerHTML = `<p style="color:red; text-align:center;">Error loading portfolio: ${err.message}</p>`;
    }
  }

  function renderOptionsPortfolio(portfolio) {
    optionsContainer.innerHTML = "";

    if (portfolio.length === 0) {
      optionsContainer.innerHTML = `<div style="text-align:center; padding:15px; color:#999;">No option positions found.</div>`;
      return;
    }

    const totalRealized = portfolio.reduce((a, b) => a + (b.realizedPnL || 0), 0);
    const totalUnrealized = portfolio.reduce((a, b) => a + (b.unrealizedPnL || 0), 0);

    const summaryDiv = document.createElement("div");
    summaryDiv.style = "margin-bottom:15px; display:flex; justify-content:center; gap:40px;";
    summaryDiv.innerHTML = `
      <div style="text-align:center;">
        <strong>Total Realized PnL:</strong><br>
        <span style="color:${totalRealized >= 0 ? 'limegreen' : 'red'};">${totalRealized.toFixed(2)}</span>
      </div>
      <div style="text-align:center;">
        <strong>Total Unrealized PnL:</strong><br>
        <span style="color:${totalUnrealized >= 0 ? 'limegreen' : 'red'};">${totalUnrealized.toFixed(2)}</span>
      </div>
    `;

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "10px";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Underlying Stock</th>
          <th>Total Contracts</th>
          <th>Total Shares</th>
          <th>Active</th>
          <th>Expired</th>
          <th>Open</th>
          <th>Closed</th>
          <th>Realized PnL</th>
          <th>Unrealized PnL</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    portfolio.forEach(item => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid #E0EBFF";
      row.innerHTML = `
        <td style="padding:8px; text-align:center;">${item.underlyingSymbol}</td>
        <td style="padding:8px; text-align:center;">${item.totalContracts}</td>
        <td style="padding:8px; text-align:center;">${item.totalShares}</td>
        <td style="padding:8px; text-align:center;">${item.activeContracts}</td>
        <td style="padding:8px; text-align:center;">${item.expiredContracts}</td>
        <td style="padding:8px; text-align:center;">${item.openPositions}</td>
        <td style="padding:8px; text-align:center;">${item.closedPositions}</td>
        <td style="padding:8px; text-align:center; color:${item.realizedPnL >= 0 ? "limegreen" : "red"};">${item.realizedPnL.toFixed(2)}</td>
        <td style="padding:8px; text-align:center; color:${item.unrealizedPnL >= 0 ? "limegreen" : "red"};">${item.unrealizedPnL.toFixed(2)}</td>
      `;
      tbody.appendChild(row);
    });

    optionsContainer.appendChild(summaryDiv);
    optionsContainer.appendChild(table);
  }

  // -------------------------------
  // TAB LOGIC
  // -------------------------------
  let stocksLoaded = false;
  let optionsLoaded = false;

  tabStocksBtn.addEventListener("click", async () => {
    tabStocksBtn.classList.add("active");
    tabOptionsBtn.classList.remove("active");
    portfolioStocks.classList.add("active");
    portfolioOptions.classList.remove("active");

    if (!stocksLoaded) {
      await fetchStocksPortfolio();
      stocksLoaded = true;
    }
  });

  tabOptionsBtn.addEventListener("click", async () => {
    tabOptionsBtn.classList.add("active");
    tabStocksBtn.classList.remove("active");
    portfolioOptions.classList.add("active");
    portfolioStocks.classList.remove("active");

    if (!optionsLoaded) {
      await fetchOptionsPortfolio();
      optionsLoaded = true;
    }
  });

  // -------------------------------
  // INITIAL LOAD
  // -------------------------------
  await renderUserInfo();
  await renderLeaderboard();

  // Load default active tab (Stocks)
  if (tabStocksBtn.classList.contains("active") && !stocksLoaded) {
    await fetchStocksPortfolio();
    stocksLoaded = true;
  }
});


function safeMarkedParse(text) {
  if (typeof marked !== "undefined" && typeof marked.parse === "function") {
    return marked.parse(text || "");
  } else {
    console.warn("⚠️ Marked not loaded yet");
    return text; // fallback: raw text
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const stocksCard = document.getElementById("ai-stocks-card");
  const optionsCard = document.getElementById("ai-options-card");

  try {
    const [stocksRes, optionsRes] = await Promise.all([
      fetch(`/ai-advice/${userId}?category=stocks`),
      fetch(`/ai-advice/${userId}?category=options`)
    ]);

    const stocksData = await stocksRes.json();
    const optionsData = await optionsRes.json();

    // STOCKS
    if (stocksData?.success && stocksData.advice?.length) {
      const latest = stocksData.advice[0];
      stocksCard.innerHTML = `
  <div class="markdown-body">
    ${safeMarkedParse(latest.advice || "")}
    <p style="color:#9CA3AF;font-size:0.9rem;margin-top:1.5rem;">
      Last updated: ${new Date(latest.createdAt).toLocaleString()}
    </p>
  </div>`;
    } else {
      stocksCard.innerHTML = `<div class="markdown-body"><p style="color:#9CA3AF;">No stock advice available yet.</p></div>`;
    }

    // OPTIONS
    if (optionsData?.success && optionsData.advice?.length) {
      const latest = optionsData.advice[0];
      optionsCard.innerHTML = `
<div class="markdown-body">
<div class="ai-options-box markdown-body">
    ${safeMarkedParse(latest.advice || "")}
 <p style="color:#9CA3AF;font-size:0.9rem;margin-top:1.5rem;">
Last updated: ${new Date(latest.createdAt).toLocaleString()}
  </div>`;
    } else {
      optionsCard.innerHTML = `<div class="markdown-body"><p style="color:#9CA3AF;">No options advice available yet.</p></div>`;
    }

  } catch (err) {
    console.error("❌ Error fetching AI advice:", err);
    stocksCard.innerHTML = `<div class="markdown-body"><p style="color:red;">Error loading stock advice.</p></div>`;
    optionsCard.innerHTML = `<div class="markdown-body"><p style="color:red;">Error loading options advice.</p></div>`;
  }

  // Tabs
  const aiTabs = document.querySelectorAll("#tab-ai-stocks, #tab-ai-options");
  const aiContents = document.querySelectorAll("#ai-stocks, #ai-options");
  aiTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      aiTabs.forEach(btn => btn.classList.remove("active"));
      aiContents.forEach(div => div.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.id.replace("tab-", "")).classList.add("active");
    });
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("homepage-scenarios");
  const token = localStorage.getItem("token");
  if (!token) {
    container.innerHTML = "<p>Please log in to view scenarios.</p>";
    return;
  }

  try {
    const res = await fetch("/scenarios/joined", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch scenarios");
    const data = await res.json();
    const scenarios = data.success ? data.scenarios : [];

    if (scenarios.length === 0) {
      container.innerHTML = "<p style='color:#E0EBFF;'>You haven’t joined any scenarios yet.</p>";
      return;
    }

    // Sort by status first, then most recent (descending by createdAt or updatedAt)
    const sorted = [...scenarios].sort((a, b) => {
      const order = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2 };
      const statusDiff = order[a.status || "NOT_STARTED"] - order[b.status || "NOT_STARTED"];

      // If statuses are same, sort by most recent date (newest first)
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);

      if (statusDiff !== 0) return statusDiff;        // first prioritize status
      return dateB - dateA;                           // then prioritize recency
    });
    // Limit to 3 for homepage (most recent 3)
    const limited = sorted.slice(0, 2);
    container.innerHTML = "";

    limited.forEach(s => {
      const status = s.status || s.participantStatus || "NOT_STARTED";
      const card = document.createElement("div");
      card.className = "trading-card2";
      card.style.marginBottom = "10px";
      card.innerHTML = `
<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
    <div style="flex:0.7;">
      <h4>${s.title}</h4>
      <p style="color:#E0EBFF;">${s.description || "No description"}</p>
      <p><strong>Status:</strong> ${status.replace("_", " ")}</p>
    </div>
    <div style="flex-shrink:-1;">
      <button class="submit-button scenario-btn"
        onclick="window.open('scenario-console.html?scenarioId=${s.id}', '_blank')">
        ${status === "COMPLETED" ? "Retry" : "Open Console"}
      </button>
    </div>
  </div>
`;

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading scenarios:", err);
    container.innerHTML = `<p style="color:red;">Failed to load scenarios.</p>`;
  }
});

// document.addEventListener("DOMContentLoaded", async () => {
//   const token = localStorage.getItem("token");
//   const userId = localStorage.getItem("userId");

//   if (!token) {
//     alert("Please log in first.");
//     window.location.href = "/html/login.html";
//     return;
//   }

//   // Optional: Verify token by pinging backend
//   try {
//     const res = await fetch(`/user/get/${userId}`);
//     if (!res.ok) throw new Error("User not found");
//     const data = await res.json();
//     document.getElementById("usernameDisplay").innerText = data.user.username;
//   } catch (err) {
//     console.error(err);
//     alert("Session expired. Please log in again.");
//     localStorage.clear();
//     window.location.href = "/html/login.html";
//   }
// });
