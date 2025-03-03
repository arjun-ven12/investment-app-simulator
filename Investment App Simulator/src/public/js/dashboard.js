document.addEventListener('DOMContentLoaded', async () => {
    const categoryIds = {
        important: 'important-list',
        hotAndTrending: 'hotAndTrending-list',
        mostViewed: 'mostViewed-list',
        featured: 'featured-list',
        bookmarks: 'bookmarks-list',
    };

    const restrictedCategories = ['featured-list', 'mostViewed-list', 'hotAndTrending-list'];
    let selectedTags = new Set(); // Track selected tags for filtering
    const allTags = ['Breaking', 'Crypto', 'Advice', 'Biography', 'Local']; // List of all tags

    // Fetch news data from the server or database
    async function fetchNews() {
        try {
            const response = await fetch('/dashboard/news');
            if (!response.ok) throw new Error('Failed to fetch news data.');
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    // Update the category of a news item
    async function updateCategory(newsId, newCategory) {
        try {
            const response = await fetch(`/dashboard/news/${newsId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    news_id: newsId,
                    category: newCategory,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to update news category: ${errorData.error}`);
            }

            console.log(`News item ${newsId} updated to category: ${newCategory}`);
        } catch (error) {
            console.error('Error updating news category:', error);
        }
    }

    // Render news items dynamically
    async function renderNews(filterTags = []) {
        const newsItems = await fetchNews();
    
        // Update tag counts based on the news data
        updateTagCounts(newsItems);
    
        // Clear existing news items
        Object.values(categoryIds).forEach((id) => {
            const taskList = document.getElementById(id);
            if (taskList) taskList.innerHTML = '';
        });
    
        // Filter news items if tags are selected
        const filteredNews =
            filterTags.length > 0
                ? newsItems.filter((news) => news.tags.some((tag) => filterTags.includes(tag)))
                : newsItems;
    
        filteredNews.forEach((news) => {
            const { news_id, image_url, title, caption, tags, category } = news;
            const taskListId = categoryIds[category];
    
            if (!taskListId) {
                console.warn(`Unknown category: ${category}`);
                return;
            }
    
            const taskList = document.getElementById(taskListId);
            if (taskList) {
                const task = document.createElement('div');
                task.classList.add('task');
                task.setAttribute('draggable', 'true');
                task.dataset.id = news_id;
    
                // Generate tags dynamically
                const tagsHTML = tags
                    .map((tag) => `<span class="tag ${tag.toLowerCase()}" data-tag="${tag}">${tag}</span>`)
                    .join('');
    
                task.innerHTML = `
                    <img src="${image_url}" alt="${title}" class="news-image">
                    <h2>${title}</h2>
                    <div class="divider"></div>
                    <i>${caption}</i>
                    <div class="tags-container">${tagsHTML}</div>
                `;
                taskList.appendChild(task);
            }
        });
    
        attachTagEventListeners(); 
        updateCounters();
        initializeDragAndDrop();
    }

    // Render filter selection area
    function renderFilterSelectionArea(allTags) {
        const filterContainer = document.createElement('div');
        filterContainer.classList.add('filter-container');
    
        // Create a title for the filter section
        const filterTitle = document.createElement('h3');
        filterTitle.textContent = 'Filter by Tags';
        filterTitle.classList.add('filter-title');
        filterContainer.appendChild(filterTitle);
    
        // Create a tag filter area
        const tagSelectionArea = document.createElement('div');
        tagSelectionArea.classList.add('tag-selection-area');
    
        // Add all tags as buttons for filtering with initial count of 0
        allTags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.classList.add('tag', 'filter-tag', tag.toLowerCase());
            tagButton.dataset.tag = tag;
    
            // Wrap tag name and count
            tagButton.innerHTML = `
                ${tag} <span class="tag-count" data-count-tag="${tag}" style="color: #aaaaaa;">(0)</span>
            `;
    
            // Attach click listener for toggling selection
            tagButton.addEventListener('click', () => {
                if (selectedTags.has(tag)) {
                    selectedTags.delete(tag);
                    tagButton.classList.remove('selected');
                } else {
                    selectedTags.add(tag);
                    tagButton.classList.add('selected');
                }
                debouncedRenderNews([...selectedTags]); // Use debounced render
            });
    
            tagSelectionArea.appendChild(tagButton);
        });
    
        filterContainer.appendChild(tagSelectionArea);
    
        // Add a clear selection button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Filters';
        clearButton.classList.add('clear-button');
        clearButton.addEventListener('click', clearSelectedTags);
        filterContainer.appendChild(clearButton);
    
        // Insert the filter container above the board
        const board = document.querySelector('.board');
        board.parentNode.insertBefore(filterContainer, board);
    }

    function updateTagCounts(newsItems) {
        const tagCounts = {}; // Map to store tag counts
    
        // Count occurrences of each tag in the news items
        newsItems.forEach(news => {
            news.tags.forEach(tag => {
                if (!tagCounts[tag]) {
                    tagCounts[tag] = 0;
                }
                tagCounts[tag]++;
            });
        });
    
        // Update counts in the filter area
        const allTagElements = document.querySelectorAll('.tag-count');
        allTagElements.forEach(tagElement => {
            const tag = tagElement.dataset.countTag;
            const count = tagCounts[tag] || 0;
            tagElement.textContent = `(${count})`;
        });
    }
    
    // Debounce Function
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    const debouncedRenderNews = debounce(renderNews, 200);

    // Attach event listeners to tags within news items
    function attachTagEventListeners() {
        const oldTags = document.querySelectorAll('.tag');
        oldTags.forEach(tag => {
            const newTag = tag.cloneNode(true);
            tag.parentNode.replaceChild(newTag, tag);
        });

        const newTags = document.querySelectorAll('.tag');
        newTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const tagName = tag.dataset.tag;
                if (selectedTags.has(tagName)) {
                    selectedTags.delete(tagName); // Deselect tag
                    tag.classList.remove('selected');
                } else {
                    selectedTags.add(tagName); // Select tag
                    tag.classList.add('selected');
                }

                debouncedRenderNews([...selectedTags]); // Use debounced version
            });
        });
    }

    // Clear selected tags
    function clearSelectedTags() {
        selectedTags.clear();
        document.querySelectorAll('.tag.selected').forEach((tag) => {
            tag.classList.remove('selected');
        });
        renderNews(); // Render all news items
    }

    // Initialize counters for each category
    function initializeCounters() {
        Object.keys(categoryIds).forEach((category) => {
            const section = document.getElementById(category);
            const counter = document.createElement('span');
            counter.classList.add('counter');
            counter.id = `${category}-counter`;
            counter.textContent = '(0)';
            section.querySelector('h2').appendChild(counter);
        });
    }

    function updateCounters() {
        Object.keys(categoryIds).forEach((category) => {
            const taskList = document.getElementById(categoryIds[category]);
            const counter = document.getElementById(`${category}-counter`);
            if (taskList && counter) {
                const taskCount = taskList.children.length;
                counter.textContent = `(${taskCount})`;
            }
        });
    }

    // Initialize drag-and-drop functionality
    function initializeDragAndDrop() {
        const tasks = document.querySelectorAll('.task');
        const taskLists = document.querySelectorAll('.task-list');

        tasks.forEach((task) => {
            task.addEventListener('dragstart', dragStart);
            task.addEventListener('dragend', dragEnd);
        });

        taskLists.forEach((taskList) => {
            taskList.addEventListener('dragover', dragOver);
            taskList.addEventListener('dragenter', dragEnter);
            taskList.addEventListener('dragleave', dragLeave);
            taskList.addEventListener('drop', drop);
        });

        function dragStart() {
            this.classList.add('dragging');
        }

        function dragEnd() {
            this.classList.remove('dragging');
        }

        function dragOver(e) {
            e.preventDefault();
        }

        function dragEnter(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        }

        function dragLeave() {
            this.classList.remove('drag-over');
        }

        async function drop() {
            this.classList.remove('drag-over');
            const task = document.querySelector('.dragging');
        
            if (!task) {
                console.error('Dragged task not found.');
                return;
            }
        
            const sourceList = task.closest('.task-list').id;
            const targetList = this.id;
        
            // Check if the source and target are restricted
            if (restrictedCategories.includes(sourceList) && restrictedCategories.includes(targetList)) {
                const errorMessage = 'Cannot move items between restricted categories.';
                console.error(errorMessage);
                alert(errorMessage); // Classic popup for the user
                return;
            }
        
            const newsId = task.dataset.id;
            if (!newsId) {
                console.error('news_id is missing from the task.');
                return;
            }
        
            const newCategory = Object.keys(categoryIds).find((key) => categoryIds[key] === this.id);
            if (!newCategory) {
                console.warn('Invalid category detected.');
                return;
            }
        
            console.log('Dropping item with: ', { newsId, newCategory });
            this.appendChild(task);
        
            try {
                await updateCategory(newsId, newCategory);
                updateCounters(); // Real-time counter update after drop
            } catch (error) {
                console.error('Failed to update the category:', error);
            }
        }
        
    }

    // Initialize everything
    renderFilterSelectionArea(allTags);
    initializeCounters();
    renderNews();
});

const logoutButton = document.getElementById("logoutButton");
  
// Logout functionality
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear authentication token
    alert("You have been logged out.");
    window.location.href = "./login.html";
});