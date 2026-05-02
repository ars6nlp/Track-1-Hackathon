import React, { Suspense, useMemo, useLayoutEffect, useEffect, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { useStore, METALS } from '../store/useStore'
import * as THREE from 'three'
import { UploadCloud } from 'lucide-react'

function Model({ url, isClean }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(), [scene])

  const heatmapEnabled = useStore(state => state.heatmapEnabled)
  const comparisonSlider = useStore(state => state.comparisonSlider)
  const selectedMetal  = useStore(state => state.selectedMetal)

  useEffect(() => {
    return () => {
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        }
      })
      useGLTF.preload(url) // ensure cache is cleaned up if we want, or just clear explicitly
      // actually let's call useGLTF.clear to ensure the cache is purged and memory freed
      useGLTF.clear(url)
    }
  }, [clonedScene, url])

  useLayoutEffect(() => {
    const metalDef = METALS[selectedMetal] || METALS['gold_14k']

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals()
        }

        if (heatmapEnabled && isClean) {
          // ── Heatmap mode: Blue(cold) → Green → Red(hot) via Red vertex channel ──
          child.material = new THREE.ShaderMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: false,
            vertexShader: `
              attribute vec3 color;
              varying float vHeat;
              void main() {
                vHeat = color.r; // Red channel encodes deviation 0..1
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              varying float vHeat;
              void main() {
                vec3 col;
                if (vHeat < 0.5) {
                  col = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), vHeat * 2.0);
                } else {
                  col = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (vHeat - 0.5) * 2.0);
                }
                gl_FragColor = vec4(col, 1.0);
              }
            `
          })
        } else {
          // ── PBR material, driven by selectedMetal from global store ──
          const baseColor  = isClean ? metalDef.color    : 0x555555
          const metalness  = isClean ? metalDef.metalness : 0.4
          const roughness  = isClean ? metalDef.roughness : 0.7
          const opacity    = isClean ? comparisonSlider : (1 - comparisonSlider)

          child.material = new THREE.MeshStandardMaterial({
            color:      baseColor,
            metalness:  metalness,
            roughness:  roughness,
            transparent: true,
            opacity:    opacity,
            side:       THREE.DoubleSide,
            depthWrite: false,
          })
        }
      }
    })
  }, [clonedScene, isClean, heatmapEnabled, comparisonSlider, selectedMetal])

  return <primitive object={clonedScene} />
}

export default function Viewer() {
  const { analytics, setStatus, setJobId, reset, setErrorMessage } = useStore()
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
      <Canvas shadows camera={{ position: [0, 0, 50], fov: 45 }}>
        <color attach="background" args={['#0a0a0a']} />
        <Suspense fallback={null}>
          <Stage environment="apartment" intensity={0.6}>
            {isCompleted && cleanModelUrl && (
              <group>
                <Model url={cleanModelUrl} isClean={true}  />
                <Model url={rawModelUrl}   isClean={false} />
              </group>
            )}
          </Stage>
        </Suspense>
        <OrbitControls makeDefault autoRotate autoRotateSpeed={1} />
      </Canvas>

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
