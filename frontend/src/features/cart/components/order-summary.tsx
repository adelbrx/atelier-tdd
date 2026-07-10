import type { FormEventHandler } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { ActivePromotionAlert } from "@/features/cart/components/active-promotion-alert";
import { OrderTotals } from "@/features/cart/components/order-totals";
import { PromotionCodeForm } from "@/features/cart/components/promotion-code-form";
import { PromotionErrorAlert } from "@/features/cart/components/promotion-error-alert";
import type { ActivePromotion } from "@/features/cart/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderSummaryProps {
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  activePromotion: ActivePromotion | null;
  errorMessage: string | null;
  onRemove: () => void;
  isApplying: boolean;
  isRemoving: boolean;
  subtotal: number;
  discount: number;
  total: number;
}

export function OrderSummary({
  code,
  onCodeChange,
  onSubmit,
  activePromotion,
  errorMessage,
  onRemove,
  isApplying,
  isRemoving,
  subtotal,
  discount,
  total,
}: OrderSummaryProps) {
  const isBusy = isApplying || isRemoving;
  const hasActivePromotion = activePromotion !== null;

  return (
    <aside aria-labelledby="summary-title" className="lg:sticky lg:top-6">
      <Card className="overflow-hidden border-white/80 bg-white/95">
        <CardHeader className="border-b pb-5">
          <CardTitle id="summary-title" className="text-lg">
            Récapitulatif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <PromotionCodeForm
            code={code}
            onCodeChange={onCodeChange}
            onSubmit={onSubmit}
            hasActivePromotion={hasActivePromotion}
            errorMessage={errorMessage}
            isBusy={isBusy}
            isApplying={isApplying}
          />

          {errorMessage ? <PromotionErrorAlert message={errorMessage} /> : null}

          {activePromotion ? (
            <ActivePromotionAlert
              promotion={activePromotion}
              onRemove={onRemove}
              isBusy={isBusy}
              isRemoving={isRemoving}
            />
          ) : null}

          <OrderTotals
            subtotal={subtotal}
            discount={discount}
            total={total}
            hasActivePromotion={hasActivePromotion}
          />

          <Button type="button" size="lg" className="w-full">
            Passer au paiement
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Vos données sont chiffrées et protégées
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
