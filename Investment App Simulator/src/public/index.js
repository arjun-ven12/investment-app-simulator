// ============================================================
// BLACKSEALED — Landing Page Interactions
// Starfield · Scroll Reveal · Year · (Simple) Tilt
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. STARFIELD
  const starfield = document.getElementById("starfield");
  if (starfield) {
    const STAR_COUNT = 140;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 2 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 6}s`;
      frag.appendChild(star);
    }
    starfield.appendChild(frag);
  }

  // 2. SCROLL REVEAL
  const revealEls = document.querySelectorAll(".animate-on-scroll");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealEls.forEach((el) => observer.observe(el));

  // 3. FOOTER YEAR
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 4. SIMPLE TILT ON HOVER (mouse-based)
  const tiltEls = document.querySelectorAll(".tilt-on-hover");
  tiltEls.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(700px) rotateX(0deg) rotateY(0deg) translateY(0)";
    });
  });
});
