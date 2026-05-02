import React from 'react'
import { useStore, METALS } from '../store/useStore'
import { Activity, CircleDashed, Gem, Weight, SlidersHorizontal, Layers, Box } from 'lucide-react'

export default function Dashboard() {
  const {
    analytics, heatmapEnabled, setHeatmapEnabled,
    overlayOpacity, setOverlayOpacity,
    selectedMetal, setSelectedMetal
  } = useStore()

  if (!analytics || analytics.length === 0) return null

  const data   = analytics[0].result
  const metal  = METALS[selectedMetal]

  // ── Physics ──────────────────────────────────────────────────────────────
  const volume = data.volume_mm3 || data.mcp_params?.volume_mm3 || 0
  const area   = data.area_mm2   || data.mcp_params?.area_mm2   || 0

  // ── Cost Estimator ────────────────────────────────────────────────────────
  // Weight (g) = Volume (mm³) / 1000 × density (g/cm³)
  const weight = (volume / 1000) * metal.density
  // Cost  ($)  = Weight (g) × price per gram
  const cost   = weight * metal.price

  // ── Ring size / geometry info ─────────────────────────────────────────────
  const ringSize   = data.mcp_params?.ring_size
  const bbox       = data.mcp_params?.bounding_box   // { x, y, z } in mm — fallback for pendants
  const isRing     = ringSize && ringSize > 0
  const bbLabel    = bbox
    ? `${bbox.x?.toFixed(1)} × ${bbox.y?.toFixed(1)} × ${bbox.z?.toFixed(1)} mm`
    : null

  return (
    <div className="space-y-4 text-neutral-300 animate-in fade-in duration-500">

      {/* ── View Controls ─────────────────────────────────────────── */}
      <div className="bg-neutral-800 rounded-lg p-4 space-y-4 border border-neutral-700/50 shadow-lg">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <SlidersHorizontal size={14} /> View Controls
        </h3>

        <div className="flex items-center justify-between">
          <label className="text-sm">Noise Heatmap</label>
          <button
            onClick={() => setHeatmapEnabled(!heatmapEnabled)}
            className={`w-10 h-5 rounded-full transition-colors ${heatmapEnabled ? 'bg-amber-500' : 'bg-neutral-600'} relative`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${heatmapEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-neutral-700/50">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Raw Scan</span>
            <span>Clean ({metal.name})</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.01"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            className="w-full accent-amber-500 bg-neutral-700 h-1 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* ── Cost Estimator ────────────────────────────────────────── */}
      <div className="bg-neutral-800 rounded-lg p-4 space-y-4 border border-neutral-700/50 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <Weight size={14} /> Cost Estimator
        </h3>

        {/* Metal dropdown — dispatches to global store, Viewer reacts instantly */}
        <select
          value={selectedMetal}
          onChange={(e) => setSelectedMetal(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded p-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors"
        >
          {Object.entries(METALS).map(([key, m]) => (
            <option key={key} value={key}>{m.name} (${m.price}/g)</option>
          ))}
        </select>

        <div className="flex justify-between items-end pt-1">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Est. Weight</div>
            <div className="text-lg font-medium">{weight.toFixed(2)} g</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Material Cost</div>
            <div className="text-2xl font-bold text-amber-500">${cost.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ── Metrics grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Volume */}
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700/50">
          <Box size={18} className="text-neutral-500 mb-3" />
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Volume</div>
          <div className="text-lg font-medium">
            {volume > 0 ? `${volume.toFixed(1)} mm³` : '—'}
          </div>
        </div>

        {/* Ring Size or Bounding Box */}
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700/50">
          <CircleDashed size={18} className="text-neutral-500 mb-3" />
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
            {isRing ? 'Ring Size' : 'Dimensions'}
          </div>
          <div className="text-lg font-medium leading-tight">
            {isRing
              ? `⌀ ${ringSize} mm`
              : (bbLabel || '—')
            }
          </div>
        </div>

        {/* Surface Area */}
        {area > 0 && (
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700/50 col-span-2">
            <Layers size={18} className="text-neutral-500 mb-3" />
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Surface Area</div>
            <div className="text-lg font-medium">{area.toFixed(1)} mm²</div>
          </div>
        )}

        {/* Polygon count */}
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700/50 col-span-2">
          <Activity size={18} className="text-neutral-500 mb-3" />
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Polygons (LOD)</div>
          <div className="text-lg font-medium">≤ 100k faces</div>
        </div>
      </div>

      {/* ── Stones ───────────────────────────────────────────────── */}
      {data.stones_count > 0 && (
        <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/20 rounded-lg p-4 flex items-center justify-between border border-blue-800/50">
          <div className="flex items-center gap-3 text-blue-400">
            <Gem size={20} />
            <span className="font-medium tracking-wide">Stones Found</span>
          </div>
          <span className="text-2xl font-bold text-white">{data.stones_count}</span>
        </div>
      )}
    </div>
  )
}
