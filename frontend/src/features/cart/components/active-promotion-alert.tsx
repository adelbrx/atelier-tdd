import { Check, LoaderCircle, X } from "lucide-react";

import type { ActivePromotion } from "@/features/cart/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ActivePromotionAlertProps {
  promotion: ActivePromotion;
  onRemove: () => void;
  isBusy: boolean;
  isRemoving: boolean;
}

export function ActivePromotionAlert({
  promotion,
  onRemove,
  isBusy,
  isRemoving,
}: ActivePromotionAlertProps) {
  return (
    <Alert variant="success" role="status" data-testid="active-promotion">
      <Check className="size-4" aria-hidden="true" />
      <AlertTitle>Code actif</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span className="font-mono font-bold tracking-wide">{promotion.code}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isBusy}
          className="h-7 px-2 text-success hover:bg-success/10 hover:text-success"
          aria-label={`Retirer le code ${promotion.code}`}
        >
          {isRemoving ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <X className="size-3.5" aria-hidden="true" />
          )}
          Retirer
        </Button>
      </AlertDescription>
    </Alert>
  );
}
