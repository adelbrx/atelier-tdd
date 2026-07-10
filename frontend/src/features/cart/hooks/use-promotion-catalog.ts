import * as React from "react";

import { getPromotions } from "@/api/promotions";
import type { PromotionCatalogItem } from "@/types/promotion";

export function usePromotionCatalog(): PromotionCatalogItem[] | undefined {
  const [promotions, setPromotions] = React.useState<PromotionCatalogItem[]>();

  React.useEffect(() => {
    const controller = new AbortController();

    getPromotions(controller.signal)
      .then((result) => setPromotions(result.promotions))
      .catch(() => {
        // Le catalogue de secours reste affiché si ce contenu informatif
        // n'est momentanément pas disponible.
      });

    return () => controller.abort();
  }, []);

  return promotions;
}
