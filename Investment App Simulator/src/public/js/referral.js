let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  
  if (!userId) return alert("User not logged in.");

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
      updateStatsUI(stats);
      updateProgressBar(stats.creditsEarned);
      updateReferralLinkUI(stats.referralLink);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected. Reconnecting...');
    });
  }

  // -------- Update Stats UI --------
function updateStatsUI(stats) {
  const signupCount = document.getElementById('signupCount');
  const creditsEarned = document.getElementById('creditsEarned');

  if (signupCount) signupCount.innerText = stats.referralSignups ?? 0;
  if (creditsEarned) creditsEarned.innerText = `$${stats.creditsEarned ?? 0}`;
}
  // -------- Update Referral Link UI --------
  function updateReferralLinkUI(link) {
    const referralInput = document.getElementById('referralCode');
    if (referralInput) referralInput.value = link;
  }

  // -------- Copy Referral Code --------
  const referralCodeInput = document.getElementById('referralCode');
  const copyBtn = document.getElementById('copyReferral');
  copyBtn?.addEventListener('click', () => {
    referralCodeInput.select();
    referralCodeInput.setSelectionRange(0, 99999);
    document.execCommand('copy');
    alert('Referral code copied!');
  });

  // -------- Enter Friend's Referral Link --------
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

      updateStatsUI(data.referral);
      updateReferralLinkUI(data.referral.referralLink);
      updateProgressBar(data.referral.creditsEarned);
    } catch (err) {
      console.error(err);
      alert('Failed to load referral stats.');
    }
  }

  // -------- Progress Bar --------
  const rewardTiers = [100, 150, 200, 250, 300];

  function getNextTier(credits) {
    for (let tier of rewardTiers) if (credits < tier) return tier;
    return rewardTiers[rewardTiers.length - 1];
  }

  function updateProgressBar(creditsEarned) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const nextRewardElem = document.getElementById('nextReward');

    if (!progressFill || !progressText || !nextRewardElem) return;

    const maxCap = 300;
    const progressPercent = Math.min((creditsEarned / maxCap) * 100, 100);
    progressFill.style.width = `${progressPercent}%`;
    progressText.innerText = `${creditsEarned} / ${maxCap}`;
    nextRewardElem.innerText = `$${getNextTier(creditsEarned)}`;
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

  // -------- How It Works Toggle --------
  const toggleTip = document.getElementById('toggleHowItWorks');
  const stepsCard = document.querySelector('.steps-container-card');
  const howItWorksHeading = document.querySelector('.how-it-works-card h4');
  const hidden = localStorage.getItem('howItWorksHidden') === 'true';

  stepsCard.style.display = hidden ? 'none' : 'flex';
  howItWorksHeading.style.display = hidden ? 'none' : 'block';
  toggleTip.innerHTML = hidden ? 'Show Tip <i class="fas fa-chevron-down"></i>'
    : 'Hide Tip <i class="fas fa-chevron-up"></i>';

  toggleTip.addEventListener('click', () => {
    const isHidden = stepsCard.style.display === 'none';
    stepsCard.style.display = isHidden ? 'flex' : 'none';
    howItWorksHeading.style.display = isHidden ? 'block' : 'none';
    toggleTip.innerHTML = isHidden ? 'Hide Tip <i class="fas fa-chevron-up"></i>'
      : 'Show Tip <i class="fas fa-chevron-down"></i>';
    localStorage.setItem('howItWorksHidden', !isHidden);
  });

  // -------- Initial Load --------
  fetchReferralStats();
  fetchReferralHistory();
});


  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleHowItWorks');
    const card = document.querySelector('.how-it-works-card');

    if (!toggle || !card) return;

    // start open
    card.classList.remove('closed');
    toggle.addEventListener('click', () => {
      const closed = card.classList.toggle('closed');
      toggle.innerHTML = closed
        ? '<i class="fas fa-chevron-down"></i> Show Tip'
        : '<i class="fas fa-chevron-up"></i> Hide Tip';
    });
  });
