const urlParams = new URLSearchParams(window.location.search);
const GUIDE_ID = urlParams.get("id");

// ----------------------
// Fetch Guide Data
// ----------------------
async function fetchGuideById(guideId) {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await fetch(`/guides/${guideId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.success ? data.guide : null;
  } catch (err) {
    console.error("Error fetching guide:", err);
    return null;
  }
}

// ----------------------
// Initialize Rendering
// ----------------------
async function fetchGuide() {
  if (!GUIDE_ID) {
    document.getElementById("guide-title").innerText = "Missing Guide ID";
    return;
  }

  const guide = await fetchGuideById(GUIDE_ID);
  if (guide) renderGuide(guide);
}

// ----------------------
// Render Dynamic Guide
// ----------------------
function renderGuide(guide) {
  const titleEl = document.getElementById("guide-title");
  const container = document.getElementById("guide-content");

  titleEl.innerText = guide.title;
  container.innerHTML = "";

  guide.content.forEach((section) => {
    const node = document.createElement("div");
    node.className = "roadmap-section";

    const heading = document.createElement("h2");
    heading.textContent = section.heading;
    node.appendChild(heading);

    section.content.forEach((item) => {
      if (item.type === "text") {
        const p = document.createElement("p");
        p.textContent = item.text;
        node.appendChild(p);
      } else if (item.type === "subheading") {
        const sub = document.createElement("p");
        sub.classList.add("subheading");
        sub.textContent = item.text;
        node.appendChild(sub);
      } else if (item.type === "list") {
        if (item.title) {
          const t = document.createElement("p");
          t.classList.add("subheading");
          t.textContent = item.title;
          node.appendChild(t);
        }
        const ul = document.createElement("ul");
        item.items.forEach((liText) => {
          const li = document.createElement("li");
          li.textContent = liText;
          ul.appendChild(li);
        });
        node.appendChild(ul);
      }
    });

    container.appendChild(node);
  });

  setupScrollAnimations();
}

// ----------------------
// Scroll Animations
// ----------------------
function setupScrollAnimations() {
  const scrollLabel = document.querySelector(".scroll-label");
  const sections = document.querySelectorAll(".roadmap-section");

  // Section fade-in observer
  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.3 }
  );

  // Scroll label + node glow observer
  const labelObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const heading = el.querySelector("h2");

        if (entry.isIntersecting) {
          // ✨ Animate label swap
          if (heading) {
            scrollLabel.classList.remove("swap-in");
            scrollLabel.classList.add("swap-out");

            setTimeout(() => {
              scrollLabel.textContent = heading.textContent;
              scrollLabel.classList.remove("swap-out");
              scrollLabel.classList.add("swap-in");
            }, 300); // delay = matches CSS fade-out duration
          }

          // Activate glowing node
          el.classList.add("active-node");
        } else {
          el.classList.remove("active-node");
        }
      });
    },
    { threshold: 0.6 }
  );

  sections.forEach((sec) => {
    fadeObserver.observe(sec);
    labelObserver.observe(sec);
  });

  // Hide label near top/bottom for elegance
  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    if (scrollY < 100 || scrollY > maxScroll - 200) {
      scrollLabel.classList.remove("swap-in");
    }
  });
}

// ----------------------
// Start Rendering
// ----------------------
fetchGuide();
