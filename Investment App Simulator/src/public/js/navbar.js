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
      checkTokenExpiry();       // 🔥 NEW: auto logout if expired
      scheduleTokenExpiry();    // 🔥 NEW: auto logout when expiry time arrives
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
    profileBtn?.classList.remove("d-none");
    logoutBtn?.classList.remove("d-none");

    buttonsToToggle.forEach(id =>
      document.getElementById(id)?.classList.remove("d-none")
    );

    loginBtn?.classList.add("d-none");
    registerBtn?.classList.add("d-none");
  } else {
    profileBtn?.classList.add("d-none");
    logoutBtn?.classList.add("d-none");

    buttonsToToggle.forEach(id =>
      document.getElementById(id)?.classList.add("d-none")
    );

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
    autoLogout();
  });
}

/* -----------------------------
   AUTO-LOGOUT FUNCTION
--------------------------------*/
function autoLogout() {
  localStorage.clear();
  window.location.href = "/login";
}

/* -----------------------------
   JWT DECODER
--------------------------------*/
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/* -----------------------------
   CHECK IF TOKEN IS ALREADY EXPIRED
--------------------------------*/
function checkTokenExpiry() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const payload = decodeToken(token);
  if (!payload || !payload.exp) return;

  const now = Date.now() / 1000;
  if (payload.exp < now) {
    console.log("⚠️ Token expired — auto logging out.");
    autoLogout();
  }
}

/* -----------------------------
   SCHEDULE AUTO-LOGOUT AT EXPIRY TIME
--------------------------------*/
function scheduleTokenExpiry() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const payload = decodeToken(token);
  if (!payload || !payload.exp) return;

  const msUntilExpiry = payload.exp * 1000 - Date.now();

  if (msUntilExpiry > 0) {
    console.log("⏱️ Auto-logout scheduled in", msUntilExpiry / 1000, "seconds");
    setTimeout(() => {
      console.log("⚠️ Token expired — auto logging out.");
      autoLogout();
    }, msUntilExpiry);
  } else {
    autoLogout();
  }
}
