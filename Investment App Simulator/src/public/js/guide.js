const GUIDE_ID = 1;

async function fetchGuideById(guideId) {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const res = await fetch(`/guides/${guideId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) return data.guide;
        else {
            console.error("Failed to fetch guide:", data.message);
            return null;
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function fetchGuide() {
    const guide = await fetchGuideById(GUIDE_ID);
    if (guide) renderGuide(guide);
}

// Render guide dynamically
function renderGuide(guide) {
    document.getElementById('guide-title').innerText = guide.title;
    const container = document.getElementById('guide-content');
    container.innerHTML = '';

    guide.content.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'section';

        const headingEl = document.createElement('div');
        headingEl.className = 'section-heading';
        headingEl.innerHTML = `<span>${section.heading}</span> <span class="toggle-btn">►</span>`;


        const contentEl = document.createElement('div');
        contentEl.className = 'section-content';

        section.content.forEach(item => {
            if (item.type === 'text') {
                const p = document.createElement('p');
                p.textContent = item.text;
                contentEl.appendChild(p);
            } else if (item.type === 'subheading') {
                const sub = document.createElement('p');
                sub.textContent = item.text;
                sub.className = 'subheading';
                contentEl.appendChild(sub);
            } else if (item.type === 'list') {
                if (item.title) {
                    const sub = document.createElement('p');
                    sub.textContent = item.title;
                    sub.className = 'subheading';
                    contentEl.appendChild(sub);
                }
                const ul = document.createElement('ul');
                item.items.forEach(liText => {
                    const li = document.createElement('li');
                    li.textContent = liText;
                    ul.appendChild(li);
                });
                contentEl.appendChild(ul);
            }
        });
        headingEl.addEventListener('click', () => {
            const isOpen = contentEl.classList.contains('show');
            contentEl.classList.toggle('show');
            headingEl.classList.toggle('active');

            // Switch arrow symbols instead of rotating +
            headingEl.querySelector('.toggle-btn').textContent = isOpen ? '►' : '▼';
        });


        sectionEl.appendChild(headingEl);
        sectionEl.appendChild(contentEl);
        container.appendChild(sectionEl);
    });
}

// Load guide
fetchGuide();
