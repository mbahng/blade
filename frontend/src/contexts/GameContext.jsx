// contexts/GameContext.jsx
import React, { createContext, useState } from 'react';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [properties, setProperties] = useState({});

  return (
    <GameContext.Provider value={{
      currentPlayer,
      setCurrentPlayer,
      players,
      setPlayers,
      properties,
      setProperties
    }}>
      {children}
    </GameContext.Provider>
  );
};
