import { CartItemRow } from "@/features/cart/components/cart-item-row";
import type { CartItem } from "@/features/cart/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


interface CartItemsCardProps {
  items: readonly (CartItem & { quantity: number })[];
  onQuantityChange: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onReset?: () => void;
}

export function CartItemsCard({ items, onQuantityChange, onRemove, onReset }: CartItemsCardProps) {
  return (
    <Card className="overflow-hidden border-white/80 bg-white/90">
      <CardHeader className="flex-row items-center justify-between border-b bg-white/60 py-5">
        <CardTitle id="cart-items-title" className="text-lg">
          {items.length === 1 ? "1 article" : `${items.length} articles`}
        </CardTitle>
        {items.length === 0 && onReset ? (
          <Button variant="outline" size="sm" onClick={onReset} className="h-8 text-xs">
            Réinitialiser le panier
          </Button>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">Livraison offerte</span>
        )}
      </CardHeader>
      <CardContent className="divide-y p-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <span className="text-4xl mb-2" role="img" aria-label="Panier vide">🛒</span>
            <p className="text-sm font-medium text-muted-foreground">Votre panier est vide</p>
          </div>
        ) : (
          items.map((item, index) => (
            <CartItemRow
              key={item.name}
              item={item}
              onQuantityChange={(qty) => onQuantityChange(index, qty)}
              onRemove={() => onRemove(index)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

