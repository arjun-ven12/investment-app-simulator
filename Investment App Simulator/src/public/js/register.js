registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralCode = document.getElementById("referralCode").value.trim() || null;

  warningCard.classList.add("d-none");
  warningText.textContent = "";

  // Password mismatch check with shake effect
  if (password !== confirmPassword) {
    warningText.textContent = "Passwords do not match.";
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    warningText.textContent =
      "Password must include uppercase, lowercase, number, and special character.";
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
    return;
  }

  try {
    const res = await fetch("/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, referralCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      warningText.textContent = data.message || "Registration failed.";
      warningCard.classList.remove("d-none");
      warningCard.classList.add("show");
      setTimeout(() => warningCard.classList.remove("show"), 400);
      return;
    }

    warningText.textContent = data.message || "Verification email sent! Please check your inbox.";
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");

    // Optionally redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = "/html/login.html";
    }, 2500);
  } catch (err) {
    warningText.textContent = err.message || "Unexpected error occurred.";
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
  }
});



document.getElementById("googleSignInBtn").addEventListener("click", () => {
  // Redirect to your backend route that starts the Google OAuth flow
  window.location.href = "http://localhost:3000/auth/google";
});