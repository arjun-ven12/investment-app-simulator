const registerForm = document.getElementById("registerForm");
const warningCard = document.getElementById("warningCard");
const warningText = document.getElementById("warningText");

registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralCode = document.getElementById("referralCode").value.trim() || null;

  warningCard.classList.add("d-none");
  warningText.textContent = "";

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
    const res = await fetch("/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, referralCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      warningText.textContent = data.message || "Registration failed.";
      warningCard.classList.remove("d-none");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("username", data.user.username);

    window.location.href = "/html/home.html";
  } catch (err) {
    warningText.textContent = err.message || "Unexpected error occurred.";
    warningCard.classList.remove("d-none");
  }
});

if (password !== confirmPassword) {
  warningText.textContent = "Passwords do not match.";
  warningCard.classList.remove("d-none");
  warningCard.classList.add("show");
  setTimeout(() => warningCard.classList.remove("show"), 400);
  return;
}

