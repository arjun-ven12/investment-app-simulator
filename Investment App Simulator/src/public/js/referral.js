let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  if (!userId) return alert("User not logged in.");

  referralLinkInput = document.getElementById('referralLink');

  // -------- Socket Setup --------
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

  // -------- Copy Referral Link --------
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

  attachCopyListener();

  // -------- Enter Referral Link --------
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
        fetchReferralHistory();
      } else {
        alert(data.message || 'Failed to use referral link');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred. Please try again.');
    }
  });

  // -------- Fetch Referral Stats --------
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

  // -------- Update UI --------
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
        <button id="copyReferralButton"><i class="fas fa-copy"></i> Copy</button>
      </div>
    `;
    referralLinkInput = document.getElementById('referralLink'); // reassign
    attachCopyListener();
  }

  const rewardTiers = [100, 150, 200, 250, 300]; // reward levels

  function getNextTier(credits) {
    for (let tier of rewardTiers) if (credits < tier) return tier;
    return rewardTiers[rewardTiers.length - 1]; // max cap
  }

  function getPrevTier(credits) {
    let prev = 0;
    for (let tier of rewardTiers) {
      if (credits < tier) return prev;
      prev = tier;
    }
    return rewardTiers[rewardTiers.length - 1];
  }

  function calculateNextTierCredits(successfulReferrals) {
  const base = 100;
  const increment = 50;
  const max = 300;
  return Math.min(base + successfulReferrals * increment, max);
}


function updateProgressBar(creditsEarned) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const nextRewardElem = document.getElementById('nextReward');

    if (!progressFill || !progressText || !nextRewardElem) return;

    const maxCap = 300; // hardcoded max cap

    // Calculate % relative to max cap
    const progressPercent = Math.min((creditsEarned / maxCap) * 100, 100);
    progressFill.style.width = `${progressPercent}%`;

    // Show "credits / 300" instead of "credits / nextTier"
    progressText.innerText = `${creditsEarned} / ${maxCap}`;

    // Next reward still shows next tier
    const nextTier = getNextTier(creditsEarned);
    nextRewardElem.innerText = `$${nextTier}`;
}



  // -------- Referral History --------
  async function fetchReferralHistory() {
    try {
      const res = await fetch(`/referral/${userId}/history`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch referral history');

      const tbody = document.querySelector('#referralTable tbody');
      tbody.innerHTML = '';

      data.history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.referralOwnerId === parseInt(userId, 10) ? 'Sent' : 'Used'}</td>
          <td>${item.usedByUserId || item.referralOwnerId}</td>
          <td>${new Date(item.usedAt).toLocaleString()}</td>
          <td class="status">${item.status}</td>
        `;
        tbody.appendChild(row);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // -------- Social Share Buttons --------
  function setupShareButtons() {
    const share = (url) => window.open(url, '_blank');

    document.getElementById('shareWhatsapp')?.addEventListener('click', () => {
      const link = encodeURIComponent(referralLinkInput.value);
      share(`https://api.whatsapp.com/send?text=Join%20using%20my%20referral%20link:%20${link}`);
    });

    document.getElementById('shareFacebook')?.addEventListener('click', () => {
      const link = encodeURIComponent(referralLinkInput.value);
      share(`https://www.facebook.com/sharer/sharer.php?u=${link}`);
    });

    document.getElementById('shareTwitter')?.addEventListener('click', () => {
      const link = encodeURIComponent(referralLinkInput.value);
      share(`https://twitter.com/intent/tweet?url=${link}&text=Join%20using%20my%20referral%20link!`);
    });

    document.getElementById('shareLinkedIn')?.addEventListener('click', () => {
      const link = encodeURIComponent(referralLinkInput.value);
      share(`https://www.linkedin.com/sharing/share-offsite/?url=${link}`);
    });

    document.getElementById('copyLink')?.addEventListener('click', () => {
      referralLinkInput.select();
      referralLinkInput.setSelectionRange(0, 99999);
      document.execCommand('copy');
      alert('Referral link copied!');
    });
  }

  setupShareButtons();

  // -------- Initial Load --------
  fetchReferralStats();
  fetchReferralHistory();
});
