// ============================================================
// BlackSealed — Cinematic Timeline + Grid
// ============================================================

let guidesData = [];
let activeIndex = 0;

// -------------------- Fetch Guides --------------------
async function fetchAllGuides() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("⚠️ No token found — using demo guides.");
    return [
      {
        id: 1,
        title: "Understanding Stocks & Market Basics",
        description: "An introduction to equity markets.",
        watermark: "Stocks",
      },
      {
        id: 2,
        title: "Exploring Bonds & Fixed Income",
        description: "The foundation of stable investing.",
        watermark: "Bonds",
      },
      {
        id: 3,
        title: "ETF Strategies & Diversification",
        description: "How ETFs improve portfolio balance.",
        watermark: "ETFs",
      },
      {
        id: 4,
        title: "Advanced Derivatives & Risk",
        description: "Options, futures, and institutional hedging.",
        watermark: "Options",
      },
      {
        id: 5,
        title: "Behavioral Finance & Decision Bias",
        description: "Understand investor psychology.",
        watermark: "Behavior",
      },
      {
        id: 6,
        title: "Portfolio Management",
        description: "Construct and rebalance like a pro.",
        watermark: "Portfolio",
      },
    ];
  }

  try {
    const res = await fetch("/guides", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.success ? data.guides : [];
  } catch (err) {
    console.error("❌ Error fetching guides:", err);
    return [];
  }
}

// -------------------- Render Timeline --------------------
function renderGuides(guides = []) {
  guidesData = guides;
  const container = document.getElementById("timeline-nodes");
  const detail = document.getElementById("timeline-detail");
  const line = document.querySelector(".timeline-line");

  if (!container || !detail || !line) return;
  container.innerHTML = "";

  if (!guides.length) {
    detail.innerHTML = `<p style="opacity:0.7;">No guides available.</p>`;
    return;
  }

  guides.forEach((g, i) => {
    const node = document.createElement("div");
    node.className = "timeline-node";
    node.title = g.title;
    node.dataset.index = i;
    node.addEventListener("click", () => setActiveGuide(i));
    container.appendChild(node);
  });

  setActiveGuide(0);
  setupTimelineNavigation();
}

// -------------------- Active Guide --------------------
function setActiveGuide(i) {
  const nodes = document.querySelectorAll(".timeline-node");
  const detail = document.getElementById("timeline-detail");
  if (!nodes[i]) return;

  activeIndex = i;
  nodes.forEach((n, idx) => n.classList.toggle("active", idx === i));
  updateProgress(i);

  const g = guidesData[i];
  const summary = (
    g.description || "Explore this guide to learn more."
  ).substring(0, 200);

  const darkImages = [
    "https://images.unsplash.com/photo-1493673272479-a20888bcee10?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1706913449506-533b4906c411?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1606764765380-105d13e2918b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1568096349182-081e3ae1c235?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1620722413524-01b4b25e8c2a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1694724892682-cd4c1f429e0f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1574768101480-6ef23a7bbda1?auto=format&fit=crop&w=1200&q=80",
  ];
  const bg = darkImages[i % darkImages.length];

  detail.classList.remove("show");
  setTimeout(() => {
detail.innerHTML = `
  <a href="/guide?id=${g.id}" class="detail-card-link">
    <div class="detail-card" style="--bg:url('${bg}')">
      <h3>${String(i + 1).padStart(2, "0")} ${g.title}</h3>
      <p>${summary}...</p>
      <span class="detail-link">Continue Reading</span>
    </div>
  </a>`;
    detail.classList.add("show");
  }, 200);

  shiftRoadmap(i);
}

// -------------------- Timeline Animation --------------------
function shiftRoadmap(index) {
  const container = document.querySelector(".timeline-scroll");
  const nodes = document.querySelectorAll(".timeline-node");
  if (!container || !nodes.length) return;

  const gap = 260;
  const nodeWidth = nodes[0].offsetWidth;
  const totalWidth = (nodes.length - 1) * gap + nodeWidth;
  const viewportWidth = container.clientWidth;

  const nodeCenter = index * gap + nodeWidth / 2;
  let offset = viewportWidth / 2 - nodeCenter;

  const minOffset = viewportWidth - totalWidth;
  const maxOffset = 0;
  offset = Math.max(minOffset, Math.min(offset, maxOffset));

  const nodesWrapper = document.getElementById("timeline-nodes");
  const line = document.querySelector(".timeline-line");
  [nodesWrapper, line].forEach((el) => {
    el.style.transform = `translateY(-50%) translateX(${offset}px)`;
  });

  const bgGlow = document.querySelector(".center-glow");
  if (bgGlow)
    bgGlow.style.transform = `translate(-50%, -50%) scale(1.05) translateX(${
      offset * 0.02
    }px)`;
}

function updateProgress(index) {
  const line = document.querySelector(".timeline-line");
  const nodes = document.querySelectorAll(".timeline-node");
  if (!line || nodes.length === 0) return;

  const firstNode = nodes[0].getBoundingClientRect();
  const lastNode = nodes[nodes.length - 1].getBoundingClientRect();
  const currentNode = nodes[index].getBoundingClientRect();

  const progress =
    ((currentNode.left - firstNode.left) / (lastNode.left - firstNode.left)) *
    100;
  line.style.setProperty(
    "--progress",
    `${Math.min(100, Math.max(0, progress))}%`
  );
}

// -------------------- Grid Rendering --------------------
function renderGridView() {
  const grid = document.getElementById("guides-grid");
  if (!grid) return;

  const darkImages = [
    "https://images.unsplash.com/photo-1493673272479-a20888bcee10?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1706913449506-533b4906c411?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1606764765380-105d13e2918b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1568096349182-081e3ae1c235?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1620722413524-01b4b25e8c2a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1694724892682-cd4c1f429e0f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1574768101480-6ef23a7bbda1?auto=format&fit=crop&w=1200&q=80",
  ];

  grid.innerHTML = guidesData
    .map((g, i) => {
      const title = g.title || "Untitled Guide";
      const desc =
        (Array.isArray(g.content) && g.content[0]?.content?.[0]?.text) ||
        g.description ||
        "Explore this guide to learn more.";
      const img = darkImages[i % darkImages.length];

      return `
  <a href="/guide?id=${g.id}" class="guide-card-link">
    <div class="guide-card" style="--bg-img: url('${img}')">
      <div class="guide-content">
        <h3>${title}</h3>
        <p>${desc.substring(0, 140)}...</p>
        <span class="detail-link">READ MORE</span>
      </div>
    </div>
  </a>
`;
    })
    .join("");
}

// -------------------- View Toggle --------------------
const timelineWrapper = document.querySelector(".timeline-wrapper");
const gridContainer = document.getElementById("guides-grid");
const timelineBtn = document.getElementById("timeline-view");
const gridBtn = document.getElementById("grid-view");

async function switchView(mode) {
  if (mode === "timeline") {
    gridContainer.classList.remove("active");
    gridContainer.style.opacity = 0;

    setTimeout(() => {
      gridContainer.style.display = "none";
      timelineWrapper.style.display = "block";
      timelineWrapper.classList.add("active");
    }, 300);

    timelineBtn.classList.add("active");
    gridBtn.classList.remove("active");
  } else {
    if (!guidesData.length) guidesData = await fetchAllGuides();
    renderGridView();

    timelineWrapper.classList.remove("active");
    timelineWrapper.style.opacity = 0;

    setTimeout(() => {
      timelineWrapper.style.display = "none";
      gridContainer.style.display = "grid";
      gridContainer.classList.add("active");
    }, 300);

    gridBtn.classList.add("active");
    timelineBtn.classList.remove("active");
  }
}

timelineBtn?.addEventListener("click", () => switchView("timeline"));
gridBtn?.addEventListener("click", () => switchView("grid"));

// -------------------- Navigation --------------------
function setupTimelineNavigation() {
  const next = document.getElementById("next-btn");
  const prev = document.getElementById("prev-btn");

  next?.addEventListener("click", () => {
    if (activeIndex < guidesData.length - 1) setActiveGuide(activeIndex + 1);
  });
  prev?.addEventListener("click", () => {
    if (activeIndex > 0) setActiveGuide(activeIndex - 1);
  });
}

// -------------------- Init --------------------
document.addEventListener("DOMContentLoaded", async () => {
  guidesData = await fetchAllGuides();
  renderGuides(guidesData);

  // ✅ Ensure Timeline shows first on load
  if (timelineWrapper) {
    timelineWrapper.style.display = "block";
    timelineWrapper.classList.add("active");
    timelineWrapper.style.opacity = 1;
  }
  if (gridContainer) {
    gridContainer.style.display = "none";
    gridContainer.style.opacity = 0;
  }

  timelineBtn?.classList.add("active");
  gridBtn?.classList.remove("active");
});
