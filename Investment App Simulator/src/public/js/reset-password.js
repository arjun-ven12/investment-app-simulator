document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("resetForm");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const statusMessage = document.getElementById("statusMessage");

    // Toggle visibility buttons
    document.querySelectorAll(".toggle-visibility").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";

            // update aria and class for styling
            btn.classList.toggle("visible", isPassword);
            btn.setAttribute("aria-label", isPassword ? `Hide ${targetId}` : `Show ${targetId}`);

            // swap icon (if you use different svgs you can swap innerHTML here)
            // For simple color toggle we already add/remove class "visible"
        });
    });

    // Submit handler: validate passwords match locally first
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        statusMessage.textContent = "";
        statusMessage.style.color = "#fff";

        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (!newPassword || !confirmPassword) {
            statusMessage.textContent = "Please fill both password fields.";
            statusMessage.style.color = "#ff4c4c";
            return;
        }

        if (newPassword !== confirmPassword) {
            statusMessage.textContent = "Passwords do not match.";
            statusMessage.style.color = "#ff4c4c";
            return;
        }

        // Optionally: enforce password strength on client
        const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!pwRegex.test(newPassword)) {
            statusMessage.textContent = "Password must be 8+ chars with upper, lower, number and special char.";
            statusMessage.style.color = "#ff4c4c";
            return;
        }

        // Now call reset endpoint (token read from query string)
        const email = localStorage.getItem("resetEmail");
        const code = localStorage.getItem("resetCode");
        try {
            const res = await fetch("/user/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code, newPassword }),
            });
            const data = await res.json();

            if (!res.ok) {
                statusMessage.textContent = data.message || "Password reset failed.";
                statusMessage.style.color = "#ff4c4c";
                return;
            }

            statusMessage.textContent = data.message || "Password updated. Redirecting to login...";
            statusMessage.style.color = "#2ecc71";

            setTimeout(() => {
                window.location.href = "/login";
            }, 1200);
        } catch (err) {
            console.error(err);
            statusMessage.textContent = "Server error. Try again later.";
            statusMessage.style.color = "#ff4c4c";
        }
    });
});
