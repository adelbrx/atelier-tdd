import { CartItemRow } from "@/features/cart/components/cart-item-row";
import type { CartItem } from "@/features/cart/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CartItemsCardProps {
  items: readonly CartItem[];
}

export function CartItemsCard({ items }: CartItemsCardProps) {
  return (
    <Card className="overflow-hidden border-white/80 bg-white/90">
      <CardHeader className="flex-row items-center justify-between border-b bg-white/60 py-5">
        <CardTitle id="cart-items-title" className="text-lg">
          {items.length === 1 ? "1 article" : `${items.length} articles`}
        </CardTitle>
        <span className="text-xs font-medium text-muted-foreground">Livraison offerte</span>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {items.map((item) => (
          <CartItemRow key={item.name} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}
