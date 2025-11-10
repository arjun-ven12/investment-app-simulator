// ============================================================
// BLACKSEALED — Live Scenario Globe (Database Synced + Working Hover Tooltip)
// ============================================================

console.log("🌍 BlackSealed Globe — Live Scenario Nodes");

const VOL_COL = {
  low: "#4ddfb5",
  med: "#4fa8ff",
  high: "#7a88ff",
  extreme: "#ff66c4",
};

window.addEventListener("DOMContentLoaded", async () => {
  const globeEl = document.getElementById("globe-layer");
  if (!globeEl) return console.error("❌ Globe element not found");

  // --- Initialize Globe ---
  const globe = Globe({
    rendererConfig: { alpha: true, antialias: true },
    waitForGlobeReady: true,
  })(globeEl)
    .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
    .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
    .showAtmosphere(true)
    .atmosphereColor("#172036")
    .atmosphereAltitude(0.4)
    .backgroundColor("rgba(0,0,0,0)")
    .pointOfView({ lat: 15, lng: 100, altitude: 2.4 })
    .pointAltitude(0.06)
    .pointRadius(0.25)
    .pointColor((d) => VOL_COL[d.volatility] || "#4fa8ff");

// --- Move the actual globe mesh left ---
globe.object3D().children.forEach(obj => {
  if (obj.type === "Group" || obj.type === "Mesh") {
    obj.position.x = -1.5; // move further left if needed
  }
});

  // --- Fetch scenarios from backend ---
  const token = localStorage.getItem("token");
  let allScenarios = [];
  try {
    const res = await fetch("/scenarios/all", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) allScenarios = data.scenarios;
  } catch (err) {
    console.error("⚠️ Failed to fetch scenarios:", err);
  }

  if (!allScenarios?.length) {
    console.warn("⚠️ No scenario data found in database.");
    return;
  }

  const mapped = allScenarios
    .filter((s) => s.lat && s.lng)
    .map((s) => ({
      id: s.id,
      title: s.title,
      lat: s.lat,
      lng: s.lng,
      region: s.region || "Unknown",
      volatility: s.volatility?.toLowerCase() || "med",
    }));

  globe.pointsData(mapped);

  // --- Create tooltip element ---
  const tooltip = document.createElement("div");
  tooltip.id = "globeTooltip";
  Object.assign(tooltip.style, {
    position: "fixed",
    background: "rgba(20,25,35,0.9)",
    color: "#eaf3ff",
    padding: "8px 12px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    fontFamily: "Outfit, sans-serif",
    fontSize: "13px",
    pointerEvents: "none",
    backdropFilter: "blur(8px)",
    zIndex: "9999",
    display: "none",
    opacity: "0",
    transition: "opacity 0.2s ease",
  });
  document.body.appendChild(tooltip);

  // --- Enable raycaster interactivity ---
  const controls = globe.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;
  controls.enableZoom = false;

  // --- Hover logic ---
  let lastHover = null;
  globe.onPointHover((point) => {
    if (point !== lastHover) {
      lastHover = point;
      globe.pointAltitude((d) => (d === point ? 0.12 : 0.06));
      globe.pointRadius((d) => (d === point ? 0.4 : 0.25));
    }

    if (point) {
      tooltip.innerHTML = `
        <strong>${point.title}</strong><br>
        <span style="color:#9bb5cc;">${point.region}</span><br>
        Volatility: <span style="color:${VOL_COL[point.volatility]}">
          ${point.volatility.toUpperCase()}</span>
      `;
      tooltip.style.display = "block";
      tooltip.style.opacity = "1";
    } else {
      tooltip.style.opacity = "0";
      setTimeout(() => (tooltip.style.display = "none"), 150);
    }
  });

  // --- Tooltip follows mouse ---
  window.addEventListener("mousemove", (e) => {
    tooltip.style.left = e.clientX + 16 + "px";
    tooltip.style.top = e.clientY + 16 + "px";
  });

  // --- Renderer cleanup ---
  const renderer = globe.renderer();
  renderer.setClearColor(0x000000, 0);

  console.log(`✅ ${mapped.length} scenario nodes visible on globe`);
});
