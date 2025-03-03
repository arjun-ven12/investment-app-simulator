document.addEventListener('DOMContentLoaded', () => {
    const updatePhoneForm = document.getElementById('update-phone-form');
    const deleteAccountForm = document.getElementById('delete-account-form');
    const token = localStorage.getItem('token'); // Retrieve the JWT from localStorage

    if (updatePhoneForm) {
        updatePhoneForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const userId = localStorage.getItem('userId');

            const phoneNumber = document.getElementById('phone').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/profile/update-phone', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`, // Include the JWT in the header
                    },
                    body: JSON.stringify({ userId, phoneNumber, password }),
                });

                const result = await response.json();
                if (response.ok) {
                    alert(result.message || 'Phone number updated successfully');
                } else {
                    alert(result.message || 'Error updating phone number');
                }
            } catch (error) {
                console.error('Error updating phone number:', error);
            }
        });
    }

    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const userId = localStorage.getItem('userId');

            const password = document.getElementById('delete-password').value;

            if (!confirm('Are you sure you want to delete your account? This action is irreversible.')) {
                return;
            }

            try {
                const response = await fetch('/profile/delete-account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId, password }),
                });

                const result = await response.json();
                if (response.ok) {
                    alert(result.message);
                    localStorage.clear(); // Clear local storage
                    window.location.href = '/'; // Redirect to homepage
                } else {
                    alert(result.message || 'Error deleting account');
                }
            } catch (error) {
                console.error('Error deleting account:', error);
            }
        });
    }
});

const logoutButton = document.getElementById("logoutButton");
  
// Logout functionality
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear authentication token
    alert("You have been logged out.");
    window.location.href = "./login.html";
});
