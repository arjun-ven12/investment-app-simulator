const express = require('express');
const router = express.Router();

const newsController = require('../controllers/newsController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");


// router.post('/:id/view', chartsController.incrementCommentViewController);
router.get('/news', newsController.getNewsController);

// Bookmark news (only inserts into DB if bookmarked)
router.post('/news/bookmark', newsController.bookmarkNewsController);
router.get('/news/bookmarks', jwtMiddleware.verifyToken, newsController.getUserBookmarksController);
router.delete('/news/bookmark/:id', jwtMiddleware.verifyToken, newsController.removeBookmarkController);

module.exports = router;
