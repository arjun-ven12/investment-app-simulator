require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

async function getAccessToken() {
  try {
    // Check if credentials.json exists
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialsPath || !fs.existsSync(credentialsPath)) {
      console.error('Error: GOOGLE_APPLICATION_CREDENTIALS is not set or file does not exist.');
      console.error('Path:', credentialsPath);
      process.exit(1);
    }

    console.log('Using credentials file:', credentialsPath);

    // Initialize GoogleAuth with required scope
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // Get the client and fetch the access token
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    console.log('Access Token:', token);
    return token;
  } catch (error) {
    console.error('Error generating access token:', error.message);
    throw error;
  }
}

// Run the token generation function
getAccessToken().catch(console.error);

const logoutButton = document.getElementById("logoutButton");
  
// Logout functionality
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token"); // Clear authentication token
    alert("You have been logged out.");
    window.location.href = "./login.html";
});
