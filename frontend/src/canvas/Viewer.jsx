import React, { Suspense, useMemo, useLayoutEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { useStore, METALS } from '../store/useStore'
import * as THREE from 'three'

function Model({ url, isClean }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(), [scene])

  const heatmapEnabled = useStore(state => state.heatmapEnabled)
  const overlayOpacity = useStore(state => state.overlayOpacity)
  const selectedMetal  = useStore(state => state.selectedMetal)

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
          const opacity    = isClean ? overlayOpacity : (1 - overlayOpacity)

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
  }, [clonedScene, isClean, heatmapEnabled, overlayOpacity, selectedMetal])

  return <primitive object={clonedScene} />
}

export default function Viewer() {
  const { analytics } = useStore()
  const isCompleted = analytics && analytics.length > 0

  const item_id = isCompleted ? analytics[0].item_id : null
  const baseUrl  = `http://localhost:8000/api/v1/jobs/items/${item_id}/download`
  const cleanModelUrl = isCompleted ? `${baseUrl}?type=clean_lod#.glb` : null
  const rawModelUrl   = isCompleted ? `${baseUrl}?type=raw_lod#.glb`   : null

  return (
    <div className="w-full h-full absolute inset-0">
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
    </div>
  )
}
