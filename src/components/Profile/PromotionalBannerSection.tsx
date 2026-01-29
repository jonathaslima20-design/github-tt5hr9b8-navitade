import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { uploadImage, deleteImage } from '@/lib/image';
import { ImageCropperBanner } from '@/components/ui/image-cropper-banner';

interface User {
  id: string;
  promotional_banner_url_desktop?: string;
  promotional_banner_url_mobile?: string;
}

interface PromotionalBannerSectionProps {
  user: User | null;
  previewBanner: { desktop: string | null; mobile: string | null };
  setPreviewBanner: (banner: { desktop: string | null; mobile: string | null }) => void;
}

export function PromotionalBannerSection({ user, previewBanner, setPreviewBanner }: PromotionalBannerSectionProps) {
  const [uploadingBanner, setUploadingBanner] = useState<'desktop' | 'mobile' | null>(null);
  const [showBannerCropper, setShowBannerCropper] = useState<'desktop' | 'mobile' | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);

  const handleBannerChange = (type: 'desktop' | 'mobile') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setSelectedBannerFile(file);
      setShowBannerCropper(type);
    }
  };

  const handleBannerCropComplete = async (croppedBlob: Blob, type: 'desktop' | 'mobile') => {
    try {
      setUploadingBanner(type);
      setShowBannerCropper(null);

      const file = new File([croppedBlob], selectedBannerFile?.name || `banner-${type}.jpg`, {
        type: 'image/jpeg',
      });

      const url = await uploadImage(file, user!.id, type === 'desktop' ? 'banners-desktop' : 'banners-mobile');

      const updateField = type === 'desktop' ? 'promotional_banner_url_desktop' : 'promotional_banner_url_mobile';
      const { error } = await supabase
        .from('users')
        .update({ [updateField]: url })
        .eq('id', user?.id);

      if (error) throw error;

      setPreviewBanner({
        ...previewBanner,
        [type]: url,
      });
      toast.success(`Banner ${type === 'desktop' ? 'desktop' : 'mobile'} atualizado com sucesso`);
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast.error(error.message || 'Erro ao atualizar banner');
    } finally {
      setUploadingBanner(null);
      setSelectedBannerFile(null);
    }
  };

  const handleRemoveBanner = async (type: 'desktop' | 'mobile') => {
    try {
      setUploadingBanner(type);
      const currentUrl = type === 'desktop' ? user?.promotional_banner_url_desktop : user?.promotional_banner_url_mobile;

      if (currentUrl) {
        await deleteImage(currentUrl);
      }

      const updateField = type === 'desktop' ? 'promotional_banner_url_desktop' : 'promotional_banner_url_mobile';
      const { error } = await supabase
        .from('users')
        .update({ [updateField]: null })
        .eq('id', user?.id);

      if (error) throw error;

      setPreviewBanner({
        ...previewBanner,
        [type]: null,
      });
      toast.success(`Banner ${type === 'desktop' ? 'desktop' : 'mobile'} removido com sucesso`);
    } catch (error: any) {
      console.error('Error removing banner:', error);
      toast.error('Erro ao remover banner');
    } finally {
      setUploadingBanner(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Banner Desktop</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Recomendado: 1530x200px (JPG, PNG ou GIF - máx. 5MB)
          </p>
          {previewBanner.desktop && (
            <div className="relative mb-4 rounded-lg overflow-hidden border">
              <img
                src={previewBanner.desktop}
                alt="Banner Desktop"
                className="w-full aspect-[1530/200] object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveBanner('desktop')}
                disabled={uploadingBanner === 'desktop'}
              >
                {uploadingBanner === 'desktop' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <input
            type="file"
            id="banner-desktop"
            accept="image/*"
            onChange={handleBannerChange('desktop')}
            className="hidden"
            disabled={uploadingBanner === 'desktop'}
          />
          <label htmlFor="banner-desktop">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingBanner === 'desktop'}
              onClick={() => document.getElementById('banner-desktop')?.click()}
            >
              {uploadingBanner === 'desktop' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {previewBanner.desktop ? 'Alterar' : 'Adicionar'} Banner Desktop
            </Button>
          </label>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Banner Mobile</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Recomendado: 960x200px (JPG, PNG ou GIF - máx. 5MB)
          </p>
          {previewBanner.mobile && (
            <div className="relative mb-4 rounded-lg overflow-hidden border">
              <img
                src={previewBanner.mobile}
                alt="Banner Mobile"
                className="w-full aspect-[960/200] object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveBanner('mobile')}
                disabled={uploadingBanner === 'mobile'}
              >
                {uploadingBanner === 'mobile' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <input
            type="file"
            id="banner-mobile"
            accept="image/*"
            onChange={handleBannerChange('mobile')}
            className="hidden"
            disabled={uploadingBanner === 'mobile'}
          />
          <label htmlFor="banner-mobile">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingBanner === 'mobile'}
              onClick={() => document.getElementById('banner-mobile')?.click()}
            >
              {uploadingBanner === 'mobile' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {previewBanner.mobile ? 'Alterar' : 'Adicionar'} Banner Mobile
            </Button>
          </label>
        </div>
      </div>

      {showBannerCropper && selectedBannerFile && (
        <ImageCropperBanner
          image={URL.createObjectURL(selectedBannerFile)}
          onCrop={(blob) => handleBannerCropComplete(blob, showBannerCropper)}
          onCancel={() => {
            setShowBannerCropper(null);
            setSelectedBannerFile(null);
          }}
          open={!!showBannerCropper}
          aspectRatio={showBannerCropper === 'desktop' ? 1530/200 : 960/200}
        />
      )}
    </>
  );
}
