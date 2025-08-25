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

















// document.addEventListener("DOMContentLoaded", function () {
//   const loginForm = document.getElementById("loginForm");
//   const captchaDisplay = document.getElementById("captchaDisplay");
//   const captchaInput = document.getElementById("captchaInput");
//   const loginButton = document.getElementById("loginButton");
//   const warningCard = document.getElementById("warningCard");
//   const warningText = document.getElementById("warningText");

//   function generateCaptcha() {
//       const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//       let captchaValue = '';
//       for (let i = 0; i < 6; i++) {
//           captchaValue += chars.charAt(Math.floor(Math.random() * chars.length));
//       }
//       captchaDisplay.innerText = captchaValue;
//       captchaDisplay.style.fontSize = "24px";
//       captchaDisplay.style.fontWeight = "bold";
//       captchaDisplay.style.padding = "10px";
//       captchaDisplay.style.backgroundColor = "#f0f0f0";
//       captchaDisplay.style.border = "1px solid #000";
//       captchaDisplay.style.display = "inline-block";
//       return captchaValue;
//   }

//   let currentCaptcha = generateCaptcha();
//   let captchaAttempted = false;

//   captchaInput.addEventListener("input", function () {
//       loginButton.disabled = captchaInput.value.trim() === "";
//   });

//   loginForm.addEventListener("submit", function (event) {
//       event.preventDefault();

//       if (captchaAttempted) {
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "CAPTCHA already used. Please try again.";
//           captchaInput.value = "";
//           currentCaptcha = generateCaptcha();
//           captchaAttempted = false;
//           return;
//       }

//       const username = document.getElementById("username").value;
//       const password = document.getElementById("password").value;

//       if (!username || !password) {
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "Please fill in both fields.";
//           return;
//       }

//       if (captchaInput.value !== currentCaptcha) {
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "Incorrect CAPTCHA. Try again.";
//           captchaInput.value = "";
//           currentCaptcha = generateCaptcha();
//           return;
//       }

//       captchaAttempted = true;

//       fetch("/api/login", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ name: username, password: password })
//       })
//       .then(response => response.json())
//       .then(data => {
//           if (data.token) {
//               localStorage.setItem("userId", data.userId);
//               localStorage.setItem("username", data.username);
//               localStorage.// document.addEventListener("DOMContentLoaded", function () {
//   const loginForm = document.getElementById("loginForm");
//   const captchaDisplay = document.getElementById("captchaDisplay");
//   const captchaInput = document.getElementById("captchaInput");
//   const loginButton = document.getElementById("loginButton");
//   const warningCard = document.getElementById("warningCard");
//   const warningText = document.getElementById("warningText");

//   function generateCaptcha() {
//       const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//       let captchaValue = '';
//       for (let i = 0; i < 6; i++) {
//           captchaValue += chars.charAt(Math.floor(Math.random() * chars.length));
//       }
//       captchaDisplay.innerText = captchaValue;
//       captchaDisplay.style.fontSize = "24px";
//       captchaDisplay.style.fontWeight = "bold";
//       captchaDisplay.style.padding = "10px";
//       captchaDisplay.style.backgroundColor = "#f0f0f0";
//       captchaDisplay.style.border = "1px solid #000";
//       captchaDisplay.style.display = "inline-block";
//       return captchaValue;
//   }

//   let currentCaptcha = generateCaptcha();
//   let captchaAttempted = false;

//   captchaInput.addEventListener("input", function () {
//       loginButton.disabled = captchaInput.value.trim() === "";
//   });

//   loginForm.addEventListener("submit", function (event) {
//       event.preventDefault();

//       if (captchaAttempted) {
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "CAPTCHA already used. Please try again.";
//           captchaInput.value = "";
//           currentCaptcha = generateCaptcha();
//           captchaAttempted = false;
//           return;
//       }

//       const username = document.getElementById("username").value;
//       const password = document.getElementById("password").value;

//       if (!username || !password) {
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "Please fill in both fields.";
//           return;
//       }

//       if (captchaInput.value !== currentCaptcha) {
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "Incorrect CAPTCHA. Try again.";
//           captchaInput.value = "";
//           currentCaptcha = generateCaptcha();
//           return;
//       }

//       captchaAttempted = true;

//       fetch("/api/login", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ name: username, password: password })
//       })
//       .then(response => response.json())
//       .then(data => {
//           if (data.token) {
//               localStorage.setItem("userId", data.userId);
//               localStorage.setItem("username", data.username);
//               localStorage.setItem("token", data.token);
//               alert("Login successful!");
//               window.location.href = "./home.html";
//           } else {
//               warningCard.classList.remove("d-none");
//               warningText.innerText = "Incorrect username or password. Try again.";
//               document.getElementById("password").value = "";
//               captchaInput.value = "";
//               currentCaptcha = generateCaptcha();
//               captchaAttempted = false;
//           }
//       })
//       .catch(error => {
//           console.error("Login error:", error);
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "An error occurred. Please try again later.";
//           captchaInput.value = "";
//           currentCaptcha = generateCaptcha();
//           captchaAttempted = false;
//       });
//   });
// });
setItem("token", data.token);
//               alert("Login successful!");
//               window.location.href = "./home.html";
//           } else {
//               warningCard.classList.remove("d-none");
//               warningText.innerText = "Incorrect username or password. Try again.";
//               document.getElementById("password").value = "";
//               captchaInput.value = "";
//               currentCaptcha = generateCaptcha();
//               captchaAttempted = false;
//           }
//       })
//       .catch(error => {
//           console.error("Login error:", error);
//           warningCard.classList.remove("d-none");
//           warningText.innerText = "An error occurred. Please try again later.";
//           captchaInput.value = "";
//           currentCaptcha = generateCaptcha();
//           captchaAttempted = false;
//       });
//   });
// });
