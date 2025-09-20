document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('navbar-container');

    fetch('../html/navbar.html')
        .then(response => {
            if (!response.ok) throw new Error('Navbar HTML not found');
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            initNavbar(); // Initialize toggle and logout after injecting
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
