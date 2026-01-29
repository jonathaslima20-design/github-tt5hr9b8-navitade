import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { uploadImage, deleteImage } from '@/lib/image';
import { ImageCropperCover } from '@/components/ui/image-cropper-cover';
import { useResponsiveAspectRatio } from '@/hooks/useResponsiveAspectRatio';

interface User {
  id: string;
  cover_url_desktop?: string;
  cover_url_mobile?: string;
}

interface CoverImageSectionProps {
  user: User | null;
  previewCover: { desktop: string | null; mobile: string | null };
  setPreviewCover: (cover: { desktop: string | null; mobile: string | null }) => void;
}

export function CoverImageSection({ user, previewCover, setPreviewCover }: CoverImageSectionProps) {
  const [uploadingCover, setUploadingCover] = useState<'desktop' | 'mobile' | null>(null);
  const [showCoverCropper, setShowCoverCropper] = useState<'desktop' | 'mobile' | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);

  const desktopAspectRatio = useResponsiveAspectRatio({
    mobile: 960 / 860,
    desktop: 1530 / 465,
  });

  const desktopAspectRatioClass = desktopAspectRatio === 960 / 860 ? 'aspect-[960/860]' : 'aspect-[1530/465]';

  const handleCoverChange = (type: 'desktop' | 'mobile') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setSelectedCoverFile(file);
      setShowCoverCropper(type);
    }
  };

  const handleCoverCropComplete = async (croppedBlob: Blob, type: 'desktop' | 'mobile') => {
    try {
      setUploadingCover(type);
      setShowCoverCropper(null);

      const file = new File([croppedBlob], selectedCoverFile?.name || `cover-${type}.jpg`, {
        type: 'image/jpeg',
      });

      const url = await uploadImage(file, user!.id, type === 'desktop' ? 'covers-desktop' : 'covers-mobile');

      const updateField = type === 'desktop' ? 'cover_url_desktop' : 'cover_url_mobile';
      const { error } = await supabase
        .from('users')
        .update({ [updateField]: url })
        .eq('id', user?.id);

      if (error) throw error;

      setPreviewCover({
        ...previewCover,
        [type]: url,
      });
      toast.success(`Imagem de capa ${type === 'desktop' ? 'desktop' : 'mobile'} atualizada com sucesso`);
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast.error(error.message || 'Erro ao atualizar imagem de capa');
    } finally {
      setUploadingCover(null);
      setSelectedCoverFile(null);
    }
  };

  const handleRemoveCover = async (type: 'desktop' | 'mobile') => {
    try {
      setUploadingCover(type);
      const currentUrl = type === 'desktop' ? user?.cover_url_desktop : user?.cover_url_mobile;

      if (currentUrl) {
        await deleteImage(currentUrl);
      }

      const updateField = type === 'desktop' ? 'cover_url_desktop' : 'cover_url_mobile';
      const { error } = await supabase
        .from('users')
        .update({ [updateField]: null })
        .eq('id', user?.id);

      if (error) throw error;

      setPreviewCover({
        ...previewCover,
        [type]: null,
      });
      toast.success(`Imagem de capa ${type === 'desktop' ? 'desktop' : 'mobile'} removida com sucesso`);
    } catch (error: any) {
      console.error('Error removing cover:', error);
      toast.error('Erro ao remover imagem de capa');
    } finally {
      setUploadingCover(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Capa Desktop</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Recomendado: 1530x465px (JPG, PNG ou GIF - máx. 5MB)
          </p>
          {previewCover.desktop && (
            <div className={`relative mb-4 rounded-lg overflow-hidden border ${desktopAspectRatioClass}`}>
              <img
                key={`desktop-${desktopAspectRatio}`}
                src={previewCover.desktop}
                alt="Capa Desktop"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveCover('desktop')}
                disabled={uploadingCover === 'desktop'}
              >
                {uploadingCover === 'desktop' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <input
            type="file"
            id="cover-desktop"
            accept="image/*"
            onChange={handleCoverChange('desktop')}
            className="hidden"
            disabled={uploadingCover === 'desktop'}
          />
          <label htmlFor="cover-desktop">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingCover === 'desktop'}
              onClick={() => document.getElementById('cover-desktop')?.click()}
            >
              {uploadingCover === 'desktop' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {previewCover.desktop ? 'Alterar' : 'Adicionar'} Capa Desktop
            </Button>
          </label>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Capa Mobile</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Recomendado: 960x860px (JPG, PNG ou GIF - máx. 5MB)
          </p>
          {previewCover.mobile && (
            <div className="relative mb-4 rounded-lg overflow-hidden border aspect-[960/860]">
              <img
                key={`mobile-${desktopAspectRatio}`}
                src={previewCover.mobile}
                alt="Capa Mobile"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveCover('mobile')}
                disabled={uploadingCover === 'mobile'}
              >
                {uploadingCover === 'mobile' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <input
            type="file"
            id="cover-mobile"
            accept="image/*"
            onChange={handleCoverChange('mobile')}
            className="hidden"
            disabled={uploadingCover === 'mobile'}
          />
          <label htmlFor="cover-mobile">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingCover === 'mobile'}
              onClick={() => document.getElementById('cover-mobile')?.click()}
            >
              {uploadingCover === 'mobile' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {previewCover.mobile ? 'Alterar' : 'Adicionar'} Capa Mobile
            </Button>
          </label>
        </div>
      </div>

      {showCoverCropper && selectedCoverFile && (
        <ImageCropperCover
          image={URL.createObjectURL(selectedCoverFile)}
          onCrop={(blob) => handleCoverCropComplete(blob, showCoverCropper)}
          onCancel={() => {
            setShowCoverCropper(null);
            setSelectedCoverFile(null);
          }}
          open={!!showCoverCropper}
          aspectRatio={showCoverCropper === 'desktop' ? 1530/465 : 960/860}
        />
      )}
    </>
  );
}
