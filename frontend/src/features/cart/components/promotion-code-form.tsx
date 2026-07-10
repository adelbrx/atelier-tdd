import type { FormEventHandler } from "react";
import { LoaderCircle, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PromotionCodeFormProps {
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  hasActivePromotion: boolean;
  errorMessage: string | null;
  isBusy: boolean;
  isApplying: boolean;
}

export function PromotionCodeForm({
  code,
  onCodeChange,
  onSubmit,
  hasActivePromotion,
  errorMessage,
  isBusy,
  isApplying,
}: PromotionCodeFormProps) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Tag className="size-4 text-primary" aria-hidden="true" />
        <label htmlFor="promo-code" className="text-sm font-semibold">
          Code promotionnel
        </label>
      </div>
      <form onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="promo-code"
            name="promo-code"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder="Ex. BIENVENUE10"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? "promo-error" : "promo-help"}
            className="font-mono uppercase tracking-wide"
            disabled={isBusy}
          />
          <Button type="submit" className="shrink-0" disabled={isBusy}>
            {isApplying ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Validation…
              </>
            ) : (
              "Appliquer"
            )}
          </Button>
        </div>
        <p id="promo-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {hasActivePromotion
            ? "Un nouveau code valide remplacera automatiquement le code actif."
            : "Saisissez votre code sans espace avant ou après."}
        </p>
      </form>
    </div>
  );
}
