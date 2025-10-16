const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");
const userId = localStorage.getItem('userId');
function renderAiAdviceMarkdown(aiTextString) {
  if (!aiTextString) return "";

  let html = aiTextString;

  // ✅ Convert headings (h1 to h6)
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // ✅ Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // ✅ Convert dash bullets into <ul>
  const lines = html.split("\n");
  let inList = false;
  html = lines.map(line => {
    if (line.trim().startsWith("- ")) {
      if (!inList) {
        inList = true;
        return `<ul><li>${line.trim().slice(2)}</li>`;
      } else {
        return `<li>${line.trim().slice(2)}</li>`;
      }
    } else {
      if (inList) {
        inList = false;
        return `</ul><p>${line.trim()}</p>`;
      }
      return `<p>${line.trim()}</p>`;
    }
  }).join("");

  if (inList) html += "</ul>";

  // ✅ Convert simple tables like | Symbol | High | Low | Volatility |
  html = html.replace(/\|(.+)\|/g, match => {
    const cells = match.split("|").slice(1, -1).map(c => c.trim());
    if (cells[0].toLowerCase() === "symbol") {
      return `<table class="ai-table"><thead><tr>${cells.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
    } else if (cells.every(c => c)) {
      return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
    } else {
      return "";
    }
  });

  if (html.includes("<table") && !html.includes("</table>")) html += "</tbody></table>";

  // ✅ Wrap everything in a container
  return `<div class="ai-advice-content" style="color:#E0EBFF; padding-left:1rem;">${html}</div>`;
}



document.addEventListener("DOMContentLoaded", async () => {
  const aiText = document.getElementById("ai-text");
  const intradayChartEl = document.getElementById("intraday-chart");
  const portfolioPieChartEl = document.getElementById("portfolio-pie-chart");
  const token = localStorage.getItem("token");
  const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");

  if (!token) {
    console.error("❌ No token found. Please log in.");
    if (aiText) aiText.innerHTML = "<p style='color:red;'>Please log in first.</p>";
    return;
  }

  if (!scenarioId) {
    console.error("❌ No scenarioId found in URL.");
    if (aiText) aiText.innerHTML = "<p style='color:red;'>Scenario not specified.</p>";
    return;
  }

  /* ─────────────────────────────
     1️⃣ LOAD & RENDER CHART DATA FIRST
  ───────────────────────────── */
  try {
    const chartRes = await fetch(`/scenarios/${scenarioId}/getChartData`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const chartData = await chartRes.json();
    window.latestChartData = chartData;
    console.log("📊 Chart Data from /scenarios:", chartData);

    // ✅ Render Portfolio Pie Chart
    if (portfolioPieChartEl && chartData.trades?.length) {
      const pieCtx = portfolioPieChartEl.getContext("2d");
      const pieLabels = chartData.trades.map(t => t.symbol);
      const pieValues = chartData.trades.map(t => Number(t.currentValue));
      const pieColors = ["#E0EBFF", "#ff6b81", "#1e90ff", "#2ed573", "#ffa502"];

   new Chart(pieCtx, {
  type: "pie",
  data: {
    labels: pieLabels,
    datasets: [{
      data: pieValues,
      backgroundColor: pieColors,
      borderColor: "#53596B",
      borderWidth: 2,
    }],
  },
  options: {
    responsive: false,   // 🛑 disable dynamic resizing
    maintainAspectRatio: false, // 🔒 keep fixed ratio
    plugins: {
      legend: { labels: { color: "#E0EBFF" }, position: "right" },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = pieValues.reduce((a, b) => a + b, 0);
            const percent = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: $${context.raw.toFixed(2)} (${percent}%)`;
          },
        },
      },
    },
  },
});

    } else {
      console.warn("⚠️ No portfolio data for pie chart.");
    }

    // ✅ Render Intraday Chart
    if (intradayChartEl && chartData.intraday && Object.keys(chartData.intraday).length) {
      const ctx = intradayChartEl.getContext("2d");
      const datasets = Object.entries(chartData.intraday).map(([symbol, stock], idx) => {
        const colors = ["#E0EBFF", "#ff6b81", "#1e90ff", "#2ed573", "#ffa502"];
        return {
          label: symbol,
          data: (stock.intraday || []).map(d => ({ x: new Date(d.date), y: d.closePrice })),
          borderColor: colors[idx % colors.length],
          borderWidth: 2,
          fill: false,
          tension: 0.25,
        };
      });

      new Chart(ctx, {
        type: "line",
        data: { datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: "#E0EBFF" } },
            zoom: {
              zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
              pan: { enabled: true, mode: "x" },
            },
          },
          scales: {
            x: {
              type: "time",
              time: { unit: "hour" },
              title: { display: true, text: "Time", color: "#E0EBFF" },
              ticks: { color: "#E0EBFF" },
              grid: { color: "#53596B" },
            },
            y: {
              title: { display: true, text: "Price ($)", color: "#E0EBFF" },
              ticks: { color: "#E0EBFF" },
              grid: { color: "#53596B" },
            },
          },
        },
      });
    } else {
      console.warn("⚠️ No intraday data to render chart.");
    }

  } catch (err) {
    console.error("❌ Error loading chart data:", err);
  }

  /* ─────────────────────────────
     2️⃣ FETCH AI ADVICE AFTER CHARTS
  ───────────────────────────── */
  try {
    if (aiText) aiText.innerHTML = "<p style='color:#aaa;'>Generating AI insights...</p>";

    const aiRes = await fetch(`/api/chatbot/${scenarioId}/scenario-analysis`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const aiData = await aiRes.json();
    window.latestAiData = aiData;
    console.log("🧠 AI Data from /api/chatbot:", aiData);

    if (aiText && aiData.aiAdvice) {
      aiText.innerHTML = renderAiAdviceMarkdown(aiData.aiAdvice);
    } else if (aiText) {
      aiText.innerHTML = "<p style='color:#aaa;'>No AI insights available yet.</p>";
    }

  } catch (err) {
    console.error("❌ Error loading AI advice:", err);
    if (aiText) aiText.innerHTML = `<p style='color:red;'>${err.message}</p>`;
  }
});

// 🎯 Back Button Navigation
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("back-button");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "/html/scenarios.html"; // redirect to your scenarios page
    });
  }
});
