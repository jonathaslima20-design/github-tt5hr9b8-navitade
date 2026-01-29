import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CloneJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalProducts: number;
  processedCount: number;
  progress: number;
  errorMessage?: string;
  completedAt?: string;
}

export function useCloneJobStatus(jobId?: string) {
  const [jobStatus, setJobStatus] = useState<CloneJobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJobStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    const pollInterval = setInterval(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('clone_jobs')
          .select('id, status, total_products, processed_count, error_message, completed_at')
          .eq('id', jobId)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          const progress = data.total_products > 0
            ? Math.round((data.processed_count / data.total_products) * 100)
            : 0;

          setJobStatus({
            id: data.id,
            status: data.status,
            totalProducts: data.total_products,
            processedCount: data.processed_count,
            progress,
            errorMessage: data.error_message || undefined,
            completedAt: data.completed_at
          });

          // Stop polling when job is completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollInterval);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error polling clone job status:', err);
        setError(err instanceof Error ? err.message : 'Erro ao verificar status');
        setLoading(false);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId]);

  return { jobStatus, loading, error };
}
