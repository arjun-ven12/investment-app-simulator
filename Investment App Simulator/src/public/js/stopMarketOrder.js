document.addEventListener("DOMContentLoaded", () => {
  // ===== Element references =====
  const tradingForm = document.getElementById("trading-form");
  const orderTypeSelect = document.getElementById("order-type");

  const priceInput = document.getElementById("price");
  const quantityInput = document.getElementById("quantity");
  const amountInput = document.getElementById("amount");
  const buyError = document.getElementById("buy-error");
  const submitButton = document.getElementById("submit-order");

  // Stop-limit inputs + containers
  const stopLimitContainer = document.getElementById("stop-limit-container");
  const stopLimitPriceInput = document.getElementById("stop-limit-price");
  const stopLimitTriggerContainer = document.getElementById(
    "stop-limit-trigger-container"
  );
  const stopLimitTriggerInput = document.getElementById("stop-limit-trigger");

  // Stop-market
  const stopMarketContainer = document.getElementById("stop-market-container");
  const triggerInput = document.getElementById("trigger-price");

  // Timeframe container
  const timeframeContainer = document.getElementById("timeframe-container");

  // Ensure required DOM exists
  if (!orderTypeSelect || !quantityInput || !amountInput || !submitButton) {
    console.error("Critical form elements missing. Check your HTML IDs.");
    return;
  }

  // ===== Disclaimers (kept from your original code) =====
  const stopLimitDisclaimer = document.createElement("small");
  stopLimitDisclaimer.id = "stop-limit-disclaimer";
  stopLimitDisclaimer.style.display = "none";
  stopLimitDisclaimer.style.color = "#ff6600";
  stopLimitDisclaimer.style.marginTop = "12px";
  stopLimitDisclaimer.innerHTML =
    "⚠️ Stop-limit orders are <strong>not guaranteed to execute</strong>. Estimated amount is based on your limit price; actual execution may differ or be partially filled.";
  submitButton.insertAdjacentElement("afterend", stopLimitDisclaimer);

  const stopMarketDisclaimer = document.createElement("small");
  stopMarketDisclaimer.id = "stop-market-disclaimer";
  stopMarketDisclaimer.style.display = "none";
  stopMarketDisclaimer.style.color = "#ff6600";
  stopMarketDisclaimer.style.marginTop = "12px";
  stopMarketDisclaimer.textContent =
    "⚠️ Buy triggers only above market price. Sell triggers only below market price. Final amount will be based on execution price.";
  submitButton.insertAdjacentElement("afterend", stopMarketDisclaimer);

  // ===== Helpers =====
  function hide(el) {
    if (!el) return;
    el.classList.add("hidden");
    el.style.setProperty("display", "none", "important"); // force hide
  }

  function show(el, displayStyle = "block") {
    if (!el) return;
    el.classList.remove("hidden");
    el.style.setProperty("display", displayStyle, "important"); // override any CSS !important
  }

  function updateAmount() {
    const orderType = orderTypeSelect.value;
    const qty = parseInt(quantityInput.value, 10) || 0;
    const priceVal = parseFloat(priceInput?.value) || 0;
    const stopLimitPriceVal = parseFloat(stopLimitPriceInput?.value) || 0;
    const triggerVal = parseFloat(triggerInput?.value) || 0;

    let amount = "--";

    if (qty > 0) {
      switch (orderType) {
        case "market":
        case "limit":
          amount = priceVal > 0 ? (priceVal * qty).toFixed(2) : "--";
          break;
        case "stop-market":
          amount = triggerVal > 0 ? (triggerVal * qty).toFixed(2) : "--";
          break;
        case "stop-limit":
          // Use the LIMIT (not trigger) to calculate estimated amount
          amount =
            stopLimitPriceVal > 0 ? (stopLimitPriceVal * qty).toFixed(2) : "--";
          break;
        default:
          amount = "--";
      }
    }

    amountInput.value = amount;
  }

  function setVisibilityForOrderType(type) {
    // always hide all optional fields first
    hide(stopMarketContainer);
    hide(stopLimitContainer);
    hide(stopLimitTriggerContainer);
    hide(timeframeContainer);
    stopLimitDisclaimer.style.display = "none";
    stopMarketDisclaimer.style.display = "none";

    // reset required/readOnly
    triggerInput.required = false;
    stopLimitTriggerInput.required = false;
    stopLimitPriceInput.required = false;
    quantityInput.required = false;
    priceInput.readOnly = true;

    switch (type) {
      case "market":
        quantityInput.required = true;
        priceInput.readOnly = true;
        break;

      case "limit":
        quantityInput.required = true;
        priceInput.readOnly = false;
        show(timeframeContainer);
        hide(stopLimitContainer); // hide stop-limit price
        hide(stopLimitTriggerContainer); // hide trigger
        hide(stopMarketContainer); // hide stop-market trigger
        stopLimitDisclaimer.style.display = "none";
        stopMarketDisclaimer.style.display = "none";
        break;

      case "stop-market":
        show(stopMarketContainer);
        quantityInput.required = true;
        triggerInput.required = true;
        stopMarketDisclaimer.style.display = "block";
        break;

      case "stop-limit":
        show(stopLimitContainer, "block"); // Limit Price input
        show(stopLimitTriggerContainer, "block"); // Trigger Price input
        quantityInput.required = true;
        stopLimitTriggerInput.required = true;
        stopLimitPriceInput.required = true;
        stopLimitDisclaimer.style.display = "block";
        break;

      default:
        break;
    }

    amountInput.value = "--";
    updateAmount();
  }

  // ===== Attach events =====
  // input listeners for amount updates
  quantityInput.addEventListener("input", updateAmount);
  stopLimitTriggerInput?.addEventListener("input", updateAmount);
  stopLimitPriceInput?.addEventListener("input", updateAmount);
  triggerInput?.addEventListener("input", updateAmount);
  priceInput?.addEventListener("input", updateAmount);

  // order type change
  orderTypeSelect.addEventListener("change", (e) => {
    const selected = orderTypeSelect.value;
    setVisibilityForOrderType(selected);
  });

  // initialize visibility to nothing selected (or whatever the select default is)
  setVisibilityForOrderType(orderTypeSelect.value || "");

  // ===== Form submit (keeps your logic, with small protections) =====
  tradingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    buyError.textContent = "";
    const side = tradingForm.querySelector("input[name='side']:checked")?.value;
    const orderType = orderTypeSelect.value;
    const quantity = parseInt(quantityInput.value, 10);

    if (!quantity || quantity <= 0)
      return (buyError.textContent = "Enter valid quantity");

    try {
      if (orderType === "stop-limit") {
        const triggerPrice = parseFloat(stopLimitTriggerInput.value);
        const limitPrice = parseFloat(stopLimitPriceInput.value);
        if (!triggerPrice || triggerPrice <= 0)
          return (buyError.textContent = "Enter valid trigger price");
        if (!limitPrice || limitPrice <= 0)
          return (buyError.textContent = "Enter valid limit price");

        // Use your API call
        console.log("Sending stop-limit order...");
        const res = await fetch("/stop-limit/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            stockId: window.currentStockId || null, // ensure this is set in your app
            quantity,
            triggerPrice,
            limitPrice,
            tradeType: (side || "").toUpperCase(),
          }),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data?.error || data?.message || "Failed to create stop-limit order"
          );

        // clear inputs on success
        stopLimitTriggerInput.value = "";
        stopLimitPriceInput.value = "";
        quantityInput.value = "";
        amountInput.value = "--";
        alert("Stop-Limit order created successfully!");
      } else if (orderType === "stop-market") {
        const triggerPrice = parseFloat(triggerInput.value);
        if (!triggerPrice || triggerPrice <= 0)
          return (buyError.textContent = "Enter valid trigger price");

        const res = await fetch("/stop-market/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            stockId: window.currentStockId || null,
            quantity,
            triggerPrice,
            orderType: (side || "").toUpperCase(),
          }),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data?.message || data?.error || "Failed to create stop-market order"
          );

        stopLimitTriggerInput.value = "";
        stopLimitPriceInput.value = "";
        quantityInput.value = "";
        amountInput.value = "--";
        alert("Stop-Market order created successfully!");
      } else if (orderType === "limit" || orderType === "market") {
        // Implement your market/limit submission here if needed
        alert("Market/Limit submit path - implement as needed.");
      } else {
        buyError.textContent = "Select an order type";
      }
    } catch (err) {
      console.error(err);
      buyError.textContent = err.message || "An error occurred";
    }
  });

  // ===== (Optionally) socket + fetch logic from your original file =====
  // Keep the server fetch/socket code below or in other modules as you had before.
  // I intentionally separated UI logic from network calls above for clarity.
  if (typeof io !== "undefined") {
    socket = io();

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join", { userId }, (ack) => console.log("Join ack:", ack));
    });

    // Listen for full table updates
    socket.on("stopMarketUpdate", renderStopMarketTable);
    socket.on("stopLimitUpdate", renderStopLimitTable);

    socket.on("disconnect", () => {
      console.log("Socket disconnected. Reconnecting...");
    });
  }
  // Initial fetch
  fetchStopMarketOrders();
  fetchStopLimitOrders();

  renderStopLimitTable([]);
  renderStopMarketTable([]);
});
