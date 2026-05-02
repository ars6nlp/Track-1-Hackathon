import { create } from 'zustand'

export const METALS = {
  'gold_14k': { name: 'Gold 14K', density: 13.0, price: 45.00, color: 0xFFD700, metalness: 1.0, roughness: 0.10 },
  'gold_18k': { name: 'Gold 18K', density: 15.6, price: 60.00, color: 0xFFCC00, metalness: 1.0, roughness: 0.08 },
  'silver':   { name: 'Silver 925', density: 10.36, price: 0.80, color: 0xC0C0C0, metalness: 1.0, roughness: 0.20 },
  'platinum': { name: 'Platinum',   density: 21.45, price: 35.00, color: 0xE5E4E2, metalness: 1.0, roughness: 0.05 }
};

export const useStore = create((set) => ({
  jobId: null,
  status: 'idle', // idle, uploading, processing, completed, error
  errorMessage: null,
  analytics: null, // metrics from backend
  files: [],
  heatmapEnabled: false,
  comparisonSlider: 0.5,
  selectedMetal: 'gold_14k',   // shared between Dashboard & Viewer
  setJobId: (id) => set({ jobId: id }),
  setStatus: (status) => set({ status }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setAnalytics: (data) => set({ analytics: data }),
  setHeatmapEnabled: (enabled) => set({ heatmapEnabled: enabled }),
  setComparisonSlider: (val) => set({ comparisonSlider: val }),
  setSelectedMetal: (metal) => set({ selectedMetal: metal }),
  reset: () => set({ jobId: null, status: 'idle', errorMessage: null, analytics: null, files: [], heatmapEnabled: false, selectedMetal: 'gold_14k', comparisonSlider: 0.5 })
}))

