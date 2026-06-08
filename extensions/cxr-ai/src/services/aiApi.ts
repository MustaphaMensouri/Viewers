const API_BASE_URL =
  window.localStorage.getItem('CXR_AI_API_URL') || 'https://richly-ladies-flyer.ngrok-free.dev';

export type AttentionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  score?: number;
};

export type PredictionItem = {
  label: string;
  probability: number;
  threshold: number;
  positive: boolean;
  heatmap_png?: string;
  heatmap_mime_type?: string;
  explanation_method?: string;
  attention_boxes?: AttentionBox[];
};

export type PredictResponse = {
  filename: string;
  top_k: number;
  max_explanations: number;
  predictions: PredictionItem[];
  heatmap_size?: {
    width: number;
    height: number;
  };
};

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json();
}

export async function predictImage(
  imageBlob: Blob,
  topK = 10,
  maxExplanations = 5
): Promise<PredictResponse> {
  const formData = new FormData();

  formData.append('file', imageBlob, 'ohif-viewport.jpg');

  const url = `${API_BASE_URL}/predict?top_k=${topK}&max_explanations=${maxExplanations}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Prediction failed: ${response.status} ${message}`);
  }

  return response.json();
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
