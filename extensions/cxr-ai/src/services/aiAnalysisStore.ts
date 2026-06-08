import type { PredictionItem } from './aiApi';

export type HealthState = {
  status?: string;
  device?: string;
  num_labels?: number;
  artifact?: string;
};

export type HeatmapSize = {
  width: number;
  height: number;
};

export type AiAnalysisState = {
  isExpanded: boolean;
  health: HealthState | null;
  error: string | null;
  predictions: PredictionItem[];
  selectedLabel: string | null;
  heatmapSize: HeatmapSize | null;
  showBoxes: boolean;
  showHeatmap: boolean;
  heatmapOpacity: number;
};

const initialState: AiAnalysisState = {
  isExpanded: true,
  health: null,
  error: null,
  predictions: [],
  selectedLabel: null,
  heatmapSize: null,
  showBoxes: true,
  showHeatmap: false,
  heatmapOpacity: 0.6,
};

let state: AiAnalysisState = { ...initialState };
const listeners = new Set<(nextState: AiAnalysisState) => void>();

function notify() {
  listeners.forEach(listener => listener({ ...state }));
}

export function getAiAnalysisState() {
  return state;
}

export function setAiAnalysisState(patch: Partial<AiAnalysisState>) {
  state = {
    ...state,
    ...patch,
  };
  notify();
  return state;
}

export function resetAiAnalysisState() {
  state = {
    ...initialState,
    health: state.health,
  };
  notify();
  return state;
}

export function removeAiPrediction(label: string) {
  const predictions = state.predictions.filter(prediction => prediction.label !== label);
  const selectedLabel = state.selectedLabel === label ? null : state.selectedLabel;

  state = {
    ...state,
    predictions,
    selectedLabel,
  };

  notify();
  return state;
}

export function getSelectedPrediction() {
  return state.predictions.find(prediction => prediction.label === state.selectedLabel) || null;
}

export function subscribeAiAnalysisStore(listener: (nextState: AiAnalysisState) => void) {
  listeners.add(listener);
  listener({ ...state });

  return () => {
    listeners.delete(listener);
  };
}
