import React, { useState } from 'react';
import Jeopardy from './components/Jeopardy';
import Timer from './components/Timer';

function App() {
  const [showTimer, setShowTimer] = useState(true);

  const handleTimerEnd = () => {
    setShowTimer(false);
  };

  return (
    <>
      {showTimer ? <Timer onTimerEnd={handleTimerEnd} /> : <Jeopardy />}
    </>
  );
}

export default App;
