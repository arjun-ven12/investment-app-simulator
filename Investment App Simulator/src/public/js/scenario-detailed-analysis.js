const scenarioId = new URLSearchParams(window.location.search).get("scenarioId");

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
  const portfolioTableBody = document.querySelector("#portfolio-table tbody");
  const intradayChartEl = document.getElementById("intraday-chart");
  const portfolioPieChartEl = document.getElementById("portfolio-pie-chart");

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`/api/chatbot/${scenarioId}/scenario-analysis`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    // 1️⃣ Render AI advice nicely
    if (aiText) {
      aiText.innerHTML = renderAiAdviceMarkdown(data.aiAdvice);
    } else {
      console.warn("AI advice container not found!");
    }

    // 2️⃣ Populate Portfolio Table if positions exist
    if (portfolioTableBody && data.portfolio && Array.isArray(data.portfolio.positions)) {
      portfolioTableBody.innerHTML = ""; // clear previous rows
      data.portfolio.positions.forEach((pos) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${pos.symbol}</td>
          <td>${Number(pos.quantity).toFixed(0)}</td>
          <td>$${Number(pos.avgBuyPrice).toFixed(2)}</td>
          <td>$${Number(pos.currentPrice).toFixed(2)}</td>
          <td>$${Number(pos.totalInvested).toFixed(2)}</td>
          <td>$${Number(pos.currentValue).toFixed(2)}</td>
          <td>$${Number(pos.unrealizedPnL).toFixed(2)}</td>
        `;
        portfolioTableBody.appendChild(row);
      });
    } else if (!portfolioTableBody) {
      console.warn("Portfolio table body not found!");
    }

    // 3️⃣ Render Intraday Line Chart
    if (intradayChartEl && data.portfolio && data.portfolio.positions.length && data.intradayData) {
      const ctx = intradayChartEl.getContext("2d");
      const labels = data.intradayData[data.portfolio.positions[0].symbol].intraday.map(d => new Date(d.date));
      const datasets = Object.keys(data.intradayData).map((symbol, idx) => {
        const stockData = data.intradayData[symbol].intraday.map(d => d.closePrice);
        const colors = ["#E0EBFF", "#ff6b81", "#1e90ff", "#2ed573", "#ffa502"];
        return {
          label: symbol,
          data: stockData,
          borderColor: colors[idx % colors.length],
          backgroundColor: "transparent",
          tension: 0.2,
        };
      });

      new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: "#E0EBFF" }, position: "top" },
            zoom: {
              zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
              pan: { enabled: true, mode: "x" },
            },
          },
          scales: {
            x: { type: "time", time: { unit: "hour" }, title: { display: true, text: "Time", color: "#E0EBFF" }, ticks: { color: "#E0EBFF" }, grid: { color: "#53596B" } },
            y: { title: { display: true, text: "Price ($)", color: "#E0EBFF" }, ticks: { color: "#E0EBFF" }, grid: { color: "#53596B" } },
          },
        },
      });
    } else if (!intradayChartEl) {
      console.warn("Intraday chart element not found!");
    }

    // 4️⃣ Render Portfolio Pie Chart
    if (portfolioPieChartEl && data.portfolio && Array.isArray(data.portfolio.positions)) {
      const pieCtx = portfolioPieChartEl.getContext("2d");
      const pieLabels = data.portfolio.positions.map(pos => pos.symbol);
      const pieValues = data.portfolio.positions.map(pos => Number(pos.currentValue));
      const pieColors = ["#E0EBFF", "#ff6b81", "#1e90ff", "#2ed573", "#ffa502"];

      new Chart(pieCtx, {
        type: "pie",
        data: { labels: pieLabels, datasets: [{ data: pieValues, backgroundColor: pieColors, borderColor: "#53596B", borderWidth: 2 }] },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: "#E0EBFF" }, position: "right" },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const value = context.raw;
                  const total = pieValues.reduce((a, b) => a + b, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  return `${context.label}: $${value.toFixed(2)} (${percent}%)`;
                },
              },
            },
          },
        },
      });
    } else if (!portfolioPieChartEl) {
      console.warn("Portfolio pie chart element not found!");
    }

  } catch (err) {
    console.error("Error fetching scenario data:", err);
  }
});
