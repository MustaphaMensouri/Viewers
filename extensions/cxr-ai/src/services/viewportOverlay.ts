type AttentionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  score?: number;
};

type AttentionBoxLayerOptions = {
  label?: string;
  onBoxClick?: (box: AttentionBox, index: number) => void;
};

let layerRoot: HTMLDivElement | null = null;
let heatmapEl: HTMLImageElement | null = null;
let boxesEl: HTMLDivElement | null = null;

function getActiveViewportCanvas(): HTMLCanvasElement {
  const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];

  const visible = canvases.filter(canvas => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 100 && rect.height > 100 && canvas.width > 100 && canvas.height > 100;
  });

  if (!visible.length) {
    throw new Error('No visible viewport canvas found.');
  }

  return visible.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
}

function ensureLayerRoot() {
  const canvas = getActiveViewportCanvas();
  const parent = canvas.parentElement as HTMLElement | null;

  if (!parent) {
    throw new Error('Viewport parent container not found.');
  }

  if (window.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  if (!layerRoot) {
    layerRoot = document.createElement('div');
    layerRoot.style.position = 'absolute';
    layerRoot.style.pointerEvents = 'none';
    layerRoot.style.zIndex = '40';
    layerRoot.style.overflow = 'hidden';
  }

  layerRoot.style.left = `${canvas.offsetLeft}px`;
  layerRoot.style.top = `${canvas.offsetTop}px`;
  layerRoot.style.width = `${canvas.clientWidth}px`;
  layerRoot.style.height = `${canvas.clientHeight}px`;

  if (!parent.contains(layerRoot)) {
    parent.appendChild(layerRoot);
  }

  return { layerRoot, canvas };
}

export function showHeatmapLayer(base64Png: string, visible: boolean, opacity = 1) {
  const { layerRoot } = ensureLayerRoot();

  if (!heatmapEl) {
    heatmapEl = document.createElement('img');
    heatmapEl.style.position = 'absolute';
    heatmapEl.style.left = '0';
    heatmapEl.style.top = '0';
    heatmapEl.style.width = '100%';
    heatmapEl.style.height = '100%';
    heatmapEl.style.objectFit = 'fill';
    heatmapEl.style.pointerEvents = 'none';
    layerRoot.appendChild(heatmapEl);
  }

  heatmapEl.src = `data:image/png;base64,${base64Png}`;
  heatmapEl.style.display = visible ? 'block' : 'none';
  heatmapEl.style.opacity = String(opacity);
}

export function showAttentionBoxesLayer(
  boxes: AttentionBox[],
  heatmapSize: { width: number; height: number },
  visible: boolean,
  options: AttentionBoxLayerOptions = {}
) {
  const { layerRoot, canvas } = ensureLayerRoot();

  if (!boxesEl) {
    boxesEl = document.createElement('div');
    boxesEl.style.position = 'absolute';
    boxesEl.style.left = '0';
    boxesEl.style.top = '0';
    boxesEl.style.width = '100%';
    boxesEl.style.height = '100%';
    boxesEl.style.pointerEvents = 'none';
    layerRoot.appendChild(boxesEl);
  }

  boxesEl.innerHTML = '';
  boxesEl.style.display = visible ? 'block' : 'none';

  const scaleX = canvas.clientWidth / heatmapSize.width;
  const scaleY = canvas.clientHeight / heatmapSize.height;

  boxes.forEach((box, index) => {
    const div = document.createElement('div');

    div.style.position = 'absolute';
    div.style.left = `${box.x * scaleX}px`;
    div.style.top = `${box.y * scaleY}px`;
    div.style.width = `${box.width * scaleX}px`;
    div.style.height = `${box.height * scaleY}px`;
    div.style.border = '2px dashed #facc15';
    div.style.borderRadius = '2px';
    div.style.boxSizing = 'border-box';
    div.style.cursor = 'pointer';
    div.style.pointerEvents = 'auto';
    div.style.transition = 'border-color 120ms ease, box-shadow 120ms ease';

    const label = document.createElement('div');
    label.textContent = options.label ? `${options.label} ${index + 1}` : `AI focus ${index + 1}`;
    label.style.position = 'absolute';
    label.style.left = '0';
    label.style.top = '-23px';
    label.style.maxWidth = '220px';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';
    label.style.background = 'rgba(15, 23, 42, 0.92)';
    label.style.border = '1px solid rgba(250, 204, 21, 0.9)';
    label.style.color = '#facc15';
    label.style.fontSize = '11px';
    label.style.lineHeight = '16px';
    label.style.padding = '1px 6px';
    label.style.borderRadius = '3px';
    label.style.display = 'none';
    label.style.pointerEvents = 'none';

    div.addEventListener('mouseenter', () => {
      div.style.borderColor = '#22c55e';
      div.style.boxShadow = '0 0 0 1px rgba(34, 197, 94, 0.9)';
      label.style.display = 'block';
      label.style.borderColor = 'rgba(34, 197, 94, 0.9)';
      label.style.color = '#86efac';
    });

    div.addEventListener('mouseleave', () => {
      div.style.borderColor = '#facc15';
      div.style.boxShadow = 'none';
      label.style.display = 'none';
      label.style.borderColor = 'rgba(250, 204, 21, 0.9)';
      label.style.color = '#facc15';
    });

    if (options.onBoxClick) {
      div.addEventListener('click', event => {
        event.stopPropagation();
        options.onBoxClick?.(box, index);
      });
    }

    div.appendChild(label);
    boxesEl!.appendChild(div);
  });
}

export function clearAiLayers() {
  if (layerRoot && layerRoot.parentElement) {
    layerRoot.parentElement.removeChild(layerRoot);
  }

  layerRoot = null;
  heatmapEl = null;
  boxesEl = null;
}
