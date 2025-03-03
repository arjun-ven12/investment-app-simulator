document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("registerForm");

  if (!registerForm) {
    console.error("Register form not found in the DOM.");
    return;
  }

  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validate passwords
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    const registrationData = {
      username: username,
      email: email,
      password: password,
    };

    // Utility function to handle fetch requests
    function fetchMethod(url, callback, method = "POST", body = null) {
      const options = {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : null,
      };

      fetch(url, options)
        .then((response) =>
          response
            .json()
            .then((data) => callback(response.status, data))
            .catch(() =>
              callback(response.status, { message: "Invalid JSON response" })
            )
        )
        .catch((error) => {
          console.error("Fetch error:", error);
          callback(500, { message: "Internal server error" });
        });
    }

    // Nested fetch for registration and referral creation
    function registerUser() {
      fetchMethod("/api/register", handleRegistrationResponse, "POST", registrationData);
    }

    function handleRegistrationResponse(status, data) {
      if (status === 201) {
        alert("Registration successful!");

        // Save userId in localStorage if returned by the backend
        if (data.userId) {
          localStorage.setItem("userId", data.userId);
        } else {
          alert("User ID not returned from registration. Referral cannot be created.");
          return;
        }

        // Proceed to create referral
        createReferral();
      } else {
        alert("Registration failed: " + (data.message || "Unknown error"));
      }
    }

    function createReferral() {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        alert("User ID not found in localStorage. Cannot create referral.");
        return;
      }

      const referralData = { userId };

      fetchMethod("/stats/", handleReferralResponse, "POST", referralData);
    }

    function handleReferralResponse(status, data) {
      if (status === 201) {
        alert("Referral created successfully!");
        window.location.href = "/html/login.html"; // Redirect after successful registration and referral creation
      } else {
        alert("Referral creation failed: " + (data.message || "Unknown error"));
      }
    }

    // Start the registration process
    registerUser();
  });
});
