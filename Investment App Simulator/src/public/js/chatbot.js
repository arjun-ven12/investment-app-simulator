// ============================================
// NYRA Chatbot — Dynamic Loader + Interaction
// ============================================

window.addEventListener("DOMContentLoaded", loadChatbot);

// Dynamically load the chatbot HTML
async function loadChatbot() {
  try {
    const res = await fetch("/html/popupChatbot.html");
    const html = await res.text();
    document.body.insertAdjacentHTML("beforeend", html);
    initChatbot();
  } catch (err) {
    console.error("❌ Failed to load Nyra chatbot:", err);
  }
}

// ============================================
// Main Initialization
// ============================================
function initChatbot() {
  const chatToggle = document.getElementById("chat-toggle");
  const chatPopup = document.getElementById("chat-popup");
  const chatClose = document.getElementById("chat-close");
  const chatMinimize = document.getElementById("chat-minimize");
  const chatMaximize = document.getElementById("chat-maximize");
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");

  // Guard — stop if elements missing
  if (!chatToggle || !chatPopup || !chatMessages || !userInput || !sendButton) {
    console.warn("⚠️ Nyra chatbot elements missing — skipping initialization.");
    return;
  }

  // ---------------------------
  // Core Chat Functions
  // ---------------------------

  function openChat() {
    chatPopup.style.display = "flex";
    chatPopup.classList.add("opening");

    // Hide orb toggle
    chatToggle.classList.add("hidden");
    chatToggle.classList.remove("visible");

    chatPopup.addEventListener(
      "animationend",
      () => chatPopup.classList.remove("opening"),
      { once: true }
    );
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function closeChat() {
    chatPopup.classList.remove("minimized");
    chatPopup.classList.add("closing");

    chatPopup.addEventListener(
      "animationend",
      () => {
        chatPopup.style.display = "none";
        chatPopup.classList.remove("closing");

        // Restore orb visibility
        chatToggle.classList.remove("hidden");
        chatToggle.classList.add("visible");

        // Reset header icons
        chatMaximize.classList.add("hide");
        chatMinimize.classList.remove("hide");
      },
      { once: true }
    );
  }

  // ---------------------------
  // Minimize / Maximize
  // ---------------------------

  function toggleMinimize() {
    const minimized = chatPopup.classList.toggle("minimized");
    if (minimized) {
      chatMinimize.classList.add("hide");
      chatMaximize.classList.remove("hide");
    } else {
      chatMaximize.classList.add("hide");
      chatMinimize.classList.remove("hide");
    }
  }

  // ---------------------------
  // Message Functions
  // ---------------------------

  function addMessage(content, isUser = false) {
    const msg = document.createElement("div");
    msg.classList.add("message", isUser ? "user-message" : "bot-message");
    msg.innerHTML = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    chatMessages.appendChild(msg);

    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: "smooth",
    });
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.classList.add("typing");
    typing.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typing;
  }

  async function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg) return;

    addMessage(msg, true);
    userInput.value = "";

    const typingEl = showTyping();

    try {
      const res = await fetch("/api/chatbot/generateForAI", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: msg }),
      });

      const data = await res.json();
      typingEl.remove();
      addMessage(data.response || "I didn’t quite get that, could you rephrase?");
    } catch (err) {
      console.error("Chatbot error:", err);
      typingEl.remove();
      addMessage("Sorry, something went wrong. Please try again later.");
    }
  }

  // ---------------------------
  // Event Listeners
  // ---------------------------

  chatToggle.addEventListener("click", () => {
    if (chatPopup.style.display === "flex") closeChat();
    else openChat();
  });

  chatClose.addEventListener("click", closeChat);
  chatMinimize.addEventListener("click", toggleMinimize);
  chatMaximize.addEventListener("click", toggleMinimize);
  sendButton.addEventListener("click", sendMessage);

  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Clicking header restores if minimized
  document.querySelector(".chat-header")?.addEventListener("click", (e) => {
    const isButton = e.target.closest("button");
    if (!isButton && chatPopup.classList.contains("minimized")) toggleMinimize();
  });

  // ---------------------------
  // Initial Greeting
  // ---------------------------
  addMessage("Hello, I’m <strong>Nyra</strong> — your Fintech AI assistant. How can I help you today?");
}
