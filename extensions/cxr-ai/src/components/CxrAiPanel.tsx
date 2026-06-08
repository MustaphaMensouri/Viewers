import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  FooterAction,
  Icons,
  MeasurementTable,
  ScrollArea,
} from '@ohif/ui-next';
import {
  getHealth,
  getApiBaseUrl,
  predictImage,
  type PredictionItem,
} from '../services/aiApi';
import { captureActiveViewportAsJpegBlob } from '../services/viewportCapture';
import {
  showHeatmapLayer,
  showAttentionBoxesLayer,
  clearAiLayers,
} from '../services/viewportOverlay';
import {
  getAiAnalysisState,
  getSelectedPrediction,
  removeAiPrediction,
  resetAiAnalysisState,
  setAiAnalysisState,
  subscribeAiAnalysisStore,
  type AiAnalysisState,
} from '../services/aiAnalysisStore';
import AiPredictionItems from './AiPredictionItems';

type CxrAiPanelProps = {
  servicesManager?: {
    services?: {
      uiModalService?: {
        show: (options: Record<string, unknown>) => void;
      };
    };
  };
};

function formatPercent(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

function getBoxesCount(prediction: PredictionItem) {
  return prediction.attention_boxes?.length || 0;
}

function PredictionDetailsModal({ prediction, hide }: { prediction: PredictionItem; hide?: () => void }) {
  return (
    <div className="text-foreground text-[13px]">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 border-b border-primary-dark pb-2">
          <div className="font-semibold">{prediction.label}</div>
          <div className="text-primary-light font-semibold">{formatPercent(prediction.probability)}</div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div className="text-muted-foreground">Threshold</div>
          <div>{formatPercent(prediction.threshold)}</div>

          <div className="text-muted-foreground">Positive</div>
          <div>{prediction.positive ? 'Yes' : 'No'}</div>

          <div className="text-muted-foreground">Boxes</div>
          <div>{getBoxesCount(prediction)}</div>

          <div className="text-muted-foreground">Heatmap</div>
          <div>{prediction.heatmap_png ? 'Available' : 'Not available'}</div>

          <div className="text-muted-foreground">Explanation</div>
          <div>{prediction.explanation_method || '—'}</div>
        </div>

        <p className="pt-2 text-[12px] leading-5 text-muted-foreground">
          AI focus boxes are Grad-CAM++ attention regions. They are visual explanation regions,
          not exact pathology boundaries.
        </p>
      </div>

      <FooterAction className="mt-4">
        <FooterAction.Right>
          <FooterAction.Primary onClick={() => hide?.()}>Close</FooterAction.Primary>
        </FooterAction.Right>
      </FooterAction>
    </div>
  );
}

function AiAnalysisActions({
  loading,
  predicting,
  isOnline,
  hasPredictions,
  onHealth,
  onRun,
  onDelete,
}: {
  loading: boolean;
  predicting: boolean;
  isOnline: boolean;
  hasPredictions: boolean;
  onHealth: (event: React.MouseEvent) => void;
  onRun: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}) {
  const canRun = isOnline && !predicting;

  return (
    <div className="bg-background flex h-9 w-full items-center rounded pr-0.5">
      <div className="flex space-x-1">
        <Button
          size="sm"
          variant="ghost"
          className="pl-1.5"
          disabled={loading}
          onClick={onHealth}
        >
          <span className="pr-1">⟳</span>
          <span>{loading ? 'Checking' : 'Health'}</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="pl-0.5"
          disabled={!canRun}
          title={!isOnline ? 'Click Health first. Run is enabled only when the API is online.' : 'Run AI analysis'}
          onClick={onRun}
        >
          <Icons.Add />
          <span>{predicting ? 'Running' : 'Run'}</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="pl-0.5"
          disabled={!hasPredictions || predicting}
          onClick={onDelete}
        >
          <Icons.Delete />
          <span>Delete</span>
        </Button>
      </div>
    </div>
  );
}

function CxrAiPanel({ servicesManager }: CxrAiPanelProps) {
  const [analysis, setAnalysis] = useState<AiAnalysisState>(getAiAnalysisState());
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);

  const selectedPrediction = useMemo(
    () => analysis.predictions.find(prediction => prediction.label === analysis.selectedLabel) || null,
    [analysis.predictions, analysis.selectedLabel]
  );

  const isOnline = analysis.health?.status === 'ok';

  function openPredictionDialog(prediction: PredictionItem) {
    const uiModalService = servicesManager?.services?.uiModalService;

    if (uiModalService?.show) {
      uiModalService.show({
        title: 'AI Prediction',
        content: PredictionDetailsModal,
        contentProps: {
          prediction,
        },
      });
      return;
    }

    window.alert(
      `${prediction.label}\nProbability: ${formatPercent(prediction.probability)}\nThreshold: ${formatPercent(
        prediction.threshold
      )}`
    );
  }

  function drawPredictionLayers(
    prediction: PredictionItem | null,
    state: AiAnalysisState = getAiAnalysisState()
  ) {
    clearAiLayers();

    if (!prediction || !state.heatmapSize) {
      return;
    }

    if (prediction.heatmap_png) {
      showHeatmapLayer(prediction.heatmap_png, state.showHeatmap, state.heatmapOpacity);
    }

    if (prediction.attention_boxes?.length) {
      showAttentionBoxesLayer(prediction.attention_boxes, state.heatmapSize, state.showBoxes, {
        label: prediction.label,
        onBoxClick: () => openPredictionDialog(prediction),
      });
    }
  }

  function redrawSelectedPrediction(nextState: AiAnalysisState = getAiAnalysisState()) {
    const prediction = nextState.predictions.find(item => item.label === nextState.selectedLabel) || null;
    drawPredictionLayers(prediction, nextState);
  }

  async function checkHealth(event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();

    try {
      setLoading(true);
      setAiAnalysisState({ error: null });

      const data = await getHealth();
      setAiAnalysisState({ health: data, error: null });
    } catch (err) {
      setAiAnalysisState({
        health: null,
        error: err instanceof Error ? err.message : 'Backend unavailable',
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAiAnalysis(event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();

    if (!isOnline || predicting) {
      return;
    }

    try {
      setPredicting(true);
      clearAiLayers();
      setAiAnalysisState({
        isExpanded: true,
        error: null,
        predictions: [],
        selectedLabel: null,
        heatmapSize: null,
      });

      const imageBlob = await captureActiveViewportAsJpegBlob();
      const result = await predictImage(imageBlob, 10, 5);
      const nextPredictions = result.predictions || [];
      const firstWithExplanation =
        nextPredictions.find(item => item.attention_boxes?.length || item.heatmap_png) || null;

      const nextState = setAiAnalysisState({
        predictions: nextPredictions,
        selectedLabel: firstWithExplanation?.label || null,
        heatmapSize: result.heatmap_size || null,
        showBoxes: true,
        showHeatmap: false,
        heatmapOpacity: getAiAnalysisState().heatmapOpacity,
      });

      if (firstWithExplanation) {
        drawPredictionLayers(firstWithExplanation, nextState);
      }
    } catch (err) {
      clearAiLayers();
      setAiAnalysisState({
        error: err instanceof Error ? err.message : 'AI analysis failed',
      });
    } finally {
      setPredicting(false);
    }
  }

  function selectPrediction(prediction: PredictionItem) {
    const nextState = setAiAnalysisState({ selectedLabel: prediction.label });
    drawPredictionLayers(prediction, nextState);
  }

  function togglePredictionVisibility(prediction: PredictionItem) {
    const currentState = getAiAnalysisState();
    const isCurrentlyVisible = currentState.selectedLabel === prediction.label;
    const nextState = setAiAnalysisState({
      selectedLabel: isCurrentlyVisible ? null : prediction.label,
    });

    drawPredictionLayers(isCurrentlyVisible ? null : prediction, nextState);
  }

  function toggleBoxes(nextValue: boolean) {
    const nextState = setAiAnalysisState({ showBoxes: nextValue });
    redrawSelectedPrediction(nextState);
  }

  function toggleHeatmap(nextValue: boolean) {
    const nextState = setAiAnalysisState({ showHeatmap: nextValue });
    redrawSelectedPrediction(nextState);
  }

  function updateHeatmapOpacity(nextValue: number) {
    const nextState = setAiAnalysisState({ heatmapOpacity: nextValue });
    redrawSelectedPrediction(nextState);
  }

  function clearPredictions(event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    resetAiAnalysisState();
    clearAiLayers();
  }

  function deletePrediction(prediction: PredictionItem) {
    const nextState = removeAiPrediction(prediction.label);
    redrawSelectedPrediction(nextState);
  }

  useEffect(() => {
    const unsubscribe = subscribeAiAnalysisStore(nextState => {
      setAnalysis({ ...nextState });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const state = getAiAnalysisState();
    const prediction = getSelectedPrediction();

    if (prediction) {
      drawPredictionLayers(prediction, state);
    }
    }, []);

  return (
  <ScrollArea>
    <div
      className="bg-black text-foreground flex h-full min-h-0 flex-col overflow-hidden p-0.5"
      data-cy="cxr-ai-panel"
    >
      <MeasurementTable
        title="AI Analysis"
        data={analysis.predictions}
        isExpanded={analysis.isExpanded}
      >
        <MeasurementTable.Header key="cxrAiMeasurementTableHeader">
          <div className="bg-background flex h-9 w-full items-center justify-between rounded pr-0.5">
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                className="pl-1.5"
                disabled={loading}
                onClick={checkHealth}
              >
                <span className="pr-1">⟳</span>
                <span>{loading ? 'Checking' : 'Health'}</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="pl-0.5"
                disabled={!isOnline || predicting}
                title={!isOnline ? 'Click Health first. Run is enabled only when the API is online.' : 'Run AI analysis'}
                onClick={runAiAnalysis}
              >
                <Icons.Add />
                <span>{predicting ? 'Running' : 'Run'}</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="pl-0.5"
                disabled={analysis.predictions.length === 0 || predicting}
                onClick={clearPredictions}
              >
                <Icons.Delete />
                <span>Delete</span>
              </Button>
            </div>

            <span
              className={`mr-2 shrink-0 text-[11px] font-medium ${
                loading
                  ? 'text-muted-foreground'
                  : isOnline
                    ? 'text-aqua-pale'
                    : 'text-muted-foreground'
              }`}
              title={isOnline ? 'AI backend online' : 'AI backend offline'}
            >
              {loading ? 'Checking' : isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {analysis.error && (
            <div className="border-primary-dark bg-primary-dark/10 my-2 rounded border px-3 py-2 text-[12px]">
              <div className="text-red-400">{analysis.error}</div>
            </div>
          )}

          {predicting && (
            <div className="border-primary-dark bg-primary-dark/10 text-muted-foreground my-2 rounded border px-3 py-3 text-[12px]">
              Running AI analysis on the active viewport…
            </div>
          )}

          {!predicting && analysis.predictions.length === 0 && (
            <div className="border-primary-dark bg-primary-dark/10 text-muted-foreground my-2 rounded border border-dashed px-3 py-6 text-center text-[12px]">
              Click Health, then Run to analyze the active viewport.
            </div>
          )}

          {analysis.predictions.length > 0 && (
            <AiPredictionItems
              items={analysis.predictions}
              selectedLabel={analysis.selectedLabel}
              onSelect={selectPrediction}
              onToggleVisibility={togglePredictionVisibility}
              onDetails={openPredictionDialog}
              onDelete={deletePrediction}
            />
          )}

          {selectedPrediction && (
            <div className="border-primary-dark bg-primary-dark/10 mt-3 rounded border px-3 py-3">
              <div className="mb-2 truncate text-[13px] font-semibold">
                Viewer overlay: {selectedPrediction.label}
              </div>

              <div className="space-y-2 text-[12px]">
                <label className="flex items-center justify-between gap-2">
                  <span>AI focus boxes</span>
                  <input
                    type="checkbox"
                    checked={analysis.showBoxes}
                    onChange={event => toggleBoxes(event.target.checked)}
                  />
                </label>

                <label className="flex items-center justify-between gap-2">
                  <span>Raw heatmap</span>
                  <input
                    type="checkbox"
                    checked={analysis.showHeatmap}
                    disabled={!selectedPrediction.heatmap_png}
                    onChange={event => toggleHeatmap(event.target.checked)}
                  />
                </label>

                {analysis.showHeatmap && selectedPrediction.heatmap_png && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Heatmap opacity</div>
                    <input
                      className="w-full"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={analysis.heatmapOpacity}
                      onChange={event => updateHeatmapOpacity(Number(event.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </MeasurementTable.Header>
      </MeasurementTable>
    </div>
  </ScrollArea>
);
}

export default CxrAiPanel;
