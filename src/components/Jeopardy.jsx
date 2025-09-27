import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Jeopardy.css';

const USER_ID = "83";
const TEAM_ID = "798a1dc6-dbf1-494c-af48-f1b56bae1a33";

const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODQsImVtYWlsIjoicmFuZG9tLjE0MjAyNEB2aXRzdHVkZW50LmFjLmluIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTg5NTg4MDEsImV4cCI6MTc1ODk1OTcwMX0.DDazUuvY91HwoK00sD-hJWqPoxK18lEWOmwK5-RC74s";

const API_BASE = "http://localhost:3000";
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${JWT_TOKEN}`
  }
});

const categories = [
  { id: "2bcbf4eb-7211-47d8-b46e-5a0ce0273da5", name: "FinTech Frontier" },
  { id: "91505992-b5fd-4541-bfa0-02ecf2415bb6", name: "Language Lab" },
  { id: "b15b5d75-18d7-4c12-a6fe-729b117764fc", name: "What's That Tech?" },
  { id: "c8035958-0082-4948-a587-bb53212a36c3", name: "Brain Benders" },
  { id: "e6a60e63-08ef-4d5e-9b55-9eeb5e6f0794", name: "Expand It!!" }
];

const difficultyMap = {
  200: "Very Easy",
  400: "Easy",
  600: "Medium",
  800: "Hard",
  1000: "Very Hard"
};

export default function Jeopardy() {
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState([]); // categoryId-difficulty
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch already attempted questions for this team
  const fetchAttemptedQuestions = async () => {
  try {
    const res = await axiosInstance.post("/jeopardy/player/get-attempted", {
      teamId: TEAM_ID
    });
    if (res.data?.attempted) setAnsweredQuestions(res.data.attempted); 
    } catch (err) {
      console.error("Failed to fetch attempted questions:", err);
    }
  };

  const fetchTeamPoints = async () => {
    try {
      const res = await axiosInstance.post("/jeopardy/player/teampoints", { teamId: TEAM_ID });
      setScore(res.data?.team?.teamPoints ?? 0);
    } catch (err) {
      console.error("Failed to fetch team points:", err);
    }
  };

  useEffect(() => {
    fetchTeamPoints();
    fetchAttemptedQuestions();
  }, []);

   const handleOptionSelect = (option) => {
    if (submitted) return;
    setSelectedOption(option);
  };

  const handleQuestionClick = async (questionId, categoryId, difficulty) => {
  if (answeredQuestions.includes(questionId) || loading) return;

  try {
    setLoading(true);

    const response = await axiosInstance.post("/jeopardy/player/choose-question", {
      userId: USER_ID,
      teamId: TEAM_ID,
      categoryId,   // send UUID only
      difficulty    // send difficulty string
    });

    // Add question to answered list (frontend tracking)
    setAnsweredQuestions(prev => [...prev, questionId]);

    const backendQuestionId = response.data.question.id;

    setCurrentQuestion({
      frontendId: questionId,
      id: backendQuestionId,
      value: response.data.question.points || 0,
      displayValue: response.data.question.points || 0,
      question: response.data.question.questionText,
      options: response.data.question.options
    });

    setSelectedOption(null);
    setFeedback(null);
    setSubmitted(false);
    setModalVisible(true);
  } catch (err) {
    console.error("Choose question error:", err);
    alert(`Failed to choose question: ${err.message}`);
  } finally {
    setLoading(false);
  }
};


  const handleAnswerSubmit = async () => {
    if (!selectedOption || !currentQuestion?.id || loading) return;
    try {
      setLoading(true);
      const res = await axiosInstance.post("/jeopardy/player/submit-answer", {
        userId: USER_ID,
        teamId: TEAM_ID,
        questionId: currentQuestion.id,
        selectedOption
      });

      setFeedback(res.data.correct ? "correct" : "incorrect");
      setSubmitted(true);
      fetchTeamPoints();
    } catch (err) {
      console.error("Submit answer error:", err);
      alert(`Failed to submit answer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setModalVisible(false);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setFeedback(null);
    setSubmitted(false);
  };

  const renderGameBoard = () => {
  const values = [200, 400, 600, 800, 1000];

  return (
    <>
      {categories.map(cat => (
        <div key={`header-${cat.id}`} className="category-header">{cat.name}</div>
      ))}

      {values.map(val =>
        categories.map(cat => {
          const difficulty = difficultyMap[val];
          const questionId = `${cat.id}-${difficulty}`; // for frontend tracking
          const isAnswered = answeredQuestions.includes(questionId); // exhausted globally per team

          return (
            <div
              key={questionId}
              className={`value-cell ${isAnswered ? "answered" : ""}`}
              onClick={() => !isAnswered && handleQuestionClick(questionId, cat.id, difficulty)}
              role="button"
              aria-disabled={isAnswered}
              tabIndex={isAnswered ? -1 : 0}
              onKeyDown={e => {
                if (!isAnswered && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleQuestionClick(questionId, cat.id, difficulty);
                  }
                }}
              >
                ${val}
              </div>
            );
          })
        )}
      </>
    );
  };
  return (
    <>
      <div className="score-badge">Score: {score}</div>
      <div className="game-board">{renderGameBoard()}</div>

      {modalVisible && currentQuestion && (
        <div className="modal">
          <div className="modal-content">
            <div className="question-value">{currentQuestion.displayValue || currentQuestion.value}</div>
            <div className={feedback === "correct" ? "correct" : feedback === "incorrect" ? "incorrect" : ""}>
              {feedback === "correct" ? "Correct!" : feedback === "incorrect" ? "Incorrect!" : currentQuestion.question}
            </div>

            {!feedback && (
              <>
                <div className="options-container">
                  {Object.entries(currentQuestion.options).map(([key, value], i) => (
                    <label key={i} className="option-item">
                      <input
                        type="radio"
                        name="answerOption"
                        value={key}
                        checked={selectedOption === key}
                        onChange={() => handleOptionSelect(key)}
                        disabled={submitted || loading}
                      />
                      <span>{key}: {value}</span>
                    </label>
                  ))}
                </div>

                <button onClick={handleAnswerSubmit} disabled={!selectedOption || submitted || loading}>
                  {loading ? "Submitting..." : "Submit"}
                </button>
                <button onClick={handleContinue} disabled={loading}>Skip / Continue</button>
              </>
            )}

            {feedback && (
              <button onClick={handleContinue} disabled={loading}>Continue</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
