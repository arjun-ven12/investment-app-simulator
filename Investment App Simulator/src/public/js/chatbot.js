const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const navbarToggle = document.getElementById('navbar-toggle');
const navbarLinks = document.querySelector('.navbar-links');
const statsButton = document.getElementById('stats-button'); 
const logoutButton = document.getElementById("logoutButton");
  
// Logout functionality
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear authentication token
    alert("You have been logged out.");
    window.location.href = "./login.html";
});

// States
let conversationHistory = []; 
let loadingState = false; 

// Function to send a message
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;

    // Update States: Add user message and set loading state
    addMessage(message, true);
    conversationHistory.push({ role: 'user', content: message });
    userInput.value = '';
    loadingState = true;
    toggleLoadingIndicator(loadingState);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error('Failed to get response from server');
        }

        const data = await response.json();

        // Update States: Add bot response and reset loading state
        addMessage(data.response);
        conversationHistory.push({ role: 'assistant', content: data.response });
    } catch (error) {
        console.error('Error:', error);
        addMessage('Sorry, I encountered an error. Please try again.');
    } finally {
        loadingState = false;
        toggleLoadingIndicator(loadingState);
    }
}

async function fetchLogs() {
    try {
        const response = await fetch('/api/chat/logs');
        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }

        const data = await response.json();
        displayLogs(data.logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        alert('Failed to fetch logs. Check the console for details.');
    }
}

function displayLogs(logs) {
    const statsElement = document.getElementById('stats');
    statsElement.innerHTML = ''; // Clear previous stats

    for (const [category, count] of Object.entries(logs)) {
        const statItem = document.createElement('div');
        statItem.textContent = `${category}: ${count}`;
        statsElement.appendChild(statItem);
    }
}

function addMessage(content, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', isUser ? 'user-message' : 'bot-message');
    messageElement.textContent = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleLoadingIndicator(isLoading) {
    sendButton.disabled = isLoading;
    userInput.placeholder = isLoading ? 'Bot is typing...' : 'Type your message...';
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

statsButton.addEventListener('click', fetchLogs);

navbarToggle.addEventListener('click', () => {
    navbarLinks.classList.toggle('active');
});

// Initial bot message
addMessage('Welcome to the Fintech Chatbot! How can I assist you today?');


// const chatMessages = document.getElementById('chat-messages');
// const userInput = document.getElementById('user-input');
// const sendButton = document.getElementById('send-button');

// async function sendMessage() {
//   const message = userInput.value.trim();
//   if (message === '') return;

//   addMessage(message, true);
//   userInput.value = '';
//   sendButton.disabled = true;

//   try {
//     const response = await fetch('/api/chat', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ message }),
//     });

//     if (!response.ok) {
//       throw new Error('Failed to get response from server');
//     }

//     const data = await response.json();
//     addMessage(data.response);
//   } catch (error) {
//     console.error('Error:', error);
//     addMessage('Sorry, I encountered an error. Please try again.');
//   } finally {
//     sendButton.disabled = false;
//     userInput.focus();
//   }
// }

// function addMessage(content, isUser = false) {
//   const messageElement = document.createElement('div');
//   messageElement.classList.add('message', isUser ? 'user-message' : 'bot-message');
//   messageElement.textContent = content;
//   chatMessages.appendChild(messageElement);
//   chatMessages.scrollTop = chatMessages.scrollHeight;
// }

// sendButton.addEventListener('click', sendMessage);
// userInput.addEventListener('keypress', (e) => {
//   if (e.key === 'Enter') {
//     sendMessage();
//   }
// });

// // Initial bot message
// addMessage('Welcome! How can I assist you today?');
