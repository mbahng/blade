import React from 'react';
import { Board } from './components/Board/Board';
import { GameProvider } from './contexts/GameContext';

const App = () => {
  return (
    <GameProvider>
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Board />
      </div>
    </GameProvider>
  );
};

export default App
