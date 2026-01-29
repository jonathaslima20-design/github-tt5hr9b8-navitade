import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import { ImageCropper } from '@/components/ui/image-cropper';

interface User {
  id: string;
  name?: string;
  avatar_url?: string;
}

interface AvatarSectionProps {
  user: User | null;
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
}

export function AvatarSection({ user, previewImage, setPreviewImage }: AvatarSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setSelectedFile(file);
      setShowCropper(true);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploading(true);
      setShowCropper(false);

      const file = new File([croppedBlob], selectedFile?.name || 'avatar.jpg', {
        type: 'image/jpeg',
      });

      const url = await uploadImage(file, user!.id, 'avatars');

      const { error } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', user?.id);

      if (error) throw error;

      setPreviewImage(url);
      toast.success('Avatar atualizado com sucesso');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Erro ao atualizar avatar');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={previewImage || undefined} alt={user?.name} />
          <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">Foto de Perfil</h3>
          <p className="text-sm text-muted-foreground">
            JPG, PNG ou GIF (máx. 5MB)
          </p>
          <div className="mt-2">
            <input
              type="file"
              id="avatar"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="avatar">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById('avatar')?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Alterar Foto
              </Button>
            </label>
          </div>
        </div>
      </div>

      {showCropper && selectedFile && (
        <ImageCropper
          image={URL.createObjectURL(selectedFile)}
          onCrop={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setSelectedFile(null);
          }}
          aspectRatio={1}
          open={showCropper}
        />
      )}
    </>
  );
}
