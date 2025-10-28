// ============================================
// GLOBAL SOCKET SETUP (Persistent Across Pages)
// ============================================
if (!window.nyraSocket && typeof io !== "undefined") {
  const userId = localStorage.getItem("userId");
  if (userId) {
    window.nyraSocket = io({ query: { userId } });
    window.nyraSocket.on("connect", () => {
      console.log("🔌 Nyra socket connected:", window.nyraSocket.id);
      window.nyraSocket.emit("join", { userId });
    });
    window.nyraSocket.on("disconnect", () => {
      console.log("⚠️ Nyra socket disconnected");
    });
  }
}

const token = localStorage.getItem("token"); // JWT token
window.addEventListener("DOMContentLoaded", loadChatbot);

// ============================================
// Load Chatbot HTML & Initialize
// ============================================
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
// MAIN INITIALIZATION
// ============================================
function initChatbot() {
  if (window.__nyraInitialized) {
    console.log("⚠️ Nyra already initialized — skipping duplicate setup.");
    return;
  }
  window.__nyraInitialized = true;

  const userId = localStorage.getItem("userId");
  if (!userId) return console.warn("⚠️ No userId found — skipping Nyra init.");

  // Elements
  const chatToggle = document.getElementById("chat-toggle");
  const chatPopup = document.getElementById("chat-popup");
  const chatClose = document.getElementById("chat-close");
  const chatMinimize = document.getElementById("chat-minimize");
  const chatMaximize = document.getElementById("chat-maximize");
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  if (!chatToggle || !chatPopup || !chatMessages || !userInput || !sendButton) {
    console.warn("⚠️ Nyra chatbot elements missing — skipping initialization.");
    return;
  }

  let sessionId = null;

  // ============================================
  // SOCKET.IO (Realtime)
  // ============================================
  const socket = window.nyraSocket;
if (socket) {
  socket.off("chatbot:newMessage"); // prevent duplicates

  socket.on("connect", async () => {
    console.log("🔌 Reconnected:", socket.id);
    const userId = localStorage.getItem("userId");
    if (userId) socket.emit("join", { userId });

    // 🧩 Wait a bit to ensure backend has stored the new reply
    setTimeout(async () => {
      const savedSession = localStorage.getItem("nyraSessionId");
      if (savedSession) await loadChatHistory();
    }, 300); // small delay fixes timing race
  });

  socket.on("chatbot:newMessage", (data) => {
    console.log("📩 Incoming Nyra message:", data);

    const storedSession = parseInt(localStorage.getItem("nyraSessionId") || "0", 10);
    const activeSession = sessionId || storedSession;

    if (data?.content && data.sessionId === activeSession) {
      addMessage(data.content, false, true);
    } else {
      console.log("⚠️ Ignored message (session mismatch or timing issue)");
    }
  });
}

  // ============================================
  // BACKEND SESSION MANAGEMENT
  // ============================================
  async function initSession() {
    try {
      const existing = localStorage.getItem("nyraSessionId");
      if (existing) {
        sessionId = parseInt(existing, 10);
        console.log("♻️ Reusing Nyra session:", sessionId);
        await loadChatHistory();
        return;
      }

      const res = await fetch("/api/chatbot/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sessionId = data.id;
      localStorage.setItem("nyraSessionId", sessionId);
      console.log("🧩 New chat session:", sessionId);
      await loadChatHistory();
    } catch (err) {
      console.error("⚠️ Could not init chat session:", err);
      addMessage("⚠️ Unable to connect Nyra right now. Please log in again.");
    }
  }

  async function endSession() {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/chatbot/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, sessionId }),
      });
      if (!res.ok) throw new Error(`Failed to end session (HTTP ${res.status})`);
      console.log("✅ Chat session ended:", sessionId);
    } catch (err) {
      console.warn("⚠️ Error ending session:", err.message);
    }
  }

  async function loadChatHistory() {
    try {
      if (!userId || !sessionId) return;
      const res = await fetch(`/api/chatbot/history?userId=${userId}&sessionId=${sessionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const messages = await res.json();

      chatMessages.innerHTML = "";
      for (const m of messages) {
        if (m?.content && m.content !== "undefined") {
          addMessage(m.content, m.role === "user");
        }
      }
      chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
      saveChatState();
    } catch (err) {
      console.error("⚠️ Failed to load chat history:", err);
    }
  }

  // ============================================
  // LOCAL STORAGE (UI State)
  // ============================================
  function saveChatState() {
    const state = {
      minimized: chatPopup.classList.contains("minimized"),
      open: chatPopup.style.display === "flex",
    };
    localStorage.setItem("nyraChatState", JSON.stringify(state));
  }

  function restoreChatState() {
    const saved = JSON.parse(localStorage.getItem("nyraChatState") || "{}");
    if (saved.open) {
      chatPopup.style.display = "flex";
      chatToggle.classList.add("hidden");
    }
    if (saved.minimized) {
      chatPopup.classList.add("minimized");
      chatMinimize.classList.add("hide");
      chatMaximize.classList.remove("hide");
    }
  }

  // ============================================
  // MESSAGE LOGIC (with animation)
  // ============================================
  function addMessage(content, isUser = false, animate = false) {
    if (!content || content === "undefined" || content === null) return;
    const msg = document.createElement("div");
    msg.classList.add("message", isUser ? "user-message" : "bot-message");
    if (animate && !isUser) {
      msg.innerHTML = "";
      chatMessages.appendChild(msg);
      simulateTypingEffect(msg, content);
    } else {
      msg.innerHTML = String(content).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      chatMessages.appendChild(msg);
    }
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  }

  function simulateTypingEffect(target, text) {
    const clean = String(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const plain = clean.replace(/<[^>]*>/g, "");
    const speed = Math.max(10, 1500 / plain.length);
    let i = 0;
    const interval = setInterval(() => {
      target.innerHTML = clean.slice(0, ++i);
      chatMessages.scrollTo({ top: chatMessages.scrollHeight });
      if (i >= clean.length) clearInterval(interval);
    }, speed);
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.classList.add("typing");
    typing.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typing;
  }

  // ============================================
  // MESSAGE FLOW
  // ============================================
  async function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg) return;

    addMessage(msg, true);
    userInput.value = "";
    const typingEl = showTyping();

    try {
      if (!sessionId) await initSession();
      const res = await fetch("/api/chatbot/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, sessionId, prompt: msg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
typingEl.remove(); // the AI message will arrive via socket

    } catch (err) {
      typingEl.remove();
      console.error("Chatbot error:", err);
      addMessage("Sorry, something went wrong. Please try again later.");
    }
  }

  // ============================================
  // UI CONTROLS
  // ============================================
  function openChat() {
    chatPopup.style.display = "flex";
    chatPopup.classList.add("opening");
    chatToggle.classList.add("hidden");
    chatPopup.addEventListener("animationend", () => chatPopup.classList.remove("opening"), {
      once: true,
    });
    initSession();
    saveChatState();
  }

async function closeChat() {
  chatPopup.classList.remove("minimized");
  chatPopup.classList.add("closing");

  // ✅ End session before closing the chat visually
  try {
    await endSession();
    console.log("💤 Nyra session gracefully ended on close.");
  } catch (err) {
    console.warn("⚠️ Failed to end session on close:", err);
  }

  chatPopup.addEventListener(
    "animationend",
    () => {
      chatPopup.style.display = "none";
      chatPopup.classList.remove("closing");
      chatToggle.classList.remove("hidden");
      chatMaximize.classList.add("hide");
      chatMinimize.classList.remove("hide");
      saveChatState();

      // 🧹 Optional: clear session data from storage if you want a new one next time
      localStorage.removeItem("nyraSessionId");
    },
    { once: true }
  );
}


  function toggleMinimize(forceState = null) {
    const minimize =
      forceState !== null ? forceState : !chatPopup.classList.contains("minimized");
    chatPopup.classList.toggle("minimized", minimize);
    chatMinimize.classList.toggle("hide", minimize);
    chatMaximize.classList.toggle("hide", !minimize);
    chatToggle.classList.add("hidden");
    saveChatState();
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  chatToggle.addEventListener("click", () => {
    if (chatPopup.style.display === "flex") closeChat();
    else openChat();
  });
  chatClose.addEventListener("click", closeChat);
  chatMinimize.addEventListener("click", () => toggleMinimize(true));
  chatMaximize.addEventListener("click", () => toggleMinimize(false));
  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  document.querySelector(".chat-header")?.addEventListener("click", (e) => {
    const isButton = e.target.closest("button");
    if (!isButton && chatPopup.classList.contains("minimized")) toggleMinimize(false);
  });

  // ============================================
  // INITIALIZE
  // ============================================
  restoreChatState();
  initSession();

  if (!chatMessages.innerHTML.trim()) {
    addMessage(
      "Hello, I’m <strong>Nyra</strong> — your Fintech AI assistant. How can I help you today?"
    );
  }


}
window.addEventListener("beforeunload", async () => {
  try {
    await fetch(`/api/chatbot/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: localStorage.getItem("userId"),
        sessionId: localStorage.getItem("nyraSessionId"),
      }),
    });
    console.log("🧩 Session auto-ended on page unload.");
  } catch (err) {
    console.warn("⚠️ Failed to end session on unload:", err);
  }
});
