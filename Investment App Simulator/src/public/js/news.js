const newsContainer = document.getElementById('news-container');
const bookmarkContainer = document.getElementById('bookmark-container');
const errorMessage = document.getElementById('error-message');

let userBookmarks = [];

// global helper to update a bookmark button's UI
function updateBookmarkButtonUI(button, bookmarked) {
    if (!button) return;
    if (bookmarked) {
        button.textContent = 'Bookmarked ✅';
        button.disabled = true;
        button.style.backgroundColor = '#ccc'; // greyed out
        button.style.cursor = 'not-allowed';
    } else {
        button.textContent = 'Bookmark';
        button.disabled = false;
        button.style.backgroundColor = '#007bff';
        button.style.cursor = 'pointer';
    }
}

// Helper to get userId from JWT token
function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.id;
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
            return data.bookmarks.map(b => b.news.apiId); // or b.news.id if you store that
        }
        return [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function fetchNews(category) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`/api/news/news?category=${category}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error('Failed to fetch news');

        const result = await response.json();

        if (!result.success) throw new Error(result.message || 'Failed to fetch news');

        displayNews(result.news); // <-- use result.news
    } catch (err) {
        console.error(err);
        errorMessage.textContent = err.message;
    }
}

async function displayNews(newsList) {
    newsContainer.innerHTML = '';

    // Fetch current user's bookmarks
    userBookmarks = await fetchUserBookmarksIds();

    newsList.forEach(news => {
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

        const readMore = document.createElement('a');
        readMore.href = news.url;
        readMore.target = "_blank";
        readMore.textContent = "Read more";

        // Bookmarks
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'bookmark-btn';

        // set a stable key for lookup (apiId or internal id)
        const newsKey = news.id || news.apiId;
        card.dataset.newsKey = newsKey; // so we can find this card later

        const isBookmarked = userBookmarks.includes(newsKey);
        updateBookmarkButtonUI(bookmarkBtn, isBookmarked);

        // click handler: optimistic UI update -> call API -> rollback on failure
        bookmarkBtn.onclick = async () => {
            // if already bookmarked locally, do nothing
            if (userBookmarks.includes(newsKey)) return;

            // optimistic UI change
            updateBookmarkButtonUI(bookmarkBtn, true);

            const result = await bookmarkNews(news); // returns server result { success: true, bookmark: ... }

            if (result && result.success) {
                // add to local list so other cards reflect state
                userBookmarks.push(newsKey);

                // refresh bookmark sidebar immediately to show the new bookmark
                fetchBookmarks();
            } else {
                // rollback if server failed
                updateBookmarkButtonUI(bookmarkBtn, false);
            }
        };

        // Likes (existing code)
        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-btn';
        likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';

        const likeCountSpan = document.createElement('span');
        likeCountSpan.className = 'like-count';
        likeCountSpan.textContent = ` ${formatLikes(news.totalLikes || 0)}`;

        // Like toggle (existing code)
        likeBtn.onclick = async () => {
            const currentlyLiked = news.liked;
            news.liked = !currentlyLiked;
            news.totalLikes = currentlyLiked ? news.totalLikes - 1 : news.totalLikes + 1;
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

        card.append(headline, summary, source, readMore, bookmarkBtn, likeBtn, likeCountSpan);
        newsContainer.appendChild(card);
    });
}



async function fetchUserLikes() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch('/api/news/news/likes', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    // display user-liked news in a separate section
}

function displayBookmarks(bookmarks) {
    bookmarkContainer.innerHTML = '';
    if (!bookmarks.length) {
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

        // 🆕 Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove ❌';
        // pass both bookmark id and apiId so UI can sync immediately
        removeBtn.onclick = () => removeBookmark(bookmark.id, news.apiId)

        card.append(headline, summary, source, datetime, readMore, removeBtn);
        bookmarkContainer.appendChild(card);
    });
}



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
            // Try to get JSON message, fallback to plain text
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
        errorMessage.textContent = err.message;
    }
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
                apiId: newsData.id,
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

        // return success without alert
        return { success: true, data: result.bookmark };

    } catch (err) {
        console.error(err.message);
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

        // Remove the apiId from local userBookmarks if provided
        if (newsApiId) {
            userBookmarks = userBookmarks.filter(k => String(k) !== String(newsApiId));
        } else {
            // fallback: re-sync from server
            userBookmarks = await fetchUserBookmarksIds();
        }

        // If the news card for this apiId exists on the page, update its button UI
        if (newsApiId) {
            // find the card whose dataset.newsKey equals newsApiId
            const selector = `.news-card[data-news-key="${newsApiId}"]`;
            const card = document.querySelector(selector);
            if (card) {
                const cardBtn = card.querySelector('.bookmark-btn');
                if (cardBtn) updateBookmarkButtonUI(cardBtn, false);
            }
        }

        // Refresh bookmark sidebar to reflect deletion
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
                    apiId: newsData.id,
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

        // Update button UI
        button.textContent = result.liked ? '❤️ Liked' : '🤍 Like';
        return result; // <-- return result including totalLikes
    } catch (err) {
        console.error(err);
        alert(err.message);
        return null;
    } finally {
        button.disabled = false;
    }
}

async function populateCategoryFilter() {
    try {
        const res = await fetch('/api/news/categories');
        const data = await res.json();

        if (data.success) {
            const select = document.getElementById('category-filter');
            select.innerHTML = `<option value="">-- Select Category --</option>`; // reset

            data.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
                select.appendChild(option);
            });

            // 🆕 add change event: fetch news when category changes
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    fetchNewsByCategory(e.target.value);
                }
            });
        }
    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

async function fetchNewsByCategory(category) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`/api/news/news?category=${category}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error('Failed to fetch news');

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to fetch news');

        displayNews(result.news);
    } catch (err) {
        console.error(err);
        errorMessage.textContent = err.message;
    }
}

document.getElementById('category-filter').addEventListener('change', (e) => {
    const selectedCategory = e.target.value;
    if (selectedCategory) {
        fetchNews(selectedCategory);
    }
});

async function fetchNewsLikesSummary() {
    const token = localStorage.getItem("token");

    try {
        const res = await fetch('/api/news/likes/summary', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message || "Failed to fetch news likes");

        console.log(data.newsLikes); // each item has { id, headline, totalLikes, likedByUser }
    } catch (err) {
        console.error(err);
    }
}

// helper function to format likes text
function formatLikes(count) {
    return `${count} like${count === 1 ? '' : 's'}`;
}

document.addEventListener("DOMContentLoaded", populateCategoryFilter);


// Load news and bookmarks on page load
fetchNews();
fetchBookmarks();
