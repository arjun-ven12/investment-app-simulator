document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("registerForm");
  const warningCard = document.getElementById("warningCard");
  const warningText = document.getElementById("warningText");

  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const referralCode =
      document.getElementById("referralCode").value.trim() || null;

    warningCard.classList.add("d-none");
    warningText.textContent = "";

    // Password mismatch
    if (password !== confirmPassword) {
      showWarning("Passwords do not match.");
      return;
    }

    // Password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      showWarning(
        "Password must include uppercase, lowercase, number, and special character."
      );
      return;
    }

    try {
      const res = await fetch("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, referralCode,  termsAccepted: document.getElementById("agreeTerms").checked }),
      });

      const data = await res.json();
      if (!res.ok) {
        showWarning(data.message || "Registration failed.");
        return;
      }

      showWarning(
        data.message || "Verification email sent! Please check your inbox."
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } catch (err) {
      showWarning(err.message || "Unexpected error occurred.");
    }
  });

  // 🔔 Helper: Show warning card with shake animation
  function showWarning(message) {
    warningText.textContent = message;
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
  }

  // --- Google Sign-In ---
document.getElementById("googleSignInBtn").addEventListener("click", () => {
  window.location.href = `${window.location.origin}/auth/google`;
});


  // --- Password visibility toggles ---
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const togglePassword = document.getElementById("togglePassword");
  const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
  const eyeIcon1 = document.getElementById("eyeIcon1");
  const eyeIcon2 = document.getElementById("eyeIcon2");

  // Smooth toggle animation
function smoothToggle(input, type) {
  // Create a subtle transition for the text only
  input.style.transition = "color 0.25s ease-in-out";
  input.style.color = "transparent"; // hides the text without removing the box

  setTimeout(() => {
    input.setAttribute("type", type);
    input.style.color = ""; // revert to default
  }, 150);
}


  // --- Toggle password visibility ---
  togglePassword.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    smoothToggle(passwordInput, type);
    eyeIcon1.innerHTML =
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

  // --- Toggle confirm password visibility ---
  toggleConfirmPassword.addEventListener("click", () => {
    const type =
      confirmPasswordInput.getAttribute("type") === "password"
        ? "text"
        : "password";
    smoothToggle(confirmPasswordInput, type);
    eyeIcon2.innerHTML =
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

  // --- Show or hide eye icons when typing ---
  [passwordInput, confirmPasswordInput].forEach((input, i) => {
    const toggle = i === 0 ? togglePassword : toggleConfirmPassword;
    input.addEventListener("input", () => {
      toggle.classList.toggle("visible", input.value.length > 0);
    });
  });
});
// --- Microsoft Sign-In ---

document.getElementById("microsoftSignInBtn").addEventListener("click", () => {
  window.location.href = `${window.location.origin}/auth/microsoft`;
});
