
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const warningCard = document.getElementById("warningCard");
  const warningText = document.getElementById("warningText");

  // 🔁 Restore lockout timer if previously locked
  const storedLockUntil = localStorage.getItem("lockUntil");
  if (storedLockUntil && new Date(storedLockUntil) > new Date()) {
    startLockoutTimer(new Date(storedLockUntil));
  }



  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const loginInput = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    warningCard.classList.add("d-none");
    warningText.textContent = "";

    if (!loginInput || !password) {
      showWarning("Please fill in both fields.");
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginInput);
    const bodyData = isEmail
      ? { email: loginInput, password }
      : { username: loginInput, password };

    try {
      const res = await fetch("/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Response:", res.status, data.message);

        // 🔒 Account locked response
        if (res.status === 403 && data.lockUntil) {
          const lockUntil = new Date(data.lockUntil);
          localStorage.setItem("lockUntil", lockUntil.toISOString());
          startLockoutTimer(lockUntil);
          return;
        }

        // 📧 Handle unverified email case
        if (
          (res.status === 403 || res.status === 401) &&
          data.message.toLowerCase().includes("verify")
        ) {
          showWarning(`
            ${data.message}<br>
            <a href="#" id="resendLink" style="color:#60a5fa;text-decoration:underline;cursor:pointer;">
              Resend verification email
            </a>
          `);

          setTimeout(() => {
            const resendLink = document.getElementById("resendLink");
            if (resendLink) {
              resendLink.addEventListener("click", async (e) => {
                e.preventDefault();
                await resendVerification(loginInput);
              });
            }
          }, 100);
          return;
        }

        throw new Error(data.message || "Login failed.");
      }

      // ✅ success
      localStorage.removeItem("lockUntil"); // clear timer if login succeeds
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("username", data.user.username);
    // Initialize Web3Auth in background
    import("./web3auth.js").then(async ({ initWeb3Auth }) => {
      await initWeb3Auth();
    });
      window.location.href = "/home";
    } catch (err) {
      showWarning(err.message || "Unexpected error occurred.");
    }
  });

  // ⚠️ Show alert message box
  function showWarning(message) {
    warningText.innerHTML = message;
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
  }

  // 🔁 Resend verification email
  async function resendVerification(loginInput) {
    try {
      let email = loginInput;

      // If user entered username, lookup email first
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const lookupRes = await fetch("/user/get-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email }),
        });

        const lookupData = await lookupRes.json();
        if (lookupRes.ok) {
          email = lookupData.email;
        } else {
          showWarning("Could not find associated email.");
          return;
        }
      }

      // Resend verification request
      const res = await fetch("/user/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        showWarning("✅ Verification email resent. Check your inbox.");
      } else {
        showWarning(data.message || "Failed to resend email.");
      }
    } catch (err) {
      showWarning("Something went wrong. Try again later.");
      console.error(err);
    }
  }
  function startLockoutTimer(lockUntil) {
    const lockCard = document.getElementById("warningCard");
    const lockMessage = document.getElementById("warningText");
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitBtn = loginForm.querySelector("button[type='submit']");

    lockCard.classList.remove("d-none");
    lockCard.classList.add("show");

    // 🔒 Disable form elements
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    submitBtn.disabled = true;
    loginForm.classList.add("locked");


    lockCard.classList.remove("d-none");
    lockCard.classList.add("show");

    localStorage.setItem("lockUntil", lockUntil.toISOString());
    const end = lockUntil.getTime();

    const interval = setInterval(() => {
      const remaining = end - Date.now();

      if (remaining <= 0) {
        clearInterval(interval);
        localStorage.removeItem("lockUntil");

        // ✅ Re-enable login form
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        submitBtn.disabled = false;
        loginForm.classList.remove("locked");

        lockMessage.innerHTML = `
  You can now try logging in again.
`;
        lockMessage.style.color = "#9EE6CF"; // soft mint
        lockMessage.classList.remove("pulse");
        return;

      }

      const mins = Math.floor((remaining / 1000 / 60) % 60);
      const secs = Math.floor((remaining / 1000) % 60);

      // 🩵 Pastel gradient: warm blush → periwinkle → mint
      const progress = remaining / (15 * 60 * 1000);
      const pastelPalette = [
        [236, 83, 112],   // #EC5370 blush rose
        [173, 129, 255],  // #AD81FF lavender
        [125, 180, 255],  // #7DB4FF soft sky blue
        [158, 230, 207],  // #9EE6CF mint
      ];

      const index = Math.floor((1 - progress) * (pastelPalette.length - 1));
      const nextIndex = Math.min(index + 1, pastelPalette.length - 1);
      const blend = (1 - progress) * (pastelPalette.length - 1) - index;

      const r = Math.round(
        pastelPalette[index][0] * (1 - blend) + pastelPalette[nextIndex][0] * blend
      );
      const g = Math.round(
        pastelPalette[index][1] * (1 - blend) + pastelPalette[nextIndex][1] * blend
      );
      const b = Math.round(
        pastelPalette[index][2] * (1 - blend) + pastelPalette[nextIndex][2] * blend
      );

      const color = `rgb(${r}, ${g}, ${b})`;

      lockMessage.innerHTML = `
    Too many failed login attempts.<br>
    Your account has been temporarily locked for security reasons.<br>
    Please wait <b class="countdown">${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}</b> before trying again.
  `;
      lockMessage.style.color = color;
      lockMessage.classList.add("pulse");
    }, 1000);


  }
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const eyeIcon = document.getElementById("eyeIcon");

// Smooth text transition (no disappearing box)
function smoothToggle(input, type) {
  input.style.transition = "color 0.25s ease-in-out";
  input.style.color = "transparent"; // temporarily hide text only
  setTimeout(() => {
    input.setAttribute("type", type);
    input.style.color = ""; // restore
  }, 150);
}

// Toggle password visibility on click
togglePassword.addEventListener("click", () => {
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  smoothToggle(passwordInput, type);

  // Swap eye icons
  eyeIcon.innerHTML =
    type === "text"
      ? `
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M17.94 17.94A10.07 10.07 0 0112 19
             c-4.478 0-8.268-2.943-9.542-7
             a9.973 9.973 0 012.17-3.32M9.88 9.88
             a3 3 0 104.24 4.24M3 3l18 18" />
      `
      : `
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5
             c4.478 0 8.268 2.943 9.542 7
             -1.274 4.057-5.064 7-9.542 7
             -4.477 0-8.268-2.943-9.542-7z" />
        <circle cx="12" cy="12" r="3" />
      `;
});

// Show or hide eye icon when typing
passwordInput.addEventListener("input", () => {
  togglePassword.classList.toggle("visible", passwordInput.value.length > 0);
});



});

document.getElementById("googleSignInBtn").addEventListener("click", () => {
  window.location.href = `${window.location.origin}/auth/google`;
});


document.getElementById("microsoftSignInBtn").addEventListener("click", () => {
  window.location.href = `${window.location.origin}/auth/microsoft`;
});
document.addEventListener("mousemove", (e) => {
  const blob = document.querySelector(".blob-focus");
  const x = (e.clientX / window.innerWidth - 0.5) * 30;  // range
  const y = (e.clientY / window.innerHeight - 0.5) * 30;
  blob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.1)`;
});












