document.addEventListener("DOMContentLoaded", async () => {
    class QuizModel {
        constructor() {
            this.quizData = [];
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.selectedAnswers = new Array(8).fill(null); // Stores selected answers
        }

        async fetchQuestions() {
            try {
                const response = await fetch("/api/quiz/questions");
                this.quizData = await response.json();
            } catch (error) {
                console.error("Error fetching quiz questions:", error);
            }
        }

        getTotalQuestions() {
            return this.quizData.length;
        }

        getCurrentQuestion() {
            return this.quizData[this.currentQuestionIndex] || {};
        }

        selectAnswer(index) {
            this.selectedAnswers[this.currentQuestionIndex] = index;
        }

        isAnswerSelected() {
            return this.selectedAnswers[this.currentQuestionIndex] !== null;
        }

        checkAnswers() {
            this.score = this.selectedAnswers.reduce((acc, answer, index) => {
                return answer === this.quizData[index].correct_answer ? acc + 1 : acc;
            }, 0);
        }

        resetQuiz() {
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.selectedAnswers.fill(null);
        }
    }

    class QuizController {
        constructor(model) {
            this.model = model;
            this.quizContainer = document.querySelector(".quiz-container");
            this.questionElement = document.getElementById("question");
            this.optionsElement = document.getElementById("options");
            this.nextButton = document.getElementById("next");
            this.prevButton = document.getElementById("prev");
            this.submitButton = document.getElementById("submit");
            this.restartButton = document.getElementById("reset-quiz");
            this.resultElement = document.getElementById("result");
            this.progressElement = document.getElementById("progress");

            this.nextButton.addEventListener("click", () => this.nextQuestion());
            this.prevButton.addEventListener("click", () => this.prevQuestion());
            this.submitButton.addEventListener("click", () => this.submitQuiz());
            this.restartButton.addEventListener("click", () => this.restartQuiz());
        }

        async loadQuiz() {
            await this.model.fetchQuestions();
            this.showQuestion();
        }

        showQuestion() {
            const question = this.model.getCurrentQuestion();

            if (!question.question) {
                this.showResult();
                return;
            }

            this.questionElement.textContent = question.question;
            this.optionsElement.innerHTML = "";

            question.options.forEach((option, index) => {
                const button = document.createElement("button");
                button.className = "option";
                button.textContent = option;

                if (this.model.selectedAnswers[this.model.currentQuestionIndex] === index) {
                    button.classList.add("selected");
                }

                button.onclick = () => this.handleOptionClick(button, index);

                this.optionsElement.appendChild(button);
            });

            this.updateNavigation();
            this.updateProgressBar();
        }

        handleOptionClick(button, index) {
            this.model.selectAnswer(index);

            document.querySelectorAll(".option").forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");

            this.nextButton.disabled = false; // Enable Next button when option is selected
        }

        nextQuestion() {
            if (this.model.isAnswerSelected()) {
                this.model.currentQuestionIndex++;
                if (this.model.currentQuestionIndex < this.model.getTotalQuestions()) {
                    this.showQuestion();
                } else {
                    this.submitQuiz();
                }
            } else {
                alert("⚠️ Please select an answer before proceeding.");
            }
        }

        prevQuestion() {
            if (this.model.currentQuestionIndex > 0) {
                this.model.currentQuestionIndex--;
                this.showQuestion();
            }
        }

        async submitQuiz() {
            this.model.checkAnswers();

            this.quizContainer.innerHTML = `
                <div class="quiz-result">
                    <h2>${this.model.score === this.model.getTotalQuestions() ? "🎉 Perfect Score! 🎉" : "Quiz Completed!"}</h2>
                    <p>You scored <strong>${this.model.score} out of ${this.model.getTotalQuestions()}!</strong></p>
                    <button id="restart-button">Restart Quiz</button>
                </div>
            `;

            document.getElementById("restart-button").addEventListener("click", () => this.restartQuiz());

            // If user gets full marks, update wallet
            if (this.model.score === this.model.getTotalQuestions()) {
                await this.updateWallet();
            }
        }

        async updateWallet() {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch("/api/quiz/update-wallet", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ amount: 1000 }),
                });
        
                if (response.ok) {
                    alert("🎉 You received $1000 for a perfect score!");
                } else {
                    alert("⚠️ Wallet update failed.");
                }
            } catch (error) {
                console.error("Error updating wallet:", error);
                alert("⚠️ Unable to update wallet.");
            }
        }
        

        restartQuiz() {
            this.model.resetQuiz();
            window.location.reload();
        }

        updateNavigation() {
            this.prevButton.style.display = this.model.currentQuestionIndex > 0 ? "inline-block" : "none";
            this.nextButton.style.display = this.model.currentQuestionIndex < this.model.getTotalQuestions() - 1 ? "inline-block" : "none";
            this.submitButton.style.display = this.model.currentQuestionIndex === this.model.getTotalQuestions() - 1 ? "inline-block" : "none";
            this.restartButton.style.display = this.model.currentQuestionIndex > 0 ? "inline-block" : "none";
        }

        updateProgressBar() {
            const progress = ((this.model.currentQuestionIndex + 1) / this.model.getTotalQuestions()) * 100;
            this.progressElement.style.width = `${progress}%`;
        }
    }

    const quizModel = new QuizModel();
    const quizController = new QuizController(quizModel);
    await quizController.loadQuiz();
});
