export async function captureActiveViewportAsJpegBlob(
  maxSize = 768,
  quality = 0.9
): Promise<Blob> {
  const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];

  const visibleCanvases = canvases.filter(canvas => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 100 && rect.height > 100 && canvas.width > 100 && canvas.height > 100;
  });

  if (!visibleCanvases.length) {
    throw new Error('No visible OHIF viewport canvas found.');
  }

  // Choose the largest visible canvas, usually the active image viewport
  const sourceCanvas = visibleCanvases.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA;
  })[0];

  const scale = Math.min(maxSize / sourceCanvas.width, maxSize / sourceCanvas.height, 1);
  const targetWidth = Math.round(sourceCanvas.width * scale);
  const targetHeight = Math.round(sourceCanvas.height * scale);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;

  const ctx = outputCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not create canvas context.');
  }

  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Could not convert viewport to JPEG.'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}
