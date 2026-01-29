import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PromotionalPhrase {
  id: string;
  phrase: string;
  created_at: string;
}

interface UsePromotionalPhrasesReturn {
  phrases: PromotionalPhrase[];
  loading: boolean;
  addPhrase: (phrase: string) => Promise<boolean>;
  removePhrase: (id: string) => Promise<boolean>;
  refreshPhrases: () => Promise<void>;
}

export function usePromotionalPhrases(userId?: string): UsePromotionalPhrasesReturn {
  const [phrases, setPhrases] = useState<PromotionalPhrase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPhrases = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_promotional_phrases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPhrases(data || []);
    } catch (error) {
      console.error('Error loading promotional phrases:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPhrase = async (phrase: string): Promise<boolean> => {
    if (!userId || !phrase.trim()) return false;

    try {
      const trimmedPhrase = phrase.trim();

      if (trimmedPhrase.length > 200) {
        toast.error('Frase deve ter no máximo 200 caracteres');
        return false;
      }

      if (phrases.some(p => p.phrase.toLowerCase() === trimmedPhrase.toLowerCase())) {
        toast.error('Esta frase já foi cadastrada');
        return false;
      }

      const { error } = await supabase
        .from('user_promotional_phrases')
        .insert({
          user_id: userId,
          phrase: trimmedPhrase,
        });

      if (error) {
        if (error.code === '23505') {
          return true;
        }
        throw error;
      }

      await loadPhrases();
      return true;
    } catch (error) {
      console.error('Error adding promotional phrase:', error);
      return false;
    }
  };

  const removePhrase = async (id: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('user_promotional_phrases')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      setPhrases(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (error) {
      console.error('Error removing promotional phrase:', error);
      return false;
    }
  };

  const refreshPhrases = async () => {
    await loadPhrases();
  };

  useEffect(() => {
    loadPhrases();
  }, [userId]);

  return {
    phrases,
    loading,
    addPhrase,
    removePhrase,
    refreshPhrases,
  };
}
