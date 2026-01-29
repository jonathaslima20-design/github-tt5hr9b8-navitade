interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // Set each dimensions to double largest dimension to allow for a safe area for the
  // image to rotate in without being clipped by canvas context
  canvas.width = safeArea;
  canvas.height = safeArea;

  // Translate canvas context to a central location on image to allow rotating around the center
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // Draw rotated image and store data
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // Set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Paste generated rotate image with correct offsets for x,y crop values
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  // Convert canvas to optimized blob with size limit of 400KB
  return optimizeImageSize(canvas, 400 * 1024); // 400KB limit
}

/**
 * Optimizes image size by adjusting quality until it's under the specified size limit
 */
async function optimizeImageSize(canvas: HTMLCanvasElement, maxSizeBytes: number): Promise<Blob> {
  const MAX_QUALITY = 0.95;
  const MIN_QUALITY = 0.1;
  const QUALITY_STEP = 0.05;
  
  let quality = MAX_QUALITY;
  let blob: Blob | null = null;
  
  console.log('🖼️ Starting image optimization with max size:', maxSizeBytes / 1024, 'KB');
  
  while (quality >= MIN_QUALITY) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => resolve(result),
        'image/jpeg',
        quality
      );
    });
    
    if (!blob) {
      throw new Error('Failed to create blob from canvas');
    }
    
    console.log(`🖼️ Quality ${(quality * 100).toFixed(0)}%: ${(blob.size / 1024).toFixed(1)}KB`);
    
    // If size is acceptable, return the blob
    if (blob.size <= maxSizeBytes) {
      console.log('✅ Image optimized successfully:', {
        finalQuality: (quality * 100).toFixed(0) + '%',
        finalSize: (blob.size / 1024).toFixed(1) + 'KB',
        originalCanvas: `${canvas.width}x${canvas.height}`
      });
      return blob;
    }
    
    // Reduce quality for next iteration
    quality -= QUALITY_STEP;
  }
  
  // If we couldn't get under the size limit even at minimum quality,
  // try reducing the canvas dimensions
  if (blob && blob.size > maxSizeBytes) {
    console.log('⚠️ Could not optimize with quality reduction, trying dimension reduction...');
    return optimizeImageDimensions(canvas, maxSizeBytes);
  }
  
  // Fallback: return the last blob even if it's over the limit
  if (blob) {
    console.warn('⚠️ Could not optimize image under size limit, returning best attempt:', {
      size: (blob.size / 1024).toFixed(1) + 'KB',
      quality: (MIN_QUALITY * 100).toFixed(0) + '%'
    });
    return blob;
  }
  
  throw new Error('Failed to optimize image');
}

/**
 * Optimizes image by reducing dimensions when quality reduction isn't enough
 */
async function optimizeImageDimensions(originalCanvas: HTMLCanvasElement, maxSizeBytes: number): Promise<Blob> {
  const MAX_DIMENSION = 1200;
  const MIN_DIMENSION = 400;
  const DIMENSION_STEP = 100;
  
  let currentDimension = Math.min(MAX_DIMENSION, Math.max(originalCanvas.width, originalCanvas.height));
  
  while (currentDimension >= MIN_DIMENSION) {
    // Calculate new dimensions maintaining aspect ratio
    const aspectRatio = originalCanvas.width / originalCanvas.height;
    let newWidth, newHeight;
    
    if (originalCanvas.width > originalCanvas.height) {
      newWidth = currentDimension;
      newHeight = currentDimension / aspectRatio;
    } else {
      newHeight = currentDimension;
      newWidth = currentDimension * aspectRatio;
    }
    
    // Create new canvas with reduced dimensions
    const resizedCanvas = document.createElement('canvas');
    const resizedCtx = resizedCanvas.getContext('2d');
    
    if (!resizedCtx) {
      throw new Error('No 2d context for resized canvas');
    }
    
    resizedCanvas.width = newWidth;
    resizedCanvas.height = newHeight;
    
    // Draw the original canvas onto the resized canvas
    resizedCtx.drawImage(originalCanvas, 0, 0, newWidth, newHeight);
    
    // Try to create blob with good quality
    const blob = await new Promise<Blob | null>((resolve) => {
      resizedCanvas.toBlob(
        (result) => resolve(result),
        'image/jpeg',
        0.85 // Good quality for resized image
      );
    });
    
    if (!blob) {
      currentDimension -= DIMENSION_STEP;
      continue;
    }
    
    console.log(`🖼️ Dimension ${currentDimension}px: ${(blob.size / 1024).toFixed(1)}KB`);
    
    if (blob.size <= maxSizeBytes) {
      console.log('✅ Image optimized with dimension reduction:', {
        dimensions: `${newWidth.toFixed(0)}x${newHeight.toFixed(0)}`,
        size: (blob.size / 1024).toFixed(1) + 'KB'
      });
      return blob;
    }
    
    currentDimension -= DIMENSION_STEP;
  }
  
  // Final fallback: create a very small image
  const fallbackCanvas = document.createElement('canvas');
  const fallbackCtx = fallbackCanvas.getContext('2d');
  
  if (fallbackCtx) {
    fallbackCanvas.width = MIN_DIMENSION;
    fallbackCanvas.height = MIN_DIMENSION;
    fallbackCtx.drawImage(originalCanvas, 0, 0, MIN_DIMENSION, MIN_DIMENSION);
    
    const fallbackBlob = await new Promise<Blob | null>((resolve) => {
      fallbackCanvas.toBlob(
        (result) => resolve(result),
        'image/jpeg',
        0.7
      );
    });
    
    if (fallbackBlob) {
      console.warn('⚠️ Using fallback dimensions:', {
        dimensions: `${MIN_DIMENSION}x${MIN_DIMENSION}`,
        size: (fallbackBlob.size / 1024).toFixed(1) + 'KB'
      });
      return fallbackBlob;
    }
  }
  
  throw new Error('Failed to optimize image even with dimension reduction');
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
    image.crossOrigin = 'anonymous'; // This is important for handling CORS
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export async function uploadImage(file: File, userId: string, folder: string): Promise<string> {
  const { supabase } = await import('./supabase');

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('public')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteImage(url: string): Promise<void> {
  const { supabase } = await import('./supabase');

  const urlObj = new URL(url);
  const path = urlObj.pathname.split('/public/')[1];

  if (path) {
    const { error } = await supabase.storage
      .from('public')
      .remove([path]);

    if (error) throw error;
  }
}