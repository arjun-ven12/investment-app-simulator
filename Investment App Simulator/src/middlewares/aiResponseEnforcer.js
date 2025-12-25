// middlewares/aiResponseEnforcer.js

// ONLY blocks explicit execution commands without context
const TRADE_COMMAND =
  /\b(buy\s+\w+|sell\s+\w+|enter\s+position|exit\s+position)\b/i;

const HAS_CONTEXT =
  /(timeframe|catalyst|risk|stop|invalidat)/i;

function enforceAIResponse(text, settings = {}) {
  if (!text) return text;

  // Only care about SHORT-term users in free chat
  if (settings.investmentHorizon === "short") {
    if (TRADE_COMMAND.test(text) && !HAS_CONTEXT.test(text)) {
      return (
        text +
        "\n\n⚠️ Note: This is a discussion, not an execution-ready trade. " +
        "Short-term trades require timeframe, catalyst, and risk definition."
      );
    }
  }

  return text;
}

module.exports = { enforceAIResponse };
