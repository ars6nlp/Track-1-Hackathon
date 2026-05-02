import React, { Suspense, useMemo, useLayoutEffect, useEffect, useState, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { useStore, METALS } from '../store/useStore'
import * as THREE from 'three'
import { UploadCloud } from 'lucide-react'
import { ErrorBoundary } from '../components/ErrorBoundary'

function Model({ url, isClean }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(), [scene])
  const prevMaterialsRef = useRef([])

  const heatmapEnabled   = useStore(state => state.heatmapEnabled)
  const heatmapIntensity = useStore(state => state.heatmapIntensity)
  const comparisonSlider = useStore(state => state.comparisonSlider)
  const selectedMetal    = useStore(state => state.selectedMetal)
  const showTopology     = useStore(state => state.showTopology)

  // ── Cleanup: dispose old geometry & materials on unmount or URL change ──
  useEffect(() => {
    return () => {
      // Dispose all materials we've been tracking
      prevMaterialsRef.current.forEach(m => {
        if (m && m.dispose) m.dispose()
      })
      prevMaterialsRef.current = []

      clonedScene.traverse((child) => {
        if (child.isMesh) {
          // Do NOT dispose geometry, as it is cached by useGLTF
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        }
      })
      // Do NOT clear useGLTF cache, let React Three Fiber handle it
    }
  }, [clonedScene, url])

  // ── Material & visibility update ──
  useLayoutEffect(() => {
    const metalDef = METALS[selectedMetal] || METALS['gold_14k']

    // Dispose previously assigned materials to prevent GPU leaks
    prevMaterialsRef.current.forEach(m => {
      if (m && m.dispose) m.dispose()
    })
    prevMaterialsRef.current = []

    // ── Decoupled Visibility Logic ──
    // slider === 0  → only raw visible (clean hidden)
    // slider === 1  → only clean visible (raw hidden)
    // 0 < slider < 1 → both visible with cross-fade opacity
    const isVisible = isClean
      ? comparisonSlider > 0       // cleanMesh visible when slider > 0
      : comparisonSlider < 1       // rawMesh visible when slider < 1

    const opacity = isClean
      ? comparisonSlider
      : (1.0 - comparisonSlider)

    clonedScene.visible = isVisible

    // Debug: verify heatmapIntensity reaches the Viewer
    if (isClean && heatmapEnabled) {
      console.log('[Viewer] intensity:', heatmapIntensity)
    }

    clonedScene.traverse((child) => {
      if (!child.isMesh) return

      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals()
      }

      let newMaterial

      if (heatmapEnabled && isClean) {
        // ── Heatmap Shader ──
        const metalColor = new THREE.Color(metalDef.color)

        newMaterial = new THREE.ShaderMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: opacity > 0.99,
          wireframe: showTopology,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          uniforms: {
            opacity:          { value: opacity },
            heatmapIntensity: { value: heatmapIntensity },
            baseMetalColor:   { value: new THREE.Vector3(metalColor.r, metalColor.g, metalColor.b) }
          },
          vertexShader: `
            attribute vec3 color;
            varying float vHeat;
            void main() {
              vHeat = color.r; // Red channel encodes deviation 0..1
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float opacity;
            uniform float heatmapIntensity;
            uniform vec3  baseMetalColor;
            varying float vHeat;
            void main() {
              // Heatmap gradient: Blue(cold) → Green → Red(hot)
              vec3 heatmapColor;
              if (vHeat < 0.5) {
                heatmapColor = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), vHeat * 2.0);
              } else {
                heatmapColor = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (vHeat - 0.5) * 2.0);
              }
              // intensity=0 → pure metal, intensity=1 → full heatmap. Alpha from opacity.
              gl_FragColor = mix(vec4(baseMetalColor, opacity), vec4(heatmapColor, opacity), heatmapIntensity);
            }
          `
        })
      } else {
        // ── PBR material ──
        const baseColor = isClean ? metalDef.color     : 0x555555
        const metalness = isClean ? metalDef.metalness  : 0.4
        const roughness = isClean ? metalDef.roughness  : 0.7

        newMaterial = new THREE.MeshStandardMaterial({
          color:       baseColor,
          metalness:   metalness,
          roughness:   roughness,
          transparent: true,
          opacity:     opacity,
          wireframe:   showTopology,
          side:        THREE.DoubleSide,
          depthWrite:  opacity > 0.99,
          // Z-fighting prevention for cleanMesh: render slightly in front of rawMesh
          ...(isClean && {
            polygonOffset:       true,
            polygonOffsetFactor: -1,
          }),
        })
      }

      child.material = newMaterial
      prevMaterialsRef.current.push(newMaterial)
    })
  }, [clonedScene, isClean, heatmapEnabled, heatmapIntensity, comparisonSlider, selectedMetal, showTopology])

  return <primitive object={clonedScene} />
}

export default function Viewer() {
  const { analytics, setStatus, setJobId, reset, setErrorMessage } = useStore()
  const autoRotate = useStore(state => state.autoRotate)
  const heatmapEnabled = useStore(state => state.heatmapEnabled)
  const isCompleted = analytics && analytics.length > 0
  const [isDragging, setIsDragging] = useState(false)

  const item_id = isCompleted ? analytics[0].item_id : null
  const baseUrl  = `http://localhost:8000/api/v1/jobs/items/${item_id}/download`
  const cleanModelUrl = isCompleted ? `${baseUrl}?type=clean_lod#.glb` : null
  const rawModelUrl   = isCompleted ? `${baseUrl}?type=raw_lod#.glb`   : null

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    // Clear state & GPU memory triggers (models unmount)
    reset();
    setStatus('uploading');
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await fetch('http://localhost:8000/api/v1/jobs/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      
      setJobId(data.job_id);
      setStatus('processing');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Сбой сети или бэкенд недоступен.');
      setStatus('error');
    }
  }, [setStatus, setJobId, reset, setErrorMessage]);

  return (
    <div 
      className="w-full h-full absolute inset-0"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <ErrorBoundary>
        <Canvas shadows camera={{ position: [0, 0, 50], fov: 45 }}>
          <color attach="background" args={['#0a0a0a']} />
          <Suspense fallback={null}>
            {isCompleted && cleanModelUrl && (
              <Stage environment="apartment" intensity={0.6}>
                <group>
                  {/* Raw mesh renders first (behind) */}
                  <Model key={`raw-${heatmapEnabled}`}   url={rawModelUrl}   isClean={false} />
                  {/* Clean mesh renders second — key forces shader re-init on heatmap toggle */}
                  <Model key={`clean-${heatmapEnabled}`} url={cleanModelUrl} isClean={true}  />
                </group>
              </Stage>
            )}
          </Suspense>
          <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={1.5} />
        </Canvas>
      </ErrorBoundary>

      {isDragging && (
        <div className="absolute inset-0 bg-neutral-950/80 z-50 flex items-center justify-center border-4 border-amber-500 border-dashed m-4 rounded-xl transition-all pointer-events-none">
          <div className="flex flex-col items-center text-amber-500">
            <UploadCloud size={64} className="mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold tracking-wider">Drop to upload new scan</h2>
          </div>
        </div>
      )}
    </div>
  )
}
