import React, { useRef, useEffect, useState } from 'react';
import { MobileInputState } from '../types';
import { JOYSTICK_RADIUS } from '../constants';

interface MobileControlsProps {
  inputRef: React.MutableRefObject<MobileInputState>;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ inputRef }) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isDraggingJoystick = useRef(false);
  const lastLookTouch = useRef<{x: number, y: number} | null>(null);

  // Joystick Logic
  const handleJoystickStart = (e: React.TouchEvent) => {
    isDraggingJoystick.current = true;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!isDraggingJoystick.current) return;
    const touch = e.touches[0];
    
    let dx = touch.clientX - touchStartPos.current.x;
    let dy = touch.clientY - touchStartPos.current.y;
    
    // Clamp to radius
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > JOYSTICK_RADIUS) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * JOYSTICK_RADIUS;
      dy = Math.sin(angle) * JOYSTICK_RADIUS;
    }

    setJoystickPos({ x: dx, y: dy });

    // Update Input Ref (normalize -1 to 1)
    // Invert Y because screen Y is down, but 3D forward is usually negative Z or handled in logic
    // Usually Up (-Y on screen) = Forward (+1 or -1 depending on logic)
    // Let's map Screen Up (negative dy) to Forward (positive MoveY)
    inputRef.current.move = {
      x: dx / JOYSTICK_RADIUS,
      y: -(dy / JOYSTICK_RADIUS) 
    };
  };

  const handleJoystickEnd = () => {
    isDraggingJoystick.current = false;
    setJoystickPos({ x: 0, y: 0 });
    inputRef.current.move = { x: 0, y: 0 };
  };

  // Look Logic (Right side of screen)
  const handleLookStart = (e: React.TouchEvent) => {
     // Find the touch that is NOT the joystick (if multi-touch)
     // For simplicity, we attach this handler to a specific right-side div
     const touch = e.changedTouches[0];
     lastLookTouch.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent) => {
    if (!lastLookTouch.current) return;
    const touch = e.changedTouches[0];
    
    const dx = touch.clientX - lastLookTouch.current.x;
    const dy = touch.clientY - lastLookTouch.current.y;
    
    inputRef.current.look.x += dx;
    inputRef.current.look.y += dy;

    lastLookTouch.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookEnd = () => {
    lastLookTouch.current = null;
  };

  // Buttons
  const setShoot = (active: boolean) => { inputRef.current.isShooting = active; };
  const setJump = (active: boolean) => { inputRef.current.isJumping = active; };
  const setFlashlight = (active: boolean) => { inputRef.current.toggleFlashlight = active; };

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden">
      
      {/* Left Zone: Movement Joystick */}
      <div 
        className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm pointer-events-auto flex items-center justify-center touch-none"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
      >
        <div 
          className="w-16 h-16 bg-green-500/80 rounded-full shadow-lg"
          style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
        />
      </div>

      {/* Right Zone: Look Area */}
      <div 
        className="absolute top-0 right-0 w-1/2 h-full pointer-events-auto touch-none"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
      />

      {/* Action Buttons */}
      <div className="absolute bottom-12 right-8 flex flex-col gap-6 pointer-events-auto">
         {/* Jump */}
         <button 
           className="w-16 h-16 rounded-full bg-blue-500/80 border-4 border-white/50 text-white font-bold active:scale-95 transition-transform flex items-center justify-center shadow-lg"
           onTouchStart={() => setJump(true)}
           onTouchEnd={() => setJump(false)}
         >
           JUMP
         </button>

         {/* Flashlight */}
         <button 
           className="w-16 h-16 rounded-full bg-yellow-500/80 border-4 border-white/50 text-white font-bold active:scale-95 transition-transform flex items-center justify-center shadow-lg"
           onTouchStart={() => setFlashlight(true)}
           onTouchEnd={() => setFlashlight(false)}
         >
           LIGHT
         </button>

         {/* Shoot */}
         <button 
           className="w-24 h-24 rounded-full bg-red-600/80 border-4 border-white/50 text-white font-bold active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-red-900/50"
           onTouchStart={(e) => { e.preventDefault(); setShoot(true); }}
           onTouchEnd={(e) => { e.preventDefault(); setShoot(false); }}
         >
           FIRE
         </button>
      </div>
    </div>
  );
};