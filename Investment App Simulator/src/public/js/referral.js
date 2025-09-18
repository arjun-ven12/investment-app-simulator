let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  if (!userId) return alert("User not logged in.");

  if (typeof io !== 'undefined') {
    socket = io();

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join', { userId }, (ack) => {
        console.log('Join ack:', ack);
      });
    });

    socket.on('referralUpdate', (stats) => {
      console.log('Referral stats updated via socket:', stats);
      updateReferralStatsUI(stats);
      updateProgressBar(stats.creditsEarned, stats.nextTierCredits || 300);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected. Reconnecting...');
    });
  }

  // Copy referral link button
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

  // Enter referral link
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
        fetchReferralStats(); // update own UI
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
      updateProgressBar(data.referral.creditsEarned, data.referral.nextTierCredits || 300);
    } catch (err) {
      console.error(err);
      alert('Failed to load referral stats.');
    }
  }

  function updateReferralStatsUI(stats) {
    const container = document.querySelector('.stats-container');
    container.innerHTML = `
      <div class="stat-box"><h4>${stats.referralSignups}</h4><p>Referral Signups</p></div>
      <div class="stat-box"><h4>${stats.successfulReferrals}</h4><p>Successful Referrals</p></div>
      <div class="stat-box"><h4>$${stats.creditsEarned}</h4><p>Credits Earned</p></div>
    `;
  }

  function updateReferralLinkUI(link) {
    const container = document.querySelector('.referral-link');
    container.innerHTML = `
      <h3>Share the link with your friends!</h3>
      <div class="link-container">
        <input type="text" id="referralLink" value="${link}" readonly>
        <button id="copyReferralButton">Copy</button>
      </div>
    `;
    attachCopyListener();
  }

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
