window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page was restored from the cache, force a reload
    window.location.reload();
  }
});



// window.addEventListener('DOMContentLoaded', () => {
//   const form = document.getElementById('options-form');
//   const symbolInput = form.querySelector("input[name='optionSymbol']");
//   const optionsContainer = document.querySelector('.options-container');

//   // Helper: week start (Monday). Returns YYYY-MM-DD
//   function getWeekStartISO(dateInput) {
//     const d = new Date(dateInput);
//     // normalize timezone issues by using UTC components
//     const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
//     const date = d.getUTCDate();
//     const diff = date - day + (day === 0 ? -6 : 1); // shift when Sunday
//     const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
//     return weekStart.toISOString().slice(0, 10);
//   }

//   // Group array of contracts into { weekISO: [contract, ...], ... }
//   function groupArrayByWeek(arr) {
//     const map = {};
//     arr.forEach(c => {
//       // expiration field may be expirationDate or expiration_date depending on shape
//       const exp = c.expirationDate ?? c.expiration_date ?? c.expiration;
//       if (!exp) return;
//       const week = getWeekStartISO(exp);
//       if (!map[week]) map[week] = [];
//       map[week].push(c);
//     });
//     return map;
//   }

//   // Create a table element (columns: symbol, name, strike, expiration, open interest, close)
// // --- Modify buildTable to support pagination ---
// function buildTable(title, contracts, rowsPerPage = 10) {
//   const wrapper = document.createElement('div');
//   wrapper.className = 'week-table-wrapper';

//   const heading = document.createElement('h4');
//   heading.textContent = `${title} (${contracts.length})`;
//   wrapper.appendChild(heading);

//   const table = document.createElement('table');
//   table.className = 'options-table';
//   table.innerHTML = `
//     <thead>
//       <tr>
//         <th>Symbol</th>
//         <th>Name</th>
//         <th>Strike</th>
//         <th>Expiration</th>
//         <th>Open Interest</th>
//         <th>Close Price</th>
//       </tr>
//     </thead>
//     <tbody></tbody>
//   `;
//   const tbody = table.querySelector('tbody');
//   wrapper.appendChild(table);

//   const paginationContainer = document.createElement('div');
//   paginationContainer.className = 'table-pagination';
//   paginationContainer.style.marginTop = '10px';
//   paginationContainer.style.display = 'flex';
//   paginationContainer.style.justifyContent = 'center';
//   paginationContainer.style.gap = '8px';
//   wrapper.appendChild(paginationContainer);

//   contracts.sort((a, b) => (a.strikePrice ?? a.strike_price ?? 0) - (b.strikePrice ?? b.strike_price ?? 0));

//   let currentPage = 1;
//   const totalPages = Math.ceil(contracts.length / rowsPerPage);

//   const renderPage = (page) => {
//     tbody.innerHTML = '';
//     const start = (page - 1) * rowsPerPage;
//     const end = start + rowsPerPage;
//     const pageContracts = contracts.slice(start, end);

//     pageContracts.forEach(c => {
//       const strike = c.strikePrice ?? c.strike_price ?? 'N/A';
//       const exp = c.expirationDate ?? c.expiration_date ?? c.expiration ?? '';
//       const oi = c.openInterest ?? c.open_interest ?? 'N/A';
//       const close = c.closePrice ?? c.close_price ?? 'N/A';
//       const name = c.name ?? c.title ?? '';

//       const tr = document.createElement('tr');
//       tr.style.cursor = 'pointer';
//       tr.innerHTML = `
//         <td class="contract-symbol">${c.symbol ?? ''}</td>
//         <td class="contract-name">${name}</td>
//         <td class="contract-strike">${strike}</td>
//         <td class="contract-exp">${exp ? new Date(exp).toLocaleDateString() : 'N/A'}</td>
//         <td class="contract-oi">${oi}</td>
//         <td class="contract-close">${close}</td>
//       `;
//       tr.addEventListener('click', () => {
//         const symbol = c.symbol ?? '';
//         if (symbol) window.location.href = `ohlc.html?symbol=${encodeURIComponent(symbol)}`;
//       });
//       tbody.appendChild(tr);
//     });

//     // --- Styled pagination buttons ---
//     paginationContainer.innerHTML = '';
//     if (totalPages <= 1) return;

//     const prevBtn = document.createElement('button');
//     prevBtn.textContent = 'Previous';
//     prevBtn.disabled = currentPage === 1;
//     prevBtn.addEventListener('click', () => {
//       if (currentPage > 1) {
//         currentPage--;
//         renderPage(currentPage);
//       }
//     });
//     paginationContainer.appendChild(prevBtn);

//     for (let i = 1; i <= totalPages; i++) {
//       const pageBtn = document.createElement('button');
//       pageBtn.textContent = i;
//       pageBtn.style.padding = '5px 10px';
//       pageBtn.style.borderRadius = '5px';
//       pageBtn.style.border = '2px solid #E0EBFF';
//       pageBtn.style.backgroundColor = i === currentPage ? '#E0EBFF' : '#000000ff';
//       pageBtn.style.color = i === currentPage ? '#000000ff' : '#E0EBFF';
//       pageBtn.style.cursor = 'pointer';
//       pageBtn.addEventListener('click', () => {
//         currentPage = i;
//         renderPage(currentPage);
//       });
//       paginationContainer.appendChild(pageBtn);
//     }

//     const nextBtn = document.createElement('button');
//     nextBtn.textContent = 'Next';
//     nextBtn.disabled = currentPage === totalPages;
//     nextBtn.addEventListener('click', () => {
//       if (currentPage < totalPages) {
//         currentPage++;
//         renderPage(currentPage);
//       }
//     });
//     paginationContainer.appendChild(nextBtn);
//   };

//   renderPage(currentPage);
//   return wrapper;
// }


//   form.addEventListener('submit', async (evt) => {
//     evt.preventDefault();
//     const symbol = symbolInput.value.trim();
//     if (!symbol) {
//       alert('Please enter a symbol (e.g. AAPL).');
//       return;
//     }

//     optionsContainer.innerHTML = `<p>Loading option contracts for ${symbol}…</p>`;

//     try {
//       const res = await fetch(`/options/contracts/${encodeURIComponent(symbol)}`);
//       if (!res.ok) {
//         // try to read error body
//         const err = await res.json().catch(() => ({}));
//         throw new Error(err.error || `Request failed: ${res.status}`);
//       }

//       const payload = await res.json();

//       // If payload is of the shape { symbol: 'AAPL', contracts: { week: [..] } }
//       // use payload.contracts directly. Otherwise if we have an array, group it.
//       let grouped = null;

//       if (payload && payload.contracts && typeof payload.contracts === 'object' && !Array.isArray(payload.contracts)) {
//         grouped = payload.contracts;
//       } else if (Array.isArray(payload.option_contracts)) {
//         grouped = groupArrayByWeek(payload.option_contracts);
//       } else if (Array.isArray(payload)) {
//         grouped = groupArrayByWeek(payload);
//       } else if (Array.isArray(payload.contracts)) {
//         grouped = groupArrayByWeek(payload.contracts);
//       } else {
//         // fallback: unknown shape
//         throw new Error('Unexpected response format from server');
//       }

//       // Clear container
//       optionsContainer.innerHTML = '';

//       const entries = Object.entries(grouped)
//         .map(([week, list]) => [week, Array.isArray(list) ? list : []])
//         .sort((a, b) => new Date(a[0]) - new Date(b[0])); // sort by week

//       if (entries.length === 0) {
//         optionsContainer.innerHTML = `<p>No option contracts found for ${symbol}.</p>`;
//         return;
//       }

//       // Render each week as its own section
//       entries.forEach(([weekISO, contracts]) => {
//         const section = document.createElement('section');
//         section.className = 'week-section';
//         section.style.marginBottom = '20px';

//         const header = document.createElement('h3');
//         header.textContent = `Week of ${weekISO}`;
//         header.style.marginBottom = '8px';
//         section.appendChild(header);


//         // split into calls & puts
//         const calls = contracts.filter(c => (c.type ?? c.type) && (c.type.toLowerCase() === 'call'));
//         const puts  = contracts.filter(c => (c.type ?? c.type) && (c.type.toLowerCase() === 'put'));

//         // create container for two tables side-by-side on wide screens
//         const tablesRow = document.createElement('div');
//         tablesRow.style.display = 'grid';
//         tablesRow.style.gridTemplateColumns = '1fr 1fr';
//         tablesRow.style.gap = '12px';

//         // Calls table (if present)
//         if (calls.length > 0) {
//           const callsTable = buildTable('Calls', calls);
//           tablesRow.appendChild(callsTable);
//         } else {
//           const callsPlaceholder = document.createElement('div');
//           callsPlaceholder.innerHTML = `<h4>Calls (0)</h4><p>No call contracts this week.</p>`;
//           tablesRow.appendChild(callsPlaceholder);
//         }

//         // Puts table (if present)
//         if (puts.length > 0) {
//           const putsTable = buildTable('Puts', puts);
//           tablesRow.appendChild(putsTable);
//         } else {
//           const putsPlaceholder = document.createElement('div');
//           putsPlaceholder.innerHTML = `<h4>Puts (0)</h4><p>No put contracts this week.</p>`;
//           tablesRow.appendChild(putsPlaceholder);
//         }

//         section.appendChild(tablesRow);
//         optionsContainer.appendChild(section);
//       });

//     } catch (err) {
//       console.error('Error fetching option contracts:', err);
//       optionsContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
//     }
//   });
// });



// window.addEventListener('DOMContentLoaded', () => {
//   const form = document.getElementById('options-form');
//   const symbolInput = form.querySelector("input[name='optionSymbol']");
//   const optionsContainer = document.querySelector('.options-container');

//   // Helper: week start (Monday). Returns YYYY-MM-DD
//   function getWeekStartISO(dateInput) {
//     const d = new Date(dateInput);
//     const day = d.getUTCDay();
//     const date = d.getUTCDate();
//     const diff = date - day + (day === 0 ? -6 : 1);
//     const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
//     return weekStart.toISOString().slice(0, 10);
//   }

//   function groupArrayByWeek(arr) {
//     const map = {};
//     arr.forEach(c => {
//       const exp = c.expirationDate ?? c.expiration_date ?? c.expiration;
//       if (!exp) return;
//       const week = getWeekStartISO(exp);
//       if (!map[week]) map[week] = [];
//       map[week].push(c);
//     });
//     return map;
//   }

//   function buildTable(title, contracts, rowsPerPage = 10) {
//     const wrapper = document.createElement('div');
//     wrapper.className = 'week-table-wrapper';

//     const heading = document.createElement('h4');
//     heading.textContent = `${title} (${contracts.length})`;
//     wrapper.appendChild(heading);

//     const table = document.createElement('table');
//     table.className = 'options-table';
//     table.innerHTML = `
//       <thead>
//         <tr>
//           <th>Symbol</th>
//           <th>Name</th>
//           <th>Strike</th>
//           <th>Expiration</th>
//           <th>Open Interest</th>
//           <th>Close Price</th>
//         </tr>
//       </thead>
//       <tbody></tbody>
//     `;
//     const tbody = table.querySelector('tbody');
//     wrapper.appendChild(table);

//     const paginationContainer = document.createElement('div');
//     paginationContainer.className = 'table-pagination';
//     paginationContainer.style.marginTop = '10px';
//     paginationContainer.style.display = 'flex';
//     paginationContainer.style.justifyContent = 'center';
//     paginationContainer.style.gap = '8px';
//     wrapper.appendChild(paginationContainer);

//     contracts.sort((a, b) => (a.strikePrice ?? a.strike_price ?? 0) - (b.strikePrice ?? b.strike_price ?? 0));

//     let currentPage = 1;
//     const totalPages = Math.ceil(contracts.length / rowsPerPage);

//     const renderPage = (page) => {
//       tbody.innerHTML = '';
//       const start = (page - 1) * rowsPerPage;
//       const end = start + rowsPerPage;
//       const pageContracts = contracts.slice(start, end);

//       pageContracts.forEach(c => {
//         const strike = c.strikePrice ?? c.strike_price ?? 'N/A';
//         const exp = c.expirationDate ?? c.expiration_date ?? c.expiration ?? '';
//         const oi = c.openInterest ?? c.open_interest ?? 'N/A';
//         const close = c.closePrice ?? c.close_price ?? 'N/A';
//         const name = c.name ?? c.title ?? '';

//         const tr = document.createElement('tr');
//         tr.style.cursor = 'pointer';
//         tr.innerHTML = `
//           <td class="contract-symbol">${c.symbol ?? ''}</td>
//           <td class="contract-name">${name}</td>
//           <td class="contract-strike">${strike}</td>
//           <td class="contract-exp">${exp ? new Date(exp).toLocaleDateString() : 'N/A'}</td>
//           <td class="contract-oi">${oi}</td>
//           <td class="contract-close">${close}</td>
//         `;
//         tr.addEventListener('click', () => {
//           const symbol = c.symbol ?? '';
//           if (symbol) window.location.href = `ohlc.html?symbol=${encodeURIComponent(symbol)}`;
//         });
//         tbody.appendChild(tr);
//       });

//       // Pagination
//       paginationContainer.innerHTML = '';

//       if (currentPage > 1) {
//         const prevBtn = document.createElement('button');
//         prevBtn.textContent = 'Previous';
//         prevBtn.addEventListener('click', () => {
//           currentPage--;
//           renderPage(currentPage);
//         });
//         paginationContainer.appendChild(prevBtn);
//       }

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
//           renderPage(currentPage);
//         });
//         paginationContainer.appendChild(pageBtn);
//       }

//       if (currentPage < totalPages) {
//         const nextBtn = document.createElement('button');
//         nextBtn.textContent = 'Next';
//         nextBtn.addEventListener('click', () => {
//           currentPage++;
//           renderPage(currentPage);
//         });
//         paginationContainer.appendChild(nextBtn);
//       }
//     };

//     renderPage(currentPage);
//     return wrapper;
//   }

//   form.addEventListener('submit', async (evt) => {
//     evt.preventDefault();
//     const symbol = symbolInput.value.trim();
//     if (!symbol) {
//       alert('Please enter a symbol (e.g. AAPL).');
//       return;
//     }

//     optionsContainer.innerHTML = `<p>Loading option contracts for ${symbol}…</p>`;

//     try {
//       const res = await fetch(`/options/contracts/${encodeURIComponent(symbol)}`);
//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         throw new Error(err.error || `Request failed: ${res.status}`);
//       }

//       const payload = await res.json();
//       let grouped = null;

//       if (payload && payload.contracts && typeof payload.contracts === 'object' && !Array.isArray(payload.contracts)) {
//         grouped = payload.contracts;
//       } else if (Array.isArray(payload.option_contracts)) {
//         grouped = groupArrayByWeek(payload.option_contracts);
//       } else if (Array.isArray(payload)) {
//         grouped = groupArrayByWeek(payload);
//       } else if (Array.isArray(payload.contracts)) {
//         grouped = groupArrayByWeek(payload.contracts);
//       } else {
//         throw new Error('Unexpected response format from server');
//       }

//       const allWeeks = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
//       const earliestWeek = allWeeks[0];

//       // Week filter dropdown
//       const weekFilterWrapper = document.createElement('div');
//       weekFilterWrapper.style.marginBottom = '12px';
//       const weekLabel = document.createElement('label');
//       weekLabel.textContent = 'Filter by week: ';
//       const weekSelect = document.createElement('select');
//       weekSelect.style.marginLeft = '8px';

//       allWeeks.forEach(week => {
//         const opt = document.createElement('option');
//         opt.value = week;
//         opt.textContent = week;
//         if (week === earliestWeek) opt.selected = true;
//         weekSelect.appendChild(opt);
//       });

//       weekFilterWrapper.appendChild(weekLabel);
//       weekFilterWrapper.appendChild(weekSelect);
//       optionsContainer.innerHTML = '';
//       optionsContainer.appendChild(weekFilterWrapper);

//       const renderTables = (filterWeek = earliestWeek) => {
//         // Remove old sections
//         optionsContainer.querySelectorAll('.week-section').forEach(s => s.remove());

//         const weeksToRender = filterWeek ? [filterWeek] : allWeeks;

//         weeksToRender.forEach(weekISO => {
//           const contracts = grouped[weekISO] ?? [];
//           if (!contracts.length) return;

//           const section = document.createElement('section');
//           section.className = 'week-section';
//           section.style.marginBottom = '20px';

//           const header = document.createElement('h3');
//           header.textContent = `Week of ${weekISO}`;
//           header.style.marginBottom = '8px';
//           section.appendChild(header);

//           const calls = contracts.filter(c => (c.type ?? '').toLowerCase() === 'call');
//           const puts  = contracts.filter(c => (c.type ?? '').toLowerCase() === 'put');

//           const tablesRow = document.createElement('div');
//           tablesRow.style.display = 'grid';
//           tablesRow.style.gridTemplateColumns = '1fr 1fr';
//           tablesRow.style.gap = '12px';

//           if (calls.length > 0) tablesRow.appendChild(buildTable('Calls', calls));
//           else {
//             const div = document.createElement('div');
//             div.innerHTML = `<h4>Calls (0)</h4><p>No call contracts this week.</p>`;
//             tablesRow.appendChild(div);
//           }

//           if (puts.length > 0) tablesRow.appendChild(buildTable('Puts', puts));
//           else {
//             const div = document.createElement('div');
//             div.innerHTML = `<h4>Puts (0)</h4><p>No put contracts this week.</p>`;
//             tablesRow.appendChild(div);
//           }

//           section.appendChild(tablesRow);
//           optionsContainer.appendChild(section);
//         });
//       };

//       renderTables();

//       weekSelect.addEventListener('change', () => renderTables(weekSelect.value));

//     } catch (err) {
//       console.error(err);
//       optionsContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
//     }
//   });
// });

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('options-form');
  const symbolInput = form.querySelector("input[name='optionSymbol']");
  const optionsContainer = document.querySelector('.options-container');

  // ----------------------------
  // Helper functions
  // ----------------------------
  function getWeekStartISO(dateInput) {
    const d = new Date(dateInput);
    const day = d.getUTCDay();
    const date = d.getUTCDate();
    const diff = date - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    return weekStart.toISOString().slice(0, 10);
  }

  function groupArrayByWeek(arr) {
    const map = {};
    arr.forEach(c => {
      const exp = c.expirationDate ?? c.expiration_date ?? c.expiration;
      if (!exp) return;
      const week = getWeekStartISO(exp);
      if (!map[week]) map[week] = [];
      map[week].push(c);
    });
    return map;
  }

  // ----------------------------
  // Table builder with pagination
  // ----------------------------
// ----------------------------
// Table builder with pagination (updated to show all fields)
// ----------------------------
// ----------------------------
// Table builder (scrollable horizontally)
// ----------------------------
function buildTable(title, contracts, rowsPerPage = 10) {
  const wrapper = document.createElement('div');
  wrapper.className = 'week-table-wrapper';
  wrapper.style.marginBottom = '20px';
    wrapper.style.display = 'flex !important';
  wrapper.style.flexDirection = 'column !important';

  const heading = document.createElement('h4');
  heading.textContent = `${title} (${contracts.length})`;
  wrapper.appendChild(heading);

  // Scrollable container
  const scrollWrapper = document.createElement('div');
  scrollWrapper.style.overflowX = 'auto';
  scrollWrapper.style.width = '100%';
  // scrollWrapper.style.display = 'flex !important';
  // scrollWrapper.style.flexDirection = 'column !important';
scrollWrapper.className = 'week-scroll-wrapper';

  wrapper.appendChild(scrollWrapper);

  const table = document.createElement('table');
  table.className = 'options-table';
  table.style.width = '100%';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Symbol</th>
        <th>Name</th>
        <th>Type</th>
        <th>Strike</th>
        <th>Expiration</th>
        <th>Size</th>
        <th>Open Interest</th>
        <th>Implied Volatility</th>
        <th>Delta</th>
        <th>Gamma</th>
        <th>Theta</th>
        <th>Vega</th>
        <th>Close Price</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  scrollWrapper.appendChild(table);

  const tbody = table.querySelector('tbody');

  // Pagination container
  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'table-pagination';
  paginationContainer.style.marginTop = '10px';
  paginationContainer.style.display = 'flex';
  paginationContainer.style.flexWrap = 'wrap';
  paginationContainer.style.justifyContent = 'flex-start';
  paginationContainer.style.gap = '8px';
  wrapper.appendChild(paginationContainer);

  contracts.sort((a, b) => (a.strikePrice ?? 0) - (b.strikePrice ?? 0));
  function normalizeOptionSymbol(symbol) {
    return (symbol ?? '').replace(/^O:/, '');
  }
  
  let currentPage = 1;
  const totalPages = Math.ceil(contracts.length / rowsPerPage);

  const renderPage = (page) => {
    tbody.innerHTML = '';
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageContracts = contracts.slice(start, end);

    pageContracts.forEach(c => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
      <td>${normalizeOptionSymbol(c.symbol)}</td>
      <td>${c.underlyingSymbol ?? ''}</td>
        <td>${c.type.toUpperCase() ?? ''}</td>
        <td>${c.strikePrice ?? 'N/A'}</td>
        <td>${c.expirationDate ? new Date(c.expirationDate).toLocaleDateString() : 'N/A'}</td>
        <td>${c.size ?? 'N/A'}</td>
        <td>${c.openInterest ?? 'N/A'}</td>
        <td>${c.impliedVolatility.toFixed(3) ?? 'N/A'}</td>
        <td>${c.delta.toFixed(3) ?? 'N/A'}</td>
        <td>${c.gamma.toFixed(3) ?? 'N/A'}</td>
        <td>${c.theta.toFixed(3) ?? 'N/A'}</td>
        <td>${c.vega.toFixed(3) ?? 'N/A'}</td>
        <td>${c.day?.close ?? 'N/A'}</td>
      `;
      tr.addEventListener('click', () => {
        const symbol = c.symbol ?? '';
        if (symbol) window.location.href = `/ohlc?symbol=${encodeURIComponent(symbol)}`;
      });
      tbody.appendChild(tr);
    });

    // Pagination buttons
    paginationContainer.innerHTML = '';
    if (currentPage > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Previous';
      prevBtn.addEventListener('click', () => {
        currentPage--;
        renderPage(currentPage);
      });
      paginationContainer.appendChild(prevBtn);
    }

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

    if (currentPage < totalPages) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      nextBtn.addEventListener('click', () => {
        currentPage++;
        renderPage(currentPage);
      });
      paginationContainer.appendChild(nextBtn);
    }
  };

  renderPage(currentPage);
  return wrapper;
}

// ----------------------------
// Render grouped option contracts vertically
// ----------------------------
function renderOptionContracts(grouped) {
  const allWeeks = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
  const earliestWeek = allWeeks[0];

  const weekFilterWrapper = document.createElement('div');
  weekFilterWrapper.style.marginBottom = '12px';
  const weekLabel = document.createElement('label');
  weekLabel.textContent = 'Filter by week: ';
  const weekSelect = document.createElement('select');
  weekSelect.style.marginLeft = '8px';

  allWeeks.forEach(week => {
    const opt = document.createElement('option');
    opt.value = week;
    opt.textContent = week;
    if (week === earliestWeek) opt.selected = true;
    weekSelect.appendChild(opt);
  });

  weekFilterWrapper.appendChild(weekLabel);
  weekFilterWrapper.appendChild(weekSelect);
  optionsContainer.innerHTML = '';
  optionsContainer.appendChild(weekFilterWrapper);

  const renderTables = (filterWeek = earliestWeek) => {
    optionsContainer.querySelectorAll('.week-section').forEach(s => s.remove());
    const weeksToRender = filterWeek ? [filterWeek] : allWeeks;

    weeksToRender.forEach(weekISO => {
      const contracts = grouped[weekISO] ?? [];
      if (!contracts.length) return;

      const section = document.createElement('section');
      section.className = 'week-section';
      section.style.marginBottom = '20px';

      const header = document.createElement('h3');
      header.textContent = `Week of ${weekISO}`;
      header.style.marginBottom = '8px';
      section.appendChild(header);

      const calls = contracts.filter(c => (c.type ?? '').toLowerCase() === 'call');
      const puts = contracts.filter(c => (c.type ?? '').toLowerCase() === 'put');

      // Render Calls first
      if (calls.length > 0) section.appendChild(buildTable('Calls', calls));
      else section.appendChild(document.createElement('div')).innerHTML = `<h4>Calls (0)</h4><p>No call contracts this week.</p>`;

      // Render Puts below
      if (puts.length > 0) section.appendChild(buildTable('Puts', puts));
      else section.appendChild(document.createElement('div')).innerHTML = `<h4>Puts (0)</h4><p>No put contracts this week.</p>`;

      optionsContainer.appendChild(section);
    });
  };

  renderTables();
  weekSelect.addEventListener('change', () => renderTables(weekSelect.value));
}


  // ----------------------------
  // Render grouped option contracts
  // ----------------------------
  function renderOptionContracts(grouped) {
    const allWeeks = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    const earliestWeek = allWeeks[0];

    const weekFilterWrapper = document.createElement('div');
    weekFilterWrapper.style.marginBottom = '12px';
    const weekLabel = document.createElement('label');
    weekLabel.textContent = 'Filter by week: ';
    const weekSelect = document.createElement('select');
    weekSelect.style.marginLeft = '8px';

    allWeeks.forEach(week => {
      const opt = document.createElement('option');
      opt.value = week;
      opt.textContent = week;
      if (week === earliestWeek) opt.selected = true;
      weekSelect.appendChild(opt);
    });

    weekFilterWrapper.appendChild(weekLabel);
    weekFilterWrapper.appendChild(weekSelect);
    optionsContainer.innerHTML = '';
    optionsContainer.appendChild(weekFilterWrapper);

    const renderTables = (filterWeek = earliestWeek) => {
      optionsContainer.querySelectorAll('.week-section').forEach(s => s.remove());
      const weeksToRender = filterWeek ? [filterWeek] : allWeeks;

      weeksToRender.forEach(weekISO => {
        const contracts = grouped[weekISO] ?? [];
        if (!contracts.length) return;

        const section = document.createElement('section');
        section.className = 'week-section';
        section.style.marginBottom = '20px';

        const header = document.createElement('h3');
        header.textContent = `Week of ${weekISO}`;
        header.style.marginBottom = '8px';
        section.appendChild(header);

        const calls = contracts.filter(c => (c.type ?? '').toLowerCase() === 'call');
        const puts = contracts.filter(c => (c.type ?? '').toLowerCase() === 'put');

        const tablesRow = document.createElement('div');
        tablesRow.style.display = 'flex';
        tablesRow.style.flexDirection= 'column';
        tablesRow.style.gap = '12px';
        tablesRow.className='bigTable'

        if (calls.length > 0) tablesRow.appendChild(buildTable('Calls', calls));
        else {
          const div = document.createElement('div');
          div.innerHTML = `<h4>Calls (0)</h4><p>No call contracts this week.</p>`;
          tablesRow.appendChild(div);
        }

        if (puts.length > 0) tablesRow.appendChild(buildTable('Puts', puts));
        else {
          const div = document.createElement('div');
          div.innerHTML = `<h4>Puts (0)</h4><p>No put contracts this week.</p>`;
          tablesRow.appendChild(div);
        }

        section.appendChild(tablesRow);
        optionsContainer.appendChild(section);
      });
    };

    renderTables();
    weekSelect.addEventListener('change', () => renderTables(weekSelect.value));
  }

  // ----------------------------
  // Form submit and caching
  // ----------------------------
form.addEventListener('submit', async (evt) => {
  evt.preventDefault();
  const symbol = symbolInput.value.trim().toUpperCase();
  if (!symbol) {
    alert('Please enter a symbol (e.g. AAPL).');
    return;
  }

  // ✅ Clear previous option contracts cache
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('options_contracts_')) localStorage.removeItem(key);
  });

  optionsContainer.innerHTML = `<p>Loading option contracts for ${symbol}…</p>`;

  const cacheKey = `options_contracts_${symbol}`;
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData) {
    console.log(`Loaded ${symbol} options from cache`);
    const grouped = JSON.parse(cachedData);
    renderOptionContracts(grouped);
    return;
  }

  try {
    const res = await fetch(`/options/contracts/${encodeURIComponent(symbol)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }

    const payload = await res.json();
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
      throw new Error('Unexpected response format from server');
    }

    // Save new symbol's contracts
    localStorage.setItem(cacheKey, JSON.stringify(grouped));

    renderOptionContracts(grouped);

  } catch (err) {
    console.error(err);
        if (err.message.includes("contracts.filter is not a function")) {
              optionsContainer.innerHTML = `<p class="error-message" style=" color: #ff4d4f; 
    font-weight: 500;"> Error: Invalid symbol or no data available. Try entering a stock symbol.</p>`;

    } else {
    optionsContainer.innerHTML = `<p class="error-message" style=" color: #ff4d4f; 
    font-weight: 500;">Error: ${err.message}</p>`;
    }
  }
});


  // ----------------------------
  // Auto-load from localStorage
  // ----------------------------
  const lastSymbolKey = Object.keys(localStorage).find(k => k.startsWith('options_contracts_'));
  if (lastSymbolKey) {
    const symbol = lastSymbolKey.replace('options_contracts_', '');
    const grouped = JSON.parse(localStorage.getItem(lastSymbolKey));
    symbolInput.value = symbol;
    renderOptionContracts(grouped);
    console.log(`Restored ${symbol} options from previous session`);
  }


  
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
  let selectedTradeId = null;

  // ===== Create Pagination Container =====
  const paginationContainer = document.createElement('div');
  paginationContainer.id = 'pagination-controls';
  paginationContainer.style.marginTop = '15px';
  paginationContainer.style.display = 'flex';
  paginationContainer.style.justifyContent = 'center';
  paginationContainer.style.gap = '8px';
  document.querySelector('#options-trades-table').after(paginationContainer);

  // ===== Create Confirmation Popup =====
  const popup = document.createElement('div');
  popup.id = 'cancel-popup';
  popup.classList.add('hidden');
  popup.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    ">
      <div style="
        background: #111;
        padding: 20px 30px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        border: 1px solid #222;
      ">
        <h3 style="color: #fff; margin-bottom: 15px;">Are you sure you want to cancel this order?</h3>
        <div style="display: flex; justify-content: center; gap: 15px;">
          <button id="confirm-yes" style="background:#dc3545; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Yes</button>
          <button id="confirm-no" style="background:#444; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">No</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  // ===== Toast Utility =====
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  if (!userId) {
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;">User not logged in.</td></tr>`;
    return;
  }

  try {
    const res = await fetch(`/options/trades?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch trades');

    const data = await res.json();
    trades = data.trades || [];

    if (trades.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;">No trades found.</td></tr>`;
      return;
    }

    // ===== Cancel Function =====
    const cancelLimitOrder = async (tradeId) => {
      try {
        const res = await fetch(`/options/cancel/${tradeId}?userId=${encodeURIComponent(userId)}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to cancel order');

        trades = trades.map(t => t.id === tradeId ? { ...t, status: 'CANCELLED' } : t);
        renderTable(currentPage);
        showToast(`Order ${tradeId} cancelled successfully.`, 'success');
      } catch (err) {
        console.error('Cancel error:', err);
        showToast('Failed to cancel limit order.', 'error');
      }
    };

    // ===== Popup Button Logic =====
    document.body.addEventListener('click', (e) => {
      if (e.target.id === 'confirm-no') {
        popup.classList.add('hidden');
        selectedTradeId = null;
      }
      if (e.target.id === 'confirm-yes') {
        popup.classList.add('hidden');
        if (selectedTradeId) cancelLimitOrder(selectedTradeId);
        selectedTradeId = null;
      }
    });

    // ===== Render Table =====
    const renderTable = (page) => {
      tableBody.innerHTML = '';
      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      const pageTrades = trades.slice(start, end);

      pageTrades.forEach(trade => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #E0EBFF';

        const cancelButton = trade.status === 'LIMIT (Pending)'
          ? `<button class="cancel-btn" data-id="${trade.id}" style="padding:4px 8px; cursor:pointer;">Cancel</button>`
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

        if (trade.status === 'LIMIT (Pending)') {
          const btn = row.querySelector('.cancel-btn');
          btn.addEventListener('click', () => {
            selectedTradeId = trade.id;
            popup.classList.remove('hidden');
          });
        }
      });

      renderPagination();
    };

    // ===== Pagination =====
    const renderPagination = () => {
      paginationContainer.innerHTML = '';
      const totalPages = Math.ceil(trades.length / rowsPerPage);

      // Only show Previous if not on first page
      if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.addEventListener('click', () => {
          currentPage--;
          renderTable(currentPage);
        });
        paginationContainer.appendChild(prevBtn);
      }

      // Page numbers
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

      // Only show Next if not on last page and more than 1 page
      if (currentPage < totalPages && totalPages > 1) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.addEventListener('click', () => {
          currentPage++;
          renderTable(currentPage);
        });
        paginationContainer.appendChild(nextBtn);
      }
    };

    renderTable(currentPage);
  } catch (err) {
    console.error('Error loading trades:', err);
    showToast(`Error loading trades: ${err.message}`, 'error');
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:red;">Error loading trades: ${err.message}</td></tr>`;
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