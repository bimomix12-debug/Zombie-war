import React, { useState, useEffect, useRef } from 'react';
import { MenuProps, InputMethod } from '../types';

export const Menu: React.FC<MenuProps> = ({ 
  gameState, 
  startGame, 
  nextLevel, 
  score, 
  level,
  onResume,
  onQuit,
  inputMethod
}) => {
  const [showInputSelect, setShowInputSelect] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); 
  
  const requestRef = useRef<number>(0);
  const lastInputTime = useRef<number>(0);

  const handleStartClick = () => {
    // If we already have an input method (Restarting), skip selection
    if (inputMethod) {
      startGame(inputMethod);
    } else {
      setShowInputSelect(true);
      setSelectedIndex(2); 
    }
  };

  const handleInputSelect = (method: InputMethod) => {
    setShowInputSelect(false);
    startGame(method);
  };

  // Gamepad Polling
  useEffect(() => {
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];

      if (gp) {
        const now = Date.now();
        if (now - lastInputTime.current > 200) {
          const up = gp.axes[1] < -0.5 || (gp.buttons[12] && gp.buttons[12].pressed);
          const down = gp.axes[1] > 0.5 || (gp.buttons[13] && gp.buttons[13].pressed);
          const confirm = gp.buttons[0] && gp.buttons[0].pressed; 

          if (showInputSelect) {
            if (up) {
              setSelectedIndex(prev => Math.max(0, prev - 1));
              lastInputTime.current = now;
            } else if (down) {
              setSelectedIndex(prev => Math.min(2, prev + 1));
              lastInputTime.current = now;
            } else if (confirm) {
              const methods: InputMethod[] = ['TOUCH', 'PC', 'GAMEPAD'];
              handleInputSelect(methods[selectedIndex]);
              lastInputTime.current = now + 500; 
            }
          } else if (gameState === 'PAUSED') {
            if (up) {
               setSelectedIndex(prev => Math.max(0, prev - 1));
               lastInputTime.current = now;
            } else if (down) {
               setSelectedIndex(prev => Math.min(1, prev + 1));
               lastInputTime.current = now;
            } else if (confirm) {
               if (selectedIndex === 0 && onResume) onResume();
               if (selectedIndex === 1 && onQuit) onQuit();
               lastInputTime.current = now + 500;
            }
          } else {
             if (confirm) {
                if (gameState === 'MENU') handleStartClick();
                else if (gameState === 'GAME_OVER') handleStartClick(); 
                else if (gameState === 'LEVEL_COMPLETE') nextLevel();
                lastInputTime.current = now + 500;
             }
          }
        }
      }
      requestRef.current = requestAnimationFrame(pollGamepad);
    };

    requestRef.current = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(requestRef.current);
  }, [showInputSelect, gameState, selectedIndex, inputMethod]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showInputSelect && gameState !== 'PAUSED') return;
      
      const maxIndex = gameState === 'PAUSED' ? 1 : 2;
      
      if (e.key === 'ArrowUp') setSelectedIndex(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowDown') setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
      if (e.key === 'Enter') {
         if (showInputSelect) {
            const methods: InputMethod[] = ['TOUCH', 'PC', 'GAMEPAD'];
            handleInputSelect(methods[selectedIndex]);
         } else if (gameState === 'PAUSED') {
            if (selectedIndex === 0 && onResume) onResume();
            if (selectedIndex === 1 && onQuit) onQuit();
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInputSelect, selectedIndex, gameState]);

  const getButtonClass = (index: number) => {
    const base = "w-full py-3 font-bold text-lg rounded-lg flex items-center justify-center gap-2 transition-all ";
    const isSelected = selectedIndex === index;
    const highlight = isSelected ? "ring-4 ring-yellow-400 scale-105 z-10 " : "opacity-80 scale-100 ";
    
    if (gameState === 'PAUSED') {
      return base + highlight + (index === 0 ? "bg-green-600 text-white" : "bg-red-600 text-white");
    }
    
    if (index === 0) return base + highlight + "bg-blue-600 text-white";
    if (index === 1) return base + highlight + "bg-purple-600 text-white";
    if (index === 2) return base + highlight + "bg-yellow-600 text-white";
    return base;
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full bg-slate-900 border-2 border-green-500 p-8 rounded-2xl shadow-[0_0_50px_rgba(74,222,128,0.2)] text-center relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

        {gameState === 'PAUSED' && (
           <div className="animate-fade-in space-y-4">
              <h1 className="text-4xl font-black text-yellow-400 mb-6">موقوف مؤقتاً</h1>
              <button 
                onClick={onResume}
                className={getButtonClass(0)}
              >
                استكمال اللعب
              </button>
              <button 
                onClick={onQuit}
                className={getButtonClass(1)}
              >
                الخروج للقائمة
              </button>
           </div>
        )}

        {gameState === 'MENU' && !showInputSelect && (
          <>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-green-700 mb-2">
              حرب الزومبي
            </h1>
            <h2 className="text-xl text-green-200 mb-8 tracking-widest font-light">ZOMBIE SURVIVAL 3D</h2>
            <div className="space-y-4 mb-8 text-gray-300 bg-slate-800/50 p-4 rounded-lg text-sm text-right">
              <p>🧟‍♂️ <strong>المهمة:</strong> اقتل جميع الزومبي.</p>
              <p>🎮 <strong>التحكم:</strong> اضغط A للبدء.</p>
            </div>
            <button 
              onClick={handleStartClick}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-green-900/50 animate-pulse"
            >
              (A) ابدأ اللعبة
            </button>
          </>
        )}

        {gameState === 'MENU' && showInputSelect && (
          <div className="animate-fade-in">
             <h2 className="text-2xl text-white mb-6 font-bold">اختر نوع التحكم</h2>
             <div className="space-y-4">
                <button onClick={() => handleInputSelect('TOUCH')} className={getButtonClass(0)}>
                  <span>📱</span> جوال
                </button>
                <button onClick={() => handleInputSelect('PC')} className={getButtonClass(1)}>
                  <span>💻</span> كمبيوتر (ZQSD)
                </button>
                <button onClick={() => handleInputSelect('GAMEPAD')} className={getButtonClass(2)}>
                  <span>🎮</span> يد تحكم
                </button>
             </div>
             <button onClick={() => setShowInputSelect(false)} className="mt-6 text-gray-400 hover:text-white underline text-sm">رجوع</button>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <>
            <h1 className="text-5xl font-black text-red-600 mb-2 animate-bounce">انتهت اللعبة</h1>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800 p-4 rounded"><div className="text-gray-400 text-xs">المستوى</div><div className="text-2xl font-bold text-white">{level}</div></div>
              <div className="bg-slate-800 p-4 rounded"><div className="text-gray-400 text-xs">النقاط</div><div className="text-2xl font-bold text-yellow-400">{score}</div></div>
            </div>
            <button 
              onClick={handleStartClick}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-lg transition-all animate-pulse"
            >
              (A) إعادة المحاولة
            </button>
          </>
        )}

        {gameState === 'LEVEL_COMPLETE' && (
          <>
            <h1 className="text-4xl font-black text-yellow-400 mb-2">اكتمل المستوى!</h1>
            <button 
              onClick={nextLevel}
              className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xl rounded-lg transition-all animate-pulse"
            >
              (A) المستوى التالي
            </button>
          </>
        )}
      </div>
    </div>
  );
};