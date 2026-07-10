export interface CartItem {
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly accent: string;
  readonly symbol: string;
}

export interface ActivePromotion {
  readonly code: string;
  readonly discount: number;
  readonly total: number;
}
