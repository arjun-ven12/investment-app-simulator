

// import { Chart, registerables } from 'chart.js';
// import zoomPlugin from 'chartjs-plugin-zoom';

// Chart.register(...registerables, zoomPlugin);


window.addEventListener('DOMContentLoaded', function () {
  const symbolInput = document.querySelector("input[name='symbol']");
  const timeFrameSelect = document.querySelector("select[name='timeFrame']"); 
  const form = document.querySelector("form");

  form.addEventListener('submit', function (event) {
      event.preventDefault();

      const symbol = symbolInput.value.trim();
      const timeFrame = timeFrameSelect.value; // Get weekly or monthly

      if (!symbol) {
          alert('Please enter a stock symbol.');
          return;
      }

      fetch(`/chartInvestment/${symbol}?timeFrame=${timeFrame}`)
          .then(function (response) {
              if (response.ok) {
                  return response.json();
              } 
              else {
                  return response.json().then(function (data) {
                      throw new Error(`Error fetching chart data: ${data.error}`);
                  });
             }
          })

          .then(function (chartData) {
              const ctx = document.getElementById('myChart');
              new Chart(ctx, {
                  type: 'line',
                  data: chartData,
                  options: {
                      plugins: {
                          zoom: {
                              pan: {
                                  enabled: true,
                                  mode: 'x',
                              },
                              zoom: {
                                  wheel: {
                                      enabled: true,
                                      speed: 0.1,
                                  },
                                  pinch: {
                                      enabled: true,
                                  },
                                  mode: 'xy',
                                  drag: {
                                      enabled: true,
                                  },
                              },
                          },
                      },
                      responsive: true,
                      scales: {
                          x: {
                              title: { display: true, text: 'Date' },
                          },
                          y: {
                              title: { display: true, text: 'Close Price' },
                          },
                      },
                  },
              });
              alert(`Chart created for ${symbol} (${timeFrame})!`);
          })
          .catch(function (error) {
              console.error('Error creating chart:', error);
            //  alert(`Failed to create chart: ${error.message}`);
          });
  });
});












///////////////////////////////////
/////// CA2
///////////////////////////////////

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
/////////// Limit Order Functionality
//////////////////////////////////////////////////



// window.addEventListener('DOMContentLoaded', function () {
//   const tradingForm = document.querySelector('#trading-form');
//   const priceInput = document.querySelector('#price');
//   const quantityInput = document.querySelector('#quantity');
//   const amountInput = document.querySelector('#amount');
//   const symbolInput = document.querySelector('#symbol');
//   const submitBuyButton = document.querySelector('#limit-submit-buy');
//   const submitSellButton = document.querySelector('#limit-submit-sell');
//   const errorMessage = document.querySelector('#error-message');
//   let latestPrice = 0;

//   function fetchStockId(symbol) {
//     return fetch(`/stocks/id/${symbol}`)
//       .then((response) => {
//         if (!response.ok) throw new Error('Failed to fetch stock ID');
//         return response.json();
//       })
//       .then((data) => data.stock_id);
//   }

//   function fetchLatestPrice(stock_id) {
//     return fetch(`/stocks/price/${stock_id}`)
//       .then((response) => {
//         if (!response.ok) throw new Error('Failed to fetch latest price');
//         return response.json();
//       })
//       .then((data) => {
//         latestPrice = parseFloat(data.price);
//         priceInput.value = latestPrice;
//         calculateAmount();
//       })
//       .catch((error) => {
//         console.error('Error fetching latest price:', error);
//         alert('Could not fetch the latest price for the stock.');
//       });
//   }

//   function calculateAmount() {
//     const price = parseFloat(priceInput.value) || 0;
//     const quantity = parseInt(quantityInput.value) || 0;
//     amountInput.value = (price * quantity).toFixed(2);
//   }

//   // Modified decideTradeType: If the price equals latestPrice, do not create a limit order.
//   function decideTradeType(orderType) {
//     const price = parseFloat(priceInput.value);
//     if (isNaN(price) || price <= 0) {
//       alert('Invalid price entered.');
//       return;
//     }
//     // If the entered price is the same as the latest market price, do not allow a limit order.
//     if (price === latestPrice) {
//       alert('Limit order price must differ from the current market price.');
//       return;
//     }
//     // Proceed with creating a limit order
//     createLimitOrder(orderType);
//   }

//   function createLimitOrder(orderType) {
//     const userId = localStorage.getItem('userId');
//     const symbol = symbolInput.value.trim();
//     const price = parseFloat(priceInput.value);
//     const quantity = parseInt(quantityInput.value);

//     if (!userId || !symbol) {
//       errorMessage.textContent = 'User or stock symbol not selected.';
//       return;
//     }

//     if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
//       errorMessage.textContent = 'Invalid price or quantity.';
//       return;
//     }

//     fetchStockId(symbol)
//       .then((stockId) => {
//         return fetch('/limit/limit-order', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ userId, stockId, quantity, limitPrice: price, orderType }),
//         });
//       })
//       .then((response) => {
//         if (!response.ok) {
//           return response.json().then((data) => {
//             throw new Error(`Error creating limit order: ${data.message}`);
//           });
//         }
//         return response.json();
//       })
//       .then((data) => {
//         alert(`${orderType} limit order created successfully!`);
//         console.log('Limit order created:', data.limitOrder);
//         tradingForm.reset();
//         amountInput.value = '--';
//       })
//       .catch((error) => {
//         console.error('Error creating limit order:', error);
//         errorMessage.textContent = 'Error creating limit order. Please try again later.';
//       });
//   }

//   function processLimitOrders(manualPrice = null) {
//     const symbol = symbolInput.value.trim();
//     const currentPrice = manualPrice !== null ? manualPrice : latestPrice;

//     fetchStockId(symbol)
//       .then((stockId) => {
//         return fetch('/limit/process-limit-orders', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ stockId, currentPrice }),
//         });
//       })
//       .then((response) => {
//         if (!response.ok) {
//           return response.json().then((data) => {
//             throw new Error(`Error processing limit orders: ${data.message}`);
//           });
//         }
//         return response.json();
//       })
//       .then((data) => {
//         alert(`Processed limit orders: ${data.executedOrders.length}`);
//         console.log('Limit orders executed:', data.executedOrders);
//       })
//       .catch((error) => {
//         console.error('Error processing limit orders:', error);
//         errorMessage.textContent = 'Error processing limit orders. Please try again later.';
//       });
//   }

//   function showManualPricePopup() {
//     const manualPrice = prompt('Enter the current price to overwrite limit orders:');
//     const enteredPrice = parseFloat(manualPrice);
//     if (isNaN(enteredPrice) || enteredPrice <= 0) {
//       alert('Please enter a valid price.');
//       return;
//     }
//     processLimitOrders(enteredPrice);
//   }

//   submitBuyButton.addEventListener('click', function () {
//     decideTradeType('BUY');
//   });

//   submitSellButton.addEventListener('click', function () {
//     decideTradeType('SELL');
//   });

//   const processOrdersButton = document.createElement('button');
//   processOrdersButton.textContent = 'Process Limit Orders';
//   processOrdersButton.classList.add('submit-button');
//   processOrdersButton.addEventListener('click', () => processLimitOrders());
//   document.body.appendChild(processOrdersButton);

//   const overwriteOrdersButton = document.createElement('button');
//   overwriteOrdersButton.textContent = 'Overwrite Limit Orders';
//   overwriteOrdersButton.classList.add('submit-button');
//   overwriteOrdersButton.addEventListener('click', showManualPricePopup);
//   document.body.appendChild(overwriteOrdersButton);

//   symbolInput.addEventListener('input', function () {
//     const symbol = symbolInput.value.trim();
//     if (!symbol) return;

//     fetchStockId(symbol)
//       .then((stockId) => fetchLatestPrice(stockId))
//       .catch((error) => {
//         console.error('Error fetching stock data:', error);
//       });
//   });

//   priceInput.addEventListener('input', calculateAmount);
//   quantityInput.addEventListener('input', calculateAmount);
// });




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
      'rgba(0, 255, 0, 0.8)',      // Strong Buy → Green
      'rgba(144, 238, 144, 1)',  // Buy → Light Green
      'rgba(255, 217, 0, 1)',    // Hold → Gold/Yellow
      'rgba(255, 166, 0, 1)',    // Sell → Orange
      'rgba(255, 0, 0, 1)'       // Strong Sell → Red
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
/////////// Retrieve trades Functionality
//////////////////////////////////////////////////



// window.addEventListener('DOMContentLoaded', function () {
// // Assume the logged-in user's ID is stored in localStorage
// const userId = localStorage.getItem('userId'); // e.g., "3"
// const tradesTableBody = document.getElementById('trades-table-body');
// const errorDisplay = document.getElementById('trades-error');

// function loadUserTrades(userId) {
//   fetch(`/trade/user-trades?userId=${encodeURIComponent(userId)}`)
//     .then(response => {
//       if (!response.ok) {
//         return response.json().then(data => { 
//           throw new Error(data.message || "Error fetching trades");
//         });
//       }
//       return response.json();
//     })
//     .then(data => {
//       renderTrades(data.trades);
//     })
//     .catch(error => {
//       console.error("Error:", error);
//       errorDisplay.textContent = error.message;
//     });
// }

// function renderTrades(trades) {
//   tradesTableBody.innerHTML = ""; // Clear previous table rows

//   if (!trades || trades.length === 0) {
//     tradesTableBody.innerHTML = `<tr><td colspan="6">No trades found.</td></tr>`;
//     return;
//   }

//   trades.forEach(trade => {
//     // Create a table row for each trade.
//     // You can customize the columns (e.g., trade date, symbol, quantity, price, totalAmount, tradeType).
//     const row = document.createElement('tr');

//     // Format the date nicely
//     const tradeDate = new Date(trade.tradeDate).toLocaleString();

//     // Use the stock symbol from the included stock data
//     const symbol = trade.stock ? trade.stock.symbol : "N/A";

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

// if (userId) {
//   loadUserTrades(userId);
// } else {
//   errorDisplay.textContent = "User not logged in.";
// }
// });




// window.addEventListener('DOMContentLoaded', function () {
// // Assume the logged-in user's ID is stored in localStorage
// const userId = localStorage.getItem('userId'); // e.g., "3"
// const limitOrdersTableBody = document.getElementById('limit-orders-table-body');
// const errorDisplay = document.getElementById('limit-orders-error');

// function loadUserLimitOrders(userId) {
//   fetch(`/trade/user-limit-orders?userId=${encodeURIComponent(userId)}`)
//     .then(response => {
//       if (!response.ok) {
//         return response.json().then(data => { 
//           throw new Error(data.message || "Error fetching limit orders");
//         });
//       }
//       return response.json();
//     })
//     .then(data => {
//       renderLimitOrders(data.limitOrders);
//     })
//     .catch(error => {
//       console.error("Error:", error);
//       errorDisplay.textContent = error.message;
//     });
// }

// function renderLimitOrders(limitOrders) {
//   limitOrdersTableBody.innerHTML = ""; // Clear previous table rows

//   if (!limitOrders || limitOrders.length === 0) {
//     limitOrdersTableBody.innerHTML = `<tr><td colspan="7">No limit orders found.</td></tr>`;
//     return;
//   }

//   limitOrders.forEach(order => {
//     // Format the date nicely
//     const orderDate = new Date(order.createdAt).toLocaleString();
//     // Use the stock symbol from the included stock data (if available)
//     const symbol = order.stock ? order.stock.symbol : "N/A";
    
//     const row = document.createElement('tr');
//     row.innerHTML = `
//       <td>${orderDate}</td>
//       <td>${symbol}</td>
//       <td>${order.orderType}</td>
//       <td>${order.quantity}</td>
//       <td>${parseFloat(order.limitPrice).toFixed(2)}</td>
//       <td>${parseFloat(order.limitPrice * order.quantity).toFixed(2)}</td>
//       <td>${order.status}</td>
//     `;
//     limitOrdersTableBody.appendChild(row);
//   });
// }

// if (userId) {
//   loadUserLimitOrders(userId);
// } else {
//   errorDisplay.textContent = "User not logged in.";
// }
// });


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



window.addEventListener('DOMContentLoaded', function () {
    const intradayForm = document.getElementById('chart-form-intraday');
    const chartSymbolInput = intradayForm.querySelector("input[name='chartSymbol']");
    const rangeSelect = intradayForm.querySelector("select[name='range']");
    const chartCanvas = document.getElementById('myChart2');
    let intradayChart = null;

    intradayForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const symbolValue = chartSymbolInput.value.trim();
        const rangeValue = rangeSelect.value;

        if (!symbolValue) {
            alert('Please enter a stock symbol.');
            return;
        }

        // Calculate date_from and date_to based on rangeValue
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

        const dateFromStr = dateFrom.toISOString().split('T')[0];
        const dateToStr = now.toISOString().split('T')[0];

        const apiUrl = `/realtime/${encodeURIComponent(symbolValue)}?date_from=${dateFromStr}&date_to=${dateToStr}`;
        console.log('Fetching chart data from URL:', apiUrl);

        fetch(apiUrl)
            .then(response => response.ok ? response.json() : response.json().then(data => { throw new Error(data.error) }))
            .then(chartData => {
                const dataPoints = chartData.labels.map((label, idx) => ({
                    x: new Date(label),
                    y: chartData.datasets[0].data[idx]
                }));

                if (intradayChart) intradayChart.destroy();

                intradayChart = new Chart(chartCanvas, {
                    type: 'line',
                    data: {
                        datasets: [{
                            label: chartData.datasets[0].label,
                            data: dataPoints,
                            borderColor: 'white',
                            backgroundColor: 'white',
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            pointRadius: 2,
                            pointBackgroundColor: 'cyan',
                            pointBorderColor: 'cyan'
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    tooltipFormat: 'MMM dd, yyyy HH:mm',
                                    unit: 'day', // default
                                    minUnit: 'hour'
                                },
                                title: { display: true, text: 'Date', color: 'white' },
                                ticks: { color: 'white', maxRotation: 45, minRotation: 45 },
                                grid: { color: 'rgba(255,255,255,0.2)' }
                            },
                            y: {
                                title: { display: true, text: 'Close Price', color: 'white' },
                                ticks: { color: 'white' },
                                grid: { color: 'rgba(255,255,255,0.2)' }
                            }
                        },
                        plugins: {
                            legend: { labels: { color: 'white' } },
                            zoom: {
                                pan: { enabled: true, mode: 'x' },
                                zoom: {
                                    wheel: { enabled: true },
                                    pinch: { enabled: true },
                                    mode: 'x',
                                    onZoom: ({chart}) => updateTimeUnit(chart)
                                }
                            }
                        }
                    },
                    plugins: [ChartZoom]
                });

                alert(`Chart created for ${symbolValue} (${rangeValue})!`);
            })
            .catch(err => {
                console.error('Error creating chart:', err);
                alert(`Failed to create chart: ${err.message}`);
            });
    });

    function updateTimeUnit(chart) {
        if (!chart.scales.x) return;

        const xScale = chart.scales.x;
        const diffMs = xScale.max - xScale.min;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        let newUnit = 'hour';
        if (diffDays > 730) newUnit = 'month'; // > 2 years
        else if (diffDays > 90) newUnit = 'week';
        else if (diffDays > 2) newUnit = 'day';

        chart.options.scales.x.time.unit = newUnit;
        chart.update('none'); // update chart without animation
    }
});

// window.addEventListener('DOMContentLoaded', function () {
//     const intradayForm = document.getElementById('chart-form-intraday');
//     const chartSymbolInput = intradayForm.querySelector("input[name='chartSymbol']");
//     const rangeSelect = intradayForm.querySelector("select[name='range']");
//     const chartCanvas = document.getElementById('myChart2');
//     let intradayChart = null;

//     // Helper: Determine appropriate time unit for x-axis
//     function getTimeUnit(data) {
//         if (!data || data.length === 0) return 'day';
//         const first = data[0].x;
//         const last = data[data.length - 1].x;
//         const diffMs = last - first;
//         const diffDays = diffMs / (1000 * 60 * 60 * 24);

//         if (diffDays <= 1) return 'hour';
//         if (diffDays <= 7) return 'day';
//         if (diffDays <= 60) return 'week';
//         return 'month';
//     }

//     intradayForm.addEventListener('submit', async function (event) {
//         event.preventDefault();

//         const symbolValue = chartSymbolInput.value.trim();
//         const rangeValue = rangeSelect.value;

//         if (!symbolValue) {
//             alert('Please enter a stock symbol.');
//             return;
//         }

//         const now = new Date();
//         let dateFrom = new Date();
//         switch (rangeValue) {
//             case '1d': dateFrom.setDate(now.getDate() - 1); break;
//             case '1w': dateFrom.setDate(now.getDate() - 7); break;
//             case '1m': dateFrom.setMonth(now.getMonth() - 1); break;
//             case '6m': dateFrom.setMonth(now.getMonth() - 6); break;
//             case '1y': dateFrom.setFullYear(now.getFullYear() - 1); break;
//             case '5y': dateFrom.setFullYear(now.getFullYear() - 5); break;
//             default: dateFrom.setDate(now.getDate() - 7);
//         }

//         const dateFromStr = dateFrom.toISOString().split('T')[0];
//         const dateToStr = now.toISOString().split('T')[0];
//         const apiUrl = `/realtime/${encodeURIComponent(symbolValue)}?date_from=${dateFromStr}&date_to=${dateToStr}`;

//         try {
//             const response = await fetch(apiUrl);
//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to fetch OHLC data');
//             }

//             const ohlcData = await response.json();

//             if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
//                 throw new Error('No OHLC data available for this symbol.');
//             }

//             // Convert to timestamp (ms) for Chart.js financial plugin
//             const formattedData = ohlcData.map(item => ({
//                 x: new Date(item.date).getTime(),  // <-- timestamp in ms
//                 o: item.openPrice,
//                 h: item.highPrice,
//                 l: item.lowPrice,
//                 c: item.closePrice
//             })).sort((a, b) => a.x - b.x);

//             const timeUnit = getTimeUnit(formattedData);

//             if (intradayChart) intradayChart.destroy();

//             intradayChart = new Chart(chartCanvas.getContext('2d'), {
//                 type: 'candlestick',
//                 data: {
//                     datasets: [{
//                         label: `${symbolValue} Candlestick`,
//                         data: formattedData,
//                         color: {
//                             up: '#00c853',
//                             down: '#d50000',
//                             unchanged: '#999'
//                         }
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     scales: {
//                         x: {
//                             type: 'time',
//                             time: { unit: timeUnit, tooltipFormat: 'MMM dd, yyyy HH:mm' },
//                             title: { display: true, text: 'Date', color: 'white' },
//                             ticks: { color: 'white' },
//                             grid: { color: 'rgba(255,255,255,0.2)' }
//                         },
//                         y: {
//                             title: { display: true, text: 'Price', color: 'white' },
//                             ticks: { color: 'white' },
//                             grid: { color: 'rgba(255,255,255,0.2)' }
//                         }
//                     },
//                     plugins: {
//                         legend: { labels: { color: 'white' } },
//                         zoom: {
//                             pan: { enabled: true, mode: 'x' },
//                             zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
//                         }
//                     }
//                 }
//             });

//             alert(`Candlestick chart created for ${symbolValue} (${rangeValue})!`);
//         } catch (err) {
//             console.error('Error creating candlestick chart:', err);
//             alert(`Failed to create candlestick chart: ${err.message}`);
//         }
//     });
// });
























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
  const portfolioContainer = document.querySelector('.trading-card2');

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
    if (!portfolio || portfolio.length === 0) {
      portfolioContainer.innerHTML = `<p>You don't own any stocks yet.</p>`;
      return;
    }

    const stockColumns = portfolio.map(stock => {
      const totalAmountFormatted = parseFloat(stock.totalAmount).toFixed(2);
      return `
        <div class="stock-column">
          <h3>${stock.symbol} (${stock.companyName})</h3>
          <p><strong>Quantity:</strong> ${stock.quantity}</p>
          <p><strong>Total Amount Spent:</strong> $${totalAmountFormatted}</p>
        </div>
      `;
    }).join('');

    portfolioContainer.innerHTML = `
      <h2>Your Portfolio</h2>
      <div class="stock-grid">${stockColumns}</div>
      <canvas id="portfolioPieChart"></canvas>
    `;

    const labels = portfolio.map(stock => stock.symbol);
    const data = portfolio.map(stock => parseFloat(stock.totalAmount));
    const ctx = document.getElementById('portfolioPieChart').getContext('2d');

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40'],
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a,b) => a+b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(2);
                return `${context.label}: $${context.raw} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  fetchPortfolio();

  // ------------------------------
  // ===== TRADE DOM =====
  // ------------------------------
  const priceInput = document.getElementById('price');
  const quantityInput = document.getElementById('quantity');
  const amountInput = document.getElementById('amount');
  const symbolInput = document.querySelector("input[name='chartSymbol']");
  const buyButton = document.getElementById('submit-buy');
  const sellButton = document.getElementById('submit-sell');
  const chartForm = document.getElementById('chart-form-intraday');

  let currentStockId = null;

  function calculateAmount() {
    const price = parseFloat(priceInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    amountInput.value = (price * quantity).toFixed(2);
  }

  async function fetchStockId(symbol) {
    const response = await fetch(`/stocks/id/${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch stock ID');
    const data = await response.json();
    return data.stock_id;
  }

  async function fetchLatestPrice(stockId) {
    const response = await fetch(`/stocks/price/${stockId}`);
    if (!response.ok) throw new Error('Failed to fetch latest price');
    const data = await response.json();
    priceInput.value = data.price;
    calculateAmount();
  }

  async function handleTrade(tradeType) {
    const quantity = parseInt(quantityInput.value);
    const errorEl = document.getElementById('buy-error');
    errorEl.textContent = '';

    if (!currentStockId || !quantity || quantity <= 0) {
      alert('Please enter valid trade details.');
      return;
    }

    try {
      const response = await fetch(`/stocks/buytrade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: parseInt(userId), stockId: currentStockId, quantity, tradeType })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const result = await response.json();
      alert(`${tradeType} trade successful!`);
      console.log('Trade result:', result);
    } catch (err) {
      console.error(err);
      errorEl.textContent = `Failed to complete trade: ${err.message}`;
    }
  }

  buyButton.addEventListener('click', () => handleTrade('BUY'));
  sellButton.addEventListener('click', () => handleTrade('SELL'));

  chartForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const symbol = symbolInput.value.trim();
    if (!symbol) return;
    try {
      currentStockId = await fetchStockId(symbol);
      await fetchLatestPrice(currentStockId);
    } catch (err) {
      console.error('Error fetching stock data:', err);
    }
  });

  priceInput.addEventListener('input', calculateAmount);
  quantityInput.addEventListener('input', calculateAmount);

  // ------------------------------
  // ===== TRADE HISTORY DOM =====
  // ------------------------------
  const tradesTableBody = document.getElementById('trades-table-body');
  const tradesErrorDisplay = document.getElementById('trades-error');

  socket.off('broadcastTradeHistoryUpdate');
  socket.on('broadcastTradeHistoryUpdate', () => {
    console.log('Trade history update received');
    loadUserTrades(userId);
  });

  function loadUserTrades(userId) {
    fetch(`/trade/user-trades?userId=${encodeURIComponent(userId)}`)
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching trades'); });
        return res.json();
      })
      .then(data => renderTrades(data.trades))
      .catch(err => {
        console.error('Error:', err);
        tradesErrorDisplay.textContent = err.message;
      });
  }

  function renderTrades(trades) {
    tradesTableBody.innerHTML = '';
    if (!trades || trades.length === 0) {
      tradesTableBody.innerHTML = `<tr><td colspan="6">No trades found.</td></tr>`;
      return;
    }
    trades.forEach(trade => {
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

  loadUserTrades(userId);

  // ------------------------------
  // ===== LIMIT ORDER HISTORY DOM =====
  // ------------------------------
  const limitOrdersTableBody = document.getElementById('limit-orders-table-body');
  const limitOrdersErrorDisplay = document.getElementById('limit-orders-error');

  socket.off('broadcastLimitTradeHistoryUpdate');
  socket.on('broadcastLimitTradeHistoryUpdate', () => {
    console.log('Limit order history update received');
    loadUserLimitOrders(userId);
  });

  function loadUserLimitOrders(userId) {
    fetch(`/trade/user-limit-orders?userId=${encodeURIComponent(userId)}`)
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Error fetching limit orders'); });
        return res.json();
      })
      .then(data => renderLimitOrders(data.limitOrders))
      .catch(err => {
        console.error('Error:', err);
        limitOrdersErrorDisplay.textContent = err.message;
      });
  }

  function renderLimitOrders(limitOrders) {
    limitOrdersTableBody.innerHTML = '';
    if (!limitOrders || limitOrders.length === 0) {
      limitOrdersTableBody.innerHTML = `<tr><td colspan="7">No limit orders found.</td></tr>`;
      return;
    }
    limitOrders.forEach(order => {
      const orderDate = new Date(order.createdAt).toLocaleString();
      const symbol = order.stock ? order.stock.symbol : 'N/A';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${orderDate}</td>
        <td>${symbol}</td>
        <td>${order.orderType}</td>
        <td>${order.quantity}</td>
        <td>${parseFloat(order.limitPrice).toFixed(2)}</td>
        <td>${parseFloat(order.limitPrice * order.quantity).toFixed(2)}</td>
        <td>${order.status}</td>
      `;
      limitOrdersTableBody.appendChild(row);
    });
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
          <p><strong>Phone:</strong> ${company.phone || 'N/A'}</p>
          <p><strong>Website:</strong> ${company.website ? `<a href="${company.website}" target="_blank">${company.website}</a>` : 'N/A'}</p>
        `;

      })
      .catch(error => {
        console.error('Error fetching company data:', error);
        companyCardContainer.innerHTML = `<p>Error: ${error.message}</p>`;
      });
  });


});








//////////  ////////////////////////////////////////
/////////// LIMIT ORDER REALTIME Functionality
//////////////////////////////////////////////////
window.addEventListener('DOMContentLoaded', function () {
  const tradingForm = document.querySelector('#trading-form');
  const priceInput = document.querySelector('#price');
  const quantityInput = document.querySelector('#quantity');
  const amountInput = document.querySelector('#amount');
  const symbolInput = document.querySelector("input[name='chartSymbol']"); // Updated
  const submitBuyButton = document.querySelector('#limit-submit-buy');
  const submitSellButton = document.querySelector('#limit-submit-sell');
  const errorMessage = document.querySelector('#error-message');
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

  function decideTradeType(orderType) {
    const price = parseFloat(priceInput.value);
    if (isNaN(price) || price <= 0) {
      alert('Invalid price entered.');
      return;
    }

    if (price === latestPrice) {
      alert('Limit order price must differ from the current market price.');
      return;
    }

    createLimitOrder(orderType);
  }

  async function createLimitOrder(orderType) {
    const userId = localStorage.getItem('userId');
    const symbol = symbolInput.value.trim();
    const price = parseFloat(priceInput.value);
    const quantity = parseInt(quantityInput.value);

    if (!userId || !symbol) {
      errorMessage.textContent = 'User or stock symbol not selected.';
      return;
    }

    if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
      errorMessage.textContent = 'Invalid price or quantity.';
      return;
    }

    try {
      const stockId = await fetchStockId(symbol);
      const res = await fetch('/limit/limit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, stockId, quantity, limitPrice: price, orderType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error creating limit order');
      }

      const data = await res.json();
      alert(`${orderType} limit order created successfully!`);
      console.log('Limit order created:', data.limitOrder);
      tradingForm.reset();
      amountInput.value = '--';
    } catch (err) {
      console.error('Error creating limit order:', err);
      errorMessage.textContent = 'Error creating limit order. Please try again later.';
    }
  }

  async function processLimitOrders(manualPrice = null) {
    const symbol = symbolInput.value.trim();
    if (!symbol) return;

    try {
      const stockId = await fetchStockId(symbol);
      const currentPrice = manualPrice !== null ? manualPrice : latestPrice;
      const res = await fetch('/limit/process-limit-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId, currentPrice }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error processing limit orders');
      }

      const data = await res.json();
      alert(`Processed limit orders: ${data.executedOrders.length}`);
      console.log('Limit orders executed:', data.executedOrders);
    } catch (err) {
      console.error('Error processing limit orders:', err);
      errorMessage.textContent = 'Error processing limit orders. Please try again later.';
    }
  }

  function showManualPricePopup() {
    const manualPrice = prompt('Enter the current price to overwrite limit orders:');
    const enteredPrice = parseFloat(manualPrice);
    if (isNaN(enteredPrice) || enteredPrice <= 0) {
      alert('Please enter a valid price.');
      return;
    }
    processLimitOrders(enteredPrice);
  }

  submitBuyButton.addEventListener('click', () => decideTradeType('BUY'));
  submitSellButton.addEventListener('click', () => decideTradeType('SELL'));

  const processOrdersButton = document.createElement('button');
  processOrdersButton.textContent = 'Process Limit Orders';
  processOrdersButton.classList.add('submit-button');
  processOrdersButton.addEventListener('click', () => processLimitOrders());
  document.body.appendChild(processOrdersButton);

  // const overwriteOrdersButton = document.createElement('button');
  // overwriteOrdersButton.textContent = 'Overwrite Limit Orders';
  // overwriteOrdersButton.classList.add('submit-button');
  // overwriteOrdersButton.addEventListener('click', showManualPricePopup);
  // document.body.appendChild(overwriteOrdersButton);

  // Update latest price when symbol changes
  symbolInput.addEventListener('input', () => {
    const symbol = symbolInput.value.trim();
    if (!symbol) return;
    fetchStockId(symbol)
      .then((stockId) => fetchLatestPrice(stockId))
      .catch((err) => console.error('Error fetching stock data:', err));
  });

  priceInput.addEventListener('input', calculateAmount);
  quantityInput.addEventListener('input', calculateAmount);
});
