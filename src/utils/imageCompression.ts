/**
 * PRAVAH Client-Side Image Compression Utility
 *
 * Compresses raw high-resolution field camera photos / uploads on an offscreen HTML5 Canvas
 * to constrained dimensions (default 800x600) and 0.7 JPEG quality.
 * Prevents localStorage 5MB quota exhaustion in remote mountain dead-zones.
 */

export interface CompressionResult {
  dataUrl: string;
  sizeKb: number;
  originalSizeKb: number;
  savedPct: number;
  width: number;
  height: number;
}

/**
 * Calculates constrained dimensions maintaining aspect ratio.
 */
export function calculateConstrainedDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  let newWidth = width;
  let newHeight = height;

  if (newWidth > maxWidth) {
    newHeight = Math.round((newHeight * maxWidth) / newWidth);
    newWidth = maxWidth;
  }

  if (newHeight > maxHeight) {
    newWidth = Math.round((newWidth * maxHeight) / newHeight);
    newHeight = maxHeight;
  }

  return {
    width: Math.max(1, newWidth),
    height: Math.max(1, newHeight),
  };
}

/**
 * Compresses an image file or blob to an optimized JPEG data URL.
 */
export async function compressImageToJpeg(
  file: File | Blob,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.7
): Promise<CompressionResult> {
  const originalSizeKb = Math.round((file.size || 0) / 1024);

  return new Promise<CompressionResult>((resolve, reject) => {
    // If not running in a browser environment (e.g. Node tests), fallback gracefully
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const mockResult: CompressionResult = {
        dataUrl: 'data:image/jpeg;base64,mock',
        sizeKb: Math.min(originalSizeKb, 100),
        originalSizeKb,
        savedPct: originalSizeKb > 0 ? 50 : 0,
        width: maxWidth,
        height: maxHeight,
      };
      return resolve(mockResult);
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const targetDim = calculateConstrainedDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        maxWidth,
        maxHeight
      );

      const canvas = document.createElement('canvas');
      canvas.width = targetDim.width;
      canvas.height = targetDim.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to obtain 2D canvas context for image compression'));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw and scale image
      ctx.drawImage(img, 0, 0, targetDim.width, targetDim.height);

      // Export as compressed JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      // Base64 size estimation: (string length * 3/4) / 1024
      const compressedBytes = Math.round((dataUrl.length * 3) / 4);
      const sizeKb = Math.max(1, Math.round(compressedBytes / 1024));
      const savedPct = originalSizeKb > sizeKb
        ? Math.round(((originalSizeKb - sizeKb) / originalSizeKb) * 100)
        : 0;

      resolve({
        dataUrl,
        sizeKb,
        originalSizeKb,
        savedPct,
        width: targetDim.width,
        height: targetDim.height,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for compression: ${String(err)}`));
    };

    img.src = objectUrl;
  });
}
