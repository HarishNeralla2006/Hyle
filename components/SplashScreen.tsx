import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Text, PerspectiveCamera, Environment, Float, shaderMaterial, Sparkles, Center } from '@react-three/drei';
import * as THREE from 'three';

interface SplashScreenProps {
    onComplete: () => void;
}

// 1. Ripple Shader (Updated for Floor Surface)
const MAX_RIPPLES = 64;

const RippleShaderMaterial = shaderMaterial(
    {
        uTime: 0,
        uResolution: new THREE.Vector2(1, 1),
        uRipples: new Float32Array(MAX_RIPPLES * 3).fill(-1000), // vec3(x, y, age)
        uRippleCount: 0,
        uColor: new THREE.Color("#000000")
    },
    // Vertex
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment
    `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uRipples[${MAX_RIPPLES}];
    uniform int uRippleCount;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float totalRipple = 0.0;
      
      // Calculate Ripples
      for(int i = 0; i < ${MAX_RIPPLES}; i++) {
        if(i >= uRippleCount) break;
        vec3 r = uRipples[i];
        float age = r.z;
        if(age > 2.0) continue;

        float d = distance(uv, r.xy);
        float radius = age * 0.3;
        float width = 0.08 + age * 0.12;
        float strength = (1.0 - age/2.0); // Full strength interaction
        
        float wave = sin((d - radius) * 12.0) * smoothstep(width, 0.0, abs(d - radius));
        totalRipple += wave * strength;
      }

      // Visuals
      vec3 baseColor = uColor;
      vec3 goldColor = vec3(1.0, 0.85, 0.12); // #FFD820 Gold
      
      // Mix base black with Gold bloom based on ripple intensity
      // Only positive waves (peaks) glow
      float glow = max(0.0, totalRipple);
      
      vec3 finalColor = mix(baseColor, goldColor, glow * 2.0); // Intense glow
      
      // Add 'Highlights'
      float highlight = smoothstep(0.01, 0.02, totalRipple) * 0.5;
      finalColor += vec3(highlight); 
      
      // Fake reflection sheen remains
      float sheen = dot(normalize(vec3(uv - 0.5, 1.0)), vec3(0,1,0));
      
      gl_FragColor = vec4(finalColor, 0.9 + glow * 0.1);
    }
    `
);
extend({ RippleShaderMaterial });


// 2. Ripple Floor Component
const RippleFloor = () => {
    const materialRef = useRef<any>(null);
    const ripples = useRef<{ x: number, y: number, age: number }[]>([]);
    const prevMouse = useRef(new THREE.Vector2(-999, -999));
    const { raycaster, camera, scene } = useThree();

    // Use Raycaster to find mouse position on the FLOOR plane, not screen space
    useFrame((state, delta) => {
        if (!materialRef.current) return;

        // Raycast to floor plane (y=0 in local space of mesh, but mesh is rotated)
        // Actually, just projecting mouse to ground plane mathematically is cheaper
        // Plane is at y = -2, normal (0,1,0). 
        // Or cleaner: use `raycaster.intersectObject` on the mesh

        // Simpler: Just map screen UV to floor UV roughly for the effect
        // Screen Space ripples are fine for a top-down-ish view, but Perspective makes it weird.
        // Let's do simple screen-space mapping for robustness.
        const currentMouse = state.pointer;
        const uvMouse = new THREE.Vector2((currentMouse.x + 1) / 2, (currentMouse.y + 1) / 2);

        // Spawn Ripple
        if (uvMouse.distanceTo(prevMouse.current) > 0.01) {
            ripples.current.unshift({ x: uvMouse.x, y: uvMouse.y, age: 0 });
            prevMouse.current.copy(uvMouse);
            if (ripples.current.length > MAX_RIPPLES) ripples.current.pop();
        }

        ripples.current.forEach(r => r.age += delta * 1.5);

        // Update Uniforms
        const rippleData = new Float32Array(MAX_RIPPLES * 3).fill(-1000);
        ripples.current.forEach((r, i) => {
            rippleData[i * 3 + 0] = r.x;
            rippleData[i * 3 + 1] = r.y;
            rippleData[i * 3 + 2] = r.age;
        });

        materialRef.current.uRipples = rippleData;
        materialRef.current.uRippleCount = ripples.current.length;
        materialRef.current.uTime = state.clock.getElapsedTime();
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
            <planeGeometry args={[100, 50]} />
            {/* @ts-ignore */}
            <rippleShaderMaterial
                ref={materialRef}
                transparent={true}
                uColor={new THREE.Color("#000000")}
            />
        </mesh>
    );
};


// 4. Camera Parallax Rig
const CameraRig = () => {
    useFrame((state) => {
        // Subtle Parallax
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 0.5, 0.02);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2 + state.pointer.y * 0.5, 0.05);
        state.camera.lookAt(0, 1, 0); // Always look at logo
    });
    return null;
};

// 5. Kinetic Grid Floor (Architectural/Clean/Fun)
const KineticGrid = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { viewport } = useThree();
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const countX = 140;
    const countZ = 40;
    const spacing = 0.5;

    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();
        const { x: mx, y: my } = state.pointer;
        // Map mouse to world floor roughly (Plane is huge)
        const mouseX = mx * 10;
        const mouseY = my * 5;

        let i = 0;
        for (let x = 0; x < countX; x++) {
            for (let z = 0; z < countZ; z++) {
                // Center the grid
                const px = (x - countX / 2) * spacing;
                const pz = (z - countZ / 2) * spacing;

                // Distance to mouse interaction
                const dist = Math.sqrt(Math.pow(px - mouseX, 2) + Math.pow(pz - -mouseY * 4, 2));

                // Wave Logic (Complex Ocean Data Flow)
                // 1. Diagonal Swell (Main movement)
                const swell = Math.sin(x * 0.15 + z * 0.1 + time * 0.8) * 0.5;
                // 2. High frequency ripple
                const ripple = Math.cos(x * 0.3 - time * 2) * Math.sin(z * 0.3 + time) * 0.2;

                const ambientY = swell + ripple;

                // 3. Mouse Interaction (Magnetic Pull)
                // If close, rise up dramatically
                const interact = Math.max(0, 6 - dist);
                const rise = Math.pow(interact * 0.4, 2); // Exponential rise for sharper peaks

                // Total Height
                const height = -4.5 + ambientY + rise * 0.3;

                // Position
                dummy.position.set(px, height, pz - 5);

                // Rotation: Gentle organic drift
                dummy.rotation.x = ambientY * 0.2;
                dummy.rotation.z = ripple * 0.4;
                dummy.rotation.y = rise * 0.1; // Twist near mouse

                // Dynamic Scale: Stretch vertically when rising ("Digital Pillars")
                const stretch = Math.max(0.4, 0.4 + (rise * 0.3) + (ambientY * 0.2));
                dummy.scale.set(0.4, stretch, 0.4);

                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i++, dummy.matrix);
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, countX * countZ]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial
                color="#000000" // Pitch black for max contrast
                roughness={0.05} // Polished obsidian look
                metalness={0.9}
                clearcoat={1}
                clearcoatRoughness={0.1}
                reflectivity={1}
            />
        </instancedMesh>
    );
};

// 3. Clean Classical Logo (100% Color Match)
const HyleLogo = () => {
    const { viewport } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const isMobile = viewport.width < 10;
    const fontSize = isMobile ? viewport.width / 3.2 : 4.5;

    // Tight spacing for the whole word to keep it cohesive
    // Tight spacing for the whole word to keep it cohesive
    const spacing = 0.01;

    useFrame((state) => {
        if (groupRef.current) {
            const { x, y } = state.pointer;
            // Elegant, slow float
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.05, 0.05);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.05, 0.05);
            // Drastically reduced vertical float range for centered feel
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 1.0 + (y * 0.1), 0.05);
        }
    });

    return (
        <group ref={groupRef} position={[0, 1.0, 0]}>
            <Float speed={1.5} rotationIntensity={0.02} floatIntensity={0.1}>
                {/* Removed Center wrapper to rely on Text anchors for perfect centering */}
                <Text
                    font="/fonts/alinsa.ttf"
                    fontSize={fontSize}
                    letterSpacing={spacing}
                    color="#FFD820"
                    anchorX="center"
                    anchorY="middle"
                >
                    Hyle
                    <meshBasicMaterial color="#FFD820" toneMapped={false} />
                </Text>
            </Float>
        </group>
    );
};

// Breakdown of Scenes for Dual-Layer Rendering

// 1. Background Scene (Blurred Floor)
const BackgroundScene = () => {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 14]} fov={40} />
            <CameraRig />

            <ambientLight intensity={5.0} />
            <spotLight position={[10, 20, 10]} angle={0.5} intensity={5} color="white" penumbra={1} />
            <pointLight position={[-10, 5, -10]} intensity={10.0} color="#FFD820" />
            <pointLight position={[0, 20, 0]} intensity={200.0} color="#FFD820" />

            <Environment preset="city" />

            <KineticGrid />

            <color attach="background" args={['#000000']} />
            <fog attach="fog" args={['#000000', 5, 40]} />
        </>
    );
};

// 2. Foreground Scene (Sharp Logo)
// Note: Logo uses meshBasicMaterial (Unlit), so no lights needed here.
const ForegroundScene = () => {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 14]} fov={40} />
            <CameraRig />
            <HyleLogo />
        </>
    );
};

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const [isExiting, setIsExiting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onComplete, 1000);
        }, 4500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div ref={containerRef} className={`fixed inset-0 z-[100] bg-black transition-opacity duration-1000 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* Combined Scene using Single WebGL Context */}
            <div className="absolute inset-0 z-0">
                <Canvas
                    eventSource={containerRef as any}
                    dpr={[1, 2]}
                    gl={{
                        antialias: true,
                        toneMapping: THREE.NoToneMapping,
                        powerPreference: "default" // Reduced from high-performance to prevent crashes
                    }}
                >
                    <Suspense fallback={null}>
                        <PerspectiveCamera makeDefault position={[0, 0, 14]} fov={40} />
                        <CameraRig />

                        <ambientLight intensity={5.0} />
                        <spotLight position={[10, 20, 10]} angle={0.5} intensity={5} color="white" penumbra={1} />
                        <pointLight position={[-10, 5, -10]} intensity={10.0} color="#FFD820" />
                        <pointLight position={[0, 20, 0]} intensity={200.0} color="#FFD820" />

                        <Environment preset="city" />

                        {/* Background */}
                        <KineticGrid />
                        <color attach="background" args={['#000000']} />
                        <fog attach="fog" args={['#000000', 5, 40]} />

                        {/* Foreground Logo - Positioned explicitly to be visible */}
                        <HyleLogo />
                    </Suspense>
                </Canvas>
            </div>

            <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none z-30">
                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#FFD820]/50 to-transparent"></div>
                    <div className="text-transparent bg-clip-text bg-gradient-to-b from-[#FFD820] to-[#b39600] font-sans text-xs md:text-sm tracking-[0.5em] font-black uppercase drop-shadow-2xl">
                        HARIX INDUSTRIES
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
