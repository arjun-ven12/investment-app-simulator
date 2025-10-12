


window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page was restored from the cache, force a reload
    window.location.reload();
  }
});



window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('options-form');
  const symbolInput = form.querySelector("input[name='optionSymbol']");
  const optionsContainer = document.querySelector('.options-container');

  // Helper: week start (Monday). Returns YYYY-MM-DD
  function getWeekStartISO(dateInput) {
    const d = new Date(dateInput);
    // normalize timezone issues by using UTC components
    const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const date = d.getUTCDate();
    const diff = date - day + (day === 0 ? -6 : 1); // shift when Sunday
    const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    return weekStart.toISOString().slice(0, 10);
  }

  // Group array of contracts into { weekISO: [contract, ...], ... }
  function groupArrayByWeek(arr) {
    const map = {};
    arr.forEach(c => {
      // expiration field may be expirationDate or expiration_date depending on shape
      const exp = c.expirationDate ?? c.expiration_date ?? c.expiration;
      if (!exp) return;
      const week = getWeekStartISO(exp);
      if (!map[week]) map[week] = [];
      map[week].push(c);
    });
    return map;
  }

  // Create a table element (columns: symbol, name, strike, expiration, open interest, close)
// --- Modify buildTable to support pagination ---
function buildTable(title, contracts, rowsPerPage = 10) {
  const wrapper = document.createElement('div');
  wrapper.className = 'week-table-wrapper';

  const heading = document.createElement('h4');
  heading.textContent = `${title} (${contracts.length})`;
  wrapper.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'options-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Symbol</th>
        <th>Name</th>
        <th>Strike</th>
        <th>Expiration</th>
        <th>Open Interest</th>
        <th>Close Price</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  wrapper.appendChild(table);

  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'table-pagination';
  paginationContainer.style.marginTop = '10px';
  paginationContainer.style.display = 'flex';
  paginationContainer.style.justifyContent = 'center';
  paginationContainer.style.gap = '8px';
  wrapper.appendChild(paginationContainer);

  contracts.sort((a, b) => (a.strikePrice ?? a.strike_price ?? 0) - (b.strikePrice ?? b.strike_price ?? 0));

  let currentPage = 1;
  const totalPages = Math.ceil(contracts.length / rowsPerPage);

  const renderPage = (page) => {
    tbody.innerHTML = '';
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageContracts = contracts.slice(start, end);

    pageContracts.forEach(c => {
      const strike = c.strikePrice ?? c.strike_price ?? 'N/A';
      const exp = c.expirationDate ?? c.expiration_date ?? c.expiration ?? '';
      const oi = c.openInterest ?? c.open_interest ?? 'N/A';
      const close = c.closePrice ?? c.close_price ?? 'N/A';
      const name = c.name ?? c.title ?? '';

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td class="contract-symbol">${c.symbol ?? ''}</td>
        <td class="contract-name">${name}</td>
        <td class="contract-strike">${strike}</td>
        <td class="contract-exp">${exp ? new Date(exp).toLocaleDateString() : 'N/A'}</td>
        <td class="contract-oi">${oi}</td>
        <td class="contract-close">${close}</td>
      `;
      tr.addEventListener('click', () => {
        const symbol = c.symbol ?? '';
        if (symbol) window.location.href = `ohlc.html?symbol=${encodeURIComponent(symbol)}`;
      });
      tbody.appendChild(tr);
    });

    // --- Styled pagination buttons ---
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
      }
    });
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.style.padding = '5px 10px';
      pageBtn.style.borderRadius = '5px';
      pageBtn.style.border = '2px solid #E0EBFF';
      pageBtn.style.backgroundColor = i === currentPage ? '#E0EBFF' : '#000000ff';
      pageBtn.style.color = i === currentPage ? '#000000ff' : '#E0EBFF';
      pageBtn.style.cursor = 'pointer';
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderPage(currentPage);
      });
      paginationContainer.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
      }
    });
    paginationContainer.appendChild(nextBtn);
  };

  renderPage(currentPage);
  return wrapper;
}


  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const symbol = symbolInput.value.trim();
    if (!symbol) {
      alert('Please enter a symbol (e.g. AAPL).');
      return;
    }

    optionsContainer.innerHTML = `<p>Loading option contracts for ${symbol}…</p>`;

    try {
      const res = await fetch(`/options/contracts/${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        // try to read error body
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
      }

      const payload = await res.json();

      // If payload is of the shape { symbol: 'AAPL', contracts: { week: [..] } }
      // use payload.contracts directly. Otherwise if we have an array, group it.
      let grouped = null;

      if (payload && payload.contracts && typeof payload.contracts === 'object' && !Array.isArray(payload.contracts)) {
        grouped = payload.contracts;
      } else if (Array.isArray(payload.option_contracts)) {
        grouped = groupArrayByWeek(payload.option_contracts);
      } else if (Array.isArray(payload)) {
        grouped = groupArrayByWeek(payload);
      } else if (Array.isArray(payload.contracts)) {
        grouped = groupArrayByWeek(payload.contracts);
      } else {
        // fallback: unknown shape
        throw new Error('Unexpected response format from server');
      }

      // Clear container
      optionsContainer.innerHTML = '';

      const entries = Object.entries(grouped)
        .map(([week, list]) => [week, Array.isArray(list) ? list : []])
        .sort((a, b) => new Date(a[0]) - new Date(b[0])); // sort by week

      if (entries.length === 0) {
        optionsContainer.innerHTML = `<p>No option contracts found for ${symbol}.</p>`;
        return;
      }

      // Render each week as its own section
      entries.forEach(([weekISO, contracts]) => {
        const section = document.createElement('section');
        section.className = 'week-section';
        section.style.marginBottom = '20px';

        const header = document.createElement('h3');
        header.textContent = `Week of ${weekISO}`;
        header.style.marginBottom = '8px';
        section.appendChild(header);

        // split into calls & puts
        const calls = contracts.filter(c => (c.type ?? c.type) && (c.type.toLowerCase() === 'call'));
        const puts  = contracts.filter(c => (c.type ?? c.type) && (c.type.toLowerCase() === 'put'));

        // create container for two tables side-by-side on wide screens
        const tablesRow = document.createElement('div');
        tablesRow.style.display = 'grid';
        tablesRow.style.gridTemplateColumns = '1fr 1fr';
        tablesRow.style.gap = '12px';

        // Calls table (if present)
        if (calls.length > 0) {
          const callsTable = buildTable('Calls', calls);
          tablesRow.appendChild(callsTable);
        } else {
          const callsPlaceholder = document.createElement('div');
          callsPlaceholder.innerHTML = `<h4>Calls (0)</h4><p>No call contracts this week.</p>`;
          tablesRow.appendChild(callsPlaceholder);
        }

        // Puts table (if present)
        if (puts.length > 0) {
          const putsTable = buildTable('Puts', puts);
          tablesRow.appendChild(putsTable);
        } else {
          const putsPlaceholder = document.createElement('div');
          putsPlaceholder.innerHTML = `<h4>Puts (0)</h4><p>No put contracts this week.</p>`;
          tablesRow.appendChild(putsPlaceholder);
        }

        section.appendChild(tablesRow);
        optionsContainer.appendChild(section);
      });

    } catch (err) {
      console.error('Error fetching option contracts:', err);
      optionsContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
    }
  });
});








///////////////////////////////////////////////////////////////////
//// RETRIEVE OPTIONS TRADES
///////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////
// RETRIEVE OPTIONS TRADES WITH NUMBERED PAGINATION
///////////////////////////////////////////////////////////////////
// window.addEventListener('DOMContentLoaded', async () => {
//   const tableBody = document.getElementById('options-trades-table-body');
//   const userId = localStorage.getItem('userId');
//   const rowsPerPage = 10;
//   let currentPage = 1;
//   let trades = [];

//   const paginationContainer = document.createElement('div');
//   paginationContainer.id = 'pagination-controls';
//   paginationContainer.style.marginTop = '15px';
//   paginationContainer.style.display = 'flex';
//   paginationContainer.style.justifyContent = 'center';
//   paginationContainer.style.gap = '8px';
//   document.querySelector('#options-trades-table').after(paginationContainer);

//   if (!userId) {
//     tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">User not logged in.</td></tr>`;
//     return;
//   }

//   try {
//     const res = await fetch(`/options/trades?userId=${encodeURIComponent(userId)}`);
//     if (!res.ok) throw new Error('Failed to fetch trades');

//     const data = await res.json();
//     trades = data.trades || [];

//     if (trades.length === 0) {
//       tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No trades found.</td></tr>`;
//       return;
//     }

//     const renderTable = (page) => {
//       tableBody.innerHTML = '';

//       const start = (page - 1) * rowsPerPage;
//       const end = start + rowsPerPage;
//       const pageTrades = trades.slice(start, end);

//       pageTrades.forEach(trade => {
//         const row = document.createElement('tr');
//         row.style.borderBottom = '1px solid #E0EBFF';
//         row.innerHTML = `
//           <td style="padding:8px; text-align:center;">${trade.date ? new Date(trade.date).toLocaleString() : 'N/A'}</td>
//           <td style="padding:8px; text-align:center;">${trade.underlyingSymbol ?? 'N/A'}</td>
//           <td style="padding:8px; text-align:center;">${trade.contractSymbol}</td>
//           <td style="padding:8px; text-align:center;">${trade.side}</td>
//           <td style="padding:8px; text-align:center;">${trade.type}</td>
//           <td style="padding:8px; text-align:center;">${trade.status}</td>
//           <td style="padding:8px; text-align:center;">${trade.quantity}</td>
//           <td style="padding:8px; text-align:center;">${trade.price?.toFixed(2) ?? '0.00'}</td>
//           <td style="padding:8px; text-align:center;">${trade.totalAmount?.toFixed(2) ?? '0.00'}</td>
//           <td style="padding:8px; text-align:center;">${trade.strikePrice ?? 'N/A'}</td>
//           <td style="padding:8px; text-align:center;">${trade.expirationDate ? new Date(trade.expirationDate).toLocaleDateString() : 'N/A'}</td>
//         `;
//         tableBody.appendChild(row);
//       });

//       renderPagination();
//     };

//     const renderPagination = () => {
//       paginationContainer.innerHTML = '';
//       const totalPages = Math.ceil(trades.length / rowsPerPage);

//       const prevBtn = document.createElement('button');
//       prevBtn.textContent = 'Previous';
//       prevBtn.disabled = currentPage === 1;
//       prevBtn.addEventListener('click', () => {
//         if (currentPage > 1) {
//           currentPage--;
//           renderTable(currentPage);
//         }
//       });
//       paginationContainer.appendChild(prevBtn);

//       for (let i = 1; i <= totalPages; i++) {
//         const pageBtn = document.createElement('button');
//         pageBtn.textContent = i;
//         pageBtn.style.padding = '5px 10px';
//         pageBtn.style.borderRadius = '5px';
//         pageBtn.style.border = '2px solid #E0EBFF';
//         pageBtn.style.backgroundColor = i === currentPage ? '#E0EBFF' : '#000000ff';
//         pageBtn.style.color = i === currentPage ? '#000000ff' : '#E0EBFF';
//         pageBtn.style.cursor = 'pointer';
//         pageBtn.addEventListener('click', () => {
//           currentPage = i;
//           renderTable(currentPage);
//         });
//         paginationContainer.appendChild(pageBtn);
//       }

//       const nextBtn = document.createElement('button');
//       nextBtn.textContent = 'Next';
//       nextBtn.disabled = currentPage === totalPages;
//       nextBtn.addEventListener('click', () => {
//         if (currentPage < totalPages) {
//           currentPage++;
//           renderTable(currentPage);
//         }
//       });
//       paginationContainer.appendChild(nextBtn);
//     };

//     renderTable(currentPage);
//   } catch (err) {
//     console.error('Error loading trades:', err);
//     tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Error loading trades: ${err.message}</td></tr>`;
//   }
// });







window.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('options-trades-table-body');
  const userId = localStorage.getItem('userId');
  const rowsPerPage = 10;
  let currentPage = 1;
  let trades = [];

  const paginationContainer = document.createElement('div');
  paginationContainer.id = 'pagination-controls';
  paginationContainer.style.marginTop = '15px';
  paginationContainer.style.display = 'flex';
  paginationContainer.style.justifyContent = 'center';
  paginationContainer.style.gap = '8px';
  document.querySelector('#options-trades-table').after(paginationContainer);

  if (!userId) {
    tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">User not logged in.</td></tr>`;
    return;
  }

  try {
    const res = await fetch(`/options/trades?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch trades');

    const data = await res.json();
    trades = data.trades || [];

    if (trades.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No trades found.</td></tr>`;
      return;
    }

    const cancelLimitOrder = async (tradeId) => {
      try {
        const res = await fetch(`/options/cancel/${tradeId}?userId=${encodeURIComponent(userId)}`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to cancel order');
        // Update table after cancel
        trades = trades.map(t => t.id === tradeId ? { ...t, status: 'CANCELLED' } : t);
        renderTable(currentPage);
      } catch (err) {
        console.error('Cancel error:', err);
        alert('Failed to cancel limit order');
      }
    };

    const renderTable = (page) => {
      tableBody.innerHTML = '';

      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      const pageTrades = trades.slice(start, end);

      pageTrades.forEach(trade => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #E0EBFF';

        // Cancel button HTML if it's a limit order
        const cancelButton = trade.status === 'LIMIT (Pending)'
          ? `<button class="cancel-btn" style="padding:4px 8px; cursor:pointer;">Cancel</button>`
          : '';

        row.innerHTML = `
          <td style="padding:8px; text-align:center;">${trade.date ? new Date(trade.date).toLocaleString() : 'N/A'}</td>
          <td style="padding:8px; text-align:center;">${trade.underlyingSymbol ?? 'N/A'}</td>
          <td style="padding:8px; text-align:center;">${trade.contractSymbol}</td>
          <td style="padding:8px; text-align:center;">${trade.side}</td>
          <td style="padding:8px; text-align:center;">${trade.type}</td>
          <td style="padding:8px; text-align:center;">${trade.status}</td>
          <td style="padding:8px; text-align:center;">${trade.quantity}</td>
          <td style="padding:8px; text-align:center;">${trade.price?.toFixed(2) ?? '0.00'}</td>
          <td style="padding:8px; text-align:center;">${trade.totalAmount?.toFixed(2) ?? '0.00'}</td>
          <td style="padding:8px; text-align:center;">${trade.strikePrice ?? 'N/A'}</td>
          <td style="padding:8px; text-align:center;">${trade.expirationDate ? new Date(trade.expirationDate).toLocaleDateString() : 'N/A'}</td>
          <td style="padding:8px; text-align:center;">${cancelButton}</td>
        `;
        tableBody.appendChild(row);

        // Attach click event to cancel button
        if (trade.status === 'LIMIT (Pending)') {
          const btn = row.querySelector('.cancel-btn');
          btn.addEventListener('click', () => cancelLimitOrder(trade.id));
        }
      });

      renderPagination();
    };

    const renderPagination = () => {
      paginationContainer.innerHTML = '';
      const totalPages = Math.ceil(trades.length / rowsPerPage);

      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = currentPage === 1;
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderTable(currentPage);
        }
      });
      paginationContainer.appendChild(prevBtn);

      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.style.padding = '5px 10px';
        pageBtn.style.borderRadius = '5px';
        pageBtn.style.border = '2px solid #E0EBFF';
        pageBtn.style.backgroundColor = i === currentPage ? '#E0EBFF' : '#000000ff';
        pageBtn.style.color = i === currentPage ? '#000000ff' : '#E0EBFF';
        pageBtn.style.cursor = 'pointer';
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          renderTable(currentPage);
        });
        paginationContainer.appendChild(pageBtn);
      }

      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderTable(currentPage);
        }
      });
      paginationContainer.appendChild(nextBtn);
    };

    renderTable(currentPage);
  } catch (err) {
    console.error('Error loading trades:', err);
    tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:red;">Error loading trades: ${err.message}</td></tr>`;
  }
});





///////////////////////////////////////////////////////////////////
//// RETRIEVE OPTIONS PORTFOLIO
///////////////////////////////////////////////////////////////////



window.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('userId');
  const container = document.getElementById('options-portfolio-card');

  if (!userId) {
    container.innerHTML = `<p style="color:#999; text-align:center;">User not logged in.</p>`;
    return;
  }

  try {
    // ✅ Fetch with query param (matches your controller)
    const res = await fetch(`/options/portfolio?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch portfolio');
    const data = await res.json();

    // ✅ Extract directly since backend returns { portfolio: [...] }
    const portfolio = data.portfolio || [];

    if (portfolio.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:15px; color:#999;">
          No option positions found.
        </div>`;
      return;
    }

    // ✅ Create a simple summary (optional)
    const totalRealized = portfolio.reduce((a, b) => a + (b.realizedPnL || 0), 0);
    const totalUnrealized = portfolio.reduce((a, b) => a + (b.unrealizedPnL || 0), 0);

    const summaryDiv = document.createElement('div');
    summaryDiv.style = 'margin-bottom:15px; display:flex; justify-content:center; gap:40px;';
    summaryDiv.innerHTML = `
      <div style="text-align:center;">
        <strong>Total Realized PnL:</strong><br>
        <span style="color:${totalRealized >= 0 ? 'limegreen' : 'red'};">
          ${totalRealized.toFixed(2)}
        </span>
      </div>
      <div style="text-align:center;">
        <strong>Total Unrealized PnL:</strong><br>
        <span style="color:${totalUnrealized >= 0 ? 'limegreen' : 'red'};">
          ${totalUnrealized.toFixed(2)}
        </span>
      </div>
    `;

    // ✅ Build options portfolio table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    table.innerHTML = `
      <thead>
        <tr style="background-color:#000000ff; color:#E0EBFF;">
          <th style="padding:8px; border:1px solid #E0EBFF;">Underlying Stock</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Total Contracts</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Total Shares</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Active</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Expired</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Open</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Closed</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Realized PnL</th>
          <th style="padding:8px; border:1px solid #E0EBFF;">Unrealized PnL</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    portfolio.forEach(item => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #E0EBFF';
      row.innerHTML = `
        <td style="padding:8px; text-align:center;">${item.underlyingSymbol}</td>
        <td style="padding:8px; text-align:center;">${item.totalContracts}</td>
        <td style="padding:8px; text-align:center;">${item.totalShares}</td>
        <td style="padding:8px; text-align:center;">${item.activeContracts}</td>
        <td style="padding:8px; text-align:center;">${item.expiredContracts}</td>
        <td style="padding:8px; text-align:center;">${item.openPositions}</td>
        <td style="padding:8px; text-align:center;">${item.closedPositions}</td>
        <td style="padding:8px; text-align:center; color:${item.realizedPnL >= 0 ? 'limegreen' : 'red'};">
          ${item.realizedPnL.toFixed(2)}
        </td>
        <td style="padding:8px; text-align:center; color:${item.unrealizedPnL >= 0 ? 'limegreen' : 'red'};">
          ${item.unrealizedPnL.toFixed(2)}
        </td>
      `;
      tbody.appendChild(row);
    });

    // container.innerHTML = `<h2 style="margin-bottom:10px;">Options Portfolio</h2>`;
    container.appendChild(summaryDiv);
    container.appendChild(table);

  } catch (err) {
    console.error('Error loading portfolio:', err);
    container.innerHTML = `
      <p style="color:red; text-align:center;">
        Error loading portfolio: ${err.message}
      </p>`;
  }
});






///////////////////////////////////////////////////////////////////
//// EXPORT TRADES TO CSV
///////////////////////////////////////////////////////////////////

window.addEventListener('DOMContentLoaded', function () {
  const exportOptionTradesButton = document.getElementById('export-option-trades');
  
  if (exportOptionTradesButton) {
    exportOptionTradesButton.addEventListener('click', function () {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert("User not logged in.");
        return;
      }
      // Navigate to your new options export route
      window.location.href = `/options/export?userId=${encodeURIComponent(userId)}`;
    });
  }
});
