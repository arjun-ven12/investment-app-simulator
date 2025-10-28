let socket = null;
async function fetchAllGuides() {
  const token = localStorage.getItem("token");
  if (!token) return [];

  try {
    const res = await fetch("/guides", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success) return data.guides;
    else {
      console.error("Failed to fetch guides:", data.message);
      return [];
    }
  } catch (err) {
    console.error(err);
    return [];
  }
}

function renderGuides(guides) {
  const list = document.getElementById("guides-list");
  list.innerHTML = "";

  guides.forEach(guide => {
    // Take first heading + maybe first text as preview
    const firstSection = guide.content?.[0];
    const preview = firstSection?.content?.find(c => c.type === "text")?.text || "";

    const card = document.createElement("div");
    card.className = "guide-card";
    card.innerHTML = `
      <h2 class="guide-title">${guide.title}</h2>
      <p class="guide-preview">${preview.substring(0, 120)}...</p>
      <button class="view-btn">Read More →</button>
    `;

    card.querySelector(".view-btn").addEventListener("click", () => {
      window.location.href = `guide.html?id=${guide.id}`;
    });

    list.appendChild(card);
  });
}

async function init() {
  const guides = await fetchAllGuides();
  renderGuides(guides);
}

init();
