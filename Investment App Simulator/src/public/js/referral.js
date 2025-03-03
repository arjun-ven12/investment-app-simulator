document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const referralForm = document.getElementById('referralForm');
    const referralCodeDiv = document.getElementById('referralCode');
    const statsContainer = document.querySelector('.stats-container');
    const referralLink = document.querySelector('.referral-link');
    const userId = localStorage.getItem('userId');
    const enterReferralLinkButton = document.getElementById('enterReferralLinkButton');

    const showMessage = (message, type = 'success') => {
        const messageBox = document.createElement('div');
        messageBox.textContent = message;
        messageBox.className = `message ${type}`;
        document.body.prepend(messageBox);
        setTimeout(() => messageBox.remove(), 3000);
    };

    // Fetch and display referral stats
    const fetchReferralStats = async (userId) => {
        try {
            const response = await fetch(`/stats/${userId}`); // Fetch referral stats for the user
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch referral stats');
            }

            const stats = await response.json();

            // Update the received referral link in the DOM
            referralLink.innerHTML = `
                <h3>Share the link with your friends!.</h3>
                <div class="link-container">
                    <input type="text" value="${stats.referralLink}" id="referralLink" readonly>
                    <button onclick="copyReferralLink()" style="color: black;">Copy</button>
                </div>
                <div class="social-icons">
                <button onclick="shareOnFacebook()"><i class="fab fa-facebook"></i> Facebook</button>
                <button onclick="shareOnTwitter()"><i class="fab fa-twitter"></i> Twitter</button>
                <button onclick="shareOnLinkedIn()"><i class="fab fa-linkedin"></i> LinkedIn</button>
                <button onclick="shareOnEmail()"><i class="fas fa-envelope"></i> Gmail</button>
                <button onclick="shareOnWhatsApp()"><i class="fab fa-whatsapp"></i> WhatsApp</button>
                <button onclick="shareOnTelegram()"><i class="fab fa-telegram"></i> Telegram</button>
            </div>
            `;

            // Update the stats in the DOM
            statsContainer.innerHTML = `
                <div class="stat-box">
                    <h4>${stats.referralSignups}</h4>
                    <p>Referral Signups</p>
                </div>
                <div class="stat-box">
                    <h4>${stats.successfulReferrals}</h4>
                    <p>Successful Referrals</p>
                </div>
                <div class="stat-box">
                    <h4>${stats.rewardsExchanged}</h4>
                    <p>Rewards Exchanged</p>
                </div>
                <div class="stat-box">
                    <h4>$${stats.creditsEarned}</h4>
                    <p>Credits Earned</p>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching referral stats:', error.message);
            showMessage('Failed to load referral stats. Please try again later.', 'error');
        }
    };

    // Fetch the referral stats on page load
    fetchReferralStats(userId);

    // Handle referral link entry
    enterReferralLinkButton.addEventListener('click', async () => {
        const referralLink = document.getElementById('receivedReferralLink').value;

        try {
            const response = await fetch(`/stats/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referralLink }),
            });

            if (response.ok) {
                const data = await response.json();
                alert('Referral link entered successfully!');
                fetchReferralStats(userId); 
            } else {
                const error = await response.json();
                alert(error.error);
            }
        } catch (error) {
            console.error(error.message);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
});

// Functions for copying and sharing referral links
function copyReferralLink() {
    const referralLink = document.getElementById("referralLink");
    referralLink.select();
    document.execCommand("copy");
    alert("Referral link copied to clipboard!");
}

function enterReferralLink() {
    alert("Referral link entered successfully!");
}

function shareOnFacebook() {
    copyReferralLink(); // Copy referral link to clipboard
    const referralLink = document.getElementById("referralLink").value;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(facebookUrl, '_blank');
}

function shareOnTwitter() {
    copyReferralLink(); // Copy referral link to clipboard
    const referralLink = document.getElementById("referralLink").value;
    const twitterUrl = `https://twitter.com/intent/tweet?text=Check%20this%20out!&url=${encodeURIComponent(referralLink)}`;
    window.open(twitterUrl, '_blank');
}

function shareOnLinkedIn() {
    copyReferralLink(); // Copy referral link to clipboard
    const referralLink = document.getElementById("referralLink").value;
    const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(referralLink)}`;
    window.open(linkedInUrl, '_blank');
}

function shareOnEmail() {
    copyReferralLink(); // Copy referral link to clipboard
    const referralLink = document.getElementById("referralLink").value;
    const emailSubject = "Check out Fintech!";
    const emailBody = `I thought you might be interested in this: ${referralLink}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank');
}

function shareOnWhatsApp() {
    copyReferralLink();
    const referralLink = document.getElementById("referralLink").value;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(referralLink)}`;
    window.open(whatsappUrl, '_blank');
}

function shareOnTelegram() {
    copyReferralLink();
    const referralLink = document.getElementById("referralLink").value;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Check this out!")}`;
    window.open(telegramUrl, '_blank');
}

const logoutButton = document.getElementById("logoutButton");
  
// Logout functionality
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear authentication token
    alert("You have been logged out.");
    window.location.href = "./login.html";
});
