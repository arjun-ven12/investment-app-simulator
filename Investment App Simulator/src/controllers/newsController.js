const newsModel = require('../models/news');

const { Parser } = require('json2csv');

module.exports.getNewsController = function (req, res) {
    const { category, minId } = req.query;

    newsModel.getMarketNews(category, minId)
        .then(newsList => {
            return res.status(200).json(newsList);
        })
        .catch(error => {
            console.error(error);

            if (error.message === 'Category is required') {
                return res.status(400).json({ error: error.message });
            }

            return res.status(500).json({ error: error.message });
        });
};


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