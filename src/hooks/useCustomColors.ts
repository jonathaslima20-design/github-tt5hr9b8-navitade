import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CustomColor {
  id: string;
  name: string;
  hex_value: string;
  created_at: string;
}

interface UseCustomColorsReturn {
  customColors: CustomColor[];
  loading: boolean;
  addCustomColor: (name: string, hexValue: string) => Promise<boolean>;
  removeCustomColor: (name: string) => Promise<boolean>;
  refreshCustomColors: () => Promise<void>;
}

export function useCustomColors(userId?: string): UseCustomColorsReturn {
  const [customColors, setCustomColors] = useState<CustomColor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomColors = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_colors')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCustomColors(data || []);
    } catch (error) {
      console.error('Error loading custom colors:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomColor = async (name: string, hexValue: string): Promise<boolean> => {
    if (!userId || !name.trim() || !hexValue) return false;

    try {
      const trimmedName = name.trim();

      // Check if color already exists
      if (customColors.some(color => color.name.toLowerCase() === trimmedName.toLowerCase())) {
        return true; // Already exists, consider it successful
      }

      const { error } = await supabase
        .from('user_colors')
        .insert({
          user_id: userId,
          name: trimmedName,
          hex_value: hexValue,
        });

      if (error) {
        // If it's a duplicate error, just ignore it
        if (error.code === '23505') {
          return true;
        }
        throw error;
      }

      // Update local state
      await loadCustomColors();
      return true;
    } catch (error) {
      console.error('Error adding custom color:', error);
      return false;
    }
  };

  const removeCustomColor = async (name: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('user_colors')
        .delete()
        .eq('user_id', userId)
        .eq('name', name);

      if (error) throw error;

      // Update local state
      setCustomColors(prev => prev.filter(color => color.name !== name));
      return true;
    } catch (error) {
      console.error('Error removing custom color:', error);
      return false;
    }
  };

  const refreshCustomColors = async () => {
    await loadCustomColors();
  };

  useEffect(() => {
    loadCustomColors();
  }, [userId]);

  return {
    customColors,
    loading,
    addCustomColor,
    removeCustomColor,
    refreshCustomColors,
  };
}