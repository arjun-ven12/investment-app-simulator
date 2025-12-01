// ============================================================================
//  BlackSealed — Scenario Console Onboarding (Standalone)
//  Only runs on /scenario-console page
//  Uses User.scenarioConsoleStage + User.skipScenarioConsole (DB)
// ============================================================================

(function () {
  if (typeof Shepherd === "undefined") {
    console.warn("[ScenarioConsoleOnboarding] Shepherd not loaded.");
    return;
  }

  // ---------------------------------------------------------
  // API HELPERS
  // ---------------------------------------------------------
  async function apiGet(path) {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await fetch(`/onboarding${path}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) return null;
    return res.json();
  }

  async function apiPost(path, body) {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await fetch(`/onboarding${path}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) return null;
    return res.json();
  }

  // ---------------------------------------------------------
  // Load scenario onboarding state from DB
  // ---------------------------------------------------------
  let SC_STATE = {
    scenarioConsoleStage: "not_started",
    skipScenarioConsole: false
  };

  async function loadScenarioState() {
    const data = await apiGet("/status");
    if (!data) return;

    SC_STATE.scenarioConsoleStage = data.scenarioConsoleStage || "not_started";
    SC_STATE.skipScenarioConsole = !!data.skipScenarioConsole;
  }

  function persistStage(stage) {
    SC_STATE.scenarioConsoleStage = stage;
    return apiPost("/scenario/stage", { scenarioConsoleStage: stage });
  }

  function markSkipForever() {
    SC_STATE.skipScenarioConsole = true;
    return apiPost("/scenario/never");
  }

  function markDone() {
    return persistStage("done").then(() => markSkipForever());
  }

  // ---------------------------------------------------------
  // Create Shepherd Tour
  // ---------------------------------------------------------
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: `bs-onboard-theme bs-onboard-scenario-console`,
      cancelIcon: { enabled: true },
      scrollTo: true
    }
  });

  const Btn = {
    next: { text: "Next", action: () => tour.next() },
    back: { text: "Back", action: () => tour.back() },

    never: {
      text: "Don't Show Again",
      action: async () => {
        await markSkipForever();
        tour.cancel();
      }
    },

    finish: {
      text: "Finish",
      action: async () => {
        await markDone();
        tour.complete();
      }
    }
  };

  // ---------------------------------------------------------
  // STEP DEFINITIONS
  // ---------------------------------------------------------
  const STEPS = [
    {
      id: "scn-welcome",
      text: `
        <h2>Scenario Console</h2>
        <p>
          This is your live historical-trading environment.<br>
          Prices update exactly as they did during the real event.
        </p>
      `,
      buttons: [Btn.next, Btn.never],
      when: {
        show: () => persistStage("welcome")
      }
    },

    {
      id: "scn-details",
      attachTo: { element: ".scenario-details", on: "right" },
      text: `
        <h3>Scenario Details</h3>
        <p>
          Shows title, description, date range, starting capital,
          and recommended symbols.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("details")
      }
    },

    {
      id: "scn-wallet",
      attachTo: { element: ".wallet-balance", on: "bottom" },
      text: `
        <h3>Wallet Balance</h3>
        <p>
          Your available cash for this attempt. Resets every run.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("wallet")
      }
    },

    {
      id: "scn-progress",
      attachTo: { element: ".progressbar", on: "bottom" },
      text: `
        <h3>Scenario Progress</h3>
        <p>
          Shows your progress through the historical timeline.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("progress")
      }
    },

    {
      id: "scn-chart",
      attachTo: { element: "#myChart3", on: "top" },
      text: `
        <h3>Historical Chart</h3>
        <p>
          Plays forward historically with real prices. Zoom and pan anytime.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("chart")
      }
    },

    {
      id: "scn-trading",
      attachTo: { element: "#trading-form", on: "left" },
      text: `
        <h3>Trading Form</h3>
        <p>
          Execute Market or Limit orders.  
          Trades fill using the real historical price at that moment.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("trading")
      }
    },

    {
      id: "scn-replay",
      attachTo: { element: ".replay-controls", on: "top" },
      text: `
        <h3>Replay Controls</h3>
        <p>
          Play, pause, save & exit, or finish.  
          Adjust speed from 1x to 10x.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("replay")
      }
    },

    {
      id: "scn-history",
      attachTo: { element: ".history-container", on: "top" },
      text: `
        <h3>Trade History</h3>
        <p>
          Review every trade and order.  
          Perfect for analysing timing.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("history")
      }
    },

    {
      id: "scn-portfolio",
      attachTo: { element: "#portfolioContainer", on: "top" },
      text: `
        <h3>Portfolio & Allocation</h3>
        <p>
          Shows holdings and sector allocation, updated live.
        </p>
      `,
      buttons: [Btn.back, Btn.next],
      when: {
        show: () => persistStage("portfolio")
      }
    },

    {
      id: "scn-end",
      attachTo: { element: ".endgame", on: "top" },
      text: `
        <h3>End Screen</h3>
        <p>
          After completing the scenario, you’ll see:<br>
          • Final portfolio value<br>
          • Return<br>
          • Holdings<br>
          • AI analysis of your performance
        </p>
      `,
      buttons: [Btn.back, Btn.finish],
      when: {
        show: () => persistStage("end")
      }
    }
  ];

  STEPS.forEach(step => tour.addStep(step));

  // ---------------------------------------------------------
  // AUTOSTART (only if not skipped + not done)
  // ---------------------------------------------------------
  window.addEventListener("DOMContentLoaded", async () => {
    await loadScenarioState();

    if (SC_STATE.skipScenarioConsole) return;
    if (SC_STATE.scenarioConsoleStage === "done") return;

    // Only run on the scenario console page
    if (!window.location.pathname.includes("scenario-console")) return;

    setTimeout(() => {
      try {
        tour.start();
      } catch (e) {
        console.warn("Scenario onboarding failed:", e);
      }
    }, 600);
  });
})();
