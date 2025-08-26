const { parse } = require('path');
const prisma = require('./prismaClient');

const fetch = require("node-fetch");
const FINNHUB_API_KEY = "d2mgubhr01qog443m5m0d2mgubhr01qog443m5mg";

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
        datetime: datetime
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
