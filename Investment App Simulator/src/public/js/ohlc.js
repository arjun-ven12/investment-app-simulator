
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
  // Parse symbol from query parameter
  const params = new URLSearchParams(window.location.search);
  const symbol = params.get('symbol');
  if (!symbol) return;

  document.getElementById('symbol-heading').textContent = `Option OHLC: ${symbol}`;

  try {
    const res = await fetch(`/options/ohlc/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Failed to fetch OHLC data: ${res.status}`);
    const data = await res.json();

            const lineData = data.savedData.map(d => ({
            x: new Date(d.date),
            y: d.closePrice  // changed from d.close
            }));

            // Chart
           const ctx = document.getElementById('ohlc-chart').getContext('2d');

new Chart(ctx, {
  type: 'line',
  data: {
    datasets: [{
      label: `${symbol} Close Price`,
      data: lineData,
      borderColor: '#E0EBFF', // match theme line color
      fill: true,
      tension: 0.1,
      backgroundColor: function(context) {
        const chart = context.chart;
        const { ctx, chartArea } = chart;

        if (!chartArea) return null; // Chart not fully initialized

        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(143,173,253,0.4)'); // top translucent blue
        gradient.addColorStop(1, 'rgba(143,173,253,0)');   // bottom transparent
        return gradient;
      }
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'white' } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'day', tooltipFormat: 'MMM dd, yyyy HH:mm' },
        ticks: { color: 'white' },
        grid: {
          drawOnChartArea: true,
          color: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(255,255,255,0.1)';
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.15)');
            gradient.addColorStop(1, 'rgba(255,255,255,0.05)');
            return gradient;
          }
        },
        title: { display: true, text: 'Date', color: 'white' }
      },
      y: {
        beginAtZero: false,
        ticks: { color: 'white' },
        grid: {
          drawOnChartArea: true,
          color: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(255,255,255,0.1)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.15)');
            gradient.addColorStop(1, 'rgba(255,255,255,0.05)');
            return gradient;
          }
        },
        title: { display: true, text: 'Close Price', color: 'white' }
      }
    }
  }
});

            // Autofill latest price
            const latestPrice = lineData[lineData.length - 1]?.y ?? 0;

            const marketPriceInput = document.getElementById('market-price');
            const limitPriceInput = document.getElementById('limit-price');

            if (marketPriceInput) marketPriceInput.value = latestPrice.toFixed(2);
            if (limitPriceInput) limitPriceInput.value = latestPrice.toFixed(2);


    function updateFields() {
      if (orderTypeSelect.value === 'market') {
        marketFields.classList.remove('hidden');
        limitFields.classList.add('hidden');
        marketPriceInput.readOnly = true;
      } else if (orderTypeSelect.value === 'limit') {
        marketFields.classList.add('hidden');
        limitFields.classList.remove('hidden');
        limitPriceInput.readOnly = false;
      }
    }

    // Initial toggle
    updateFields();

    // Toggle fields on change
    orderTypeSelect.addEventListener('change', updateFields);

    // Optionally, you can add amount calculations here
    const marketQuantityInput = document.getElementById('market-quantity');
    const marketAmountInput = document.getElementById('market-amount');
    const limitQuantityInput = document.getElementById('limit-quantity');
    const limitAmountInput = document.getElementById('limit-amount');

    function updateMarketAmount() {
      const qty = Number(marketQuantityInput.value || 0);
      const amt = qty * latestPrice * 100; // 1 contract = 100 shares
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

  } 
catch (err) {
  const msg = err?.message || err?.toString();

  if (msg.includes("data.savedData.map is not a function")) {
    console.error("No Options data available for this symbol. Please choose another option contract.");
    showToast(`No Options data available for this symbol. Please choose another option contract.`, 'error');

    document.body.insertAdjacentHTML(
      "beforeend",
      `<p style="color:red; font-size: 14px">Error loading chart: No Options data available for this symbol. Please choose another option contract.</p>`
    );
  } else {
    console.error(err);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<p style="color:red;">Error loading chart: ${msg}</p>`
    );
  }
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
