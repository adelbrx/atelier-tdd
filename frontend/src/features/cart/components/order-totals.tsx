import { formatCurrency } from "@/lib/money";

interface OrderTotalsProps {
  subtotal: number;
  discount: number;
  total: number;
  hasActivePromotion: boolean;
}

export function OrderTotals({
  subtotal,
  discount,
  total,
  hasActivePromotion,
}: OrderTotalsProps) {
  return (
    <>
      <div className="space-y-3 border-y py-5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Sous-total</span>
          <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Livraison</span>
          <span className="font-semibold text-success">Offerte</span>
        </div>
        {hasActivePromotion ? (
          <div className="flex items-center justify-between gap-4" data-testid="discount-row">
            <span className="text-muted-foreground">Remise</span>
            <span className="font-semibold tabular-nums text-success">
              −{formatCurrency(discount)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-semibold">Total</p>
          <p className="mt-1 text-xs text-muted-foreground">TVA incluse</p>
        </div>
        <p
          className="text-3xl font-black tracking-tight tabular-nums"
          data-testid="order-total"
          aria-label={`Total à payer : ${formatCurrency(total)}`}
        >
          {formatCurrency(total)}
        </p>
      </div>
    </>
  );
}
