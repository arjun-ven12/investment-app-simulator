const blogModel = require("../models/Blog");

// Fetch all blog posts with comments
module.exports.getAllPosts = async (req, res) => {
    try {
        const posts = await blogModel.getAllPosts();
        res.status(200).json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ error: "Failed to fetch posts." });
    }
};

// Fetch a single post by ID
module.exports.getPostById = async (req, res) => {
    const { post_id } = req.params;
    
    try {
        const post = await blogModel.getPostById(post_id);
        if (!post) return res.status(404).json({ error: "Post not found." });

        res.status(200).json(post);
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).json({ error: "Failed to fetch post." });
    }
};

// Create a new blog post
module.exports.createPost = async (req, res) => {
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
        return res.status(400).json({ error: "User ID, title, and content are required." });
    }

    try {
        const newPost = await blogModel.createPost(user_id, title, content);
        res.status(201).json(newPost);
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ error: "Failed to create post." });
    }
};

// Add a comment to a blog post
module.exports.addComment = async (req, res) => {
    const { post_id } = req.params;
    const { user_id, comment } = req.body;

    if (!user_id || !comment) {
        return res.status(400).json({ error: "User ID and comment are required." });
    }

    try {
        const newComment = await blogModel.addComment(post_id, user_id, comment);
        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ error: "Failed to add comment." });
    }
};

// Delete a blog post
module.exports.deletePost = async (req, res) => {
    const { post_id } = req.params;
    const { user_id } = req.body; 
    
    if (!user_id) {
        return res.status(400).json({ error: "User ID is required to delete a post." });
    }

    try {
        await blogModel.deletePost(post_id, user_id);
        res.status(200).json({ message: "Post deleted successfully." });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(403).json({ error: error.message });
    }
};

// Delete a comment
module.exports.deleteComment = async (req, res) => {
        const { comment_id } = req.params; // Extract comment ID from URL
        const { user_id } = req.body; // Extract user ID from request body

        if (!user_id) {
            return res.status(400).json({ error: "User ID is required." });
        }

        try {
            await blogModel.deleteComment(comment_id, parseInt(user_id));
            return res.status(200).json({ message: "Comment deleted successfully." });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }


// Update a blog post (only if the user is the owner)
module.exports.updatePost = async (req, res) => {
    const { post_id } = req.params;
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
        return res.status(400).json({ error: "User ID, title, and content are required." });
    }

    try {
        const updatedPost = await blogModel.updatePost(post_id, user_id, title, content);
        res.status(200).json({ message: "Post updated successfully.", post: updatedPost });
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(403).json({ error: error.message });
    }
};


// Update a comment (only if the user is the owner)
module.exports.updateComment = async (req, res) => {
    const { comment_id } = req.params;
    const { user_id, comment } = req.body;

    if (!user_id || !comment) {
        return res.status(400).json({ error: "User ID and new comment are required." });
    }

    try {
        const updatedComment = await blogModel.updateComment(comment_id, user_id, comment);
        res.status(200).json({ message: "Comment updated successfully.", comment: updatedComment });
    } catch (error) {
        console.error("Error updating comment:", error);
        res.status(403).json({ error: error.message });
    }
};