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
      alert("Joined!");
      await init(); // re-render scenarios
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
  renderMyScenarios(); // initialize My Scenarios tabs
}

async function renderScenarios(scenarios) {
  const scenarioList = document.getElementById("scenario-list");
  scenarioList.innerHTML = "";

  const myScenarios = (await fetchMyScenarios()) || [];
  const myScenarioIds = myScenarios.map(s => s.id);


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
      <span><strong>Start:</strong> ${new Date(s.startDate).toLocaleDateString()}</span>
      <span><strong>End:</strong> ${new Date(s.endDate).toLocaleDateString()}</span>
    </div>

    <div style="display: flex; gap: 20px; margin: 0 0 15px 0;">
      <span><strong>Starting Balance:</strong> $${s.startingBalance?.toLocaleString() || "N/A"}</span>
      <span><strong>Recommended Stocks:</strong> ${s.allowedStocks?.join(", ") || "N/A"}</span>
    </div>

    <p style="color: red; margin-top: 10px;">
  <strong>Rules:</strong> ${typeof s.rules === "string" ? s.rules : (s.rules?.note || "N/A")}
</p>


    <button class="btn">${participating ? "Joined" : "Join"}</button>
  `;

    const btn = card.querySelector(".btn");
    if (!participating) btn.addEventListener("click", () => joinScenario(s.id || index));
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

async function renderMyScenarios() {
  const myPanel = document.getElementById("my-not-started");
  if (!myPanel) return;
  myPanel.innerHTML = "";

  const myScenarios = (await fetchMyScenarios()) || [];

  if (myScenarios.length === 0) {
    myPanel.innerHTML = "<p style='color:#E0EBFF'>No scenarios found.</p>";
    return;
  }

  myScenarios.forEach((s) => {
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
    card.style.fontFamily = "Outfit, sans-serif";

    // Title
    const title = document.createElement("h4");
    title.textContent = s.title;
    title.style.margin = "0";
    title.style.fontWeight = "normal"; // not bold
    card.appendChild(title);

    // Description
    const desc = document.createElement("p");
    desc.textContent = s.description || "";
    desc.style.margin = "0";
    desc.style.fontSize = "0.9rem";
    desc.style.color = "#E0EBFF";
    card.appendChild(desc);
    // Buttons container
    const btnContainer = document.createElement("div");
    const consoleBtn = document.createElement("button");
    consoleBtn.textContent = "Open Console";
    consoleBtn.className = "my-scenario-btn";
    consoleBtn.addEventListener("click", () => {
      window.open(`scenario-console.html?scenarioId=${s.id}`, "_blank");
    });

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "my-scenario-btn";
    removeBtn.addEventListener("click", () => {
      myPanel.removeChild(card);
    });
    btnContainer.appendChild(consoleBtn);
    btnContainer.appendChild(removeBtn);
    card.appendChild(btnContainer);

    myPanel.appendChild(card);
  });
}




// -------------------- Tab Switching --------------------

document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderMyScenarios(btn.dataset.tab);
  });
});

// -------------------- Init --------------------
init();
