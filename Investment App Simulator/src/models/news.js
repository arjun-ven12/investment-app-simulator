const { parse } = require('path');
const prisma = require('./prismaClient');

const fetch = require("node-fetch");
const FINNHUB_API_KEY = "d2mgubhr01qog443m5m0d2mgubhr01qog443m5mg";


//////////////////////////////////////////////////////
// GET MARKET NEWS
//////////////////////////////////////////////////////
module.exports.getMarketNews = function getMarketNews(category, minId = 0) {
  if (!category) {
    return Promise.reject(new Error("Category is required"));
  }

  const url = `https://finnhub.io/api/v1/news?category=${category}&minId=${minId}&token=${FINNHUB_API_KEY}`;

  return fetch(url)
    .then(res => res.json())
    .catch(err => {
      console.error("Error fetching Finnhub news:", err);
      throw new Error("Failed to fetch news");
    });
};

module.exports.getMarketNewsWithUserLikes = async function (userId, category) {
  if (!userId) throw new Error("userId required");

  const apiNews = await this.getMarketNews(category);

  const newsWithLikes = await Promise.all(apiNews.map(async newsItem => {
    let dbNews = await prisma.news.findUnique({
      where: { apiId: Number(newsItem.id) }
    });

    if (!dbNews) {
      dbNews = await prisma.news.create({
        data: {
          apiId: Number(newsItem.id),
          headline: newsItem.headline,
          url: newsItem.url,
          summary: newsItem.summary,
          source: newsItem.source,
          datetime: newsItem.datetime ? new Date(newsItem.datetime * 1000) : null,
          category: {
            connect: { name: "forex" }  // ✅ connect to existing NewsCategory
          }
        }
      });
    }

    const like = await prisma.newsLike.findFirst({
      where: { userId, newsId: dbNews.id }
    });

    const totalLikes = await prisma.newsLike.count({
      where: { newsId: dbNews.id }
    });
    return { ...newsItem, liked: !!like, totalLikes };
  }));

  return newsWithLikes;
};
//////////////////////////////////////////////////////
// CREATE NEWS BOOKMARK 
//////////////////////////////////////////////////////
module.exports.bookmarkNews = async function (userId, newsData) {
  if (!newsData || !newsData.apiId || !newsData.url) {
    throw new Error("Invalid news data");
  }

  // Ensure apiId is an integer
  const apiIdInt = Number(newsData.apiId);
  if (isNaN(apiIdInt)) throw new Error("apiId must be a number");

  // 1️⃣ Find the news by apiId
  let news = await prisma.news.findUnique({
    where: { apiId: apiIdInt }
  });

  // 2️⃣ If news doesn't exist, create it
  if (!news) {
    const datetime = newsData.datetime ? new Date(newsData.datetime * 1000) : null;

    news = await prisma.news.create({
      data: {
        apiId: apiIdInt,
        headline: newsData.headline,
        url: newsData.url,
        summary: newsData.summary,
        source: newsData.source,
        datetime: datetime,
        category: {
          connect: { name: "forex" }  // ✅ connect to existing NewsCategory
        }
      }
    });
  }

  const existingBookmark = await prisma.bookmark.findUnique({
    where: {
      userId_newsId: {
        userId: userId,   // current user only
        newsId: news.id
      }
    }
  });

  if (existingBookmark) {
    return { success: false, message: "You already bookmarked this news" };
  }


  if (existingBookmark) {
    return { success: false, message: "You already bookmarked this news" };
  }


  if (existingBookmark) {
    return { success: false, message: "Bookmark already exists" };
  }

  // 4️⃣ Create bookmark
  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      newsId: news.id
    }
  });

  return { success: true, bookmark };
};

//////////////////////////////////////////////////////
// GET USER'S BOOKMARKS
//////////////////////////////////////////////////////
module.exports.getUserBookmarks = async function (userId) {
  if (!userId) throw new Error("userId is required");

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: { news: true } // include news details
  });

  return bookmarks;
};

//////////////////////////////////////////////////////
// DELETE USER'S BOOKMARKS
//////////////////////////////////////////////////////
// Delete a bookmark by ID + user check
module.exports.deleteUserBookmark = async function deleteUserBookmark(bookmarkId, userId) {
  // Check ownership
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
  });

  if (!bookmark) {
    throw new Error("Bookmark not found");
  }

  if (bookmark.userId !== userId) {
    throw new Error("Not authorized to remove this bookmark");
  }

  // Delete
  await prisma.bookmark.delete({
    where: { id: bookmarkId },
  });

  return { message: "Bookmark removed successfully" };
}


//////////////////////////////////////////////////////
// CREATE NEWS LIKE
//////////////////////////////////////////////////////
module.exports.toggleLikeNews = async function (userId, newsData) {
  if (!userId || !newsData || !newsData.apiId) {
    throw new Error("userId and newsData.apiId are required");
  }

  let news = await prisma.news.findUnique({
    where: { apiId: Number(newsData.apiId) }
  });

  if (!news) {
    const datetime = newsData.datetime ? new Date(newsData.datetime * 1000) : null;
    news = await prisma.news.create({
      data: {
        apiId: Number(newsData.apiId),
        headline: newsData.headline,
        url: newsData.url,
        summary: newsData.summary,
        source: newsData.source,
        datetime: datetime,
        category: {
          connect: { name: "forex" }  // ✅ connect to existing NewsCategory
        }
      }
    });
  }

  const existingLike = await prisma.newsLike.findFirst({
    where: { userId, newsId: news.id }
  });

  if (existingLike) {
    await prisma.newsLike.delete({ where: { id: existingLike.id } });
    const totalLikes = await prisma.newsLike.count({ where: { newsId: news.id } });
    return { success: true, liked: false, message: "News unliked successfully", totalLikes };
  }

  await prisma.newsLike.create({ data: { userId, newsId: news.id } });
  const totalLikes = await prisma.newsLike.count({ where: { newsId: news.id } });
  return { success: true, liked: true, message: "News liked successfully", totalLikes };
};



//////////////////////////////////////////////////////
// GET USER'S LIKES
//////////////////////////////////////////////////////
module.exports.getUserLikes = async function (userId) {
  if (!userId) throw new Error("userId is required");

  const likes = await prisma.newsLike.findMany({
    where: { userId },
    include: { news: true }
  });

  return likes;
};

//////////////////////////////////////////////////////
// REMOVE LIKE
//////////////////////////////////////////////////////
module.exports.removeLike = async function (userId, newsLikeId) {
  const like = await prisma.newsLike.findUnique({
    where: { id: newsLikeId }
  });

  if (!like) throw new Error("Like not found");
  if (like.userId !== userId) throw new Error("Not authorized to remove this like");

  await prisma.newsLike.delete({
    where: { id: newsLikeId }
  });

  return { message: "Like removed successfully" };
};


module.exports.getCategories = async function () {
  return await prisma.newsCategory.findMany({
    orderBy: { name: 'asc' }
  });
};


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

module.exports.getNewsLikesSummary = async function(userId = null) {
  const newsList = await prisma.news.findMany({
    include: {
      NewsLike: true,  // include all likes
    },
  });

  return newsList.map(news => {
    const likedByUser = userId
      ? news.NewsLike.some(like => like.userId === userId)
      : false;

    return {
      id: news.id,
      apiId: news.apiId,
      headline: news.headline,
      totalLikes: news.NewsLike.length,
      likedByUser,
    };
  });
};