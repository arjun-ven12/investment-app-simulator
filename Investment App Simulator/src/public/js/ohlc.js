window.addEventListener('DOMContentLoaded', () => {
  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', (e) => {
    e.preventDefault();
    // Redirect to the Investment Dashboard and scroll to the Options tab
    window.location.href = '/investment#options-dashboard';
  });
});


//////////////////////////////////////////////////////
/// OPTION OHLC CHART
//////////////////////////////////////////////////////

window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  let symbol = params.get("symbol");

  if (!symbol) return;

  symbol = decodeURIComponent(symbol);
  if (symbol.startsWith("O:")) symbol = symbol.slice(2);

  document.getElementById('symbol-heading').textContent = `Option OHLC: ${symbol}`;

  try {
    // ---------------- Fetch OHLC data ----------------
    const res = await fetch(`/options/ohlc/O:${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Failed to fetch OHLC data: ${res.status}`);
    const data = await res.json();
    const ohlcData = data.savedData || [];

    if (!ohlcData.length) throw new Error("No OHLC data available.");

    // ---------------- Prepare datasets ----------------
// ----------------------
// NORMALIZE DATA (CRITICAL)
// ----------------------
const candleData = ohlcData
  .map(d => {
    const ts = Date.parse(d.date); // MUST include time for intraday
    return {
      x: ts,
      o: Number(d.openPrice),
      h: Number(d.highPrice),
      l: Number(d.lowPrice),
      c: Number(d.closePrice)
    };
  })
  .filter(d => !Number.isNaN(d.x))
  .sort((a, b) => a.x - b.x);

const lineData = candleData.map(d => ({
  x: d.x,
  y: d.c
}));

// Debug once — REMOVE after verification
console.log('CANDLE DATA SAMPLE:', candleData.slice(0, 5));

// ----------------------
// CHART SETUP
// ----------------------
const ctx = document.getElementById('ohlc-chart').getContext('2d');
let chart;
const chartTypeSelect = document.getElementById('chart-type-select');

// ----------------------
// RENDER FUNCTION
// ----------------------
function renderChart(type) {
  if (chart) chart.destroy();

  if (type === 'line') {
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: `${symbol} Close`,
          data: lineData,
          borderColor: '#8FADFD',
          backgroundColor: 'rgba(143,173,253,0.3)',
          fill: true,
          tension: 0.2
        }]
      },
      options: baseOptions()
    });
  }

  if (type === 'candlestick') {
    chart = new Chart(ctx, {
      type: 'candlestick',
      data: {
        datasets: [{
          label: `${symbol} OHLC`,
          data: candleData,
          borderColor: {
            up: '#4caf50',
            down: '#f44336',
            unchanged: '#999'
          }
        }]
      },
      options: {
        ...baseOptions(),
        parsing: false, // 🔥 REQUIRED FOR FINANCIAL CHARTS
        plugins: {
          tooltip: {
            callbacks: {
              label(ctx) {
                const d = ctx.raw;
                return `O:${d.o} H:${d.h} L:${d.l} C:${d.c}`;
              }
            }
          }
        }
      }
    });
  }
}

// ----------------------
// SHARED OPTIONS (IMPORTANT)
// ----------------------
function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      intersect: false
    },
    plugins: {
      legend: {
        labels: { color: 'white' }
      }
    },
    scales: {
      x: {
        type: 'time',
        adapters: { date: {} }, // force adapter
        time: {
          unit: 'day',
          tooltipFormat: 'MMM dd, yyyy HH:mm'
        },
        ticks: {
          color: 'white',
          source: 'data',
          autoSkip: true,
          maxRotation: 0
        },
        grid: {
          color: 'rgba(255,255,255,0.1)'
        }
      },
      y: {
        position: 'left',
        ticks: { color: 'white' },
        grid: {
          color: 'rgba(255,255,255,0.1)'
        }
      }
    }
  };
}

    // Initial chart render
    renderChart(chartTypeSelect.value);

    // Update chart when user changes type
    chartTypeSelect.addEventListener('change', () => renderChart(chartTypeSelect.value));

    // ---------------- Autofill latest price ----------------
    const latestPrice = lineData[lineData.length - 1]?.y ?? 0;
    const marketPriceInput = document.getElementById('market-price');
    const limitPriceInput = document.getElementById('limit-price');
    if (marketPriceInput) marketPriceInput.value = latestPrice.toFixed(2);
    if (limitPriceInput) limitPriceInput.value = latestPrice.toFixed(2);

    // ---------------- Order type toggle ----------------
    const orderTypeSelect = document.getElementById('order-type-select');
    const marketFields = document.getElementById('market-fields');
    const limitFields = document.getElementById('limit-fields');

    function updateFields() {
      if (orderTypeSelect.value === 'market') {
        marketFields.classList.remove('hidden');
        limitFields.classList.add('hidden');
        if (marketPriceInput) marketPriceInput.readOnly = true;
      } else if (orderTypeSelect.value === 'limit') {
        marketFields.classList.add('hidden');
        limitFields.classList.remove('hidden');
        if (limitPriceInput) limitPriceInput.readOnly = false;
      }
    }

    updateFields();
    orderTypeSelect.addEventListener('change', updateFields);

    // ---------------- Amount calculations ----------------
    const marketQuantityInput = document.getElementById('market-quantity');
    const marketAmountInput = document.getElementById('market-amount');
    const limitQuantityInput = document.getElementById('limit-quantity');
    const limitAmountInput = document.getElementById('limit-amount');

    function updateMarketAmount() {
      const qty = Number(marketQuantityInput.value || 0);
      const amt = qty * latestPrice * 100;
      marketAmountInput.value = amt.toFixed(2);
    }

    function updateLimitAmount() {
      const qty = Number(limitQuantityInput.value || 0);
      const price = Number(limitPriceInput.value || 0);
      const amt = qty * price * 100;
      limitAmountInput.value = amt.toFixed(2);
    }

    marketQuantityInput.addEventListener('input', updateMarketAmount);
    limitQuantityInput.addEventListener('input', updateLimitAmount);
    limitPriceInput.addEventListener('input', updateLimitAmount);

  } catch (err) {
    const msg = err?.message || err?.toString();
    console.error(err);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<p style="color:red;">Error loading chart: ${msg}</p>`
    );
  }
});




function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 100);

  // Remove toast after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

///////////////////////////////////////////////////////////////////
// PLACE BUY/SELL CALL/PUT MARKET/LIMIT ORDER
///////////////////////////////////////////////////////////////////
window.addEventListener('DOMContentLoaded', async () => {
  const tradingForm = document.querySelector('#trading-form');
  const orderTypeSelect = document.querySelector('#order-type');
  const quantityInput = document.querySelector('#market-quantity');
  const priceInput = document.querySelector('#market-price');
  const amountInput = document.querySelector('#market-amount');
  const limitPriceInput = document.querySelector('#limit-price');
  const limitQuantityInput = document.querySelector('#limit-quantity');
  const limitAmountInput = document.querySelector('#limit-amount');
  const buyRadio = document.querySelector("input[name='side'][value='buy']");
  const sellRadio = document.querySelector("input[name='side'][value='sell']");
  const errorMessage = document.querySelector('#buy-error');
  const successMessage = document.querySelector('#create-success');


  function getContractSymbolFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('symbol'); // e.g. AAPL251003C00110000
  }

  let latestPrice = 0;
  let expirationDate = null; // Store the contract’s expiration date

  async function fetchPrice(symbol) {
    try {
      const res = await fetch(`/options/ohlc/${symbol}`);
      if (!res.ok) throw new Error('Failed to fetch OHLC data');
      const data = await res.json();

      const ohlcData = data.savedData;
      if (!ohlcData || ohlcData.length === 0)
        throw new Error('No OHLC data available');

      const latest = ohlcData[ohlcData.length - 1];
      latestPrice = parseFloat(latest.closePrice);
      priceInput.value = latestPrice.toFixed(2);

      // 🔹 Also store expiration date if backend provides it
      if (data.contractInfo && data.contractInfo.expirationDate) {
        expirationDate = new Date(data.contractInfo.expirationDate);
        console.log('Contract expiration date:', expirationDate);
      } else if (latest.expirationDate) {
        expirationDate = new Date(latest.expirationDate);
        console.log('Extracted expiration date from OHLC:', expirationDate);
      }
    } catch (err) {
      console.error(err);
      errorMessage.textContent = err.message;
    }
  }

  function calculateMarketAmount() {
    const qty = parseInt(quantityInput.value) || 0;
    amountInput.value = (latestPrice * qty * 100).toFixed(2);
  }

  function calculateLimitAmount() {
    const qty = parseInt(limitQuantityInput.value) || 0;
    const price = parseFloat(limitPriceInput.value) || 0;
    limitAmountInput.value = (price * qty * 100).toFixed(2);
  }

  quantityInput.addEventListener('input', calculateMarketAmount);
  limitQuantityInput.addEventListener('input', calculateLimitAmount);
  limitPriceInput.addEventListener('input', calculateLimitAmount);

  tradingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = '';
successMessage.textContent = '';

    const contractSymbol = getContractSymbolFromURL();
    if (!contractSymbol) {
      errorMessage.textContent = 'No contract symbol provided';
      return;
    }

    const isCall = contractSymbol.includes('C');
    const isPut = contractSymbol.includes('P');
    const userId = localStorage.getItem('userId');
    if (!userId) {
      errorMessage.textContent = 'User not logged in';
      return;
    }

    const orderType = orderTypeSelect.value.toUpperCase();
    const side = buyRadio.checked ? 'buy' : sellRadio.checked ? 'sell' : null;

    if (!side) {
      errorMessage.textContent = 'Please select Buy or Sell.';
      return;
    }

    // 🔹 Expiration check
    if (expirationDate) {
      const now = new Date();
      const expiryCutoff = new Date(expirationDate);
      expiryCutoff.setHours(20, 0, 0, 0); // 8:00 PM cutoff same as PnL logic

      if (now >= expiryCutoff) {
        errorMessage.textContent = '⚠️ This option contract has already expired and cannot be traded.';
        return;
      }
    } else {
      console.warn('No expiration date found for contract; skipping expiry check.');
    }

    try {
      let quantity, price;

      if (orderType === 'MARKET') {
        quantity = parseInt(quantityInput.value);
        price = latestPrice;
      } else if (orderType === 'LIMIT') {
        quantity = parseInt(limitQuantityInput.value);
        price = parseFloat(limitPriceInput.value);
      } else {
        errorMessage.textContent = 'Invalid order type.';
        return;
      }

      if (!quantity || quantity <= 0) {
        errorMessage.textContent = 'Enter a valid quantity.';
        return;
      }
      if (!price || price <= 0) {
        errorMessage.textContent = 'Enter a valid price.';
        return;
      }

      const body = {
        userId: parseInt(userId),
        contractId: contractSymbol,
        quantity,
        price,
        orderType,
      };

      let endpoint = '';
      if (side === 'buy') {
        endpoint = isCall ? '/options/buy-call' : '/options/buy-put';
      } else if (side === 'sell') {
        endpoint = isCall ? '/options/sell-call' : '/options/sell-put';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');

      // alert(data.message);
      successMessage.textContent = `${data.message}`;
    successMessage.classList.remove('hidden'); // in case you hide it with CSS
      errorMessage.textContent = ''; // clear any previous errors

      tradingForm.reset();
      amountInput.value = '--';
      limitAmountInput.value = '--';
      priceInput.value = latestPrice.toFixed(2);
    } catch (err) {
      console.error(err);
      errorMessage.textContent = err.message || 'Error placing order';
    }
  });

  // 🔹 Initial fetch
  const initialSymbol = getContractSymbolFromURL();
  if (!initialSymbol) {
    errorMessage.textContent = 'No contract symbol in URL';
    return;
  }
  await fetchPrice(initialSymbol);
});
