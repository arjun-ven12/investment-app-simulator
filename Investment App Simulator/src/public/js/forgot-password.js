document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.getElementById("formContainer");
  const statusMessage = document.getElementById("statusMessage");

  let emailValue = "";
  let countdownInterval;

  formContainer.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("email");
    emailValue = emailInput.value.trim();

    const res = await fetch("/user/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailValue }),
    });

    const data = await res.json();

    if (res.ok) {
      statusMessage.style.color = "#2ecc71";
      statusMessage.textContent = "✅ Code sent! Check your email.";
      // Save email so reset-password page can retrieve it later
      localStorage.setItem("resetEmail", emailValue);
      // Replace form with code entry UI and inline resend text
      formContainer.innerHTML = `
        <form id="codeForm">
          <p>
            Enter the verification code sent to <b>${emailValue}</b>.
            <span id="resendText" class="resend-text">(Resend in 2:00)</span>
          </p>
          <div class="form-group">
            <input type="text" id="resetCode" placeholder="6-digit code" maxlength="6" required />
          </div>
          <button type="submit">Verify Code</button>
        </form>
      `;

      const codeForm = document.getElementById("codeForm");
      const resendText = document.getElementById("resendText");

      let seconds = 120;
      let fadeInterval;

      // Fade and countdown logic
      function startCountdown() {
        resendText.style.color = "#777";
        resendText.style.cursor = "default";
        resendText.textContent = `(Resend in 2:00)`;

        countdownInterval = setInterval(() => {
          seconds--;
          const min = Math.floor(seconds / 60);
          const sec = seconds % 60;
          resendText.textContent = `(Resend in ${min}:${sec < 10 ? "0" + sec : sec})`;

          // gradually fade from grey → white near end
          if (seconds < 30) {
            const fadeRatio = 1 - seconds / 30;
            const grey = 119 + Math.round(136 * fadeRatio); // #777 → #fff
            resendText.style.color = `rgb(${grey}, ${grey}, ${grey})`;
            resendText.style.textDecoration = "underline";
          }

          if (seconds <= 0) {
            clearInterval(countdownInterval);
            resendText.textContent = `(Resend Code)`;
            resendText.style.color = "#ffffff";
            resendText.style.cursor = "pointer";
            resendText.style.textDecoration = "underline";
            resendText.addEventListener("click", resendCode);
          }
        }, 1000);
      }

      async function resendCode() {
        resendText.removeEventListener("click", resendCode);
        resendText.style.color = "#777";
        resendText.style.cursor = "default";
        resendText.textContent = `(Resending...)`;

        const resendRes = await fetch("/user/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue }),
        });

        const resendData = await resendRes.json();

        if (resendRes.ok) {
          statusMessage.style.color = "#2ecc71";
          statusMessage.textContent = "✅ New code sent!";
          seconds = 120;
          startCountdown();
        } else {
          statusMessage.style.color = "#ff4c4c";
          statusMessage.textContent =
            resendData.message || "Could not resend code.";
          resendText.textContent = `(Resend Code)`;
          resendText.style.color = "#ffffff";
          resendText.style.cursor = "pointer";
          resendText.addEventListener("click", resendCode);
        }
      }

      startCountdown();

      // Handle code verification
      codeForm.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const code = document.getElementById("resetCode").value.trim();

        const verifyRes = await fetch("/user/verify-reset-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue, code }),
        });

        const verifyData = await verifyRes.json();

        if (verifyRes.ok) {
          statusMessage.style.color = "#2ecc71";
          statusMessage.textContent = "✅ Code verified! Redirecting...";
          localStorage.setItem("resetCode", code);
          setTimeout(() => (window.location.href = "reset-password.html"), 1500);
        } else {
          statusMessage.style.color = "#ff4c4c";
          statusMessage.textContent =
            verifyData.message || "Invalid or expired code.";
        }
      });
    } else {
      statusMessage.style.color = "#ff4c4c";
      statusMessage.textContent =
        data.message || "Failed to send reset code.";
    }
  });
});
