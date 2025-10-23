document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const warningCard = document.getElementById("warningCard");
  const warningText = document.getElementById("warningText");

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

    // Determine whether input is email or username
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
        throw new Error(data.message || "Login failed.");
      }

      // ✅ Login success
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("username", data.user.username);

      window.location.href = "/html/home.html";
    } catch (err) {
      showWarning(err.message || "Unexpected error occurred.");
    }
  });

  function showWarning(message) {
    warningText.textContent = message;
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
  }
});
