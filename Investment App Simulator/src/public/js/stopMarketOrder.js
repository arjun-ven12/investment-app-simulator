

console.log("✅ Unified order JS loaded");

document.addEventListener('DOMContentLoaded', () => {
  // ===== Elements =====
  const tradingForm = document.getElementById('trading-form');
  const orderTypeSelect = document.getElementById('order-type');

  const stopLimitTriggerInput = document.getElementById('stop-limit-trigger');
  const stopLimitPriceInput = document.getElementById('stop-limit-price');
  const triggerInput = document.getElementById('trigger-price'); // stop-market
  const quantityInput = document.getElementById('quantity');
  const amountInput = document.getElementById('amount');
  const buyError = document.getElementById('buy-error');
  const submitButton = document.getElementById('submit-order');

  const stopMarketContainer = document.getElementById('stop-market-container');
  const stopLimitContainer = document.getElementById('stop-limit-container');
  const timeframeContainer = document.getElementById('timeframe-container');

  // Stop limit checkbox + input
  const stopLimitCheck = document.getElementById("enable-stop-limit");
  const stopLimitInput = document.getElementById("stop-limit-price");

  // ===== Disclaimer Elements =====
  const stopLimitDisclaimer = document.createElement('small');
  stopLimitDisclaimer.id = 'stop-limit-disclaimer';
  stopLimitDisclaimer.style.display = 'none';
  stopLimitDisclaimer.style.color = '#ff6600';
  stopLimitDisclaimer.style.marginTop = '12px';
  stopLimitDisclaimer.innerHTML = "⚠️ Stop-limit orders are <strong>not guaranteed to execute</strong>. Estimated amount is based on your limit price; actual execution may differ or be partially filled.";
  submitButton.insertAdjacentElement('afterend', stopLimitDisclaimer);

  const stopMarketDisclaimer = document.createElement('small');
  stopMarketDisclaimer.id = 'stop-market-disclaimer';
  stopMarketDisclaimer.style.display = 'none';
  stopMarketDisclaimer.style.color = '#ff6600';
  stopMarketDisclaimer.style.marginTop = '12px';
  stopMarketDisclaimer.textContent = "⚠️ Buy triggers only above market price. Sell triggers only below market price. Final amount will be based on execution price.";
  submitButton.insertAdjacentElement('afterend', stopMarketDisclaimer);

  // ===== Helper Functions =====
  function updateStopLimitEstimatedAmount() {
    if (!stopLimitTriggerInput || !stopLimitPriceInput || !quantityInput) return;
    const trigger = parseFloat(stopLimitTriggerInput.value) || 0;
    const limit = parseFloat(stopLimitPriceInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    amountInput.value = (limit > 0 && quantity > 0) ? (limit * quantity).toFixed(2) : "--";
  }

  function updateStopMarketEstimatedAmount() {
    if (!triggerInput || !quantityInput) return;
    const trigger = parseFloat(triggerInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    amountInput.value = (trigger > 0 && quantity > 0) ? (trigger * quantity).toFixed(2) : "--";
  }

  // ===== Event Listeners =====
  stopLimitTriggerInput?.addEventListener('input', updateStopLimitEstimatedAmount);
  stopLimitPriceInput?.addEventListener('input', updateStopLimitEstimatedAmount);
  triggerInput?.addEventListener('input', updateStopMarketEstimatedAmount);
  quantityInput?.addEventListener('input', () => {
    updateStopLimitEstimatedAmount();
    updateStopMarketEstimatedAmount();
  });


  orderTypeSelect?.addEventListener('change', () => {
    const selected = orderTypeSelect.value;

    // Reset all
    triggerInput.required = false;
    stopLimitTriggerInput.required = false;
    stopLimitPriceInput.required = false;
    quantityInput.required = false;

    stopMarketContainer?.classList.add("hidden");
    stopLimitContainer?.classList.add("hidden");
    timeframeContainer?.classList.add("hidden");
    stopLimitDisclaimer.style.display = 'none';
    stopMarketDisclaimer.style.display = 'none';
    const priceInput = document.getElementById("price"); // your normal limit/market price input
    if (priceInput) priceInput.readOnly = true;

    switch (selected) {
      case "market":
        // timeframe hidden for market
        quantityInput.required = true;
        break;

      case "limit":
        timeframeContainer?.classList.remove("hidden"); // show timeframe only for limit
        quantityInput.required = true;
        if (priceInput) priceInput.readOnly = false; // editable price
        // ensure stop-limit price is hidden
        stopLimitContainer?.classList.add("hidden");
        stopLimitDisclaimer.style.display = 'none';
        break;

      case "stop-market":
        stopMarketContainer.classList.remove("hidden");
        stopMarketDisclaimer.style.display = "block";
        break;

      case "stop-limit":
        stopLimitContainer?.classList.remove("hidden");
        document.getElementById("stop-limit-trigger-container")?.classList.remove("hidden");
        quantityInput.required = true;
        stopLimitDisclaimer.style.display = 'block';
        break;
    }
  });

  ;

  // ===== Form Submission =====
  tradingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    buyError.textContent = '';
    const side = tradingForm.querySelector("input[name='side']:checked")?.value;
    const orderType = orderTypeSelect.value;
    const quantity = parseInt(quantityInput.value);

    if (!quantity || quantity <= 0) return buyError.textContent = 'Enter valid quantity';

    try {
      if (orderType === "stop-limit") {
        const triggerPrice = parseFloat(stopLimitTriggerInput.value);
        const limitPrice = parseFloat(stopLimitPriceInput.value);

        console.log('Sending stop-limit order...');
        const res = await fetch('/stop-limit/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            stockId: currentStockId,
            quantity,
            triggerPrice,
            limitPrice,
            tradeType: side.toUpperCase()
          })
        });

        const data = await res.json();
        console.log('Stop-Limit response:', data);

        if (!res.ok) {
          throw new Error(data?.error || data?.message || 'Failed to create stop-limit order');
        }

        // Clear inputs only on success
        stopLimitTriggerInput.value = '';
        stopLimitPriceInput.value = '';
        quantityInput.value = '';
        amountInput.value = '--';
        alert('Stop-Limit order created successfully!');



      } else if (orderType === "stop-market") {
        const triggerPrice = parseFloat(triggerInput.value);
        if (!triggerPrice || triggerPrice <= 0) return buyError.textContent = 'Enter valid trigger price';

        const res = await fetch('/stop-market/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            stockId: currentStockId,
            quantity,
            triggerPrice,
            orderType: side.toUpperCase()
          })
        });

        const data = await res.json();
        console.log('Stop-Market response:', data);

        if (!res.ok) {
          // Use backend error if available
          throw new Error(data?.message || data?.error || 'Failed to create stop-Market order');
        }

        // Only clear inputs after success
        stopLimitTriggerInput.value = '';
        stopLimitPriceInput.value = '';
        quantityInput.value = '';
        amountInput.value = '--';
        alert('Stop-Market order created successfully!');
      }

    } catch (err) {
      buyError.textContent = err.message;
      console.error(err);
    }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (!userId || !token) return console.error("User not logged in");

  // Elements
  const stopMarketTableBody = document.getElementById("stop-market-table-body");
  const stopLimitTableBody = document.getElementById("stop-limit-table-body");
  const stopMarketError = document.getElementById("stop-market-error");
  const stopLimitError = document.getElementById("stop-limit-error");

  // Fetch Stop-Market Orders
  async function fetchStopMarketOrders() {
    try {
      const res = await fetch(`/stop-market/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Error fetching stop-market orders");

      // Clear table first
      stopMarketTableBody.innerHTML = "";

      data.orders.forEach((order) => {
        const triggerPrice = parseFloat(order.triggerPrice) || 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
  <td>${new Date(order.createdAt).toLocaleString()}</td>
  <td>${order.stock?.symbol || "--"}</td>
  <td>${order.tradeType}</td>
  <td>${order.quantity}</td>
  <td>${triggerPrice.toFixed(2)}</td>
  <td>${order.status || "Pending"}</td>
  `;
        stopMarketTableBody.appendChild(tr);
      });
    } catch (err) {
      stopMarketError.textContent = err.message;
      console.error(err);
    }
  }

  // Fetch Stop-Limit Orders
  async function fetchStopLimitOrders() {
    try {
      const res = await fetch(`/stop-limit/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Error fetching stop-limit orders");

      // Clear table first
      stopLimitTableBody.innerHTML = "";
      data.orders.forEach((order) => {
        const triggerPrice = parseFloat(order.triggerPrice) || 0;
        const limitPrice = parseFloat(order.limitPrice) || 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
  <td>${new Date(order.createdAt).toLocaleString()}</td>
  <td>${order.stock?.symbol || "--"}</td>
  <td>${order.tradeType}</td>
  <td>${order.quantity}</td>
  <td>${triggerPrice.toFixed(2)}</td>
  <td>${limitPrice.toFixed(2)}</td>
  <td>${order.status || "Pending"}</td>
  `;
        stopLimitTableBody.appendChild(tr);
      });
    } catch (err) {
      stopLimitError.textContent = err.message;
      console.error(err);
    }
  }

  // Initial fetch
  fetchStopMarketOrders();
  fetchStopLimitOrders();

  // Optional: Refresh every 30 seconds
  setInterval(() => {
    fetchStopMarketOrders();
    fetchStopLimitOrders();
  }, 30000);
});
