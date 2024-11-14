import React, { useMemo, useState, useRef, useEffect } from 'react';
import './Board.css';
import { BlockChain, Wallet, Miner, Hex } from "../../../../backend/blade.js";

class SquareSpace {
  constructor(name, color, x, y, price, rent, game) {
    this.name = name; 
    this.color = color; 
    this.x = x; 
    this.y = y; 
    this.price = price; 
    this.rent = rent; 
    this.game = game; 
    this.owner = game.bank;
  }
}

class Game {
  constructor(blockchain) {
    this.players = []; 
    this.current = 0; // current turn, indexed 
    this.assets = null; // array of SquareSpaces 
    this.blockchain = blockchain; 
  }

  addBank(bank) {
    this.bank = bank; 
  }

  addPlayer(player) {
    player.game = this; 
    this.players.push(player);
  }

  currentTurn() {
    return this.players[this.current];
  }

  nextTurn() {
    this.current = (this.current + 1) % this.players.length;
  }

  getDiceComponent() {
    let res = (<DiceComponent 
      game={this} 
    />);

    return res; 
  }
}

function DiceComponent({ game }) {
  const [dice, setDice] = useState([1, 1]);

  const rollDice = () => {
    const newDice = game.currentTurn().rollDice();
    setDice(newDice);
  };

  return (
    <div className="dice-container">
      <div className="dice-result">
        Dice Roll: {dice[0]} and {dice[1]} (Total: {dice[0] + dice[1]})
      </div>
      <button onClick={rollDice} className="roll-button">
        Roll Dice
      </button>
    </div>
  );
}

class Player {
  constructor(name, game, isbank = false) {
    /** 
     * @param {string} name 
     * @param {Game} game
     */
    this.name = name; 
    this.location = 0; // index of location on map
    this.assets = []; 
    this.wallet = Wallet.random(); 
    this.game = game; 
    this.isbank = isbank;
  } 

  rollDice() {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    this.location = (this.location + die1 + die2) % this.game.length; 
    return [die1, die2]; 
  }

  balance() {
    return this.wallet.balance(); 
  }
  
  onSquare() {
    return this.game.assets[this.location];
  }

  addAsset(property) {
    /** 
     * @param {SquareSpace} property 
     */
    this.assets.push(property);
  }
}

function PropertyDetails({ square }) {
  if (!square) return (
    <div className="property-details">
      <p>Click on a property to see details</p>
    </div>
  );

  return (
    <div className="property-details">
      <h2 className="property-title">{square.name} (${square.price})</h2>
      <div className="property-info">
        <p>Color: <span className={`color-box ${square.color}`}></span></p>
        {square.price > 0 && (
          <>
            <p>1 House  - ${square.rent}</p>
            <p>2 Houses - ${2 * square.rent}</p>
            <p>3 Houses - ${3 * square.rent}</p>
            <p>4 Houses - ${4 * square.rent}</p>
            <p>1 Hotel  - ${6 * square.rent}</p>
            <p>Cost Per House: $50</p>
          </> 
        )}
        <button onClick={() => buy(square.game.currentTurn(), square, BigInt(square.price))}>Buy</button>
        <button onClick={() => sell(square.game.currentTurn(), square)}>Sell</button>
      </div>
    </div>
  );
}

function Square({ square, game, onSelect }) {
  const playersHere = game.players.filter(player => player.location === square.index);
  
  return (
    <div className={`square ${square.color}`} onClick={() => onSelect(square)}>
      <span className="square-text">
        {square.name}
      </span>
      
      <div className="players-container">
        {playersHere.map((player, idx) => (
          <div 
            key={player.name}
            className={`player-token player${idx + 1}`}
          >
            {player.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function buy(buyer, property, value) {
  /** 
   * @param {Player} buyer 
   * @param {SquareSpace} property 
   * @param {BigInt} value
   */ 
  if (buyer.onSquare().name !== property.name) {
    console.log("You are not on this property."); 
    return;
  }
  if (property.owner.name === buyer.name) {
    console.log("You already own this property.")
    return;
  }
  if (!property.owner.isbank) {
    console.log(`${property.owner.name} already owns this property.`)
    return;
  }
  const bank = property.game.bank; 
  const blockchain = property.game.blockchain; 
  let tx = buyer.wallet.send(bank.wallet.master_keypair.public, value)
  blockchain.add_transaction(tx); 
  buyer.addAsset(property); 

  console.log(`${buyer.name} bought ${property.name}`);
}

function sell(seller, property) {
  /** 
   * @param {Player} seller 
   * @param {SquareSpace} property 
   */ 
  const bank = property.game.bank; 
  const blockchain = property.game.blockchain; 
  let tx = bank.wallet.send(seller.wallet.master_keypair.public, value)
  blockchain.add_transaction(tx);
  console.log(`${seller.name} sold ${property.name}`);
}

function trade(p1, p2, p1assets, p2assets) {
  return;
}


export function Board() {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [diceState, setDiceState] = useState([1, 1]);
  const [hasRolled, setHasRolled] = useState(false); 
  const minerRef = useRef(null);
  const [balanceUpdate, setBalanceUpdate] = useState(0);
  const [miningLogs, setMiningLogs] = useState([]);

  const addMiningLog = (log) => {
    setMiningLogs(prevLogs => [...prevLogs.slice(-20), log]); // Keep last 5 logs
  };

  // Initialize game and blockchain
  const { game, blockchain } = useMemo(() => {
    console.log('Initializing game and blockchain');
    
    const difficulty = new Hex("0000F00000000003A30C00000000000000000000000000000000000000000000");  
    const reward = 10n;
    const blockchain = new BlockChain(difficulty, reward);
    const game = new Game(blockchain);

    const bank = new Player("bank", game, true);
    game.addBank(bank);
    
    let assets = [
      // Top row (left to right)
      new SquareSpace("Start", "mint", 40, 40, 0, 0, game),
      new SquareSpace("Bell Tower", "red", 120, 40, 50, 20, game),
      new SquareSpace("Marketplace", "mint", 200, 40, 10, 0, game),
      new SquareSpace("Trinity", "red", 280, 40, 60, 22, game),
      new SquareSpace("GA", "red", 360, 40, 240, 24, game),
      new SquareSpace("Wilson Gym", "indigo", 440, 40, 200, 20, game),
      new SquareSpace("Blackwell", "yellow", 520, 40, 260, 26, game),
      new SquareSpace("Giles", "yellow", 600, 40, 260, 26, game),
      new SquareSpace("Shooters", "mint", 680, 40, 10, 0, game),
      new SquareSpace("Alspaugh", "yellow", 760, 40, 280, 28, game),
      new SquareSpace("Lilly Library", "mint", 840, 40, 10, 0, game),

      // Right column (top to bottom)
      new SquareSpace("Keohane", "green", 840, 120, 300, 30, game),
      new SquareSpace("Kilgo", "green", 840, 200, 300, 30, game),
      new SquareSpace("WU", "mint", 840, 280, 10, 0, game),
      new SquareSpace("Wannamaker", "green", 840, 360, 320, 32, game),
      new SquareSpace("Gross Hall", "indigo", 840, 440, 200, 20, game),
      new SquareSpace("Perkins", "mint", 840, 520, 10, 0, game),
      new SquareSpace("Craven", "blue", 840, 600, 350, 35, game),
      new SquareSpace("LSRC", "mint", 840, 680, 10, 0, game),
      new SquareSpace("Crowell", "blue", 840, 760, 400, 40, game),

      // Bottom row (right to left)
      new SquareSpace("Gardens", "mint", 840, 840, 10, 0, game),
      new SquareSpace("Hollows", "pink", 760, 840, 400, 40, game),
      new SquareSpace("Wilkinson", "mint", 680, 840, 10, 0, game),
      new SquareSpace("Edens", "pink", 600, 840, 350, 35, game),
      new SquareSpace("Krafthouse", "mint", 520, 840, 10, 0, game),
      new SquareSpace("Wilson Gym", "indigo", 440, 840, 200, 20, game),
      new SquareSpace("Crowell", "teal", 360, 840, 300, 30, game),
      new SquareSpace("Chance", "mint", 280, 840, 10, 0, game),
      new SquareSpace("Kilgo", "teal", 200, 840, 300, 30, game),
      new SquareSpace("Craven", "teal", 120, 840, 300, 30, game),
      new SquareSpace("UNC", "mint", 40, 840, 10, 0, game),

      // Left column (bottom to top)
      new SquareSpace("Trinity Apts", "purple", 40, 120, 350, 35, game),
      new SquareSpace("Smarthome", "mint", 40, 200, 10, 0, game),
      new SquareSpace("Berkshire", "purple", 40, 280, 320, 32, game),
      new SquareSpace("Swift", "purple", 40, 360, 320, 32, game),
      new SquareSpace("9th St.", "indigo", 40, 440, 200, 20, game),
      new SquareSpace("Nasher", "orange", 40, 520, 300, 30, game),
      new SquareSpace("Devines", "mint", 40, 600, 10, 0, game),
      new SquareSpace("Cameron", "orange", 40, 680, 280, 28, game),
      new SquareSpace("Chapel", "orange", 40, 760, 260, 26, game)
    ].map((square, index) => ({ ...square, index }));
    
    game.assets = assets;
    game.length = assets.length;

    const p1 = new Player(1, game);
    game.addPlayer(p1);
    const p2 = new Player(2, game);
    game.addPlayer(p2);

    return { game, blockchain };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBalanceUpdate(prev => prev + 1);
    }, 200);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []); 

  // Initialize miner in useEffect
  useEffect(() => {
    console.log('Miner initialization effect running');
    
    let isMounted = true;
    
    const initializeMiner = async () => {
      if (!minerRef.current && isMounted) {
        console.log('Creating new miner instance');
        const m1 = new Miner(game.players[0].wallet.master_keypair.public, blockchain, addMiningLog);
        blockchain.add_miner(m1);
        minerRef.current = m1;
        const m2 = new Miner(game.players[1].wallet.master_keypair.public, blockchain, addMiningLog);
        blockchain.add_miner(m2);
        
        if (isMounted) {
          m1.start();
          m2.start();
        }
      }
    };

    initializeMiner();

    // Cleanup function - may not need this 
    return () => {
      console.log('Cleanup called');
      isMounted = false;
      if (minerRef.current) {
        console.log('Stopping miner');
        // minerRef.current.stop();
        // Don't null out minerRef.current here
      }
    };
  }, []); 

  const rollDice = () => {
    const currentPlayer = game.currentTurn();
    const newDice = currentPlayer.rollDice();
    setDiceState(newDice);
    setHasRolled(true);
  };

  const endTurn = () => {
    game.nextTurn();
    setHasRolled(false);
    // Reset dice display for next player
    setDiceState([1, 1]);
  };

  // Reset hasRolled when turn changes
  useEffect(() => {
    setHasRolled(false);
  }, [game.current]); 

  const DiceComponent = (
    <div className="dice-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="current-turn">
          Player {game.currentTurn().name}'s Turn
        </div>
        <div className="dice-result">
          Roll: {hasRolled ? `${diceState[0]} + ${diceState[1]}` : "? + ?"}
        </div>
        {hasRolled ? (
          <button onClick={endTurn} className="end-turn-button">
            End Turn
          </button>
        ) : (
          <button onClick={rollDice} className="roll-button">
            Roll Dice
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="game-container">
      <div className="sup-info">
        <div className="news">  
          <div className="trade-logs">
            <div className="property-title">Trades</div>
            {miningLogs.map((log, index) => (
              <div key={index} className="mining-log">
                {log}
              </div>
            ))}
          </div>

          <div className="mining-logs">
            <div className="property-title">Mining</div>
            {miningLogs.map((log, index) => (
              <div key={index} className="mining-log">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="board">
        <div className="row">
          {game.assets.slice(0, 11).map(square => (
            <Square 
              key={square.index} 
              square={square} 
              game={game} 
              onSelect={setSelectedSquare}
            />
          ))}
        </div>
        <div className="center">
          <div className="column-left">
            {game.assets.slice(31, 40).reverse().map(square => (
              <Square 
                key={square.index} 
                square={square} 
                game={game} 
                onSelect={setSelectedSquare}
              />
            ))}
          </div>
          <div className="announce">
            {DiceComponent} 
            <div className="game-info">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`player-info`}>
                  <div>
                    Player {i+1}
                  </div>
                  <div>
                    Balance: {game.players[i]?.balance()?.toString() || "N/A"}
                  </div>
                  <div className="player-assets">
                    {game.players[i]?.assets?.map((property, index) => (
                      <div key={index} className="owned-property">
                        {property.name}
                      </div>
                    ))}
                  </div>
                </div> 
              ))}
            </div>
          </div>
          <div className="column-right">
            {game.assets.slice(11, 20).map(square => (
              <Square 
                key={square.index} 
                square={square} 
                game={game} 
                onSelect={setSelectedSquare}
              />
            ))}
          </div>
        </div>
        <div className="row">
          {game.assets.slice(20, 31).reverse().map(square => (
            <Square 
              key={square.index} 
              square={square} 
              game={game} 
              onSelect={setSelectedSquare}
            />
          ))}
        </div>
      </div> 
      <div className="sup-info">
        <PropertyDetails square={selectedSquare} /> 

        <div className="bank-balance">
          Bank Balance: {game.bank.balance().toString()}
        </div>
      </div>
    </div>
  );
}
