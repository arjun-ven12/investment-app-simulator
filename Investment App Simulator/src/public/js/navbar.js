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

// Optional: navbar toggle and logout functionality
function initNavbar() {
    const toggle = document.getElementById('navbar-toggle');
    const links = document.querySelector('.navbar-links');

    toggle.addEventListener('click', () => {
        links.classList.toggle('active');
    });

    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/html/login.html';
    });
}
