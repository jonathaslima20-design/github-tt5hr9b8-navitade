import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface HelpArticleFeedbackProps {
  articleId: string;
}

export function HelpArticleFeedback({ articleId }: HelpArticleFeedbackProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showTextArea, setShowTextArea] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = async (isHelpful: boolean) => {
    try {
      setSubmitting(true);
      setFeedback(isHelpful);

      // If negative feedback, show textarea for additional comments
      if (!isHelpful) {
        setShowTextArea(true);
        return;
      }

      // Submit positive feedback immediately
      await submitFeedback(isHelpful, '');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async (isHelpful: boolean, text: string = '') => {
    try {
      const { error } = await supabase
        .from('help_feedback')
        .insert({
          article_id: articleId,
          is_helpful: isHelpful,
          feedback_text: text || null,
        });

      if (error) throw error;

      toast.success('Obrigado pelo seu feedback!');
      setShowTextArea(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  const handleTextFeedbackSubmit = async () => {
    if (feedback !== null) {
      await submitFeedback(feedback, feedbackText);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Este artigo foi útil?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback === null ? (
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => handleFeedback(true)}
              disabled={submitting}
              className="flex-1"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Sim, foi útil
            </Button>
            <Button
              variant="outline"
              onClick={() => handleFeedback(false)}
              disabled={submitting}
              className="flex-1"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Não foi útil
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              {feedback ? (
                <>
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Obrigado pelo feedback positivo!</span>
                </>
              ) : (
                <>
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Que pena que não foi útil.</span>
                </>
              )}
            </div>

            {showTextArea && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Como podemos melhorar este artigo? (opcional)"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleTextFeedbackSubmit}
                    disabled={submitting}
                  >
                    Enviar feedback
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTextArea(false)}
                  >
                    Pular
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}