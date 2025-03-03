// const QuizRouter = class {
//     constructor(controller) {
//         this.controller = controller;
//     }

//     initializeRoutes() {
//         document.getElementById('prev').addEventListener('click', () => this.controller.showPreviousQuestion());
//         document.getElementById('next').addEventListener('click', () => this.controller.showNextQuestion());
//         document.getElementById('submit').addEventListener('click', () => this.controller.submitQuiz());
//         document.getElementById('navbar-toggle').addEventListener('click', () => this.controller.toggleMobileMenu());

//         // Add event listener for quiz reset (you might want to add a reset button in your HTML)
//         document.getElementById('reset-quiz').addEventListener('click', () => this.controller.resetQuiz());
//     }
// }


// import { PrismaClient } from "@prisma/client";
// import express from "express";

// const prisma = new PrismaClient();
// const router = express.Router();

// // Fetch all quiz questions
// router.get("/questions", async (req, res) => {
//   try {
//     const questions = await prisma.quizQuestion.findMany();
//     res.json(
//       questions.map((q) => ({
//         id: q.id,
//         question: q.question,
//         options: JSON.parse(q.options),
//         correctAnswer: q.answer,
//       }))
//     );
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch quiz questions" });
//   }
// });

// export default router;

const express = require('express')
const QuizController = require("../controllers/quizController.js");

const router = express.Router();
const quizController = new QuizController();

// Route to fetch quiz questions
router.get("/questions", (req, res) => quizController.getQuestions(req, res));

// Route to update wallet when quiz is completed
router.post("/update-wallet", (req, res) => quizController.updateWallet(req, res));

module.exports = router;
