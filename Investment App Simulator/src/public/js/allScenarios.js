// -------------------- API Fetch Functions --------------------

// Fetch all scenarios
async function fetchAllScenarios() {
  const token = localStorage.getItem("token");
  if (!token) return [];
  try {
    const res = await fetch("/scenarios/all", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.success ? data.scenarios : []; // <- changed here
  } catch (err) {
    console.error(err);
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
    return data.success ? data.scenarios : []; // <- changed here
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
      await refreshAllScenariosUI(); // updates "All Scenarios"
      await renderMyScenarios();     // updates "My Scenarios"
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error joining scenario");
  }
}


// -------------------- Render Functions --------------------
async function init() {
  const scenarios = (await fetchAllScenarios()) || [];
  renderScenarios(scenarios);

  // 🔁 Restore last selected tab (defaults to "all")
  const savedFilter = localStorage.getItem("selectedScenarioTab") || "all";

  // Highlight correct tab
  document.querySelectorAll(".tab-button").forEach((b) => {
    const normalized = b.dataset.tab.replace("-", "_");
    b.classList.toggle("active", normalized === savedFilter);
  });

  // Render scenarios for that filter
  renderMyScenarios(savedFilter);
}

async function renderScenarios(scenarios) {
  const scenarioList = document.getElementById("scenario-list");
  scenarioList.innerHTML = "";

  const myScenarios = (await fetchMyScenarios()) || [];
  const myScenarioIds = myScenarios.map((s) => s.id);

  if (scenarios.length === 0) {
    scenarioList.innerHTML = "<p>No scenarios available.</p>";
    return;
  }

  scenarios.forEach((s, index) => {
    const participating = myScenarioIds.includes(s.id || index); // fallback id
    const card = document.createElement("div");
    card.className = "ongoing-card"; // updated class
    card.innerHTML = `
    <h3>${s.title}</h3>
    <p>${s.description || ""}</p>

    <div style="display: flex; gap: 20px; margin: 5px 0 15px 0;">
      <span><strong>Start:</strong> ${new Date(
        s.startDate
      ).toLocaleDateString()}</span>
      <span><strong>End:</strong> ${new Date(
        s.endDate
      ).toLocaleDateString()}</span>
    </div>

    <div style="display: flex; gap: 20px; margin: 0 0 15px 0;">
      <span><strong>Starting Balance:</strong> $${
        s.startingBalance?.toLocaleString() || "N/A"
      }</span>
      <span><strong>Recommended Stocks:</strong> ${
        s.allowedStocks?.join(", ") || "N/A"
      }</span>
    </div>

    <p style="color: red; margin-top: 10px;">
  <strong>Rules:</strong> ${
    typeof s.rules === "string" ? s.rules : s.rules?.note || "N/A"
  }
</p>


    <button class="btn">${participating ? "Joined" : "Join"}</button>
  `;

    const btn = card.querySelector(".btn");
    if (!participating)
      btn.addEventListener("click", () => joinScenario(s.id || index));
    else btn.disabled = true;

    // Animation: fade-in + slide-up
    card.style.opacity = 0;
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "all 0.3s ease";
      card.style.opacity = 1;
      card.style.transform = "translateY(0)";
    }, 50);

    scenarioList.appendChild(card);
  });
}

async function renderMyScenarios(filter = "all") {
  const myPanel = document.getElementById("my-not-started");
  if (!myPanel) return;
  myPanel.innerHTML = "";

  const myScenarios = (await fetchMyScenarios()) || [];
  if (myScenarios.length === 0) {
    myPanel.innerHTML = "<p style='color:#E0EBFF'>No scenarios found.</p>";
    return;
  }

  // 🧠 Apply status-based filtering
  const filtered = myScenarios.filter((s) => {
    const status =
      s.status || s.participantStatus || s.latestAttemptStatus || "NOT_STARTED";

    switch (filter) {
      case "not_started":
        return status === "NOT_STARTED";
      case "in_progress":
        return status === "IN_PROGRESS";
      case "completed":
        return status === "COMPLETED";
      default:
        return true; // show all if no filter selected
    }
  });

  if (filtered.length === 0) {
    myPanel.innerHTML = `<p style="color:#E0EBFF">No scenarios found.</p>`;
    return;
  }

  // 🧩 Render cards
  filtered.forEach((s) => {
    const status =
      s.status || s.participantStatus || s.latestAttemptStatus || "NOT_STARTED";

    const card = document.createElement("div");
    card.style.backgroundColor = "#000000";
    card.style.border = "1px solid #53596B";
    card.style.borderRadius = "10px";
    card.style.padding = "12px 16px";
    card.style.marginBottom = "12px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "6px";
    card.style.color = "#FFFFFF";

    // Title + desc
    const title = document.createElement("h4");
    title.textContent = s.title || "Untitled Scenario";
    title.style.margin = "0";
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.textContent = s.description || "";
    desc.style.margin = "0";
    desc.style.fontSize = "0.9rem";
    desc.style.color = "#E0EBFF";
    card.appendChild(desc);

    // Buttons container
    const btnContainer = document.createElement("div");
    // Main button — Retry or Open Console
    const mainBtn = document.createElement("button");
    mainBtn.className = "my-scenario-btn";

    if (status === "COMPLETED") {
      mainBtn.textContent = "Retry";
      mainBtn.addEventListener("click", () => {
        // 👇 redirect to same console (starts new attempt)
        window.open(`scenario-console.html?scenarioId=${s.id}`, "_blank");
      });
    } else {
      mainBtn.textContent = "Open Console";
      mainBtn.addEventListener("click", () => {
        window.open(`scenario-console.html?scenarioId=${s.id}`, "_blank");
      });
    }

    btnContainer.appendChild(mainBtn);

    // 🗑️ Remove Scenario button (with icon)
    const removeBtn = document.createElement("button");
    removeBtn.className = "my-scenario-btn remove-btn";
    removeBtn.innerHTML = `<i class="fas fa-trash"></i>`; // Font Awesome trash icon

    removeBtn.addEventListener("click", async () => {
      const confirmDelete = confirm(
        `Are you sure you want to remove "${s.title}" from your scenarios?`
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
          console.log(`✅ Removed scenario ${s.id} from user list`);

          // Smooth fade-out animation
          card.style.transition = "all 0.3s ease";
          card.style.opacity = "0";
          card.style.transform = "translateY(-10px)";
          setTimeout(async () => {
            card.remove();
            await renderMyScenarios(filter);
            // 🔁 also update "All Scenarios" panel instantly
            await refreshAllScenariosUI();
          }, 250);
        } else {
          alert(data.message || "Failed to remove scenario");
        }
      } catch (err) {
        console.error("❌ Error removing scenario:", err);
        alert("Error removing scenario");
      }
    });

    btnContainer.appendChild(removeBtn);

    // Insights link
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
    // Save selected tab filter to localStorage
    const filterValue = btn.dataset.tab.replace("-", "_");
    localStorage.setItem("selectedScenarioTab", filterValue);

    // Update active tab UI
    document
      .querySelectorAll(".tab-button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Render the filtered scenarios
    renderMyScenarios(filterValue);
  });
});

// -------------------- Init --------------------
init();
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

    // 🟡 Handle 404 Not Found separately
    if (res.status === 404) {
      body.innerHTML = `<p style="color:#E0EBFF">No completed attempts found.</p>`;
      return;
    }

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load insights");
    if (!data.aiInsights) {
      body.innerHTML = `<p>No insights found for your last attempt.</p>`;
      return;
    }

    let ai = data.aiInsights;
    let html = "";

    // 🧩 Try to handle both JSON & text outputs
    try {
      const cleaned =
        typeof ai === "string"
          ? ai.replace(/```json/g, "").replace(/```/g, "").trim()
          : JSON.stringify(ai);

      const parsed =
        typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;

      html = `
        <h3>${parsed.title || "Scenario Insights"}</h3>
        <p>${parsed.recap || ""}</p>
        <ul>
          <li><b>Top Gainers:</b> ${
            parsed.portfolioHighlights?.topGainers?.join(", ") || "-"
          }</li>
          <li><b>Top Losers:</b> ${
            parsed.portfolioHighlights?.topLosers?.join(", ") || "-"
          }</li>
          <li><b>Total Unrealized P/L:</b> ${
            parsed.portfolioHighlights?.totalUnrealizedPL || "-"
          }</li>
          <li><b>Cash Remaining:</b> ${
            parsed.portfolioHighlights?.cashRemaining || "-"
          }</li>
        </ul>
        <h4>Next Time, Try:</h4>
        <ul>${(parsed.nextTimeTry || [])
          .map((t) => `<li>${t}</li>`)
          .join("")}</ul>
        <p style="font-size:12px;color:#aaa;">${parsed.disclaimer || ""}</p>
      `;
    } catch {
      const text = typeof ai === "string" ? ai : JSON.stringify(ai, null, 2);
      html = text
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/gim, "<em>$1</em>")
        .replace(/\n/g, "<br>");
    }

    body.innerHTML = `<div class="markdown-text">${html}</div>`;
  } catch (err) {
    console.error("❌ Error fetching insights:", err);
    body.innerHTML = `<p style="color:red;">Error loading insights: ${err.message}</p>`;
  }
}


function closeInsightsPopup() {
  document.getElementById("aiInsightsPopup").style.display = "none";
}

// Close popup when clicking outside
window.addEventListener("click", (e) => {
  const popup = document.getElementById("aiInsightsPopup");
  if (e.target === popup) popup.style.display = "none";
});


async function refreshAllScenariosUI() {
  try {
    const allScenarios = (await fetchAllScenarios()) || [];
    renderScenarios(allScenarios);
  } catch (err) {
    console.error("⚠️ Failed to refresh all scenarios:", err);
  }
}