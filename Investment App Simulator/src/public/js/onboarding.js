// ============================================================================
//  BlackSealed — Enterprise-Grade Multi-Page Onboarding System
//  Clean • Professional • Cross-Page • Zero Emojis • Ultra Premium
// ============================================================================

// -----------------------------------------
// Tour Factory
// -----------------------------------------
function createTour() {
  return new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: "bs-onboard-theme",
      cancelIcon: { enabled: true },
      scrollTo: true
    }
  });
}

// -----------------------------------------
// Shared Buttons
// -----------------------------------------
const Buttons = {
  next: tour => ({ text: "Next", action: () => tour.next() }),
  back: tour => ({ text: "Back", action: () => tour.back() }),
  skip: tour => ({
    text: "Skip",
    action: () => {
      localStorage.setItem("onboardingStage", "done");
      tour.cancel();
    }
  }),
  restart: {
    text: "Restart",
    action: () => {
      localStorage.setItem("onboardingStage", "home");
      window.location.reload();
    }
  }
};

// ============================================================================
//  1. HOME PAGE TOUR (AI Advice lives here)
// ============================================================================
function homeSteps(tour) {
  return [
    {
      id: "welcome",
      text: `
        <h2>Welcome to BlackSealed</h2>
        <p>BlackSealed is your full-stack market simulation environment. 
        This introduction will walk you through your dashboard and key features.</p>
      `,
      buttons: [Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "wallet",
      attachTo: { element: "#wallet", on: "bottom" },
      text: `
        <h3>Wallet Balance</h3>
        <p>Your simulated capital. Updated automatically as positions open or close.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "ai",
      attachTo: { element: "#ai-advice-section", on: "top" },
      text: `
        <h3>Daily AI Insights</h3>
        <p>Your trading behaviour, risk tendencies, and portfolio structure are analysed 
        to generate a daily guidance report. Updated every day at 11:00 AM.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "portfolio",
      attachTo: { element: "#portfolio-section", on: "top" },
      text: `
        <h3>Portfolio Overview</h3>
        <p>A unified breakdown of open positions, closed positions, 
        sector allocation, and realised performance.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "leaderboard",
      attachTo: { element: "#leaderboard-section", on: "top" },
      text: `
        <h3>Leaderboard</h3>
        <p>Benchmark your results across the BlackSealed environment. 
        Performance metrics update in real time.</p>
      `,
      buttons: [
        Buttons.back(tour),
        {
          text: "Continue to Trading",
          action: () => {
            localStorage.setItem("onboardingStage", "investment");
            tour.complete();
            window.location.href = "/investment";
          }
        },
        Buttons.skip(tour)
      ]
    }
  ];
}

// ============================================================================
//  2. INVESTMENT PAGE (STOCKS + OPTIONS)
// ============================================================================
function investmentSteps(tour) {
  return [
    {
      id: "inv-welcome",
      text: `
        <h2>Trading Console</h2>
        <p>This is your primary execution and analysis workspace. 
        Charts, order entry, portfolio data, and analytics are all integrated here.</p>
      `,
      buttons: [Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "search",
      attachTo: { element: "#stock-search", on: "bottom" },
      text: `
        <h3>Symbol Search</h3>
        <p>Search for any listed stock. Selecting a symbol refreshes the chart, pricing, 
        recommendations, and company fundamentals.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "favorites",
      attachTo: { element: "#favorite-stocks", on: "right" },
      text: `
        <h3>Watchlist</h3>
        <p>Save important symbols for quick access and monitoring.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "modes",
      attachTo: { element: ".tab-container", on: "bottom" },
      text: `
        <h3>Stock & Options Modes</h3>
        <p>Switch between stock analytics and options analytics. 
        Each mode includes product-specific data, charts, and order types.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "chart-panel",
      attachTo: { element: "#chart-form-intraday", on: "bottom" },
      text: `
        <h3>Chart Settings</h3>
        <p>Select time ranges, chart types, and update visuals using real historical data.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "chart",
      attachTo: { element: "#myChart2", on: "top" },
      text: `
        <h3>Interactive Chart</h3>
        <p>Explore price structure, volatility, and trends using zoom, pan, and candlestick inspection.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "order-entry",
      attachTo: { element: "#trading-form", on: "left" },
      text: `
        <h3>Order Entry</h3>
        <p>Submit Market, Limit, Stop-Market, and Stop-Limit orders. 
        All executions flow directly into your simulated portfolio.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "history",
      attachTo: { element: "#trades-table", on: "top" },
      text: `
        <h3>Trade History</h3>
        <p>Your complete execution log. All trades also write to the internal BlackSealed ledger.</p>
      `,
      buttons: [
        Buttons.back(tour),
        {
          text: "Continue to Blockchain",
          action: () => {
            localStorage.setItem("onboardingStage", "blockchain");
            tour.complete();
            window.location.href = "/blockchain";
          }
        },
        Buttons.skip(tour)
      ]
    }
  ];
}

// ============================================================================
//  3. BLOCKCHAIN EXPLORER TOUR
// ============================================================================
function blockchainSteps(tour) {
  return [
    {
      id: "bc-welcome",
      text: `
        <h2>Blockchain Explorer</h2>
        <p>Every simulated trade is cryptographically recorded. 
        This explorer provides transparency, auditability, and verification.</p>
      `,
      buttons: [Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "bc-search",
      attachTo: { element: "#tradeSearch", on: "bottom" },
      text: `
        <h3>Search</h3>
        <p>Locate transactions by user, symbol, block height, hash, or timestamp.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "summary",
      attachTo: { element: ".all-summary", on: "top" },
      text: `
        <h3>Chain Summary</h3>
        <p>Overview of total trades, gas usage, highest block, and unique users.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "gas-chart",
      attachTo: { element: "#gasChart", on: "top" },
      text: `
        <h3>Gas Analytics</h3>
        <p>Visualise computational cost and system activity over time.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "ledger",
      attachTo: { element: "#blockchain-explorer", on: "top" },
      text: `
        <h3>Ledger</h3>
        <p>Complete immutable history of all trades executed on the internal chain.</p>
      `,
      buttons: [
        Buttons.back(tour),
        {
          text: "Continue to Scenarios",
          action: () => {
            localStorage.setItem("onboardingStage", "scenarios");
            tour.complete();
            window.location.href = "/scenarios";
          }
        },
        Buttons.skip(tour)
      ]
    }
  ];
}

// ============================================================================
//  4. SCENARIOS TOUR (Globe + Timeline + List)
// ============================================================================
function scenariosSteps(tour) {
  return [
    {
      id: "sc-welcome",
      text: `
        <h2>Scenarios Dashboard</h2>
        <p>Replay real historical market events using authentic price data.
        Explore regions, timelines, and scenario descriptions.</p>
      `,
      buttons: [Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "globe",
      attachTo: { element: "#globe-layer", on: "right" },
      text: `
        <h3>Global Scenario Navigator</h3>
        <p>Select regions to explore event timelines and preview scenario details.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "timeline-info",
      attachTo: { element: "#region-timeline", on: "top" },
      text: `
    <h3>Region Timeline</h3>
    <p>
      When you click any country on the globe, the timeline for that region will appear here. 
      Each node on the timeline represents a scenario that took place within that geographical area.
    </p>
    <p>
      You can explore the scenarios by selecting any timeline node to open its details.
    </p>
  `,
      buttons: [backBtn(tour), nextBtn(tour), skipBtn(tour)]
    },
    {
      id: "list",
      attachTo: { element: "#floatingScenariosOverlay", on: "left" },
      text: `
        <h3>All Scenarios</h3>
        <p>Browse every scenario in the system, grouped by progress status.</p>
      `,
      buttons: [Buttons.back(tour), Buttons.next(tour), Buttons.skip(tour)]
    },
    {
      id: "my-scenarios",
      attachTo: { element: "#dashboard-layer", on: "left" },
      text: `
        <h3>My Scenarios</h3>
        <p>Track which missions you have not started, are in progress, or completed.</p>
      `,
      buttons: [
        Buttons.back(tour),
        {
          text: "Finish",
          action: () => {
            localStorage.setItem("onboardingStage", "done");
            tour.complete();
          }
        },
        Buttons.skip(tour)
      ]
    }
  ];
}

// ============================================================================
// STARTERS
// ============================================================================
function startHomeTour() {
  const t = createTour();
  homeSteps(t).forEach(s => t.addStep(s));
  t.start();
}

function startInvestmentTour() {
  const t = createTour();
  investmentSteps(t).forEach(s => t.addStep(s));
  t.start();
}

function startBlockchainTour() {
  const t = createTour();
  blockchainSteps(t).forEach(s => t.addStep(s));
  t.start();
}

function startScenariosTour() {
  const t = createTour();
  scenariosSteps(t).forEach(s => t.addStep(s));
  t.start();
}

// ============================================================================
// AUTO ROUTER
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  const stage = localStorage.getItem("onboardingStage");
  const path = window.location.pathname;

  if (!stage) {
    localStorage.setItem("onboardingStage", "home");
    return window.location.reload();
  }

  if (stage === "home" && path.includes("home")) setTimeout(startHomeTour, 600);
  if (stage === "investment" && path.includes("investment")) setTimeout(startInvestmentTour, 600);
  if (stage === "blockchain" && path.includes("blockchain")) setTimeout(startBlockchainTour, 600);
  if (stage === "scenarios" && path.includes("scenarios")) setTimeout(startScenariosTour, 600);
});
