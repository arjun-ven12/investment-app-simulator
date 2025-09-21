document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const loginButton = document.getElementById("loginButton");
    const warningCard = document.getElementById("warningCard");
    const warningText = document.getElementById("warningText");

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (!username || !password) {
            warningCard.classList.remove("d-none");
            warningText.innerText = "Please fill in both fields.";
            return;
        }

        fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: username, password: password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("username", data.username);
                localStorage.setItem("token", data.token);
                alert("Login successful!");
              
                window.location.href = "./home.html";

            } else {
                warningCard.classList.remove("d-none");
                warningText.innerText = "Incorrect username or password. Try again.";
                document.getElementById("password").value = "";
            }
        })
        .catch(error => {
            console.error("Login error:", error);
            warningCard.classList.remove("d-none");
            warningText.innerText = "An error occurred. Please try again later.";
        });
    });
});
