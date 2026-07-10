export type MoneyValue = string | number;
export type PromotionType = "percentage" | "fixed";

export interface ApplyPromotionRequest {
  code: string;
  subtotal: string;
  active_code?: string | null;
}

export interface RemovePromotionRequest {
  subtotal: string;
  active_code?: string | null;
}

export interface PromotionResult {
  subtotal: MoneyValue;
  discount: MoneyValue;
  total: MoneyValue;
  applied_code: string | null;
  replaced_code: string | null;
  message: string;
}

export interface PromotionCatalogItem {
  code: string;
  aliases: string[];
  type: PromotionType;
  value: MoneyValue;
  minimum_subtotal: MoneyValue;
  expires_on: string | null;
  non_stackable: boolean;
}

export interface PromotionCatalogResponse {
  promotions: PromotionCatalogItem[];
}
