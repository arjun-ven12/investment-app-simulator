document.addEventListener("DOMContentLoaded", async () => {
    const usernameDisplay = document.getElementById("username");
    const walletDisplay = document.getElementById("wallet");
    const walletToggle = document.getElementById("walletToggle");
    const logoutButton = document.getElementById("logoutButton");

        // Default state: hidden
        let isWalletVisible = false;;
        document.addEventListener("DOMContentLoaded", () => {
            document.body.classList.add("js-loaded"); // allow wallet to show after JS is ready
        });
        
        try {
            const response = await fetchWithToken("/api/user/details", { method: "GET" });
            if (response.ok) {
                const userData = await response.json();
                usernameDisplay.textContent = userData.username;
        
                // Keep wallet hidden initially, just store the value
                walletDisplay.setAttribute("data-value", userData.wallet);
                walletDisplay.textContent = "****"; // hidden by default
            } else {
                console.error("Failed to fetch user details:", response.status);
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
        }        
    

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
