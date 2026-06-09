import { cache } from '@cornerstonejs/core';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function getCurrentImageId(viewport): string {
  if (typeof viewport.getCurrentImageId === 'function') {
    return viewport.getCurrentImageId();
  }

  const imageIds = viewport.getImageIds?.();
  const currentIndex = viewport.getCurrentImageIdIndex?.() ?? 0;

  return imageIds?.[currentIndex];
}

function getCurrentImageIndex(viewport): number {
  if (typeof viewport.getCurrentImageIdIndex === 'function') {
    return viewport.getCurrentImageIdIndex();
  }

  return 0;
}

async function imageToPngBlob(image): Promise<Blob> {
  const width = image.columns || image.width;
  const height = image.rows || image.height;

  const pixelData =
    image.getPixelData?.() ||
    image.voxelManager?.getScalarData?.();

  if (!pixelData || !width || !height) {
    throw new Error('Could not read original image pixels.');
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < pixelData.length; i++) {
    const value = pixelData[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const range = max - min || 1;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context.');
  }

  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i++) {
    const value = Math.round(((pixelData[i] - min) / range) * 255);

    imageData.data[i * 4] = value;
    imageData.data[i * 4 + 1] = value;
    imageData.data[i * 4 + 2] = value;
    imageData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Could not convert original image to PNG.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

export async function runAiLungSegmentation({ servicesManager, commandsManager }) {
  const {
    viewportGridService,
    cornerstoneViewportService,
    segmentationService,
    uiNotificationService,
  } = servicesManager.services;

  try {
    const viewportId = viewportGridService.getActiveViewportId();

    if (!viewportId) {
      throw new Error('No active viewport found.');
    }

    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport) {
      throw new Error('No Cornerstone viewport found.');
    }

    const currentImageId = getCurrentImageId(viewport);
    const currentImageIndex = getCurrentImageIndex(viewport);

    if (!currentImageId) {
      throw new Error('Could not find current imageId.');
    }

    const sourceImage = cache.getImage(currentImageId);

    if (!sourceImage) {
      throw new Error('Could not load original image from Cornerstone cache.');
    }

    const blob = await imageToPngBlob(sourceImage);

    const apiBaseUrl =
      window.localStorage.getItem('CXR_SEGMENTATION_API_URL') || 'https://petite-glue-dispersal.ngrok-free.dev';

    const formData = new FormData();
    formData.append('file', blob, 'original-image.png');

    const response = await fetch(`${apiBaseUrl}/segment-lung`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Segmentation API failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.mask_format !== 'labelmap_uint8_base64') {
      throw new Error(`Unexpected mask format: ${result.mask_format}`);
    }

    const maskData = base64ToUint8Array(result.mask_data);

    const segmentationId = await commandsManager.run('createLabelmapForViewport', {
      viewportId,
      options: {
        label: 'AI Lung Segmentation',
        createInitialSegment: true,
      },
    });

    segmentationService.setSegmentLabel?.(segmentationId, 1, 'Lung');

    try {
      segmentationService.setSegmentColor?.(viewportId, segmentationId, 1, [0, 200, 255, 255]);
    } catch {
      // Color is optional; do not fail segmentation if color setter differs.
    }

    const segmentation = segmentationService.getSegmentation(segmentationId);
    const labelmapData = segmentation?.representationData?.Labelmap;

    const labelmapImageIds = labelmapData?.imageIds;

    if (!labelmapImageIds?.length) {
      throw new Error('Created segmentation has no labelmap imageIds.');
    }

    const targetLabelmapImageId =
      labelmapImageIds[currentImageIndex] || labelmapImageIds[0];

    const labelmapImage = cache.getImage(targetLabelmapImageId);

    if (!labelmapImage) {
      throw new Error('Could not load created labelmap image from cache.');
    }

    const scalarData = labelmapImage.voxelManager.getScalarData();

    if (scalarData.length !== maskData.length) {
      throw new Error(
        `Mask size mismatch. OHIF labelmap has ${scalarData.length} pixels but API returned ${maskData.length}.`
      );
    }

    scalarData.set(maskData);

    labelmapImage.voxelManager.setScalarData?.(scalarData);
    labelmapImage.imageData?.modified?.();

    commandsManager.run('setActiveSegmentation', { segmentationId });

    commandsManager.run('setActiveSegmentAndCenter', {
      segmentationId,
      segmentIndex: 1,
    });

    viewport.setNeedsRender?.();
    viewport.render?.();

    uiNotificationService.show({
      title: 'AI Lung Segmentation',
      message: `Done. Confidence: ${Math.round(result.confidence * 100)}%, Coverage: ${result.coverage_pct}%`,
      type: 'success',
    });
  } catch (error) {
    console.error(error);

    uiNotificationService.show({
      title: 'AI Lung Segmentation',
      message: error.message || 'AI lung segmentation failed.',
      type: 'error',
    });
  }
}
