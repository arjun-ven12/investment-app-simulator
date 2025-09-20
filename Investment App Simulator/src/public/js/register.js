const registerForm = document.getElementById("registerForm");
const warningCard = document.getElementById("warningCard");
const warningText = document.getElementById("warningText");

registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  // Get form values
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralCode = document.getElementById("referralCode").value.trim() || null;

  // Reset warning
  warningCard.classList.add("d-none");
  warningText.textContent = "";

  // Validate passwords
  if (password !== confirmPassword) {
    warningText.textContent = "Passwords do not match.";
    warningCard.classList.remove("d-none");
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    warningText.textContent =
      "Password must include uppercase, lowercase, number, and special character.";
    warningCard.classList.remove("d-none");
    return;
  }

  try {
    // Send registration request
    const res = await fetch("/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, referralCode }),
    });

    const data = await res.json();
    console.log("Registration response:", data);

    if (!res.ok) {
      warningText.textContent = data.message || "Registration failed.";
      warningCard.classList.remove("d-none");
      return;
    }

    // Auto-login: save token & user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("username", data.user.username);

    // Redirect to homepage or dashboard
    window.location.href = "/html/home.html";
  } catch (err) {
    console.error("Registration error:", err);
    warningText.textContent = err.message || "Unexpected error occurred.";
    warningCard.classList.remove("d-none");
  }
});
