import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWishlist } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const WishlistButton = () => {
  const { count } = useWishlist();
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/wishlist')}
            aria-label="Open wishlist"
            className="relative flex items-center justify-center bg-warm-accentSoft text-warm-accent border-warm-line2 hover:bg-warm-accent hover:text-white transition-colors duration-200"
          >
            <Heart className={`w-3 h-3 mr-2 ${count > 0 ? 'fill-current' : ''}`} />
            Wishlist
            {count > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {count}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Saved items • {count}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
