document.addEventListener("DOMContentLoaded", async () => {
    const goalForm = document.getElementById("goal-form");

    if (!goalForm) {
        console.error("Goal form not found in DOM.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const goalId = urlParams.get("id");

    if (!goalId) {
        alert("Invalid goal ID.");
        window.location.href = "goals.html";
        return;
    }

    try {
        const response = await fetch(`/api/goals/${goalId}`);

        if (!response.ok) {
            throw new Error("Goal not found.");
        }

        const goal = await response.json();

        if (!goal || !goal.deadline) {
            alert("Goal not found.");
            window.location.href = "goals.html";
            return;
        }

        document.getElementById("goal-title").value = goal.title || "";
        document.getElementById("goal-amount").value = goal.amount || "";
        document.getElementById("goal-description").value = goal.description || "";
        document.getElementById("goal-deadline").value = goal.deadline ? goal.deadline.split("T")[0] : "";

    } catch (error) {
        console.error("Error loading goal details:", error);
        alert("Goal cannot be found or loaded.");
        window.location.href = "goals.html";
    }

    goalForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const updatedGoal = {
            title: document.getElementById("goal-title").value,
            amount: parseFloat(document.getElementById("goal-amount").value),
            description: document.getElementById("goal-description").value,
            deadline: document.getElementById("goal-deadline").value
        };

        try {
            const response = await fetch(`/api/goals/${goalId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedGoal),
            });

            if (!response.ok) {
                throw new Error("Failed to update goal.");
            }

            alert("Goal updated successfully!");
            window.location.href = "goals.html";

        } catch (error) {
            console.error("Error updating goal:", error);
            alert("Failed to update goal.");
        }
    });
});

const logoutButton = document.getElementById("logoutButton");
  
// Logout functionality
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear authentication token
    alert("You have been logged out.");
    window.location.href = "./login.html";
});
