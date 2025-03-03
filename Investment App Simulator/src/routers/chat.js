// // // OPEN AI
// // const express = require('express');
// // const OpenAI = require('openai');


// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY,
// //   baseURL: process.env.OPENAI_API_BASE_URL,
// // });

// // const router = express.Router();

// // router.post('/', async (req, res) => {
// //   if (!openai.apiKey) {
// //     return res.status(500).json({ error: "OpenAI API key not configured" });
// //   }

// //   try {
// //     const { message } = req.body;

// //     const completion = await openai.chat.completions.create({
// //       model: "gpt-3.5-turbo",
// //       messages: [{ role: "user", content: generatePrompt(message) }],
// //       max_tokens: 50,
// //       temperature: 0.6,
// //     });

// //     res.status(200).json({ response: completion.choices[0].message.content.trim() });
// //   } catch (error) {
// //     console.error(`Error with OpenAI API request: ${error.message}`);
// //     res.status(500).json({ error: 'An error occurred during your request.' });
// //   }
// // });

// // function generatePrompt(message) {
// //   return `You are a helpful fintech assistant. The user asks: ${message}`;
// // }

// // module.exports = router;

// const express = require('express');
// const axios = require('axios');
// const { GoogleAuth } = require('google-auth-library');
// const router = express.Router();

// let queryLogs = [];

// async function getAccessToken() {
//   const auth = new GoogleAuth({
//     scopes: ['https://www.googleapis.com/auth/cloud-platform'],
//   });
//   const client = await auth.getClient();
//   return client.getAccessToken();
// }

// function categorizeQuery(message) {
//   if (message.toLowerCase().includes('finance')) return 'Finance';
//   if (message.toLowerCase().includes('help')) return 'General Inquiry';
//   return 'Other';
// }

// router.post('/', async (req, res) => {
//   const { message } = req.body;

//   if (!message) {
//     return res.status(400).json({ error: 'Message is required.' });
//   }

//   try {
//     const token = await getAccessToken();
//     const response = await axios.post(
//       'https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage',
//       {
//         messages: [{ role: 'user', content: message }],
//         maxOutputTokens: 500,
//         temperature: 0.6,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const botResponse = response.data.candidates[0].output.trim();

//     const category = categorizeQuery(message);
//     queryLogs.push({
//       message,
//       response: botResponse,
//       category,
//       timestamp: new Date(),
//     });

//     res.status(200).json({ response: botResponse });
//   } catch (error) {
//     console.error('Error with API request:', error.response?.data || error.message);
//     res.status(500).json({ error: error.response?.data || error.message });
//   }
// });

// router.get('/logs', (req, res) => {
//   const groupedLogs = queryLogs.reduce((acc, log) => {
//     acc[log.category] = (acc[log.category] || 0) + 1;
//     return acc;
//   }, {});

//   res.status(200).json({ logs: groupedLogs });
// });

// module.exports = router;
