window.addEventListener("DOMContentLoaded", async () => {
  const authType = await getAuthType();
  console.log("Auth type:", authType);

  applyAuthUIRestrictions(authType);

  initUsernameChange(authType);
  initPasswordChange(authType);
  initDeleteAccount(authType);
  initAISettings();
});

// --------------------------------------
// FETCH AUTH TYPE
// --------------------------------------
async function getAuthType() {
  try {
    const res = await fetch("/settings/me/auth-type", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    const data = await res.json();
    return data.authType || "local";
  } catch (err) {
    console.error("Auth type error:", err);
    return "local";
  }
}

// --------------------------------------
// APPLY RESTRICTIONS BASED ON LOGIN TYPE
// --------------------------------------
function applyAuthUIRestrictions(authType) {
  if (authType === "local") return;

  // Disable entire Change Password section
  disableSection("password", authType);

  // Hide username password row (confirm password)
  disableInputRow("usernamePwRow", authType);

  // Hide delete password row
  disableInputRow("deletePwRow", authType);
}

function disableSection(sectionKey, authType) {
  const section = document.querySelector(`[data-section="${sectionKey}"]`);
  if (!section) return;

  // Remove password inputs completely
  section
    .querySelectorAll("input")
    .forEach((el) => (el.style.display = "none"));

  // Disable button
  const btn = section.querySelector("button");
  if (btn) {
    btn.disabled = true;
    btn.classList.add("disabled-input");
  }

  // Add lock message
  const msg = document.createElement("p");
  msg.classList.add("lock-message");
  msg.innerText =
    authType === "google"
      ? "Password changes are not available for Google Sign-In accounts."
      : "Password changes are not available for Microsoft Sign-In accounts.";

  section.appendChild(msg);
}

function disableInputRow(rowId, authType) {
  const row = document.getElementById(rowId);
  if (!row) return;

  // Remove row completely
  row.style.display = "none";

  // Add message ONLY for username section
  if (rowId === "usernamePwRow") {
    const section = document.querySelector('[data-section="username"]');
    const msg = document.createElement("p");

    msg.classList.add("lock-message");
    msg.innerText =
      authType === "google"
        ? "Password confirmation is not required for Google accounts."
        : "Password confirmation is not required for Microsoft accounts.";

    section.appendChild(msg);
  }
}

// --------------------------------------
// CHANGE USERNAME
// --------------------------------------
function initUsernameChange(authType) {
  const form = document.getElementById("change-username-form");
  if (!form) return;

  const toast = document.getElementById("toast");

  const showToast = (message, isError = false) => {
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.toggle("error", isError);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.classList.add("hidden");
      toast.classList.remove("error");
    }, 3000);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newUsername = document.getElementById("newUsername").value.trim();

    const password =
      authType === "local"
        ? document.getElementById("currentPasswordUsername").value.trim()
        : null;

    const res = await fetch("/settings/change-username", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ newUsername, password }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, true);
      return;
    }

    showToast("Username updated successfully!");
    form.reset();
  });
}

// --------------------------------------
// CHANGE PASSWORD (LOCAL ONLY)
// --------------------------------------
function initPasswordChange(authType) {
  if (authType !== "local") return;

  const form = document.getElementById("change-password-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const oldPassword = document.getElementById("oldPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();

    const res = await fetch("/settings/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const data = await res.json();

    // 🔴 Error toast
    if (data.error) {
      toast(data.error, "error");
      return;
    }

    // 🟢 Success toast
    toast("Password changed successfully!", "success");
    form.reset();
  });
}
function toast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 100);

  // Remove toast after delay
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
// --------------------------------------
// DELETE ACCOUNT
// --------------------------------------
function initDeleteAccount(authType) {
  const form = document.getElementById("delete-account-form");
  if (!form) return;

  const popup = document.getElementById("delete-popup");
  const yesBtn = document.getElementById("delete-yes");
  const noBtn = document.getElementById("delete-no");

  const pwInput = document.getElementById("deletePassword");

  const showPopup = () => popup.classList.remove("hidden");
  const hidePopup = () => popup.classList.add("hidden");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let password = null;

    if (authType === "local") {
      password = pwInput ? pwInput.value.trim() : "";
      if (!password) {
        showToast("Please enter your password.", "error");
        return;
      }
    }

    showPopup();

    const userChoice = await new Promise((resolve) => {
      yesBtn.onclick = () => resolve(true);
      noBtn.onclick = () => resolve(false);
    });

    hidePopup();
    if (!userChoice) return;

    const res = await fetch("/settings/delete-account", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (data.error) {
      showPopupMessage(data.error, () => {
        // 🔥 FORCE RELOAD FOR INCORRECT PASSWORD
        window.location.reload();
      });
      return;
    }

    // Success delete — no reload
    showPopupMessage("Your account has been deleted.", () => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    });
  });

  function showPopupMessage(message, callback) {
    popup.querySelector(".popup-content").innerHTML = `
            <p>${message}</p>
            <br>
            <button id="close-msg">OK</button>
        `;

    popup.classList.remove("hidden");

    document.getElementById("close-msg").onclick = () => {
      popup.classList.add("hidden");
      if (callback) callback();
    };
  }
}

// --------------------------------------
// AI SETTINGS
// --------------------------------------
function initAISettings() {
    loadAISettings();

  const form = document.getElementById("ai-settings-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
  riskTolerance: document.getElementById("riskTolerance").value,
  investmentHorizon: document.getElementById("investmentHorizon").value,
  objective: document.getElementById("objective").value,
  aiTone: document.getElementById("aiTone").value,
};


    try {
      const res = await fetch("/ai-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      const status = document.getElementById("aiSaveStatus");
      status.innerText = "✓ AI preferences saved";
      status.classList.remove("error");

      setTimeout(() => (status.innerText = ""), 2000);
    } catch (err) {
      console.error("AI settings save error:", err);
      const status = document.getElementById("aiSaveStatus");
      status.innerText = "Failed to save preferences";
      status.classList.add("error");
    }
  });
}

async function loadAISettings() {
  try {
    const res = await fetch("/ai-settings", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // CORE
    document.getElementById("riskTolerance").value =
      data.riskTolerance || "moderate";

    document.getElementById("investmentHorizon").value =
      data.investmentHorizon || "long";

    document.getElementById("objective").value = data.objective || "growth";

    document.getElementById("aiTone").value = data.aiTone || "professional";
  } catch (err) {
    console.error("Failed to load AI settings:", err);
  }
}

function initAdvancedAIToggle() {
  const toggleBtn = document.getElementById("toggleAdvancedAI");
  const advancedSection = document.getElementById("advancedAISection");

  if (!toggleBtn || !advancedSection) return;

  toggleBtn.addEventListener("click", () => {
    advancedSection.classList.toggle("hidden");
    toggleBtn.innerText = advancedSection.classList.contains("hidden")
      ? "Advanced AI Controls"
      : "Hide Advanced Controls";
  });
}

////////////////////////////////////////////////////////////////////////////////
//////// SETTINGS - WALLET RESET
////////////////////////////////////////////////////////////////////////////////
const resetForm = document.getElementById("reset-wallet-form");
const resetBtn = document.getElementById("reset-wallet-btn");
const popup = document.getElementById("reset-popup");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");
const startingBalanceInput = document.getElementById("starting-balance");
const resetMessage = document.getElementById("reset-message");

// Retrieve user ID from localStorage
const userId = localStorage.getItem("userId");

// Safety check
if (!userId) {
  console.error("User ID not found in localStorage.");
}

// 1️⃣ When clicking reset → show confirmation popup
resetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  popup.classList.remove("hidden");
});

// 2️⃣ If user cancels → close popup
confirmNo.addEventListener("click", () => {
  popup.classList.add("hidden");
});

// 3️⃣ If user confirms → reset wallet
confirmYes.addEventListener("click", async () => {
  const startingBalance = Number(startingBalanceInput.value);

  if (!startingBalance || startingBalance <= 0) {
    showMessage("Starting balance must be greater than 0.", "error");
    popup.classList.add("hidden");
    return;
  }

  try {
    const response = await fetch(`/settings/reset-wallet?userId=${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ startingBalance }),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(
        `Wallet & portfolio reset! New balance: $${data.newBalance}`,
        "success"
      );

      // refresh page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showMessage(data.message || "Error resetting wallet.", "error");
    }
  } catch (err) {
    console.error(err);
    showMessage("Network or server error.", "error");
  }

  popup.classList.add("hidden");
});

// 4️⃣ Message helper
function showMessage(message, type) {
  resetMessage.textContent = message;
  resetMessage.className = `reset-message ${type}`;
  resetMessage.classList.remove("hidden");

  setTimeout(() => resetMessage.classList.add("hidden"), 5000);
}
