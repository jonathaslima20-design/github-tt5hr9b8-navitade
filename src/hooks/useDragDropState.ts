import { useState, useCallback } from 'react';
import type { Product } from '@/types';

interface DragDropState {
  isDragging: boolean;
  draggedItem: Product | null;
  dragOverIndex: number | null;
  hasChanges: boolean;
  originalOrder: Product[];
}

interface UseDragDropStateReturn {
  dragState: DragDropState;
  setDragState: (state: Partial<DragDropState>) => void;
  resetDragState: () => void;
  markAsChanged: () => void;
  canUndo: boolean;
  undoChanges: () => Product[];
}

export function useDragDropState(initialProducts: Product[]): UseDragDropStateReturn {
  const [dragState, setDragStateInternal] = useState<DragDropState>({
    isDragging: false,
    draggedItem: null,
    dragOverIndex: null,
    hasChanges: false,
    originalOrder: [...initialProducts]
  });

  const setDragState = useCallback((updates: Partial<DragDropState>) => {
    setDragStateInternal(prev => ({ ...prev, ...updates }));
  }, []);

  const resetDragState = useCallback(() => {
    setDragStateInternal({
      isDragging: false,
      draggedItem: null,
      dragOverIndex: null,
      hasChanges: false,
      originalOrder: [...initialProducts]
    });
  }, [initialProducts]);

  const markAsChanged = useCallback(() => {
    setDragState({ hasChanges: true });
  }, [setDragState]);

  const undoChanges = useCallback(() => {
    setDragState({ hasChanges: false });
    return [...dragState.originalOrder];
  }, [dragState.originalOrder, setDragState]);

  const canUndo = dragState.hasChanges && dragState.originalOrder.length > 0;

  return {
    dragState,
    setDragState,
    resetDragState,
    markAsChanged,
    canUndo,
    undoChanges
  };
}