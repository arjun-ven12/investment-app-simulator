document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("navbar-container");

  // Load navbar HTML
  fetch("/html/navbar.html")
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      initNavbarToggle();
      initAuthVisibility();
      highlightActiveLink();
      initLogout();
    })
    .catch(err => console.error("Failed to load navbar:", err));
});

/* -----------------------------
   NAVBAR HAMBURGER TOGGLE (Mobile)
--------------------------------*/
function initNavbarToggle() {
  const toggle = document.getElementById("navbar-toggle");
  const links = document.querySelector(".navbar-links");

  toggle?.addEventListener("click", () => {
    links?.classList.toggle("active");
  });
}

/* -----------------------------
   SHOW/HIDE BUTTONS BASED ON LOGIN STATUS
--------------------------------*/
function initAuthVisibility() {
  const token = localStorage.getItem("token");

  const loginBtn = document.getElementById("loginButton");
  const registerBtn = document.getElementById("registerButton");
  const logoutBtn = document.getElementById("logoutButton");
  const profileBtn = document.getElementById("profileButton");

  const buttonsToToggle = [
    "HomeButton",
    "ProgressButton",
    "UserButton",
    "TaskButton",
    "MessageButton"
  ];

  if (token) {
    // Show user-only buttons
    profileBtn?.classList.remove("d-none");
    logoutBtn?.classList.remove("d-none");

    buttonsToToggle.forEach(id =>
      document.getElementById(id)?.classList.remove("d-none")
    );

    // Hide login/register
    loginBtn?.classList.add("d-none");
    registerBtn?.classList.add("d-none");
  } else {
    // Hide logged-in buttons
    profileBtn?.classList.add("d-none");
    logoutBtn?.classList.add("d-none");

    buttonsToToggle.forEach(id =>
      document.getElementById(id)?.classList.add("d-none")
    );

    // Show login/register
    loginBtn?.classList.remove("d-none");
    registerBtn?.classList.remove("d-none");
  }
}

/* -----------------------------
   HIGHLIGHT CURRENT NAVIGATION LINK
--------------------------------*/
function highlightActiveLink() {
  const current = window.location.pathname;

  document.querySelectorAll(".navbar-links a").forEach(link => {
    if (link.getAttribute("href") === current) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/* -----------------------------
   LOGOUT HANDLER
--------------------------------*/
function initLogout() {
  const logoutBtn = document.getElementById("logoutButton");

  logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login";
  });
}
