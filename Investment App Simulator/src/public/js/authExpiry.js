// /js/authExpiry.js
(function () {
  let expiryTimer = null;

  // Base64URL-safe decoder
  function base64UrlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4 !== 0) {
      str += "=";
    }
    return atob(str);
  }

  function decodeToken(token) {
    try {
      const payloadPart = token.split(".")[1];
      if (!payloadPart) return null;
      const json = base64UrlDecode(payloadPart);
      return JSON.parse(json);
    } catch (e) {
      console.warn("Failed to decode token:", e);
      return null;
    }
  }

  function autoLogout() {
    console.log("🚪 Logging out user (autoLogout)");
    localStorage.clear();
    window.location.href = "/login";
  }

  function scheduleTokenExpiry() {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("⏳ No token found — not scheduling expiry.");
      return;
    }

    const payload = decodeToken(token);
    if (!payload || !payload.exp) {
      console.log("⏳ No valid exp on token — not scheduling expiry.");
      return;
    }

    // Clear any previous timer
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }

    const msUntilExpiry = payload.exp * 1000 - Date.now();

    if (msUntilExpiry <= 0) {
      console.log("⚠️ Token already expired, logging out now.");
      autoLogout();
      return;
    }

    console.log(
      "⏱️ Auto-logout in",
      (msUntilExpiry / 1000).toFixed(0),
      "seconds"
    );

    expiryTimer = setTimeout(() => {
      console.log("⚠️ Token expired — auto logging out.");
      autoLogout();
    }, msUntilExpiry);
  }

  function checkImmediateExpiry() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = decodeToken(token);
    if (!payload || !payload.exp) return;

    if (payload.exp * 1000 <= Date.now()) {
      console.log("⚠️ Token expired on page load — logging out.");
      autoLogout();
    }
  }

  // expose globally
  window.authExpiry = {
    decodeToken,
    autoLogout,
    scheduleTokenExpiry,
    checkImmediateExpiry,
  };

  // run on every page load
  document.addEventListener("DOMContentLoaded", () => {
    authExpiry.checkImmediateExpiry();
    authExpiry.scheduleTokenExpiry();
  });
})();
