document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('navbar-container');
    fetch('../html/navbar.html')
        .then(response => {
            if (!response.ok) throw new Error('Navbar HTML not found');
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            initNavbar();
            highlightActiveLink(); // ✅ call here after injecting HTML
        })
        .catch(err => console.error('Error loading navbar:', err));

});

// Navbar initialization with token check
function initNavbar() {
    const toggle = document.getElementById('navbar-toggle');
    const links = document.querySelector('.navbar-links');

    toggle.addEventListener('click', () => {
        links.classList.toggle('active');
    });

    const logoutButton = document.getElementById('logoutButton');
    const token = localStorage.getItem('token');

    // Auto-redirect if no token
    if (!token) {
        window.location.href = '/html/login.html';
    }

    // Hide logout button if no token
    logoutButton.style.display = token ? 'block' : 'none';

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/html/login.html';
    });
}

// Highlight active page
function highlightActiveLink() {
    const currentPath = window.location.pathname.split('/').pop(); // e.g. "home.html"
    const navLinks = document.querySelectorAll('.navbar-links a');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Call after navbar loads
document.addEventListener('DOMContentLoaded', highlightActiveLink);
