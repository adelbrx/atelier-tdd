import * as React from "react";

import {
  applyPromotion,
  getPromotionErrorMessage,
  PromotionApiError,
  removePromotion,
} from "@/api/promotions";
import { useToast } from "@/components/ui/toast";
import type { ActivePromotion } from "@/features/cart/types";
import { toDecimalString, toSafeMoney } from "@/lib/money";

interface UseCartPromotionResult {
  code: string;
  activePromotion: ActivePromotion | null;
  errorMessage: string | null;
  discount: number;
  total: number;
  isApplying: boolean;
  isRemoving: boolean;
  updateCode: (value: string) => void;
  applyCode: React.FormEventHandler<HTMLFormElement>;
  removeCode: () => Promise<void>;
}

function normalizeCode(value: string): string {
  return value.trim().toLocaleUpperCase("fr-FR");
}

export function useCartPromotion(subtotal: number): UseCartPromotionResult {
  const [code, setCode] = React.useState("");
  const [activePromotion, setActivePromotion] = React.useState<ActivePromotion | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setActivePromotion(null);
    setErrorMessage(null);
  }, [subtotal]);

  const updateCode = React.useCallback((value: string) => {
    setCode(value);
    setErrorMessage(null);
  }, []);

  const applyCode = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();
      const normalizedCode = normalizeCode(code);

      if (!normalizedCode) {
        const message = "Saisissez un code promotionnel.";
        setErrorMessage(message);
        toast({
          title: "Code requis",
          description: message,
          variant: "destructive",
        });
        return;
      }

      const previousCode = activePromotion?.code ?? null;
      setErrorMessage(null);
      setIsApplying(true);

      try {
        const result = await applyPromotion({
          code: normalizedCode,
          subtotal: toDecimalString(subtotal),
          active_code: previousCode,
        });

        if (!result.applied_code) {
          throw new PromotionApiError("La réponse du service de promotions est invalide.");
        }

        const safeTotal = toSafeMoney(result.total, subtotal);
        const safeDiscount = toSafeMoney(subtotal - safeTotal, subtotal);
        const appliedCode = normalizeCode(result.applied_code);
        const replacedCode = result.replaced_code
          ? normalizeCode(result.replaced_code)
          : previousCode && previousCode !== appliedCode
            ? previousCode
            : null;

        setActivePromotion({
          code: appliedCode,
          discount: safeDiscount,
          total: safeTotal,
        });
        setCode("");

        if (replacedCode) {
          toast({
            title: "Code promotionnel remplacé",
            description: `${replacedCode} a été remplacé automatiquement par ${appliedCode}. ${result.message}`,
            variant: "success",
          });
        } else {
          toast({
            title: `${appliedCode} appliqué`,
            description: result.message,
            variant: "success",
          });
        }
      } catch (error) {
        const message = getPromotionErrorMessage(error);
        setErrorMessage(message);
        toast({
          title: "Impossible d’appliquer ce code",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsApplying(false);
      }
    },
    [activePromotion, code, subtotal, toast],
  );

  const removeCode = React.useCallback(async () => {
    if (!activePromotion) return;

    setErrorMessage(null);
    setIsRemoving(true);

    try {
      const removedCode = activePromotion.code;
      const result = await removePromotion({
        subtotal: toDecimalString(subtotal),
        active_code: removedCode,
      });
      setActivePromotion(null);
      toast({
        title: "Code retiré",
        description: result.message || `${removedCode} a été retiré de votre panier.`,
      });
    } catch (error) {
      const message = getPromotionErrorMessage(error);
      setErrorMessage(message);
      toast({
        title: "Impossible de retirer le code",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  }, [activePromotion, subtotal, toast]);

  return {
    code,
    activePromotion,
    errorMessage,
    discount: activePromotion?.discount ?? 0,
    total: activePromotion?.total ?? subtotal,
    isApplying,
    isRemoving,
    updateCode,
    applyCode,
    removeCode,
  };
}
