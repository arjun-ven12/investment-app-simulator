
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





window.addEventListener('DOMContentLoaded', function () {
  const symbolInput = document.querySelector("input[name='symbol']");
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
          .then(function (response) {
              if (response.ok) {
                  return response.json();
              } else {     
                  return response.json().then(function (data) {
                      throw new Error(`Error fetching company data: ${data.error}`);
                  });
              }
          })
          .then(function (company) {
              companyCardContainer.innerHTML = `
                  <h2>${company.name} (${company.symbol})</h2>
                  <p><strong>Founded:</strong> ${company.founded}</p>
                  <p><strong>Employees:</strong> ${company.employees}</p>
                  <p><strong>Address:</strong> ${company.address}, ${company.city}, ${company.country} ${company.zipCode}</p>
                  <p><strong>Phone:</strong> ${company.phone}</p>
                  <p><strong>Website:</strong> <a href="${company.website}" target="_blank">${company.website}</a></p>
                  <p><strong>Description:</strong> ${company.description}</p>
              `;
          })
          .catch(function (error) {
              console.error('Error fetching company data:', error);
              companyCardContainer.innerHTML = `<p>Error: ${error.message}</p>`;
          });
  });
});







window.addEventListener('DOMContentLoaded', function () {
  const priceInput = document.getElementById('price');
  const quantityInput = document.getElementById('quantity');
  const amountInput = document.getElementById('amount');
  const symbolInput = document.getElementById('symbol');
  const buyButton = document.getElementById('submit-buy');
  const sellButton = document.getElementById('submit-sell');

  function fetchStockId(symbol) {
      return fetch(`/stocks/id/${symbol}`)
          .then((response) => {
              if (!response.ok) throw new Error('Failed to fetch stock ID');
              return response.json();
          })
          .then((data) => data.stock_id);
  }

  function fetchLatestPrice(stock_id) {
      fetch(`/stocks/price/${stock_id}`)
          .then((response) => {
              if (!response.ok) throw new Error('Failed to fetch latest price');
              return response.json();
          })
          .then((data) => {
              priceInput.value = data.price;
              calculateAmount();
          })
          .catch((error) => {
              console.error('Error fetching latest price:', error);
              alert('Could not fetch the latest price for the stock.');
          });
  }

  function calculateAmount() {
      const price = parseFloat(priceInput.value) || 0;
      const quantity = parseInt(quantityInput.value) || 0;
      amountInput.value = (price * quantity).toFixed(2);
  }

  // Function to handle trades (Buy or Sell)
  function handleTrade(tradeType) {
      const price = parseFloat(priceInput.value);
      const quantity = parseInt(quantityInput.value);
      const symbol = symbolInput.value.trim();
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const errorEl = document.getElementById('buy-error');
      errorEl.textContent = '';


      if (!symbol || !price || !quantity || quantity <= 0) {
          alert('Please enter valid trade details.');
          return;
      }

      if (!token) {
          alert('User is not authenticated. Please log in.');
          return;
      }

      fetchStockId(symbol)
          .then((stock_id) => {
              return fetch(`/stocks/buytrade`, {
                  method: 'POST',
                  headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      userId: parseInt(userId),
                      stockId: stock_id,
                      quantity: quantity,
                      price: price,
                      tradeType: tradeType,
                  }),
              });
          })
          .then((response) => {
              if (!response.ok) {
                  return response.json().then((data) => {
                      throw new Error(data.error);
                  });
              }
              return response.json();
          })
          .then(() => {
              alert(`${tradeType} trade successful!`);
          })
          .catch((error) => {
              console.error('Error during trade:', error);
              errorEl.textContent = `Failed to complete trade: ${error.message}`;
            //  alert(`Failed to complete trade: ${error.message}`);
          });
  }

  // Event listeners for buy and sell buttons
  buyButton.addEventListener('click', () => handleTrade('BUY'));
  sellButton.addEventListener('click', () => handleTrade('SELL'));

  symbolInput.addEventListener('input', function () {
      const symbol = symbolInput.value.trim();
      if (!symbol) return;

      fetchStockId(symbol)
          .then((stock_id) => fetchLatestPrice(stock_id))
          .catch((error) => {
              console.error('Error fetching stock data:', error);
          });
  });

  priceInput.addEventListener('input', calculateAmount);
  quantityInput.addEventListener('input', calculateAmount);
});









window.addEventListener('DOMContentLoaded', function () {
  const portfolioContainer = document.querySelector('.trading-card2');

  const userId = localStorage.getItem('userId');
  if (!userId) {
      portfolioContainer.innerHTML = `<p>Error: User ID not found in local storage.</p>`;
      return;
  }


  // Fetch portfolio data
  fetch(`/stocks/portfolio/${userId}`)
      .then(function (response) {
          if (response.ok) {
              return response.json();
          } else {
              return response.json().then(function (data) {
                  throw new Error(`Error fetching portfolio data: ${data.error}`);
              });
          }
      })
      .then(function (portfolio) {
          if (!portfolio || portfolio.length === 0) {
              portfolioContainer.innerHTML = `<p>You don't own any stocks yet.</p>`;
              return;
          }

          // Generate stock list
          const stockColumns = portfolio
              .map((stock) => {
                  const totalAmountFormatted = parseFloat(stock.totalAmount).toFixed(2);
                  return `
                      <div class="stock-column">
                          <h3>${stock.symbol} (${stock.companyName})</h3>
                          <p><strong>Quantity:</strong> ${stock.quantity}</p>
                          <p><strong>Total Amount Spent:</strong> $${totalAmountFormatted}</p>
                      </div>
                  `;
              })
              .join('');

          // Add stock list and pie chart container
          portfolioContainer.innerHTML = `
              <h2>Your Portfolio</h2>
              <div class="stock-grid">
                  ${stockColumns}
              </div>
              <canvas id="portfolioPieChart"></canvas>
          `;

          const labels = portfolio.map((stock) => stock.symbol);
          const data = portfolio.map((stock) => parseFloat(stock.totalAmount));

          // Create pie chart
          const ctx = document.getElementById('portfolioPieChart').getContext('2d');
          new Chart(ctx, {
              type: 'pie',
              data: {
                  labels,
                  datasets: [
                      {
                          data,
                          backgroundColor: [
                              '#FF6384',
                              '#36A2EB',
                              '#FFCE56',
                              '#4BC0C0',
                              '#9966FF',
                              '#FF9F40',
                          ],
                          hoverOffset: 4,
                      },
                  ],
              },
              options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                      legend: {
                          position: 'top',
                      },
                      tooltip: {
                          callbacks: {
                              label: function (context) {
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = ((context.raw / total) * 100).toFixed(2);
                                  return `${context.label}: $${context.raw} (${percentage}%)`;
                              },
                          },
                      },
                  },
              },
          });
      })
      .catch(function (error) {
          console.error('Error fetching portfolio data:', error);
          portfolioContainer.innerHTML = `<p>Error: ${error.message}</p>`;
      });
});






window.addEventListener('DOMContentLoaded', function () {
  const stocksContainer = document.querySelector('#stocks-container');
  const errorMessage = document.querySelector('#error-message');

  // Function to fetch and display all favorite stocks
  function fetchAllStocksFavorite() {
      const userId = localStorage.getItem('userId'); 
      if (!userId) {
          errorMessage.textContent = 'User not logged in.';
          return;
      }

      fetch(`/stocks/favorite?userId=${userId}`) 
          .then(function (response) {
              if (response.ok) {
                  return response.json();
              } else {
                  return response.json().then(function (data) {
                      throw new Error(`Error fetching stock data: ${data.error}`);
                  });
              }
          })
          .then(function (stocks) {

              if (stocks.length === 0) {
                  errorMessage.textContent = "No favorite stocks found.";
              } else {
                  errorMessage.textContent = ''; 
                  stocksContainer.innerHTML = ''; 
                  stocks.forEach(function (stock) {
                      const stockCard = document.createElement('div');
                      stockCard.className = 'stock-card';
                      stockCard.innerHTML = `
                          <h4>${stock.symbol}</h4>
                          <button class="favorite-btn" data-stock-id="${stock.stock_id}">
                              ${stock.isFavorite ? '❤️' : '♡'}
                          </button>
                      `;
                      stocksContainer.appendChild(stockCard);
                  });

                  // Add event listeners to the favorite buttons
                  document.querySelectorAll('.favorite-btn').forEach(function (btn) {
                      btn.addEventListener('click', function () {
                          const stockId = this.getAttribute('data-stock-id');
                          toggleFavorite(stockId, this);
                      });
                  });
              }
          })
          .catch(function (error) {
              console.error('Error:', error);
              errorMessage.textContent = 'Error fetching stock data. Please try again later.';
          });
  }

  // Function to toggle favorite status
  function toggleFavorite(stockId, button) {
      const userId = localStorage.getItem('userId'); 

      if (!userId) {
          errorMessage.textContent = 'User not logged in.';
          return;
      }

      fetch(`/stocks/favorite/${stockId}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }), 
      })
          .then(function (response) {
              if (response.ok) {
                  return response.json();
              } else {
                  return response.json().then(function (data) {
                      throw new Error(`Error updating favorite status: ${data.error}`);
                  });
              }
          })
          .then(function (result) {
              if (result.success) {
                  button.textContent = button.textContent === '♡' ? '❤️' : '♡';
                  fetchAllStocksFavorite(); // Refresh the stock list
              }
          })
          .catch(function (error) {
              console.error('Error:', error);
              errorMessage.textContent = 'Error updating favorite status. Please try again later.';
          });
  }

  fetchAllStocksFavorite();
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

    fetch(`${SEARCH_API_URL}?query=${encodeURIComponent(query)}`)
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
          alert(result.success ? 'Stock favorited!' : 'Failed to favorite stock.');
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




window.addEventListener('DOMContentLoaded', function () {
  // Assume you have the logged-in user's ID stored (adjust as needed)
  const userIdin = localStorage.getItem('userId'); // e.g., "3"
  const parsedUserId = parseInt(userIdin);

  // DOM elements
  const favoriteStocksList = document.getElementById('favorite-stocks');
  const errorMessage = document.getElementById('favorites-error-message');
  
  // API endpoint for retrieving (and modifying) favorite stocks
  const FAVORITES_API_URL = '/stocks/favorite-api';
  
  // Function to load favorite stocks
  function loadFavoriteStocks(userId) {
    fetch(`${FAVORITES_API_URL}?userId=${encodeURIComponent(userId)}`)
      .then(function (response) {
        if (response.ok) {
          return response.json();
        } else {
          return response.json().then(function (data) {
            throw new Error(data.message || 'Error fetching favorite stocks.');
          });
        }
      })
      .then(function (data) {
        renderFavoriteStocks(data.favorites);
      })
      .catch(function (error) {
        console.error('Error loading favorite stocks:', error);
        errorMessage.textContent = 'An error occurred while loading your favorite stocks.';
      });
  }
  
  // Function to render the favorite stocks list with an unfavorite option
  function renderFavoriteStocks(favorites) {
    favoriteStocksList.innerHTML = ''; // Clear previous list
  
    if (!favorites || favorites.length === 0) {
      favoriteStocksList.innerHTML = '<li>No favorite stocks found.</li>';
      return;
    }
  
    favorites.forEach(function (favorite) {
      const listItem = document.createElement('li');
      
      // Create a span to display the stock symbol
      const symbolSpan = document.createElement('span');
      symbolSpan.textContent = favorite.symbol;
      
      // Create an "Unfavorite" button
      const unfavButton = document.createElement('button');
      unfavButton.textContent = 'Unfavorite';
      unfavButton.style.marginLeft = '10px';
      unfavButton.classList.add('unfav-button');
      unfavButton.addEventListener('click', function () {
          
        unfavoriteStock(parsedUserId, favorite.symbol);
      });
      
      // Append the symbol and button to the list item
      listItem.appendChild(symbolSpan);
      listItem.appendChild(unfavButton);
      favoriteStocksList.appendChild(listItem);
    });
  }
  
  // Function to unfavorite a stock
  function unfavoriteStock(userId, symbol) {
    fetch(`${FAVORITES_API_URL}?userId=${encodeURIComponent(userId)}&symbol=${encodeURIComponent(symbol)}`, {
      method: 'DELETE'
    })
    .then(function (response) {
      if (response.ok) {
        return response.json();
      } else {
        return response.json().then(function (data) {
          throw new Error(data.message || 'Error unfavoriting stock.');
        });
      }
    })
    .then(function (result) {
      // Refresh the favorites list after successfully unfavoriting
      loadFavoriteStocks(userId);
    })
    .catch(function (error) {
      console.error('Error unfavoriting stock:', error);
      errorMessage.textContent = 'An error occurred while unfavoriting the stock.';
    });
  }
  
  // Load the favorites if the user is logged in
  if (parsedUserId) {
    loadFavoriteStocks(parsedUserId);
  } else {
    errorMessage.textContent = 'User not logged in.';
  }
});




//////////////////////////////////////////////////
/////////// Limit Order Functionality
//////////////////////////////////////////////////



window.addEventListener('DOMContentLoaded', function () {
  const tradingForm = document.querySelector('#trading-form');
  const priceInput = document.querySelector('#price');
  const quantityInput = document.querySelector('#quantity');
  const amountInput = document.querySelector('#amount');
  const symbolInput = document.querySelector('#symbol');
  const submitBuyButton = document.querySelector('#limit-submit-buy');
  const submitSellButton = document.querySelector('#limit-submit-sell');
  const errorMessage = document.querySelector('#error-message');
  let latestPrice = 0;

  function fetchStockId(symbol) {
    return fetch(`/stocks/id/${symbol}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch stock ID');
        return response.json();
      })
      .then((data) => data.stock_id);
  }

  function fetchLatestPrice(stock_id) {
    return fetch(`/stocks/price/${stock_id}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch latest price');
        return response.json();
      })
      .then((data) => {
        latestPrice = parseFloat(data.price);
        priceInput.value = latestPrice;
        calculateAmount();
      })
      .catch((error) => {
        console.error('Error fetching latest price:', error);
        alert('Could not fetch the latest price for the stock.');
      });
  }

  function calculateAmount() {
    const price = parseFloat(priceInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    amountInput.value = (price * quantity).toFixed(2);
  }

  // Modified decideTradeType: If the price equals latestPrice, do not create a limit order.
  function decideTradeType(orderType) {
    const price = parseFloat(priceInput.value);
    if (isNaN(price) || price <= 0) {
      alert('Invalid price entered.');
      return;
    }
    // If the entered price is the same as the latest market price, do not allow a limit order.
    if (price === latestPrice) {
      alert('Limit order price must differ from the current market price.');
      return;
    }
    // Proceed with creating a limit order
    createLimitOrder(orderType);
  }

  function createLimitOrder(orderType) {
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

    fetchStockId(symbol)
      .then((stockId) => {
        return fetch('/limit/limit-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, stockId, quantity, limitPrice: price, orderType }),
        });
      })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(`Error creating limit order: ${data.message}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        alert(`${orderType} limit order created successfully!`);
        console.log('Limit order created:', data.limitOrder);
        tradingForm.reset();
        amountInput.value = '--';
      })
      .catch((error) => {
        console.error('Error creating limit order:', error);
        errorMessage.textContent = 'Error creating limit order. Please try again later.';
      });
  }

  function processLimitOrders(manualPrice = null) {
    const symbol = symbolInput.value.trim();
    const currentPrice = manualPrice !== null ? manualPrice : latestPrice;

    fetchStockId(symbol)
      .then((stockId) => {
        return fetch('/limit/process-limit-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockId, currentPrice }),
        });
      })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(`Error processing limit orders: ${data.message}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        alert(`Processed limit orders: ${data.executedOrders.length}`);
        console.log('Limit orders executed:', data.executedOrders);
      })
      .catch((error) => {
        console.error('Error processing limit orders:', error);
        errorMessage.textContent = 'Error processing limit orders. Please try again later.';
      });
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

  submitBuyButton.addEventListener('click', function () {
    decideTradeType('BUY');
  });

  submitSellButton.addEventListener('click', function () {
    decideTradeType('SELL');
  });

  const processOrdersButton = document.createElement('button');
  processOrdersButton.textContent = 'Process Limit Orders';
  processOrdersButton.classList.add('submit-button');
  processOrdersButton.addEventListener('click', () => processLimitOrders());
  document.body.appendChild(processOrdersButton);

  const overwriteOrdersButton = document.createElement('button');
  overwriteOrdersButton.textContent = 'Overwrite Limit Orders';
  overwriteOrdersButton.classList.add('submit-button');
  overwriteOrdersButton.addEventListener('click', showManualPricePopup);
  document.body.appendChild(overwriteOrdersButton);

  symbolInput.addEventListener('input', function () {
    const symbol = symbolInput.value.trim();
    if (!symbol) return;

    fetchStockId(symbol)
      .then((stockId) => fetchLatestPrice(stockId))
      .catch((error) => {
        console.error('Error fetching stock data:', error);
      });
  });

  priceInput.addEventListener('input', calculateAmount);
  quantityInput.addEventListener('input', calculateAmount);
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
const symbolInput = document.getElementById('symbol');
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
      // Data is an array of recommendation objects.
      // Perform additional data manipulation:
      const manipulatedData = data.map(item => {
        // Calculate total recommendations for the period
        const total = item.strongBuy + item.buy + item.hold + item.sell + item.strongSell;
        // Calculate percentage breakdown (as strings formatted to 1 decimal)
        const percentages = {
          strongBuy: total > 0 ? ((item.strongBuy / total) * 100).toFixed(1) : "0.0",
          buy: total > 0 ? ((item.buy / total) * 100).toFixed(1) : "0.0",
          hold: total > 0 ? ((item.hold / total) * 100).toFixed(1) : "0.0",
          sell: total > 0 ? ((item.sell / total) * 100).toFixed(1) : "0.0",
          strongSell: total > 0 ? ((item.strongSell / total) * 100).toFixed(1) : "0.0",
        };
        return { ...item, totalRecommendations: total, percentages };
      });

      console.log("Manipulated Recommendation Data:", manipulatedData);
      renderChart(manipulatedData); // Pass manipulated data to the chart.
    })
    .catch(error => {
      console.error("Error:", error);
      errorDisplay.textContent = error.message;
    });
}

// Function to render the chart using Chart.js
function renderChart(data) {
  // Prepare labels (the periods) and datasets for each recommendation category.
  const labels = data.map(item => item.period);
  const categories = ['strongBuy', 'buy', 'hold', 'sell', 'strongSell'];

  const datasets = categories.map((cat, index) => ({
    label: cat,
    data: data.map(item => item[cat]),
    backgroundColor: [
      'rgba(75, 192, 192, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(153, 102, 255, 0.7)'
    ][index],
    borderColor: [
      'rgba(75, 192, 192, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(153, 102, 255, 1)'
    ][index],
    borderWidth: 1
  }));

  // If a chart already exists, destroy it before creating a new one.
  if (recommendationChart) {
    recommendationChart.destroy();
  }

  recommendationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
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
              const index = context.dataIndex;
              const category = context.dataset.label;
              const rawValue = context.raw;
              const total = data[index].totalRecommendations;
              const percentage = data[index].percentages[category];
              return `${category}: ${rawValue} (${percentage}% of ${total})`;
            }
          }
        }
      }
    }
  });
}

// Automatically load recommendations when the symbol input changes.
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



window.addEventListener('DOMContentLoaded', function () {
// Assume the logged-in user's ID is stored in localStorage
const userId = localStorage.getItem('userId'); // e.g., "3"
const tradesTableBody = document.getElementById('trades-table-body');
const errorDisplay = document.getElementById('trades-error');

function loadUserTrades(userId) {
  fetch(`/trade/user-trades?userId=${encodeURIComponent(userId)}`)
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => { 
          throw new Error(data.message || "Error fetching trades");
        });
      }
      return response.json();
    })
    .then(data => {
      renderTrades(data.trades);
    })
    .catch(error => {
      console.error("Error:", error);
      errorDisplay.textContent = error.message;
    });
}

function renderTrades(trades) {
  tradesTableBody.innerHTML = ""; // Clear previous table rows

  if (!trades || trades.length === 0) {
    tradesTableBody.innerHTML = `<tr><td colspan="6">No trades found.</td></tr>`;
    return;
  }

  trades.forEach(trade => {
    // Create a table row for each trade.
    // You can customize the columns (e.g., trade date, symbol, quantity, price, totalAmount, tradeType).
    const row = document.createElement('tr');

    // Format the date nicely
    const tradeDate = new Date(trade.tradeDate).toLocaleString();

    // Use the stock symbol from the included stock data
    const symbol = trade.stock ? trade.stock.symbol : "N/A";

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

if (userId) {
  loadUserTrades(userId);
} else {
  errorDisplay.textContent = "User not logged in.";
}
});




window.addEventListener('DOMContentLoaded', function () {
// Assume the logged-in user's ID is stored in localStorage
const userId = localStorage.getItem('userId'); // e.g., "3"
const limitOrdersTableBody = document.getElementById('limit-orders-table-body');
const errorDisplay = document.getElementById('limit-orders-error');

function loadUserLimitOrders(userId) {
  fetch(`/trade/user-limit-orders?userId=${encodeURIComponent(userId)}`)
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => { 
          throw new Error(data.message || "Error fetching limit orders");
        });
      }
      return response.json();
    })
    .then(data => {
      renderLimitOrders(data.limitOrders);
    })
    .catch(error => {
      console.error("Error:", error);
      errorDisplay.textContent = error.message;
    });
}

function renderLimitOrders(limitOrders) {
  limitOrdersTableBody.innerHTML = ""; // Clear previous table rows

  if (!limitOrders || limitOrders.length === 0) {
    limitOrdersTableBody.innerHTML = `<tr><td colspan="7">No limit orders found.</td></tr>`;
    return;
  }

  limitOrders.forEach(order => {
    // Format the date nicely
    const orderDate = new Date(order.createdAt).toLocaleString();
    // Use the stock symbol from the included stock data (if available)
    const symbol = order.stock ? order.stock.symbol : "N/A";
    
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

if (userId) {
  loadUserLimitOrders(userId);
} else {
  errorDisplay.textContent = "User not logged in.";
}
});


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
