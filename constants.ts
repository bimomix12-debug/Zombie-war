import { DifficultyConfig } from './types';

export const INITIAL_CONFIG: DifficultyConfig = {
  zombieCount: 10,
  timeLimit: 60,
  zombieSpeed: 2.0, 
};

export const calculateDifficulty = (level: number): DifficultyConfig => {
  // Rule: Zombies increase by 10 every level. Level 1 = 10, Level 20 = 200.
  const effectiveLevel = Math.min(level, 20);
  const zombieCount = effectiveLevel * 10;

  // Time Logic:
  // Level 1: 10 zombies. 6 seconds per zombie = 60s total.
  // Level 20: 200 zombies. 2 seconds per zombie = 400s total.
  const timePerZombie = Math.max(2.0, 6.0 - (level * 0.2)); 
  const timeLimit = Math.floor(zombieCount * timePerZombie);

  return {
    zombieCount: zombieCount,
    timeLimit: timeLimit,
    zombieSpeed: Math.min(8, 2.0 + (level * 0.2)), 
  };
};

export const ZOMBIE_SPAWN_RADIUS = 30; 
export const PLAYER_HEIGHT = 1.7; // Increased slightly to prevent ground clipping feel
export const PLAYER_SPEED = 8.0;
export const PLAYER_RUN_SPEED = 14.0;
export const BULLET_SPEED = 60;
export const HIT_DISTANCE = 1.0; 
export const JOYSTICK_RADIUS = 50; 
export const LOOK_SENSITIVITY_TOUCH = 0.005;
export const LOOK_SENSITIVITY_GAMEPAD = 4.0;