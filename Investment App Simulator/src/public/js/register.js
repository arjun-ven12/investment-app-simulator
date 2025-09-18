registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) return alert("Passwords do not match");

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) return alert("Password must include uppercase, lowercase, number, and special character");

  try {
    // 1️⃣ Register user
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    console.log("Registration response:", data);

    if (!res.ok) throw new Error(data.message || "Registration failed");

    const userId = data.userId;
    if (!userId) throw new Error("User ID not returned from registration");

    localStorage.setItem("userId", userId);

    // 2️⃣ Create referral immediately
    const referralRes = await fetch("/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const referralData = await referralRes.json();
    if (!referralRes.ok) throw new Error(referralData.message || "Failed to create referral");

    console.log("Referral created:", referralData);

    alert("Registration successful!");
    window.location.href = "/html/login.html";

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});
