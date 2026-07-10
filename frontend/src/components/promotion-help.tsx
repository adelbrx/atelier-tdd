import { BadgePercent, Gift, TicketCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toSafeMoney } from "@/lib/money";
import type { PromotionCatalogItem } from "@/types/promotion";

const fallbackPromotions: PromotionCatalogItem[] = [
  {
    code: "BIENVENUE10",
    aliases: [],
    type: "percentage",
    value: "10.00",
    minimum_subtotal: "20.00",
    expires_on: null,
    non_stackable: true,
  },
  {
    code: "PROMO05",
    aliases: ["PROM05"],
    type: "fixed",
    value: "5.00",
    minimum_subtotal: "30.00",
    expires_on: null,
    non_stackable: true,
  },
  {
    code: "CADEAU40",
    aliases: [],
    type: "fixed",
    value: "40.00",
    minimum_subtotal: "30.00",
    expires_on: null,
    non_stackable: true,
  },
];

function promotionValue(promotion: PromotionCatalogItem): string {
  if (promotion.type === "percentage") {
    return `−${toSafeMoney(promotion.value).toLocaleString("fr-FR", {
      maximumFractionDigits: 2,
    })} %`;
  }
  return `−${formatCurrency(promotion.value)}`;
}

export function PromotionHelp({ promotions }: { promotions?: PromotionCatalogItem[] }) {
  const items = promotions && promotions.length > 0 ? promotions : fallbackPromotions;

  return (
    <Card className="overflow-hidden border-white/70 bg-white/75 shadow-none backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-primary">
          <TicketCheck className="size-5" aria-hidden="true" />
          <CardTitle className="text-base text-foreground">Vos avantages du moment</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((promotion, index) => {
          const Icon = index === 2 ? Gift : BadgePercent;
          return (
            <div
              key={promotion.code}
              className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-white/80 px-3.5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold tracking-wide text-foreground">
                    {promotion.code}
                    {promotion.aliases.length > 0 ? ` · ${promotion.aliases.join(" · ")}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dès {formatCurrency(promotion.minimum_subtotal)} d’achat
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-success">
                {promotionValue(promotion)}
              </span>
            </div>
          );
        })}
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          Un seul code peut être actif. Son éligibilité est toujours confirmée par le serveur au
          moment de l’application.
        </p>
      </CardContent>
    </Card>
  );
}
