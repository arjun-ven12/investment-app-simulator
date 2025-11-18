// ======================================
// SETTINGS PAGE SCRIPT
// ======================================

window.addEventListener('DOMContentLoaded', function () {

    // ================================
    // CHANGE EMAIL
    // ================================
    const emailForm = document.getElementById('change-email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const newEmail = document.getElementById('newEmail').value.trim();
            const password = document.getElementById('currentPasswordEmail').value.trim();

            if (!newEmail || !password) {
                alert('Please fill in all fields.');
                return;
            }

            fetch('/settings/change-email', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ newEmail, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert(data.message);
                emailForm.reset();
            })
            .catch(err => {
                console.error('Error changing email:', err);
                alert(`Failed to change email: ${err.message}`);
            });
        });
    }

    // ================================
    // CHANGE USERNAME
    // ================================
    const usernameForm = document.getElementById('change-username-form');
    if (usernameForm) {
        usernameForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const newUsername = document.getElementById('newUsername').value.trim();
            const password = document.getElementById('currentPasswordUsername').value.trim();

            if (!newUsername || !password) {
                alert('Please fill in all fields.');
                return;
            }

            fetch('/settings/change-username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ newUsername, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert(data.message);
                usernameForm.reset();
            })
            .catch(err => {
                console.error('Error changing username:', err);
                alert(`Failed to change username: ${err.message}`);
            });
        });
    }

    // ================================
    // CHANGE PASSWORD
    // ================================
    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const oldPassword = document.getElementById('oldPassword').value.trim();
            const newPassword = document.getElementById('newPassword').value.trim();

            if (!oldPassword || !newPassword) {
                alert('Please fill in all fields.');
                return;
            }

            fetch('/settings/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert(data.message);
                passwordForm.reset();
            })
            .catch(err => {
                console.error('Error changing password:', err);
                alert(`Failed to change password: ${err.message}`);
            });
        });
    }

    // ================================
    // DELETE ACCOUNT
    // ================================
    const deleteForm = document.getElementById('delete-account-form');
    if (deleteForm) {
        deleteForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const password = document.getElementById('deletePassword').value.trim();
            if (!password) {
                alert('Please enter your password.');
                return;
            }

            if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;

            fetch('/settings/delete-account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                alert(data.message);
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            })
            .catch(err => {
                console.error('Error deleting account:', err);
                alert(`Failed to delete account: ${err.message}`);
            });
        });
    }

    // ======================================
    // AI SETTINGS INIT
    // (Runs automatically when page loads)
    // ======================================
    const aiForm = document.getElementById("ai-settings-form");
    if (aiForm) {
        aiForm.addEventListener("submit", saveAISettings);
        loadAISettings(); // ← IMPORTANT: This loads user preferences each time page opens
    }
});



// ======================================
// AI SETTINGS (GET + UPDATE)
// ======================================

// Load user AI preferences
async function loadAISettings() {
    try {
        const res = await fetch("/ai-settings", {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        const data = await res.json();

        // Set dropdowns
        document.getElementById("riskTolerance").value = data.riskTolerance;
        document.getElementById("aiTone").value = data.aiTone;

    } catch (err) {
        console.error("Failed to load AI settings:", err);
    }
}

// Save updated AI preferences
async function saveAISettings(event) {
    event.preventDefault();

    const riskTolerance = document.getElementById("riskTolerance").value;
    const aiTone = document.getElementById("aiTone").value;

    try {
        const res = await fetch("/ai-settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ riskTolerance, aiTone })
        });

        const data = await res.json();

        if (data.error) throw new Error(data.error);

        document.getElementById("aiSaveStatus").innerText =
            "✓ Preferences saved";

        setTimeout(() => {
            document.getElementById("aiSaveStatus").innerText = "";
        }, 2000);

    } catch (err) {
        console.error("Failed to save AI settings:", err);
        document.getElementById("aiSaveStatus").innerText =
            "Failed to save settings";
    }
}
