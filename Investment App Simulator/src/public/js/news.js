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

async function fetchNews() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch('/api/news/news?category=general', {
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
        readMore.style.paddingBottom = "15px"; // <-- Add space

        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'bookmark-btn';
        bookmarkBtn.textContent = 'Bookmark';
        bookmarkBtn.onclick = () => bookmarkNews(news, bookmarkBtn);

        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-btn';
        likeBtn.textContent = news.liked ? '❤️ Liked' : '🤍 Like';
        likeBtn.onclick = () => toggleLike(news, likeBtn);

        const likeCountSpan = document.createElement('span');
        likeCountSpan.className = 'like-count';
        likeCountSpan.textContent = ` ${news.totalLikes || 0} likes`;

        likeBtn.onclick = async () => {
            const result = await toggleLike(news, likeBtn);
            if (result) {
                likeCountSpan.textContent = ` ${result.totalLikes} likes`;
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


// Load news and bookmarks on page load
fetchNews();
fetchBookmarks();
