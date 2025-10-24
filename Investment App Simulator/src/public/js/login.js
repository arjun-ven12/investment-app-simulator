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
        console.log("Response:", res.status, data.message); // Debugging line

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
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("username", data.user.username);

      window.location.href = "/html/home.html";
    } catch (err) {
      showWarning(err.message || "Unexpected error occurred.");
    }
  });

  function showWarning(message) {
    warningText.innerHTML = message; // use innerHTML for link
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
  }

async function resendVerification(loginInput) {
  try {
    let email = loginInput;

    // If the user entered a username, we first ask the backend for their email
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

    // Now resend verification
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

});

// Google Sign-In redirect
document.getElementById("googleSignInBtn").addEventListener("click", () => {
  // Redirect to your backend route that starts the Google OAuth flow
  window.location.href = "http://localhost:3000/auth/google";
});

    document.getElementById("microsoftSignInBtn").addEventListener("click", () => {
      window.location.href = "http://localhost:3000/auth/microsoft";
    });