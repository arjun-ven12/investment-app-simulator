// ======================================
// SETTINGS PAGE SCRIPT (FINAL CLEAN VERSION)
// ======================================

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
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
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
    section.querySelectorAll("input").forEach(el => el.style.display = "none");

    // Disable button
    const btn = section.querySelector("button");
    if (btn) {
        btn.disabled = true;
        btn.classList.add("disabled-input");
    }

    // Add lock message
    const msg = document.createElement("p");
    msg.classList.add("lock-message");
    msg.innerText = authType === "google"
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
        msg.innerText = authType === "google"
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

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const newUsername = document.getElementById("newUsername").value.trim();

        let password = authType === "local"
            ? document.getElementById("currentPasswordUsername").value.trim()
            : null;

        const res = await fetch("/settings/change-username", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ newUsername, password })
        });

        const data = await res.json();
        if (data.error) return alert(data.error);

        alert("Username updated successfully!");
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

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const oldPassword = document.getElementById("oldPassword").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();

        const res = await fetch("/settings/change-password", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await res.json();
        if (data.error) return alert(data.error);

        alert("Password changed successfully!");
        form.reset();
    });
}

// --------------------------------------
// DELETE ACCOUNT
// --------------------------------------
function initDeleteAccount(authType) {
    const form = document.getElementById("delete-account-form");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();

        let password = authType === "local"
            ? document.getElementById("deletePassword").value.trim()
            : null;

        if (authType === "local" && !password)
            return alert("Please enter your password.");

        if (!confirm("Are you sure you want to delete your account?"))
            return;

        const res = await fetch("/settings/delete-account", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (data.error) return alert(data.error);

        alert("Account deleted successfully.");
        localStorage.removeItem("token");
        window.location.href = "/login";
    });
}

// --------------------------------------
// AI SETTINGS
// --------------------------------------
function initAISettings() {
    loadAISettings();

    const form = document.getElementById("ai-settings-form");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const riskTolerance = document.getElementById("riskTolerance").value;
        const aiTone = document.getElementById("aiTone").value;

        const res = await fetch("/ai-settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ riskTolerance, aiTone })
        });

        const data = await res.json();
        if (data.error) return alert(data.error);

        const status = document.getElementById("aiSaveStatus");
        status.innerText = "✓ Preferences saved";
        setTimeout(() => status.innerText = "", 2000);
    });
}

async function loadAISettings() {
    try {
        const res = await fetch("/ai-settings", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await res.json();
        document.getElementById("riskTolerance").value = data.riskTolerance;
        document.getElementById("aiTone").value = data.aiTone;

    } catch (err) {
        console.error("Failed to load AI settings:", err);
    }
}
