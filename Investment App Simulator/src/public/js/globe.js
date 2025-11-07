// ============================================================
// BLACKSEALED — Energy Pulse Globe (Cinematic Orb Nodes)
// ============================================================

console.log("🌌 BlackSealed Globe — Energy Pulse Mode");

const scenarios = [
  { id: "tsh-2025", name: "Trade Tariff Shock", year: 2025, region: "Asia", lat: 35, lng: 105, volatility: "high" },
  { id: "oil-2024", name: "Oil Supply Crunch", year: 2024, region: "MENA", lat: 25, lng: 45, volatility: "med" },
  { id: "cov-2020", name: "Pandemic Recession", year: 2020, region: "US", lat: 40, lng: -95, volatility: "extreme" },
  { id: "inf-2022", name: "Inflation Reversal", year: 2022, region: "EU", lat: 48, lng: 10, volatility: "low" }
];

const VOL_COL = {
  low: "#4ddfb5",
  med: "#4fa8ff",
  high: "#7a88ff",
  extreme: "#ff66c4"
};

window.addEventListener("DOMContentLoaded", () => {
  const globeEl = document.getElementById("globe-layer");
  if (!globeEl) return console.error("❌ Globe element not found");

  const globe = Globe({ rendererConfig: { alpha: true, antialias: true } })(globeEl)
    .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
    .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
    .showAtmosphere(true)
    .atmosphereColor("#172036")
    .atmosphereAltitude(0.4)
    .backgroundColor("rgba(0,0,0,0)")
    .pointOfView({ lat: 5, lng: -55, altitude: 2.5 }, 1500)
    .customThreeObject((d) => {
      const { THREE } = globe;
      const group = new THREE.Group();
      const color = VOL_COL[d.volatility];

      // 🔮 core energy sphere
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 32, 32),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending
        })
      );

      // ✧ luminous shell
      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 32, 32),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        })
      );
      core.add(aura);
      group.add(core);

      // subtle pulse
      const speed = 0.0012 + Math.random() * 0.0008;
      function pulse() {
        const t = Date.now() * speed;
        const s = 1 + 0.18 * Math.sin(t);
        aura.scale.set(s, s, s);
        requestAnimationFrame(pulse);
      }
      pulse();

      return group;
    })
    .pointsData(scenarios)
    .pointLat("lat")
    .pointLng("lng")
    .pointAltitude(() => 0.015)
    .pointColor((d) => VOL_COL[d.volatility]);

  // --- Controls ---
  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // --- Transparent background ---
  const renderer = globe.renderer();
  renderer.setClearColor(0x000000, 0);

  console.log("✅ Energy pulse orbs active — no cylinders, transparent background");
});
