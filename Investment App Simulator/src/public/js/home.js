document.addEventListener("DOMContentLoaded", async () => {
    const usernameEl = document.getElementById("username");
    const walletEl = document.getElementById("wallet");
    const walletToggle = document.getElementById("walletToggle");
    const logoutButton = document.getElementById("logoutButton");

    let isWalletVisible = false;

    // Fetch user details
    async function fetchUserDetails() {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        if (!userId) return alert("User not logged in.");
        if (!token) return null;

        try {
            const res = await fetch(`/user/get/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            // Handle both formats: { user: {...} } or { success: true, user: {...} }
            if (data.success === false) {
                console.error("Failed to fetch user details:", data.message);
                return null;
            }

            return data.user || data; // fallback if success not included
        } catch (err) {
            console.error("Error fetching user details:", err);
            return null;
        }
    }

    // Render user info
    async function renderUser() {
        const user = await fetchUserDetails();
        if (!user) {
            usernameEl.textContent = "Guest";
            walletEl.textContent = "****";
            return;
        }

        usernameEl.textContent = user.username;
        walletEl.setAttribute("data-value", user.wallet);
        walletEl.textContent = "****"; // hidden by default
    }

    // Toggle wallet visibility
    walletToggle.addEventListener("click", () => {
        const walletValue = walletEl.getAttribute("data-value");
        if (isWalletVisible) {
            walletEl.textContent = "****";
            walletToggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            walletEl.textContent = `$${walletValue}`;
            walletToggle.innerHTML = '<i class="fas fa-eye"></i>';
        }
        isWalletVisible = !isWalletVisible;
    });



    // Load user info
    renderUser();
});
