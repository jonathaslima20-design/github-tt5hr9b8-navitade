import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Package, Settings, ShoppingCart, Gift, AlertCircle, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
  article_count?: number;
}

interface HelpCategoryCardProps {
  category: HelpCategory;
}

const iconMap = {
  'Rocket': Rocket,
  'Package': Package,
  'Settings': Settings,
  'ShoppingCart': ShoppingCart,
  'Gift': Gift,
  'AlertCircle': AlertCircle,
  'FileText': FileText,
};

export function HelpCategoryCard({ category }: HelpCategoryCardProps) {
  const IconComponent = iconMap[category.icon as keyof typeof iconMap] || FileText;

  return (
    <Link to={`/help/category/${category.slug}`}>
      <Card className="h-full hover:shadow-lg transition-all duration-300 group cursor-pointer border-2 hover:border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <CardTitle className="text-xl group-hover:text-primary transition-colors">
            {category.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 line-clamp-2">
            {category.description}
          </p>
          {category.article_count !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {category.article_count} {category.article_count === 1 ? 'artigo' : 'artigos'}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}