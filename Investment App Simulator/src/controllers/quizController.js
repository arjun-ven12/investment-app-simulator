// const QuizController = class {
//     constructor(model) {
//         this.model = model;
//         this.questionElement = document.getElementById('question');
//         this.optionsElement = document.getElementById('options');
//         this.progressElement = document.getElementById('progress');
//         this.prevButton = document.getElementById('prev');
//         this.nextButton = document.getElementById('next');
//         this.submitButton = document.getElementById('submit');
//         this.quizElement = document.getElementById('quiz');
//         this.resultElement = document.getElementById('result');
//     }

//     loadQuestion() {
//         const question = this.model.getCurrentQuestion();
//         this.questionElement.textContent = question.question;
        
//         this.optionsElement.innerHTML = '';
//         question.options.forEach((option, index) => {
//             const button = document.createElement('button');
//             button.className = 'option';
//             button.textContent = option;
//             button.onclick = () => this.selectOption(index);
//             this.optionsElement.appendChild(button);
//         });

//         this.updateNavigationButtons();
//         this.updateProgressBar();
//     }

//     selectOption(index) {
//         const options = document.querySelectorAll('.option');
//         options.forEach((option, i) => {
//             option.classList.toggle('selected', i === index);
//         });
//     }

//     updateNavigationButtons() {
//         this.prevButton.disabled = this.model.currentQuestion === 0;
//         this.nextButton.style.display = this.model.currentQuestion === this.model.getTotalQuestions() - 1 ? 'none' : 'inline-block';
//         this.submitButton.style.display = this.model.currentQuestion === this.model.getTotalQuestions() - 1 ? 'inline-block' : 'none';
//     }

//     updateProgressBar() {
//         const progress = ((this.model.currentQuestion + 1) / this.model.getTotalQuestions()) * 100;
//         this.progressElement.style.width = `${progress}%`;
//     }

//     showNextQuestion() {
//         if (this.model.nextQuestion()) {
//             this.loadQuestion();
//         }
//     }

//     showPreviousQuestion() {
//         if (this.model.previousQuestion()) {
//             this.loadQuestion();
//         }
//     }

//     submitQuiz() {
//         const selectedOption = document.querySelector('.option.selected');
//         if (selectedOption) {
//             const answer = Array.from(selectedOption.parentNode.children).indexOf(selectedOption);
//             this.model.checkAnswer(answer);
//         }
        
//         this.quizElement.style.display = 'none';
//         this.resultElement.style.display = 'block';
//         this.resultElement.innerHTML = `You scored ${this.model.score} out of ${this.model.getTotalQuestions()}!`;
//     }

//     toggleMobileMenu() {
//         document.querySelector('.navbar-links').classList.toggle('active');
//     }

//     resetQuiz() {
//         this.model.resetQuiz();
//         this.loadQuestion();
//         this.quizElement.style.display = 'block';
//         this.resultElement.style.display = 'none';
//     }
// }

const QuizModel = require("../models/Quiz");
const jwt = require("jsonwebtoken");
const prisma = require("../models/prismaClient");

const quizModel = new QuizModel();

module.exports = class QuizController {
    async getQuestions(req, res) {
        try {
            console.log("📡 Received request for quiz questions...");
            const questions = await quizModel.getAllQuizQuestions();
            console.log("✅ Sending response:", questions);
            res.json(questions);
        } catch (error) {
            console.error("❌ Error in getQuestions controller:", error);
            res.status(500).json({ 
                error: "Failed to fetch questions", 
                details: error.message 
            });
        }
    }
    

    async updateWallet(req, res) {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                return res.status(401).json({ message: "Unauthorized: No token provided" });
            }
    
            // Decode JWT token to extract user ID
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            if (!decoded || !decoded.id) {
                return res.status(403).json({ message: "Invalid token" });
            }
    
            const userId = decoded.id;
            const { amount } = req.body;
    
            if (!amount || isNaN(amount) || amount <= 0) {
                return res.status(400).json({ message: "Invalid amount" });
            }
    
            // Update user's wallet in the database
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { wallet: { increment: amount } },
            });
    
            res.status(200).json({
                message: "✅ Wallet updated successfully!",
                wallet: updatedUser.wallet,
            });
        } catch (error) {
            console.error("❌ Error updating wallet:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    // Mock user token decoding since no userModel.js
    getMockUserId(token) {
        if (token === "test-token") {
            return "mock-user-id"; // Mock user ID
        }
        return null;
    }
};
