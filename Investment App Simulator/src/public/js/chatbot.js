// Load popup HTML dynamically
async function loadChatbot() {
    const res = await fetch('/html/popupChatbot.html');
    const html = await res.text();
    document.body.insertAdjacentHTML('beforeend', html);
    initChatbot(); // initialize after HTML is loaded
}

function initChatbot() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatPopup = document.getElementById('chat-popup');
    const chatClose = document.getElementById('chat-close');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Open/close functions
    function openChat() {
        chatPopup.style.display = 'flex';
        chatPopup.classList.add('opening');
        chatPopup.addEventListener('animationend', () => chatPopup.classList.remove('opening'), { once: true });
    }

    function closeChat() {
        chatPopup.classList.add('closing');
        chatPopup.addEventListener('animationend', () => {
            chatPopup.style.display = 'none';
            chatPopup.classList.remove('closing');
        }, { once: true });
    }

    // Toggle button opens/closes chat
    chatToggle.addEventListener('click', () => {
        if (chatPopup.style.display === 'flex') {
            closeChat();
        } else {
            openChat();
        }
    });

    // X button closes chat
    chatClose.addEventListener('click', closeChat);

    // Add message
    function addMessage(content, isUser = false) {
        const message = document.createElement('div');
        message.classList.add('message', isUser ? 'user-message' : 'bot-message');
        message.innerHTML = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        chatMessages.appendChild(message);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Send message
    async function sendMessage() {
        const msg = userInput.value.trim();
        if (!msg) return;
        addMessage(msg, true);
        userInput.value = '';

        // Typing indicator
        const typingEl = document.createElement('div');
        typingEl.classList.add('typing');
        typingEl.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res = await fetch('/api/chatbot/generateForAI', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: msg })
            });
            const data = await res.json();
            chatMessages.removeChild(typingEl);
            addMessage(data.response);
        } catch {
            chatMessages.removeChild(typingEl);
            addMessage('Sorry, an error occurred.');
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    // Initial bot message
    addMessage('Welcome to the Fintech Chatbot! How can I assist you today?');
}

// Run on page load
window.addEventListener('DOMContentLoaded', loadChatbot);
