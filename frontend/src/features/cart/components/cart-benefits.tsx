import { Gift, PackageCheck } from "lucide-react";

export function CartBenefits() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-start gap-3 rounded-lg border border-white/70 bg-white/60 p-4">
        <PackageCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Expédition sous 24 h</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Suivi inclus jusqu’à votre porte.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-white/70 bg-white/60 p-4">
        <Gift className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Emballage soigné</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Préparé avec attention par notre équipe.
          </p>
        </div>
      </div>
    </div>
  );
}
