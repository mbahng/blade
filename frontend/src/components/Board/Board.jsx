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
    this.game = game; 
    this.owner = game.bank; 
    this.houses = 0; 
    this.house_price = 60; 
    this.base_rent = rent;
    this.house_rent = 80; 
    this.rent = rent; 
  }

  addHouse() {
    this.houses += 1; 
    this.rent += this.house_rent;  
  }

  removeHouse() {
    this.houses -= 1; 
    this.rent -= this.house_rent;  
  }

  getRent() {
    return this.rent + this.houses * 60; 
  }

  district() {
    return this.game.assets.filter(x => x.color === this.color);
  }

  ownsDistrict(player) {
    // Get all properties in this district/color
    const districtProperties = this.district();
    // Check if the player owns all properties in the district
    return districtProperties.every(property => property.owner.name === player.name);
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
    // const die1 = Math.floor(Math.random() * 6) + 1;
    // const die2 = Math.floor(Math.random() * 6) + 1;
    const die1 = 0;
    const die2 = 1; 
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
    property.owner = this; 
  }

  removeAsset(property) {
    /** 
     * @param {SquareSpace} property 
     */
    this.assets = this.assets.filter(x => x != property);
    property.owner = this.game.bank; 
  }

  buyHouse(property) {
    if (!this.assets.includes(property)) {
      console.log("Not your property.");
      return false; 
    }
    const bank = property.game.bank; 
    const blockchain = property.game.blockchain; 
    let tx = this.wallet.send(bank.wallet.master_keypair.public, BigInt(property.house_price));
    blockchain.add_transaction(tx); 
    property.addHouse();

    return true; 
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

function PropertyDetails({ square, onBuy, onSell, onBuyHouse, onSellHouse }) {
  if (!square) return (
    <div className="property-details">
      <p>Click on a property to see details</p>
    </div>
  );

  const renderButtons = () => {
    let p = square.game.currentTurn();
    const ownsDistrict = square.ownsDistrict(p);
    const ownsProperty = square.owner.name === p.name;
    const hasHouses = square.houses > 0;
    
    // If player doesn't own the property and the bank doesn't own it
    if (!ownsProperty && !square.owner.isbank) {
      return (
        <>
          <div className="button-row">
            <button className="buy-button disabled" disabled>Buy Land</button>
            <button className="sell-button disabled" disabled>Sell Land</button>
          </div>
          <div className="button-row">
            <button className="buy-house-button disabled" disabled>Buy House</button>
            <button className="sell-house-button disabled" disabled>Sell House</button>
          </div>
        </>
      );
    }

    // If bank owns the property, only allow buying if player is on the square
    if (square.owner.isbank) {
      return (
        <>
          <div className="button-row">
            <button 
              className={`buy-button ${p.onSquare().name !== square.name ? 'disabled' : ''}`}
              onClick={() => onBuy(p, square)}
              disabled={p.onSquare().name !== square.name}
            >
              Buy Land
            </button>
            <button 
              className="sell-button disabled"
              disabled
            >
              Sell Land
            </button>
          </div>
          <div className="button-row">
            <button 
              className="buy-house-button disabled" 
              disabled
            >
              Buy House
            </button>
            <button 
              className="sell-house-button disabled"
              disabled
            >
              Sell House
            </button>
          </div>
        </>
      );
    }

    // If player owns the property
    if (ownsProperty) {
      return (
        <>
          <div className="button-row">
            <button 
              className="buy-button disabled" 
              disabled
            >
              Buy Land
            </button>
            <button 
              className={`sell-button ${hasHouses ? 'disabled' : ''}`}
              onClick={() => onSell(p, square)}
              disabled={hasHouses}
              title={hasHouses ? "Must sell all houses before selling property" : ""}
            >
              Sell Land
            </button>
          </div>
          <div className="button-row">
            <button 
              className={`buy-house-button ${!ownsDistrict ? 'disabled' : ''}`} 
              onClick={() => onBuyHouse(p, square)}
              disabled={!ownsDistrict}
              title={!ownsDistrict ? "Must own all properties of this color to build houses" : ""}
            >
              Buy House
            </button>
            <button 
              className={`sell-house-button ${square.houses < 1 ? 'disabled' : ''}`}
              onClick={() => onSellHouse(p, square)}
              disabled={square.houses < 1}
            >
              Sell House
            </button>
          </div>
        </>
      );
    }

    // Default case (shouldn't reach here, but good to have)
    return (
      <>
        <div className="button-row">
          <button className="buy-button disabled" disabled>Buy Land</button>
          <button className="sell-button disabled" disabled>Sell Land</button>
        </div>
        <div className="button-row">
          <button className="buy-house-button disabled" disabled>Buy House</button>
          <button className="sell-house-button disabled" disabled>Sell House</button>
        </div>
      </>
    );
  };

  return (
    <div className="property-details">
      <h2 className="property-title">{square.name} (${square.price})</h2>
      <div className="property-info">
        <p>Color: <span className={`color-box ${square.color}`}></span></p>
        {square.price > 0 && (
          <>
            <p>0 Houses - ${square.base_rent}</p>
            <p>1 House  - ${square.base_rent + square.house_rent}</p>
            <p>2 House  - ${square.base_rent + 2 * square.house_rent}</p>
            <p>3 House  - ${square.base_rent + 3 * square.house_rent}</p>
            <p>4 House  - ${square.base_rent + 4 * square.house_rent}</p>
            <p>Cost Per House: $50</p>
          </> 
        )}
        {renderButtons()}
      </div>
    </div>
  );
}

function Square({ square, game, onSelect }) {
  const playersHere = game.players.filter(player => player.location === square.index);
  const getOwnerTint = () => {
    for (let i = 0; i < game.players.length; i++) {
      if (game.players[i].assets.includes(square)) {
        return `player-color${i+1}`;
      }
    }
    return '';
  };
  
  const renderHouses = () => {
    if (square.houses > 0) {
      return `H${square.houses}`;
    }
    return '';
  };
  
  return (
    <div className={`square ${square.color}`} onClick={() => onSelect(square)}>
      <div className={`square-text`}>
        {square.name}
      </div>
      <div className="houses-container">
        <div className='house-token'>
          {renderHouses()}
        </div>
      </div>
      
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
      <div className={`square-text ${getOwnerTint()}`}></div>
    </div>
  );
}

function buy(buyer, property) {
  /** 
   * @param {Player} buyer 
   * @param {SquareSpace} property 
   */ 
  if (buyer.onSquare().name !== property.name) {
    console.log("You are not on this property."); 
    return false;
  }
  if (property.owner.name === buyer.name) {
    console.log("You already own this property.")
    return false;
  }
  if (!property.owner.isbank) {
    console.log(`${property.owner.name} already owns this property.`)
    return false;
  }
  const bank = property.game.bank; 
  const blockchain = property.game.blockchain; 
  let tx = buyer.wallet.send(bank.wallet.master_keypair.public, BigInt(property.price));
  blockchain.add_transaction(tx); 
  buyer.addAsset(property); 

  console.log(`${buyer.name} bought ${property.name}`);
  return true; 
}

function sell(seller, property) {
  /** 
   * @param {Player} seller 
   * @param {SquareSpace} property 
   */ 
  if (!seller.assets.includes(property)) {
    console.log("You do not own this property."); 
    return false;
  }
  const bank = property.game.bank; 
  const blockchain = property.game.blockchain; 
  let tx = bank.wallet.send(seller.wallet.master_keypair.public, BigInt(property.price));
  blockchain.add_transaction(tx);

  // Remove property from seller's assets
  seller.removeAsset(property); 

  // Reset houses if any
  property.houses = 0;
  property.rent = property.price * 0.1; // Reset rent to original value

  console.log(`${seller.name} sold ${property.name}`);
  return true; 
}

function buyhouse(buyer, property) {
  /** 
   * @param {Player} buyer 
   * @param {SquareSpace} property 
   */ 
  if (!(property.owner.name === buyer.name)) {
    console.log("You do not own this property.")
    return false;
  }

  // Add district ownership check
  if (!property.ownsDistrict(buyer)) {
    console.log("You must own all properties of this color to build houses.")
    return false;
  }

  const bank = property.game.bank; 
  const blockchain = property.game.blockchain; 
  let tx = buyer.wallet.send(bank.wallet.master_keypair.public, BigInt(property.house_price));
  blockchain.add_transaction(tx); 
  property.addHouse(); 

  console.log(`${buyer.name} bought 1 house on ${property.name}`);
  return true; 
}

function sellhouse(seller, property) {
  /** 
   * @param {Player} seller 
   * @param {SquareSpace} property 
   */ 
  if (!(property.owner.name === seller.name)) {
    console.log("You do not own this property.")
    return false;
  }

  if (property.houses === 0) {
    console.log("You do not have any houses to sell.")
    return false;
  }

  const bank = property.game.bank; 
  const blockchain = property.game.blockchain; 
  let tx = bank.wallet.send(seller.wallet.master_keypair.public, BigInt(property.house_price));
  blockchain.add_transaction(tx);

  property.removeHouse(); 

  console.log(`${seller.name} sold 1 house on ${property.name}`);
  return true; 
}

function pay(payer, receiver, value) {
  /** 
   * @param {Player} seller 
   * @param {SquareSpace} property 
   */ 

  const blockchain = payer.game.blockchain; 
  let tx = payer.wallet.send(receiver.wallet.master_keypair.public, BigInt(value));
  blockchain.add_transaction(tx);
  console.log(`${payer.name} paid ${value} to ${receiver.name}`);
  return true; 
}

function trade(p1, p2, p1assets, p2assets, p1cash, p2cash) { 
  /** 
   * @param {Player} p1 
   * @param {Player} p2 
   * @param {SquareSpace[]} p1assets - Properties p1 is giving to p2
   * @param {SquareSpace[]} p2assets - Properties p2 is giving to p1
   * @param {BigInt} p1cash - Cash p1 is giving to p2
   * @param {BigInt} p2cash - Cash p2 is giving to p1
   */

  // Verify ownership of properties
  for (let property of p1assets) {
    if (property.owner.name !== p1.name) {
      console.log(`${p1.name} doesn't own ${property.name}`);
      return false;
    }
    if (property.houses > 0) {
      console.log(`Must sell all houses on ${property.name} before trading`);
      return false;
    }
  }

  for (let property of p2assets) {
    if (property.owner.name !== p2.name) {
      console.log(`${p2.name} doesn't own ${property.name}`);
      return false;
    }
    if (property.houses > 0) {
      console.log(`Must sell all houses on ${property.name} before trading`);
      return false;
    }
  }

  // Verify players have enough cash
  if (p1.balance() < p1cash) {
    console.log(`${p1.name} doesn't have enough cash`);
    return false;
  }

  if (p2.balance() < p2cash) {
    console.log(`${p2.name} doesn't have enough cash`);
    return false;
  }

  // Execute cash transfers
  if (p1cash > 0n) {
    let tx1 = p1.wallet.send(p2.wallet.master_keypair.public, p1cash);
    p1.game.blockchain.add_transaction(tx1);
  }

  if (p2cash > 0n) {
    let tx2 = p2.wallet.send(p1.wallet.master_keypair.public, p2cash);
    p2.game.blockchain.add_transaction(tx2);
  }

  // Transfer properties from p1 to p2
  for (let property of p1assets) {
    p1.removeAsset(property);
    p2.addAsset(property);
  }

  // Transfer properties from p2 to p1
  for (let property of p2assets) {
    p2.removeAsset(property);
    p1.addAsset(property);
  }

  console.log(`Trade completed between ${p1.name} and ${p2.name}`);
  return true;
}

function TradeModal({ isOpen, onClose, game, tradingPlayers, onTrade }) {
  const [p1Assets, setP1Assets] = useState([]);
  const [p2Assets, setP2Assets] = useState([]);
  const [p1Cash, setP1Cash] = useState(0);
  const [p2Cash, setP2Cash] = useState(0);

  const { p1, p2 } = tradingPlayers;

  const handleTrade = () => {
    const success = trade(
      p1, 
      p2, 
      p1Assets, 
      p2Assets, 
      BigInt(p1Cash), 
      BigInt(p2Cash)
    );
    if (success) {
      onClose();
      onTrade(p1Assets, p2Assets, p1Cash, p2Cash);  // Pass the traded items
    }
  };

  if (!isOpen) return null;

  return (
    <div className="trade-modal">
      <div className="trade-modal-content">
        <h2>Trade Between Player {p1.name} and Player {p2.name}</h2>
        
        <div className="trade-section">
          <div className="player-section">
            <h3>Player {p1.name}'s Offers:</h3>
            <div className="property-selection">
              {p1.assets.map(property => (
                <div key={property.name} className="property-option">
                  <input
                    type="checkbox"
                    checked={p1Assets.includes(property)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setP1Assets([...p1Assets, property]);
                      } else {
                        setP1Assets(p1Assets.filter(p => p !== property));
                      }
                    }}
                    disabled={property.houses > 0}
                    title={property.houses > 0 ? "Must sell houses before trading" : ""}
                  />
                  <label>
                    {property.name}
                    {property.houses > 0 && ` (${property.houses} houses)`}
                  </label>
                </div>
              ))}
            </div>
            <div className="cash-input">
              <label>Cash Offer: </label>
              <input
                type="number"
                value={p1Cash}
                onChange={(e) => setP1Cash(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
              />
              <div className="balance-display">Balance: {p1.balance().toString()}</div>
            </div>
          </div>

          <div className="player-section">
            <h3>Player {p2.name}'s Offers:</h3>
            <div className="property-selection">
              {p2.assets.map(property => (
                <div key={property.name} className="property-option">
                  <input
                    type="checkbox"
                    checked={p2Assets.includes(property)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setP2Assets([...p2Assets, property]);
                      } else {
                        setP2Assets(p2Assets.filter(p => p !== property));
                      }
                    }}
                    disabled={property.houses > 0}
                    title={property.houses > 0 ? "Must sell houses before trading" : ""}
                  />
                  <label>
                    {property.name}
                    {property.houses > 0 && ` (${property.houses} houses)`}
                  </label>
                </div>
              ))}
            </div>
            <div className="cash-input">
              <label>Cash Offer: </label>
              <input
                type="number"
                value={p2Cash}
                onChange={(e) => setP2Cash(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
              />
              <div className="balance-display">Balance: {p2.balance().toString()}</div>
            </div>
          </div>
        </div>

        <div className="trade-actions">
          <button 
            onClick={handleTrade} 
            className="confirm-trade"
            disabled={
              (p1Cash > p1.balance()) || 
              (p2Cash > p2.balance()) ||
              (p1Assets.length === 0 && p2Assets.length === 0 && p1Cash === 0 && p2Cash === 0)
            }
          >
            Confirm Trade
          </button>
          <button onClick={onClose} className="cancel-trade">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function Board() {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [diceState, setDiceState] = useState([1, 1]);
  const [hasRolled, setHasRolled] = useState(false); 
  const minerRef = useRef(null);
  const [balanceUpdate, setBalanceUpdate] = useState(0);

  const [miningLogs, setMiningLogs] = useState([]);
  const [gameLogs, setGameLogs] = useState([]);

  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradingPlayers, setTradingPlayers] = useState(null);

  const handleTradeClick = (p1, p2) => {
    setTradingPlayers({ p1, p2 });
    setIsTradeModalOpen(true);
  };


  const addMiningLog = (log) => {
    setMiningLogs(prevLogs => [...prevLogs.slice(-20), log]); 
  };
  
  const addGameLog = (log) => {
    setGameLogs(prevLogs => [...prevLogs.slice(-20), log]); 
  };


  // Initialize game and blockchain
  const { game, blockchain } = useMemo(() => {
    console.log('Initializing game and blockchain');
    
    const difficulty = new Hex("00F0000000000003A30C00000000000000000000000000000000000000000000");  
    const reward = 0n;
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
    ].map((square, index) => {
      square.index = index;
      return square;
    }); 
    
    game.assets = assets;
    game.length = assets.length;

    const p1 = new Player(1, game);
    game.addPlayer(p1);
    const p2 = new Player(2, game);
    game.addPlayer(p2);

    blockchain.mint(10000n, bank.wallet.master_keypair);
    blockchain.mint(2000n, p1.wallet.master_keypair);
    blockchain.mint(2000n, p2.wallet.master_keypair);
    // const p3 = new Player(3, game);
    // game.addPlayer(p3);
    // const p4 = new Player(4, game);
    // game.addPlayer(p4);

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

  const handlePay = (payer, receiver, value) => {
    if (pay(payer, receiver, value)) {
      addGameLog(`$Player ${payer.name} paid $${value} to Player ${receiver.name}`);
    }
  };

  const rollDice = () => {
    const currentPlayer = game.currentTurn();
    const oldLocation = currentPlayer.location;
    const oldSquare = game.assets[oldLocation];
    const newDice = currentPlayer.rollDice();
    const newLocation = currentPlayer.location;
    const newSquare = game.assets[newLocation];
    
    const moveAmount = (newDice[0] + newDice[1]);
    addGameLog(`Player ${currentPlayer.name} moved +${moveAmount} spaces from ${oldSquare.name} to ${newSquare.name}`);
    
    setDiceState(newDice);
    setHasRolled(true); 

    if (!newSquare.owner.isbank && !(newSquare.owner.name === currentPlayer.name)) {
      handlePay(currentPlayer, newSquare.owner, newSquare.rent);
    }
  };

  const handleBuy = (buyer, property) => {
    if (buy(buyer, property)) {
      addGameLog(`Player ${buyer.name} bought ${property.name} for $${property.price}`);
    }
  };

  const handleSell = (seller, property) => {
    if (sell(seller, property)) {
      addGameLog(`Player ${seller.name} sold ${property.name} for $${property.price}`);
    }
  };

  const handleBuyHouse = (buyer, property) => {
    if (buyhouse(buyer, property)) {
      addGameLog(`Player ${buyer.name} bought 1 house on ${property.name} for $${property.house_price}`);
    }
  };

  const handleSellHouse = (seller, property) => {
    if (sellhouse(seller, property)) {
      addGameLog(`Player ${seller.name} sold 1 house on ${property.name} for $${property.house_price}`);
    }
  };

  const endTurn = () => {
    const currentPlayer = game.currentTurn();
    game.nextTurn();
    const nextPlayer = game.currentTurn();
    addGameLog(`Turn ended: Player ${currentPlayer.name} → Player ${nextPlayer.name}`);
    setHasRolled(false);
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
            {gameLogs.map((log, index) => (
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
        <PropertyDetails 
          square={selectedSquare} 
          onBuy={handleBuy} 
          onSell={handleSell}
          onBuyHouse={handleBuyHouse} 
          onSellHouse={handleSellHouse}
        /> 
        <div className="bottom-actions">
          <div className="bank-balance">
            Bank Balance: {game.bank.balance().toString()}
          </div>
          <div className="trade-buttons">
            {game.players.map((player, idx) => (
              player !== game.currentTurn() && (
                <button 
                  key={idx}
                  className="trade-button"
                  onClick={() => {
                    setTradingPlayers({
                      p1: game.currentTurn(),
                      p2: player
                    });
                    setIsTradeModalOpen(true);
                  }}
                >
                  Trade w/ P{player.name}
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {isTradeModalOpen && tradingPlayers && (
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={() => {
            setIsTradeModalOpen(false);
            setTradingPlayers(null);
          }}
          game={game}
          tradingPlayers={tradingPlayers}
          onTrade={(p1Assets, p2Assets, p1Cash, p2Cash) => {  // Add these parameters
            // Log the main trade
            addGameLog('-----------------------------------'); 
            addGameLog(`TRADE completed between Player ${tradingPlayers.p1.name} and Player ${tradingPlayers.p2.name}`); 
            
            // Log Player 1's trades
            if (p1Assets.length > 0 || p1Cash > 0) {
              const p1Gave = [];
              if (p1Assets.length > 0) {
                p1Gave.push(`properties: ${p1Assets.map(p => p.name).join(', ')}`);
              }
              if (p1Cash > 0) {
                p1Gave.push(`$${p1Cash}`);
              }
              addGameLog(`Player ${tradingPlayers.p1.name} gave ${p1Gave.join(' and ')}`);
            }

            // Log Player 2's trades
            if (p2Assets.length > 0 || p2Cash > 0) {
              const p2Gave = [];
              if (p2Assets.length > 0) {
                p2Gave.push(`properties: ${p2Assets.map(p => p.name).join(', ')}`);
              }
              if (p2Cash > 0) {
                p2Gave.push(`$${p2Cash}`);
              }
              addGameLog(`Player ${tradingPlayers.p2.name} gave ${p2Gave.join(' and ')}`);
            }
            addGameLog('-----------------------------------'); 

            setIsTradeModalOpen(false);
            setTradingPlayers(null);
          }}
        />
      )}
    </div>
  );
}
