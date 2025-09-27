

window.currentStockId = null;

////////////////////////////////////////////////////
//////// HTML Frontend Fields
///////////////////////////////////////////////////

function renderPaginationControls() {
  const totalPages = Math.ceil(allTrades.length / pageSize);
  const paginationContainer = document.getElementById('trade-pagination');
  paginationContainer.innerHTML = '';

  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderTradeTablePage(currentPage);
      renderPaginationControls();
    });
    paginationContainer.appendChild(prevBtn);
  }

  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
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
      alert('Please enter a stock name or symbol.');
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
      marketStatusEl.textContent = `Market is ${statusText}${sessionText}`;
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

    const colors = [
      'rgba(224, 235, 255, 0.9)',  // Strong Buy → light accent (#E0EBFF)
      'rgba(180, 200, 230, 0.9)',  // Buy → slightly darker blue
      'rgba(140, 160, 200, 0.9)',  // Hold → medium blue
      'rgba(80, 100, 150, 0.9)',   // Sell → dark blue
      'rgba(40, 50, 80, 0.9)'      // Strong Sell → darkest blue
    ];
    const borderColors = colors.map(c => c.replace('0.7', '1'));

    const datasets = categories.map((cat, i) => ({
      label: cat,
      data: data.map(item => item[cat]),
      backgroundColor: colors[i],
      borderColor: borderColors[i],
      borderWidth: 1
    }));

    if (recommendationChart) recommendationChart.destroy();

    recommendationChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        scales: {
          x: { stacked: false },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Recommendations' }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `${symbolInput.value.toUpperCase()} Recommendations Over Time`
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
    const symbolValue = chartSymbolInput.value.trim();
    const rangeValue = rangeSelect.value;
    const chartType = chartTypeSelect.value;

    if (!symbolValue) { alert('Enter a symbol'); return; }

    const now = new Date();
    let dateFrom = new Date();
    switch(rangeValue) {
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
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch OHLC data');
      const ohlcData = await response.json();
      if (!Array.isArray(ohlcData) || ohlcData.length === 0) throw new Error('No OHLC data');

      const formattedData = ohlcData.map(item => ({
        x: new Date(item.date).getTime(),
        o: item.openPrice,
        h: item.highPrice,
        l: item.lowPrice,
        c: item.closePrice
      })).sort((a, b) => a.x - b.x);

      const timeUnit = getTimeUnit(formattedData);

      // Destroy old chart if exists
      if (intradayChart) {
        intradayChart.destroy();
        intradayChart = null;
      }

      // Clear canvas and fix height
      const ctx = chartCanvas.getContext('2d');
      ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
      //chartCanvas.height = 00;

      // Chart configuration
      let config;
      if (chartType === 'line') {
        config = {
          type: 'line',
          data: {
            labels: formattedData.map(d => new Date(d.x)),
            datasets: [{
              label: `${symbolValue} Close Price`,
              data: formattedData.map(d => d.c),
              borderColor: '#E0EBFF', // line color
              fill: true,
              tension: 0.1,
              backgroundColor: function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
      
                if (!chartArea) {
                  return null; // Chart not fully initialized yet
                }
      
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(143,173,253,0.4)'); // top: semi-transparent, more blue
                gradient.addColorStop(1, 'rgba(143,173,253,0)');   // bottom: fully transparent
                
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
                grid: { color: 'rgba(255,255,255,0.2)' },
                title: { display: true, text: 'Date', color: 'white' }
              },
              y: {
                ticks: { color: 'white' },
                grid: { color: 'rgba(255,255,255,0.2)' },
                title: { display: true, text: 'Price', color: 'white' }
              }
            },
            plugins: { legend: { labels: { color: 'white' } } }
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
            plugins: { legend: { labels: { color: 'white' } } }
          }
        };
      }

      intradayChart = new Chart(ctx, config);

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });


//});







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
  portfolioContainer.innerHTML = '';

  const { openPositions = [], closedPositions = [] } = portfolio;

  if (openPositions.length === 0 && closedPositions.length === 0) {
    portfolioContainer.innerHTML = `<p>You don't own any stocks yet.</p>`;
    return;
  }

  // Open Positions
  const openColumns = openPositions.map(stock => {
    return `
      <div class="stock-column">
        <h3>${stock.symbol} (${stock.companyName})</h3>
        <p><strong>Quantity:</strong> ${stock.quantity}</p>
        <p><strong>Avg Buy Price:</strong> $${parseFloat(stock.avgBuyPrice).toFixed(2)}</p>
        <p><strong>Current Price:</strong> $${parseFloat(stock.currentPrice).toFixed(2)}</p>
        <p><strong>Total Invested:</strong> $${parseFloat(stock.totalInvested).toFixed(2)}</p>
        <p><strong>Current Value:</strong> $${parseFloat(stock.currentValue).toFixed(2)}</p>
        <p><strong>Unrealized P/L:</strong> $${parseFloat(stock.unrealizedProfitLoss).toFixed(2)} (${stock.unrealizedProfitLossPercent})</p>
        <p><strong>Realized P/L:</strong> $${parseFloat(stock.realizedProfitLoss).toFixed(2)}</p>
      </div>
    `;
  }).join('');

  // Closed Positions
const closedColumns = closedPositions.map(stock => {
  return `
    <div class="stock-column closed">
      <h3>${stock.symbol} (${stock.companyName})</h3>
      <p><strong>Total Bought Qty:</strong> ${stock.totalBoughtQty}</p>
      <p><strong>Total Bought Value:</strong> $${parseFloat(stock.totalBoughtValue).toFixed(2)}</p>
      <p><strong>Total Sold Value:</strong> $${parseFloat(stock.totalSoldValue).toFixed(2)}</p>
      <p><strong>Realized P/L:</strong> $${parseFloat(stock.realizedProfitLoss).toFixed(2)}</p>
    </div>
  `;
}).join('');


portfolioContainer.innerHTML = `
  <h1>Your Portfolio</h1>
  <div class="portfolio-layout">
    <div class="positions-section">
      ${openPositions.length ? `<h2>Open Positions</h2><div class="stock-grid">${openColumns}</div>` : ''}
      ${closedPositions.length ? `<h2>Closed Positions</h2><div class="stock-grid">${closedColumns}</div>` : ''}
    </div>
    ${openPositions.length ? `
      <div class="portfolio-chart-container">
        <canvas id="portfolioPieChart"></canvas>
      </div>` : ''}
  </div>
`;


  // Pie chart only for open positions
  if (openPositions.length > 0) {
    if (portfolioChart) portfolioChart.destroy();

    const labels = openPositions.map(stock => stock.symbol);
    const data = openPositions.map(stock => parseFloat(stock.totalInvested));
    const ctx = document.getElementById('portfolioPieChart').getContext('2d');

    portfolioChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#E0EBFF', '#A3C1FF', '#7993FF', '#5368A6', '#2A3C6B', '#0D1A33'],
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
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

fetchPortfolio();





// ------------------------------
// ===== TRADE DOM =====
// ------------------------------
const tradingForm = document.getElementById('trading-form');
const priceInput = document.getElementById('price');
const quantityInput = document.getElementById('quantity');
const amountInput = document.getElementById('amount');
const errorEl = document.getElementById('buy-error');

let currentStockId = null; // Should be set when chart is generated

// Recalculate amount
function calculateAmount() {
  const price = parseFloat(priceInput.value) || 0;
  const quantity = parseInt(quantityInput.value) || 0;
  amountInput.value = (price * quantity).toFixed(2);
}
priceInput.addEventListener('input', calculateAmount);
quantityInput.addEventListener('input', calculateAmount);

// Trade form submit
tradingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  // Ensure stock ID is already set from chart form
  if (!currentStockId) return;

  const quantity = parseInt(quantityInput.value);
  if (!quantity || quantity <= 0) return;

  const side = tradingForm.querySelector("input[name='side']:checked").value;
  const orderType = document.getElementById('order-type').value;
  if (!orderType) return;

  // Only submit if Market Order is selected
  if (orderType === 'market') {
    try {
      const res = await fetch(`/stocks/buytrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          stockId: currentStockId,
          quantity,
          tradeType: side.toUpperCase() // BUY or SELL
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Trade failed');
      }
      const result = await res.json();
      alert(`${side.toUpperCase()} market order successful!`);
      console.log('Trade result:', result);
    } catch (err) {
      console.error(err);
      errorEl.textContent = `Failed to complete trade: ${err.message}`;
    }
  }
});

  // -------------------------
  // Chart form: fetch stock ID and price
  // -------------------------
  const chartForm = document.getElementById('chart-form-intraday');
  const symbolInput = chartForm.querySelector("input[name='chartSymbol']");
  chartForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const symbol = symbolInput.value.trim();
    if (!symbol) return;

    try {
      // Fetch stock ID
      const resId = await fetch(`/stocks/id/${symbol}`);
      if (!resId.ok) throw new Error('Failed to fetch stock ID');
      const dataId = await resId.json();
      currentStockId = dataId.stock_id;
      window.currentStockId = dataId.stock_id;


      // Fetch latest price
      const resPrice = await fetch(`/stocks/price/${currentStockId}`);
      if (!resPrice.ok) throw new Error('Failed to fetch latest price');
      const dataPrice = await resPrice.json();
      priceInput.value = dataPrice.price;
      calculateAmount();
    } catch (err) {
      console.error('Error fetching stock data:', err);
      errorEl.textContent = `Failed to fetch stock info: ${err.message}`;
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
  const totalPages = Math.ceil(allTrades.length / pageSize);

  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderTradesPage(currentPage);
      renderPaginationControls();
    });
    tradesPaginationContainer.appendChild(prevBtn);
  }

  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      renderTradesPage(currentPage);
      renderPaginationControls();
    });
    tradesPaginationContainer.appendChild(nextBtn);
  }

  const pageIndicator = document.createElement('span');
  pageIndicator.textContent = ` Page ${currentPage} of ${totalPages} `;
  tradesPaginationContainer.appendChild(pageIndicator);
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

//       try {
//         const res = await fetch(`/limit/cancel/${orderId}`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ userId })
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data.message || 'Failed to cancel order');

//         alert(`Order ${orderId} cancelled successfully.`);
//         loadUserLimitOrders(userId); // Refresh table
//       } catch (err) {
//         console.error('Error cancelling order:', err);
//         alert(`Error: ${err.message}`);
//       }
//     });
//   });
// }

// loadUserLimitOrders(userId);
const limitOrdersTableBody = document.getElementById('limit-orders-table-body');
const limitOrdersErrorDisplay = document.getElementById('limit-orders-error');
const limitOrdersPaginationContainer = document.getElementById('limit-orders-pagination');

socket.off('broadcastLimitTradeHistoryUpdate');
socket.on('broadcastLimitTradeHistoryUpdate', () => {
  console.log('Limit order history update received');
  loadUserLimitOrders(userId);
});

// const pageSize = 10;  // 10 rows per page
let currentLimitPage = 1;
let allLimitOrders = [];

function loadUserLimitOrders(userId) {
  fetch(`/trade/user-limit-orders?userId=${encodeURIComponent(userId)}`)
    .then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching limit orders'); });
      return res.json();
    })
    .then(data => {
      allLimitOrders = data.limitOrders;
      renderLimitOrdersPage(currentLimitPage);
      renderLimitOrdersPagination();
    })
    .catch(err => {
      console.error('Error:', err);
      limitOrdersErrorDisplay.textContent = err.message;
    });
}

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
    const row = document.createElement('tr');

    // Add cancel button only for PENDING or DAY orders
    const canCancel = order.status === 'PENDING' || order.status === 'DAY';
    const cancelButtonHTML = canCancel 
      ? `<button class="cancel-limit-btn" data-order-id="${order.id}">Cancel</button>` 
      : '';

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

  // Add click event for cancel buttons
  document.querySelectorAll('.cancel-limit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const orderId = btn.dataset.orderId;
      if (!orderId) return;

      try {
        const res = await fetch(`/limit/cancel/${orderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to cancel order');

        alert(`Order ${orderId} cancelled successfully.`);
        loadUserLimitOrders(userId); // Refresh table
      } catch (err) {
        console.error('Error cancelling order:', err);
        alert(`Error: ${err.message}`);
      }
    });
  });
}

function renderLimitOrdersPagination() {
  limitOrdersPaginationContainer.innerHTML = '';
  const totalPages = Math.ceil(allLimitOrders.length / pageSize);

  if (currentLimitPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.addEventListener('click', () => {
      currentLimitPage--;
      renderLimitOrdersPage(currentLimitPage);
      renderLimitOrdersPagination();
    });
    limitOrdersPaginationContainer.appendChild(prevBtn);
  }

  if (currentLimitPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', () => {
      currentLimitPage++;
      renderLimitOrdersPage(currentLimitPage);
      renderLimitOrdersPagination();
    });
    limitOrdersPaginationContainer.appendChild(nextBtn);
  }

  const pageIndicator = document.createElement('span');
  pageIndicator.textContent = ` Page ${currentLimitPage} of ${totalPages} `;
  limitOrdersPaginationContainer.appendChild(pageIndicator);
}

loadUserLimitOrders(userId);



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
          throw new Error(`Error fetching company data: ${data.error}`);
        });
      })
      .then(company => {
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
          <p><strong>Market Cap:</strong> ${company.marketCapitalization ? '$' + company.marketCapitalization.toLocaleString() : 'N/A'}</p>
          <p><strong>Shares Outstanding:</strong> ${company.shareOutstanding ? company.shareOutstanding.toLocaleString() : 'N/A'}</p>
          <p><strong>Website:</strong> ${company.website ? `<a href="${company.website}" target="_blank">${company.website}</a>` : 'N/A'}</p>
        </div>
      `;
      })
      .catch(error => {
        console.error('Error fetching company data:', error);
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

  let latestPrice = 0;

  // Fetch stock ID from backend
  async function fetchStockId(symbol) {
    const res = await fetch(`/stocks/id/${symbol}`);
    if (!res.ok) throw new Error('Failed to fetch stock ID');
    const data = await res.json();
    return data.stock_id;
  }

  // Fetch latest intraday price using stock ID
  async function fetchLatestPrice(stockId) {
    const res = await fetch(`/stocks/price/${stockId}`);
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
      alert(`${side} limit order created successfully (${timeframe.toUpperCase()})`);
      tradingForm.reset();
      amountInput.value = '--';
      timeframeContainer.classList.add('hidden');
      document.querySelector('#stop-limit-container').classList.add('hidden');
      document.querySelector('#stop-loss-container').classList.add('hidden');
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
