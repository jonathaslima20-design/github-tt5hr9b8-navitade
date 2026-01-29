import { useState, useRef, useEffect } from 'react';
import { Upload, X, Star, Image as ImageIcon, Loader as Loader2, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageCropperProduct } from '@/components/ui/image-cropper-product';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { validateFilesWithHash, validateFilesWithMultiLayerValidation, formatFileSize } from '@/lib/fileValidation';
import { revokeBlobUrl, registerBlobUrl, debugBlobUrlRegistry } from '@/lib/blobUrlValidator';
import { v4 as uuidv4 } from 'uuid';

type MediaItem = {
  id: string;
  url: string;
  file?: File;
  isFeatured: boolean;
  mediaType: 'image';
  fileHash?: string;
  visualFingerprint?: string;
  blobUrl?: string;
};

interface ProductImageManagerProps {
  images: MediaItem[];
  onChange: (images: MediaItem[]) => void;
  maxImages?: number;
  maxFileSize?: number;
}

export function ProductImageManager({
  images,
  onChange,
  maxImages = 10,
  maxFileSize = 5
}: ProductImageManagerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToRecrop, setImageToRecrop] = useState<MediaItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingQueueRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileReferencesRef = useRef<Map<string, { file: File; url: string }>>(new Map());

  useEffect(() => {
    return () => {
      fileReferencesRef.current.forEach(({ url }) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (processingQueueRef.current) {
      toast.info('Aguarde o processamento anterior terminar');
      return;
    }

    processingQueueRef.current = true;
    setIsProcessing(true);

    try {
      const remainingSlots = maxImages - images.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      if (remainingSlots <= 0) {
        toast.error(`Limite máximo de ${maxImages} imagens atingido. Remova algumas imagens antes de adicionar novas.`);
        return;
      }

      if (filesToAdd.length === 0) {
        toast.error(`Limite máximo de ${maxImages} imagens atingido`);
        return;
      }

      const existingFiles = images.map(img => img.file).filter((f): f is File => f !== undefined);
      const existingHashes = new Set(
        images.map(img => img.fileHash).filter((h): h is string => h !== undefined)
      );
      const existingFingerprints = new Set(
        images.map(img => img.visualFingerprint).filter((f): f is string => f !== undefined)
      );
      const existingBlobUrls = new Set(
        images.map(img => img.blobUrl).filter((b): b is string => b !== undefined)
      );

      const validationResult = await validateFilesWithMultiLayerValidation(filesToAdd, {
        maxFileSize,
        allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
        existingFiles,
        existingHashes,
        existingFingerprints,
        existingBlobUrls,
        similarityThreshold: 5
      });

      if (validationResult.invalid.length > 0) {
        validationResult.invalid.forEach(({ name, reason }) => {
          toast.error(`${name}: ${reason}`);
        });
      }

      if (validationResult.duplicates.length > 0) {
        toast.warning(`Imagens duplicadas ignoradas: ${validationResult.duplicates.join(', ')}`);
      }

      if (validationResult.validFiles.length === 0) {
        if (validationResult.invalid.length === 0 && validationResult.duplicates.length === 0) {
          toast.error('Nenhuma imagem válida para adicionar');
        }
        return;
      }

      const newImages = validationResult.validFiles.map((file, index) => {
        const uniqueId = `new-${uuidv4()}`;
        const url = URL.createObjectURL(file);
        const fileHash = validationResult.hashes?.get(file.name) || '';
        const visualFingerprint = validationResult.fingerprints?.get(file.name) || '';
        const blobUrl = validationResult.blobUrls?.get(file.name) || '';

        fileReferencesRef.current.set(uniqueId, { file, url });

        if (fileHash && visualFingerprint) {
          registerBlobUrl(blobUrl, fileHash, visualFingerprint);
        }

        console.log('✅ Image validated and registered:', {
          id: uniqueId,
          hash: fileHash.substring(0, 12) + '...',
          hasVisualFingerprint: !!visualFingerprint,
        });

        return {
          id: uniqueId,
          url: url,
          file: file,
          isFeatured: images.length === 0 && index === 0,
          mediaType: 'image' as const,
          fileHash: fileHash,
          visualFingerprint: visualFingerprint,
          blobUrl: blobUrl
        };
      });

      const combinedImages = [...images, ...newImages];
      onChange(combinedImages);

      const totalSize = validationResult.validFiles.reduce((sum, file) => sum + file.size, 0);
      toast.success(
        `${validationResult.validFiles.length} imagem(ns) adicionada(s) (${formatFileSize(totalSize)})`
      );
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Erro ao processar imagens. Tente novamente.');
    } finally {
      setIsProcessing(false);
      processingQueueRef.current = false;

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (imageToRecrop) {
      const croppedFile = new File([croppedBlob], `recropped-${uuidv4()}.jpg`, {
        type: 'image/jpeg',
      });

      const updatedImages = images.map(img => {
        if (img.id === imageToRecrop.id) {
          const oldRef = fileReferencesRef.current.get(img.id);
          if (oldRef) {
            URL.revokeObjectURL(oldRef.url);
          }

          const newUrl = URL.createObjectURL(croppedFile);
          fileReferencesRef.current.set(img.id, { file: croppedFile, url: newUrl });

          return { ...img, url: newUrl, file: croppedFile };
        }
        return img;
      });

      onChange(updatedImages);
      setShowCropper(false);
      setImageToRecrop(null);
      toast.success('Imagem recortada com sucesso');
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToRecrop(null);
  };

  const handleRecropImage = (image: MediaItem) => {
    setImageToRecrop(image);
    setShowCropper(true);
  };


  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (isProcessing) {
      toast.info('Aguarde o processamento anterior terminar');
      return;
    }

    await handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const setFeaturedImage = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isFeatured: img.id === imageId
    }));
    onChange(updatedImages);
  };

  const removeImage = (imageId: string) => {
    if (images.length === 1) {
      toast.error('Você deve manter pelo menos uma imagem no produto');
      return;
    }

    const imageToRemove = images.find(img => img.id === imageId);
    const remainingImages = images.filter(img => img.id !== imageId);

    if (imageToRemove?.isFeatured && remainingImages.length > 0) {
      const nextFeaturedImage = remainingImages.sort((a, b) => {
        const aOrder = images.findIndex(img => img.id === a.id);
        const bOrder = images.findIndex(img => img.id === b.id);
        return aOrder - bOrder;
      })[0];

      if (nextFeaturedImage) {
        nextFeaturedImage.isFeatured = true;
        toast.info(`${nextFeaturedImage.id.startsWith('new-') ? 'Nova' : 'Próxima'} imagem promovida como principal`);
      }
    }

    const ref = fileReferencesRef.current.get(imageId);
    if (ref) {
      URL.revokeObjectURL(ref.url);
      fileReferencesRef.current.delete(imageId);
    }

    if (imageToRemove?.blobUrl) {
      revokeBlobUrl(imageToRemove.blobUrl);
    }

    console.log('🗑️ Image removed:', {
      id: imageId,
      hash: imageToRemove?.fileHash?.substring(0, 12),
    });

    onChange(remainingImages);
  };

  const remainingSlots = maxImages - images.length;
  const uploadPercentage = (images.length / maxImages) * 100;

  return (
    <>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold mb-1">Imagens do Produto</h3>
              <p className="text-sm text-muted-foreground">
                Adicione até {maxImages} imagens. Imagens serão cortadas em proporção quadrada (1:1).
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{images.length}</p>
              <p className="text-xs text-muted-foreground">de {maxImages}</p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(uploadPercentage, 100)}%` }}
            />
          </div>
        </div>

        {images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Imagens Atuais</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((item) => (
                <div
                  key={item.id}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-all"
                >
                  <img
                    src={item.url}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant={item.isFeatured ? "default" : "secondary"}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFeaturedImage(item.id)}
                      title={item.isFeatured ? "Imagem principal" : "Definir como principal"}
                    >
                      <Star className={cn(
                        "h-4 w-4",
                        item.isFeatured && "fill-current"
                      )} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRecropImage(item)}
                      title="Recortar imagem"
                    >
                      <Scissors className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className={cn(
                        "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                        images.length === 1 && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => removeImage(item.id)}
                      disabled={images.length === 1}
                      title={images.length === 1 ? "Não é possível remover - esta é a única imagem" : "Remover imagem"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {item.isFeatured && (
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                        Principal
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {remainingSlots > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Adicionar Novas Imagens
              <span className="text-muted-foreground ml-2">
                {remainingSlots} {remainingSlots === 1 ? 'vaga' : 'vagas'} disponível{remainingSlots === 1 ? '' : 's'}
              </span>
            </h4>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-6 transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border",
                isProcessing && "opacity-60 pointer-events-none"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="image-upload"
                className="hidden"
                multiple
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isProcessing}
              />
              <label
                htmlFor="image-upload"
                className={cn(
                  "flex flex-col items-center justify-center",
                  isProcessing ? "cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <div className="rounded-full bg-primary/10 p-4 mb-3">
                  {isProcessing ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-primary" />
                  )}
                </div>
                <p className="text-sm font-medium text-center mb-1">
                  {isProcessing ? 'Processando...' : 'Upload de Imagens'}
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  PNG, JPG ou WEBP (MÁX. {maxFileSize}MB)
                </p>
                {!isProcessing && (
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Clique ou arraste
                  </p>
                )}
              </label>
            </div>
          </div>
        )}

        {images.length === 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-dashed">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma imagem adicionada ainda. Adicione pelo menos uma imagem do produto.
            </p>
          </div>
        )}
      </div>

      {imageToRecrop && (
        <ImageCropperProduct
          image={imageToRecrop.url}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          open={showCropper}
        />
      )}

    </>
  );
}
