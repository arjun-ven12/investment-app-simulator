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
      highlightActiveLink();
    })
    .catch(err => console.error('Error loading navbar:', err));
});

function initNavbar() {
  const toggle = document.getElementById('navbar-toggle');
  const links = document.querySelector('.navbar-links');
  const logoutButton = document.getElementById('logoutButton');

  toggle?.addEventListener('click', () => {
    links.classList.toggle('active');
  });

  // ✅ Session + Username Check
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;

    if (Date.now() > exp) {
      alert('Session expired. Please log in again.');
      localStorage.clear();
      window.location.href = '/login';
    } else {
      const username = payload.username || localStorage.getItem('username');
      const navbarUser = document.getElementById('navbar-username');
      if (navbarUser && username) {
        navbarUser.textContent = username;
      }
    }
  } catch (err) {
    console.error('Invalid or malformed token:', err);
    localStorage.clear();
    window.location.href = '/login';
  }

  // ✅ Logout
  logoutButton.style.display = token ? 'block' : 'none';
  logoutButton.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login';
  });
}

function highlightActiveLink() {
  const currentPath = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.navbar-links a');
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath) link.classList.add('active');
    else link.classList.remove('active');
  });
}

window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;
  if (window.scrollY > 40) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
});