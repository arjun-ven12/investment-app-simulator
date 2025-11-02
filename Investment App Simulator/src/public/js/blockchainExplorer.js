


window.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('tradeSearch');
    const tradeContainer = document.getElementById('blockchain-explorer');
    const rowsPerPage = 12;
    let currentPage = 1;
    let allTrades = [];
  
    async function fetchTrades() {
      const res = await fetch('/blockchain/trades-unified');
      return await res.json();
    }
  
  function updateTradeList(trades) {
    if (!trades.length) {
      tradeContainer.innerHTML = '<p>No trades found.</p>';
      return;
    }
  
    const totalPages = Math.ceil(trades.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
  
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedTrades = trades.slice(start, end);
  
    // Clear container
    tradeContainer.innerHTML = '';
  
    // Add heading
    const heading = document.createElement('h3');
    heading.textContent = 'Latest Transactions';
    heading.className = 'h3';
    tradeContainer.appendChild(heading);
  
    // Create table
    const table = document.createElement('table');
    table.className = 'trade-table w-full text-left';
    table.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th>User</th>
          <th>TX Hash</th>
          <th>Timestamp</th>
          <th>Gas Used</th>
          <th>Block</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${paginatedTrades.map(t => `
          <tr>
            <td>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffffff" viewBox="0 0 24 24">
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z"/>
              </svg>
            </td>
            <td>${t.user}</td>
            <td class="break-all">${t.txHash}</td>
            <td>${t.timestamp}</td>
            <td>${t.gasUsed}</td>
            <td>${t.blockNumber}</td>
            <td>${t.contractId ? 'Option' : 'Stock'}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
  
    tradeContainer.appendChild(table);
  
    // Pagination controls
    if (totalPages > 1) {
      const pagination = document.createElement('div');
      pagination.className = 'flex justify-center gap-2 mt-3';
      pagination.innerHTML = `
        ${currentPage > 1 ? `<button id="prevPage" class="px-3 py-1 pagebutton rounded bg-gray-800 text-gray-200 hover:bg-gray-700">Prev</button>` : ''}
        <span class="text-white-400">Page ${currentPage} of ${totalPages}</span>
        ${currentPage < totalPages ? `<button id="nextPage" class="px-3 py-1 pagebutton rounded bg-gray-800 text-gray-200 hover:bg-gray-700">Next</button>` : ''}
      `;
      tradeContainer.appendChild(pagination);
  
      const prevBtn = document.getElementById('prevPage');
      const nextBtn = document.getElementById('nextPage');
  
      if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; updateTradeList(allTrades); });
      if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; updateTradeList(allTrades); });
    } else {
      const pagination = document.createElement('div');
      pagination.className = 'flex justify-center gap-2 mt-3';
      pagination.innerHTML = `<span class="text-gray-400">Page 1 of 1</span>`;
      tradeContainer.appendChild(pagination);
    }
  }
  
  
    function updateSummary(trades) {
      const totalGas = trades.reduce((sum, t) => sum + Number(t.gasUsed || 0), 0);
      const uniqueUsers = new Set(trades.map(t => t.user)).size;
      const highestBlock = Math.max(...trades.map(t => Number(t.blockNumber || 0)), 0);
  
      document.getElementById('totalTrades').textContent = trades.length;
      document.getElementById('totalGas').textContent = totalGas.toLocaleString();
      document.getElementById('highestBlock').textContent = highestBlock;
      document.getElementById('uniqueUsers').textContent = uniqueUsers;
    }
  function renderCharts(trades) {
    // ✅ Sort ascending for charts only
    const sortedForChart = [...trades].sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));
  
    // --- Constants and plugins (unchanged) ---
    const ACCENT_LINE_COLOR = 'rgba(255, 255, 255, 0.9)';
    const ACCENT_FILL_TOP = 'rgba(143,173,253,0.4)';
    const ACCENT_FILL_BOTTOM = 'rgba(143,173,253,0)';
    const X_AXIS_GRID_COLOR = 'rgba(255, 255, 255, 0.1)';
    const GRID_GRADIENT_COLOR = 'rgba(255, 255, 255, 0.1)';
    const TEXT_COLOR = '#c6c6c66f';
  
    const shadowPlugin = {
      id: 'chartJsShadow',
      beforeDatasetsDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.shadowColor = ACCENT_LINE_COLOR;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
      },
      afterDatasetsDraw: (chart) => {
        chart.ctx.restore();
      }
    };
  
    const gradientGridPlugin = {
      id: 'gradientGrid',
      beforeDraw: (chart) => {
        const { ctx, chartArea, scales } = chart;
        const yAxis = scales.y;
        if (!chartArea) return;
        ctx.save();
        yAxis.ticks.forEach((tick, index) => {
          const y = yAxis.getPixelForTick(index);
          const x1 = chartArea.left;
          const x2 = chartArea.right;
          const gradient = ctx.createLinearGradient(x1, 0, x2, 0);
          gradient.addColorStop(0, 'rgba(255,255,255,0)');
          gradient.addColorStop(0.2, GRID_GRADIENT_COLOR);
          gradient.addColorStop(0.8, GRID_GRADIENT_COLOR);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
        });
        ctx.restore();
      }
    };
  
    // === GAS CHART ===
    const gasCtx = document.getElementById('gasChart');
    new Chart(gasCtx, {
      type: 'line',
      plugins: [shadowPlugin, gradientGridPlugin],
      data: {
        labels: sortedForChart.map(t => t.blockNumber),
        datasets: [{
          label: 'Gas Used',
          data: sortedForChart.map(t => Number(t.gasUsed)),
          borderColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return ACCENT_LINE_COLOR;
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,0.14)');
            gradient.addColorStop(0.25, ACCENT_LINE_COLOR);
            gradient.addColorStop(0.85, ACCENT_LINE_COLOR);
            gradient.addColorStop(1, 'rgba(255,255,255,0.14)');
            return gradient;
          },
          borderWidth: 1.0,
          fill: true,
          tension: 0.2,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, ACCENT_FILL_TOP);
            gradient.addColorStop(1, ACCENT_FILL_BOTTOM);
            return gradient;
          },
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHitRadius: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            border: { display: false },
            ticks: { color: TEXT_COLOR },
            grid: { color: X_AXIS_GRID_COLOR, lineWidth: 0.5 },
          },
          y: {
            border: { display: false },
            ticks: { color: TEXT_COLOR, maxTicksLimit: 5 },
            grid: { display: false, drawBorder: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleColor: ACCENT_LINE_COLOR,
            bodyColor: '#E0E0E0',
            cornerRadius: 6,
            padding: 10
          },
          zoom: {
            pan: { enabled: true, mode: 'xy', modifierKey: 'ctrl' },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
          }
        }
      }
    });
  
    // === TRADES PER BLOCK CHART ===
    const blockCounts = {};
    sortedForChart.forEach(t => blockCounts[t.blockNumber] = (blockCounts[t.blockNumber] || 0) + 1);
    const blockCtx = document.getElementById('tradesPerBlockChart');
    new Chart(blockCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(blockCounts),
        datasets: [{
          label: 'Trades per Block',
          data: Object.values(blockCounts),
          backgroundColor: ctx => {
            const chart = ctx.chart;
            const gradient = chart.ctx.createLinearGradient(0, 0, 0, chart.height);
            gradient.addColorStop(0, 'rgba(0, 17, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
            return gradient;
          },
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#e0e0e0',
              font: { family: 'Outfit', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: '#111',
            titleColor: '#fff',
            bodyColor: '#e0e0e0',
            cornerRadius: 6,
            padding: 8
          }
        },
        scales: {
          x: {
            ticks: { color: '#aaa', font: { family: 'Outfit', size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            ticks: { color: '#aaa', font: { family: 'Outfit', size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        }
      }
    });
  }
  
  
  async function refreshDashboard(filter = '') {
    allTrades = await fetchTrades();
  
    // ✅ Sort trades by blockNumber (latest first)
    allTrades.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
  
    if (filter) {
      const f = filter.toLowerCase();
      allTrades = allTrades.filter(t =>
        t.user.toLowerCase().includes(f) ||
        t.txHash.toLowerCase().includes(f) ||
        t.timestamp.toLowerCase().includes(f)
      );
    }
  
    currentPage = 1;
    updateTradeList(allTrades);
    updateSummary(allTrades);
    renderCharts(allTrades);
  }
  
  
    searchInput.addEventListener('input', (e) => refreshDashboard(e.target.value));
  
    // Initial load
    await refreshDashboard();
  });
  