let socket = null;

document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("userId");
  if (!userId) return alert("User not logged in.");

  /* ============================================================
     SOCKET SETUP
  ============================================================ */
  if (typeof io !== "undefined") {
    socket = io();
    socket.on("connect", () => socket.emit("join", { userId }));
    socket.on("referralUpdate", (stats) => {
      updateStatsUI(stats);
      updateProgressBar(stats.creditsEarned);
    });
    socket.on("referralHistoryUpdate", (history) =>
      updateReferralHistoryTable(history)
    );
  }

  /* ============================================================
     HELPER FUNCTIONS
  ============================================================ */
  function updateStatsUI(stats) {
    const signupCount = document.getElementById("signupCount");
    const creditsEarned = document.getElementById("creditsEarned");
    if (signupCount) signupCount.innerText = stats.referralSignups ?? 0;
    if (creditsEarned) creditsEarned.innerText = `$${stats.creditsEarned ?? 0}`;
  }

  function updateReferralLinkUI(link) {
    const mainInput = document.getElementById("referralCode");
    const miniInput = document.getElementById("miniReferralCode");
    if (mainInput) mainInput.value = link;
    if (miniInput) miniInput.value = link;
  }

  /* ============================================================
     COPY REFERRAL LINK — ULTRA RELIABLE VERSION
  ============================================================ */
  document.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest("#copyReferral");
    if (!copyBtn) return;

    e.preventDefault();

    const input = document.getElementById("referralCode");
    if (!input) return console.warn("Referral code input not found");

    const link = (input.value || "").trim();
    if (!link) return console.warn("No referral link to copy");

    try {
      // modern clipboard API (works on HTTPS or localhost)
      await navigator.clipboard.writeText(link);
      afterCopySuccess(input);
      return;
    } catch (err) {
      console.warn("navigator.clipboard failed:", err);
    }

    // fallback (works even in HTTP/file contexts)
    try {
      const wasReadOnly = input.hasAttribute("readonly");
      if (wasReadOnly) input.removeAttribute("readonly");
      input.focus();
      input.select();
      input.setSelectionRange(0, link.length);
      const ok = document.execCommand("copy");
      if (wasReadOnly) input.setAttribute("readonly", "");
      if (!ok) throw new Error("execCommand failed");
      afterCopySuccess(input);
      return;
    } catch (err) {
      console.warn("execCommand fallback failed:", err);
    }

    // final resort fallback
    window.prompt("Copy your referral link:", link);
    afterCopySuccess(input);
  });

  function afterCopySuccess(inputEl) {
    inputEl.classList.add("copied-glow");
    showCopyPopup("Referral link copied!");
    setTimeout(() => inputEl.classList.remove("copied-glow"), 600);
  }

  /* ============================================================
     MINI COPY REFERRAL LINK — TOP RIGHT
  ============================================================ */
  const miniCopyBtn = document.getElementById("miniCopyReferral");
  const miniInput = document.getElementById("miniReferralCode");

  if (miniCopyBtn && miniInput) {
    miniCopyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const link = (miniInput.value || "").trim();
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link);
        pulseMiniWidget();
        showCopyPopup("Referral link copied!");
      } catch {
        showCopyPopup("Copy failed", true);
      }
    });
  }

  /* ============================================================
     COPY SUCCESS POPUP
  ============================================================ */
  function showCopyPopup(message, isError = false) {
    const existing = document.querySelector(".copy-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `copy-toast ${isError ? "error" : ""}`;
    toast.innerHTML = `
      <i class="fa-solid ${isError ? "fa-xmark" : "fa-check-circle"}"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 400);
    }, 2000);
  }

  function pulseMiniWidget() {
    const mini = document.querySelector(".mini-referral");
    if (!mini) return;
    mini.classList.add("pulse");
    setTimeout(() => mini.classList.remove("pulse"), 600);
  }

  /* ============================================================
     FETCH DATA
  ============================================================ */
  async function fetchReferralStats() {
    try {
      const res = await fetch(`/referral/${userId}`);
      const data = await res.json();
      updateStatsUI(data.referral);
      updateReferralLinkUI(data.referral.referralLink);
      updateProgressBar(data.referral.creditsEarned);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchReferralHistory() {
    try {
      const res = await fetch(`/referral/${userId}/history`);
      const data = await res.json();
      updateReferralHistoryTable(data.history);
    } catch (err) {
      console.error(err);
    }
  }

function updateReferralHistoryTable(history) {
  const container = document.getElementById("referralHistory");
  if (!container) return;
  container.innerHTML = "";

  history.forEach((item) => {
    const row = document.createElement("tr");
    const date = new Date(item.usedAt).toLocaleString();

    const creditColor = item.credits > 0 ? "#00ff9d" : "#64748b"; // neon green or muted gray

    row.innerHTML = `
  <td>
    <div class="user-cell">
      <i class="fa-solid fa-user"></i>
      <div class="user-info">
        <span class="username">${item.usedBy}</span>
        <span class="action-sub">${item.action}</span>
      </div>
    </div>
  </td>
  <td>${item.referralOwner}</td>
    <td class="credits-cell">
    ${item.credits !== null ? `+$${item.credits}` : "—"}
  </td>
  <td>${date}</td>

`;



    container.appendChild(row);
  });
}




  /* ============================================================
     PROGRESS BAR
  ============================================================ */
  function updateProgressBar(creditsEarned = 0) {
    const maxCap = 5000;
    const step = 500;
    const newProgress = Math.min((creditsEarned / maxCap) * 100, 100);
    const path = document.getElementById("sealedProgressPath");
    const caption = document.getElementById("sealedCaption");
    if (!path || !caption) return;

    const totalLength = path.getTotalLength();
    const targetOffset = totalLength - totalLength * (newProgress / 100);

    path.style.transition = "stroke-dashoffset 1.2s ease-out";
    path.style.strokeDashoffset = targetOffset;

    const progressPercent = Math.round(newProgress);
    const nextReward = Math.min(Math.ceil(creditsEarned / step) * step + step, maxCap);
    caption.textContent =
      creditsEarned >= maxCap
        ? `100% — You’ve unlocked the full $${maxCap} reward!`
        : `${progressPercent}% — Next referral: $${nextReward}.`;
  }

  /* ============================================================
     TABS — SMOOTH TRANSITION
  ============================================================ */
/* ============================================================
   TABS — SMOOTH TRANSITION (NO LAYOUT SHIFT)
============================================================ */
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    if (btn.classList.contains("active")) return;

    // switch active state
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const currentTab = document.querySelector(".tab-content.active");
    const nextTab = document.getElementById(target);
    if (!nextTab) return;

    currentTab.classList.remove("active");
    currentTab.classList.add("fade-out");

    setTimeout(() => {
      currentTab.classList.remove("fade-out");
      nextTab.classList.add("active", "fade-in");
      setTimeout(() => nextTab.classList.remove("fade-in"), 400);
      adjustTabHeight();
    }, 200);
  });
});

// Smoothly adjust the .info-tabs container height so layout below stays fixed
const infoTabs = document.querySelector(".info-tabs");
function adjustTabHeight() {
  const active = document.querySelector(".tab-content.active");
  if (infoTabs && active) {
    infoTabs.style.height = active.offsetHeight + "px";
  }
}

// Recalculate height on tab click and on load
tabBtns.forEach((btn) => btn.addEventListener("click", () => {
  setTimeout(adjustTabHeight, 350); // wait for fade transition
}));
window.addEventListener("load", adjustTabHeight);

  /* ============================================================
     INITIAL LOAD
  ============================================================ */
  
  fetchReferralStats();
  fetchReferralHistory();
});
/* STAR BACKGROUND */
const canvas = document.getElementById('starCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + 0.2,
    s: Math.random() * 0.008 + 0.0015,

  }));

  function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const star of stars) {
      const flicker = 0.6 + Math.sin(Date.now() * star.s) * 0.4;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${flicker * 0.8})`;
      ctx.fill();
    }
    requestAnimationFrame(drawStars);
  }
  drawStars();
}
