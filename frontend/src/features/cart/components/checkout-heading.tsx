import { Check, Sparkles } from "lucide-react";

export function CheckoutHeading() {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
          Dernière étape
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Votre panier</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vérifiez vos articles et profitez de votre meilleure offre.
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-full bg-success text-success-foreground">
          <Check className="size-4" aria-hidden="true" />
        </span>
        Panier
        <span className="h-px w-7 bg-border" aria-hidden="true" />
        <span className="grid size-7 place-items-center rounded-full border bg-white font-semibold text-foreground">
          2
        </span>
        Paiement
      </div>
    </div>
  );
}
