import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback, useEffect } from 'react';

interface RichTextEditorProps {
  content?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const handleChange = useCallback((content: string) => {
    console.log('Rich text editor content change:', content.length, 'characters');
    onChange(content);
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2],
        },
      }),
      Underline,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[150px] max-h-[300px] overflow-y-auto focus:outline-none',
          className
        ),
        'data-placeholder': placeholder || 'Digite aqui...',
      },
    },
    onUpdate: ({ editor }) => {
      handleChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  const handleButtonClick = (e: React.MouseEvent, action: () => void, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`Clicking ${name} button`);
    const result = action();
    console.log(`${name} action result:`, result);
    console.log(`Editor state after ${name}:`, {
      bold: editor?.isActive('bold'),
      italic: editor?.isActive('italic'),
      underline: editor?.isActive('underline'),
    });
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
        <div className="items-center justify-center flex flex-wrap gap-1">
          <button
            type="button"
            onClick={(e) => handleButtonClick(e, () => editor.chain().focus().toggleBold().run(), 'bold')}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "h-9 px-2.5 hover:bg-muted hover:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              editor.isActive('bold') ? "bg-accent text-accent-foreground" : "bg-transparent"
            )}
            aria-label="Negrito"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => handleButtonClick(e, () => editor.chain().focus().toggleItalic().run(), 'italic')}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "h-9 px-2.5 hover:bg-muted hover:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              editor.isActive('italic') ? "bg-accent text-accent-foreground" : "bg-transparent"
            )}
            aria-label="Itálico"
          >
            <Italic className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => handleButtonClick(e, () => editor.chain().focus().toggleUnderline().run(), 'underline')}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "h-9 px-2.5 hover:bg-muted hover:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              editor.isActive('underline') ? "bg-accent text-accent-foreground" : "bg-transparent"
            )}
            aria-label="Sublinhado"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => handleButtonClick(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'heading')}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "h-9 px-2.5 hover:bg-muted hover:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              editor.isActive('heading', { level: 2 }) ? "bg-accent text-accent-foreground" : "bg-transparent"
            )}
            aria-label="Título"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => handleButtonClick(e, () => editor.chain().focus().toggleBulletList().run(), 'bulletList')}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "h-9 px-2.5 hover:bg-muted hover:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              editor.isActive('bulletList') ? "bg-accent text-accent-foreground" : "bg-transparent"
            )}
            aria-label="Lista"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => handleButtonClick(e, () => editor.chain().focus().toggleOrderedList().run(), 'orderedList')}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "h-9 px-2.5 hover:bg-muted hover:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              editor.isActive('orderedList') ? "bg-accent text-accent-foreground" : "bg-transparent"
            )}
            aria-label="Lista Numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-3 bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}