const newsModel = require('../models/news');

const { Parser } = require('json2csv');
//////////////////////////////////////////////////////
// GET NEWS CONTROLLER
//////////////////////////////////////////////////////

module.exports.getNewsController = async function(req, res) {
  const { category, minId } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const newsList = await newsModel.getMarketNewsWithUserLikes(userId, category, minId);
    return res.status(200).json({ success: true, news: newsList }); // <--- wrap in success + news
  } catch (error) {
    console.error(error);

    if (error.message === 'Category is required') {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// CREATE BOOKMARKS
//////////////////////////////////////////////////////
module.exports.bookmarkNewsController = async function(req, res) {
  const { userId, newsData } = req.body;

  if (!userId || !newsData) {
    return res.status(400).json({ error: "userId and newsData are required" });
  }

  try {
    const result = await newsModel.bookmarkNews(userId, newsData);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, bookmark: result.bookmark });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET BOOKMARKS
//////////////////////////////////////////////////////
module.exports.getUserBookmarksController = async function(req, res) {
    const userId = req.user.id; // Get userId from JWT middleware

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const bookmarks = await newsModel.getUserBookmarks(parseInt(userId));
        return res.status(200).json({ success: true, bookmarks });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

//////////////////////////////////////////////////////
// DELETE BOOKMARKS
//////////////////////////////////////////////////////
module.exports.removeBookmarkController = async function (req, res) {
  const bookmarkId = parseInt(req.params.id);
  const userId = req.user.id; // comes from jwtMiddleware

  if (!bookmarkId) {
    return res.status(400).json({ success: false, message: "Bookmark ID is required" });
  }

  try {
    const result = await newsModel.deleteUserBookmark(bookmarkId, userId);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    if (error.message === "Bookmark not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Not authorized to remove this bookmark") {
      return res.status(403).json({ success: false, message: error.message });
    }
    console.error("Error removing bookmark:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// POST /news/like
module.exports.likeNewsController = async function(req, res) {
    const userId = req.user.id; // from JWT
    const newsData = req.body.newsData;

    try {
        const result = await newsModel.toggleLikeNews(userId, newsData);
        if (!result.success) return res.status(400).json(result);
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /news/like/:newsId
module.exports.unlikeNewsController = async function(req, res) {
    const userId = req.user.id;
    const newsId = parseInt(req.params.newsId);

    try {
        const result = await newsModel.unlikeNews(userId, newsId);
        if (!result.success) return res.status(400).json(result);
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /news/like/:newsId
module.exports.getNewsLikesController = async function(req, res) {
    const newsId = parseInt(req.params.newsId);

    try {
        const likes = await newsModel.getNewsLikes(newsId);
        return res.status(200).json({ success: true, likes });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /news/likes (user's likes)
module.exports.getUserLikesController = async function(req, res) {
    const userId = req.user.id;

    try {
        const likes = await newsModel.getUserLikes(userId);
        return res.status(200).json({ success: true, likes });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


module.exports.getCategoriesController = async function (req, res) {
  try {
    const categories = await newsModel.getCategories();
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports.getNewsLikesSummaryController = async function(req, res) {
  const userId = req.user?.id; // optional

  try {
    const newsLikes = await newsModel.getNewsLikesSummary(userId ? parseInt(userId) : null);
    return res.status(200).json({ success: true, newsLikes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};