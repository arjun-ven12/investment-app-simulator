// document.addEventListener("DOMContentLoaded", () => {
//     const goalForm = document.getElementById("goal-form");
//     const goalList = document.getElementById("goals-list");

//     // Fetch and display goals on page load
//     fetch("/api/goals")
//         .then(response => response.json())
//         .then(goals => {
//             if (Array.isArray(goals)) {
//                 goals.forEach(displayGoal);
//             } else {
//                 console.error("Expected an array but received:", goals);
//             }
//         })
//         .catch(error => console.error("Error fetching goals:", error));

//     goalForm.addEventListener("submit", (event) => {
//         event.preventDefault();
//         const title = document.getElementById("goal-title").value;
//         const amount = document.getElementById("goal-amount").value;
//         const description = document.getElementById("goal-description").value;
//         const deadline = document.getElementById("goal-deadline").value;
//         const userId = localStorage.getItem("userId"); // ✅ Get userId from localStorage

//         if (!userId) {
//             alert("User not found. Please log in.");
//             return;
//         }

//         fetch("/api/goals", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ title, amount, description, deadline, userId }) // ✅ Include userId
//         })
//         .then(response => response.json())
//         .then(goal => {
//             displayGoal(goal);
//             showPopup("Goal Added Successfully!");
//         })
//         .catch(error => console.error("Error adding goal:", error));

//         goalForm.reset();
//     });

//     function displayGoal(goal) {
//         const div = document.createElement("div");
//         div.className = "goal-box";
//         div.innerHTML = `
//             <p><strong>${goal.title}</strong></p>
//             <p>Amount: $${goal.amount}</p>
//             <p>Description: ${goal.description || "No description provided"}</p>
//             <p>Deadline: ${new Date(goal.deadline).toLocaleDateString()}</p>
//             <button onclick="editGoal(${goal.id})">Edit</button> <!-- ✅ Fixed -->
//             <button onclick="deleteGoal(${goal.id})">Delete</button>
//         `;
//         goalList.appendChild(div);
//     }

//     window.editGoal = function(id) {
//         console.log("Editing goal with ID:", id); // Debugging
//         window.location.href = `goalEdit.html?id=${id}`; // Redirects to the edit page
//     };

//     window.deleteGoal = function(id) {
//         fetch(`/api/goals/${id}`, { method: "DELETE" })
//         .then(() => {
//             document.location.reload();
//         });
//     };

//     function showPopup(message) {
//         const popup = document.createElement("div");
//         popup.className = "popup";
//         popup.innerText = message;
//         document.body.appendChild(popup);
//         setTimeout(() => popup.remove(), 2000);
//     }
// });

document.addEventListener("DOMContentLoaded", () => {
    const goalForm = document.getElementById("goal-form");
    const goalList = document.getElementById("goals-list");
    const userId = localStorage.getItem("userId"); // ✅ Get userId from localStorage

    if (!userId) {
        alert("User not found. Please log in.");
        return;
    }

    // ✅ Fetch goals only for the logged-in user
    fetch(`/api/goals?userId=${userId}`)
        .then(response => response.json())
        .then(goals => {
            if (Array.isArray(goals)) {
                goalList.innerHTML = ""; // Clear previous goals
                goals.forEach(displayGoal);
            } else {
                console.error("Expected an array but received:", goals);
            }
        })
        .catch(error => console.error("Error fetching user goals:", error));

    goalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const title = document.getElementById("goal-title").value;
        const amount = document.getElementById("goal-amount").value;
        const description = document.getElementById("goal-description").value;
        const deadline = document.getElementById("goal-deadline").value;

        fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, amount, description, deadline, userId }) // ✅ Include userId
        })
        .then(response => response.json())
        .then(goal => {
            displayGoal(goal);
            showPopup("Goal Added Successfully!");
        })
        .catch(error => console.error("Error adding goal:", error));

        goalForm.reset();
    });
});

// ✅ Move these functions OUTSIDE of `DOMContentLoaded` to make them globally accessible
window.editGoal = function (id) {
    console.log("Editing goal with ID:", id);
    window.location.href = `goalEdit.html?id=${id}`; // Redirects to the edit page
};

window.deleteGoal = function (id) {
    fetch(`/api/goals/${id}`, { method: "DELETE" })
        .then(() => {
            document.location.reload();
        })
        .catch(error => console.error("Error deleting goal:", error));
};

// ✅ Function to display a goal in the list
function displayGoal(goal) {
    const div = document.createElement("div");
    div.className = "goal-box";
    div.innerHTML = `
        <p><strong>${goal.title}</strong></p>
        <p>Amount: $${goal.amount}</p>
        <p>Description: ${goal.description || "No description provided"}</p>
        <p>Deadline: ${new Date(goal.deadline).toLocaleDateString()}</p>
        <button onclick="editGoal(${goal.id})">Edit</button> 
        <button onclick="deleteGoal(${goal.id})">Delete</button>
    `;
    document.getElementById("goals-list").appendChild(div);
}

const logoutButton = document.getElementById("logoutButton");
  
// Logout functionality
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear authentication token
    alert("You have been logged out.");
    window.location.href = "./login.html";
});