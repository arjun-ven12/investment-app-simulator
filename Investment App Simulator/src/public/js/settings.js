window.addEventListener('DOMContentLoaded', function () {
    // --- Change Email ---
    const emailForm = document.getElementById('change-email-form');
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

    // --- Change Username ---
    const usernameForm = document.getElementById('change-username-form');
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

    // --- Change Password ---
    const passwordForm = document.getElementById('change-password-form');
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

    // --- Delete Account ---
    const deleteForm = document.getElementById('delete-account-form');
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
            window.location.href = '/login.html'; // redirect to login
        })
        .catch(err => {
            console.error('Error deleting account:', err);
            alert(`Failed to delete account: ${err.message}`);
        });
    });
});
