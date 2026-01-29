export interface ImageFingerprint {
  contentHash: string;
  visualFingerprint: string;
  dimensions: {
    width: number;
    height: number;
  };
  metadata: {
    createdTime?: number;
    size?: number;
  };
}

export interface ImageRegistry {
  sha256Hash: string;
  visualFingerprint: string;
  uniqueId: string;
  dimensions: { width: number; height: number };
  timestamp: number;
}

const imageRegistryMap = new Map<string, ImageRegistry>();

export const generateVisualFingerprint = async (file: File): Promise<string> => {
  try {
    const url = URL.createObjectURL(file);
    const image = new Image();

    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(image, 0, 0, 64, 64);

        const imageData = ctx.getImageData(0, 0, 64, 64);
        const data = imageData.data;

        let fingerprint = '';
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          fingerprint += brightness > 127 ? '1' : '0';
        }

        URL.revokeObjectURL(url);
        resolve(fingerprint);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      image.src = url;
    });
  } catch (error) {
    console.error('Error generating visual fingerprint:', error);
    throw error;
  }
};

export const calculateHammingDistance = (
  fingerprint1: string,
  fingerprint2: string
): number => {
  if (fingerprint1.length !== fingerprint2.length) {
    return Math.max(fingerprint1.length, fingerprint2.length);
  }

  let distance = 0;
  for (let i = 0; i < fingerprint1.length; i++) {
    if (fingerprint1[i] !== fingerprint2[i]) {
      distance++;
    }
  }
  return distance;
};

export const areFingerprintsSimilar = (
  fingerprint1: string,
  fingerprint2: string,
  threshold: number = 5
): boolean => {
  const distance = calculateHammingDistance(fingerprint1, fingerprint2);
  return distance <= threshold;
};

export const extractImageMetadata = async (file: File): Promise<{
  width: number;
  height: number;
  createdTime?: number;
  size: number;
}> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        createdTime: file.lastModified,
        size: file.size,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to extract image metadata'));
    };

    image.src = url;
  });
};

export const generateContentHash = async (file: File): Promise<string> => {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error generating content hash:', error);
    throw error;
  }
};

export const createImageFingerprint = async (
  file: File,
  uniqueId: string
): Promise<ImageFingerprint> => {
  const [contentHash, visualFingerprint, metadata] = await Promise.all([
    generateContentHash(file),
    generateVisualFingerprint(file),
    extractImageMetadata(file),
  ]);

  return {
    contentHash,
    visualFingerprint,
    dimensions: {
      width: metadata.width,
      height: metadata.height,
    },
    metadata: {
      createdTime: metadata.createdTime,
      size: metadata.size,
    },
  };
};

export const registerImageInRegistry = (
  uniqueId: string,
  fingerprint: ImageFingerprint
): void => {
  imageRegistryMap.set(uniqueId, {
    sha256Hash: fingerprint.contentHash,
    visualFingerprint: fingerprint.visualFingerprint,
    uniqueId,
    dimensions: fingerprint.dimensions,
    timestamp: Date.now(),
  });
};

export const checkImageDuplicate = (
  fingerprint: ImageFingerprint,
  similarityThreshold: number = 5
): { isDuplicate: boolean; duplicateId?: string; reason?: string } => {
  for (const [registeredId, registeredFingerprint] of imageRegistryMap) {
    if (fingerprint.contentHash === registeredFingerprint.sha256Hash) {
      return {
        isDuplicate: true,
        duplicateId: registeredId,
        reason: 'Exact SHA-256 match (identical file content)',
      };
    }

    const dimensionMatch =
      fingerprint.dimensions.width === registeredFingerprint.dimensions.width &&
      fingerprint.dimensions.height === registeredFingerprint.dimensions.height;

    if (
      dimensionMatch &&
      areFingerprintsSimilar(
        fingerprint.visualFingerprint,
        registeredFingerprint.visualFingerprint,
        similarityThreshold
      )
    ) {
      const distance = calculateHammingDistance(
        fingerprint.visualFingerprint,
        registeredFingerprint.visualFingerprint
      );
      return {
        isDuplicate: true,
        duplicateId: registeredId,
        reason: `Visual similarity match (hamming distance: ${distance}, threshold: ${similarityThreshold})`,
      };
    }
  }

  return { isDuplicate: false };
};

export const removeFromRegistry = (uniqueId: string): void => {
  imageRegistryMap.delete(uniqueId);
};

export const clearImageRegistry = (): void => {
  imageRegistryMap.clear();
};

export const getImageRegistry = (): Map<string, ImageRegistry> => {
  return new Map(imageRegistryMap);
};

export const debugRegistryState = (): void => {
  console.log('📸 Image Registry State:', {
    totalImages: imageRegistryMap.size,
    images: Array.from(imageRegistryMap.entries()).map(([id, data]) => ({
      id,
      hash: data.sha256Hash.substring(0, 12) + '...',
      dimensions: data.dimensions,
      timestamp: new Date(data.timestamp).toISOString(),
    })),
  });
};
