export interface BlobUrlRecord {
  url: string;
  fileHash: string;
  visualFingerprint: string;
  createdAt: number;
}

const blobUrlRegistry = new Map<string, BlobUrlRecord>();
const fileHashToBlobMap = new Map<string, string[]>();

export const registerBlobUrl = (
  blobUrl: string,
  fileHash: string,
  visualFingerprint: string
): void => {
  blobUrlRegistry.set(blobUrl, {
    url: blobUrl,
    fileHash,
    visualFingerprint,
    createdAt: Date.now(),
  });

  const existingBlobs = fileHashToBlobMap.get(fileHash) || [];
  existingBlobs.push(blobUrl);
  fileHashToBlobMap.set(fileHash, existingBlobs);

  console.log('📌 Blob URL registered:', {
    url: blobUrl.substring(0, 30) + '...',
    hash: fileHash.substring(0, 12) + '...',
  });
};

export const validateBlobUrlUniqueness = (
  blobUrl: string,
  fileHash: string
): { isValid: boolean; reason?: string } => {
  const record = blobUrlRegistry.get(blobUrl);

  if (record) {
    if (record.fileHash === fileHash) {
      return {
        isValid: false,
        reason: 'Blob URL already registered with same content hash',
      };
    }
  }

  const existingBlobsForHash = fileHashToBlobMap.get(fileHash) || [];
  if (existingBlobsForHash.length > 0) {
    return {
      isValid: false,
      reason: `Content already registered (${existingBlobsForHash.length} blob URL(s) with same hash)`,
    };
  }

  return { isValid: true };
};

export const revokeBlobUrl = (blobUrl: string): void => {
  const record = blobUrlRegistry.get(blobUrl);

  if (record) {
    const blobsForHash = fileHashToBlobMap.get(record.fileHash) || [];
    const index = blobsForHash.indexOf(blobUrl);

    if (index > -1) {
      blobsForHash.splice(index, 1);

      if (blobsForHash.length === 0) {
        fileHashToBlobMap.delete(record.fileHash);
      } else {
        fileHashToBlobMap.set(record.fileHash, blobsForHash);
      }
    }

    blobUrlRegistry.delete(blobUrl);
    URL.revokeObjectURL(blobUrl);

    console.log('🗑️ Blob URL revoked:', {
      url: blobUrl.substring(0, 30) + '...',
    });
  }
};

export const getBlobUrlsForHash = (fileHash: string): string[] => {
  return fileHashToBlobMap.get(fileHash) || [];
};

export const getBlobUrlRecord = (blobUrl: string): BlobUrlRecord | null => {
  return blobUrlRegistry.get(blobUrl) || null;
};

export const clearBlobUrlRegistry = (): void => {
  blobUrlRegistry.forEach((record) => {
    try {
      URL.revokeObjectURL(record.url);
    } catch (error) {
      console.error('Error revoking blob URL:', error);
    }
  });

  blobUrlRegistry.clear();
  fileHashToBlobMap.clear();
  console.log('🗑️ Blob URL registry cleared');
};

export const getBlobUrlRegistryState = () => {
  return {
    totalBlobUrls: blobUrlRegistry.size,
    totalHashes: fileHashToBlobMap.size,
    records: Array.from(blobUrlRegistry.entries()).map(([url, record]) => ({
      url: url.substring(0, 30) + '...',
      hash: record.fileHash.substring(0, 12) + '...',
      createdAt: new Date(record.createdAt).toISOString(),
    })),
  };
};

export const debugBlobUrlRegistry = (): void => {
  console.log('🔍 Blob URL Registry Debug:', getBlobUrlRegistryState());
};
