// Function to add messages to the chat
function addMessage(message, messageType) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', messageType);

    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageContainer.appendChild(messageText);

    const messageTime = document.createElement('div');
    const now = new Date();
    messageTime.textContent = `${now.getHours()}:${now.getMinutes()}`;
    messageTime.classList.add('message-time');
    messageContainer.appendChild(messageTime);

    document.getElementById('chat-messages').appendChild(messageContainer);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
}

// Function to send user input to the backend and get the response
async function sendToBackend(userMessage) {
    try {
        const requestPayload = {
            prompt: userMessage,   // Use 'prompt' instead of 'message'
            model: "gpt-4o-mini",  
            max_tokens: 100,  
        };

        console.log("Request Payload: ", JSON.stringify(requestPayload));  // Debugging log

        const response = await fetch('/api/chatbot/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload), // Send complete request with prompt, model, and max_tokens
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response from server:', errorData);
            addMessage("Sorry, there was an error processing your request.", "bot-message");
            return;
        }

        // Parse the JSON response from the backend
        const data = await response.json();

        if (data.response) {
            // Display the bot's response from OpenAI
            addMessage(data.response, "bot-message");
        } else {
            addMessage("Sorry, I didn't understand that. Can you please rephrase?", "bot-message");
        }

    } catch (error) {
        console.error("Error sending message to backend:", error);
        setTimeout(() => addMessage("Sorry, there was an error processing your request. Please try again.", "bot-message"), 1000);
    }
}

// Event listener for the Send button
document.getElementById('send-button').addEventListener('click', () => {
    const userInput = document.getElementById('user-input').value.trim();

    if (userInput) {
        // Add user message to chat
        addMessage(userInput, "user-message");

        // Send message to backend
        sendToBackend(userInput);

        // Clear input field
        document.getElementById('user-input').value = '';
    }
});

// Event listener for Enter key in input field
document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('send-button').click();
    }
});
