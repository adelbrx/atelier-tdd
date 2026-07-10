import { ShieldCheck, ShoppingBag } from "lucide-react";

export function ShopHeader() {
  return (
    <header className="border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <a href="#main-content" className="focus-ring flex items-center gap-3 rounded-md">
          <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <ShoppingBag className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-black leading-none tracking-tight">MicroShop</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              petits objets, grandes idées
            </span>
          </span>
        </a>
        <div className="hidden items-center gap-2 rounded-full border bg-white/70 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          Paiement sécurisé
        </div>
      </div>
    </header>
  );
}
