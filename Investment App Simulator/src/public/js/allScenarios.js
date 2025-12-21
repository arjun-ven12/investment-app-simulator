// ============================================================
// BLACKSEALED — All Scenarios Logic (Overlay + Globe Integration)
// ============================================================

// -------------------- API Fetch Functions --------------------
function showDeletePopup(message) {
  return new Promise((resolve) => {
    const popup = document.getElementById("delete-popup");
    const text = document.getElementById("delete-popup-text");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    text.textContent = message;
    popup.classList.remove("hidden");

    const cleanup = () => {
      popup.classList.add("hidden");
      yesBtn.onclick = null;
      noBtn.onclick = null;
    };

    yesBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    noBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}
// Fetch all scenarios (All users)
async function fetchAllScenarios() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("⚠️ No auth token found — user may not be logged in.");
    return [];
  }

  try {
    const res = await fetch("/scenarios/all", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`📡 Loaded ${data.scenarios?.length || 0} scenarios from DB`);
    return data.scenarios || [];
  } catch (err) {
    console.error("❌ Failed to load scenarios:", err);
    return [];
  }
}

// Fetch scenarios current user has joined
async function fetchMyScenarios() {
  const token = localStorage.getItem("token");
  if (!token) return [];
  try {
    const res = await fetch("/scenarios/joined", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.success ? data.scenarios : [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Join a scenario
async function joinScenario(id) {
  const token = localStorage.getItem("token");
  if (!token) return alert("Login required");

  try {
    const res = await fetch(`/scenarios/${id}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      console.log(`✅ Joined scenario ${id}`);
      await refreshAllScenariosUI();
      await renderMyScenarios();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error joining scenario");
  }
}

// -------------------- Render Functions --------------------
async function renderScenarios(scenarios) {
  const scenarioList = document.getElementById("scenario-list");
  if (!scenarioList) {
    console.warn("⚠️ scenario-list not found in DOM when rendering (expected if overlay not open yet)");
    return;
  }
 if (window.innerWidth < 768 && mobileList) {
    mobileList.innerHTML = ""; // reset list
    const myIds = (await fetchMyScenarios()).map(s => s.id);

    scenarios.forEach(s => {
      const joined = myIds.includes(s.id);

      const el = document.createElement("div");
      el.className = "mobile-scenario-card";
      el.innerHTML = `
        <h3>${s.title}</h3>
        <p>${s.description}</p>
        <p><strong>Start:</strong> ${new Date(s.startDate).toLocaleDateString()}</p>
        <p><strong>End:</strong> ${new Date(s.endDate).toLocaleDateString()}</p>

        <button class="join-btn ${joined ? "joined" : ""}">
          ${joined ? "Joined" : "Join"}
        </button>
      `;

      const btn = el.querySelector(".join-btn");
      if (!joined) {
        btn.addEventListener("click", async () => {
          await joinScenario(s.id);
          await refreshMobileLists();
        });
      }

      mobileList.appendChild(el);
    });

    return; // prevent desktop overlay rendering
  }
  scenarioList.innerHTML = "";
  const myScenarios = (await fetchMyScenarios()) || [];
  const myScenarioIds = myScenarios.map((s) => s.id);

  if (scenarios.length === 0) {
    scenarioList.innerHTML = "<p>No scenarios available.</p>";
    return;
  }

  scenarios.forEach((s, index) => {
    const participating = myScenarioIds.includes(s.id || index);
    const card = document.createElement("div");
    card.className = "ongoing-card";

    card.innerHTML = `
      <h3>${s.title}</h3>
      <p>${s.description || ""}</p>
      <div style="display: flex; gap: 20px; margin: 5px 0 15px 0;">
        <span><strong>Start:</strong> ${new Date(s.startDate).toLocaleDateString()}</span>
        <span><strong>End:</strong> ${new Date(s.endDate).toLocaleDateString()}</span>
      </div>
      <div style="display: flex; gap: 20px; margin: 0 0 15px 0;">
        <span><strong>Starting Balance:</strong> $${s.startingBalance?.toLocaleString() || "N/A"}</span>
        <span><strong>Recommended Stocks:</strong> ${s.allowedStocks?.join(", ") || "N/A"}</span>
      </div>
      <p style="color: red; margin-top: 10px;">
        <strong>Rules:</strong> ${typeof s.rules === "string" ? s.rules : s.rules?.note || "N/A"}
      </p>
      <button class="btn">${participating ? "Joined" : "Join"}</button>
    `;

    const btn = card.querySelector(".btn");
    if (!participating) btn.addEventListener("click", () => joinScenario(s.id || index));
    else btn.disabled = true;

    // Fade-in animation
    card.style.opacity = 0;
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "all 0.3s ease";
      card.style.opacity = 1;
      card.style.transform = "translateY(0)";
    }, 50);

    scenarioList.appendChild(card);
  });
  console.log("✅ renderScenarios completed — cards rendered");
}

async function renderMyScenarios(filter = "all") {
  const myPanel = document.getElementById("my-not-started");
  if (!myPanel) return;
  myPanel.innerHTML = "";

  const myScenarios = (await fetchMyScenarios()) || [];
  if (myScenarios.length === 0) {
    myPanel.innerHTML = `
  <div id="emptyState" style="
    text-align: left;
    margin-left: -37px;
    margin-top: 10px;
    color: #E0EBFF;
    font-size: 0.9rem;
    opacity: 0.8;
    transition: all .25s ease;
  ">No scenarios found.</div>
`;
    return;
  }

  const filtered = myScenarios.filter((s) => {
    const status = s.status || s.participantStatus || s.latestAttemptStatus || "NOT_STARTED";
    switch (filter) {
      case "not_started": return status === "NOT_STARTED";
      case "in_progress": return status === "IN_PROGRESS";
      case "completed": return status === "COMPLETED";
      default: return true;
    }
  });

  if (filtered.length === 0) {
    myPanel.innerHTML = `
  <div id="emptyState" style="
    text-align: left;
    margin-left: -37px;
    margin-top: 10px;
    color: #E0EBFF;
    font-size: 0.9rem;
    opacity: 0.8;
    transition: all .25s ease;
  ">No scenarios found.</div>
`;
    const empty = document.getElementById("emptyState");
    empty.addEventListener("mouseover", () => {
      empty.style.opacity = "1";
      empty.style.transform = "translateX(4px)";
    });
    empty.addEventListener("mouseout", () => {
      empty.style.opacity = "0.8";
      empty.style.transform = "translateX(0)";
    });

    return;
  }

  filtered.forEach((s) => {
    const status = s.status || s.participantStatus || s.latestAttemptStatus || "NOT_STARTED";
    const card = document.createElement("div");
    card.className = "scenario-card";

    const title = document.createElement("h4");
    title.textContent = s.title || "Untitled Scenario";
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.textContent = s.description || "";
    desc.style.fontSize = "0.9rem";
    desc.style.color = "#E0EBFF";
    card.appendChild(desc);

    const btnContainer = document.createElement("div");
    const mainBtn = document.createElement("button");
    mainBtn.className = "my-scenario-btn";
    mainBtn.textContent = status === "COMPLETED" ? "Retry" : "Open Console";
    mainBtn.addEventListener("click", () => {
      window.open(`/scenario-console?scenarioId=${s.id}`, "_blank");
    });
    btnContainer.appendChild(mainBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "my-scenario-btn remove-btn";
    removeBtn.innerHTML = `<i class="fas fa-trash"></i>`;
    removeBtn.addEventListener("click", async () => {

      const confirmDelete = await showDeletePopup(
        `Remove "${s.title}" from your scenarios?`
      );
      if (!confirmDelete) return;
    
      const token = localStorage.getItem("token");
      if (!token) return alert("Login required");
    
      try {
        const res = await fetch(`/scenarios/delete/${s.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
    
        const data = await res.json();
    
        if (data.success) {
          card.style.transition = "all 0.3s ease";
          card.style.opacity = "0";
    
          setTimeout(async () => {
            card.remove();
    
            if (window.forceScenarioRefresh) {
              await window.forceScenarioRefresh();
            }
            if (window.refreshTimelineState) {
              window.refreshTimelineState();
            }
    
            const scenarioList = document.getElementById("scenario-list");
            if (scenarioList && scenarioList.closest(".show")) {
              const allScenarios = await fetchAllScenarios();
              renderScenarios(allScenarios);
            }
          }, 250);
        }
      } catch (err) {
        console.error("❌ Error removing scenario:", err);
      }
    });
    btnContainer.appendChild(removeBtn);

    const insightsLink = document.createElement("span");
    insightsLink.textContent = "Show Last Attempt Insights";
    insightsLink.className = "insights-link";
    insightsLink.addEventListener("click", () => showInsightsPopup(s.id));

    card.appendChild(insightsLink);
    card.appendChild(btnContainer);
    myPanel.appendChild(card);
  });
}

// -------------------- Tab Switching --------------------
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const filterValue = btn.dataset.tab.replace("-", "_");
    localStorage.setItem("selectedScenarioTab", filterValue);
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderMyScenarios(filterValue);
  });
});

// -------------------- Overlay Logic --------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ renderScenarios defined and waiting — not auto-running");

  const openBtn = document.getElementById("openScenariosBtn");
  const overlay = document.getElementById("scenarioOverlay");
  const closeBtn = document.getElementById("closeScenarioOverlay");
  const globeLayer = document.getElementById("globe-layer");

  if (!openBtn || !overlay || !closeBtn || !globeLayer) {
    console.warn("⚠️ Overlay elements not found in DOM");
    return;
  }

  openBtn.addEventListener("click", async () => {
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";

    const canvas = globeLayer.querySelector("canvas");
    if (canvas) canvas.style.pointerEvents = "none";
    globeLayer.style.filter = "blur(8px) brightness(0.6)";

    const scenarios = await fetchAllScenarios();
    console.log("🪩 Overlay opened — preparing to render", scenarios.length, "scenarios");

    requestAnimationFrame(() => {
      const scenarioList = document.getElementById("scenario-list");
      if (!scenarioList) {
        console.warn("⚠️ scenario-list still not found — forcing retry after short delay");
        setTimeout(() => renderScenarios(scenarios), 150);
      } else {
        renderScenarios(scenarios);
      }
    });

  });

  closeBtn.addEventListener("click", () => {
    overlay.classList.remove("show");
    document.body.style.overflow = "auto";

    const canvas = globeLayer.querySelector("canvas");
    if (canvas) canvas.style.pointerEvents = "auto";
    globeLayer.style.filter = "none";
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("show")) closeBtn.click();
  });
});

// -------------------- Utilities --------------------
async function refreshAllScenariosUI() {
  try {
    const allScenarios = await fetchAllScenarios();
    renderScenarios(allScenarios);
  } catch (err) {
    console.error("⚠️ Failed to refresh all scenarios:", err);
  }
}
/* ============================================================
   BLACKSEALED — AI Insights (Universal Parser + Markdown Renderer)
   Supports:
   - JSON structured insights
   - Long freeform markdown-like text
   ============================================================ */


function cleanAIString(ai) {
  if (!ai) return "";

  return ai
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/\\n/g, "\n")                     // fix newline slashes
    .replace(/\\"/g, '"')                      // fix escaped quotes
    .replace(/""/g, '"')                       // fix doubled quotes
    .replace(/"\s+"/g, '"')                    // fix weird spaced double quotes
    .replace(/\n{3,}/g, "\n\n")                // compress extra blank lines
    .trim();
}

function tryParseAI(ai) {
  if (!ai) return null;

  ai = ai.trim();

  try { return JSON.parse(ai); } catch { }
  try { return JSON.parse(JSON.parse(ai)); } catch { }

  const match = ai.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { }
  }

  return null;
}

function mdToHtml(md) {
  if (!md) return "";

  // Remove triple newlines
  md = md.replace(/\n{3,}/g, "\n\n");

  // Headings
  md = md.replace(/^### (.*)$/gim, `<h3>$1</h3>`);
  md = md.replace(/^## (.*)$/gim, `<h2>$1</h2>`);
  md = md.replace(/^# (.*)$/gim, `<h1>$1</h1>`);

  // Bold
  md = md.replace(/\*\*(.*?)\*\*/gim, `<strong>$1</strong>`);

  // Bullet points
  md = md.replace(/^\s*[-*] (.*)$/gim, `<li>$1</li>`);

  // Group <li> into a proper <ul>
  md = md.replace(/(<li>.*<\/li>)/gims, `<ul>$1</ul>`);

  // Convert remaining newlines to <br> ONLY inside text blocks
  md = md.replace(/(?<!>)\n/g, "<br>");

  return md;
}


async function showInsightsPopup(scenarioId) {
  const token = localStorage.getItem("token");
  const popup = document.getElementById("aiInsightsPopup");
  const body = document.getElementById("aiInsightsBody");

  popup.style.display = "flex";
  body.innerHTML = "Loading...";

  try {
    const res = await fetch(`/scenarios/${scenarioId}/ai-insights-latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) {
      body.innerHTML = `<p style="color:#E0EBFF">No completed attempts found.</p>`;
      return;
    }

    const data = await res.json();
    let ai = cleanAIString(data.aiInsights);
    let parsed = tryParseAI(ai);

    let rawText = "";

    if (parsed) {
      rawText += `### ${parsed.title || "Scenario Insights"}\n`;
      rawText += `${parsed.recap || ""}\n\n`;

      if (parsed.portfolioHighlights) {
        rawText += `### Portfolio Highlights\n`;
        rawText += `- **Top Gainers:** ${parsed.portfolioHighlights.topGainers?.length
          ? parsed.portfolioHighlights.topGainers.join(", ")
          : "-"
          }\n`;
        rawText += `- **Top Losers:** ${parsed.portfolioHighlights.topLosers?.length
          ? parsed.portfolioHighlights.topLosers.join(", ")
          : "-"
          }\n`;
        rawText += `- **Unrealized P/L:** ${parsed.portfolioHighlights.totalUnrealizedPL || "-"}\n`;
        rawText += `- **Cash Remaining:** ${parsed.portfolioHighlights.cashRemaining || "-"}\n\n`;
      }

      if (parsed.nextTimeTry?.length) {
        rawText += `### Next Time, Try\n`;
        parsed.nextTimeTry.forEach(t => rawText += `- ${t}\n`);
        rawText += "\n";
      }

      if (parsed.disclaimer) {
        rawText += `**${parsed.disclaimer}**`;
      }
    } else {
      rawText = ai; // narrative fallback
    }

    document.getElementById("aiInsightsBody").innerHTML =
      `<div class="markdown-text">${mdToHtml(rawText)}</div>`;


  } catch (err) {
    console.error("❌ Error fetching insights:", err);
    body.innerHTML = `<p style="color:red;">Error loading insights: ${err.message}</p>`;
  }
}

function closeInsightsPopup() {
  document.getElementById("aiInsightsPopup").style.display = "none";
}

window.addEventListener("click", (e) => {
  const popup = document.getElementById("aiInsightsPopup");
  if (e.target === popup) popup.style.display = "none";
});

// ============================================================
// BLACKSEALED — Floating Globe Scenarios Toggle (existing IDs)
// ============================================================
// ============================================================
// BLACKSEALED — Floating Globe Scenarios Toggle + Globe Dim
// ============================================================

async function fetchFloatingScenarios() {
  const token = localStorage.getItem("token");
  if (!token) return [];
  try {
    const res = await fetch("/scenarios/all", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.scenarios || [];
  } catch (err) {
    console.error("⚠️ Failed to fetch floating scenarios:", err);
    return [];
  }
}

async function renderFloatingScenarios() {
  const list = document.getElementById("floating-scenario-list");
  if (!list) return;

  const [scenarios, myScenarios] = await Promise.all([
    fetchFloatingScenarios(),
    fetchMyScenarios()
  ]);

  const myScenarioIds = myScenarios.map((s) => s.id);
  list.innerHTML = "";

  if (scenarios.length === 0) {
    list.innerHTML = `<p style="color:#E0EBFF; text-align:center;">No scenarios available.</p>`;
    return;
  }

  scenarios.forEach((s, index) => {
    const participating = myScenarioIds.includes(s.id || index);
    const card = document.createElement("div");
    card.className = "floating-card";

    card.innerHTML = `
      <h3>${s.title}</h3>
     <div class="floating-desc">${s.description || ""}</div>
      <div class="floating-meta">
        <span><strong>Start:</strong> ${new Date(s.startDate).toLocaleDateString()}</span>
        <span><strong>End:</strong> ${new Date(s.endDate).toLocaleDateString()}</span>
      </div>
      <p><strong>Starting Balance:</strong> $${s.startingBalance?.toLocaleString() || "N/A"}</p>
      ${s.rules?.note ? `<p style="color:red;"><strong>Rules:</strong> ${s.rules.note}</p>` : ""}
      <button class="btn ${participating ? "joined" : ""}">
        ${participating ? "Joined" : "Join"}
      </button>
    `;

    const btn = card.querySelector(".btn");
    if (!participating) {
      btn.addEventListener("click", async () => {
        await joinScenario(s.id || index);
        btn.textContent = "Joined";
        btn.classList.add("joined");
        btn.disabled = true;
      });
    } else {
      btn.disabled = true;
    }

    // Subtle entrance animation
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    requestAnimationFrame(() => {
      card.style.transition = "all 0.3s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    });

    list.appendChild(card);
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("floatingScenariosOverlay");
  const openBtn = document.getElementById("openScenariosBtn");
  const globeLayer = document.getElementById("globe-layer");
  const rightPanel = document.querySelector(".right-panel"); // My Scenarios panel

  if (!overlay || !openBtn || !globeLayer) return;

  let isOpen = false;

  openBtn.addEventListener("click", async () => {
    isOpen = !isOpen;
    const globeCanvas = globeLayer.querySelector("canvas");

    if (isOpen) {
      overlay.classList.add("show");
      openBtn.textContent = "Close All Scenarios";
      document.body.style.overflow = "hidden";
      rightPanel?.classList.add("shift-right");

      // 🧩 Shrink My Scenarios cards
      document.querySelectorAll(".scenario-card").forEach((c) => c.classList.add("mini"));

      // 🌒 Darken + Disable Globe interaction
      if (globeCanvas) {
        globeCanvas.style.transition = "filter 0.6s ease, opacity 0.6s ease";
        globeCanvas.style.filter = "brightness(0.45) saturate(0.75)";
        globeCanvas.style.pointerEvents = "none"; // 👈 disable user interaction
      }

      await renderFloatingScenarios();
    } else {
      overlay.classList.remove("show");
      openBtn.textContent = "View All Scenarios";
      document.body.style.overflow = "auto";
      rightPanel?.classList.remove("shift-right");

      // 🔁 Restore card size
      document.querySelectorAll(".scenario-card").forEach((c) => c.classList.remove("mini"));

      // 🌞 Restore normal globe behavior
      if (globeCanvas) {
        globeCanvas.style.filter = "brightness(1) saturate(1)";
        globeCanvas.style.pointerEvents = "auto"; // 👈 re-enable globe interactivity
      }
    }
  });
});
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing My Scenarios panel…");

  // 1. Restore previously selected tab (or default to "not_started")
  const savedTab = localStorage.getItem("selectedScenarioTab") || "not_started";

  const targetBtn = document.querySelector(`.tab-button[data-tab="${savedTab}"]`);
  if (targetBtn) {
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    targetBtn.classList.add("active");
  }

  // 2. Immediately render that tab's content
  await renderMyScenarios(savedTab);

  // 3. Make the correct tab panel visible
  document.querySelectorAll(".tab-content").forEach((panel) => panel.classList.remove("active"));
  const selectedPanel = document.getElementById(savedTab.replace("_", "-"));
  if (selectedPanel) selectedPanel.classList.add("active");

  console.log("✅ My Scenarios loaded instantly");
});

window.forceScenarioRefresh = async () => {
  console.log("🔄 Global refresh triggered…");

  const tab = localStorage.getItem("selectedScenarioTab") || "not_started";

  await renderMyScenarios(tab);       // update My Scenarios panel
  await refreshAllScenariosUI();      // update overlay
  await renderFloatingScenarios();    // update floating list

  console.log("✅ Global refresh completed");
};


























// ---------------------------------------------------------------
// (Your other DOMContentLoaded blocks here)
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  if (window.innerWidth >= 768) return;

  console.log("📱 Mobile mode enabled");

  /* --------------------------------------------------------
     1. Disable globe interaction but keep it as background
  -------------------------------------------------------- */
  const globeCanvas = document.querySelector("#globe-layer canvas");
  if (globeCanvas) {
    globeCanvas.style.pointerEvents = "none";
  }

  /* --------------------------------------------------------
     2. Render ALL Scenarios (mobile)
  -------------------------------------------------------- */
  const all = await fetchAllScenarios();
  const allList = document.getElementById("mobile-scenario-list");

  allList.innerHTML = "";

  all.forEach(s => {
    const card = document.createElement("div");
    card.className = "mobile-card";

    card.innerHTML = `
      <h3>${s.title}</h3>
      <p>${s.description}</p>
      <p><strong>Start:</strong> ${new Date(s.startDate).toLocaleDateString()}</p>
      <p><strong>End:</strong> ${new Date(s.endDate).toLocaleDateString()}</p>
      <button class="btn">${s.joined ? "Joined" : "Join"}</button>
    `;

    const btn = card.querySelector(".btn");
    btn.addEventListener("click", async () => {
      await joinScenario(s.id);
      await loadMobileMyScenarios(); // refresh my scenarios
    });

    allList.appendChild(card);
  });
async function renderMobileAllScenarios() {
  const list = document.getElementById("mobile-scenario-list");
  if (!list) return;

  const [all, mine] = await Promise.all([
    fetchAllScenarios(),
    fetchMyScenarios()
  ]);

  const myIds = new Set(mine.map(s => s.id));

  list.innerHTML = "";

  all.forEach(s => {
    const joined = myIds.has(s.id);

    const card = document.createElement("div");
    card.className = "mobile-card";

    card.innerHTML = `
      <h3>${s.title}</h3>
      <p>${s.description}</p>
      <p><strong>Start:</strong> ${new Date(s.startDate).toLocaleDateString()}</p>
      <p><strong>End:</strong> ${new Date(s.endDate).toLocaleDateString()}</p>

      <button class="mobile-join-btn ${joined ? "joined" : ""}">
        ${joined ? "Joined" : "Join"}
      </button>
    `;

    const btn = card.querySelector(".mobile-join-btn");

    if (!joined) {
      btn.addEventListener("click", async () => {
        await joinScenario(s.id);
        btn.textContent = "Joined";
        btn.classList.add("joined");
        btn.disabled = true;

        // update My Scenarios section too
        renderMobileMyScenarios();
      });
    } else {
      btn.disabled = true;
    }

    list.appendChild(card);
  });
}

  /* --------------------------------------------------------
     3. Render MY Scenarios (mobile)
  -------------------------------------------------------- */
  async function loadMobileMyScenarios(filter = "not_started") {
    const list = document.getElementById("mobile-my-scenario-list");
    list.innerHTML = "";

    const my = await fetchMyScenarios();

    if (!my.length) {
      list.innerHTML = `<p style="color:#d0e2ff; opacity:0.7;">You haven't joined any scenarios yet.</p>`;
      return;
    }

    const filtered = my.filter(s => {
      const status = s.status || s.participantStatus || "NOT_STARTED";
      return (
        (filter === "not_started" && status === "NOT_STARTED") ||
        (filter === "in_progress" && status === "IN_PROGRESS") ||
        (filter === "completed" && status === "COMPLETED")
      );
    });

    if (!filtered.length) {
      list.innerHTML = `<p style="color:#d0e2ff; opacity:0.7;">No scenarios in this category.</p>`;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement("div");
      card.className = "scenario-card"; // reuse your pretty card

      card.innerHTML = `
        <h4>${s.title}</h4>
        <p>${s.description}</p>
        <button class="my-scenario-btn open">Open Console</button>
        <button class="my-scenario-btn remove-btn">Remove</button>
      `;

      card.querySelector(".open").addEventListener("click", () => {
        window.open(`/scenario-console?scenarioId=${s.id}`, "_blank");
      });

      card.querySelector(".remove-btn").addEventListener("click", async () => {
        if (!confirm("Remove this scenario?")) return;
        await fetch(`/scenarios/delete/${s.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        await loadMobileMyScenarios(filter);
      });

      list.appendChild(card);
    });
  }

  // Load default tab
  loadMobileMyScenarios("not_started");

  /* --------------------------------------------------------
     4. Handle tab switching
  -------------------------------------------------------- */
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadMobileMyScenarios(btn.dataset.tab);
    });
  });

});

async function openScenarioPopup(s) {
  const token = localStorage.getItem("token");

  // --- UI fields ---
  document.getElementById("scenarioRegionTag").textContent = s.region || "GLOBAL";
  document.getElementById("scenarioVolTag").textContent = (s.volatility || "MEDIUM").toUpperCase();
  document.getElementById("scenarioTitle").textContent = s.title;
  document.getElementById("scenarioDesc").textContent = s.description;
  document.getElementById("scenarioStart").textContent =
    new Date(s.startDate).toLocaleDateString();
  document.getElementById("scenarioEnd").textContent =
    new Date(s.endDate).toLocaleDateString();
  document.getElementById("scenarioBalance").textContent =
    "$" + Number(s.startingBalance).toLocaleString();

  const joinBtn = document.getElementById("scenarioJoinBtn");

  // --- Determine joined state ---
  let joined = false;

  if (token) {
    try {
      const myScenarios = await fetchMyScenarios();
      joined = myScenarios.some(ms => ms.id === s.id);
    } catch (e) {
      console.warn("⚠️ Failed to check joined state", e);
    }
  }

  // --- Button state logic ---
  if (joined) {
    joinBtn.textContent = "Joined";
    joinBtn.disabled = true;
    joinBtn.classList.add("joined");
    joinBtn.onclick = null;
  } else {
    joinBtn.textContent = "Join Mission";
    joinBtn.disabled = false;
    joinBtn.classList.remove("joined");

    joinBtn.onclick = async () => {
      await joinScenario(s.id);

      // Immediately update UI
      joinBtn.textContent = "Joined";
      joinBtn.disabled = true;
      joinBtn.classList.add("joined");

      // Keep rest of app in sync
      if (window.forceScenarioRefresh) {
        await window.forceScenarioRefresh();
      }
    };
  }

  document.getElementById("scenarioOverlay").classList.add("show");
}


document.getElementById("scenarioOverlayClose").onclick =
document.getElementById("scenarioCancelBtn").onclick =
  () => document.getElementById("scenarioOverlay").classList.remove("show");

// Close button
document.getElementById("scenarioOverlayClose").onclick = () => {
  document.getElementById("scenarioOverlay").classList.remove("show");
};


// 🔗 make sure globe.js can see it
window.openScenarioPopup = openScenarioPopup;

// CLOSE Pop-up — run only *after* DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("scenarioOverlayClose");
 const overlay = document.getElementById("scenarioOverlay");

  if (!closeBtn || !overlay) {
    console.warn("⚠️ Popup close elements not found");
    return;
  }

  closeBtn.addEventListener("click", () => {
    overlay.classList.remove("show");
  });

  // Optional: click outside to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("show");
  });
});
