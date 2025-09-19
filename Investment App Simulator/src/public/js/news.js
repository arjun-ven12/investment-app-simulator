// news.js - full cleaned version with socket.io integration

// ---------------- SOCKET + SVG EYE ----------------
let socket = null;

function createEyeSVG(size = 16) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;
}

// ---------------- DOM & SOCKET INIT ----------------
const newsContainer = document.getElementById('news-container');
const bookmarkContainer = document.getElementById('bookmark-container');
const errorMessage = document.getElementById('error-message');

let userBookmarks = [];

document.addEventListener('DOMContentLoaded', () => {
  // Socket client must be loaded before this file
  if (typeof io === 'undefined') {
    console.warn('Socket.IO client (io) is not available. Make sure /socket.io/socket.io.js is included before news.js');
  } else {
    socket = io(); // connect to same origin

    socket.on('connect', () => console.log('Socket connected (client):', socket.id));
    socket.on('connect_error', (err) => console.error('Socket connect_error:', err));

    // Accept multiple payload shapes: { apiId, id, newsId }
    socket.on('newsViewUpdated', (payload) => {
      if (!payload) return;
      const idStr = payload.apiId ? String(payload.apiId) : (payload.id ? String(payload.id) : (payload.newsId ? String(payload.newsId) : null));
      if (!idStr) return;

      const card = document.querySelector(`.news-card[data-news-key="${idStr}"]`);
      if (!card) return;
      const viewsDiv = card.querySelector('.views');
      if (!viewsDiv) return;

      viewsDiv.innerHTML = `${createEyeSVG(16)} ${payload.views ?? 0}`;
    });
  }

  
  // still populate categories on DOMContentLoaded
  populateCategoryFilter();

  // initial data loads
  fetchNews();
  fetchBookmarks();
});


// ---------------- Helpers & API calls ----------------
// Helper to get userId from JWT token
function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      return payload.id;
    } catch (e) {
      return null;
    }
}

async function fetchNewsViews(newsId) {
    // Allow non-authenticated fetch: remove token requirement if you want public view counts
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
        const res = await fetch(`/api/news/news/views/${newsId}`, {
            headers
        });
        const data = await res.json();
        if (data.success) return data.views || 0;
        return 0;
    } catch (err) {
        console.error("Failed to fetch news views:", err);
        return 0;
    }
}

async function fetchUserBookmarksIds() {
    const token = localStorage.getItem("token");
    if (!token) return [];

    try {
        const res = await fetch('/api/news/news/bookmarks', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            // store apiId as string for consistent comparisons
            return data.bookmarks.map(b => String(b.news.apiId));
        }
        return [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function fetchNews(category = '') {
    const token = localStorage.getItem("token");
    try {
        const url = category ? `/api/news/news?category=${encodeURIComponent(category)}` : '/api/news/news?category=top news';
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error('Failed to fetch news');

        const result = await response.json();

        if (!result.success) throw new Error(result.message || 'Failed to fetch news');

        displayNews(result.news);
    } catch (err) {
        console.error(err);
        if (errorMessage) errorMessage.textContent = err.message;
    }
}


// increment view API (server will broadcast)
async function incrementNewsViewAPI(newsId, newsData) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch('/api/news/news/view', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ newsId, newsData })
        });
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}


// ---------------- UI Rendering ----------------

function updateBookmarkButtonUI(button, bookmarked) {
    if (!button) return;
    if (bookmarked) {
        button.textContent = 'Bookmarked ✅';
        button.disabled = true;
        button.style.backgroundColor = '#ccc';
        button.style.cursor = 'not-allowed';
    } else {
        button.textContent = 'Bookmark';
        button.disabled = false;
        button.style.backgroundColor = '#007bff';
        button.style.cursor = 'pointer';
    }
}

function formatLikes(count) {
    return `${count} like${count === 1 ? '' : 's'}`;
}

async function displayNews(newsList = []) {
    if (!newsContainer) return;
    newsContainer.innerHTML = '';

    // Fetch current user's bookmarks (apiId strings)
    userBookmarks = await fetchUserBookmarksIds();

    // Ensure list is an array
    if (!Array.isArray(newsList)) newsList = [];

    for (const news of newsList) {
        const card = document.createElement('div');
        card.className = 'news-card';


        const headline = document.createElement('div');
        headline.className = 'headline';
        headline.textContent = news.headline;

        const summary = document.createElement('div');
        summary.className = 'summary';
        summary.textContent = news.summary || '';

        const source = document.createElement('div');
        source.className = 'source';
        source.textContent = news.source || '';

        const readMore = document.createElement('a');
        readMore.href = news.url;
        readMore.target = "_blank";
        readMore.textContent = "Read more";

        const viewsDiv = document.createElement('div');
        viewsDiv.className = 'views';
        viewsDiv.innerHTML = `${createEyeSVG(16)} 0`; // default while fetching

        // stable key as string (apiId preferred)
        const newsKey = String(news.apiId || news.id);
        card.dataset.newsKey = newsKey;

        // fetch actual view count and set
        fetchNewsViews(news.apiId || news.id).then(views => {
            news.views = views;
            viewsDiv.innerHTML = `${createEyeSVG(16)} ${views}`;
        });

         requestAnimationFrame(() => {
          
            card.style.opacity = 1;
            card.style.transform = 'translateY(0)';
        });
        // click handler increments view and opens article
        readMore.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                // call server to increment and broadcast
                const result = await incrementNewsViewAPI(news.apiId || news.id, news);
                if (result && result.success) {
                    // update UI immediately using returned views if available
                    const newViews = (result.views != null) ? result.views : ((news.views || 0) + 1);
                    news.views = newViews;
                    viewsDiv.innerHTML = `${createEyeSVG(16)} ${newViews}`;
                } else {
                    // optimistic fallback
                    news.views = (news.views || 0) + 1;
                    viewsDiv.innerHTML = `${createEyeSVG(16)} ${news.views}`;
                }
            } catch (err) {
                console.error("Failed to increment view:", err);
            } finally {
                // open article
                window.open(news.url, "_blank");
            }
        });

        // Bookmark button
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'bookmark-btn';

        const isBookmarked = userBookmarks.includes(newsKey);
        updateBookmarkButtonUI(bookmarkBtn, isBookmarked);

        bookmarkBtn.onclick = async () => {
            if (userBookmarks.includes(newsKey)) return;
            updateBookmarkButtonUI(bookmarkBtn, true);
            const result = await bookmarkNews(news);
            if (result && result.success) {
                userBookmarks.push(newsKey);
                fetchBookmarks();
            } else {
                updateBookmarkButtonUI(bookmarkBtn, false);
            }
        };

        // Like button + count
        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-btn';
        likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';

        const likeCountSpan = document.createElement('span');
        likeCountSpan.className = 'like-count';
        likeCountSpan.textContent = ` ${formatLikes(news.totalLikes || 0)}`;

        likeBtn.onclick = async () => {
            const currentlyLiked = news.liked;
            news.liked = !currentlyLiked;
            news.totalLikes = currentlyLiked ? (news.totalLikes - 1) : (news.totalLikes + 1);
            likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';
            likeCountSpan.textContent = ` ${news.totalLikes} likes`;

            const result = await toggleLike(news, likeBtn);
            if (result) {
                news.totalLikes = result.totalLikes;
                news.liked = result.liked;
                likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';
                likeCountSpan.textContent = ` ${formatLikes(result.totalLikes)}`;
            }
        };

        card.append(headline, summary, source, readMore, viewsDiv, bookmarkBtn, likeBtn, likeCountSpan);
        newsContainer.appendChild(card);
    }
}
cards.forEach((card, i) => {
  card.style.animation = `fadeInUp 0.5s ${i*0.08}s forwards`;
});


// ---------------- Bookmarks, Likes and other helpers ----------------

async function fetchBookmarks() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch('/api/news/news/bookmarks', {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
        });

        if (!response.ok) {
            let errorMsg = 'Failed to fetch bookmarks';
            try {
                const errJson = await response.json();
                errorMsg = errJson.message || errorMsg;
            } catch (_) {
                const errText = await response.text();
                if (errText) errorMsg = errText;
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to fetch bookmarks');

        displayBookmarks(result.bookmarks);
    } catch (err) {
        console.error(err);
        if (errorMessage) errorMessage.textContent = err.message;
    }
}

function displayBookmarks(bookmarks) {
    if (!bookmarkContainer) return;
    bookmarkContainer.innerHTML = '';
    if (!bookmarks || !bookmarks.length) {
        bookmarkContainer.textContent = "You have no bookmarks yet.";
        return;
    }

    bookmarks.forEach(bookmark => {
        const news = bookmark.news;
        const card = document.createElement('div');
        card.className = 'news-card';

        if (news.image) {
            const img = document.createElement('img');
            img.src = news.image;
            img.alt = news.headline;
            img.className = 'news-image';
            card.appendChild(img);
        }

        const headline = document.createElement('div');
        headline.className = 'headline';
        headline.textContent = news.headline;

        const summary = document.createElement('div');
        summary.className = 'summary';
        summary.textContent = news.summary || '';

        const source = document.createElement('div');
        source.className = 'source';
        source.textContent = news.source || '';

        const datetime = document.createElement('div');
        datetime.className = 'datetime';
        datetime.textContent = news.datetime ? new Date(news.datetime).toLocaleString() : '';

        const readMore = document.createElement('a');
        readMore.href = news.url;
        readMore.target = "_blank";
        readMore.textContent = "Read more";

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => removeBookmark(bookmark.id, news.apiId);

        card.append(headline, summary, source, datetime, readMore, removeBtn);
        bookmarkContainer.appendChild(card);
    });
}


async function bookmarkNews(newsData) {
    try {
        const userId = getUserIdFromToken();
        if (!userId) {
            console.error("You must be logged in to bookmark news.");
            return { success: false };
        }

        const payloadBody = {
            userId: parseInt(userId),
            newsData: {
                apiId: newsData.id || newsData.apiId,
                category: newsData.category,
                datetime: newsData.datetime,
                headline: newsData.headline,
                image: newsData.image,
                source: newsData.source,
                summary: newsData.summary,
                url: newsData.url
            }
        };

        const response = await fetch('/api/news/news/bookmark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(payloadBody)
        });

        const result = await response.json();

        if (!result.success) {
            console.error(result.message || "Could not bookmark news");
            return { success: false };
        }

        return { success: true, data: result.bookmark };

    } catch (err) {
        console.error(err);
        return { success: false };
    }
}

async function removeBookmark(bookmarkId, newsApiId = null) {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to remove a bookmark.");
        return;
    }

    try {
        const response = await fetch(`/api/news/news/bookmark/${bookmarkId}`, {
            method: 'DELETE',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();
        if (!result.success) {
            alert(result.message || "Failed to remove bookmark");
            return;
        }

        if (newsApiId) {
            userBookmarks = userBookmarks.filter(k => String(k) !== String(newsApiId));
            // update UI button if present
            const card = document.querySelector(`.news-card[data-news-key="${String(newsApiId)}"]`);
            if (card) {
                const btn = card.querySelector('.bookmark-btn');
                if (btn) updateBookmarkButtonUI(btn, false);
            }
        } else {
            userBookmarks = await fetchUserBookmarksIds();
        }

        await fetchBookmarks();

    } catch (err) {
        console.error("Error removing bookmark:", err);
        alert(err.message || "An error occurred while removing bookmark");
    }
}


async function toggleLike(newsData, button) {
    const userId = getUserIdFromToken();
    if (!userId) {
        alert("You must be logged in to like news.");
        return null;
    }

    button.disabled = true;

    try {
        const response = await fetch('/api/news/news/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                userId: parseInt(userId),
                newsData: {
                    apiId: newsData.id || newsData.apiId,
                    headline: newsData.headline,
                    summary: newsData.summary,
                    url: newsData.url,
                    source: newsData.source,
                    image: newsData.image,
                    datetime: newsData.datetime,
                    category: newsData.category
                }
            }),
        });

        const result = await response.json();
        if (!result.success) {
            alert(result.message || 'Failed to toggle like');
            return null;
        }

        button.textContent = result.liked ? '❤️ Liked' : '🤍 Like';
        return result;

    } catch (err) {
        console.error(err);
        alert(err.message);
        return null;
    } finally {
        button.disabled = false;
    }
}


// ---------------- Category filter ----------------
async function populateCategoryFilter() {
  try {
    const res = await fetch('/api/news/categories');
    const data = await res.json();
    if (!data.success) return;

    const select = document.getElementById('category-filter');
    const chipsContainer = document.getElementById('category-chips');
    const selectWrap = document.querySelector('.select-wrap');

    if (!select) return;
    select.innerHTML = `<option value="" selected>Browse categories</option>`;

    // create options + chips
    data.categories.forEach((cat, idx) => {
      const name = String(cat.name || cat).trim();
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      select.appendChild(opt);

      // chip
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'category-chip';
      chip.textContent = opt.textContent;
      chip.dataset.value = name;
      chip.addEventListener('click', () => {
        // set select, trigger change
        select.value = name;
        // visually mark active
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        // small pulse effect
        chip.animate([{ transform: 'scale(0.98)' }, { transform: 'scale(1)' }], { duration: 200 });
        // fetch news for that category
        fetchNews(name);
      });
      chipsContainer.appendChild(chip);
    });

    // toggle caret rotation while select is opened (visual only)
    select.addEventListener('mousedown', () => selectWrap.classList.add('open'));
    // close after small delay (native dropdown closes on mouseup)
    select.addEventListener('blur', () => selectWrap.classList.remove('open'));
    select.addEventListener('change', (e) => {
      // remove active from chips, set matching chip active if exists
      const val = e.target.value;
      document.querySelectorAll('.category-chip').forEach(c => c.classList.toggle('active', c.dataset.value === val));
      // call fetch news with selected category
      if (val) fetchNews(val);
      // small micro animation
      selectWrap.animate([{ transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 180 });
    });

    // optional: pre-activate first chip for top news
    const firstChip = document.querySelector('.category-chip');
    if (firstChip) firstChip.classList.add('active');
  } catch (err) {
    console.error("Failed to load categories", err);
  }
}

// find select wrap + select (run after DOM ready)
const selectWrap = document.querySelector('.select-wrap');
const categorySelect = document.getElementById('category-filter');

if (categorySelect && selectWrap) {
  // open visual on pointer down / keyboard open attempt
  categorySelect.addEventListener('pointerdown', () => selectWrap.classList.add('open'));
  // remove open on blur
  categorySelect.addEventListener('blur', () => selectWrap.classList.remove('open'));
  // also remove on change after a short delay so rotated caret is smooth
  categorySelect.addEventListener('change', () => {
    setTimeout(() => selectWrap.classList.remove('open'), 180);
  });
}


