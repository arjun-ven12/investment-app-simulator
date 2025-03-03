// class QuizModel {
//     constructor() {
//         this.quizData = [
//             {
//                 question: "What is fintech?",
//                 options: [
//                     "Financial technology",
//                     "Fine arts technology",
//                     "Fitness technology",
//                     "Food technology"
//                 ],
//                 correctAnswer: 0
//             },
//             {
//                 question: "Which of the following is NOT a common fintech application?",
//                 options: [
//                     "Mobile banking",
//                     "Cryptocurrency",
//                     "Robotic surgery",
//                     "Peer-to-peer lending"
//                 ],
//                 correctAnswer: 2
//             },
//             {
//                 question: "What is blockchain primarily used for in fintech?",
//                 options: [
//                     "Social media",
//                     "Video streaming",
//                     "Secure, decentralized transactions",
//                     "Weather forecasting"
//                 ],
//                 correctAnswer: 2
//             }
//         ];
//         this.currentQuestion = 0;
//         this.score = 0;
//     }

//     getTotalQuestions() {
//         return this.quizData.length;
//     }

//     getCurrentQuestion() {
//         return this.quizData[this.currentQuestion];
//     }

//     nextQuestion() {
//         if (this.currentQuestion < this.getTotalQuestions() - 1) {
//             this.currentQuestion++;
//             return true;
//         }
//         return false;
//     }

//     previousQuestion() {
//         if (this.currentQuestion > 0) {
//             this.currentQuestion--;
//             return true;
//         }
//         return false;
//     }

//     checkAnswer(selectedAnswer) {
//         const currentQuestion = this.getCurrentQuestion();
//         if (selectedAnswer === currentQuestion.correctAnswer) {
//             this.score++;
//             return true;
//         }
//         return false;
//     }

//     resetQuiz() {
//         this.currentQuestion = 0;
//         this.score = 0;
//     }
// }

const prisma = require("./prismaClient");
const jwt = require("jsonwebtoken");

// console.log("🔍 Prisma Client Loaded:", prisma); // Debugging log

module.exports = class QuizModel {
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return { userId: decoded.userId };
        } catch (error) {
            return null;
        }
    }

    async updateWallet(userId, amount) {
        return await prisma.user.update({
            where: { id: userId },
            data: { wallet: { increment: amount } },
        });
    }

    async getAllQuizQuestions() {
        try {
            console.log("📡 Fetching quiz questions from database...");
            const questions = await prisma.quizQuestion.findMany().catch(console.error);
            console.log("✅ Fetched Questions:", questions);
            return questions;
        } catch (error) {
            console.error("❌ Error fetching quiz questions:", error);
            throw error;  // Rethrow error so the controller catches it
        }
    }
    
};
