

window.addEventListener('DOMContentLoaded', () => {
  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', (e) => {
    e.preventDefault();
    // Redirect to the Investment Dashboard and scroll to the Options tab
    window.location.href = '/html/investment.html#options-dashboard';
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
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                x: { type: 'time', time: { unit: 'day' }, ticks: { color: 'white' }, title: { display: true, text: 'Date', color: 'white' } },
                y: { beginAtZero: false, ticks: { color: 'white' }, title: { display: true, text: 'Close Price', color: 'white' } }
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

  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend', `<p style="color:red;">Error loading chart: ${err.message}</p>`);
  }
});



// ///////////////////////////////////////////////////////////////
// /// PLACE BUY CALL/PUT MARKET/LIMIT ORDER
// ///////////////////////////////////////////////////////////////

// window.addEventListener('DOMContentLoaded', async () => {
//   const tradingForm = document.querySelector('#trading-form');
//   const orderTypeSelect = document.querySelector('#order-type');
//   const quantityInput = document.querySelector('#market-quantity');
//   const priceInput = document.querySelector('#market-price');
//   const amountInput = document.querySelector('#market-amount');

//   const limitPriceInput = document.querySelector('#limit-price');
//   const limitQuantityInput = document.querySelector('#limit-quantity');
//   const limitAmountInput = document.querySelector('#limit-amount');

//   const buyRadio = document.querySelector("input[name='side'][value='buy']");
//   const errorMessage = document.querySelector('#buy-error');

//   // 🔹 Function to get the symbol from URL
//   function getContractSymbolFromURL() {
//     const urlParams = new URLSearchParams(window.location.search);
//     return urlParams.get('symbol'); // e.g. AAPL251003C00110000
//   }

//   let latestPrice = 0;

//   async function fetchPrice(symbol) {
//     try {
//       const res = await fetch(`/options/ohlc/${symbol}`);
//       if (!res.ok) throw new Error('Failed to fetch OHLC data');

//       const data = await res.json();
//       const ohlcData = data.savedData;
//       if (!ohlcData || ohlcData.length === 0) throw new Error('No OHLC data available');

//       const latest = ohlcData[ohlcData.length - 1];
//       latestPrice = parseFloat(latest.closePrice);
//       priceInput.value = latestPrice.toFixed(2);
//     } catch (err) {
//       console.error(err);
//       errorMessage.textContent = err.message;
//     }
//   }

//   function calculateMarketAmount() {
//     const qty = parseInt(quantityInput.value) || 0;
//     amountInput.value = (latestPrice * qty * 100).toFixed(2);
//   }

//   function calculateLimitAmount() {
//     const qty = parseInt(limitQuantityInput.value) || 0;
//     const price = parseFloat(limitPriceInput.value) || 0;
//     limitAmountInput.value = (price * qty * 100).toFixed(2);
//   }

//   quantityInput.addEventListener('input', calculateMarketAmount);
//   limitQuantityInput.addEventListener('input', calculateLimitAmount);
//   limitPriceInput.addEventListener('input', calculateLimitAmount);

//   tradingForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     errorMessage.textContent = '';

//     const contractSymbol = getContractSymbolFromURL();
//     if (!contractSymbol) {
//       errorMessage.textContent = 'No contract symbol provided';
//       return;
//     }

//     const isCall = contractSymbol.includes('C');
//     const isPut = contractSymbol.includes('P');

//     const userId = localStorage.getItem('userId');
//     if (!userId) {
//       errorMessage.textContent = 'User not logged in';
//       return;
//     }

//     const orderType = orderTypeSelect.value.toUpperCase(); // "MARKET" or "LIMIT"

//     try {
//       let quantity, price;

//       if (orderType === 'MARKET') {
//         if (!buyRadio.checked) {
//           errorMessage.textContent = 'Only Buy Market orders are supported here.';
//           return;
//         }

//         quantity = parseInt(quantityInput.value);
//         price = latestPrice;

//         if (!quantity || quantity <= 0) {
//           errorMessage.textContent = 'Enter a valid quantity.';
//           return;
//         }
//       } else if (orderType === 'LIMIT') {
//         quantity = parseInt(limitQuantityInput.value);
//         price = parseFloat(limitPriceInput.value);

//         if (!quantity || quantity <= 0) {
//           errorMessage.textContent = 'Enter a valid quantity for Limit order.';
//           return;
//         }
//         if (!price || price <= 0) {
//           errorMessage.textContent = 'Enter a valid price for Limit order.';
//           return;
//         }
//       } else {
//         errorMessage.textContent = 'Invalid order type.';
//         return;
//       }

//       const body = {
//         userId: parseInt(userId),
//         contractId: contractSymbol, // backend resolves numeric ID from symbol
//         quantity,
//         price,
//         orderType
//       };

//       const endpoint = isCall ? '/options/buy-call' : '/options/buy-put';

//       const res = await fetch(endpoint, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(body)
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Order failed');

//       alert(data.message);
//       tradingForm.reset();
//       amountInput.value = '--';
//       limitAmountInput.value = '--';
//       priceInput.value = latestPrice.toFixed(2);
//     } catch (err) {
//       console.error(err);
//       errorMessage.textContent = err.message || 'Error placing order';
//     }
//   });

//   // 🔹 Initial fetch based on URL
//   const initialSymbol = getContractSymbolFromURL();
//   if (!initialSymbol) {
//     errorMessage.textContent = 'No contract symbol in URL';
//     return;
//   }
//   await fetchPrice(initialSymbol);
// });



// /////////////////////////////////////////////////////////////////
// ////// PLACE SELL CALL/PUT - MARKET/LIMIT ORDER
// /////////////////////////////////////////////////////////////////


// window.addEventListener('DOMContentLoaded', async () => {
//   const tradingForm = document.querySelector('#trading-form');
//   const orderTypeSelect = document.querySelector('#order-type');
//   const quantityInput = document.querySelector('#market-quantity');
//   const priceInput = document.querySelector('#market-price');
//   const amountInput = document.querySelector('#market-amount');

//   const limitPriceInput = document.querySelector('#limit-price');
//   const limitQuantityInput = document.querySelector('#limit-quantity');
//   const limitAmountInput = document.querySelector('#limit-amount');

//   const sellRadio = document.querySelector("input[name='side'][value='sell']");
//   const errorMessage = document.querySelector('#buy-error'); // reuse same error div

//   function getContractSymbolFromURL() {
//     const urlParams = new URLSearchParams(window.location.search);
//     return urlParams.get('symbol'); // e.g. AAPL251003C00110000
//   }

//   let latestPrice = 0;

//   async function fetchPrice(symbol) {
//     try {
//       const res = await fetch(`/options/ohlc/${symbol}`);
//       if (!res.ok) throw new Error('Failed to fetch OHLC data');

//       const data = await res.json();
//       const ohlcData = data.savedData;
//       if (!ohlcData || ohlcData.length === 0) throw new Error('No OHLC data available');

//       const latest = ohlcData[ohlcData.length - 1];
//       latestPrice = parseFloat(latest.closePrice);
//       priceInput.value = latestPrice.toFixed(2);
//     } catch (err) {
//       console.error(err);
//       errorMessage.textContent = err.message;
//     }
//   }

//   function calculateMarketAmount() {
//     const qty = parseInt(quantityInput.value) || 0;
//     amountInput.value = (latestPrice * qty * 100).toFixed(2);
//   }

//   function calculateLimitAmount() {
//     const qty = parseInt(limitQuantityInput.value) || 0;
//     const price = parseFloat(limitPriceInput.value) || 0;
//     limitAmountInput.value = (price * qty * 100).toFixed(2);
//   }

//   quantityInput.addEventListener('input', calculateMarketAmount);
//   limitQuantityInput.addEventListener('input', calculateLimitAmount);
//   limitPriceInput.addEventListener('input', calculateLimitAmount);

//   tradingForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     errorMessage.textContent = '';

//     const contractSymbol = getContractSymbolFromURL();
//     if (!contractSymbol) {
//       errorMessage.textContent = 'No contract symbol provided';
//       return;
//     }

//     const isCall = contractSymbol.includes('C');
//     const isPut = contractSymbol.includes('P');

//     const userId = localStorage.getItem('userId');
//     if (!userId) {
//       errorMessage.textContent = 'User not logged in';
//       return;
//     }

//     const orderType = orderTypeSelect.value.toUpperCase(); // "MARKET" or "LIMIT"

//     try {
//       // if (!sellRadio.checked) {
//       //   errorMessage.textContent = 'Only Sell orders are supported here.';
//       //   return;
//       // }

//       let quantity, price;

//       if (orderType === 'MARKET') {
//         quantity = parseInt(quantityInput.value);
//         price = latestPrice;

//         if (!quantity || quantity <= 0) {
//           errorMessage.textContent = 'Enter a valid quantity.';
//           return;
//         }
//       } else if (orderType === 'LIMIT') {
//         quantity = parseInt(limitQuantityInput.value);
//         price = parseFloat(limitPriceInput.value);

//         if (!quantity || quantity <= 0) {
//           errorMessage.textContent = 'Enter a valid quantity for Limit order.';
//           return;
//         }
//         if (!price || price <= 0) {
//           errorMessage.textContent = 'Enter a valid price for Limit order.';
//           return;
//         }
//       } else {
//         errorMessage.textContent = 'Invalid order type.';
//         return;
//       }

//       const body = {
//         userId: parseInt(userId),
//         contractId: contractSymbol, // backend resolves numeric ID
//         quantity,
//         price,
//         orderType
//       };

//       // 🔹 Sell endpoints
//       const endpoint = isCall ? '/options/sell-call' : '/options/sell-put';

//       const res = await fetch(endpoint, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(body)
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Order failed');

//       alert(data.message);
//       tradingForm.reset();
//       amountInput.value = '--';
//       limitAmountInput.value = '--';
//       priceInput.value = latestPrice.toFixed(2);
//     } catch (err) {
//       console.error(err);
//       errorMessage.textContent = err.message || 'Error placing order';
//     }
//   });

//   // 🔹 Initial fetch based on URL
//   const initialSymbol = getContractSymbolFromURL();
//   if (!initialSymbol) {
//     errorMessage.textContent = 'No contract symbol in URL';
//     return;
//   }
//   await fetchPrice(initialSymbol);
// });














///////////////////////////////////////////////////////////////////
// PLACE BUY/SELL CALL/PUT MARKET/LIMIT ORDER
///////////////////////////////////////////////////////////////////
// window.addEventListener('DOMContentLoaded', async () => {
//   const tradingForm = document.querySelector('#trading-form');
//   const orderTypeSelect = document.querySelector('#order-type');
//   const quantityInput = document.querySelector('#market-quantity');
//   const priceInput = document.querySelector('#market-price');
//   const amountInput = document.querySelector('#market-amount');

//   const limitPriceInput = document.querySelector('#limit-price');
//   const limitQuantityInput = document.querySelector('#limit-quantity');
//   const limitAmountInput = document.querySelector('#limit-amount');

//   const buyRadio = document.querySelector("input[name='side'][value='buy']");
//   const sellRadio = document.querySelector("input[name='side'][value='sell']");
//   const errorMessage = document.querySelector('#buy-error');

//   // 🔹 Extract contract symbol from URL
//   function getContractSymbolFromURL() {
//     const urlParams = new URLSearchParams(window.location.search);
//     return urlParams.get('symbol'); // e.g. AAPL251003C00110000
//   }

//   let latestPrice = 0;

//   async function fetchPrice(symbol) {
//     try {
//       const res = await fetch(`/options/ohlc/${symbol}`);
//       if (!res.ok) throw new Error('Failed to fetch OHLC data');

//       const data = await res.json();
//       const ohlcData = data.savedData;
//       if (!ohlcData || ohlcData.length === 0)
//         throw new Error('No OHLC data available');

//       const latest = ohlcData[ohlcData.length - 1];
//       latestPrice = parseFloat(latest.closePrice);
//       priceInput.value = latestPrice.toFixed(2);
//     } catch (err) {
//       console.error(err);
//       errorMessage.textContent = err.message;
//     }
//   }

//   function calculateMarketAmount() {
//     const qty = parseInt(quantityInput.value) || 0;
//     amountInput.value = (latestPrice * qty * 100).toFixed(2);
//   }

//   function calculateLimitAmount() {
//     const qty = parseInt(limitQuantityInput.value) || 0;
//     const price = parseFloat(limitPriceInput.value) || 0;
//     limitAmountInput.value = (price * qty * 100).toFixed(2);
//   }

//   quantityInput.addEventListener('input', calculateMarketAmount);
//   limitQuantityInput.addEventListener('input', calculateLimitAmount);
//   limitPriceInput.addEventListener('input', calculateLimitAmount);

//   tradingForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     errorMessage.textContent = '';

//     const contractSymbol = getContractSymbolFromURL();
//     if (!contractSymbol) {
//       errorMessage.textContent = 'No contract symbol provided';
//       return;
//     }

//     const isCall = contractSymbol.includes('C');
//     const isPut = contractSymbol.includes('P');

//     const userId = localStorage.getItem('userId');
//     if (!userId) {
//       errorMessage.textContent = 'User not logged in';
//       return;
//     }

//     const orderType = orderTypeSelect.value.toUpperCase(); // "MARKET" or "LIMIT"
//     const side = buyRadio.checked ? 'buy' : sellRadio.checked ? 'sell' : null;

//     if (!side) {
//       errorMessage.textContent = 'Please select Buy or Sell.';
//       return;
//     }

//     try {
//       let quantity, price;

//       if (orderType === 'MARKET') {
//         quantity = parseInt(quantityInput.value);
//         price = latestPrice;
//       } else if (orderType === 'LIMIT') {
//         quantity = parseInt(limitQuantityInput.value);
//         price = parseFloat(limitPriceInput.value);
//       } else {
//         errorMessage.textContent = 'Invalid order type.';
//         return;
//       }

//       if (!quantity || quantity <= 0) {
//         errorMessage.textContent = 'Enter a valid quantity.';
//         return;
//       }
//       if (!price || price <= 0) {
//         errorMessage.textContent = 'Enter a valid price.';
//         return;
//       }

//       const body = {
//         userId: parseInt(userId),
//         contractId: contractSymbol,
//         quantity,
//         price,
//         orderType,
//       };

//       // 🔹 Determine correct endpoint dynamically
//       let endpoint = '';
//       if (side === 'buy') {
//         endpoint = isCall ? '/options/buy-call' : '/options/buy-put';
//       } else if (side === 'sell') {
//         endpoint = isCall ? '/options/sell-call' : '/options/sell-put';
//       }

//       const res = await fetch(endpoint, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(body),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Order failed');

//       alert(data.message);
//       tradingForm.reset();
//       amountInput.value = '--';
//       limitAmountInput.value = '--';
//       priceInput.value = latestPrice.toFixed(2);
//     } catch (err) {
//       console.error(err);
//       errorMessage.textContent = err.message || 'Error placing order';
//     }
//   });

//   // 🔹 Initial fetch
//   const initialSymbol = getContractSymbolFromURL();
//   if (!initialSymbol) {
//     errorMessage.textContent = 'No contract symbol in URL';
//     return;
//   }
//   await fetchPrice(initialSymbol);
// });



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
