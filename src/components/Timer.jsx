import React, { useState, useEffect } from 'react';

export default function Timer({ onTimerEnd }) {
  const [totalSeconds, setTotalSeconds] = useState(3);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (totalSeconds === 0) {
      setMessage("Time's up! Starting the game...");
      const timer = setTimeout(() => {
        onTimerEnd?.();
      }, 2000);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setTotalSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds, onTimerEnd]);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div style={{
      backgroundColor: '#050520',
      color: '#00ffff',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      margin: 0
    }}>
      <div style={{
        fontSize: 72,
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,255,255,0.7)',
        userSelect: 'none'
      }}>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div style={{
        fontSize: 24,
        marginTop: 20,
        color: '#ff4444'
      }}>
        {message}
      </div>
    </div>
  );
}
