import type { CartItem } from "@/features/cart/types";

export const DEFAULT_CART_ITEMS: readonly CartItem[] = [
  {
    name: "Clavier compact Air",
    description: "Sable · AZERTY",
    price: 32,
    accent: "from-indigo-100 to-violet-50 text-indigo-700",
    symbol: "⌨",
  },
  {
    name: "Souris nomade",
    description: "Sauge · Sans fil",
    price: 18,
    accent: "from-emerald-100 to-teal-50 text-emerald-700",
    symbol: "●",
  },
];

export function getCartItems(subtotal: number): readonly CartItem[] {
  if (subtotal === 50) return DEFAULT_CART_ITEMS;

  return [
    {
      name: "Sélection MicroShop",
      description: "Votre sélection",
      price: subtotal,
      accent: "from-indigo-100 to-violet-50 text-indigo-700",
      symbol: "✦",
    },
  ];
}
