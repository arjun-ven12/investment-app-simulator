document.addEventListener('DOMContentLoaded', () => {
    const postsContainer = document.getElementById('posts-container');
    const newPostForm = document.getElementById('new-post-form');
    const userId = parseInt(localStorage.getItem('userId'), 10) || null;
    const username = localStorage.getItem('username');

    async function fetchPosts() {
        try {
            const response = await fetch("/api/blog/posts");
            const posts = await response.json();
            postsContainer.innerHTML = "";

            posts.forEach((post) => {
                const postAuthor = post.user ? post.user.username : "Unknown";
                const postElement = createPostElement(post.id, post.title, post.content, postAuthor, post.user.id, post.BlogComment);
                postsContainer.insertBefore(postElement, postsContainer.firstChild);
            });
        } catch (error) {
            console.error("Error fetching posts:", error);
        }
    }

    function createPostElement(postId, title, content, author, postOwnerId, comments = []) {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post');
        postDiv.dataset.postId = postId;
    
        postDiv.innerHTML = `
            <h3 class="post-title">${title}</h3>
            <p class="post-content">${content}</p>
            <p class="post-author">Posted by: ${author}</p>
            <div class="post-buttons">
                <button class="toggle-comments-btn">Comments</button>
                ${userId === postOwnerId ? `
                    <button class="edit-post-btn">Edit</button>
                    <button class="delete-post-btn">Delete</button>
                ` : ""}
            </div>
            <div class="comments-section" style="display: none;">
                <h4>Comments</h4>
                <div class="comments-list">
                    ${comments.length > 0 ? comments.map(
                        (comment) => `
                            <div class="comment" data-comment-id="${comment.id}">
                                <strong>${comment.user ? comment.user.username : "Anonymous"}:</strong> 
                                <span class="comment-text">${comment.comment}</span>
                                ${userId === comment.user_id ? `
                                <br>
                                    <button class="edit-comment-btn">Edit</button>
                                    <button class="delete-comment-btn">Delete</button>
                                ` : ""}
                            </div>`
                    ).join("") : "<p>No comments yet.</p>"}
                </div>
                <form class="new-comment-form">
                    <input type="text" class="comment-text" placeholder="Your comment" required>
                    <button type="submit">Add Comment</button>
                </form>
            </div>
        `;
        postDiv.querySelector(".post-buttons").style.display = "flex";
        postDiv.querySelector(".post-buttons").style.gap = "10px";

        postDiv.querySelector(".toggle-comments-btn").addEventListener("click", (e) => {
            e.preventDefault();
            const commentsSection = postDiv.querySelector(".comments-section");
            commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
        });

        const commentForm = postDiv.querySelector('.new-comment-form');
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const commentInput = commentForm.querySelector('.comment-text');
            const commentText = commentInput.value.trim();

            if (!userId) {
                alert("You must be logged in to comment.");
                return;
            }
            if (commentText) {
                await addComment(postId, userId, commentText);
                commentInput.value = "";
                fetchPosts();
            }
        });

        postDiv.addEventListener("click", async (e) => {
            if (e.target.classList.contains("edit-comment-btn")) {
                const commentElement = e.target.closest(".comment");
                const commentId = commentElement.dataset.commentId;
                const commentText = commentElement.querySelector(".comment-text").innerText;
                
                commentElement.innerHTML = `
                    <input type="text" class="edit-comment-input" value="${commentText}" />
                    <button class="save-comment-btn" data-comment-id="${commentId}">Save</button>
                    <button class="cancel-comment-btn">Cancel</button>
                `;
            }
        
            if (e.target.classList.contains("save-comment-btn")) {
                const commentId = e.target.dataset.commentId;
                const newCommentText = document.querySelector(".edit-comment-input").value.trim();
                
                if (newCommentText) {
                    await updateComment(commentId, userId, newCommentText);
                    fetchPosts();
                } else {
                    alert("Comment cannot be empty.");
                }
            }
        
            if (e.target.classList.contains("cancel-comment-btn")) {
                fetchPosts();
            }

            if (e.target.classList.contains("delete-comment-btn")) {
                const commentElement = e.target.closest(".comment");
                const commentId = commentElement.dataset.commentId;
                
                if (confirm("Are you sure you want to delete this comment?")) {
                    await deleteComment(commentId, userId);
                    fetchPosts();
                }
            }
        });

        if (userId === postOwnerId) {
            postDiv.querySelector(".edit-post-btn").addEventListener("click", () => {
                enterEditMode(postDiv, postId, title, content);
            });
            postDiv.querySelector(".delete-post-btn").addEventListener("click", async () => {
                if (confirm("Are you sure you want to delete this post?")) {
                    await deletePost(postId, userId);
                    fetchPosts();
                }
            });
        }
        return postDiv;
    }
    
    async function deletePost(postId, userId) {
        try {
            const response = await fetch(`/api/blog/posts/${postId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: Number(userId) })
            });
    
            const data = await response.json();
            if (response.ok) {
                alert("Post deleted successfully!");
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error deleting post:", error);
        }
    }
    
    function enterEditMode(postElement, postId, currentTitle, currentContent) {
        postElement.innerHTML = `
            <input type="text" class="edit-title themed-input" value="${currentTitle}" />
            <textarea class="edit-content themed-textarea">${currentContent}</textarea>
            <button class="save-edit-btn themed-button">Save</button>
            <button class="cancel-edit-btn themed-cancel">Cancel</button>
        `;

        postElement.querySelector(".save-edit-btn").addEventListener("click", async () => {
            const newTitle = postElement.querySelector(".edit-title").value.trim();
            const newContent = postElement.querySelector(".edit-content").value.trim();

            if (newTitle && newContent) {
                await updatePost(postId, userId, newTitle, newContent);
                fetchPosts();
            } else {
                alert("Title and content cannot be empty.");
            }
        });

        postElement.querySelector(".cancel-edit-btn").addEventListener("click", fetchPosts);
    }

    async function updatePost(postId, userId, title, content) {
        try {
            const response = await fetch(`/api/blog/posts/${postId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: Number(userId), title, content }),
            });

            const data = await response.json();
            if (response.ok) {
                alert("Post updated successfully!");
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error updating post:", error);
        }
    }

    async function updateComment(commentId, userId, newComment) {
        try {
            const response = await fetch(`/api/blog/comments/${commentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: Number(userId), comment: newComment }),
            });

            const data = await response.json();
            if (response.ok) {
                alert("Comment updated successfully!");
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error updating comment:", error);
        }
    }

    async function deleteComment(commentId, userId) {
        try {
            const response = await fetch(`/api/blog/comments/${commentId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: Number(userId) }),
            });
    
            const data = await response.json();
            if (response.ok) {
                alert("Comment deleted successfully!");
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    }

    async function addComment(postId, user_id, comment) {
        try {
            await fetch(`/api/blog/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: Number(user_id), comment }),
            });
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    }

    newPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('post-title');
        const contentInput = document.getElementById('post-content');
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!userId) {
            alert("You must be logged in to post.");
            return;
        }

        if (title && content) {
            try {
                await fetch("/api/blog/posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: Number(userId), title, content }),
                });
                newPostForm.reset();
                fetchPosts();
            } catch (error) {
                console.error("Error creating post:", error);
            }
        }
    });

    fetchPosts();
});
