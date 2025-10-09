
const limitPriceInput = document.getElementById("limitPrice");
let currentSymbol = null; // global
let isPaused = true; // track pause state globally
let scenarioChart = null;
let fullData = [];
let currentIndex = 0;
let replayInterval = null;
let countdownInterval = null;
let currentSpeed = 3;
const VISIBLE_POINTS = 20;
let currentChartType = "line";
let allSymbolsData = {};
const amountInput = document.getElementById("amount");
const priceInput = document.getElementById("price");
const qtyInput = document.getElementById("quantity");
const orderTypeSelect = document.getElementById("order-type");
const usedHues = [];

function updateReplayProgress() {
    let totalLength = fullData.length;

    // If fullData is an object of arrays for symbols
    if (typeof fullData === 'object' && !Array.isArray(fullData)) {
        totalLength = Object.values(fullData).reduce((sum, arr) => sum + arr.length, 0);
    }

    if (!totalLength) return; // avoid divide by 0

    const progressPercent = Math.min((currentIndex / totalLength) * 100, 100).toFixed(0);

    const progressBar = document.getElementById("replay-progress");
    const progressText = document.getElementById("replay-progress-text");

    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (progressText) progressText.textContent = `${progressPercent}%`;
}

async function plotNextDataPoint() {
    const maxLength = Math.max(...Object.values(allSymbolsData).map(d => d.length));
    if (currentIndex >= maxLength) return;

    const activeSymbol = currentSymbol || Object.keys(allSymbolsData)[0];
    const currentData = allSymbolsData[activeSymbol];

    if (!currentData) {
        console.warn("No data found for any symbol.");
        return;
    }

    if (currentIndex >= currentData.length) {
        console.warn("Index out of bounds:", currentIndex, "for", activeSymbol);
        return;
    }

    let latestForCurrent = null;

    for (const [symbol, data] of Object.entries(allSymbolsData)) {
        const item = data[currentIndex];
        const ds = scenarioChart.data.datasets.find(ds => ds.label === symbol);
        if (item && ds) {
            ds.data.push(item.c);
            if (symbol === activeSymbol) latestForCurrent = item;
        }
    }

    scenarioChart.data.labels.push(currentData[currentIndex].x);
    scenarioChart.update();

    currentIndex++;
    updateReplayProgress();

    if (latestForCurrent) {
        priceInput.value = latestForCurrent.c.toFixed(2);
        updateAmount();
        processLimitOrders(activeSymbol, latestForCurrent.c);
    }

    const currentUpdateTimeDiv = document.getElementById("current-update-time");
    if (latestForCurrent && currentUpdateTimeDiv) {
        const formattedTime = latestForCurrent.x.toLocaleString();
        currentUpdateTimeDiv.textContent = `Current update: ${formattedTime}`;
    }

    // ✅ Save progress
    try {
        await saveReplayProgress();

        // ✅ After 1 second, re-fetch portfolio to update pie chart + cards
        setTimeout(() => {
            if (typeof fetchPortfolio === 'function') {
                fetchPortfolio();
            } else {
                console.warn("fetchPortfolio not found in global scope.");
            }
        }, 1000);
    } catch (err) {
        console.error("Error saving replay progress:", err);
    }
}


const tradeSymbolSelect = document.getElementById("trade-symbol");
function updateAmount() {
    const qty = parseFloat(qtyInput.value) || 0;
    let priceToUse = parseFloat(priceInput.value) || 0;
    if (orderTypeSelect.value === "limit") priceToUse = parseFloat(limitPriceInput.value) || 0;
    amountInput.value = (priceToUse * qty).toFixed(2);
}
function populateTradeDropdown() {
    tradeSymbolSelect.innerHTML = '<option value="" disabled>Select stock</option>';
    Object.keys(allSymbolsData).forEach(symbol => {
        const option = document.createElement("option");
        option.value = symbol;
        option.textContent = symbol;
        tradeSymbolSelect.appendChild(option);
    });

    // Auto-select current symbol if available
    if (currentSymbol) tradeSymbolSelect.value = currentSymbol;
}

tradeSymbolSelect.addEventListener("change", async (e) => {
    const selectedSymbol = e.target.value;
    currentSymbol = selectedSymbol; // update global

    // Update price input to latest for selected symbol
    const data = allSymbolsData[selectedSymbol];
    if (data && data.length > 0) {
        const latestPrice = data[currentIndex - 1] || data[data.length - 1];
        document.getElementById("price").value = latestPrice.c.toFixed(2);
        updateAmount();
    }
});
function initializeChart(chartType = "line") {
    const ctx = document.getElementById("myChart2").getContext("2d");

    // Destroy previous chart if exists
    if (scenarioChart) scenarioChart.destroy();

    // Register the zoom plugin (make sure ChartZoom is loaded globally)
    if (typeof ChartZoom !== "undefined") Chart.register(ChartZoom);

    scenarioChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'minute' } // adjust as needed
                },
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        threshold: 5
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'xy'
                    }
                }
            }
        }
    });
}



function getRandomColor() {
    let hue;
    do {
        hue = Math.floor(Math.random() * 360);
    } while (usedHues.some(h => Math.abs(h - hue) < 30)); // Ensure hues differ by at least 30°

    usedHues.push(hue);

    const saturation = Math.floor(Math.random() * 30) + 30; // 30-60% saturation
    const lightness = Math.floor(Math.random() * 20) + 70;  // 70-90% lightness

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function pauseReplay() {
    isPaused = true;
    if (replayInterval) clearInterval(replayInterval);
    if (countdownInterval) clearInterval(countdownInterval);
}

function startReplay() {
    if (!fullData.length) return alert("Generate the chart first!");
    pauseReplay();
    isPaused = false;
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
            body: JSON.stringify({ symbol, currentPrice, currentIndex })
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


    priceInput.readOnly = true;

    function initializeChart(ctx, data) {
        Chart.register(ChartZoom); // register plugin

        return new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy',
                            threshold: 5
                        },
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'xy'
                        }
                    }
                },
                scales: {
                    x: { type: 'time', time: { unit: 'minute' } },
                    y: { beginAtZero: false }
                }
            }
        });
    }

    function plotNextDataPoint() {
        // stop if we've reached the end of all datasets
        const maxLength = Math.max(...Object.values(allSymbolsData).map(d => d.length));
        if (currentIndex >= maxLength) return;

        // use currentSymbol if available, otherwise default to first symbol
        const activeSymbol = currentSymbol || Object.keys(allSymbolsData)[0];
        const currentData = allSymbolsData[activeSymbol];

        if (!currentData) {
            console.warn("No data found for any symbol.");
            return;
        }

        if (currentIndex >= currentData.length) {
            console.warn("Index out of bounds:", currentIndex, "for", activeSymbol);
            return;
        }

        let latestForCurrent = null;

        // plot each symbol’s data for this index
        for (const [symbol, data] of Object.entries(allSymbolsData)) {
            const item = data[currentIndex];
            const ds = scenarioChart.data.datasets.find(ds => ds.label === symbol);
            if (item && ds) {
                ds.data.push(item.c);
                if (symbol === activeSymbol) latestForCurrent = item;
            }
        }

        // update chart labels using whichever symbol we used
        scenarioChart.data.labels.push(currentData[currentIndex].x);
        scenarioChart.update();

        currentIndex++;
        updateReplayProgress();
        // update displayed price and process limit orders
        if (latestForCurrent) {
            priceInput.value = latestForCurrent.c.toFixed(2);
            updateAmount();
            processLimitOrders(activeSymbol, latestForCurrent.c);
        }
        // Update current update time on UI
        const currentUpdateTimeDiv = document.getElementById("current-update-time");
        if (latestForCurrent && currentUpdateTimeDiv) {
            const formattedTime = latestForCurrent.x.toLocaleString();
            currentUpdateTimeDiv.textContent = `Current update: ${formattedTime}`;
        }
    }


    function getRandomColor() {
        let hue;
        do {
            hue = Math.floor(Math.random() * 360);
        } while (usedHues.some(h => Math.abs(h - hue) < 30)); // Ensure hues differ by at least 30°

        usedHues.push(hue);

        const saturation = Math.floor(Math.random() * 30) + 30; // 30-60% saturation
        const lightness = Math.floor(Math.random() * 20) + 70;  // 70-90% lightness

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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

            if (currentIndex === 0 && fullData.length > 0) {
                const first = fullData[0];
                ds.data.push(first.c);
                scenarioChart.data.labels.push(first.x);
                scenarioChart.update();
                priceInput.value = first.c.toFixed(2);
                updateAmount();
            }
            updateReplayProgress();
            if (currentIndex > 0) {
                ds.data = fullData.slice(0, currentIndex).map(item => item.c);
                scenarioChart.update();
                const latest = fullData[currentIndex - 1];
                if (latest) {
                    priceInput.value = latest.c.toFixed(2);
                    updateAmount();
                }
            }
            populateTradeDropdown();

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

        if (scenarioChart && Object.keys(allSymbolsData).length > 0) {
            // Clear all datasets
            scenarioChart.data.datasets.forEach(ds => ds.data = []);
            scenarioChart.data.labels = [];

            // Add first point for each symbol
            for (const [symbol, data] of Object.entries(allSymbolsData)) {
                const first = data[0];
                const ds = scenarioChart.data.datasets.find(ds => ds.label === symbol);
                if (first && ds) {
                    ds.data.push(first.c);
                }
            }

            // Add first label using the first active symbol
            const firstSymbol = currentSymbol || Object.keys(allSymbolsData)[0];
            scenarioChart.data.labels.push(allSymbolsData[firstSymbol][0].x);

            // Update chart
            scenarioChart.update();

            // Make next plot start from index 1
            currentIndex = 1;

            // Update displayed price if needed
            const latestForCurrent = allSymbolsData[firstSymbol][0];
            if (priceInput) priceInput.value = latestForCurrent.c.toFixed(2);
            if (amountInput) updateAmount();
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
    // Call this whenever a new symbol is added to the chart
    populateTradeDropdown();
    updateReplayProgress();
    tradingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        buyErrorDiv.textContent = "";

        const sideInput = document.querySelector('input[name="side"]:checked');
        const side = sideInput ? sideInput.value.toLowerCase() : null;
        const orderType = orderTypeSelect.value;

        const quantity = Number(qtyInput.value);
        const limitPrice = parseFloat(limitPriceInput.value);

        const symbol = currentSymbol || tradeSymbolSelect.value;
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
                payload = { side, symbol, quantity, price: latestPrice, currentIndex };
            } else if (orderType === "limit") {
                if (!isFinite(limitPrice)) return (buyErrorDiv.textContent = "Please enter a valid limit price.");
                endpoint = `/scenarios/${scenarioId}/limit-orders`;
                payload = { side, symbol, quantity, limitPrice, price: latestPrice, currentIndex };
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
        const chartTypeElement = document.getElementById("chartType");
        currentChartType = chartTypeElement ? chartTypeElement.value : "line";
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

// ===== SAVE & LOAD REPLAY PROGRESS =====
async function saveReplayProgress() {
    if (!Object.keys(allSymbolsData).length) return; // nothing to save
    try {
        const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");
        const token = localStorage.getItem("token");

        const symbols = Object.keys(allSymbolsData); // all symbols on chart

        await fetch(`/scenarios/${scenarioId}/save-progress`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                symbols,
                currentIndex,
                currentSpeed,
            }),
        });

        console.log("Progress saved for symbols:", symbols, "Index:", currentIndex, "Speed:", currentSpeed);
    } catch (err) {
        console.error("Failed to save progress:", err);
    }
}

async function loadReplayProgress() {
    try {
        if (!scenarioChart) {
            console.warn("Scenario chart not initialized yet.");
            return;
        }

        const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");
        const token = localStorage.getItem("token");
        const res = await fetch(`/scenarios/${scenarioId}/load-progress`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            console.warn("No saved progress found or error:", data.message);
            return;
        }

        const { symbols, currentIndex: savedIndex, currentSpeed: savedSpeed, data: symbolsData } = data;

        currentIndex = savedIndex || 0;
        currentSpeed = savedSpeed || 3;


        // Load all symbols into chart data
        for (const symbol of symbols) {
            allSymbolsData[symbol] = (symbolsData[symbol] || []).map(item => ({
                x: new Date(item.x),
                c: Number(item.c)
            }));

            // Prevent index overflow
            currentIndex = Math.min(currentIndex, allSymbolsData[symbol].length - 1);

            let ds = scenarioChart.data.datasets.find(d => d.label === symbol);
            if (!ds) {
                scenarioChart.data.datasets.push({
                    label: symbol,
                    data: allSymbolsData[symbol].slice(0, currentIndex).map(d => d.c),
                    borderWidth: 2,
                    borderColor: getRandomColor(),
                    fill: false,
                    tension: 0.1
                });
            } else {
                ds.data = allSymbolsData[symbol].slice(0, currentIndex).map(d => d.c);
            }
        }
        // Use first symbol for labels
        if (symbols.length > 0 && allSymbolsData[symbols[0]]) {
            fullData = allSymbolsData[symbols[0]];
            scenarioChart.data.labels = fullData.slice(0, currentIndex).map(d => d.x);

            // Update price input to last known
            const latest = fullData[currentIndex - 1];
            if (latest) document.getElementById("price").value = latest.c.toFixed(2);
        }

        scenarioChart.update();
        updateReplayProgress();
        console.log("Replay progress loaded for symbols:", symbols, "Index:", currentIndex, "Speed:", currentSpeed);
    } catch (err) {
        console.error("Failed to load progress:", err);
    }
}



// ===== HOOK INTO YOUR EXISTING EVENTS =====
document.addEventListener("DOMContentLoaded", async () => {
    initializeChart(currentChartType);
    await loadReplayProgress(); // restore saved progress on page load
    populateTradeDropdown();
    // Save on pause button click
    document.getElementById("btn-pause").addEventListener("click", () => {
        pauseReplay();
        saveReplayProgress();
    });

    // Save on page exit/refresh
    window.addEventListener("beforeunload", () => {
        saveReplayProgress();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("btn-save");

    saveBtn.addEventListener("click", async () => {
        // Pause replay, but don't auto-save on pause
        pauseReplay();

        // Save explicitly for Save & Exit
        await saveReplayProgress();
        alert("Progress saved! You can now exit.");
        window.location.href = "/html/scenarios.html"; // optional redirect
    });
});


document.querySelectorAll(".speed-buttons button").forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active from all buttons
        document.querySelectorAll(".speed-buttons button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // Update select value for your existing JS
        const speedSelect = document.getElementById("speed-select");
        speedSelect.value = btn.dataset.value;

        // Update global speed
        currentSpeed = Number(btn.dataset.value);

        // If replay is running, adjust intervals immediately
        if (!isPaused && replayInterval) {
            // Clear existing intervals
            clearInterval(replayInterval);
            clearInterval(countdownInterval);

            // Calculate new interval
            let intervalMs = 20000 / currentSpeed;
            let remainingTime = intervalMs / 1000;

            // Countdown interval
            countdownInterval = setInterval(() => {
                remainingTime--;
                document.getElementById("next-update-timer").textContent = `Next update in: ${remainingTime}s`;
            }, 1000);

            // Replay interval
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
    });
});

window.addEventListener('resize', () => {
    if (scenarioChart) scenarioChart.resize();
});


const scenarioNameEl = document.getElementById("scenario-name");
const startDateEl = document.getElementById("scenario-start-date");
const endDateEl = document.getElementById("scenario-end-date");
const initialWalletEl = document.getElementById("scenario-initial-wallet");
const descriptionEl = document.getElementById("scenario-description");

// Fetch scenario details from backend
async function loadScenarioDetails() {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/scenarios/getDetails/${scenarioId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to fetch scenario details");

        const data = await res.json();

        // Populate the card
        scenarioNameEl.textContent = data.name || "--";
        startDateEl.textContent = data.startDate || "--";
        endDateEl.textContent = data.endDate || "--";
        initialWalletEl.textContent = data.initialWallet?.toFixed(2) || "0.00";
        descriptionEl.textContent = data.description || "--";

    } catch (err) {
        console.error("Error loading scenario details:", err);
    }
}
document.getElementById("reset-zoom").addEventListener("click", () => {
    if (scenarioChart) {
        scenarioChart.resetZoom(); // works with chartjs-plugin-zoom
    }
});
// Call the function
loadScenarioDetails();

window.addEventListener('DOMContentLoaded', function () {
    const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");
    const userId = localStorage.getItem('userId');

    const stockCardsContainer = document.getElementById('stockCardsContainer');
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    let portfolioChart = null;

    if (!scenarioId || !userId) return console.error('Missing scenarioId or userId');

    // ====== Layout styling for cards (2 per row, aligned left) ======
    stockCardsContainer.style.display = 'grid';
    stockCardsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
    stockCardsContainer.style.justifyContent = 'start';
    stockCardsContainer.style.alignItems = 'start';
    stockCardsContainer.style.gap = '10px';
    stockCardsContainer.style.marginTop = '10px';

async function refreshPortfolioData() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/scenarios/portfolio/${scenarioId}?userId=${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) throw new Error('Failed to fetch portfolio');
        
        const data = await res.json();
        updatePortfolioUI(data.positions);
    } catch (err) {
        console.error(err);
    }
}

    function updatePortfolioUI(positions) {
        if (!positions || positions.length === 0) {
            stockCardsContainer.innerHTML = '<p style="color:#888;">No stocks in portfolio.</p>';
            return;
        }

        // Clear removed symbols smoothly
        const existingCards = Array.from(stockCardsContainer.children);
        const currentSymbols = positions.map(p => p.symbol);
        existingCards.forEach(card => {
            if (!currentSymbols.includes(card.dataset.symbol)) {
                card.classList.add('fade-out');
                setTimeout(() => card.remove(), 300);
            }
        });

        // Update or create cards
        positions.forEach(pos => {
            let card = document.querySelector(`[data-symbol="${pos.symbol}"]`);
            if (!card) {
                card = document.createElement('div');
                card.className = 'company-card-content animate-slideup';
                card.dataset.symbol = pos.symbol;
                card.style.padding = '12px';
                card.style.border = '1px solid #636363ff';
                card.style.borderRadius = '10px';
                card.style.backgroundColor = '#000';
                card.style.color = '#fff';
                card.style.width = '100%';
                card.style.transition = 'all 0.3s ease';
                stockCardsContainer.appendChild(card);
            }

            card.innerHTML = `
        <h2 style="margin-bottom:4px;">${pos.symbol}</h2>
        <p><strong>Quantity:</strong> ${pos.quantity}</p>
        <p><strong>Total Shares:</strong> ${pos.totalShares}</p>
        <p><strong>Avg Buy Price:</strong> $${pos.avgBuyPrice}</p>
        <p><strong>Current Price:</strong> $${pos.currentPrice}</p>
        <p><strong>Total Invested:</strong> $${pos.totalInvested}</p>
        <p><strong>Current Value:</strong> $${pos.currentValue}</p>
        <p><strong>Unrealized P&L:</strong>
          <span style="color:${pos.unrealizedPnL >= 0 ? '#0f0' : '#f00'};">
          $${pos.unrealizedPnL}</span></p>
        <p><strong>Realized P&L:</strong>
          <span style="color:${pos.realizedPnL >= 0 ? '#0f0' : '#f00'};">
          $${pos.realizedPnL}</span></p>
      `;
        });

        // ===== Smooth Chart Update =====
        if (!portfolioChart) {
            portfolioChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: positions.map(p => p.symbol),
                    datasets: [{
                        data: positions.map(p => parseFloat(p.currentValue)),
                        backgroundColor: ['#E0EBFF', '#A3C1FF', '#7993FF', '#5368A6', '#2A3C6B', '#0D1A33'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    animation: { duration: 500 },
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#fff' } },
                        title: { display: true, text: 'Portfolio Distribution', color: '#E0EBFF', font: { size: 18 } }
                    }
                }
            });
        } else {
            portfolioChart.data.labels = positions.map(p => p.symbol);
            portfolioChart.data.datasets[0].data = positions.map(p => parseFloat(p.currentValue));
            portfolioChart.update('active');
        }
    }

    // Initial render
    refreshPortfolioData();

    // Expose refresh globally
    window.fetchPortfolio = refreshPortfolioData;
});
