const newsContainer = document.getElementById('news-container');
const bookmarkContainer = document.getElementById('bookmark-container');
const errorMessage = document.getElementById('error-message');

// Helper to get userId from JWT token
function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.id;
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


function displayNews(newsList) {
    newsContainer.innerHTML = '';

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

        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'bookmark-btn';
        bookmarkBtn.textContent = 'Bookmark';
        bookmarkBtn.onclick = () => bookmarkNews(news, bookmarkBtn);

        bookmarkBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-bookmark" viewBox="0 0 16 16">
  <path d="M2 2v13l6-5 6 5V2H2z"/>
</svg>
`;
        // Like button + count
        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-btn';
        likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';

        const likeCountSpan = document.createElement('span');
        likeCountSpan.className = 'like-count';
        likeCountSpan.textContent = ` ${formatLikes(news.totalLikes || 0)}`;


        // Toggle like handler
        likeBtn.onclick = async () => {
            // Optimistically update UI first
            const currentlyLiked = news.liked;
            news.liked = !currentlyLiked;
            news.totalLikes = currentlyLiked ? news.totalLikes - 1 : news.totalLikes + 1;

            likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';
            likeCountSpan.textContent = ` ${news.totalLikes} likes`;

            try {
                const result = await toggleLike(news, likeBtn);

                // If server fails, rollback
                if (!result) {
                    news.liked = currentlyLiked;
                    news.totalLikes = currentlyLiked ? news.totalLikes + 1 : news.totalLikes - 1;
                    likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';
                    likeCountSpan.textContent = ` ${news.totalLikes} likes`;
                } else {
                    // Ensure totalLikes matches server response
                    news.totalLikes = result.totalLikes;
                    news.liked = result.liked;
                    likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';
                    likeCountSpan.textContent = ` ${formatLikes(result.totalLikes)}`;
                }
            } catch (err) {
                console.error(err);
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
        removeBtn.onclick = () => removeBookmark(bookmark.id);

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


async function bookmarkNews(newsData, button) {
    try {
        button.disabled = true;
        const userId = getUserIdFromToken();
        if (!userId) {
            alert("You must be logged in to bookmark news.");
            button.disabled = false;
            return;
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
            alert(result.message || "Could not bookmark news");
            button.disabled = false;
            return;
        }

        alert("Bookmarked successfully!");
        fetchBookmarks();
    } catch (err) {
        console.error(err);
        alert(err.message);
        button.disabled = false;
    }
}

async function removeBookmark(bookmarkId) {
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

        alert("Bookmark removed!");
        fetchBookmarks(); // refresh list
    } catch (err) {
        console.error("Error removing bookmark:", err);
        alert(err.message);
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
