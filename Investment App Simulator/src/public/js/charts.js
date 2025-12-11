window.currentStockId = null;
////////////////////////////////////////////////////
//////// HTML Frontend Fields
///////////////////////////////////////////////////

// ✅ Toast Function
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
function renderPaginationControls() {
  const totalPages = Math.ceil(allTrades.length / pageSize);
  const paginationContainer = document.getElementById('trade-pagination');
  paginationContainer.innerHTML = '';

  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderTradeTablePage(currentPage);
      renderPaginationControls();
    });
    paginationContainer.appendChild(prevBtn);
  }

  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      renderTradeTablePage(currentPage);
      renderPaginationControls();
    });
    paginationContainer.appendChild(nextBtn);
  }

  // Optional: show page numbers
  const pageIndicator = document.createElement('span');
  pageIndicator.textContent = ` Page ${currentPage} of ${totalPages} `;
  paginationContainer.appendChild(pageIndicator);
}

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    // Remove active from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    // Add active to clicked button
    button.classList.add('active');
    // Show related content
    const tabId = button.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});




// document.addEventListener("DOMContentLoaded", () => {
//   const orderType = document.getElementById("order-type");
//   const stopLossContainer = document.getElementById("stop-loss-container");
//   const stopLimitContainer = document.getElementById("stop-limit-container");

//   const stopLossCheck = document.getElementById("stop-loss-check");
//   const stopLossInput = document.getElementById("stop-loss-input");

//   const stopLimitCheck = document.getElementById("stop-limit-check");
//   const stopLimitInput = document.getElementById("stop-limit-input");

//   // Function to reset checkboxes & inputsyes 
//   function resetStopInputs() {
//     stopLossCheck.checked = false;
//     stopLossInput.classList.add("hidden");
//     stopLimitCheck.checked = false;
//     stopLimitInput.classList.add("hidden");
//   }

//   // Show/Hide stop loss vs stop limit depending on order type
//   orderType.addEventListener("change", () => {
//     resetStopInputs();

//     if (orderType.value === "market") {
//       stopLossContainer.classList.remove("hidden");
//       stopLimitContainer.classList.add("hidden");
//     } else if (orderType.value === "limit") {
//       stopLimitContainer.classList.remove("hidden");
//       stopLossContainer.classList.add("hidden");
//     } else {
//       stopLossContainer.classList.add("hidden");
//       stopLimitContainer.classList.add("hidden");
//     }
//   });

//   // Show input when checkbox is ticked
//   stopLossCheck.addEventListener("change", () => {
//     stopLossInput.classList.toggle("hidden", !stopLossCheck.checked);
//   });

//   stopLimitCheck.addEventListener("change", () => {
//     stopLimitInput.classList.toggle("hidden", !stopLimitCheck.checked);
//   });
// });


// const orderTypeSelect = document.getElementById('order-type');
// const timeframeContainer = document.getElementById('timeframe-container');

// orderTypeSelect.addEventListener('change', () => {
//   if (orderTypeSelect.value === 'limit') {
//     timeframeContainer.classList.remove('hidden');
//   } else {
//     timeframeContainer.classList.add('hidden');
//   }
// });





////////////////////////////////////////////////////
//////// Stock Search
///////////////////////////////////////////////////


window.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('stock-search');
  const searchButton = document.getElementById('search-button');
  const stockList = document.getElementById('stock-list');
  const errorMessage = document.getElementById('error-message');

  const SEARCH_API_URL = '/stocks/search-stocks';
  const FAVORITE_API_URL = '/stocks/favorite-stock';

  function searchStocks() {
    const query = searchInput.value.trim();
    if (!query) {
    showToast(`Please enter a company name or stock symbol.`, 'error');
return;
    }

    fetch(`/stocks/search-stocks?query=${encodeURIComponent(query)}`)
      .then(function (response) {
        if (response.ok) {
          return response.json();
        } else {
          return response.json().then(function (data) {
            throw new Error(data.message || 'Error searching for stocks.');
          });
        }
      })
      .then(function (data) {
        renderStocks(data.stocks);
      })
      .catch(function (error) {
        console.error('Error searching for stocks:', error);
        errorMessage.textContent = 'An error occurred while searching for stocks.';
      });
  }

  function renderStocks(stocks) {
    stockList.innerHTML = '';
    errorMessage.textContent = '';

    if (!stocks || stocks.length === 0) {
      errorMessage.textContent = 'No stocks found.';
      return;
    }

    stocks.forEach(function (stock) {
      const listItem = document.createElement('li');
      listItem.className = 'stock-item';

      const stockInfo = document.createElement('span');
      stockInfo.textContent = `${stock.description} (${stock.displaySymbol})`;

      const favoriteButton = document.createElement('button');
      favoriteButton.textContent = 'Favorite';
      favoriteButton.addEventListener('click', function () {
        favoriteStock(1, stock.displaySymbol);
      });

      listItem.appendChild(stockInfo);
      listItem.appendChild(favoriteButton);
      stockList.appendChild(listItem);
    });
  }
        const userIdIn = localStorage.getItem('userId'); // Get user ID from localStorage

        const parsedUserId = parseInt(userIdIn)

  function favoriteStock(userId, stockSymbol) {
      // Construct the data to send in the body
      const data = {
        userId: parsedUserId,
        symbol: stockSymbol  // note: controller expects a property called "symbol"
      };
    
      fetch(FAVORITE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          if (response.ok) {
            return response.json();
          } else {
            return response.json().then(function (data) {
              throw new Error(data.message || 'Error updating favorite status.');
            });
          }
        })
        .then(function (result) {
          // alert(result.success ? 'Stock favorited!' : 'Failed to favorite stock.');
        })
        .catch(function (error) {
          console.error('Error updating favorite status:', error);
          alert('An error occurred while updating favorite status.');
        });
    }
    

  // Attach event listener to the search button
  searchButton.addEventListener('click', function (e) {
    e.preventDefault();
    searchStocks();
  });
});







//////////////////////////////////////////////////
/////////// Comments Functionality
//////////////////////////////////////////////////




window.addEventListener('DOMContentLoaded', function () {
// Assume the logged-in user's id is stored (adjust as needed)
const loggedInUserId = localStorage.getItem('userId'); 

// DOM elements
const stockSymbolInput = document.getElementById('stock-symbol');
const loadCommentsButton = document.getElementById('load-comments-button');
const commentContentInput = document.getElementById('comment-content');
const submitCommentButton = document.getElementById('submit-comment-button');
const commentsList = document.getElementById('comments-list');

// API endpoints
const COMMENTS_API_URL = '/stocks/comments'; // Base URL for comment endpoints
const COMMENT_VIEW_API_URL = '/charts';       // For incrementing view count

// Helper function: Convert timestamp to relative time (e.g., "2 hours ago")
function timeAgo(date) {
  const now = new Date();
  const secondsPast = (now.getTime() - date.getTime()) / 1000;
  if (secondsPast < 60) return `${Math.floor(secondsPast)}s ago`;
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)}m ago`;
  if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)}h ago`;
  return `${Math.floor(secondsPast / 86400)}d ago`;
}

// Helper function: Compute a "hotness" score (for example, simply based on viewCount)
function computeHotness(viewCount, ageSeconds) {
  // For simplicity: hotness = viewCount / (age in hours + 1)
  return viewCount / ((ageSeconds / 3600) + 1);
}

// Function to load comments for a stock symbol
function loadComments(stockSymbol) {
  fetch(`${COMMENTS_API_URL}?stockSymbol=${encodeURIComponent(stockSymbol)}`)
    .then(response => {
      if (response.ok) return response.json();
      else return response.json().then(data => { throw new Error(data.message || 'Error loading comments'); });
    })
    .then(data => {
      // Before rendering, manipulate the data further.
      // Here we add a relative time and a hotness score to each comment.
      const manipulatedComments = data.comments.map(comment => {
        const createdDate = new Date(comment.createdAt);
        const ageSeconds = (new Date().getTime() - createdDate.getTime()) / 1000;
        return {
          ...comment,
          relativeTime: timeAgo(createdDate),
          hotness: computeHotness(comment.viewCount, ageSeconds)
        };
      });
      console.log("Manipulated Comment Data:", manipulatedComments);
      renderComments(manipulatedComments);
    })
    .catch(error => {
      console.error("Error loading comments:", error);
      commentsList.innerHTML = `<li>Error loading comments: ${error.message}</li>`;
    });
}

// Render list of comments (with additional data manipulation)
function renderComments(comments) {
  commentsList.innerHTML = ""; // Clear previous list

  if (!comments || comments.length === 0) {
    commentsList.innerHTML = '<li>No comments for this stock yet.</li>';
    return;
  }

  // Optionally, sort comments by hotness (highest first)
  comments.sort((a, b) => b.hotness - a.hotness);

  comments.forEach(comment => {
    const listItem = document.createElement('li');
    listItem.dataset.commentId = comment.id;
    listItem.innerHTML = `
      <p><strong>${comment.userName || 'User ' + comment.userId}:</strong> <span class="comment-text">${comment.content}</span></p>
      <small>Posted: ${comment.relativeTime} | Views: <span id="view-count-${comment.id}">${comment.viewCount}</span> | Hotness: ${comment.hotness.toFixed(2)}</small>
    `;

    // If the comment belongs to the logged-in user, show edit and delete buttons
    if (String(comment.userId) === loggedInUserId) {
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => editComment(comment.id, comment.content));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteComment(comment.id));

      listItem.appendChild(editBtn);
      listItem.appendChild(deleteBtn);
    }
    
    commentsList.appendChild(listItem);
    
    // Increment the view count for each comment (this call may be optimized to avoid multiple increments per session)
    incrementViewCount(comment.id);
  });
}

// Function to increment view count for a given comment
function incrementViewCount(commentId) {
  fetch(`${COMMENT_VIEW_API_URL}/${encodeURIComponent(commentId)}/view`, { method: "POST" })
    .then(response => response.json())
    .then(data => {
      // Update the view count displayed for this comment
      const viewCountSpan = document.getElementById(`view-count-${commentId}`);
      if (viewCountSpan) {
        viewCountSpan.textContent = data.viewCount;
      }
    })
    .catch(error => {
      console.error("Error incrementing view count:", error);
    });
}

// Submit a new comment
function submitComment() {
  const stockSymbol = stockSymbolInput.value.trim();
  const content = commentContentInput.value.trim();

  if (!stockSymbol) {
    alert('Please enter a stock symbol.');
    return;
  }
  if (!content) {
    alert('Please write a comment.');
    return;
  }
  const parsedUserId = parseInt(loggedInUserId);
  const data = {
    userId: parsedUserId,
    stockSymbol,
    content,
  };

  fetch(COMMENTS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (response.ok) return response.json();
      else return response.json().then(data => { throw new Error(data.message || 'Error submitting comment'); });
    })
    .then(result => {
      alert('Comment submitted!');
      commentContentInput.value = '';
      loadComments(stockSymbol);
    })
    .catch(error => {
      console.error('Error submitting comment:', error);
      alert('Error submitting comment: ' + error.message);
    });
}

// Edit a comment (simple inline editing example)
function editComment(commentId, oldContent) {
  const newContent = prompt('Edit your comment:', oldContent);
  if (newContent === null || newContent.trim() === '') return;

  fetch(`${COMMENTS_API_URL}/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: newContent })
  })
    .then(response => {
      if (response.ok) return response.json();
      else return response.json().then(data => { throw new Error(data.message || 'Error editing comment'); });
    })
    .then(result => {
      alert('Comment updated!');
      loadComments(stockSymbolInput.value.trim());
    })
    .catch(error => {
      console.error('Error editing comment:', error);
      alert('Error editing comment: ' + error.message);
    });
}

// Delete a comment
function deleteComment(commentId) {
  if (!confirm('Are you sure you want to delete this comment?')) return;

  fetch(`${COMMENTS_API_URL}/${commentId}`, {
    method: 'DELETE'
  })
    .then(response => {
      if (response.ok) return response.json();
      else return response.json().then(data => { throw new Error(data.message || 'Error deleting comment'); });
    })
    .then(result => {
      alert('Comment deleted!');
      loadComments(stockSymbolInput.value.trim());
    })
    .catch(error => {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment: ' + error.message);
    });
}

// Event listeners
loadCommentsButton.addEventListener('click', function () {
  const stockSymbol = stockSymbolInput.value.trim();
  if (!stockSymbol) {
    alert('Please enter a stock symbol.');
    return;
  }
  loadComments(stockSymbol);
});

submitCommentButton.addEventListener('click', function (e) {
  e.preventDefault();
  submitComment();
});
});




//////////////////////////////////////////////////
/////////// Market Status Functionality
//////////////////////////////////////////////////



// market-status.js
window.addEventListener('DOMContentLoaded', function () {
  // The HTML element that will display the market status
  const marketStatusEl = document.getElementById('market-status');


  const exchange = "US";
  const API_URL = `/stocks/market-status?exchange=${encodeURIComponent(exchange)}`;

  fetch(API_URL)
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => { 
          throw new Error(data.message || "Error fetching market status");
        });
      }
      return response.json();
    })
    .then(data => {
      // Based on the Finnhub API, we expect data like:
      // { exchange: "SGX", holiday: null, isOpen: false, session: "pre-market", timezone: "...", t: ... }
      const statusText = data.isOpen ? "open" : "closed";
      const sessionText = data.session ? ` (${data.session})` : "";
      marketStatusEl.textContent = `Market is ${statusText}${sessionText} (USA)`;
    })
    .catch(error => {
      console.error("Error retrieving market status:", error);
      marketStatusEl.textContent = "Error retrieving market status";
    });
});



//////////////////////////////////////////////////
/////////// Recommendations Functionality
//////////////////////////////////////////////////




window.addEventListener('DOMContentLoaded', function () {
  // Use the top search input to get the stock symbol
  const symbolInput = document.querySelector("input[name='chartSymbol']");
  const errorDisplay = document.getElementById('recommendation-error');
  const ctx = document.getElementById('recommendationChart').getContext('2d');
  let recommendationChart; // To store the chart instance

  // Function to load recommendations for the given symbol
  function loadRecommendations(symbol) {
    fetch(`/limit/recommendation?symbol=${encodeURIComponent(symbol)}`)
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => { 
            throw new Error(data.message || "Error fetching recommendations");
          });
        }
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No recommendation data available");
        }

        // Manipulate the data for chart usage
        const manipulatedData = data.map(item => {
          const total = item.strongBuy + item.buy + item.hold + item.sell + item.strongSell;
          const percentages = {
            strongBuy: total ? ((item.strongBuy / total) * 100).toFixed(1) : "0.0",
            buy: total ? ((item.buy / total) * 100).toFixed(1) : "0.0",
            hold: total ? ((item.hold / total) * 100).toFixed(1) : "0.0",
            sell: total ? ((item.sell / total) * 100).toFixed(1) : "0.0",
            strongSell: total ? ((item.strongSell / total) * 100).toFixed(1) : "0.0",
          };
          return { ...item, totalRecommendations: total, percentages };
        });

        console.log("Manipulated Recommendation Data:", manipulatedData);
        renderChart(manipulatedData); 
      })
      .catch(error => {
        console.error("Error:", error);
        errorDisplay.textContent = error.message;
      });
  }

  // Function to render the chart using Chart.js
function renderChart(data) {
  const labels = data.map(item => item.period);
  const categories = ['strongBuy', 'buy', 'hold', 'sell', 'strongSell'];

  const baseColors = [
    '#8FAFFD', // Strong Buy
    '#6D93FA', // Buy
    '#5277E5', // Hold
    '#3C5EC9', // Sell
    '#2A3E73'  // Strong Sell
  ];

  const borderShade = 'rgba(255, 255, 255, 0)'; // 🌌 subtle metallic tone

  const datasets = categories.map((cat, i) => ({
    label: cat,
    data: data.map(item => item[cat]),
    backgroundColor: (context) => {
      const chart = context.chart;
      const { ctx, chartArea } = chart;
      if (!chartArea) return baseColors[i];

      // 🎨 Bar gradient: solid → transparent
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, baseColors[i]);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      return gradient;
    },
    borderColor: borderShade,
    borderWidth: 1.5,
    borderRadius: 4
  }));

  if (recommendationChart) recommendationChart.destroy();

  recommendationChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#E0EBFF' },
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
          }
        },
        y: {
          beginAtZero: true,
          title: { display: false, color: '#E0EBFF' },
          ticks: { color: '#E0EBFF' },
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
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: `${symbolInput.value.toUpperCase()} Recommendations Over Time`,
          color: '#E0EBFF',
          font: { size: 16 }
        },
        legend: {
          labels: { color: '#E0EBFF' }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const idx = context.dataIndex;
              const category = context.dataset.label;
              const rawValue = context.raw;
              const total = data[idx].totalRecommendations;
              const percentage = data[idx].percentages[category];
              return `${category}: ${rawValue} (${percentage}% of ${total})`;
            }
          }
        }
      }
    }
  });
}


  // Load recommendations when symbol input changes
  symbolInput.addEventListener('change', function () {
    const symbol = symbolInput.value.trim();
    if (!symbol) {
      errorDisplay.textContent = "Please enter a stock symbol.";
      return;
    }
    errorDisplay.textContent = "";
    loadRecommendations(symbol);
  });
});


//////////////////////////////////////////////////
/////////// Export Trades
//////////////////////////////////////////////////


window.addEventListener('DOMContentLoaded', function () {

  const exportTradesButton = document.getElementById('export-trades');
  if (exportTradesButton) {
      exportTradesButton.addEventListener('click', function () {
          const userId = localStorage.getItem('userId');
          if (!userId) {
              alert("User not logged in.");
              return;
          }
          window.location.href = `/trade/export?userId=${encodeURIComponent(userId)}`;
      });
  }




  
  const exportLimitOrdersButton = document.getElementById('export-limit-orders');
  if (exportLimitOrdersButton) {
      exportLimitOrdersButton.addEventListener('click', function () {
          const userId = localStorage.getItem('userId');
          if (!userId) {
              alert("User not logged in.");
              return;
          }
          window.location.href = `/limit/export?userId=${encodeURIComponent(userId)}`;
      });
  }
});





///////////////////////////////////////////////////
/////////// Realtime Chart Functionality
///////////////////////////////////////////////////





// JSwindow.addEventListener('DOMContentLoaded', function () {
  const intradayForm = document.getElementById('chart-form-intraday');
const chartSymbolInput = intradayForm.querySelector("input[name='chartSymbol']");
const rangeSelect = intradayForm.querySelector("select[name='range']");
const chartTypeSelect = intradayForm.querySelector("select[name='chartType']");
const chartCanvas = document.getElementById('myChart2');
let intradayChart = null;

function getTimeUnit(data) {
    if (!data || data.length === 0) return 'day';
    const diffMs = data[data.length - 1].x - data[0].x;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) return 'hour';
    if (diffDays <= 7) return 'day';
    if (diffDays <= 60) return 'week';
    return 'month';
}

intradayForm.addEventListener('submit', async function (e) {
    e.preventDefault();
        const loadingDiv = document.getElementById("loading");
    loadingDiv.innerText = "Loading chart...";
    loadingDiv.style.color = "#ffffffff";
    loadingDiv.style.padding = "10px 0";
    const symbolValue = chartSymbolInput.value.trim();
    const rangeValue = rangeSelect.value;
    const chartType = chartTypeSelect.value;

    const now = new Date();
    let dateFrom = new Date();
    switch (rangeValue) {
        case '1d': dateFrom.setDate(now.getDate() - 1); break;
        case '1w': dateFrom.setDate(now.getDate() - 7); break;
        case '1m': dateFrom.setMonth(now.getMonth() - 1); break;
        case '6m': dateFrom.setMonth(now.getMonth() - 6); break;
        case '1y': dateFrom.setFullYear(now.getFullYear() - 1); break;
        case '5y': dateFrom.setFullYear(now.getFullYear() - 5); break;
        default: dateFrom.setDate(now.getDate() - 7);
    }

    const apiUrl = `/realtime/${encodeURIComponent(symbolValue)}?date_from=${dateFrom.toISOString().split('T')[0]}&date_to=${now.toISOString().split('T')[0]}`;

    try {
        const result = await fetch(apiUrl).then(res => res.json());

        const ohlcData = result.ohlc;
        const startPrice = result.startPrice;
        const endPrice = result.endPrice;
        const difference = result.difference;
        const percentageChange = result.percentageChange;

if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
    showToast(`Invalid symbol entered or no data available.`, 'error');

}


        // DISPLAY PRICE % & DIFFERENCE
        const percentageDiv = document.getElementById("percentage2");
        const sign = difference >= 0 ? "+" : "";
        const color = difference >= 0 ? "#65ea69ff" : "#ec4e4eff";

percentageDiv.innerHTML = `
    <span style="color:${color}; font-size:20px; font-weight:600; display:flex;justify-content:right;padding-top:10px;padding-right:3px;">
        ${sign}${difference.toFixed(2)} (${sign}${percentageChange.toFixed(2)}%)
    </span>
`;


        // Format for the chart
        const formattedData = ohlcData.map(item => ({
            x: new Date(item.date).getTime(),
            o: item.openPrice,
            h: item.highPrice,
            l: item.lowPrice,
            c: item.closePrice
        })).sort((a, b) => a.x - b.x);

        const timeUnit = getTimeUnit(formattedData);

        // Destroy old chart
        if (intradayChart) {
            intradayChart.destroy();
            intradayChart = null;
        }

        // Clear canvas
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

        // BUILD THE CHART
        let config;
        if (chartType === 'line') {
            config = {
                type: 'line',
                data: {
                    labels: formattedData.map(d => new Date(d.x)),
                    datasets: [{
                        label: `${symbolValue} Close Price`,
                        data: formattedData.map(d => d.c),
                        borderColor: '#E0EBFF',
                        fill: true,
                        tension: 0.1,
                        backgroundColor: function (context) {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;

                            if (!chartArea) return null;

                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(143,173,253,0.4)');
                            gradient.addColorStop(1, 'rgba(143,173,253,0)');
                            return gradient;
                        }
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: { unit: timeUnit, tooltipFormat: 'MMM dd, yyyy HH:mm' },
                            ticks: { color: 'white' },
                        },
                        y: {
                            ticks: { color: 'white' },
                        }
                    },
                    plugins: {
                        legend: { labels: { color: 'white' } },
                        zoom: {
                            pan: { enabled: true, mode: 'xy', modifierKey: 'ctrl' },
                            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
                        }
                    }
                }
            };
          }
            

      else { // candlestick
        config = {
          type: 'candlestick',
          data: {
            datasets: [{
              label: `${symbolValue} Candlestick`,
              data: formattedData,
              color: { up: '#00c853', down: '#d50000', unchanged: '#999' }
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: 'time',
                time: { unit: timeUnit, tooltipFormat: 'MMM dd, yyyy HH:mm' },
                ticks: { color: 'white' },
                grid: { color: 'rgba(255,255,255,0.2)' },
                title: { display: true, text: 'Date', color: 'white' }
              },
              y: {
                ticks: { color: 'white' },
                grid: { color: 'rgba(255,255,255,0.2)' },
                title: { display: true, text: 'Price', color: 'white' }
              }
            },
            plugins: {
              legend: { labels: { color: 'white' } },
              zoom: {
                pan: {
                  enabled: true,
                  mode: 'xy', // allow panning both X & Y
                  modifierKey: 'ctrl' // optional: require Ctrl key
                },
                zoom: {
                  wheel: {
                    enabled: true
                  },
                  pinch: {
                    enabled: true
                  },
                  mode: 'xy'
                }
              }
            }
          }

        };
      }

      intradayChart = new Chart(ctx, config);
        loadingDiv.innerText = "";

    } catch (err) {
      console.error(err);
    showToast(`Invalid symbol entered or no data available`, 'error');
    }
  });


//});


document.getElementById("reset-zoom").addEventListener("click", () => {
    if (intradayChart) {
        intradayChart.resetZoom(); // works with chartjs-plugin-zoom
    }

  });




///////////////////////////////////////////////////
/////////// WEBSOCKETS
///////////////////////////////////////////////////



window.addEventListener('DOMContentLoaded', function () {
  // ------------------------------
  // Shared variables
  // ------------------------------
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  if (!userId || !token) {
    alert('User not authenticated. Please log in.');
    return;
  }

  const parsedUserId = parseInt(userId);

  // ------------------------------
  // WebSocket setup
  // ------------------------------
  const socket = io('http://localhost:3000', {
    query: { userId }
  });

  // ------------------------------
  // ===== PORTFOLIO DOM =====
  // ------------------------------
  // const portfolioContainer = document.querySelector('.trading-card2');
  // let portfolioChart = null;

  // socket.off('portfolioUpdate');
  // socket.on('portfolioUpdate', () => {
  //   console.log('Portfolio update received via WebSocket');
  //   fetchPortfolio();
  // });

  // async function fetchPortfolio() {
  //   try {
  //     const response = await fetch(`/stocks/portfolio/${userId}`);
  //     if (!response.ok) throw new Error('Failed to fetch portfolio');
  //     const portfolio = await response.json();
  //     renderPortfolio(portfolio);
  //   } catch (err) {
  //     console.error('Error fetching portfolio:', err);
  //     portfolioContainer.innerHTML = `<p>Error fetching portfolio: ${err.message}</p>`;
  //   }
  // }

  // function renderPortfolio(portfolio) {
  //   portfolioContainer.innerHTML = '';

  //   if (!portfolio || portfolio.length === 0) {
  //     portfolioContainer.innerHTML = `<p>You don't own any stocks yet.</p>`;
  //     return;
  //   }

  //   const stockColumns = portfolio.map(stock => {
  //     const totalAmountFormatted = parseFloat(stock.totalAmount).toFixed(2);
  //     return `
  //       <div class="stock-column">
  //         <h3>${stock.symbol} (${stock.companyName})</h3>
  //         <p><strong>Quantity:</strong> ${stock.quantity}</p>
  //         <p><strong>Total Amount Spent:</strong> $${totalAmountFormatted}</p>
  //       </div>
  //     `;
  //   }).join('');

  //   portfolioContainer.innerHTML = `
  //     <h1>Your Portfolio</h1>
  //     <div class="stock-grid">${stockColumns}</div>
  //     <div class="portfolio-chart-container">
  //       <canvas id="portfolioPieChart"></canvas>
  //     </div>
  //   `;

  //   if (portfolioChart) portfolioChart.destroy();

  //   const labels = portfolio.map(stock => stock.symbol);
  //   const data = portfolio.map(stock => parseFloat(stock.totalAmount));
  //   const ctx = document.getElementById('portfolioPieChart').getContext('2d');

  //   portfolioChart = new Chart(ctx, {
  //     type: 'pie',
  //     data: {
  //       labels,
  //       datasets: [{
  //         data,
  //         backgroundColor: ['#E0EBFF', '#A3C1FF', '#7993FF', '#5368A6', '#2A3C6B', '#0D1A33'],
  //         hoverOffset: 6
  //       }]
  //     },
  //     options: {
  //       responsive: true,
  //       maintainAspectRatio: false,
  //       plugins: {
  //         legend: { position: 'top' },
  //         tooltip: {
  //           callbacks: {
  //             label: function (context) {
  //               const total = context.dataset.data.reduce((a, b) => a + b, 0);
  //               const percentage = ((context.raw / total) * 100).toFixed(2);
  //               return `${context.label}: $${context.raw} (${percentage}%)`;
  //             }
  //           }
  //         }
  //       }
  //     }
  //   });
  // }

  // fetchPortfolio();
const portfolioContainer = document.querySelector('.trading-card2');
let portfolioChart = null;

// Listen to WebSocket updates
socket.off('portfolioUpdate');
socket.on('portfolioUpdate', () => {
  console.log('Portfolio update received via WebSocket');
  fetchPortfolio();
});

async function fetchPortfolio() {
  try {
    const response = await fetch(`/stocks/portfolio/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch portfolio');
    const portfolio = await response.json();
    renderPortfolio(portfolio);
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    portfolioContainer.innerHTML = `<p>Error fetching portfolio: ${err.message}</p>`;
  }
}

function renderPortfolio(portfolio) {
  const { openPositions = [], closedPositions = [] } = portfolio;

  const openTableBody = document.getElementById("open-positions-table-body");
  const closedTableBody = document.getElementById("closed-positions-table-body");

  if (!openTableBody || !closedTableBody) return;

  // ---------------- Open Positions ----------------
  if (openPositions.length === 0) {
    openTableBody.innerHTML = `<tr><td colspan="8">You don't have any open positions.</td></tr>`;
  } else {
    let openHTML = '';
    openPositions.forEach(stock => {
      openHTML += `
        <tr>
          <td>${stock.symbol} (${stock.companyName})</td>
          <td>${stock.quantity}</td>
          <td>$${parseFloat(stock.avgBuyPrice).toFixed(2)}</td>
          <td>$${parseFloat(stock.currentPrice).toFixed(2)}</td>
          <td>$${parseFloat(stock.totalInvested).toFixed(2)}</td>
          <td>$${parseFloat(stock.currentValue).toFixed(2)}</td>
          <td>$${parseFloat(stock.unrealizedProfitLoss).toFixed(2)} (${stock.unrealizedProfitLossPercent})</td>
          <td>$${parseFloat(stock.realizedProfitLoss).toFixed(2)}</td>
        </tr>
      `;
    });
    openTableBody.innerHTML = openHTML;
  }

  // ---------------- Closed Positions ----------------
  if (closedPositions.length === 0) {
    closedTableBody.innerHTML = `<tr><td colspan="5">You don't have any closed positions.</td></tr>`;
  } else {
    let closedHTML = '';
    closedPositions.forEach(stock => {
      closedHTML += `
        <tr>
          <td>${stock.symbol} (${stock.companyName})</td>
          <td>${stock.totalBoughtQty}</td>

          <td>${stock.totalSoldQty}</td>
          <td>$${parseFloat(stock.totalBoughtValue).toFixed(2)}</td>
          <td>$${parseFloat(stock.totalSoldValue).toFixed(2)}</td>
          <td>$${parseFloat(stock.realizedProfitLoss).toFixed(2)}</td>
        </tr>
      `;
    });
    closedTableBody.innerHTML = closedHTML;
  }

  // ---------------- Pie Chart ----------------
  const pieCanvas = document.getElementById('portfolioPieChart');
  if (openPositions.length > 0 && pieCanvas) {
    if (portfolioChart) portfolioChart.destroy();

    const labels = openPositions.map(stock => stock.symbol);
    const data = openPositions.map(stock => parseFloat(stock.totalInvested));

    portfolioChart = new Chart(pieCanvas.getContext('2d'), {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#8faefd9a', // Strong Buy
            '#6d93fa61', // Buy
            '#5277e541', // Hold
            '#3c5dc9a8', // Sell
            '#2a3d7399'  // Strong Sell
          ],
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#fff' } },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(2);
                return `${context.label}: $${context.raw} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
}

// Initial fetch
fetchPortfolio();




// // ------------------------------
// // ===== TRADE DOM =====
// // ------------------------------
// const tradingForm = document.getElementById('trading-form');
// const priceInput = document.getElementById('price');
// const quantityInput = document.getElementById('quantity');
// const amountInput = document.getElementById('amount');
// const errorEl = document.getElementById('buy-error');

// let currentStockId = null; // Should be set when chart is generated

// // Recalculate amount
// function calculateAmount() {
//   const price = parseFloat(priceInput.value) || 0;
//   const quantity = parseInt(quantityInput.value) || 0;
//   amountInput.value = (price * quantity).toFixed(2);
// }
// priceInput.addEventListener('input', calculateAmount);
// quantityInput.addEventListener('input', calculateAmount);

// // Trade form submit
// tradingForm.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   errorEl.textContent = '';

//   // Ensure stock ID is already set from chart form
//   if (!currentStockId) return;

//   const quantity = parseInt(quantityInput.value);
//   if (!quantity || quantity <= 0) return;

//   const side = tradingForm.querySelector("input[name='side']:checked").value;
//   const orderType = document.getElementById('order-type').value;
//   if (!orderType) return;

//   // Only submit if Market Order is selected
//   if (orderType === 'market') {
//     try {
//       const res = await fetch(`/stocks/buytrade`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`
//         },
//         body: JSON.stringify({
//           userId: parseInt(userId),
//           stockId: currentStockId,
//           quantity,
//           tradeType: side.toUpperCase() // BUY or SELL
//         })
//       });
//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.error || 'Trade failed');
//       }
//       const result = await res.json();
//       alert(`${side.toUpperCase()} market order successful!`);
//       console.log('Trade result:', result);
//     } catch (err) {
//       console.error(err);
//       errorEl.textContent = `Failed to complete trade: ${err.message}`;
//     }
//   }
// });

//   // -------------------------
//   // Chart form: fetch stock ID and price
//   // -------------------------
//   const chartForm = document.getElementById('chart-form-intraday');
//   const symbolInput = chartForm.querySelector("input[name='chartSymbol']");
// chartForm.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   errorEl.textContent = '';

//   const rawSymbol = symbolInput.value.trim();
//   const symbol = rawSymbol.split('/')[0]; // avoid accidental /1 or similar
//   if (!symbol) return;

//   console.log('Fetching stock:', symbol);

//   try {
//     // Fetch stock ID
//     const resId = await fetch(`/stocks/id/${encodeURIComponent(symbol)}`);
//   //  if (!resId.ok) throw new Error(`Failed to fetch stock ID for ${symbol}`);
//     const dataId = await resId.json();
//     currentStockId = dataId.stock_id;
//     window.currentStockId = dataId.stock_id;

//     // Fetch latest price
//     const resPrice = await fetch(`/stocks/price/${encodeURIComponent(symbol)}`);
//     if (!resPrice.ok) throw new Error('Failed to fetch latest price');
//     const dataPrice = await resPrice.json();
//     priceInput.value = dataPrice.price;
//     calculateAmount();

//   } catch (err) {
//     console.error('Error fetching stock data:', err);
//     errorEl.textContent = `Failed to fetch stock info: ${err.message}`;
//   }
// });


// ------------------------------
// ===== TRADE DOM =====
// ------------------------------
const tradingForm = document.getElementById('trading-form');
const priceInput = document.getElementById('price');
const quantityInput = document.getElementById('quantity');
const amountInput = document.getElementById('amount');
const errorEl = document.getElementById('buy-error');
const chartForm = document.getElementById('chart-form-intraday');
const symbolInput = chartForm.querySelector("input[name='chartSymbol']");
const successMessage = document.querySelector('#create-success');


let currentSymbol = null;

// ------------------------------
// Calculate amount when typing
// ------------------------------
function calculateAmount() {
  const price = parseFloat(priceInput.value) || 0;
  const quantity = parseInt(quantityInput.value) || 0;
  amountInput.value = (price * quantity).toFixed(2);
}
priceInput.addEventListener('input', calculateAmount);
quantityInput.addEventListener('input', calculateAmount);

// ------------------------------
// Generate Chart button: fetch latest price
// ------------------------------
chartForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  const rawSymbol = symbolInput.value.trim();
  const symbol = rawSymbol.split('/')[0];
  if (!symbol) return;

  currentSymbol = symbol; // remember for trading

  console.log('Fetching latest price for:', symbol);

  try {
    // Fetch latest price only
    const resPrice = await fetch(`/stocks/price/${encodeURIComponent(symbol)}`);
    if (!resPrice.ok) throw new Error('Failed to fetch latest price');
    const dataPrice = await resPrice.json();

    // Fill the price input
    priceInput.value = dataPrice.price;
    calculateAmount();

    // You can also trigger your chart rendering here if needed
    console.log(`Updated priceInput for ${symbol}:`, dataPrice.price);

  } catch (err) {
    console.error('Error fetching stock price:', err);
    errorEl.textContent = `Failed to fetch stock price: ${err.message}`;
  }
});

// ------------------------------
// Submit Order button: fetch stock ID on click
// ------------------------------
tradingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
successMessage.textContent = '';

  const symbol = currentSymbol || symbolInput.value.trim();
  if (!symbol) {
    errorEl.textContent = 'Please enter a stock symbol and generate the chart first.';
    return;
  }

  try {
    // 1️⃣ Fetch stock ID when submitting
    const resId = await fetch(`/stocks/id/${encodeURIComponent(symbol)}`);
    if (!resId.ok) throw new Error(`Failed to fetch stock ID for ${symbol}`);
    const dataId = await resId.json();
    const stockId = dataId.stock_id;
    if (!stockId) throw new Error(`Stock ID not found for ${symbol}`);

    // 2️⃣ Validate trade inputs
    const quantity = parseInt(quantityInput.value);
    if (!quantity || quantity <= 0) {
      errorEl.textContent = 'Please enter a valid quantity.';
      return;
    }

    const side = tradingForm.querySelector("input[name='side']:checked").value;
    const orderType = document.getElementById('order-type').value;
    if (!orderType) {
      errorEl.textContent = 'Please select an order type.';
      return;
    }

    // 3️⃣ Submit trade
    if (orderType === 'market') {
      const res = await fetch(`/stocks/buytrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          stockId,
          quantity,
          tradeType: side.toUpperCase() // BUY or SELL
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Trade failed');
      }

      const result = await res.json();
      successMessage.textContent = `${side.toUpperCase()} market order successful!`;
successMessage.classList.remove('hidden'); // in case you hide it with CSS
errorEl.textContent = ''; // clear any previous errors

      console.log('Trade result:', result);
    } 
    // else {
    //   alert('Only market orders are supported for now.');
    // }
updateWalletBalances()
  } catch (err) {
    console.error(err);
    errorEl.textContent = `Trade failed: ${err.message}`;
  }
});





  // ------------------------------
  // ===== TRADE HISTORY DOM =====
  // // ------------------------------
  // const tradesTableBody = document.getElementById('trades-table-body');
  // const tradesErrorDisplay = document.getElementById('trades-error');

  // socket.off('broadcastTradeHistoryUpdate');
  // socket.on('broadcastTradeHistoryUpdate', () => {
  //   console.log('Trade history update received');
  //   loadUserTrades(userId);
  // });

  // function loadUserTrades(userId) {
  //   fetch(`/trade/user-trades?userId=${encodeURIComponent(userId)}`)
  //     .then(res => {
  //       if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching trades'); });
  //       return res.json();
  //     })
  //     .then(data => renderTrades(data.trades))
  //     .catch(err => {
  //       console.error('Error:', err);
  //       tradesErrorDisplay.textContent = err.message;
  //     });
  // }

  // function renderTrades(trades) {
  //   tradesTableBody.innerHTML = '';
  //   if (!trades || trades.length === 0) {
  //     tradesTableBody.innerHTML = `<tr><td colspan="6">No trades found.</td></tr>`;
  //     return;
  //   }
  //   trades.forEach(trade => {
  //     const row = document.createElement('tr');
  //     const tradeDate = new Date(trade.tradeDate).toLocaleString();
  //     const symbol = trade.stock ? trade.stock.symbol : 'N/A';
  //     row.innerHTML = `
  //       <td>${tradeDate}</td>
  //       <td>${symbol}</td>
  //       <td>${trade.tradeType}</td>
  //       <td>${trade.quantity}</td>
  //       <td>${parseFloat(trade.price).toFixed(2)}</td>
  //       <td>${parseFloat(trade.totalAmount).toFixed(2)}</td>
  //     `;
  //     tradesTableBody.appendChild(row);
  //   });
  // }

  // loadUserTrades(userId);
  const tradesTableBody = document.getElementById('trades-table-body');
const tradesErrorDisplay = document.getElementById('trades-error');
const tradesPaginationContainer = document.getElementById('trades-pagination');

socket.off('broadcastTradeHistoryUpdate');
socket.on('broadcastTradeHistoryUpdate', () => {
  console.log('Trade history update received');
  loadUserTrades(userId);
});

const pageSize = 10;  // show 10 rows per page
let currentPage = 1;
let allTrades = [];

function loadUserTrades(userId) {
  fetch(`/trade/user-trades?userId=${encodeURIComponent(userId)}`)
    .then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching trades'); });
      return res.json();
    })
    .then(data => {
      allTrades = data.trades;
      renderTradesPage(currentPage);
      renderPaginationControls();
    })
    .catch(err => {
      console.error('Error:', err);
      tradesErrorDisplay.textContent = err.message;
    });
}

function renderTradesPage(page) {
  tradesTableBody.innerHTML = '';
  if (!allTrades || allTrades.length === 0) {
    tradesTableBody.innerHTML = `<tr><td colspan="6">No trades found.</td></tr>`;
    return;
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const tradesToShow = allTrades.slice(start, end);

  tradesToShow.forEach(trade => {
    const row = document.createElement('tr');
    const tradeDate = new Date(trade.tradeDate).toLocaleString();
    const symbol = trade.stock ? trade.stock.symbol : 'N/A';
    row.innerHTML = `
      <td>${tradeDate}</td>
      <td>${symbol}</td>
      <td>${trade.tradeType}</td>
      <td>${trade.quantity}</td>
      <td>${parseFloat(trade.price).toFixed(2)}</td>
      <td>${parseFloat(trade.totalAmount).toFixed(2)}</td>
    `;
    tradesTableBody.appendChild(row);
  });
}
function renderPaginationControls() {
  tradesPaginationContainer.innerHTML = '';
  tradesPaginationContainer.style.display = 'flex';
  tradesPaginationContainer.style.alignItems = 'center';
  tradesPaginationContainer.style.gap = '8px'; // spacing between buttons and page indicator
  tradesPaginationContainer.style.justifyContent = 'flex-start'; // align everything to the left

  // Ensure at least 1 page
  const totalPages = Math.max(1, Math.ceil(allTrades.length / pageSize));

  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderTradesPage(currentPage);
      renderPaginationControls();
    });
    tradesPaginationContainer.appendChild(prevBtn);
  }

  // Page indicator
  const pageIndicator = document.createElement('span');
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  tradesPaginationContainer.appendChild(pageIndicator);

  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      renderTradesPage(currentPage);
      renderPaginationControls();
    });
    tradesPaginationContainer.appendChild(nextBtn);
  }
}


loadUserTrades(userId);



  // ------------------------------
  // ===== LIMIT ORDER HISTORY DOM =====
  // ------------------------------


//   const limitOrdersTableBody = document.getElementById('limit-orders-table-body');
// const limitOrdersErrorDisplay = document.getElementById('limit-orders-error');

// socket.off('broadcastLimitTradeHistoryUpdate');
// socket.on('broadcastLimitTradeHistoryUpdate', () => {
//   console.log('Limit order history update received');
//   loadUserLimitOrders(userId);
// });

// function loadUserLimitOrders(userId) {
//   fetch(`/trade/user-limit-orders?userId=${encodeURIComponent(userId)}`)
//     .then(res => {
//       if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching limit orders'); });
//       return res.json();
//     })
//     .then(data => renderLimitOrders(data.limitOrders))
//     .catch(err => {
//       console.error('Error:', err);
//       limitOrdersErrorDisplay.textContent = err.message;
//     });
// }

// function renderLimitOrders(limitOrders) {
//   limitOrdersTableBody.innerHTML = '';
//   if (!limitOrders || limitOrders.length === 0) {
//     limitOrdersTableBody.innerHTML = `<tr><td colspan="8">No limit orders found.</td></tr>`;
//     return;
//   }

//   limitOrders.forEach(order => {
//     const orderDate = new Date(order.createdAt).toLocaleString();
//     const symbol = order.stock ? order.stock.symbol : 'N/A';
//     const row = document.createElement('tr');

//     // Add cancel button only for PENDING or DAY orders
//     const canCancel = order.status === 'PENDING' || order.status === 'DAY';
//     const cancelButtonHTML = canCancel 
//       ? `<button class="cancel-limit-btn" data-order-id="${order.id}">Cancel</button>` 
//       : '';

//     row.innerHTML = `
//       <td>${orderDate}</td>
//       <td>${symbol}</td>
//       <td>${order.orderType}</td>
//       <td>${order.quantity}</td>
//       <td>${parseFloat(order.limitPrice).toFixed(2)}</td>
//       <td>${parseFloat(order.limitPrice * order.quantity).toFixed(2)}</td>
//       <td>${order.status}</td>
//       <td>${cancelButtonHTML}</td>
//     `;

//     limitOrdersTableBody.appendChild(row);
//   });

//   // Add click event for cancel buttons
//   document.querySelectorAll('.cancel-limit-btn').forEach(btn => {
//     btn.addEventListener('click', async (e) => {
//       const orderId = btn.dataset.orderId;
//       if (!orderId) return;

    //   try {
    //     const res = await fetch(`/limit/cancel/${orderId}`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ userId })
    //     });

    //     const data = await res.json();
    //     if (!res.ok) throw new Error(data.message || 'Failed to cancel order');

    //     alert(`Order ${orderId} cancelled successfully.`);
    //     loadUserLimitOrders(userId); // Refresh table
    //   } catch (err) {
    //     console.error('Error cancelling order:', err);
    //     alert(`Error: ${err.message}`);
    //   }
    //  });
//   });
// }

// loadUserLimitOrders(userId);
const limitOrdersTableBody = document.getElementById('limit-orders-table-body');
const limitOrdersErrorDisplay = document.getElementById('limit-orders-error');
const limitOrdersPaginationContainer = document.getElementById('limit-orders-pagination');

const cancelPopup = document.querySelector('#cancel-popup');
const confirmYes = document.querySelector('#confirm-yes');
const confirmNo = document.querySelector('#confirm-no');

let currentLimitPage = 1;
let allLimitOrders = [];
let orderId = null;

// ✅ Toast Function
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

// Event delegation for cancel buttons
limitOrdersTableBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('cancel-limit-btn')) {
    orderId = e.target.dataset.orderId;
    cancelPopup.classList.remove('hidden'); // show confirmation popup
  }
});

// Cancel popup buttons
confirmNo.addEventListener('click', () => {
  cancelPopup.classList.add('hidden');
  orderId = null;
});

confirmYes.addEventListener('click', async () => {
  if (!orderId) return;
  cancelPopup.classList.add('hidden');

  try {
    const res = await fetch(`/limit/cancel/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to cancel order');

    // ✅ Success toast
    showToast(`Order ${orderId} cancelled successfully`, 'success');

    loadUserLimitOrders(userId); // Refresh table
  } catch (err) {
    console.error('Error cancelling order:', err);

    // ❌ Error toast
    showToast(`Error: ${err.message}`, 'error');
  }

  orderId = null;
});

// Render a page of limit orders
function renderLimitOrdersPage(page) {
  limitOrdersTableBody.innerHTML = '';

  if (!allLimitOrders || allLimitOrders.length === 0) {
    limitOrdersTableBody.innerHTML = `<tr><td colspan="8">No limit orders found.</td></tr>`;
    return;
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const ordersToShow = allLimitOrders.slice(start, end);

  ordersToShow.forEach(order => {
    const orderDate = new Date(order.createdAt).toLocaleString();
    const symbol = order.stock ? order.stock.symbol : 'N/A';
    const canCancel = order.status === 'PENDING' || order.status === 'DAY';
    const cancelButtonHTML = canCancel
      ? `<button class="cancel-limit-btn" data-order-id="${order.id}">Cancel</button>`
      : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${orderDate}</td>
      <td>${symbol}</td>
      <td>${order.orderType}</td>
      <td>${order.quantity}</td>
      <td>${parseFloat(order.limitPrice).toFixed(2)}</td>
      <td>${parseFloat(order.limitPrice * order.quantity).toFixed(2)}</td>
      <td>${order.status}</td>
      <td>${cancelButtonHTML}</td>
    `;
    limitOrdersTableBody.appendChild(row);
  });
}

// Render pagination buttons
function renderLimitOrdersPagination() {
  limitOrdersPaginationContainer.innerHTML = '';
  limitOrdersPaginationContainer.style.display = 'flex';
  limitOrdersPaginationContainer.style.alignItems = 'center';
  limitOrdersPaginationContainer.style.gap = '8px'; // spacing between buttons and page indicator
  limitOrdersPaginationContainer.style.justifyContent = 'flex-start'; // align everything to the left

  // Ensure at least 1 page
  const totalPages = Math.max(1, Math.ceil(allLimitOrders.length / pageSize));

  // Previous button
  if (currentLimitPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.addEventListener('click', () => {
      currentLimitPage--;
      renderLimitOrdersPage(currentLimitPage);
      renderLimitOrdersPagination();
    });
    limitOrdersPaginationContainer.appendChild(prevBtn);
  }

  // Page indicator
  const pageIndicator = document.createElement('span');
  pageIndicator.textContent = `Page ${currentLimitPage} of ${totalPages}`;
  limitOrdersPaginationContainer.appendChild(pageIndicator);

  // Next button
  if (currentLimitPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => {
      currentLimitPage++;
      renderLimitOrdersPage(currentLimitPage);
      renderLimitOrdersPagination();
    });
    limitOrdersPaginationContainer.appendChild(nextBtn);
  }
}


// Load user limit orders from backend
function loadUserLimitOrders(userId) {
  fetch(`/trade/user-limit-orders?userId=${encodeURIComponent(userId)}`)
    .then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching limit orders'); });
      return res.json();
    })
    .then(data => {
      allLimitOrders = data.limitOrders;
      currentLimitPage = 1;
      renderLimitOrdersPage(currentLimitPage);
      renderLimitOrdersPagination();
    })
    .catch(err => {
      console.error('Error:', err);
      limitOrdersErrorDisplay.textContent = err.message;
    });
}

// Initial load
loadUserLimitOrders(userId);

// Socket listener for live updates
socket.off('broadcastLimitTradeHistoryUpdate');
socket.on('broadcastLimitTradeHistoryUpdate', () => {
  console.log('Limit order history update received');
  loadUserLimitOrders(userId);
});


  // ------------------------------
  // ===== FAVORITE STOCKS DOM =====
  // ------------------------------
  
  const favoriteStocksList = document.getElementById('favorite-stocks');
  const favoritesErrorMessage = document.getElementById('favorites-error-message');
  const FAVORITES_API_URL = '/stocks/favorite-api';

  socket.off('broadcastfavoriteStock');
  socket.on('broadcastfavoriteStock', () => {
    console.log('Favorite stocks update received');
    loadFavoriteStocks(parsedUserId);
  });

  function loadFavoriteStocks(userId) {
    fetch(`${FAVORITES_API_URL}?userId=${encodeURIComponent(userId)}`)
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching favorite stocks'); });
        return res.json();
      })
      .then(data => renderFavoriteStocks(data.favorites))
      .catch(err => {
        console.error('Error loading favorite stocks:', err);
        favoritesErrorMessage.textContent = 'An error occurred while loading your favorite stocks.';
      });
  }

  function renderFavoriteStocks(favorites) {
    favoriteStocksList.innerHTML = '';

    if (!favorites || favorites.length === 0) {
      favoriteStocksList.innerHTML = '<li>No favorite stocks found.</li>';
      return;
    }

    favorites.forEach(favorite => {
      const listItem = document.createElement('li');

      const symbolSpan = document.createElement('span');
      symbolSpan.textContent = favorite.symbol;

      const unfavButton = document.createElement('button');
      unfavButton.textContent = 'Unfavorite';
      unfavButton.style.marginLeft = '10px';
      unfavButton.classList.add('unfav-button');
      unfavButton.addEventListener('click', () => {
        unfavoriteStock(parsedUserId, favorite.symbol);
      });

      listItem.appendChild(symbolSpan);
      listItem.appendChild(unfavButton);
      favoriteStocksList.appendChild(listItem);
    });
  }

  function unfavoriteStock(userId, symbol) {
    fetch(`${FAVORITES_API_URL}?userId=${encodeURIComponent(userId)}&symbol=${encodeURIComponent(symbol)}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error unfavoriting stock'); });
        return res.json();
      })
      .then(() => {
        loadFavoriteStocks(userId);
      })
      .catch(err => {
        console.error('Error unfavoriting stock:', err);
        favoritesErrorMessage.textContent = 'An error occurred while unfavoriting the stock.';
      });
  }

  if (parsedUserId) {
    loadFavoriteStocks(parsedUserId);
  } else {
    favoritesErrorMessage.textContent = 'User not logged in.';
  }
});













//////////////////////////////////////////////////
/////////// Company Detail Card
//////////////////////////////////////////////////




// window.addEventListener('DOMContentLoaded', function () {
//   const symbolInput = document.querySelector("input[name='chartSymbol']");
//   const form = document.querySelector("form");
//   const companyCardContainer = document.querySelector('.company-card');

//   form.addEventListener('submit', function (event) {
//     event.preventDefault();

//     const symbol = symbolInput.value.trim();
//     if (!symbol) {
//       alert('Please enter a stock symbol.');
//       return;
//     }

//     fetch(`/stocks/${symbol}`)
//       .then(response => {
//         if (response.ok) return response.json();
//         return response.json().then(data => {
//           throw new Error(`Error fetching company data: ${data.error}`);
//         });
//       })
//       .then(company => {
//         companyCardContainer.innerHTML = `
//         <div class="company-card-content">
//           <div class="company-logo">
//             ${company.logo ? `<img src="${company.logo}" alt="${company.name} logo" width="100">` : ''}
//           </div>
//           <h2>${company.name} (${company.symbol})</h2>
//           <p><strong>Country:</strong> ${company.country || 'N/A'}</p>
//           <p><strong>Exchange:</strong> ${company.exchange || 'N/A'}</p>
//           <p><strong>Industry:</strong> ${company.industry || 'N/A'}</p>
//           <p><strong>Founded:</strong> ${company.founded || 'N/A'}</p>
//           <p><strong>Market Cap:</strong> ${company.marketCapitalization ? '$' + company.marketCapitalization.toLocaleString() : 'N/A'}</p>
//           <p><strong>Shares Outstanding:</strong> ${company.shareOutstanding ? company.shareOutstanding.toLocaleString() : 'N/A'}</p>
//           <p><strong>Website:</strong> ${company.website ? `<a href="${company.website}" target="_blank">${company.website}</a>` : 'N/A'}</p>
//         </div>
//       `;
//       })
//       .catch(error => {
//         console.error('Error fetching company data:', error);
//         companyCardContainer.innerHTML = `<p>Error: ${error.message}</p>`;
//       });
//   });


// });



window.addEventListener('DOMContentLoaded', function () {
  const symbolInput = document.querySelector("input[name='chartSymbol']");
  const form = document.querySelector("form");
  const companyCardContainer = document.querySelector('.company-card');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const symbol = symbolInput.value.trim();
    if (!symbol) {
      alert('Please enter a stock symbol.');
      return;
    }

    fetch(`/stocks/${symbol}`)
      .then(response => {
        if (response.ok) return response.json();
        return response.json().then(data => {
          throw new Error(`Error fetching data: ${data.error}`);
        });
      })
      .then(data => {
        const { company, stock } = data;

        companyCardContainer.innerHTML = `
          <div class="company-card-content">
            <div class="company-logo">
              ${company.logo ? `<img src="${company.logo}" alt="${company.name} logo" width="100">` : ''}
            </div>
            <h2>${company.name} (${company.symbol})</h2>
            <p><strong>Country:</strong> ${company.country || 'N/A'}</p>
            <p><strong>Exchange:</strong> ${company.exchange || 'N/A'}</p>
            <p><strong>Industry:</strong> ${company.industry || 'N/A'}</p>
            <p><strong>Founded:</strong> ${company.founded || 'N/A'}</p>
            <p><strong>Market Cap:</strong> ${
              company.marketCapitalization
                ? '$' + company.marketCapitalization.toLocaleString()
                : 'N/A'
            }</p>
            <p><strong>Shares Outstanding:</strong> ${
              company.shareOutstanding
                ? company.shareOutstanding.toLocaleString()
                : 'N/A'
            }</p>
            <p><strong>Website:</strong> ${
              company.website
                ? `<a href="${company.website}" target="_blank">${company.website}</a>`
                : 'N/A'
            }</p>


          </div>
        `;
      })
      .catch(error => {
        console.error('Error fetching stock/company data:', error);
        companyCardContainer.innerHTML = `<p>Error: ${error.message}</p>`;
      });
  });
});





// //////////////////////////////////////////////////
// /////////// LIMIT ORDER REALTIME Functionality
// //////////////////////////////////////////////////

window.addEventListener('DOMContentLoaded', function () {
  const tradingForm = document.querySelector('#trading-form');
  const priceInput = document.querySelector('#price');
  const quantityInput = document.querySelector('#quantity');
  const amountInput = document.querySelector('#amount');
  const symbolInput = document.querySelector("input[name='chartSymbol']");
  const orderTypeSelect = document.querySelector('#order-type');
  const timeframeContainer = document.querySelector('#timeframe-container');
  const timeframeSelect = document.querySelector('#timeframe');
  const buyRadio = document.querySelector("input[name='side'][value='buy']");
  const sellRadio = document.querySelector("input[name='side'][value='sell']");
  const submitButton = document.querySelector('#submit-order');
  const errorMessage = document.querySelector('#buy-error');
  const successMessage = document.querySelector('#create-success');


  let latestPrice = 0;

  // Fetch stock ID from backend
  async function fetchStockId(symbol) {
    const res = await fetch(`/stocks/id/${symbol}`);
    if (!res.ok) throw new Error('Failed to fetch stock ID');
    const data = await res.json();
    return data.stock_id;
  }

  // Fetch latest intraday price using stock ID
  async function fetchLatestPrice(symbol) {
    const res = await fetch(`/stocks/price/${symbol}`);
    if (!res.ok) throw new Error('Failed to fetch latest price');
    const data = await res.json();
    latestPrice = parseFloat(data.price);
    priceInput.value = latestPrice;
    calculateAmount();
  }

  function calculateAmount() {
    const price = parseFloat(priceInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    amountInput.value = (price * quantity).toFixed(2);
  }

  // Show/hide timeframe dropdown for Limit Orders
  orderTypeSelect.addEventListener('change', () => {
    if (orderTypeSelect.value === 'limit') {
      timeframeContainer.classList.remove('hidden');
      document.querySelector('#stop-limit-container').classList.remove('hidden');
      document.querySelector('#stop-loss-container').classList.add('hidden');
    } else {
      timeframeContainer.classList.add('hidden');
      document.querySelector('#stop-limit-container').classList.add('hidden');
      document.querySelector('#stop-loss-container').classList.add('hidden');
    }
  });

  async function submitLimitOrder() {
    const userId = localStorage.getItem('userId');
    const symbol = symbolInput.value.trim();
    const price = parseFloat(priceInput.value);
    const quantity = parseInt(quantityInput.value);
    const side = buyRadio.checked ? 'BUY' : 'SELL';
    const timeframe = timeframeSelect.value; // gtc or day
    successMessage.textContent = ''; // clear any previous success messages

    errorMessage.textContent = '';

    if (!userId || !symbol) {
      errorMessage.textContent = 'User or stock symbol not selected.';
      return;
    }

    if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
      errorMessage.textContent = 'Invalid price or quantity.';
      return;
    }

    if (price === latestPrice) {
      errorMessage.textContent = 'Limit order price must differ from the current market price.';
      return;
    }


    try {
      const stockId = await fetchStockId(symbol);

      const res = await fetch('/limit/limit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          stockId,
          quantity,
          limitPrice: price,
          orderType: side, // BUY or SELL
          timeframe       // GTC or DAY
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create limit order');
      }

      const data = await res.json();
      // alert(`${side} limit order created successfully (${timeframe.toUpperCase()})`);

      successMessage.textContent = `${side} limit order created successfully (${timeframe.toUpperCase()})`;
      successMessage.classList.remove('hidden'); // in case you hide it with CSS
      errorMessage.textContent = ''; // clear any previous errors

      tradingForm.reset();
      amountInput.value = '--';
      timeframeContainer.classList.add('hidden');

      // document.querySelector('#stop-limit-container').classList.add('hidden');
      // document.querySelector('#stop-loss-container').classList.add('hidden');
    } catch (err) {
      console.error(err);
      errorMessage.textContent = err.message || 'Error creating limit order.';
    }
  }

  // Submit button handling
  submitButton.addEventListener('click', (e) => {
    if (orderTypeSelect.value === 'limit') {
      // Limit order → stop default and call custom function
      e.preventDefault();
      submitLimitOrder();
    } else {
      // Market order → let the form submit normally
      // (no preventDefault here)
    }
  });

  priceInput.addEventListener('input', calculateAmount);
  quantityInput.addEventListener('input', calculateAmount);

  // Update latest price when symbol changes
  symbolInput.addEventListener('input', () => {
    const symbol = symbolInput.value.trim();
    if (!symbol) return;
    fetchStockId(symbol)
      .then((stockId) => fetchLatestPrice(stockId))
      .catch((err) => console.error('Error fetching stock data:', err));
  });
});

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");


  // -------------------------------
  // USER INFO
  // -------------------------------
  async function fetchUserDetails() {
    if (!userId) return null;
    if (!token) return null;

    try {
      const res = await fetch(`/user/get/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success === false) {
        console.error("Failed to fetch user details:", data.message);
        return null;
      }
      return data.user || data;
    } catch (err) {
      console.error("Error fetching user details:", err);
      return null;
    }
  }
// Utility function to capitalize the first letter of each word in a string.
// This handles multi-word names (e.g., 'john doe' -> 'John Doe').
const capitalizeName = (str) => {
    if (!str) return '';
    // Ensure string is lowercased first, split by space, capitalize each word, and rejoin.
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

async function updateWalletBalances() {
  const user = await fetchUserDetails();
  if (!user || user.wallet === undefined) return;

  const formatted = Number(user.wallet).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Update Stock Dashboard wallet
  const stockWallet = document.getElementById("wallet-balance-stock");
  if (stockWallet) stockWallet.textContent = formatted;

  // Update Options Dashboard wallet
  const optionsWallet = document.getElementById("wallet-balance-options");
  if (optionsWallet) optionsWallet.textContent = formatted;
}


document.addEventListener("DOMContentLoaded", updateWalletBalances);