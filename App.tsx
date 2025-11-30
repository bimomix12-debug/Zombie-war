import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameWorld } from './components/GameWorld';
import { HUD } from './components/HUD';
import { Menu } from './components/Menu';
import { MobileControls } from './components/MobileControls';
import { GameState, DifficultyConfig, InputMethod, MobileInputState } from './types';
import { INITIAL_CONFIG, calculateDifficulty } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [zombiesRemaining, setZombiesRemaining] = useState(0);
  const [maxZombies, setMaxZombies] = useState(0);
  const [lives, setLives] = useState(3);
  const [inputMethod, setInputMethod] = useState<InputMethod | null>(null);
  const [isBossPhase, setIsBossPhase] = useState(false);

  // Shared ref for mobile inputs
  const mobileInputRef = useRef<MobileInputState>({
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    isShooting: false,
    isJumping: false,
    toggleFlashlight: false
  });

  const [currentConfig, setCurrentConfig] = useState<DifficultyConfig>(INITIAL_CONFIG);

  const startGame = (method: InputMethod) => {
    setInputMethod(method);
    setLevel(1);
    setScore(0);
    setLives(3);
    startLevel(1);
  };

  const startLevel = (lvl: number) => {
    const config = calculateDifficulty(lvl);
    setCurrentConfig(config);
    setTimeLeft(config.timeLimit);
    setZombiesRemaining(config.zombieCount);
    setMaxZombies(config.zombieCount);
    setIsBossPhase(false);
    setGameState('PLAYING');
  };

  const nextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    startLevel(nextLvl);
  };

  const togglePause = () => {
    if (gameState === 'PLAYING') setGameState('PAUSED');
    else if (gameState === 'PAUSED') setGameState('PLAYING');
  };

  const quitToMenu = () => {
    setGameState('MENU');
    setInputMethod(null);
  };

  const handleZombieDeath = useCallback(() => {
    setScore((prev) => prev + 100);
    setZombiesRemaining((prev) => {
      const newVal = prev - 1;
      
      if (newVal <= 0) {
        // If we were in normal phase, switch to BOSS phase
        if (!isBossPhase) {
          setIsBossPhase(true);
          // Set to 1 for the Boss
          setZombiesRemaining(1);
          // Add some bonus time for the boss fight
          setTimeLeft(prevTime => prevTime + 60);
          return 1;
        } else {
          // Boss died
          setGameState('LEVEL_COMPLETE');
          return 0;
        }
      }
      return newVal;
    });
  }, [isBossPhase]); // Depend on isBossPhase

  const handlePlayerHit = useCallback(() => {
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameState('GAME_OVER');
        return 0;
      }
      return newLives;
    });
  }, []);

  // Timer Logic
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('GAME_OVER');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  return (
    <div className="relative w-full h-full bg-black select-none touch-none">
      {/* 3D Scene Layer */}
      <GameWorld 
        gameState={gameState} 
        zombieCount={isBossPhase ? 1 : maxZombies} 
        lives={lives}
        isBossPhase={isBossPhase}
        level={level}
        inputMethod={inputMethod}
        mobileInputRef={mobileInputRef}
        onZombieDeath={handleZombieDeath}
        onPlayerHit={handlePlayerHit}
        onPause={togglePause}
      />

      {/* UI Overlay Layer */}
      {gameState === 'PLAYING' && (
        <>
          <HUD 
            level={level} 
            timeLeft={timeLeft} 
            score={score} 
            zombiesRemaining={zombiesRemaining}
            lives={lives}
            onPause={togglePause}
          />
          {inputMethod === 'PC' && <div className="crosshair" />}
          {inputMethod === 'TOUCH' && (
             <>
               <MobileControls inputRef={mobileInputRef} />
               <div className="crosshair" />
             </>
          )}
          {inputMethod === 'GAMEPAD' && <div className="crosshair" />}
          
          {isBossPhase && (
             <div className="absolute top-24 left-1/2 transform -translate-x-1/2 text-red-600 font-black text-3xl animate-pulse shadow-black drop-shadow-lg z-10">
               ⚠️ ZOMBIE BOSS ⚠️
             </div>
          )}
        </>
      )}

      {/* Menus */}
      {(gameState === 'MENU' || gameState === 'GAME_OVER' || gameState === 'LEVEL_COMPLETE' || gameState === 'PAUSED') && (
        <Menu 
          gameState={gameState} 
          startGame={startGame} 
          nextLevel={nextLevel}
          score={score}
          level={level}
          onResume={togglePause}
          onQuit={quitToMenu}
          inputMethod={inputMethod}
        />
      )}
    </div>
  );
};

export default App;
