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
/* =========================================================
   BLACKSEALED CONSTELLATION — Section Version (Parallax)
========================================================= */

import * as THREE from "https://cdn.skypack.dev/three@0.155.0";
import { EffectComposer } from "https://cdn.skypack.dev/three@0.155.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.skypack.dev/three@0.155.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.skypack.dev/three@0.155.0/examples/jsm/postprocessing/UnrealBloomPass.js";

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("constellation-seal");
  if (!canvas) return;

  // Scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 60);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio * 0.9);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // Bloom Composer
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    1.1,
    0.18,
    0.01
  );
  composer.addPass(bloom);

  // Constellation Shape (Curved Nebula Seal)
  const points = [
    new THREE.Vector3(-8, 6, 0),
    new THREE.Vector3(-4, 8, 0),
    new THREE.Vector3(0, 9, 0),
    new THREE.Vector3(4, 8, 0),
    new THREE.Vector3(8, 6, 0),
    new THREE.Vector3(5, 3, 0),
    new THREE.Vector3(2, 1, 0),
    new THREE.Vector3(-2, 0, 0),
    new THREE.Vector3(-5, 3, 0),
    new THREE.Vector3(-3, -3, 0),
    new THREE.Vector3(0, -5, 0),
    new THREE.Vector3(3, -3, 0),
  ];

  // Stars
  const starGeo = new THREE.BufferGeometry().setFromPoints(points);
  const starMat = new THREE.PointsMaterial({
    size: 0.34,
    color: new THREE.Color("#8df1ff"),
    opacity: 0.95,
    transparent: true,
  });
  const stars = new THREE.Points(starGeo, starMat);

  // Lines
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color("#ff9cff"),
    opacity: 0.55,
    transparent: true,
  });
  const line = new THREE.Line(lineGeo, lineMat);

  scene.add(stars);
  scene.add(line);

  // Glow particle
  const glowGeo = new THREE.SphereGeometry(0.33, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({ color: "#fff" });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glow);

  let glowIndex = 0;

  // Scroll parallax tracking
  let scrollY = 0;
  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
  });

  function animate() {
    requestAnimationFrame(animate);

    // Rotation
    stars.rotation.y += 0.002;
    line.rotation.y += 0.002;

    // Micro float
    const t = performance.now() * 0.0005;
    const float = Math.sin(t) * 0.4;
    stars.position.y = float;
    line.position.y = float;

    // Parallax scroll
    const parallax = scrollY * 0.0006;
    stars.position.y -= parallax;
    line.position.y -= parallax;

    // Glow particle path
    glowIndex += 0.02;
    const p = glowIndex % points.length;
    const next = (p + 1) % points.length;

    const currP = points[Math.floor(p)];
    const nextP = points[Math.floor(next)];

    glow.position.lerpVectors(
      currP,
      nextP,
      p % 1
    );

    composer.render();
  }

  animate();

  // Resize support
  window.addEventListener("resize", () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    composer.setSize(canvas.clientWidth, canvas.clientHeight);
  });
});
