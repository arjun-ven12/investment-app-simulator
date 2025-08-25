document.addEventListener("DOMContentLoaded", async () => {
    const usernameDisplay = document.getElementById("username");
    const walletDisplay = document.getElementById("wallet");
    const walletToggle = document.getElementById("walletToggle");
    const logoutButton = document.getElementById("logoutButton");

    // Wallet is hidden by default
    let isWalletVisible = false;

    try {
        const response = await fetchWithToken("/api/user/details", { method: "GET" });
        if (response.ok) {
            const userData = await response.json();

            // Set username
            usernameDisplay.textContent = userData.username;

            // Store wallet value, but keep hidden
            walletDisplay.setAttribute("data-value", userData.wallet);
            walletDisplay.textContent = "****"; // hidden initially
        } else {
            console.error("Failed to fetch user details:", response.status, response.statusText);
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
    }

    // Toggle wallet visibility
    walletToggle.addEventListener("click", () => {
        if (isWalletVisible) {
            walletDisplay.textContent = "****";
            walletToggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            const walletValue = walletDisplay.getAttribute("data-value");
            walletDisplay.textContent = `$${walletValue}`;
            walletToggle.innerHTML = '<i class="fas fa-eye"></i>';
        }
        isWalletVisible = !isWalletVisible;
    });

    // Logout
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("token");
        alert("You have been logged out.");
        window.location.href = "./login.html";
    });
});

// Wrapper for fetch with token
async function fetchWithToken(url, options = {}) {
    const token = localStorage.getItem("token");
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
}
