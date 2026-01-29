export interface FileValidationResult {
  validFiles: File[];
  duplicates: string[];
  invalid: Array<{ name: string; reason: string }>;
  hashes?: Map<string, string>;
  fingerprints?: Map<string, string>;
  blobUrls?: Map<string, string>;
}

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  existingFiles?: File[];
  existingHashes?: Set<string>;
  existingFingerprints?: Set<string>;
  existingBlobUrls?: Set<string>;
  similarityThreshold?: number;
}

export const createFileSignature = (file: File): string => {
  return `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
};

export const generateFileHash = async (file: File): Promise<string> => {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error generating file hash:', error);
    return createFileSignature(file);
  }
};

export const validateFiles = async (
  files: File[],
  options: FileValidationOptions = {}
): Promise<FileValidationResult> => {
  const {
    maxFileSize = 5,
    allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
    existingFiles = []
  } = options;

  const result: FileValidationResult = {
    validFiles: [],
    duplicates: [],
    invalid: []
  };

  const processedSignatures = new Set<string>();
  const existingSignatures = new Set(existingFiles.map(createFileSignature));

  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const fileSignature = createFileSignature(file);

    if (file.size > maxFileSize * 1024 * 1024) {
      result.invalid.push({
        name: file.name,
        reason: `Tamanho excede ${maxFileSize}MB`
      });
      continue;
    }

    if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
      result.invalid.push({
        name: file.name,
        reason: 'Tipo de arquivo não permitido'
      });
      continue;
    }

    if (existingSignatures.has(fileSignature)) {
      result.duplicates.push(file.name);
      continue;
    }

    if (processedSignatures.has(fileSignature)) {
      result.duplicates.push(file.name);
      continue;
    }

    processedSignatures.add(fileSignature);
    result.validFiles.push(file);
  }

  return result;
};

export const validateFilesWithHash = async (
  files: File[],
  options: FileValidationOptions = {}
): Promise<FileValidationResult> => {
  const {
    maxFileSize = 5,
    allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
    existingFiles = [],
    existingHashes = new Set()
  } = options;

  const result: FileValidationResult = {
    validFiles: [],
    duplicates: [],
    invalid: [],
    hashes: new Map()
  };

  const fileArray = Array.from(files);
  const processedHashes = new Set<string>();

  for (const file of fileArray) {
    if (file.size > maxFileSize * 1024 * 1024) {
      result.invalid.push({
        name: file.name,
        reason: `Tamanho excede ${maxFileSize}MB`
      });
      continue;
    }

    if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
      result.invalid.push({
        name: file.name,
        reason: 'Tipo de arquivo não permitido'
      });
      continue;
    }

    try {
      const fileHash = await generateFileHash(file);

      if (existingHashes.has(fileHash) || processedHashes.has(fileHash)) {
        result.duplicates.push(file.name);
        continue;
      }

      processedHashes.add(fileHash);
      result.validFiles.push(file);
      result.hashes!.set(file.name, fileHash);
    } catch (error) {
      result.invalid.push({
        name: file.name,
        reason: 'Erro ao processar arquivo'
      });
    }
  }

  return result;
};

export const areFilesIdentical = (file1: File, file2: File): boolean => {
  return createFileSignature(file1) === createFileSignature(file2);
};

export const findDuplicatesInArray = (files: File[]): Map<string, File[]> => {
  const duplicates = new Map<string, File[]>();
  const signatureMap = new Map<string, File[]>();

  files.forEach(file => {
    const signature = createFileSignature(file);
    const existing = signatureMap.get(signature) || [];
    existing.push(file);
    signatureMap.set(signature, existing);
  });

  signatureMap.forEach((fileList, signature) => {
    if (fileList.length > 1) {
      duplicates.set(signature, fileList);
    }
  });

  return duplicates;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const validateFilesWithMultiLayerValidation = async (
  files: File[],
  options: FileValidationOptions = {}
): Promise<FileValidationResult> => {
  const {
    maxFileSize = 5,
    allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
    existingFiles = [],
    existingHashes = new Set(),
    existingFingerprints = new Set(),
    existingBlobUrls = new Set(),
    similarityThreshold = 5
  } = options;

  const {
    generateVisualFingerprint,
    checkImageDuplicate,
    createImageFingerprint,
  } = await import('./imageFingerprinting');

  const result: FileValidationResult = {
    validFiles: [],
    duplicates: [],
    invalid: [],
    hashes: new Map(),
    fingerprints: new Map(),
    blobUrls: new Map(),
  };

  const fileArray = Array.from(files);
  const processedHashes = new Set<string>();
  const processedFingerprints = new Set<string>();
  const processedBlobUrls = new Map<string, string>();

  for (const file of fileArray) {
    if (file.size > maxFileSize * 1024 * 1024) {
      result.invalid.push({
        name: file.name,
        reason: `Tamanho excede ${maxFileSize}MB`
      });
      continue;
    }

    if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
      result.invalid.push({
        name: file.name,
        reason: 'Tipo de arquivo não permitido'
      });
      continue;
    }

    try {
      const fileHash = await generateFileHash(file);

      if (existingHashes.has(fileHash) || processedHashes.has(fileHash)) {
        result.duplicates.push(file.name);
        continue;
      }

      const blobUrl = URL.createObjectURL(file);
      if (existingBlobUrls.has(blobUrl) || processedBlobUrls.has(blobUrl)) {
        URL.revokeObjectURL(blobUrl);
        result.duplicates.push(file.name);
        continue;
      }

      const visualFingerprint = await generateVisualFingerprint(file);

      if (existingFingerprints.has(visualFingerprint) || processedFingerprints.has(visualFingerprint)) {
        URL.revokeObjectURL(blobUrl);
        result.duplicates.push(file.name);
        continue;
      }

      processedHashes.add(fileHash);
      processedFingerprints.add(visualFingerprint);
      processedBlobUrls.set(blobUrl, file.name);

      result.validFiles.push(file);
      result.hashes!.set(file.name, fileHash);
      result.fingerprints!.set(file.name, visualFingerprint);
      result.blobUrls!.set(file.name, blobUrl);
    } catch (error) {
      result.invalid.push({
        name: file.name,
        reason: 'Erro ao processar arquivo'
      });
    }
  }

  return result;
};
