let currentSymbol = null; // global
let isPaused = true; // track pause state globally

async function fetchOwnedQuantity(symbol) {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/scenarios/scenario-portfolio/${scenarioId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch portfolio");
        const portfolio = await res.json();
        const position = (portfolio.openPositions || []).find(p => p.symbol === symbol);
        return position ? Number(position.quantity) : 0;
    } catch (err) {
        console.error("Error fetching owned quantity:", err);
        return 0; // fallback
    }
}

async function fetchWalletBalance() {
    const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");
    const walletBalanceSpan = document.getElementById("wallet-balance");
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/scenarios/${scenarioId}/wallet`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch wallet balance");
        walletBalanceSpan.textContent = parseFloat(data.cashBalance).toFixed(2);
    } catch (err) {
        console.error(err);
        walletBalanceSpan.textContent = "0.00";
    }
}

async function processLimitOrders(symbol, currentPrice) {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/scenarios/limit/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ symbol, currentPrice })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to process limit orders");
        if (data.executedOrders?.length) {
            console.log("Limit orders executed:", data.executedOrders);
            await fetchWalletBalance();
            if (typeof fetchOrderHistory === "function") await fetchOrderHistory();
        }
    } catch (err) {
        console.error("Error processing limit orders:", err.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");
    // --- DOM Elements ---
    const priceInput = document.getElementById("price");
    const qtyInput = document.getElementById("quantity");
    const amountInput = document.getElementById("amount");
    const tradingForm = document.getElementById("trading-form");
    const orderTypeSelect = document.getElementById("order-type");
    const limitPriceContainer = document.getElementById("limitPriceContainer");
    const limitPriceInput = document.getElementById("limitPrice");
    const buyErrorDiv = document.getElementById("buy-error");
    const walletBalanceSpan = document.getElementById("wallet-balance");
    const speedSelect = document.getElementById("speed-select");
    const currentTimeDiv = document.getElementById("currentTime");

    let scenarioChart = null;
    let fullData = [];
    let currentIndex = 0;
    let replayInterval = null;
    let countdownInterval = null;
    let currentSpeed = 3;
    const VISIBLE_POINTS = 20;
    let currentSymbol = null;
    let currentChartType = "line";

    priceInput.readOnly = true;
    let allSymbolsData = {}; // { symbol: [{x, c}, ...] }

    function initializeChart(chartType = "line") {
        const ctx = document.getElementById("myChart2").getContext("2d");
        if (scenarioChart) scenarioChart.destroy();
        scenarioChart = new Chart(ctx, {
            type: chartType,
            data: { labels: [], datasets: [] },
            options: { responsive: true, scales: { x: { type: "time" }, y: {} } }
        });
    }

    function plotNextDataPoint() {
        if (currentIndex >= Math.max(...Object.values(allSymbolsData).map(d => d.length))) return;
        let latestForCurrent = null;
        for (const [symbol, data] of Object.entries(allSymbolsData)) {
            const item = data[currentIndex];
            const ds = scenarioChart.data.datasets.find(ds => ds.label === symbol);
            if (item) {
                ds.data.push(item.c);
                if (symbol === currentSymbol) latestForCurrent = item;
            }
        }
        scenarioChart.data.labels.push(allSymbolsData[currentSymbol][currentIndex].x);
        scenarioChart.update();
        currentIndex++;
        if (latestForCurrent) {
            priceInput.value = latestForCurrent.c.toFixed(2);
            updateAmount();
            processLimitOrders(currentSymbol, latestForCurrent.c);
        }
    }

    function getRandomColor() {
        return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
    }

    async function fetchScenarioData(symbol) {
        if (!symbol) return alert("Enter a stock symbol.");
        try {
            const res = await fetch(`/scenarios/${scenarioId}/stocks/${symbol}/data`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to fetch scenario data");
            if (!data.chartData?.length) throw new Error("No chart data");

            allSymbolsData[symbol] = data.chartData.map(item => ({ x: new Date(item.date), c: item.closePrice }));
            fullData = allSymbolsData[symbol];

            if (!scenarioChart) initializeChart(currentChartType);

            if (!scenarioChart.data.datasets.find(ds => ds.label === symbol)) {
                scenarioChart.data.datasets.push({
                    label: symbol,
                    data: [],
                    borderWidth: 2,
                    borderColor: getRandomColor(),
                    fill: false,
                    tension: 0.1
                });
            }

            currentSymbol = symbol;
            const ds = scenarioChart.data.datasets.find(ds => ds.label === symbol);

            // if (currentIndex === 0 && fullData.length > 0) {
            //     const first = fullData[0];
            //     ds.data.push(first.c);
            //     scenarioChart.data.labels.push(first.x);
            //     scenarioChart.update();
            //     priceInput.value = first.c.toFixed(2);
            //     updateAmount();
            // }

            if (currentIndex > 0) {
                ds.data = fullData.slice(0, currentIndex).map(item => item.c);
                scenarioChart.update();
                const latest = fullData[currentIndex - 1];
                if (latest) {
                    priceInput.value = latest.c.toFixed(2);
                    updateAmount();
                }
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    }

    function startReplay() {
    if (!fullData.length) return alert("Generate the chart first!");
    
    // Prompt user before starting
    if (!confirm("Replay will start now. Are you ready?")) return;

    pauseReplay();
    isPaused = false;
    currentSpeed = parseFloat(speedSelect.value) || 3;
    let intervalMs = 20000 / currentSpeed;
    let remainingTime = intervalMs / 1000;

    countdownInterval = setInterval(() => {
        remainingTime--;
        document.getElementById("next-update-timer").textContent = `Next update in: ${remainingTime}s`;
    }, 1000);

    replayInterval = setInterval(() => {
        if (currentIndex >= fullData.length) {
            pauseReplay();
            document.getElementById("next-update-timer").textContent = "Replay finished!";
            return;
        }
        plotNextDataPoint();
        remainingTime = intervalMs / 1000;
    }, intervalMs);
}
    function pauseReplay() {
        isPaused = true;
        if (replayInterval) clearInterval(replayInterval);
        if (countdownInterval) clearInterval(countdownInterval);
    }

    function resetReplay() {
        pauseReplay();
        currentIndex = 0;
        if (scenarioChart) {
            scenarioChart.data.datasets[0].data = [];
            scenarioChart.data.labels = [];
            scenarioChart.update();
        }
    }

    async function fetchWalletBalance() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/scenarios/${scenarioId}/wallet`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to fetch wallet balance");
            walletBalanceSpan.textContent = parseFloat(data.cashBalance).toFixed(2);
        } catch (err) {
            console.error(err);
            walletBalanceSpan.textContent = "0.00";
        }
    }

    fetchWalletBalance();

    function updateAmount() {
        const qty = parseFloat(qtyInput.value) || 0;
        let priceToUse = parseFloat(priceInput.value) || 0;
        if (orderTypeSelect.value === "limit") priceToUse = parseFloat(limitPriceInput.value) || 0;
        amountInput.value = (priceToUse * qty).toFixed(2);
    }

    qtyInput.addEventListener("input", updateAmount);

    orderTypeSelect.addEventListener("change", () => {
        if (orderTypeSelect.value === "limit") limitPriceContainer.style.display = "block";
        else { limitPriceContainer.style.display = "none"; limitPriceInput.value = ""; }
    });

    tradingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        buyErrorDiv.textContent = "";

        const sideInput = document.querySelector('input[name="side"]:checked');
        const side = sideInput ? sideInput.value.toLowerCase() : null;
        const orderType = orderTypeSelect.value;
        const symbol = currentSymbol;
        const quantity = Number(qtyInput.value);
        const limitPrice = parseFloat(limitPriceInput.value);

        if (!symbol) return (buyErrorDiv.textContent = "Please generate a chart / select a symbol first.");
        if (!side || !orderType || !quantity || quantity <= 0) {
            return (buyErrorDiv.textContent = "Please fill in all required fields.");
        }

        const submitBtn = document.getElementById("submit-order");
        if (submitBtn) submitBtn.disabled = true;

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Missing auth token");

            const latestPrice = parseFloat(priceInput.value);
            if (!isFinite(latestPrice)) throw new Error("Invalid current price");

            let payload, endpoint;
            if (orderType === "market") {
                endpoint = `/scenarios/${scenarioId}/market-order`;
                payload = { side, symbol, quantity, price: latestPrice };
            } else if (orderType === "limit") {
                if (!isFinite(limitPrice)) return (buyErrorDiv.textContent = "Please enter a valid limit price.");
                endpoint = `/scenarios/${scenarioId}/limit-orders`;
                payload = { side, symbol, quantity, limitPrice, price: latestPrice };
            } else {
                throw new Error("Invalid order type");
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            const resData = await res.json();
            if (!res.ok || resData.success === false) throw new Error(resData.message || "Trade failed");

            alert(`${orderType === "market" ? "Market" : "Limit"} order submitted successfully!`);

            qtyInput.value = "";
            amountInput.value = "";
            limitPriceInput.value = "";
            await fetchWalletBalance();
            if (typeof fetchOrderHistory === "function") await fetchOrderHistory();

        } catch (err) {
            console.error(err);
            buyErrorDiv.textContent = err.message || "An error occurred";
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    document.getElementById("chart-form-intraday").addEventListener("submit", async e => {
        e.preventDefault();
        const symbol = e.target.chartSymbol.value.trim().toUpperCase();
        currentChartType = document.getElementById("chartType").value;
        await fetchScenarioData(symbol);
    });

    document.getElementById("btn-play").addEventListener("click", startReplay);
    document.getElementById("btn-pause").addEventListener("click", pauseReplay);
    document.getElementById("btn-reset").addEventListener("click", resetReplay);
});

document.addEventListener("DOMContentLoaded", () => {
    const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");
    const tradesTableBody = document.getElementById("trades-table-body");
    const limitOrdersTableBody = document.getElementById("limit-orders-table-body");
    const tradesErrorDiv = document.getElementById("trades-error");
    const limitOrdersErrorDiv = document.getElementById("limit-orders-error");
    const exportTradesBtn = document.getElementById("export-trades");
    const exportLimitOrdersBtn = document.getElementById("export-limit-orders");
    let marketOrders = [];
    let limitOrders = [];

    async function fetchOrderHistory() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/scenarios/${scenarioId}/orders`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to fetch order history");
            marketOrders = data.marketOrders || [];
            limitOrders = data.limitOrders || [];
            renderMarketOrders();
            renderLimitOrders();
            if (currentSymbol && fullData.length > 0) {
                const latestPrice = parseFloat(priceInput.value);
                if (isFinite(latestPrice)) processLimitOrders(currentSymbol, latestPrice);
            }
        } catch (err) {
            console.error(err);
            tradesErrorDiv.textContent = err.message;
            limitOrdersErrorDiv.textContent = err.message;
        }
    }

    function renderMarketOrders() {
        tradesTableBody.innerHTML = "";
        if (!marketOrders.length) {
            tradesTableBody.innerHTML = `<tr><td colspan="6">No market orders found.</td></tr>`;
            return;
        }
        marketOrders.forEach(order => {
            const price = order.executedPrice ? Number(order.executedPrice.toString()) : 0;
            const quantity = order.quantity ? Number(order.quantity.toString()) : 0;
            const total = (price * quantity).toFixed(2);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${new Date(order.createdAt).toLocaleString()}</td>
                <td>${order.symbol}</td>
                <td>${order.side.toUpperCase()}</td>
                <td>${quantity}</td>
                <td>${price.toFixed(2)}</td>
                <td>${total}</td>
            `;
            tradesTableBody.appendChild(row);
        });
    }

    function renderLimitOrders() {
        limitOrdersTableBody.innerHTML = "";
        if (!limitOrders.length) {
            limitOrdersTableBody.innerHTML = `<tr><td colspan="7">No limit orders found.</td></tr>`;
            return;
        }
        limitOrders.forEach(order => {
            const limitPrice = order.limitPrice ? Number(order.limitPrice) : 0;
            const quantity = order.quantity ? Number(order.quantity) : 0;
            const total = (limitPrice * quantity).toFixed(2);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${new Date(order.createdAt).toLocaleString()}</td>
                <td>${order.symbol}</td>
                <td>${order.side.toUpperCase()}</td>
                <td>${quantity}</td>
                <td>${limitPrice.toFixed(2)}</td>
                <td>${total}</td>
                <td>${order.status}</td>
            `;
            limitOrdersTableBody.appendChild(row);
        });
    }

    function exportToCSV(data, filename) {
        if (!data.length) return alert("No data to export.");
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(","),
            ...data.map(row => headers.map(field => JSON.stringify(row[field] ?? "")).join(","))
        ];
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportTradesBtn.addEventListener("click", () => exportToCSV(marketOrders, "market_orders.csv"));
    exportLimitOrdersBtn.addEventListener("click", () => exportToCSV(limitOrders, "limit_orders.csv"));
    fetchOrderHistory();
});
