import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { GameWorldProps, ZombieEntity } from '../types';
import { ZOMBIE_SPAWN_RADIUS, HIT_DISTANCE, PLAYER_SPEED, PLAYER_RUN_SPEED, PLAYER_HEIGHT, LOOK_SENSITIVITY_TOUCH, LOOK_SENSITIVITY_GAMEPAD } from '../constants';

const floorMaterial = new THREE.MeshStandardMaterial({ 
  color: '#1a1a1a', 
  roughness: 0.9,
  metalness: 0.1
});
const buildingMaterial = new THREE.MeshStandardMaterial({ color: '#2d3748', roughness: 0.8 });

const skinColor = '#458B00';
const shirtColor = '#00AAAA';
const pantsColor = '#403578';
const shoesColor = '#111111';

// Obstacle definitions (Position, Size) for Collision
const OBSTACLES = [
  { pos: new THREE.Vector3(-20, 4, -20), size: new THREE.Vector3(15, 8, 20) }, // Big Building
  { pos: new THREE.Vector3(15, 3, 15), size: new THREE.Vector3(8, 6, 8) },   // House 1
  { pos: new THREE.Vector3(20, 3, -10), size: new THREE.Vector3(6, 6, 6) }    // House 2
];

const createZombieHeadMaterial = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = skinColor;
    ctx.fillRect(0, 0, 64, 64);

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#3A7500' : '#529F00';
      const x = Math.floor(Math.random() * 8) * 8;
      const y = Math.floor(Math.random() * 8) * 8;
      ctx.fillRect(x, y, 8, 8);
    }

    ctx.fillStyle = '#1a1a1a'; 
    ctx.fillRect(8, 24, 18, 10); 
    ctx.fillRect(38, 24, 18, 10); 
    
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(14, 26, 6, 6);
    ctx.fillRect(44, 26, 6, 6);

    ctx.fillStyle = '#2e5e00';
    ctx.fillRect(28, 34, 8, 4);

    ctx.fillStyle = '#2e5e00'; 
    ctx.fillRect(20, 48, 24, 6);
    ctx.fillStyle = '#1a1a1a'; 
    ctx.fillRect(24, 50, 16, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
};

const GRAVITY = 30.0;
const JUMP_FORCE = 12.0;
const KNOCKBACK_FORCE = 20.0;

export const SceneContent: React.FC<GameWorldProps> = ({ 
  gameState, 
  zombieCount, 
  inputMethod,
  mobileInputRef,
  onZombieDeath,
  onPlayerHit,
  isBossPhase,
  level,
  onPause
}) => {
  const { camera, scene } = useThree();
  const [zombies, setZombies] = useState<ZombieEntity[]>([]);
  const [muzzleFlash, setMuzzleFlash] = useState(0); 
  const [flashlightOn, setFlashlightOn] = useState(false);
  
  const bulletsRef = useRef<{ id: number, position: THREE.Vector3, velocity: THREE.Vector3, mesh: THREE.Mesh }[]>([]);
  
  const lastShotTime = useRef(0);
  const lastHitTime = useRef(0);
  const lastFlashlightToggleTime = useRef(0);
  const lastPauseTime = useRef(0);
  const isLocked = useRef(false);

  const velocity = useRef(new THREE.Vector3());
  const jumpCount = useRef(0);
  
  const playerYaw = useRef(0);
  const playerPitch = useRef(0);

  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const isSprinting = useRef(false);

  const { headMaterials, bodyMaterials, legMaterials } = useMemo(() => {
    const faceMat = createZombieHeadMaterial();
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: shoesColor, roughness: 0.9 });

    const headMats = [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat];
    
    return {
      headMaterials: headMats,
      bodyMaterials: shirtMat,
      legMaterials: [pantsMat, shoesMat]
    };
  }, []);

  const triggerShoot = () => {
    const now = performance.now();
    if (now - lastShotTime.current < 150) return; 
    lastShotTime.current = now;

    setMuzzleFlash(3.0);
    setTimeout(() => setMuzzleFlash(0), 50);

    const bulletGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const bulletMat = new THREE.MeshBasicMaterial({ color: '#ffff00' });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const startPos = camera.position.clone().add(direction.clone().multiplyScalar(1.0));
    startPos.y -= 0.2; 
    
    bulletMesh.position.copy(startPos);
    bulletMesh.lookAt(startPos.clone().add(direction));
    scene.add(bulletMesh);

    bulletsRef.current.push({
      id: Math.random(),
      position: startPos,
      velocity: direction.multiplyScalar(80), 
      mesh: bulletMesh
    });
  };

  const triggerJump = () => {
    if (jumpCount.current < 2) {
      velocity.current.y = JUMP_FORCE;
      jumpCount.current++;
    }
  };

  const toggleFlashlight = () => {
    const now = Date.now();
    if (now - lastFlashlightToggleTime.current > 300) {
      setFlashlightOn(prev => !prev);
      lastFlashlightToggleTime.current = now;
    }
  };

  useEffect(() => {
    if (inputMethod !== 'PC') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyZ': case 'ArrowUp': moveForward.current = true; break;
        case 'KeyS': case 'ArrowDown': moveBackward.current = true; break;
        case 'KeyQ': case 'ArrowLeft': moveLeft.current = true; break;
        case 'KeyD': case 'ArrowRight': moveRight.current = true; break;
        case 'ShiftLeft': case 'ShiftRight': isSprinting.current = true; break;
        case 'Space': 
          if (gameState === 'PLAYING') triggerJump();
          break;
        case 'KeyY':
          toggleFlashlight();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyZ': case 'ArrowUp': moveForward.current = false; break;
        case 'KeyS': case 'ArrowDown': moveBackward.current = false; break;
        case 'KeyQ': case 'ArrowLeft': moveLeft.current = false; break;
        case 'KeyD': case 'ArrowRight': moveRight.current = false; break;
        case 'ShiftLeft': case 'ShiftRight': isSprinting.current = false; break;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameState !== 'PLAYING' || !isLocked.current) return;
      if (e.button === 0) triggerShoot();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [gameState, inputMethod]);

  // Spawning logic (Normal & Boss)
  useEffect(() => {
    if (gameState === 'PLAYING') {
      const newZombies: ZombieEntity[] = [];
      
      if (isBossPhase) {
        // Spawn BOSS
        newZombies.push({
          id: 'boss',
          position: new THREE.Vector3(0, 0, -30),
          speed: 3.5 + (level * 0.1), // Boss is slightly faster
          isDead: false,
          animationOffset: 0,
          isBoss: true,
          hp: level * 20, // Boss Health
          maxHp: level * 20
        });
      } else {
        // Spawn Normal Zombies
        for (let i = 0; i < zombieCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = ZOMBIE_SPAWN_RADIUS + (Math.random() * 15);
          newZombies.push({
            id: Math.random().toString(36).substr(2, 9),
            position: new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r),
            speed: 2.0 + Math.random() * 2,
            isDead: false,
            animationOffset: Math.random() * 100,
            isBoss: false,
            hp: 1,
            maxHp: 1
          });
        }
      }

      setZombies(newZombies);
      bulletsRef.current = [];
      
      if (!isBossPhase) {
        // Only reset player pos on level start, not boss phase start
        camera.position.set(0, PLAYER_HEIGHT, 0);
        camera.rotation.set(0, 0, 0);
        playerYaw.current = 0;
        playerPitch.current = 0;
        velocity.current.set(0, 0, 0);
        jumpCount.current = 0;
        setFlashlightOn(false);
      }
      
    } else {
      setZombies([]);
    }
  }, [gameState, zombieCount, isBossPhase, level, camera]);

  // Physics & Collision Helper
  const checkCollision = (position: THREE.Vector3) => {
    const playerRadius = 0.5;
    for (const ob of OBSTACLES) {
      const halfSizeX = ob.size.x / 2;
      const halfSizeZ = ob.size.z / 2;
      const minX = ob.pos.x - halfSizeX - playerRadius;
      const maxX = ob.pos.x + halfSizeX + playerRadius;
      const minZ = ob.pos.z - halfSizeZ - playerRadius;
      const maxZ = ob.pos.z + halfSizeZ + playerRadius;

      if (position.x > minX && position.x < maxX && position.z > minZ && position.z < maxZ) {
        return true; 
      }
    }
    return false;
  };

  useFrame((state, delta) => {
    if (gameState !== 'PLAYING') {
       if (gameState === 'PAUSED' && document.pointerLockElement) {
          document.exitPointerLock();
          isLocked.current = false;
       }
       return;
    }

    const moveDir = new THREE.Vector3();
    let currentSpeed = isSprinting.current ? PLAYER_RUN_SPEED : PLAYER_SPEED;
    let lookDeltaX = 0;
    let lookDeltaY = 0;
    let isLookingBehind = false;

    if (inputMethod === 'PC') {
       const front = Number(moveBackward.current) - Number(moveForward.current); 
       const side = Number(moveLeft.current) - Number(moveRight.current); 
       moveDir.set(side, 0, front); 
       
       playerYaw.current = camera.rotation.y;
       playerPitch.current = camera.rotation.x;
    } 
    else if (inputMethod === 'TOUCH') {
       const input = mobileInputRef.current;
       moveDir.set(-input.move.x, 0, -input.move.y); 

       if (input.look.x !== 0 || input.look.y !== 0) {
          lookDeltaX = input.look.x * LOOK_SENSITIVITY_TOUCH;
          lookDeltaY = input.look.y * LOOK_SENSITIVITY_TOUCH;
          input.look.x = 0;
          input.look.y = 0;
       }

       if (input.isShooting) triggerShoot();
       if (input.isJumping && jumpCount.current < 2 && velocity.current.y <= 0) triggerJump();
       if (input.toggleFlashlight) toggleFlashlight();
    }
    else if (inputMethod === 'GAMEPAD') {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (gp) {
        const deadzone = 0.15;
        const lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
        const ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;
        moveDir.set(lx, 0, ly); 

        const rawRx = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
        const rawRy = Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0;
        const curve = 2.5;
        const rx = Math.sign(rawRx) * Math.pow(Math.abs(rawRx), curve);
        const ry = Math.sign(rawRy) * Math.pow(Math.abs(rawRy), curve);
        
        lookDeltaX = rx * LOOK_SENSITIVITY_GAMEPAD * delta;
        lookDeltaY = ry * (LOOK_SENSITIVITY_GAMEPAD * 0.6) * delta;

        if (gp.buttons[7] && gp.buttons[7].pressed) triggerShoot();
        if (gp.buttons[5] && gp.buttons[5].pressed) isLookingBehind = true;
        if (gp.buttons[0] && gp.buttons[0].pressed) triggerJump();
        if (gp.buttons[3] && gp.buttons[3].pressed) toggleFlashlight();
        
        // Start Button (9) for Pause
        if (gp.buttons[9] && gp.buttons[9].pressed) {
          const now = Date.now();
          if (now - lastPauseTime.current > 500) {
            onPause();
            lastPauseTime.current = now;
          }
        }

        const sprintBtn = (gp.buttons[10] && gp.buttons[10].pressed) || (gp.buttons[1] && gp.buttons[1].pressed);
        if (sprintBtn) currentSpeed = PLAYER_RUN_SPEED;
      }
    }

    if (inputMethod !== 'PC') {
      playerYaw.current -= lookDeltaX;
      playerPitch.current -= lookDeltaY;
      playerPitch.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, playerPitch.current));
      
      const renderYaw = playerYaw.current + (isLookingBehind ? Math.PI : 0);
      
      camera.rotation.y = renderYaw;
      camera.rotation.x = playerPitch.current;
      
      const tiltTarget = -moveDir.x * 0.05; 
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, tiltTarget, delta * 5);
    }

    // --- PHYSICS (ROBUST) ---
    velocity.current.y -= GRAVITY * delta;

    moveDir.normalize().multiplyScalar(currentSpeed);
    
    if (inputMethod === 'PC') {
      moveDir.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    } else {
      moveDir.applyEuler(new THREE.Euler(0, playerYaw.current, 0));
    }

    const damping = 15.0; 
    velocity.current.x += (moveDir.x - velocity.current.x) * damping * delta;
    velocity.current.z += (moveDir.z - velocity.current.z) * damping * delta;
    
    // Calculate potential new position
    const nextX = camera.position.x + velocity.current.x * delta;
    const nextZ = camera.position.z + velocity.current.z * delta;
    
    // Check Collision (Wall)
    const nextPos = new THREE.Vector3(nextX, camera.position.y, nextZ);
    if (!checkCollision(nextPos)) {
      camera.position.x = nextX;
      camera.position.z = nextZ;
    } else {
      // Simple sliding: Try X only
      if (!checkCollision(new THREE.Vector3(nextX, camera.position.y, camera.position.z))) {
        camera.position.x = nextX;
        velocity.current.z = 0;
      } 
      // Try Z only
      else if (!checkCollision(new THREE.Vector3(camera.position.x, camera.position.y, nextZ))) {
        camera.position.z = nextZ;
        velocity.current.x = 0;
      } else {
        // Stop
        velocity.current.x = 0;
        velocity.current.z = 0;
      }
    }

    // Apply Vertical with Clamp
    const nextY = camera.position.y + velocity.current.y * delta;

    if (nextY < PLAYER_HEIGHT) {
      camera.position.y = PLAYER_HEIGHT;
      velocity.current.y = 0;
      jumpCount.current = 0;
    } else {
      camera.position.y = nextY;
    }

    // Boundary check (Cylindrical)
    const distSq = camera.position.x * camera.position.x + camera.position.z * camera.position.z;
    if (distSq > 900) { 
      const angle = Math.atan2(camera.position.z, camera.position.x);
      camera.position.x = Math.cos(angle) * 30;
      camera.position.z = Math.sin(angle) * 30;
    }

    const playerPos = camera.position;

    // Bullets & Zombies Logic
    bulletsRef.current.forEach((bullet, index) => {
      const moveStep = bullet.velocity.clone().multiplyScalar(delta);
      const nextPos = bullet.position.clone().add(moveStep);
      
      // Wall collision for bullet
      if (checkCollision(nextPos) || nextPos.y < 0) {
        scene.remove(bullet.mesh);
        bulletsRef.current.splice(index, 1);
        return;
      }

      bullet.position.copy(nextPos);
      bullet.mesh.position.copy(bullet.position);

      if (bullet.position.distanceTo(playerPos) > 60) {
        scene.remove(bullet.mesh);
        bulletsRef.current.splice(index, 1);
      }
    });

    setZombies(prevZombies => {
      return prevZombies.map(zombie => {
        if (zombie.isDead) return zombie;

        const currentPos = zombie.position.clone();
        const direction = new THREE.Vector3(playerPos.x, 0, playerPos.z)
          .sub(currentPos)
          .normalize();
        
        const nextZombiePos = currentPos.clone().add(direction.clone().multiplyScalar(zombie.speed * delta));

        // Basic wall collision for zombies
        if (!checkCollision(nextZombiePos)) {
           currentPos.copy(nextZombiePos);
        }

        const angleToPlayer = Math.atan2(
           playerPos.x - currentPos.x,
           playerPos.z - currentPos.z
        );

        if (currentPos.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z)) < HIT_DISTANCE) {
          const now = Date.now();
          if (now - lastHitTime.current > 1000) { 
             onPlayerHit();
             lastHitTime.current = now;
             
             const knockDir = new THREE.Vector3(playerPos.x, 0, playerPos.z)
                .sub(currentPos)
                .normalize()
                .multiplyScalar(KNOCKBACK_FORCE);
            
             velocity.current.x = knockDir.x; 
             velocity.current.z = knockDir.z;
             velocity.current.y = 5; 
          }
        }

        let hit = false;
        bulletsRef.current.forEach((bullet, bIndex) => {
          if (!hit && 
              bullet.position.x > currentPos.x - (zombie.isBoss ? 1.5 : 0.5) && 
              bullet.position.x < currentPos.x + (zombie.isBoss ? 1.5 : 0.5) &&
              bullet.position.z > currentPos.z - (zombie.isBoss ? 1.5 : 0.5) && 
              bullet.position.z < currentPos.z + (zombie.isBoss ? 1.5 : 0.5) &&
              bullet.position.y > 0 && bullet.position.y < (zombie.isBoss ? 5.0 : 2.0)
             ) {
            hit = true;
            scene.remove(bullet.mesh);
            bulletsRef.current.splice(bIndex, 1);
          }
        });

        if (hit) {
          if (zombie.isBoss && zombie.hp && zombie.hp > 1) {
            return { ...zombie, hp: zombie.hp - 1, position: currentPos, rotationY: angleToPlayer };
          } else {
            onZombieDeath();
            return { ...zombie, isDead: true, position: new THREE.Vector3(0, -100, 0) };
          }
        }

        return { ...zombie, position: currentPos, rotationY: angleToPlayer };
      });
    });
  });

  return (
    <>
      {inputMethod === 'PC' && (
        <PointerLockControls 
          onLock={() => isLocked.current = true} 
          onUnlock={() => isLocked.current = false}
          selector={gameState === 'PLAYING' ? undefined : '#dummy-selector'} 
        />
      )}
      
      {flashlightOn && (
        <spotLight 
          position={[0, 0, 0]} 
          target={scene} 
          intensity={5.0}
          angle={0.6}
          penumbra={0.4}
          distance={100}
          castShadow
          color="#fffaf0"
          ref={(ref) => {
             if (ref) {
                ref.position.copy(camera.position);
                const offset = new THREE.Vector3(0.3, -0.3, 0).applyEuler(camera.rotation);
                ref.position.add(offset);
                const front = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
                ref.target.position.copy(camera.position).add(front);
                ref.target.updateMatrixWorld();
             }
          }}
        />
      )}

      <pointLight 
        position={[0, 0, -1]} 
        intensity={muzzleFlash} 
        distance={8} 
        decay={2}
        color="#ffaa00" 
      >
        <group position={[0,0,0]} ref={(ref) => {
            if(ref) camera.add(ref);
        }} />
      </pointLight>

      <Plane 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        args={[100, 100]} 
        receiveShadow
      >
        <primitive object={floorMaterial} attach="material" />
      </Plane>

      {/* Buildings Meshes */}
      {OBSTACLES.map((ob, i) => (
        <mesh key={i} position={ob.pos} castShadow receiveShadow>
           <boxGeometry args={[ob.size.x, ob.size.y, ob.size.z]} />
           <primitive object={buildingMaterial} attach="material" />
        </mesh>
      ))}

      {zombies.map(zombie => {
        if (zombie.isDead) return null;
        const time = Date.now() / 150 + zombie.animationOffset; 
        const armRotation = -Math.PI / 2;
        const legRotation = Math.sin(time) * 0.6; 
        const s = zombie.isBoss ? 3 : 1; 

        return (
          <group 
            key={zombie.id} 
            position={zombie.position} 
            rotation={[0, (zombie as any).rotationY || 0, 0]}
            scale={[s, s, s]}
          >
            {/* Health Bar for Boss */}
            {zombie.isBoss && zombie.hp && zombie.maxHp && (
               <mesh position={[0, 2.5, 0]}>
                 <planeGeometry args={[1, 0.1]} />
                 <meshBasicMaterial color="red" />
                 <mesh position={[-0.5 + (zombie.hp / zombie.maxHp)/2, 0, 0.01]}>
                    <planeGeometry args={[zombie.hp / zombie.maxHp, 0.08]} />
                    <meshBasicMaterial color="#00ff00" />
                 </mesh>
               </mesh>
            )}

            <mesh position={[0, 1.75, 0]} castShadow material={headMaterials}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              {zombie.isBoss && <meshBasicMaterial color="#ff0000" opacity={0.3} transparent />}
            </mesh>
            <mesh position={[0, 1.125, 0]} castShadow material={bodyMaterials}>
              <boxGeometry args={[0.5, 0.75, 0.25]} />
            </mesh>
            <group position={[0.38, 1.35, 0]} rotation={[armRotation + Math.sin(time)*0.1, 0, 0]}>
               <mesh position={[0, -0.1, 0]} castShadow material={bodyMaterials}>
                   <boxGeometry args={[0.25, 0.3, 0.25]} />
               </mesh>
               <mesh position={[0, -0.5, 0]} castShadow material={headMaterials[1]}> 
                   <boxGeometry args={[0.24, 0.55, 0.24]} />
               </mesh>
            </group>
            <group position={[-0.38, 1.35, 0]} rotation={[armRotation - Math.sin(time)*0.1, 0, 0]}>
               <mesh position={[0, -0.1, 0]} castShadow material={bodyMaterials}>
                   <boxGeometry args={[0.25, 0.3, 0.25]} />
               </mesh>
               <mesh position={[0, -0.5, 0]} castShadow material={headMaterials[1]}>
                   <boxGeometry args={[0.24, 0.55, 0.24]} />
               </mesh>
            </group>
            <group position={[0.13, 0.75, 0]} rotation={[legRotation, 0, 0]}>
              <mesh position={[0, -0.375, 0]} castShadow material={legMaterials[0]}>
                <boxGeometry args={[0.24, 0.75, 0.24]} />
              </mesh>
              <mesh position={[0, -0.7, 0]} castShadow material={legMaterials[1]}>
                 <boxGeometry args={[0.23, 0.1, 0.23]} />
              </mesh>
            </group>
            <group position={[-0.13, 0.75, 0]} rotation={[-legRotation, 0, 0]}>
              <mesh position={[0, -0.375, 0]} castShadow material={legMaterials[0]}>
                <boxGeometry args={[0.24, 0.75, 0.24]} />
              </mesh>
               <mesh position={[0, -0.7, 0]} castShadow material={legMaterials[1]}>
                 <boxGeometry args={[0.23, 0.1, 0.23]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
}
