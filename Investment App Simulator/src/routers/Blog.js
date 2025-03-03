const express = require("express");
const blogController = require("../controllers/blogController");

const router = express.Router();

router.get("/posts", blogController.getAllPosts);
router.get("/posts/:post_id", blogController.getPostById);
router.post("/posts", blogController.createPost);
router.put("/posts/:post_id", blogController.updatePost);
router.delete("/posts/:post_id", blogController.deletePost);
router.post("/posts/:post_id/comments", blogController.addComment);
router.put("/comments/:comment_id", blogController.updateComment);
router.delete("/comments/:comment_id", blogController.deleteComment);

module.exports = router;
