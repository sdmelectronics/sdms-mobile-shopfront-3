import { ReactNode } from 'react';
import { Phone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PHONE_NUMBERS } from '@/lib/contact';

interface CallMenuProps {
  /** The clickable element that opens the menu. */
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  /** Applied to the trigger wrapper so callers keep their own layout. */
  className?: string;
}

/**
 * A call action that offers both shop lines.
 *
 * The shop publishes two numbers, but a single button can only dial one — so
 * anywhere we previously hardcoded the primary line, this asks which to call
 * instead of quietly hiding the second number.
 *
 * If only one number were ever configured this would still work, but it would
 * be a pointless extra tap, so it degrades to a plain tel: link in that case.
 */
export const CallMenu = ({ children, align = 'end', side = 'bottom', className }: CallMenuProps) => {
  if (PHONE_NUMBERS.length === 1) {
    return (
      <a href={`tel:${PHONE_NUMBERS[0].tel}`} className={className}>
        {children}
      </a>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="z-[60] bg-warm-surface border-warm-line">
        <DropdownMenuLabel className="text-warm-muted text-xs font-semibold">
          Call us on
        </DropdownMenuLabel>
        {PHONE_NUMBERS.map((number) => (
          <DropdownMenuItem key={number.tel} asChild className="cursor-pointer">
            <a href={`tel:${number.tel}`} className="flex items-center gap-2 text-warm-ink">
              <Phone className="w-4 h-4 text-warm-accent" />
              <span className="font-medium">{number.label}</span>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
