
// ============================================================
// news.js — BlackSealed Market Feed (Final Production)
// Cinematic Grid · Smart Rotation · Socket.IO Live Views
// ============================================================

// ---------------- SOCKET + SVG ICONS ----------------
let socket = null;

function createEyeSVG(size = 16) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>`;
}

// ---------------- DOM ELEMENTS ----------------
const newsContainer = document.getElementById("news-container");
const bookmarkContainer = document.getElementById("bookmark-container");
const errorMessage = document.getElementById("error-message");
let userBookmarks = [];

// ---------------- INITIALIZE ----------------
document.addEventListener("DOMContentLoaded", () => {
    if (typeof io !== "undefined") {
        socket = io();
        socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
        socket.on("connect_error", (err) => console.error("Socket connect_error:", err));

        socket.on("newsViewUpdated", (payload) => {
            if (!payload) return;
            const idStr = payload.apiId || payload.id || payload.newsId;
            const card = document.querySelector(`.news-card[data-news-key="${idStr}"]`);
            if (!card) return;
            const viewsDiv = card.querySelector(".views");
            if (viewsDiv)
                viewsDiv.innerHTML = `${createEyeSVG(16)} ${payload.views ?? 0}`;
        });
    }

    populateCategoryFilter();
    fetchNews();
    fetchBookmarks();
    initSavedDrawer();
});

// ============================================================
// HELPERS + API CALLS
// ============================================================
function getUserIdFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.id;
    } catch {
        return null;
    }
}

async function fetchNewsViews(newsId) {
    try {
        const res = await fetch(`/api/news/news/views/${newsId}`);
        const data = await res.json();
        return data.success ? data.views || 0 : 0;
    } catch {
        return 0;
    }
}

async function fetchUserBookmarksIds() {
    const token = localStorage.getItem("token");
    if (!token) return [];
    try {
        const res = await fetch("/api/news/news/bookmarks", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        return data.success ? data.bookmarks.map((b) => String(b.news.apiId)) : [];
    } catch {
        return [];
    }
}

async function fetchNews(category = "") {
    const token = localStorage.getItem("token");
    try {
        const url = category
            ? `/api/news/news?category=${encodeURIComponent(category)}`
            : "/api/news/news?category=top news";
        const res = await fetch(url, {
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                "Content-Type": "application/json",
            },
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || "Failed to fetch");
        displayNews(result.news);
    } catch (err) {
        console.error(err);
        if (errorMessage) errorMessage.textContent = err.message;
    }
}

async function incrementNewsViewAPI(newsId, newsData) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch("/api/news/news/view", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ newsId, newsData }),
        });
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

// ============================================================
// DB-FED FALLBACK IMAGE ROTATION (Circular Loader)
// ============================================================
const fallbackCache = {};
// ============================================================
// GLOBAL FALLBACK IMAGE ROTATION (Shared Across All Categories)
// ============================================================
let globalFallback = {
    list: [],
    index: 0,
    loading: false,
};

async function loadGlobalFallbackImages() {
    if (globalFallback.loading) return;
    globalFallback.loading = true;

    try {
        const res = await fetch(`/api/fallback-image/all`); // you can keep this as /api/fallback-image
        const data = await res.json();

        if (data.success && Array.isArray(data.images) && data.images.length > 0) {
            globalFallback.list = data.images.map((img) => img.url || img);
            shuffleArray(globalFallback.list); // optional randomization
            globalFallback.index = 0;
        } else {
            globalFallback.list = [
                "https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
            ];
        }
    } catch (err) {
        console.error("⚠️ Fallback image fetch failed:", err);
        globalFallback.list = [
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
        ];
    } finally {
        globalFallback.loading = false;
    }
}

// Small utility: shuffle once for natural variation
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

async function getFallbackImage() {
    // Ensure global list loaded
    if (globalFallback.list.length === 0 && !globalFallback.loading) {
        await loadGlobalFallbackImages();
    }

    // Guard if still empty
    if (globalFallback.list.length === 0) {
        return "https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80";
    }

    // Use next image and advance pointer
    const imgUrl = globalFallback.list[globalFallback.index];
    globalFallback.index = (globalFallback.index + 1) % globalFallback.list.length;
    return imgUrl;
}


function createSmartImage(url, headline, category) {
    const img = document.createElement("img");
    img.alt = headline || "thumbnail";
    img.className = "news-thumb";
    img.loading = "lazy";
    img.style.opacity = "0"; // start invisible
    img.style.transition = "opacity 0.6s ease"; // fade-in animation

    const isValid = (src) =>
        src &&
        typeof src === "string" &&
        src.trim() !== "" &&
        !src.includes("placeholder") &&
        !src.includes("default") &&
        !src.includes("logo") &&
        !["null", "undefined"].includes(src.toLowerCase());

    // 🧠 Smart loader — use fallback if invalid or fails
    async function loadImage() {
        let finalSrc = isValid(url) ? url : await getFallbackImage();

        // Attempt to load the chosen image
        img.src = finalSrc;
        img.onload = () => {
            img.style.opacity = "1"; // fade in when ready
        };
        img.onerror = async () => {
            const fallback = await getFallbackImage();
            img.src = fallback;
            img.onload = () => (img.style.opacity = "1");
        };
    }

    loadImage();
    return img;
}

// ============================================================
// DISPLAY NEWS + LIKES + BOOKMARKS + SUBTLE GRID VARIATION
// ============================================================
function updateBookmarkButtonUI(button, bookmarked) {
    button.classList.toggle("saved", bookmarked);
    button.innerHTML = bookmarked
        ? '<i class="fa-solid fa-bookmark"></i>'
        : '<i class="fa-regular fa-bookmark"></i>';
    button.setAttribute("data-tooltip", bookmarked ? "Saved" : "Save");
}

function updateLikeButtonUI(button, liked) {
    button.classList.toggle("liked", liked);
    button.innerHTML = liked
        ? '<i class="fa-solid fa-heart"></i>'
        : '<i class="fa-regular fa-heart"></i>';
    button.setAttribute("data-tooltip", liked ? "Liked" : "Like");
}

function formatLikes(c) {
    return `${c} like${c === 1 ? "" : "s"}`;
}

function formatViews(c) {
    return `${c || 0} view${c === 1 ? "" : "s"}`;
}
async function removeBookmarkByApiId(apiId) {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;
        await fetch(`/api/news/news/bookmark/byApiId/${apiId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (err) {
        console.error("❌ Failed to remove bookmark by apiId:", err);
    }
}
function bookmarkIdFromDrawer(apiId) {
  const card = bookmarkContainer.querySelector(`[data-bookmark-id="${apiId}"]`);
  if (!card) return null;
  // Use dataset if you store actual bookmarkId
  return card.dataset.bookmarkDbId || apiId;
}
// ==========================================================
// 1. GLOBAL STATE & DOM REFERENCES
// ==========================================================
const paginationContainer = document.getElementById('pagination-controls'); // Fetches <div id="pagination-controls">

let currentNewsList = [];
let currentPage = 1;
const itemsPerPage = 12; 


// ==========================================================
// 2. PAGINATION FUNCTIONS
// ==========================================================

/**
 * Creates and updates the pagination buttons.
 * @param {number} totalItems - The total number of news items.
 */
function createPaginationControls(totalItems) {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return; 

    // --- Previous Button ---
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.className = 'pagebutton'; // Using your existing class
    prevBtn.disabled = (currentPage === 1); 
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayNews(); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    if (currentPage > 1) {
        paginationContainer.appendChild(prevBtn);
    }
    
    // --- Page Number/Status ---
    const pageStatus = document.createElement('span');
    pageStatus.className = 'page-status';
    pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageStatus);


    // --- Next Button ---
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'pagebutton'; // Using your existing class
    nextBtn.disabled = (currentPage >= totalPages);
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayNews(); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationContainer.appendChild(nextBtn);
}


// ==========================================================
// 3. REVISED DISPLAY FUNCTION
// ==========================================================

async function displayNews(newsList = currentNewsList) {
    if (!newsContainer) return;
    
    // Update global list and reset page if a new list is provided (e.g., from search)
    if (newsList !== currentNewsList) {
        currentNewsList = newsList;
        currentPage = 1; 
    }

    newsContainer.innerHTML = "";
    userBookmarks = await fetchUserBookmarksIds();
    
    if (!Array.isArray(currentNewsList)) currentNewsList = [];
    
    // ⭐️ PAGINATION LOGIC: Slice the array
    const totalItems = currentNewsList.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const newsForPage = currentNewsList.slice(startIndex, endIndex);

    // ⭐️ RENDER CARDS FOR THE CURRENT PAGE ONLY
    newsForPage.forEach((news) => {
        const card = document.createElement("article");
        card.className = "news-card";

        const key = String(news.apiId || news.id);
        card.dataset.newsKey = key;

        // ... [Thumbnail, Text, Summary, Meta, Buttons creation logic remains here] ...
        
        // --- Thumbnail ---
        const thumbWrapper = document.createElement("div");
        thumbWrapper.className = "thumb-wrapper";
        const img = createSmartImage(news.image, news.headline, news.category);
        thumbWrapper.appendChild(img);
        card.appendChild(thumbWrapper);

        // --- Text ---
        const source = document.createElement("div");
        source.className = "source";
        source.textContent = news.source || "Unknown";

        const headline = document.createElement("h3");
        headline.className = "headline";
        headline.textContent = news.headline;

        const summary = document.createElement("p");
        summary.className = "summary";
        summary.textContent = news.summary || "";

        // --- Meta (Views/Likes) ---
        const viewsDiv = document.createElement("div");
        viewsDiv.className = "views";
        viewsDiv.innerHTML = `${createEyeSVG(16)} ${formatViews(0)} • ${formatLikes(news.totalLikes || 0)}`;

        fetchNewsViews(news.apiId || news.id).then((views) => {
            news.views = views;
            viewsDiv.innerHTML = `${createEyeSVG(16)} ${formatViews(views)} • ${formatLikes(news.totalLikes || 0)}`;
        });

        // --- Actions (Read More, Bookmark, Like) ---
        const readMore = document.createElement("a");
        readMore.href = news.url || "#";
        readMore.target = "_blank";
        readMore.className = "read-more";
        readMore.textContent = "Read more";

        const bookmarkBtn = document.createElement("button");
        bookmarkBtn.className = "bookmark-btn";
        updateBookmarkButtonUI(bookmarkBtn, userBookmarks.includes(key));

        bookmarkBtn.onclick = async () => {
             const isBookmarked = userBookmarks.includes(key);

            if (isBookmarked) {
                updateBookmarkButtonUI(bookmarkBtn, false);
                userBookmarks = userBookmarks.filter((id) => id !== key);
                await removeBookmark(bookmarkIdFromDrawer(key));
                const existing = bookmarkContainer.querySelector(`[data-bookmark-id="${key}"]`);
                if (existing) existing.remove();

                if (!bookmarkContainer.querySelector(".news-card")) {
                    const emptyMsg = document.createElement("div");
                    emptyMsg.className = "empty-state";
                    emptyMsg.textContent = "No saved news yet.";
                    bookmarkContainer.appendChild(emptyMsg);
                }
            } else {
                updateBookmarkButtonUI(bookmarkBtn, true);
                const result = await bookmarkNews(news);
                if (result?.success) userBookmarks.push(key);
            }
        };

        const likeBtn = document.createElement("button");
        likeBtn.className = "like-btn";
        updateLikeButtonUI(likeBtn, news.liked);
        likeBtn.onclick = async () => {
            const result = await toggleLike(news);
            if (result) {
                news.totalLikes = result.totalLikes;
                news.liked = result.liked;
                updateLikeButtonUI(likeBtn, result.liked);
                viewsDiv.innerHTML = `${createEyeSVG(16)} ${formatViews(news.views || 0)} • ${formatLikes(result.totalLikes)}`;
            }
        };

        readMore.addEventListener("click", async (e) => {
            e.preventDefault();
            const result = await incrementNewsViewAPI(news.apiId || news.id, news);
            if (result?.success) {
                const newViews = result.views ?? (news.views || 0) + 1;
                news.views = newViews;
                viewsDiv.innerHTML = `${createEyeSVG(16)} ${formatViews(newViews)} • ${formatLikes(news.totalLikes || 0)}`;
            }
            window.open(news.url, "_blank");
        });

        const actions = document.createElement("div");
        actions.className = "actions";
        actions.append(readMore, bookmarkBtn, likeBtn);

        card.append(source, headline, summary, actions, viewsDiv);
        newsContainer.appendChild(card);
    });
    
    // ⭐️ Render Pagination Controls after rendering news
    createPaginationControls(totalItems);

    // --- Scroll Reveal Observer ---
    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); 
                }
            });
        },
        { threshold: 0.2 } 
    );

    document.querySelectorAll('.news-card').forEach(card => observer.observe(card));
}





function applyScrollReveal() {
  const cards = document.querySelectorAll('.news-card');

  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // add a tiny stagger for a smoother flow
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80); // 80 ms delay between cards
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  cards.forEach(card => observer.observe(card));
}


// ============================================================
// BOOKMARKS + SAVED DRAWER
// ============================================================
async function bookmarkNews(newsData) {
    try {
        const userId = getUserIdFromToken();
        if (!userId) return { success: false };

        if (!newsData.apiId && newsData.id) newsData.apiId = newsData.id;

        const response = await fetch("/api/news/news/bookmark", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ userId, newsData }),
        });

        const result = await response.json();
        if (!result.success) return { success: false };

        // ✅ instantly reflect new bookmark visually
        addBookmarkToDrawer(newsData);

        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false };
    }
}

function addBookmarkToDrawer(newsData) {
    if (!bookmarkContainer) return;

    // 🔹 Remove existing empty message (if present)
    const existingEmpty = bookmarkContainer.querySelector(".empty-state");
    if (existingEmpty) existingEmpty.remove();

    // 🔹 Prevent duplicates
    if (bookmarkContainer.querySelector(`[data-bookmark-id="${newsData.apiId}"]`)) return;

    const card = document.createElement("div");
    card.className = "news-card fade-in";
    card.dataset.bookmarkId = newsData.apiId;

    const img = createSmartImage(newsData.image, newsData.headline, newsData.category);
    card.appendChild(img);

    const h = document.createElement("h3");
    h.textContent = newsData.headline;

    const p = document.createElement("p");
    p.textContent = newsData.summary || "";

    const rmv = document.createElement("button");
    rmv.className = "remove-btn";
    rmv.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    rmv.onclick = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        // 🔹 Delete from DB
        await fetch(`/api/news/news/bookmark/${newsData.apiId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        // 🔹 Update local state
        userBookmarks = userBookmarks.filter((id) => id !== String(newsData.apiId));

        // 🔹 Animate + remove from drawer
        card.classList.add("fade-out");
        setTimeout(() => card.remove(), 300);

        // 🔹 Update bookmark button in main feed (instant UI sync)
        const mainCardBtn = document.querySelector(
            `.news-card[data-news-key="${newsData.apiId}"] .bookmark-btn`
        );
        if (mainCardBtn) updateBookmarkButtonUI(mainCardBtn, false);

        // 🔹 Add empty-state if no bookmarks left
        setTimeout(() => {
            if (!bookmarkContainer.querySelector(".news-card")) {
                const emptyMsg = document.createElement("div");
                emptyMsg.className = "empty-state";
                emptyMsg.textContent = "No saved news yet.";
                bookmarkContainer.appendChild(emptyMsg);
            }
        }, 350);
    };

    card.append(h, p, rmv);
    bookmarkContainer.prepend(card);
}



async function fetchBookmarks() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
        const res = await fetch("/api/news/news/bookmarks", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) displayBookmarks(data.bookmarks);
    } catch (err) {
        console.error(err);
    }
}

function displayBookmarks(bookmarks = []) {
    if (!bookmarkContainer) return;
    bookmarkContainer.innerHTML = ""; // always reset

    if (!bookmarks.length) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "empty-state";
        emptyMsg.textContent = "No saved news yet.";
        bookmarkContainer.appendChild(emptyMsg);
        return;
    }

    bookmarks.forEach((bookmark) => {
        const n = bookmark.news;
        const card = document.createElement("div");
        card.className = "news-card";
        card.dataset.bookmarkId = n.apiId;

        const img = createSmartImage(n.image, n.headline, n.category);
        card.appendChild(img);

        const h = document.createElement("h3");
        h.textContent = n.headline;

        const p = document.createElement("p");
        p.textContent = n.summary || "";

        const rmv = document.createElement("button");
        rmv.className = "remove-btn";
        rmv.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        rmv.onclick = () => removeBookmark(bookmark.id, n.apiId);

        card.append(h, p, rmv);
        bookmarkContainer.appendChild(card);
    });
}


async function removeBookmark(bookmarkId, newsApiId) {
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch(`/api/news/news/bookmark/${bookmarkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    userBookmarks = userBookmarks.filter((id) => id !== String(newsApiId));
    fetchBookmarks();
}

// ============================================================
// TOGGLE LIKE
// ============================================================
async function toggleLike(newsData) {
    const userId = getUserIdFromToken();
    if (!userId) return null;

    // ensure apiId exists (fallback to id)
    if (!newsData.apiId && newsData.id) newsData.apiId = newsData.id;

    try {
        const response = await fetch("/api/news/news/like", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ userId, newsData }),
        });
        const result = await response.json();
        return result.success ? result : null;
    } catch (err) {
        console.error(err);
        return null;
    }
}


// ============================================================
// SAVED DRAWER LOGIC
// ============================================================
function initSavedDrawer() {
    const folderWrapper = document.getElementById("folderTabWrapper");
    const tab = document.getElementById("folderTab");
    const closeBtn = document.getElementById("closeFolder");
    if (!folderWrapper || !tab || !closeBtn) return;

    tab.addEventListener("click", () => {
        folderWrapper.classList.toggle("open");
    });
    closeBtn.addEventListener("click", () => {
        folderWrapper.classList.remove("open");
    });
}

// ============================================================
// CATEGORY FILTER
// ============================================================
// ============================================================
// CATEGORY FILTER (Ordered + Auto-Active "General")
// ============================================================
async function populateCategoryFilter() {
  try {
    const res = await fetch("/api/news/categories");
    const data = await res.json();
    if (!data.success) return;

    const chipsContainer = document.getElementById("category-chips");
    chipsContainer.innerHTML = "";

    // 🧠 Custom order — anything not listed goes at the end alphabetically
    const order = ["general", "crypto", "forex", "merger"];
    const sortedCategories = data.categories
      .map((c) => String(c.name || c).trim().toLowerCase())
      .sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

    // 🧩 Create chips dynamically
    sortedCategories.forEach((cat, i) => {
      const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "category-chip";
      chip.textContent = displayName;
      chip.dataset.value = cat;

      chip.addEventListener("click", () => {
        document
          .querySelectorAll(".category-chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        fetchNews(cat);
      });

      chipsContainer.appendChild(chip);
    });

    // ✅ Auto-select and load "General" (or the first in order)
    const defaultCategory = "general";
    const defaultChip = document.querySelector(
      `.category-chip[data-value="${defaultCategory}"]`
    );

    if (defaultChip) {
      defaultChip.classList.add("active");
      fetchNews(defaultCategory);
    } else if (chipsContainer.firstChild) {
      chipsContainer.firstChild.classList.add("active");
      fetchNews(chipsContainer.firstChild.dataset.value);
    }
  } catch (err) {
    console.error("Failed to load categories", err);
  }
}



window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 20) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});






