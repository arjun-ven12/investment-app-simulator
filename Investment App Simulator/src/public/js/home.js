document.addEventListener("DOMContentLoaded", async () => {
    const usernameDisplay = document.getElementById("username");
    const walletDisplay = document.getElementById("wallet");
    const walletToggle = document.getElementById("walletToggle");
    const logoutButton = document.getElementById("logoutButton");

    let isWalletVisible = true;

    try {
        // Fetch user details
        const response = await fetchWithToken("/api/user/details", { method: "GET" });

        if (response.ok) {
            const userData = await response.json();
            // Update wallet value and store it in data-value
            usernameDisplay.textContent = userData.username;
            walletDisplay.textContent = `$${userData.wallet}`;
            walletDisplay.setAttribute("data-value", userData.wallet);
        } else {
            console.error("Failed to fetch user details:", response.status, response.statusText);
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
    }

    // Toggle wallet visibility
    walletToggle.addEventListener("click", () => {
        if (isWalletVisible) {
            // Hide wallet value
            walletDisplay.textContent = "****";
            walletToggle.textContent = "Show";
        } else {
            // Show wallet value using the stored data-value
            const walletValue = walletDisplay.getAttribute("data-value");
            walletDisplay.textContent = `$${walletValue}`;
            walletToggle.textContent = "Hide";
        }
        isWalletVisible = !isWalletVisible;
    });

    // Logout functionality
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("token"); // Clear the token
        alert("You have been logged out.");
        window.location.href = "./login.html";
    });
});

// Wrapper for fetch with token handling
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
