// ============================
// BLACKSEALED Terminal Loader (CINEMATIC FINAL VERSION)
// ============================

document.addEventListener("DOMContentLoaded", () => {
  const terminalEl = document.getElementById("bs-terminal-text");
  const loadingScreen = document.getElementById("bs-loading-screen");
  const mainContent = document.getElementById("bs-main-content");

  if (!terminalEl || !loadingScreen) return;

  // Short, clean, premium lines
  const lines = [
    "> Initializing BlackSealed Intelligence System...",
    "> System online ✔"
  ];

  let lineIndex = 0;

  function typeLine() {
    if (lineIndex >= lines.length) return fadeOutSequence();

    const line = lines[lineIndex];
    let charIdx = 0;

    // Smooth & clean typing
    const typing = setInterval(() => {
      terminalEl.textContent += line[charIdx];
      charIdx++;

      if (charIdx >= line.length) {
        clearInterval(typing);
        terminalEl.textContent += "\n";
        lineIndex++;
        setTimeout(typeLine, 150);
      }
    }, 12 + Math.random() * 6);
  }

  function fadeOutSequence() {
    setTimeout(() => {
      loadingScreen.classList.add("bs-hide");

      setTimeout(() => {
        loadingScreen.style.display = "none";

        if (mainContent) {
          mainContent.style.display = "block";
          requestAnimationFrame(() => (mainContent.style.opacity = "1"));
        }
      }, 700); // matches fade-out
    }, 200);
  }

  typeLine();
});
