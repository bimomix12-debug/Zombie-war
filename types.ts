import * as THREE from 'three';
import React from 'react';

// Augment global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      primitive: any;
      gridHelper: any;
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      fog: any;
      spotLight: any;
      [elemName: string]: any;
    }
  }
}

// Augment React module's JSX namespace
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      primitive: any;
      gridHelper: any;
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      fog: any;
      spotLight: any;
      [elemName: string]: any;
    }
  }
}

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_COMPLETE' | 'GAME_OVER';

export type InputMethod = 'PC' | 'TOUCH' | 'GAMEPAD';

export interface DifficultyConfig {
  zombieCount: number;
  timeLimit: number;
  zombieSpeed: number;
}

export interface ZombieEntity {
  id: string;
  position: THREE.Vector3;
  speed: number;
  isDead: boolean;
  animationOffset: number;
  isBoss?: boolean;
  hp?: number;
  maxHp?: number;
}

export interface MobileInputState {
  move: { x: number, y: number }; 
  look: { x: number, y: number }; 
  isShooting: boolean;
  isJumping: boolean;
  toggleFlashlight: boolean;
}

export interface GameWorldProps {
  gameState: GameState;
  zombieCount: number;
  lives: number;
  isBossPhase: boolean; 
  level: number; 
  inputMethod: InputMethod | null;
  mobileInputRef: React.MutableRefObject<MobileInputState>;
  onZombieDeath: () => void;
  onPlayerHit: () => void;
  onPause: () => void;
}

export interface HUDProps {
  level: number;
  timeLeft: number;
  score: number;
  zombiesRemaining: number;
  lives: number;
  onPause: () => void;
}

export interface MenuProps {
  gameState: GameState;
  startGame: (method: InputMethod) => void;
  nextLevel: () => void;
  score: number;
  level: number;
  onResume?: () => void;
  onQuit?: () => void;
  inputMethod?: InputMethod | null;
}
