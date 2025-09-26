import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Jeopardy.css';

const USER_ID = "45"; // e.g., 'user123'
const TEAM_ID = "46b10396-db5b-42b8-8f09-8f43be60d894"; // e.g., 'team456'

const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZW1haWwiOiJzdHJpbmciLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTg5MDg4NTgsImV4cCI6MTc1ODkwOTc1OH0.zSybIU3kfdO59fA7hjrHRsvDNPN3quwPpi-VN9yWa14"

const API_BASE = "https://gravitas-backend-25.onrender.com";
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${JWT_TOKEN}`
  }
});

const categories = [
  { id: "a7a9e14a-5c7b-40b8-9b8e-1d63e9c2c6b3", name: "HISTORY" },
  { id: "b8b0f25c-6d8c-41c9-a2a4-2e74f0d3d7c4", name: "SCIENCE" },
  { id: "c9c1d36e-7e9d-42da-b3b5-3f85g1e4f8d5", name: "MOVIES" },
  { id: "d2d3e47f-8f0e-53eb-c4c6-4g96h2f5i9e6", name: "LITERATURE" },
  { id: "e4e5f58g-9g1f-64fc-d5d7-5h07i3g6j0f7", name: "GEOGRAPHY" }
];

const difficultyMap = {
  200: "Easy",
  400: "Medium",
  600: "Hard",
  800: "Very hard",
  1000: "Expert"
};

export default function Jeopardy() {
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [scoreboard, setScoreboard] = useState([]);
  const [loading, setLoading] = useState(false);

  /*const refetchScoreboard = async () => {
    try {
      const res = await axiosInstance.get(`/jeopardy/player/scoreboard`);
      setScoreboard(res.data.teams || []);
      const ownTeam = res.data.teams?.find((t) => t.id === TEAM_ID);
      setScore(ownTeam?.teamPoints || 0);
    } catch (error) {
      console.error("Scoreboard refetch error:", error);
    }
  };*/
const fetchTeamPoints = async () => {
  try {
    const res = await axiosInstance.post("/jeopardy/player/teampoints", { teamId: TEAM_ID });
    setScore(res.data.team?.teamPoints || 0);
  } catch (error) {
    console.error("Failed to fetch team points:", error);
  }
};

useEffect(() => {
  fetchTeamPoints();
}, []);

  const handleQuestionClick = async (questionId) => {
    if (answeredQuestions.includes(questionId) || loading) return;

    const parts = questionId.split("-");
    console.log(parts)
    const valueStr = parts.pop();
    console.log(valueStr)
    const categoryId = parts.join("-");
    console.log(categories)
    const value = parseInt(valueStr, 10);
    console.log(value)
    const difficulty = difficultyMap[value];
    console.log(difficulty)

    try {
      setLoading(true);
      const response = await axiosInstance.post(`${API_BASE}/jeopardy/player/choose-question`, {
        userId: USER_ID,
        teamId: TEAM_ID,
        categoryId,
        difficulty,
      });

      setAnsweredQuestions((prev) => [...prev, questionId]);

      const backendQuestionId = response.data.question.id;

      const questionData = {
        frontendId: questionId,
        id: backendQuestionId,
        value: response.data.question.points || value,
        displayValue: value,
        question: response.data.question.questionText,
        options: response.data.question.options
      };
      setCurrentQuestion(questionData);
      setSelectedOption(null);
      setFeedback(null);
      setSubmitted(false);
      setModalVisible(true);
    } catch (error) {
      console.error("Choose question error:", error);
      alert(`Failed to choose question: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option) => {
    if (submitted) return;
    setSelectedOption(option);
  };

  const handleAnswerSubmit = async () => {
    if (!selectedOption || !currentQuestion || !currentQuestion.id || loading) return;

    const optionIndex = currentQuestion.options.indexOf(selectedOption);
    const selectedOptionLetter = String.fromCharCode(65 + optionIndex);

    try {
      setLoading(true);
      const response = await axiosInstance.post(`${API_BASE}/jeopardy/player/submit-answer`, {
        userId: USER_ID,
        teamId: TEAM_ID,
        questionId: currentQuestion.id,
        selectedOption: selectedOptionLetter,
      });

      setFeedback(response.data.correct ? "correct" : "incorrect");
      setSubmitted(true);
      await refetchScoreboard();
    } catch (error) {
      console.error("Submit answer error:", error);
      alert(`Failed to submit answer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setModalVisible(false);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setFeedback(null);
    setSubmitted(false);
  };

  const handleContinue = () => {
    if (currentQuestion && currentQuestion.frontendId) {
      setAnsweredQuestions((prev) => [...new Set([...prev, currentQuestion.frontendId])]);
    }
    setModalVisible(false);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setFeedback(null);
    setSubmitted(false);
  };

  const renderGameBoard = () => {
    if (loading && !modalVisible) {
      return (
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", height: "200px", fontSize: "24px" }}>
          Loading...
        </div>
      );
    }
    const values = [200, 400, 600, 800, 1000];
    return (
      <>
        {categories.map((cat) => (
          <div key={`header-${cat.id}`} className="category-header">
            {cat.name}
          </div>
        ))}
        {values.map((val) =>
          categories.map((cat) => {
            const questionId = `${cat.id}-${val}`;
            const isAnswered = answeredQuestions.includes(questionId);
            return (
              <div
                key={questionId}
                className={`value-cell ${isAnswered ? "answered" : ""}`}
                onClick={() => !isAnswered && handleQuestionClick(questionId)}
                role="button"
                aria-disabled={isAnswered}
                tabIndex={isAnswered ? -1 : 0}
                onKeyDown={(e) => {
                  if (!isAnswered && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleQuestionClick(questionId);
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && modalVisible) {
        setModalVisible(false);
        alert("Leaving the tab hides the question.");
      }
    };

    const disableKeys = (e) => {
      if (!modalVisible) return;
      if (e.ctrlKey && ["c", "v", "u", "s", "C", "V", "U", "S"].includes(e.key)) {
        e.preventDefault();
        alert("This action is disabled while the question is visible.");
      }
    };

    const contextMenuHandler = (e) => {
      if (modalVisible) e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", disableKeys);
    document.addEventListener("contextmenu", contextMenuHandler);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", disableKeys);
      document.removeEventListener("contextmenu", contextMenuHandler);
    };
  }, [modalVisible]);

  if (loading && !modalVisible) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          color: "white",
          fontSize: "24px"
        }}
      >
        Loading...
      </div>
    );
  }
useEffect(() => {
    fetchTeamPoints();
  }, []);

  return (
    <>
      <div className="score-badge">Score: {score}</div>
      <div className="game-board" id="gameBoard">
        {renderGameBoard()}
      </div>
      {modalVisible && currentQuestion && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="questionValue" aria-describedby="questionText">
          <div className="modal-content">
            <div className="question-value" id="questionValue">
              {currentQuestion.displayValue || currentQuestion.value}
            </div>
            <div id="questionText" className={feedback === "correct" ? "correct" : feedback === "incorrect" ? "incorrect" : ""}>
              {feedback === "correct"
                ? "Correct!"
                : feedback === "incorrect"
                  ? `Sorry — correct answer: Unknown`
                  : currentQuestion.question}
            </div>
            {!feedback && (
              <>
                <div className="options-container">
                  {currentQuestion.options.map((option, index) => (
                    <label key={index} className="option-item">
                      <input
                        type="radio"
                        name="answerOption"
                        value={option}
                        checked={selectedOption === option}
                        onChange={() => handleOptionSelect(option)}
                        disabled={submitted || loading}
                        style={{ marginRight: "0.75rem" }}
                      />
                      <span className="option-label">{option}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <button onClick={handleAnswerSubmit} className="submit-btn" disabled={!selectedOption || submitted || loading}>
                    {loading ? "Submitting..." : "Submit"}
                  </button>
                  <button onClick={handleSkip} className="skip-btn" disabled={loading}>
                    Skip
                  </button>
                </div>
              </>
            )}
            {feedback && (
              <button className="submit-btn" onClick={handleContinue} disabled={loading}>
                Continue
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
