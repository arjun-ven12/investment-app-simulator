let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    alert("User not logged in.");
    return;
  }

  if (typeof io !== 'undefined') {
    socket = io();

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join', { userId }); // join user-specific room
    });

    socket.on('referralUpdate', (stats) => {
      console.log('Referral stats updated via socket:', stats);

      // Update stats UI
      document.getElementById('signupCount').innerText = stats.referralSignups;
      document.getElementById('successCount').innerText = stats.successfulReferrals;
      document.getElementById('creditsEarned').innerText = `$${stats.creditsEarned}`;

      // Update progress bar
      const progressFill = document.getElementById('progressFill');
      const progressText = document.getElementById('progressText');
      const progressPercent = Math.min((stats.creditsEarned / 300) * 100, 100);
      progressFill.style.width = `${progressPercent}%`;
      progressText.innerText = `${stats.creditsEarned} / 300`;
    });
  }


  // Navbar toggle
  const navbarToggle = document.getElementById('navbar-toggle');
  navbarToggle?.addEventListener('click', () => {
    document.querySelector('.navbar-links')?.classList.toggle('active');
  });

  // Copy referral link listener
  function attachCopyListener() {
    const copyBtn = document.getElementById('copyReferralButton');
    copyBtn?.addEventListener('click', () => {
      const referralInput = document.getElementById('referralLink');
      referralInput?.select();
      referralInput?.setSelectionRange(0, 99999);
      document.execCommand('copy');
      alert("Referral link copied!");
    });
  }

  // Handle referral link entry
  const enterReferralButton = document.getElementById('enterReferralLinkButton');
  enterReferralButton?.addEventListener('click', async () => {
    const receivedLink = document.getElementById('receivedReferralLink')?.value.trim();
    if (!receivedLink) return alert("Please enter a referral link!");

    try {
      const res = await fetch(`/referral/${userId}/use`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralLink: receivedLink })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Referral link entered successfully!');
        fetchReferralStats();
      } else {
        alert(data.message || 'Failed to use referral link');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred. Please try again.');
    }
  });

  // Fetch referral stats
  async function fetchReferralStats() {
    try {
      const res = await fetch(`/referral/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch referral stats');

      updateReferralStatsUI(data.referral);
      updateReferralLinkUI(data.referral.referralLink);
      updateProgressBar(data.referral.creditsEarned, data.referral.nextTierCredits);
    } catch (err) {
      console.error(err);
      alert('Failed to load referral stats. Please try again later.');
    }
  }

  // Update stats UI
  function updateReferralStatsUI(stats) {
    const container = document.querySelector('.stats-container');
    container.innerHTML = `
      <div class="stat-box"><h4>${stats.referralSignups}</h4><p>Referral Signups</p></div>
      <div class="stat-box"><h4>${stats.successfulReferrals}</h4><p>Successful Referrals</p></div>
      <div class="stat-box"><h4>${stats.rewardsExchanged}</h4><p>Rewards Exchanged</p></div>
      <div class="stat-box"><h4>$${stats.creditsEarned}</h4><p>Credits Earned</p></div>
    `;
  }

  // Update referral link UI
  function updateReferralLinkUI(link) {
    const container = document.querySelector('.referral-link');
    container.innerHTML = `
      <h3>Share the link with your friends!</h3>
      <div class="link-container">
        <input type="text" id="referralLink" value="${link}" readonly>
        <button id="copyReferralButton">Copy</button>
      </div>
    `;
    attachCopyListener(); // re-attach listener
  }

  // Update progress bar
  function updateProgressBar(creditsEarned, nextTierCredits) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    const progressPercent = Math.min((creditsEarned / 300) * 100, 100);
    progressFill.style.width = `${progressPercent}%`;
    progressText.innerText = `${creditsEarned} / 300`;

    const nextRewardElem = document.getElementById('nextReward');
    if (nextRewardElem) nextRewardElem.innerText = `$${Math.min(nextTierCredits, 300)}`;
  }

  // Initial load
  fetchReferralStats();
});
