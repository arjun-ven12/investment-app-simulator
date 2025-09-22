document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const warningCard = document.getElementById("warningCard");
  const warningText = document.getElementById("warningText");

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    // Reset warnings
    warningCard.classList.add("d-none");
    warningText.textContent = "";

    if (!username || !password) {
      warningText.textContent = "Please fill in both fields.";
      warningCard.classList.remove("d-none");
      warningCard.classList.add("show");
      setTimeout(() => warningCard.classList.remove("show"), 400);
      return;
    }

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username, password }),
    })
      .then((response) => {
        if (response.status === 404) {
          throw new Error("Username does not exist. Please recheck or create a new account.");
        }
        if (response.status === 401) {
          throw new Error("Incorrect password. Try again.");
        }
        if (!response.ok) {
          throw new Error("An error occurred. Please try again later.");
        }
        return response.json();
      })
      .then((data) => {
        if (data.token) {
          localStorage.setItem("userId", data.userId);
          localStorage.setItem("username", data.username);
          localStorage.setItem("token", data.token);

          window.location.href = "./home.html";
        }
      })
      .catch((error) => {
        warningText.textContent = error.message;
        warningCard.classList.remove("d-none");
        warningCard.classList.add("show");
        setTimeout(() => warningCard.classList.remove("show"), 400);
      });
  });
});

