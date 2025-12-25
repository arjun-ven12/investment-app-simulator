// ============================================================================
//  BlackSealed — Multi-Page Premium Onboarding System (Refactored)
//  Flow: Home → Investment → Blockchain → Scenarios → Academy → Done
//  Backed by User.onboardingStage + User.skipOnboarding
// ============================================================================

let USER_ONBOARDING = {
  onboardingStage: "home",
  skipOnboarding: false
};
function waitForElementVisible(selector, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();

    function check() {
      const el = document.querySelector(selector);

      if (el && el.offsetParent !== null) {
        return resolve(el);
      }

      if (performance.now() - start > timeout) {
        return reject("waitForElementVisible TIMEOUT for " + selector);
      }

      requestAnimationFrame(check);
    }

    check();
  });
}
function waitForText(selector, text, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();

    function check() {
      const el = document.querySelector(selector);
      if (el && el.textContent.includes(text)) {
        return resolve(el);
      }

      if (performance.now() - start > timeout) {
        return reject("waitForText TIMEOUT for " + selector + " containing " + text);
      }

      requestAnimationFrame(check);
    }

    check();
  });
}

// ---------------------------------------------------------
// Small API helpers
// ---------------------------------------------------------
async function apiGet(path) {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const res = await fetch(`/onboarding${path}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
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
// Load/save onboarding state
// ---------------------------------------------------------
async function loadOnboardingState() {
  try {
    const data = await apiGet("/status");
    if (!data) return;

    USER_ONBOARDING = {
      onboardingStage: data.onboardingStage || "home",
      skipOnboarding: !!data.skipOnboarding
    };

    localStorage.setItem("onboardingStage", USER_ONBOARDING.onboardingStage);
  } catch (err) {
    console.warn("[Onboarding] Failed to load state:", err);
  }
}

async function persistStage(stage) {
  try {
    USER_ONBOARDING.onboardingStage = stage;
    localStorage.setItem("onboardingStage", stage);
    await apiPost("/stage", { onboardingStage: stage });
  } catch (err) {
    console.warn("[Onboarding] Failed to persist stage:", err);
  }
}

async function persistSkipOnboarding() {
  try {
    USER_ONBOARDING.skipOnboarding = true;
    localStorage.setItem("onboardingStage", "done");
    await apiPost("/never-show-again");
  } catch (err) {
    console.warn("[Onboarding] Failed to persist skipOnboarding:", err);
  }
}

async function resetOnboardingState() {
  try {
    USER_ONBOARDING = { onboardingStage: "home", skipOnboarding: false };
    localStorage.setItem("onboardingStage", "home");
    await apiPost("/reset");
  } catch (err) {
    console.warn("[Onboarding] Failed to reset onboarding:", err);
  }
}

// IIFE so we don't leak globals
(function () {
  // ---------------------------------------------------------
  // Shepherd Safety Guard
  // ---------------------------------------------------------
  if (typeof Shepherd === "undefined") {
    console.warn("[BlackSealed Onboarding] Shepherd.js not loaded — tours disabled.");
    window.BlackSealedOnboarding = {
      async reset() { await resetOnboardingState(); },
      status() { return USER_ONBOARDING.onboardingStage || "home"; }
    };
    return;
  }

  // ---------------------------------------------------------
  // Section Metadata (for Navigator)
  // ---------------------------------------------------------
  const SECTION_ROUTES = {
    home: {
      label: "Home",
      stage: "home",
      path: "/home"
    },
    investment: {
      label: "Trading Console",
      stage: "investment",
      path: "/investment"
    },
    blockchain: {
      label: "Blockchain Explorer",
      stage: "blockchain",
      path: "/blockchain"
    },
    scenarios: {
      label: "Scenarios",
      stage: "scenarios",
      path: "/scenarios"
    },
    academy: {
      label: "Academy",
      stage: "academy",
      path: "/allGuides"
    }
  };

  function renderSectionNavigator(currentKey) {
    return `
      <div class="bs-section-nav">
        <button type="button" class="bs-section-nav-toggle">
          Sections
          <span class="bs-section-nav-chevron">▾</span>
        </button>
        <div class="bs-section-nav-menu">
          ${Object.entries(SECTION_ROUTES).map(([key, meta]) => `
            <button
              type="button"
              class="bs-section-nav-item ${key === currentKey ? "is-active" : ""}"
              data-bs-section-nav="${key}"
            >
              ${meta.label}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  async function navigateToSection(key, tour) {
    const meta = SECTION_ROUTES[key];
    if (!meta) return;

    await persistStage(meta.stage);
    tour.complete();
    window.location.href = meta.path;
  }

  // ---------------------------------------------------------
  // Create Tour
  // ---------------------------------------------------------
  function createTour(sectionKey) {
    return new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: `bs-onboard-theme bs-onboard-${sectionKey}`,
        cancelIcon: { enabled: true },
        scrollTo: true
      }
    });
  }

  // ---------------------------------------------------------
  // Button helpers
  // ---------------------------------------------------------
  const Buttons = {
    next: tour => ({ text: "Next", action: () => tour.next() }),
    back: tour => ({ text: "Back", action: () => tour.back() }),
    never: tour => ({
      text: "Don't Show Again",
      action: async () => {
        await persistSkipOnboarding();
        tour.cancel();
      }
    }),
    jump: (tour, id, label) => ({
      text: label,
      action: () => tour.show(id)
    }),
    goTo: (tour, targetSectionKey, label) => ({
      text: label,
      action: async () => {
        const target = SECTION_ROUTES[targetSectionKey];
        if (!target) return;
        await persistStage(target.stage);
        tour.complete();
        window.location.href = target.path;
      }
    }),
    finish: (tour) => ({
      text: "Finish Onboarding",
      action: async () => {
        await persistStage("done");
        await persistSkipOnboarding();
        tour.complete();
      }
    })
  };

  // ---------------------------------------------------------
  // STEP DEFINITIONS (structured, same content as your big version)
  // ---------------------------------------------------------
  const STEP_DEFS = {
    home: [
      {
        id: "home-welcome",
        includeNavigator: true,
        title: "Welcome to BlackSealed",
        body: `
          BlackSealed is a full-stack investment simulator that combines live market logic,
          historical scenarios, AI analysis, and a private blockchain ledger.
          This walkthrough introduces the core elements of your home dashboard.
        `,
        buttons: ["next", "never"]
      },
      {
        id: "home-wallet",
        attachTo: { element: "#wallet", on: "bottom" },
        title: "Wallet Balance",
        body: `
          This is your simulated buying power. It updates automatically whenever you open,
          adjust, or close positions across stocks and options.
        `,
        buttons: ["back", "next"]
      },
      {
        id: "home-ai-advice",
        attachTo: { element: "#ai-advice-section", on: "top" },
        title: "Daily AI Advice",
        body: `
          Nyra AI reviews your portfolio, recent trades, risk exposure, and behaviour
          to generate a daily set of insights. Advice refreshes every day at 9:00 AM and 9:00 PM (SGT).
        `,
        buttons: ["back", "next"]
      },
      {
        id: "home-portfolio",
        attachTo: { element: "#portfolio-section", on: "top" },
        title: "Portfolio Overview",
        body: `
          View open and closed positions, realised and unrealised P&amp;L,
          and allocation across symbols and sectors.
        `,
        buttons: ["back", "next"]
      },
      {
        id: "home-leaderboard",
        attachTo: { element: "#leaderboard-section", on: "top" },
        title: "Leaderboard",
        body: `
          Compare your performance against other BlackSealed users. The ranking focuses
          on consistency and discipline instead of short-term gambling.
        `,
        buttons: [
          "back",
          { type: "goTo", target: "investment", label: "Go to Trading →" },
          "never"
        ]
      }
    ],

    investment: [
      {
        id: "inv-welcome",
        includeNavigator: true,
        title: "Trading Console",
        body: `
      This is your primary execution and analysis workspace. 
      Charts, order entry, portfolio data, and analytics are all integrated here.
    `,
        buttons: ["next", "never"]
      },
      {
        id: "search",
        attachTo: { element: "#stock-search", on: "bottom" },
        title: "Symbol Search",
        body: `
      Search for any listed stock. You can choose to favourite any stocks searched.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "favorites",
        attachTo: { element: "#favorite-stocks", on: "right" },
        title: "Watchlist",
        body: `
      Save important symbols for quick access and monitoring.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "modes",
        attachTo: { element: ".tab-container", on: "top" },
        title: "Stock & Options Modes",
        body: `
      Switch between stock dashboard and options dashboard. 
      Each dashboard includes respective data, charts, order types, and analytics.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "chart-panel",
        attachTo: { element: "#chart-form-intraday", on: "bottom" },
        title: "Chart Settings",
        body: `
      Select time ranges, chart types, and update graphs.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "chart",
        attachTo: { element: "#myChart2", on: "top" },
        title: "Interactive Chart",
        body: `
      Explore stock prices, change, and trends using zoom, pan, and candlestick inspection.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "order-entry",
        attachTo: { element: "#trading-form", on: "left" },
        title: "Order Entry",
        body: `
      Submit Market, Limit, Stop-Market, and Stop-Limit orders. 
      All executions flow directly into your simulated portfolio.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "history",
        attachTo: { element: "#trades-table", on: "top" },
        title: "Trade History",
        body: `
      Your complete trade history. All trades also write to the internal Blockchain ledger.
    `,
        buttons: ["back", "next", "never"]
      },

      // ----- Transition Step: Stock → Options -----
      {
        id: "stock-dashboard-complete",
        attachTo: { element: ".tab-container", on: "bottom" },
        title: "Stock Dashboard Complete",
        body: `
    You’ve explored all key features of the Stock Dashboard.<br>
    <strong>Please click "Options Dashboard" above to continue.</strong>
  `,
        buttons: ["back", "next", "never"],
        when: {
          show() {
            const tour = Shepherd.activeTour;
            if (!tour) return;

            // Disable Next button at start
            const nextBtn = document.querySelector('.shepherd-button:not([data-shepherd-button-secondary])');
            if (nextBtn) {
              nextBtn.disabled = true;
              nextBtn.style.opacity = "0.35";
              nextBtn.style.pointerEvents = "none";
            }

            // Watch for Options tab activation
            const observer = new MutationObserver(() => {
              const activeOptionsTab = document.querySelector('[data-tab="options-dashboard"].active');

              if (activeOptionsTab) {
                // Re-enable next button
                if (nextBtn) {
                  nextBtn.disabled = false;
                  nextBtn.style.opacity = "1";
                  nextBtn.style.pointerEvents = "auto";
                }
                observer.disconnect();
              }
            });

            const tabs = document.querySelector(".tab-container");
            if (tabs) {
              observer.observe(tabs, {
                attributes: true,
                childList: true,
                subtree: true
              });
            }
          }
        }
      },

      // ----- Options Dashboard -----
      {
        id: "options-dashboard-title",
        attachTo: { element: "#options-dashboard h1", on: "top" },
        title: "Options Dashboard",
        body: `
      Switch here to view and trade option contracts. Analyze chains, track trades, and manage portfolio.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "options-form",
        attachTo: { element: "#options-form", on: "bottom" },
        title: "Option Contracts",
        body: `
      Enter a stock symbol to fetch all available option contracts. 
      You can then analyze, filter, and trade these contracts directly.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "option-trades",
        attachTo: { element: "#options-trades-table", on: "top" },
        title: "Your Option Trades",
        body: `
      Track all executed options trades here, including status, premium, strike, and expiry.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "option-portfolio",
        attachTo: { element: "#options-portfolio-card", on: "top" },
        title: "Options Portfolio",
        body: `
    View your current option holdings, unrealized gains/losses, and portfolio exposure.
  `,
        buttons: [
          "back",
          { type: "goTo", target: "blockchain", label: "Continue to Blockchain →" },
          "never"
        ]
      }

    ],

    blockchain: [
      {
        id: "bc-welcome",
        includeNavigator: true,
        title: "Blockchain Explorer",
        body: `
      Every simulated trade is cryptographically recorded on the private blockchain. 
      This explorer provides transparency, auditability, and verification.
    `,
        buttons: ["next", "never"]
      },
      {
        id: "bc-search",
        attachTo: { element: "#tradeSearch", on: "top" },
        title: "Search",
        body: `
      Locate transactions by user, symbol, block height, hash, or timestamp.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "summary",
        attachTo: { element: ".all-summary", on: "top" },
        title: "Chain Summary",
        body: `
      Overview of total trades, gas usage, highest block, and unique users.
    `,
        buttons: ["back", "next", "never"]
      },
      {
        id: "gas-chart",
        attachTo: { element: "#gasChart", on: "top" },
        title: "Gas Analytics",
        body: `
      Visualise computational cost and system activity over time.
    `,
        buttons: ["back", "next", "never"]
      },
      {
  id: "ledger",
  attachTo: { element: "#blockchain-explorer", on: "top" },
  title: "Ledger",
  body: `
    Complete immutable history of all trades executed on the internal chain.
  `,
  buttons: [
    "back",
    { type: "goTo", target: "scenarios", label: "Continue to Scenarios →" },
    "never"
  ]
}

    ],

    scenarios: [
      {
        id: "sc-welcome",
        includeNavigator: true,
        title: "Scenarios Dashboard",
        body: `
      Explore real historical market events recreated with authentic intraday data.
      Use the globe to discover regions, browse timelines, and join missions.
    `,
        buttons: ["next", "never"]
      },
      {
        id: "sc-globe",
        attachTo: { element: "#globe-layer", on: "right" },
        title: "Global Navigator",
        body: `
      This interactive 3D globe is your entry point.  
      Click any highlighted country or region to load its historical event timeline.<br>
      <strong>Please click any highlighted country or region to continue and click Next.</strong>
    `,
        buttons: ["back", "next"]
      },
      {
        id: "sc-timeline",
        attachTo: { element: "#region-timeline", on: "top" },
        title: "Region Timeline",
        body: `
      After selecting a region, scenarios appear as timeline nodes.  
      Each node represents a real historical period you can trade through.
    `,
        buttons: ["back", "next"]
      },
      {
        id: "sc-all-scenarios",
        attachTo: { element: "#floatingScenariosOverlay", on: "left" },
        title: "All Scenarios",
        body: `
      This panel lists <strong>every scenario</strong> — regardless of region.  
      Use it when you want a complete catalogue or prefer browsing by title instead of location.
    `,
        buttons: ["back", "next"]
      },
      {
        id: "sc-my-scenarios",
        attachTo: { element: "#dashboard-layer", on: "left" },
        title: "My Scenarios",
        body: `
      Track personal mission progress:  
      <strong>Not Started</strong>, <strong>In Progress</strong>, and <strong>Completed</strong>.  
      Revisit missions, compare your attempts, and analyse improvements.
    `,
        buttons: [
          "back",
          { type: "goTo", target: "academy", label: "Go to Academy →" },
          "never"
        ]
      }
    ],

    academy: [
      {
        id: "ac-welcome",
        includeNavigator: true,
        title: "BlackSealed Academy",
        body: `
          The Academy organises all written guides into a progression path,
          from core concepts to advanced execution and review.
        `,
        specialButtons: ["next", "never"]
      },
      {
        id: "ac-header",
        attachTo: { element: ".guides-container", on: "top" },
        title: "Guides Overview",
        body: `
          Each guide is aligned with a specific aspect of the platform:
          Stock Dashboard, Options Dashboard, Scenarios, AI advice,
          and risk management.
        `,
        buttons: ["back", "next"]
      },
      {
        id: "ac-toggle",
        attachTo: { element: ".view-toggle", on: "bottom" },
        title: "View Modes",
        body: `
          Switch between Timeline View and All Guides.
          Timeline View gives a structured learning sequence,
          while the grid lets you jump directly to topics.
        `,
        buttons: ["back", "next"]
      },
      {
        id: "ac-timeline",
        attachTo: { element: ".timeline-wrapper", on: "top" },
        title: "Timeline View",
        body: `
          Each node corresponds to a learning stage — foundational concepts,
          intermediate skills, and advanced portfolio/option work.
        `,
        specialButtons: ["back", "next", "jumpGrid"]
      },
      {
        id: "ac-grid",
        attachTo: { element: "#grid-view", on: "bottom" },  // ← point at button instead
        title: "All Guides Grid",
        body: `
    Browse the full catalogue. Jump directly to topics such as
    Stock Dashboard usage, options mechanics, AI advice interpretation,
    and scenario-based strategy building.
  `,
        specialButtons: ["back", "finish", "never"],
        when: {
          show: () => {
            // Auto-switch to grid view ONLY if not already active
            const gridBtn = document.getElementById("grid-view");
            if (gridBtn && !gridBtn.classList.contains("active")) {
              gridBtn.click();
            }

            // Refresh Shepherd after click
            setTimeout(() => {
              if (Shepherd.activeTour) Shepherd.activeTour.refresh();
            }, 150);
          }
        }
      }
    ]
  };

  // ---------------------------------------------------------
  // Build Shepherd steps from definitions
  // ---------------------------------------------------------
  function buildSteps(sectionKey, tour) {
    const defs = STEP_DEFS[sectionKey] || [];
    return defs.map(def => {
      const content = [];
      if (def.includeNavigator) {
        content.push(`<h2>${def.title}</h2>`);
        content.push(`<p>${def.body}</p>`);
        content.push(renderSectionNavigator(sectionKey));
      } else if (def.title) {
        content.push(`<h3>${def.title}</h3>`);
        content.push(`<p>${def.body}</p>`);
      } else {
        content.push(def.body || "");
      }

      const buttons = [];

      if (def.specialButtons) {
        def.specialButtons.forEach(type => {
          if (type === "next") buttons.push(Buttons.next(tour));
          if (type === "back") buttons.push(Buttons.back(tour));
          if (type === "never") buttons.push(Buttons.never(tour));
          if (type === "finish") buttons.push(Buttons.finish(tour));
          if (type === "jumpTimeline") buttons.push(Buttons.jump(tour, "ac-timeline", "Skip to Timeline"));
          if (type === "jumpGrid") buttons.push(Buttons.jump(tour, "ac-grid", "Skip to All Guides"));
        });
      } else if (def.buttons) {
        def.buttons.forEach(btn => {
          if (btn === "next") buttons.push(Buttons.next(tour));
          else if (btn === "back") buttons.push(Buttons.back(tour));
          else if (btn === "never") buttons.push(Buttons.never(tour));
          else if (typeof btn === "object" && btn.type === "goTo") {
            buttons.push(Buttons.goTo(tour, btn.target, btn.label));
          }
        });
      }

      const stepConfig = {
        id: def.id,
        text: content.join(""),
        buttons
      };

      if (def.attachTo) {
        stepConfig.attachTo = def.attachTo;
      }

      return stepConfig;
    });
  }

  // ---------------------------------------------------------
  // Start tour per section
  // ---------------------------------------------------------
  function startSectionTour(sectionKey) {
    const tour = createTour(sectionKey);
    window._bsActiveTour = tour;

    const steps = buildSteps(sectionKey, tour);
    steps.forEach(s => tour.addStep(s));
    tour.start();
  }

  // ---------------------------------------------------------
  // AUTO ROUTER
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname || "";

    await loadOnboardingState();

    if (USER_ONBOARDING.skipOnboarding) return;

    let stage =
      USER_ONBOARDING.onboardingStage ||
      localStorage.getItem("onboardingStage") ||
      "home";

    if (!stage) stage = "home";
    localStorage.setItem("onboardingStage", stage);

    if (stage === "done") return;

    if (stage === "home" && path.includes("home")) {
      return setTimeout(() => startSectionTour("home"), 600);
    }
    if (stage === "investment" && path.includes("investment")) {
      return setTimeout(() => startSectionTour("investment"), 600);
    }
    if (stage === "blockchain" && path.includes("blockchain")) {
      return setTimeout(() => startSectionTour("blockchain"), 600);
    }
    if (stage === "scenarios" && path.includes("scenarios")) {
      return setTimeout(() => startSectionTour("scenarios"), 600);
    }
    if (stage === "academy" && path.includes("allGuides")) {
      return setTimeout(() => startSectionTour("academy"), 600);
    }
  });

  // ---------------------------------------------------------
  // SECTION NAVIGATOR DROPDOWN INTERACTION
  // ---------------------------------------------------------
  document.addEventListener("click", async (e) => {
    const toggle = e.target.closest(".bs-section-nav-toggle");
    if (toggle) {
      const nav = toggle.closest(".bs-section-nav");
      if (nav) {
        const isOpen = nav.classList.contains("is-open");
        document
          .querySelectorAll(".bs-section-nav.is-open")
          .forEach(el => el.classList.remove("is-open"));
        if (!isOpen) nav.classList.add("is-open");
      }
      return;
    }

    const item = e.target.closest("[data-bs-section-nav]");
    if (item) {
      const key = item.getAttribute("data-bs-section-nav");
      const activeTour = Shepherd.activeTour || window._bsActiveTour;
      if (!activeTour) return;
      await navigateToSection(key, activeTour);
      return;
    }

    if (!e.target.closest(".bs-section-nav")) {
      document
        .querySelectorAll(".bs-section-nav.is-open")
        .forEach(el => el.classList.remove("is-open"));
    }
  });

  // ---------------------------------------------------------
  // PUBLIC CONTROLS (e.g., used from Settings page)
  // ---------------------------------------------------------
  window.BlackSealedOnboarding = {
    async reset() {
      await resetOnboardingState();
    },
    status() {
      return USER_ONBOARDING.onboardingStage || "home";
    }
  };
})();
