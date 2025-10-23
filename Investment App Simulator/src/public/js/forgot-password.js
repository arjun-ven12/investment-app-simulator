const form = document.getElementById("forgotForm");
const warningCard = document.getElementById("warningCard");
const successCard = document.getElementById("successCard");
const warningText = document.getElementById("warningText");
const successText = document.getElementById("successText");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

  // Reset alerts
  warningCard.classList.add("d-none");
  successCard.classList.add("d-none");

  try {
    const res = await fetch("/user/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      warningText.textContent = data.message || "Something went wrong. Please try again.";
      warningCard.classList.remove("d-none");
      warningCard.classList.add("show");
      setTimeout(() => warningCard.classList.remove("show"), 400);
      return;
    }

    // ✅ Success message instead of redirect
    successText.textContent = "✅ Check your email for the reset link.";
    successCard.classList.remove("d-none");
    successCard.classList.add("show");
    setTimeout(() => successCard.classList.remove("show"), 400);

    // Optional: Redirect after 3 seconds
    setTimeout(() => {
      window.location.href = "login.html";
    }, 3000);

  } catch (err) {
    warningText.textContent = "Something went wrong. Please try again later.";
    warningCard.classList.remove("d-none");
    warningCard.classList.add("show");
    setTimeout(() => warningCard.classList.remove("show"), 400);
    console.error(err);
  }
});
