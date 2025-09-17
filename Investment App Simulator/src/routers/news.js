const express = require('express');
const router = express.Router();

const newsController = require('../controllers/newsController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");


// router.post('/:id/view', chartsController.incrementCommentViewController);
router.get('/news', jwtMiddleware.verifyToken, newsController.getNewsController);

// Bookmark news (only inserts into DB if bookmarked)
router.post('/news/bookmark', newsController.bookmarkNewsController);
router.get('/news/bookmarks', jwtMiddleware.verifyToken, newsController.getUserBookmarksController);
router.delete('/news/bookmark/:id', jwtMiddleware.verifyToken, newsController.removeBookmarkController);

// Like / Unlike news
router.post('/news/like', jwtMiddleware.verifyToken, newsController.likeNewsController);
router.delete('/news/like/:newsId', jwtMiddleware.verifyToken, newsController.unlikeNewsController);

// Get likes
router.get('/news/like/:newsId', newsController.getNewsLikesController);
router.get('/news/likes', jwtMiddleware.verifyToken, newsController.getUserLikesController);

router.get('/categories', newsController.getCategoriesController);
router.get('/news/likes/summary', jwtMiddleware.verifyToken, newsController.getNewsLikesSummaryController);

// Views
router.post('/news/view', jwtMiddleware.verifyToken, newsController.incrementNewsViewController);
router.get('/news/views/:newsId', newsController.getNewsViewsController);


module.exports = router;
