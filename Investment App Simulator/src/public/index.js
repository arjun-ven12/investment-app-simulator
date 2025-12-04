
// -----------------------------------------
// STARFIELD + PARALLAX (2D, WORKING)
// -----------------------------------------
const canvas = document.getElementById("constellation-canvas");
const ctx = canvas.getContext("2d");

let mouseX = 0.5;
let mouseY = 0.5;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// create stars
const stars = Array.from({ length: 140 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 1.4 + 0.3,
  s: Math.random() * 0.4 + 0.1,
}));

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    // parallax movement
    const px = (mouseX - 0.5) * 15;
    const py = (mouseY - 0.5) * 15;

    ctx.beginPath();
    ctx.arc(star.x + px, star.y + py, star.r, 0, Math.PI * 2);
    const tint = 0.45 + Math.random() * 0.15;
    ctx.fillStyle = `rgba(224,235,255,${tint})`;

    ctx.fill();

    // slow drift
    star.x += star.s * 0.2;
    if (star.x > canvas.width) star.x = 0;
  });

  requestAnimationFrame(render);
}

render();

// mouse parallax
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});
// Smooth scrolling for nav links
document.querySelectorAll('.bs-nav-links a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 90, // offset for navbar
        behavior: "smooth"
      });
    }
  });
});
// Navbar appears only when scrolling
window.addEventListener("scroll", () => {
  const nav = document.querySelector(".bs-nav");
  if (window.scrollY > 50) {
    nav.classList.add("scrolled");
  } else {
    nav.classList.remove("scrolled");
  }
});

// ---------------------------------------------
// AUTO-HIGHLIGHT NAV LINKS ON SCROLL
// ---------------------------------------------
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".bs-nav-links a");

function updateActiveNav() {
    let current = "";

    sections.forEach(sec => {
        const top = sec.offsetTop - 150;
        const bottom = top + sec.offsetHeight;

        if (window.scrollY >= top && window.scrollY < bottom) {
            current = sec.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
        }
    });
}

window.addEventListener("scroll", updateActiveNav);
