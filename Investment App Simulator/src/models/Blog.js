const prisma = require("./prismaClient");

// Fetch all blog posts with comments
// module.exports.getAllPosts = async () => {
//     return prisma.blogPost.findMany({
//         include: {
//             user: { select: { id, username } }, // Fetch post author details
//             blogComments: {
//                 include: { user: { select: { id, username } } } // Fetch comments with user info
//             }
//         },
//         orderBy: { createdAt: "desc" } // Order by latest post first
//     });
// };
module.exports.getAllPosts = async () => {
    return prisma.blogPost.findMany({
        include: {
            user: { 
                select: { id: true, username: true } 
            },
            BlogComment: {
                include: { 
                    user: { select: { id: true, username: true } },
                },
                orderBy: { created_at: "desc" } // Match the correct column name
            }
        },
        orderBy: { created_at: "desc" } // Match the correct column name
    });
};


// Create a new blog post
module.exports.createPost = async (user_id, title, content) => {
    return prisma.blogPost.create({
        data: { user_id, title, content }
    });
};

// Fetch a single post by ID with comments
module.exports.getPostById = async (post_id) => {
    return prisma.blogPost.findUnique({
        where: { id: parseInt(post_id) },
        include: {
            user: { select: { id, username } },
            blogComments: {
                include: { user: { select: { id, username } } }
            }
        }
    });
};


// Delete a blog post
module.exports.deletePost = async (post_id, user_id) => {
    // Check if the post exists and belongs to the user
    const post = await prisma.blogPost.findUnique({
        where: { id: parseInt(post_id) },
    });

    if (!post) {
        throw new Error("Post not found.");
    }

    if (post.user_id !== user_id) {
        throw new Error("Unauthorized: You can only delete your own posts.");
    }

    // Delete the post
    return prisma.blogPost.delete({
        where: { id: parseInt(post_id) },
    });
};

// Update a blog post (only if the user is the owner)
module.exports.updatePost = async (post_id, user_id, title, content) => {
    // Check if the post belongs to the user
    const post = await prisma.blogPost.findUnique({
        where: { id: parseInt(post_id) },
    });

    if (!post) {
        throw new Error("Post not found.");
    }

    if (post.user_id !== user_id) {
        throw new Error("Unauthorized: You can only edit your own posts.");
    }

    // Update the post
    return prisma.blogPost.update({
        where: { id: parseInt(post_id) },
        data: { title, content, updated_at: new Date() },
    });
};

// Add a comment to a blog post
module.exports.addComment = async (post_id, user_id, comment) => {
    return prisma.blogComment.create({
        data: { post_id: parseInt(post_id), user_id, comment }
    });
};

module.exports.updateComment = async (comment_id, user_id, newComment) => {
    // Check if the comment belongs to the user
    const comment = await prisma.blogComment.findUnique({
        where: { id: parseInt(comment_id) },
    });

    if (!comment) {
        throw new Error("Comment not found.");
    }

    if (comment.user_id !== user_id) {
        throw new Error("Unauthorized: You can only edit your own comments.");
    }

    // Update the comment
    return prisma.blogComment.update({
        where: { id: parseInt(comment_id) },
        data: { 
            comment: newComment, 
            updated_at: new Date() // Track update time
        },
    });
};

module.exports.deleteComment = async (commentId, userId) => {
        // Check if the comment exists and belongs to the user
        const comment = await prisma.blogComment.findUnique({
            where: { id: parseInt(commentId, 10) },
        });

        if (!comment) {
            throw new Error("Comment not found.");
        }

        if (comment.user_id !== userId) {
            throw new Error("Unauthorized: You can only delete your own comments.");
        }

        return prisma.blogComment.delete({
            where: { id: parseInt(commentId, 10) },
        });
    }