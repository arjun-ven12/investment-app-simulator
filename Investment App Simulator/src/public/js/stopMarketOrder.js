
document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem('userId');
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

  function attachCancelHandlers() {
    const cancelButtons = document.querySelectorAll(".cancel-btn");

    cancelButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const orderId = btn.dataset.id;
        const orderType = btn.dataset.type;

        if (!confirm("Are you sure you want to cancel this order?")) return;

        try {
          const res = await fetch(`/${orderType}/cancel/${orderId}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to cancel order");

          alert("Order cancelled successfully!");

          // Refresh tables
          if (orderType === "stop-limit") fetchStopLimitOrders();
          else if (orderType === "stop-market") fetchStopMarketOrders();
        } catch (err) {
          console.error(err);
          alert(err.message || "Error cancelling order");
        }
      });
    });
  }
  function formatToSGT(utcString) {
    if (!utcString) return "N/A";
    const date = new Date(utcString);
    // Convert to Singapore time
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Singapore",
    };
    return new Intl.DateTimeFormat("en-SG", options).format(date);
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

  async function fetchStopMarketOrders() {
    try {
      const res = await fetch(`/stop-market/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        renderStopMarketTable(data.orders || []);
      } else {
        console.error("Failed to fetch stop-market orders:", data);
      }
    } catch (err) {
      console.error("Error fetching stop-market orders:", err);
    }
  }

  async function fetchStopLimitOrders() {
    try {
      const res = await fetch(`/stop-limit/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        renderStopLimitTable(data.orders || []);
      } else {
        console.error("Failed to fetch stop-limit orders:", data);
      }
    } catch (err) {
      console.error("Error fetching stop-limit orders:", err);
    }
  }


  // // ===== Form submit (keeps your logic, with small protections) =====
  // tradingForm?.addEventListener("submit", async (e) => {
  //   e.preventDefault();
  //   buyError.textContent = "";
  //   const side = tradingForm.querySelector("input[name='side']:checked")?.value;
  //   const orderType = orderTypeSelect.value;
  //   const quantity = parseInt(quantityInput.value, 10);

  //   if (!quantity || quantity <= 0)
  //     return (buyError.textContent = "Enter valid quantity");

  //   try {
  //     if (orderType === "stop-limit") {
  //       const triggerPrice = parseFloat(stopLimitTriggerInput.value);
  //       const limitPrice = parseFloat(stopLimitPriceInput.value);
  //       if (!triggerPrice || triggerPrice <= 0)
  //         return (buyError.textContent = "Enter valid trigger price");
  //       if (!limitPrice || limitPrice <= 0)
  //         return (buyError.textContent = "Enter valid limit price");

  //       // Use your API call
  //       console.log("Sending stop-limit order...");
  //       const res = await fetch("/stop-limit/create", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${localStorage.getItem("token")}`,
  //         },
  //         body: JSON.stringify({
  //           stockId: window.currentStockId || null, // ensure this is set in your app
  //           quantity,
  //           triggerPrice,
  //           limitPrice,
  //           tradeType: (side || "").toUpperCase(),
  //         }),
  //       });

  //       const data = await res.json();
  //       if (!res.ok)
  //         throw new Error(
  //           data?.error || data?.message || "Failed to create stop-limit order"
  //         );

  //       // clear inputs on success
  //       stopLimitTriggerInput.value = "";
  //       stopLimitPriceInput.value = "";
  //       quantityInput.value = "";
  //       amountInput.value = "--";
  //       alert("Stop-Limit order created successfully!");
  //     } else if (orderType === "stop-market") {
  //       const triggerPrice = parseFloat(triggerInput.value);
  //       if (!triggerPrice || triggerPrice <= 0)
  //         return (buyError.textContent = "Enter valid trigger price");

  //       const res = await fetch("/stop-market/create", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${localStorage.getItem("token")}`,
  //         },
  //         body: JSON.stringify({
  //           stockId: window.currentStockId || null,
  //           quantity,
  //           triggerPrice,
  //           orderType: (side || "").toUpperCase(),
  //         }),
  //       });

  //       const data = await res.json();
  //       if (!res.ok)
  //         throw new Error(
  //           data?.message || data?.error || "Failed to create stop-market order"
  //         );

  //       stopLimitTriggerInput.value = "";
  //       stopLimitPriceInput.value = "";
  //       quantityInput.value = "";
  //       amountInput.value = "--";
  //       alert("Stop-Market order created successfully!");
  //     // } else if (orderType === "limit" || orderType === "market") {
  //     //   // Implement your market/limit submission here if needed
  //     //   alert("Market/Limit submit path - implement as needed.");
  //     } else {
  //       buyError.textContent = "Select an order type";
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     buyError.textContent = err.message || "An error occurred";
  //   }
  // });

  // ===== Form submit (with debug logs) =====

  async function fetchStockId(symbol) {
    const res = await fetch(`/stocks/id/${symbol}`);
    if (!res.ok) throw new Error('Failed to fetch stock ID');
    const data = await res.json();
    return data.stock_id;
  }

  const symbolInput = document.querySelector("input[name='chartSymbol']");

tradingForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  buyError.textContent = "";

  const side = tradingForm.querySelector("input[name='side']:checked")?.value;
  const orderType = orderTypeSelect.value;
  const quantity = parseInt(quantityInput.value, 10);

  console.log("---- FORM SUBMIT ----");
  console.log("Side:", side);
  console.log("Order Type:", orderType);
  console.log("Quantity:", quantity);

  if (!quantity || quantity <= 0)
    return (buyError.textContent = "Enter valid quantity");

  try {
    if (orderType === "stop-limit") {
      const symbol = symbolInput.value.trim();

      const stockId = await fetchStockId(symbol);

      const triggerPrice = parseFloat(stopLimitTriggerInput.value);
      const limitPrice = parseFloat(stopLimitPriceInput.value);

      console.log("Stop-Limit triggerPrice:", triggerPrice);
      console.log("Stop-Limit limitPrice:", limitPrice);
      console.log("Current stockId:", window.currentStockId);

      if (!triggerPrice || triggerPrice <= 0)
        return (buyError.textContent = "Enter valid trigger price");
      if (!limitPrice || limitPrice <= 0)
        return (buyError.textContent = "Enter valid limit price");

      const bodyData = {
        stockId,
        quantity,
        triggerPrice,
        limitPrice,
        tradeType: (side || "").toUpperCase(),
      };
      console.log("🟦 Stop-Limit Request Body:", bodyData);

      const res = await fetch("/stop-limit/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      console.log("🟩 Stop-Limit Response:", res.status, data);

      if (!res.ok)
        throw new Error(
          data?.error || data?.message || "Failed to create stop-limit order"
        );

      stopLimitTriggerInput.value = "";
      stopLimitPriceInput.value = "";
      quantityInput.value = "";
      amountInput.value = "--";
      alert("Stop-Limit order created successfully!");
    }

    else if (orderType === "stop-market") {
      const triggerPrice = parseFloat(triggerInput.value);

      console.log("Stop-Market triggerPrice:", triggerPrice);
      console.log("Current stockId:", window.currentStockId);

      if (!triggerPrice || triggerPrice <= 0)
        return (buyError.textContent = "Enter valid trigger price");

        const symbol = symbolInput.value.trim();

        const stockId = await fetchStockId(symbol);

      const bodyData = {
        stockId,
        quantity,
        triggerPrice,
        orderType: (side || "").toUpperCase(),
      };
      console.log("🟦 Stop-Market Request Body:", bodyData);

      const res = await fetch("/stop-market/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      console.log("🟩 Stop-Market Response:", res.status, data);

      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Failed to create stop-market order"
        );

      stopLimitTriggerInput.value = "";
      stopLimitPriceInput.value = "";
      quantityInput.value = "";
      amountInput.value = "--";
      alert("Stop-Market order created successfully!");
    }

    else {
      console.warn("⚠️ Unknown order type selected:", orderType);
      buyError.textContent = "Select an order type";
    }

  } catch (err) {
    console.error("❌ Error submitting order:", err);
    buyError.textContent = err.message || "An error occurred";
  }
});


  const ROWS_PER_PAGE = 10;
let stopMarketPage = 1;
let stopLimitPage = 1;
let stopMarketOrders = [];
let stopLimitOrders = [];

function renderStopMarketTable(orders = []) {
  stopMarketOrders = orders;
  renderStopMarketPage(stopMarketPage);
}

function renderStopMarketPage(page) {
  const tableBody = document.getElementById("stop-market-table-body");
  const pagination = document.getElementById("stop-market-pagination");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  const start = (page - 1) * ROWS_PER_PAGE;
  const end = start + ROWS_PER_PAGE;
  const paginatedOrders = stopMarketOrders.slice(start, end);

  paginatedOrders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatToSGT(order.createdAt)}</td>
      <td>${order.stock?.symbol || "N/A"}</td>
      <td>${order.tradeType}</td>
      <td>${order.quantity}</td>
      <td>${order.triggerPrice}</td>
      <td>${order.status}</td>
      <td>
        ${order.status === "PENDING"
          ? `<button class="cancel-btn" data-id="${order.id}" data-type="stop-market">Cancel</button>`
          : ""}
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Pagination controls
  const totalPages = Math.ceil(stopMarketOrders.length / ROWS_PER_PAGE);
  pagination.innerHTML = `
    <button ${page <= 1 ? "disabled" : ""} id="stop-market-prev">Prev</button>
    <span>Page ${page} of ${totalPages || 1}</span>
    <button ${page >= totalPages ? "disabled" : ""} id="stop-market-next">Next</button>
  `;

  document.getElementById("stop-market-prev")?.addEventListener("click", () => {
    if (stopMarketPage > 1) {
      stopMarketPage--;
      renderStopMarketPage(stopMarketPage);
    }
  });

  document.getElementById("stop-market-next")?.addEventListener("click", () => {
    const totalPages = Math.ceil(stopMarketOrders.length / ROWS_PER_PAGE);
    if (stopMarketPage < totalPages) {
      stopMarketPage++;
      renderStopMarketPage(stopMarketPage);
    }
  });

  attachCancelHandlers();
}

function renderStopLimitTable(orders = []) {
  stopLimitOrders = orders;
  renderStopLimitPage(stopLimitPage);
}

function renderStopLimitPage(page) {
  const tableBody = document.getElementById("stop-limit-table-body");
  const pagination = document.getElementById("stop-limit-pagination");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  const start = (page - 1) * ROWS_PER_PAGE;
  const end = start + ROWS_PER_PAGE;
  const paginatedOrders = stopLimitOrders.slice(start, end);

  paginatedOrders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatToSGT(order.createdAt)}</td>
      <td>${order.stock?.symbol || "N/A"}</td>
      <td>${order.tradeType}</td>
      <td>${order.quantity}</td>
      <td>${order.triggerPrice}</td>
      <td>${order.limitPrice}</td>
      <td>${order.status}</td>
      <td>
        ${order.status === "PENDING"
          ? `<button class="cancel-btn" data-id="${order.id}" data-type="stop-limit">Cancel</button>`
          : ""}
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Pagination controls
  const totalPages = Math.ceil(stopLimitOrders.length / ROWS_PER_PAGE);
  pagination.innerHTML = `
    <button ${page <= 1 ? "disabled" : ""} id="stop-limit-prev">Prev</button>
    <span>Page ${page} of ${totalPages || 1}</span>
    <button ${page >= totalPages ? "disabled" : ""} id="stop-limit-next">Next</button>
  `;

  document.getElementById("stop-limit-prev")?.addEventListener("click", () => {
    if (stopLimitPage > 1) {
      stopLimitPage--;
      renderStopLimitPage(stopLimitPage);
    }
  });

  document.getElementById("stop-limit-next")?.addEventListener("click", () => {
    const totalPages = Math.ceil(stopLimitOrders.length / ROWS_PER_PAGE);
    if (stopLimitPage < totalPages) {
      stopLimitPage++;
      renderStopLimitPage(stopLimitPage);
    }
  });

  attachCancelHandlers();
}

// ===== SOCKET + FETCH =====
if (typeof io !== "undefined") {
  socket = io();

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    socket.emit("join", { userId }, (ack) => console.log("Join ack:", ack));
  });

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
})

document.getElementById("export-stop-market")?.addEventListener("click", () => {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("User not logged in — cannot export.");
    return;
  }

  const url = `/stop-market/export?userId=${encodeURIComponent(userId)}`;
  window.open(url, "_blank");
});


document.getElementById("export-stop-limit")?.addEventListener("click", () => {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("User not logged in — cannot export.");
    return;
  }

  const url = `/stop-limit/export?userId=${encodeURIComponent(userId)}`;
  window.open(url, "_blank");
});
