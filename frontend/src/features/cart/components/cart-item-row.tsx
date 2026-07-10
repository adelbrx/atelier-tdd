import { Minus, Plus, Trash2 } from "lucide-react";

import type { CartItem } from "@/features/cart/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/money";

interface CartItemRowProps {
  item: CartItem & { quantity: number };
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onQuantityChange, onRemove }: CartItemRowProps) {
  return (
    <article className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
      <div
        className={`grid size-20 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-2xl ${item.accent}`}
        aria-hidden="true"
      >
        {item.symbol}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold">{item.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={`Diminuer la quantité de ${item.name}`}
            onClick={() => onQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="size-3" aria-hidden="true" />
          </Button>
          <span className="w-8 text-center text-sm font-semibold" aria-label={`Quantité ${item.quantity}`}>
            {item.quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={`Augmenter la quantité de ${item.name}`}
            onClick={() => onQuantityChange(item.quantity + 1)}
          >
            <Plus className="size-3" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-4">
        <span className="font-bold tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          aria-label={`Supprimer ${item.name}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

