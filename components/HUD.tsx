import React from 'react';
import { HUDProps } from '../types';

export const HUD: React.FC<HUDProps> = ({ level, timeLeft, score, zombiesRemaining, lives, onPause }) => {
  return (
    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-20">
      
      {/* Top Left: Score & Level & Lives */}
      <div className="flex flex-col gap-2">
        <div className="bg-black/50 p-2 rounded-lg border border-red-500/30 backdrop-blur-sm flex gap-1">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`text-2xl ${i < lives ? 'text-red-500' : 'text-gray-700'}`}>
              ❤️
            </span>
          ))}
        </div>

        <div className="bg-black/50 p-4 rounded-lg border border-green-500/30 backdrop-blur-sm">
          <div className="text-green-400 text-sm font-bold uppercase tracking-wider">المستوى</div>
          <div className="text-4xl font-black text-white">{level}</div>
        </div>
        <div className="bg-black/50 p-4 rounded-lg border border-green-500/30 backdrop-blur-sm">
          <div className="text-green-400 text-sm font-bold uppercase tracking-wider">النقاط</div>
          <div className="text-2xl font-bold text-white">{score.toLocaleString()}</div>
        </div>
      </div>

      {/* Top Center: Timer */}
      <div className={`transform -translate-x-1/2 absolute left-1/2 top-4 
        ${timeLeft < 10 ? 'animate-pulse' : ''}`}>
        <div className={`bg-black/60 px-8 py-2 rounded-xl border-2 backdrop-blur-md
          ${timeLeft < 10 ? 'border-red-500 text-red-500' : 'border-blue-500 text-white'}`}>
          <div className="text-center text-xs opacity-80 mb-1">الوقت المتبقي</div>
          <div className="text-5xl font-mono font-bold tracking-widest">
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* Top Right: Zombies & Pause */}
      <div className="flex flex-col gap-4 items-end pointer-events-auto">
        <button 
          onClick={onPause}
          className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded border-2 border-yellow-400 shadow-lg active:scale-95 transition-transform"
        >
          ⏸️ إيقاف
        </button>

        <div className="bg-red-900/60 p-4 rounded-lg border border-red-500/50 backdrop-blur-sm pointer-events-none">
          <div className="text-red-300 text-sm font-bold uppercase tracking-wider text-right">الزومبي</div>
          <div className="text-4xl font-black text-white text-right">{zombiesRemaining}</div>
        </div>
      </div>
    </div>
  );
};