interface ItemDescriptionProps {
  description: string;
  isRichText?: boolean;
}

export default function ItemDescription({ description, isRichText = false }: ItemDescriptionProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Descrição</h2>
      {isRichText ? (
        <div 
          className="text-muted-foreground prose max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : (
        <div className="text-muted-foreground whitespace-pre-line">
          {description}
        </div>
      )}
    </div>
  );
}