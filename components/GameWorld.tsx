import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { BakeShadows } from '@react-three/drei';
import { SceneContent } from './SceneContent';
import { GameWorldProps } from '../types';

export const GameWorld: React.FC<GameWorldProps> = (props) => {
  return (
    <div className="absolute inset-0 z-0 bg-gray-900">
      <Canvas
        shadows
        camera={{ position: [0, 1.7, 0], fov: 75 }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={['#0f172a', 5, 40]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          {/* Moon Light */}
          <directionalLight 
            position={[-20, 30, -20]} 
            intensity={0.3} 
            color="#a5b4fc"
            castShadow 
            shadow-mapSize={[1024, 1024]} 
          />
          
          <SceneContent {...props} />
          <BakeShadows />
        </Suspense>
      </Canvas>
    </div>
  );
};
