// ============================================================
// BLACKSEALED — Scenario Globe (DB Synced Beacons v17.4)
// Stable Hover · Cinematic Continent Highlight · Mission Popup
// ============================================================

console.log("🌍 BlackSealed Globe — Mission Beacons v17.4");

const CONTINENT_ZONES = {
  NorthAmerica: { latMin: 7, latMax: 83, lngMin: -170, lngMax: -30 },
  SouthAmerica: { latMin: -60, latMax: 12, lngMin: -90, lngMax: -30 },
  Europe: { latMin: 35, latMax: 72, lngMin: -25, lngMax: 60 },
  Africa: { latMin: -35, latMax: 37, lngMin: -20, lngMax: 55 },
  Asia: { latMin: 5, latMax: 80, lngMin: 55, lngMax: 180 },
  Oceania: { latMin: -50, latMax: 0, lngMin: 110, lngMax: 180 },
  Antarctica: { latMin: -90, latMax: -60, lngMin: -180, lngMax: 180 },
};


const VOL_COL = {
  low: "#4ddfb5",
  medium: "#5ab8e8",
  high: "#7a8aff",
  extreme: "#ff66c4",
};

// ============================================================
// MAIN INITIALIZATION
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  let hoverHandler = null; // declare globally inside the globe init scope
  const globeEl = document.getElementById("globe-layer");
  if (!globeEl) return console.error("❌ Globe element not found");

  // ============================================================
  // 🔐 Fetch Scenarios
  // ============================================================
  let mapped = [];
  try {
    const token = localStorage.getItem("token");
    if (!token) return console.warn("⚠️ No auth token found — user may not be logged in.");
    const res = await fetch("/scenarios/all", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    mapped = data.scenarios || [];
    console.log(`📡 Loaded ${mapped.length} scenarios from DB`);
  } catch (err) {
    console.error("❌ Failed to load scenarios:", err);
    return;
  }

  // ============================================================
  // 🌍 Initialize Globe
  // ============================================================
  const globe = Globe({
    rendererConfig: { alpha: true, antialias: true },
    waitForGlobeReady: true,
  })(globeEl)
    .enablePointerInteraction(true)
    .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
    .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
    .showAtmosphere(true)
    .atmosphereColor("#0e1525")
    .atmosphereAltitude(0.22)
    .backgroundColor("rgba(0,0,0,0)")
    .pointAltitude(0)
    .pointRadius(0)
    .pointColor(() => "transparent");

  const scene = globe.scene();
  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  globe.renderer().setClearColor(0x000000, 0);

  // ============================================================
  // ✨ Beacons
  // ============================================================
  let beaconMeshes = [];

  globe.onGlobeReady(() => {
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xaabbff, 1.4);
    dir.position.set(3, 2, 3);
    scene.add(dir);

    globe
      .customLayerData(mapped)
      .customThreeObject((d) => {
        const color = VOL_COL[d.volatility?.toLowerCase()] || "#58b9ff";
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 32, 32),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 4.5,
            roughness: 0.25,
            metalness: 0.7,
            transparent: true,
            opacity: 0.95,
          })
        );

        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 5, 32, 1, true),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        beam.position.y = 2.5;

        const aura = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 32, 32),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending,
          })
        );

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.6, 0.85, 64),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;

        const group = new THREE.Group();
        group.add(orb, beam, aura, ring);
        group.userData = { orb, beam, aura, ring, data: d };
        return group;
      })
      .customThreeObjectUpdate((obj, d) => {
        if (!d.lat || !d.lng) return;
        const { x, y, z } = globe.getCoords(d.lat, d.lng, 0);
        obj.position.set(x, y, z);
        const up = new THREE.Vector3(x, y, z).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        obj.quaternion.copy(q);
      });

    setTimeout(() => {
      beaconMeshes = [];
      scene.traverse(o => {
        if (o.isMesh && (o.userData?.data || o.parent?.userData?.data)) beaconMeshes.push(o);
      });
      console.log(`✅ ${beaconMeshes.length} beacon meshes collected for raycasting`);
    }, 1000);
  });

  // ============================================================
  // 🗺️ Country Borders
  // ============================================================
  fetch("/assets/world.geojson")
    .then(res => res.json())
    .then(geo => {
      let activeCountry = null;
      const glowColor = "#4ddfb5";
      // --- Quick alias table from geojson properties to your keys ---
      const CONTINENT_ALIASES = {
        "North America": "NorthAmerica",
        "South America": "SouthAmerica",
        "Europe": "Europe",
        "Africa": "Africa",
        "Asia": "Asia",
        "Oceania": "Oceania",
        "Australia": "Oceania",
        "Antarctica": "Antarctica",
        // safety nets
        "Americas": "NorthAmerica",   // REGION_UN sometimes says "Americas"
        "Seven seas (open ocean)": null
      };

      // --- Improved fallback zones (looser, more forgiving) ---
      const ZONES = {
        NorthAmerica: { latMin: 5, latMax: 83, lngMin: -170, lngMax: -30 },
        SouthAmerica: { latMin: -60, latMax: 18, lngMin: -90, lngMax: -30 },
        Europe: { latMin: 34, latMax: 72, lngMin: -25, lngMax: 60 },
        Africa: { latMin: -35, latMax: 38, lngMin: -20, lngMax: 55 },
        Asia: { latMin: -10, latMax: 80, lngMin: 25, lngMax: 180 },
        Oceania: { latMin: -50, latMax: 15, lngMin: 110, lngMax: 180 },
        Antarctica: { latMin: -90, latMax: -60, lngMin: -180, lngMax: 180 }
      };

      // --- Normalize longitudes to [-180, 180) ---
      function normLng(l) {
        return ((l + 180) % 360 + 360) % 360 - 180;
      }

      // --- Mean longitude using circular mean (handles anti-meridian) ---
      function meanLongitude(lngs) {
        let sx = 0, cx = 0;
        for (const d of lngs) {
          const r = (normLng(d) * Math.PI) / 180;
          sx += Math.sin(r);
          cx += Math.cos(r);
        }
        return normLng((Math.atan2(sx, cx) * 180) / Math.PI);
      }

      // --- Robust center estimation (not geodesic, but resilient) ---
      function getFeatureCenter(f) {
        const coords = f.geometry.coordinates.flat(Infinity);
        const lngs = [], lats = [];
        for (let i = 0; i < coords.length; i += 2) {
          lngs.push(coords[i]);
          lats.push(coords[i + 1]);
        }
        const lat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const lon = meanLongitude(lngs);
        return { LAT: lat, LON: lon };
      }

      // --- Prefer metadata from the feature; fallback to zones ---
      function inferContinent(lat, lon, props) {
        const meta =
          props?.CONTINENT ||
          props?.continent ||
          props?.REGION_UN ||
          props?.region_un ||
          props?.SUBREGION ||
          props?.subregion ||
          null;

        if (meta) {
          const key = CONTINENT_ALIASES[meta] ?? CONTINENT_ALIASES[`${meta}`] ?? null;
          if (key) return key;
        }

        // fallback by zones
        lon = normLng(lon);
        for (const [name, c] of Object.entries(ZONES)) {
          if (lat >= c.latMin && lat <= c.latMax && lon >= c.lngMin && lon <= c.lngMax) {
            return name;
          }
        }
        return null;
      }

      globe
        .polygonsData(geo.features)
        .polygonCapColor(() => "rgba(30, 40, 60, 0.05)")
        .polygonSideColor(() => "rgba(255,255,255,0.03)")
        .polygonStrokeColor(() => "rgba(180,200,255,0.25)")
        .polygonAltitude(0.003)
        .polygonLabel(({ properties: d }) => `${d.ADMIN}`)
      // --- Store hover handler so we can reattach later ---
      hoverHandler = (hoverD) => {
        globe
          .polygonStrokeColor(d =>
            d === activeCountry
              ? glowColor
              : d === hoverD
                ? "rgba(77,223,181,0.8)"
                : "rgba(180,200,255,0.25)"
          )
          .polygonAltitude(d =>
            d === hoverD || d === activeCountry ? 0.01 : 0.003
          );
      };

      globe
        .polygonsData(geo.features)
        .polygonCapColor(() => "rgba(30, 40, 60, 0.05)")
        .polygonSideColor(() => "rgba(255,255,255,0.03)")
        .polygonStrokeColor(() => "rgba(180,200,255,0.25)")
        .polygonAltitude(0.003)
        .polygonLabel(({ properties: d }) => `${d.ADMIN}`)
        .onPolygonHover(hoverHandler)

        .onPolygonClick((clicked) => {
          const props = clicked?.properties || {};
          const name = props.ADMIN || props.NAME || props.name_long || "Unknown";
          activeCountry = clicked;
          console.log(`🗺️ Selected: ${name}`);

          globe
            .polygonStrokeColor(d => (d === activeCountry ? glowColor : "rgba(180,200,255,0.25)"))
            .polygonAltitude(d => (d === activeCountry ? 0.012 : 0.003));

          const { LAT, LON } = getFeatureCenter(clicked);
          const continent = inferContinent(LAT, LON, props);

          if (continent) {
            console.log(`🌐 ${name} → ${continent}`);
            highlightContinent(continent);
            selectRegion(continent);
          } else {
            console.log(`⚠️ Could not resolve continent for ${name}`, { LAT, LON, props });
          }
        });

      function getCenter(f) {
        const coords = f.geometry.coordinates.flat(Infinity);
        const lngs = [], lats = [];
        for (let i = 0; i < coords.length; i += 2) {
          lngs.push(coords[i]);
          lats.push(coords[i + 1]);
        }
        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        return { LAT: avg(lats), LON: avg(lngs) };
      }

      function getContinent(lat, lon) {
        // normalize longitude to -180..180
        if (lon > 180) lon -= 360;

        for (const [name, c] of Object.entries(CONTINENT_ZONES)) {
          if (
            lat >= c.latMin &&
            lat <= c.latMax &&
            lon >= c.lngMin &&
            lon <= c.lngMax
          ) {
            return name;
          }
        }
        return null;
      }

    });

  // ============================================================
  // 🧭 Hover Tooltip
  // ============================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let activePoint = null;
  const tooltip = (() => {
    const tip = document.createElement("div");
    Object.assign(tip.style, {
      position: "fixed",
      background: "rgba(20,25,35,0.9)",
      color: "#eaf3ff",
      padding: "8px 12px",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px",
      fontFamily: "Outfit,sans-serif",
      fontSize: "13px",
      pointerEvents: "none",
      backdropFilter: "blur(8px)",
      zIndex: "9999",
      display: "none",
      opacity: "0",
      transition: "opacity 0.2s ease",
    });
    document.body.appendChild(tip);
    return tip;
  })();

  window.addEventListener("mousemove", (e) => {
    if (!globe.camera() || !beaconMeshes.length) return;
    const canvas = globeEl.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, globe.camera());
    const hits = raycaster.intersectObjects(beaconMeshes, true);

    let d = null;
    if (hits.length) {
      let o = hits[0].object;
      while (o && !d) {
        if (o.userData?.data) d = o.userData.data;
        o = o.parent;
      }
    }

    if (d) {
      if (activePoint !== d) {
        activePoint = d;
        tooltip.innerHTML = `
          <strong>${d.title}</strong><br>
          <span style="color:#9bb5cc;">${d.region ?? "Unknown"}</span><br>
          Volatility:
          <span style="color:${VOL_COL[d.volatility?.toLowerCase()] ?? "#58b9ff"}">
            ${(d.volatility || "n/a").toUpperCase()}
          </span>`;
      }
      Object.assign(tooltip.style, {
        display: "block",
        opacity: "1",
        left: `${e.clientX + 16}px`,
        top: `${e.clientY + 16}px`,
      });
    } else if (activePoint) {
      activePoint = null;
      tooltip.style.opacity = "0";
      setTimeout(() => (tooltip.style.display = "none"), 150);
    }
  });

  // ============================================================
  // 🧩 Click → Beacon or Continent
  // ============================================================
  const raycasterClick = new THREE.Raycaster();
  let activeGlow = null;

  globeEl.addEventListener("click", (e) => {
    if (!globe.camera()) return;
    const canvas = globeEl.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycasterClick.setFromCamera(mouse, globe.camera());

    // 1️⃣ Beacon click
    const hitBeacon = raycasterClick.intersectObjects(beaconMeshes, true);
    if (hitBeacon.length) {
      let obj = hitBeacon[0].object;
      while (obj && !obj.userData?.data) obj = obj.parent;
      if (obj?.userData?.data) return showScenarioPopup(obj.userData.data);
    }

    // 2️⃣ Continent click
    const meshes = [];
    globe.scene().traverse(o => {
      if (o.isMesh && o.geometry?.type?.includes("Sphere")) meshes.push(o);
    });
    const hits = raycasterClick.intersectObjects(meshes, true);
    if (!hits.length) return;

    const p = hits[0].point.normalize();
    const lat = 90 - (Math.acos(p.y) * 180) / Math.PI;
    const lng = ((Math.atan2(p.z, p.x) * 180) / Math.PI - 90 + 360) % 360 - 180;
    const continent = Object.keys(CONTINENT_ZONES).find((key) => {
      const c = CONTINENT_ZONES[key];
      return lat >= c.latMin && lat <= c.latMax && lng >= c.lngMin && lng <= c.lngMax;
    });

    if (continent) {
      console.log(`🌎 Background click → ${continent}`);
      highlightContinent(continent);
      selectRegion(continent);
    }
  });

  // ============================================================
  // 💫 Highlight Continent
  // ============================================================
  function highlightContinent(name) {
    const c = CONTINENT_ZONES[name];
    if (!c) return;
    const lat = (c.latMin + c.latMax) / 2;
    const lng = (c.lngMin + c.lngMax) / 2;
    const { x, y, z } = globe.getCoords(lat, lng, 0);
    if (activeGlow) scene.remove(activeGlow);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(3.8, 48, 48),
      new THREE.MeshBasicMaterial({
        color: "#4ddfb5",
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.position.set(x, y, z);
    scene.add(glow);
    activeGlow = glow;

    const clock = new THREE.Clock();
    (function animate() {
      const t = clock.getElapsedTime();
      if (!scene.children.includes(glow)) return;
      glow.scale.setScalar(1.1 + 0.05 * Math.sin(t * 2));
      glow.material.opacity = 0.22 + 0.06 * Math.sin(t * 3);
      requestAnimationFrame(animate);
    })();
  }

  // ============================================================
  // 🧩 Mission Popup
  // ============================================================
  function showScenarioPopup(data) {
    let modal = document.getElementById("scenarioPopup");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "scenarioPopup";
      Object.assign(modal.style, {
        position: "fixed",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
        zIndex: "10000",
      });
      modal.innerHTML = `
        <div style="background:rgba(20,25,35,0.85);border:1px solid rgba(255,255,255,0.1);
          border-radius:16px;padding:28px 32px;color:#eaf3ff;
          font-family:'Outfit',sans-serif;max-width:420px;
          box-shadow:0 0 30px rgba(77,223,181,0.25);
          text-align:center;animation:fadeIn 0.3s ease;">
          <h2 id="popupTitle" style="margin-bottom:10px;font-size:1.4rem;color:#4ddfb5;"></h2>
          <p id="popupDesc" style="font-size:0.95rem;color:#b7c6da;margin-bottom:18px;line-height:1.5;"></p>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button id="joinBtn" style="padding:10px 20px;border-radius:8px;border:none;background:#4ddfb5;color:#000;font-weight:600;cursor:pointer;">Join Mission</button>
            <button id="cancelBtn" style="padding:10px 20px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#eaf3ff;cursor:pointer;">Cancel</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    modal.querySelector("#popupTitle").textContent = data.title;
    modal.querySelector("#popupDesc").textContent = data.description || "No description available.";
    modal.style.display = "flex";

    modal.querySelector("#joinBtn").onclick = async () => {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");
      try {
        const res = await fetch(`/scenarios/${data.id}/join`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.success) {
          console.log(`✅ Joined scenario ${data.id}`);
          window.open(
            `scenario-console.html?scenarioId=${data.id}&token=${encodeURIComponent(token)}`,
            "_blank"
          );
        } else alert(result.message || "Failed to join scenario.");
      } catch (err) {
        console.error("❌ Error joining scenario:", err);
        alert("Error joining scenario. Please try again.");
      }
      modal.style.display = "none";
    };

    modal.querySelector("#cancelBtn").onclick = () => (modal.style.display = "none");
  }

  // ============================================================
  // 🧭 REGION → CINEMATIC TIMELINE PANEL (Minimal Floating Version)
  // ============================================================
  function showRegionTimeline(regionEvents) {
    const timeline = document.getElementById("region-timeline");
    const nodeContainer = document.getElementById("timeline-nodes");
    const detail = document.getElementById("timeline-detail");
    if (!timeline || !nodeContainer) return;

    nodeContainer.innerHTML = "";
    detail.innerHTML = "";

    if (!regionEvents.length) {
      timeline.classList.remove("active");
      return;
    }

    regionEvents.forEach((s, i) => {
      const node = document.createElement("div");
      node.className = "timeline-node";
      node.dataset.label = `${s.year || ""}`;
      node.addEventListener("click", () => selectTimelineNode(s, i));
      nodeContainer.appendChild(node);
    });

    timeline.classList.add("active");
    selectTimelineNode(regionEvents[0], 0);
  }
  // ============================================================
  // 🎬 TIMELINE STATE MANAGEMENT & GLOBE ANIMATION
  // ============================================================
  let activeRegion = null; // track which continent is selected

function selectRegion(region) {
  if (activeRegion === region) return;
  activeRegion = region;

  // --- Filter region scenarios ---
  const regionEvents = mapped.filter((s) => {
    const r = (s.region || "").toLowerCase();
    const target = region.toLowerCase();
    if (r.includes("global")) return true;
    if (r.includes(target) || target.includes(r)) return true;
    const map = {
      asia: ["asia", "apac", "asia-pacific", "east asia", "oceania"],
      europe: ["europe", "eu", "emea"],
      africa: ["africa", "mena", "middle east", "north africa"],
      northamerica: ["usa", "america", "north america"],
      southamerica: ["south america", "latam"],
      oceania: ["oceania", "australia", "new zealand"],
    };
    return map[target]?.some((alias) => r.includes(alias));
  });

  // 🪄 Show header
  const header = document.getElementById("region-header");
  header.querySelector("#region-name").textContent = region;
  header.querySelector("#region-meta").textContent = `${regionEvents.length} Scenarios`;
  header.classList.add("active");

  showRegionTimeline(regionEvents);
  openTimelineAnimation(region);
}


  // 🧭 Animate Globe and Show Timeline
  function openTimelineAnimation(region) {
    const globeLayer = document.getElementById("globe-layer");
    const timeline = document.getElementById("region-timeline");
    controls.enabled = false; // disable orbit controls
    globe.onPolygonHover(null); // disable hover reactions
    // shrink and float up the globe
    globeLayer.classList.add("shrink-up");
    timeline.classList.add("active");

    // add a close button if not existing
    let closeBtn = document.querySelector(".timeline-close");
    if (!closeBtn) {
      closeBtn = document.createElement("button");
      closeBtn.className = "timeline-close";
      closeBtn.innerHTML = "×";
      closeBtn.onclick = closeTimeline;
      timeline.appendChild(closeBtn);
    }
  }

  // 🧩 Close Timeline & Reset Globe
  function closeTimeline() {
    const timeline = document.getElementById("region-timeline");
    const globeLayer = document.getElementById("globe-layer");
    controls.enabled = true;
    globe.onPolygonHover(hoverHandler); // restore your hover
    timeline.classList.remove("active");
    globeLayer.classList.remove("shrink-up");
    activeRegion = null;
  }

function selectTimelineNode(scenario, index) {
  const nodes = document.querySelectorAll(".timeline-node");
  const detail = document.getElementById("timeline-detail");

  nodes.forEach((n, i) => n.classList.toggle("active", i === index));

  const start = new Date(scenario.startDate).toLocaleDateString("en-GB", {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const end = new Date(scenario.endDate).toLocaleDateString("en-GB", {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  detail.classList.remove("show");
  setTimeout(() => {
    detail.innerHTML = `
      <h3>${String(index + 1).padStart(2, "0")} — ${scenario.title}</h3>
      <p>${scenario.description || "Explore market impact and responses."}</p>
      
      <div class="detail-meta">
        <div><strong>📅</strong> ${start} → ${end}</div>
        <div><strong>💰</strong> Starting Balance: $${parseFloat(scenario.startingBalance).toFixed(2)}</div>
        <div><strong>⚡</strong> Volatility: 
          <span style="color:${VOL_COL[scenario.volatility?.toLowerCase()] || '#58b9ff'}">
            ${scenario.volatility || 'n/a'}
          </span>
        </div>
        <div><strong>🌍</strong> Region: ${scenario.region || 'Unknown'}</div>
      </div>

      <a href="scenario-console.html?id=${scenario.id}">Open Console</a>
    `;
    detail.classList.add("show");
  }, 200);
}



  window.openScenario = (id) => {
    window.open(`scenario-console.html?scenarioId=${id}`, "_blank");
  };

  window.closeTimeline = closeTimeline;
  window.openTimelineAnimation = openTimelineAnimation;

  
});
