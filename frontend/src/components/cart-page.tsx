import * as React from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Gift,
  LoaderCircle,
  LockKeyhole,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import {
  applyPromotion,
  getPromotionErrorMessage,
  getPromotions,
  removePromotion,
} from "@/api/promotions";
import { PromotionHelp } from "@/components/promotion-help";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, toDecimalString, toSafeMoney } from "@/lib/money";
import type { PromotionCatalogItem } from "@/types/promotion";

interface CartPageProps {
  initialSubtotal?: number;
}

interface ActivePromotion {
  code: string;
  discount: number;
  total: number;
}

const defaultCartItems = [
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

function normalizeCode(value: string): string {
  return value.trim().toLocaleUpperCase("fr-FR");
}

export function CartPage({ initialSubtotal = 50 }: CartPageProps) {
  const subtotal = React.useMemo(() => toSafeMoney(initialSubtotal), [initialSubtotal]);
  const [code, setCode] = React.useState("");
  const [activePromotion, setActivePromotion] = React.useState<ActivePromotion | null>(null);
  const [catalog, setCatalog] = React.useState<PromotionCatalogItem[] | undefined>();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const { toast } = useToast();

  const total = activePromotion?.total ?? subtotal;
  const discount = activePromotion?.discount ?? 0;
  const showDefaultItems = subtotal === 50;

  React.useEffect(() => {
    const controller = new AbortController();
    getPromotions(controller.signal)
      .then((result) => setCatalog(result.promotions))
      .catch(() => {
        // La carte d'aide dispose d'un contenu de repli; une panne catalogue
        // ne doit jamais empêcher l'utilisation du panier.
      });
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    setActivePromotion(null);
    setErrorMessage(null);
  }, [subtotal]);

  async function handleApply(event: React.FormEvent<HTMLFormElement>) {
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
        throw new Error("Le serveur n’a retourné aucun code actif.");
      }

      // Double garde-fou : même une réponse serveur incorrecte ne peut être
      // affichée sous zéro ou au-dessus du sous-total.
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
  }

  async function handleRemove() {
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
  }

  return (
    <div className="min-h-screen">
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

      <main id="main-content" className="container py-10 lg:py-14">
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

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section aria-labelledby="cart-items-title" className="space-y-6">
            <Card className="overflow-hidden border-white/80 bg-white/90">
              <CardHeader className="flex-row items-center justify-between border-b bg-white/60 py-5">
                <CardTitle id="cart-items-title" className="text-lg">
                  {showDefaultItems ? "2 articles" : "1 article"}
                </CardTitle>
                <span className="text-xs font-medium text-muted-foreground">Livraison offerte</span>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {(showDefaultItems
                  ? defaultCartItems
                  : [
                      {
                        name: "Sélection MicroShop",
                        description: "Votre sélection",
                        price: subtotal,
                        accent: "from-indigo-100 to-violet-50 text-indigo-700",
                        symbol: "✦",
                      },
                    ]
                ).map((item) => (
                  <article key={item.name} className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
                    <div
                      className={`grid size-20 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-2xl ${item.accent}`}
                      aria-hidden="true"
                    >
                      {item.symbol}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold">{item.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      <div className="mt-3 flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          aria-label={`Diminuer la quantité de ${item.name}`}
                          disabled
                        >
                          <Minus className="size-3" aria-hidden="true" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold" aria-label="Quantité 1">
                          1
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          aria-label={`Augmenter la quantité de ${item.name}`}
                          disabled
                        >
                          <Plus className="size-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-4">
                      <span className="font-bold tabular-nums">{formatCurrency(item.price)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        aria-label={`Supprimer ${item.name}`}
                        disabled
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </article>
                ))}
              </CardContent>
            </Card>

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

            <PromotionHelp promotions={catalog} />
          </section>

          <aside aria-labelledby="summary-title" className="lg:sticky lg:top-6">
            <Card className="overflow-hidden border-white/80 bg-white/95">
              <CardHeader className="border-b pb-5">
                <CardTitle id="summary-title" className="text-lg">
                  Récapitulatif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Tag className="size-4 text-primary" aria-hidden="true" />
                    <label htmlFor="promo-code" className="text-sm font-semibold">
                      Code promotionnel
                    </label>
                  </div>
                  <form onSubmit={handleApply} noValidate>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="promo-code"
                        name="promo-code"
                        value={code}
                        onChange={(event) => {
                          setCode(event.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="Ex. BIENVENUE10"
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={errorMessage ? "promo-error" : "promo-help"}
                        className="font-mono uppercase tracking-wide"
                        disabled={isApplying || isRemoving}
                      />
                      <Button type="submit" className="shrink-0" disabled={isApplying || isRemoving}>
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
                      {activePromotion
                        ? "Un nouveau code valide remplacera automatiquement le code actif."
                        : "Saisissez votre code sans espace avant ou après."}
                    </p>
                  </form>
                </div>

                {errorMessage ? (
                  <Alert id="promo-error" variant="destructive">
                    <CircleAlert className="size-4" aria-hidden="true" />
                    <AlertTitle>Code non appliqué</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {activePromotion ? (
                  <Alert variant="success" role="status" data-testid="active-promotion">
                    <Check className="size-4" aria-hidden="true" />
                    <AlertTitle>Code actif</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-3">
                      <span className="font-mono font-bold tracking-wide">{activePromotion.code}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemove}
                        disabled={isRemoving || isApplying}
                        className="h-7 px-2 text-success hover:bg-success/10 hover:text-success"
                        aria-label={`Retirer le code ${activePromotion.code}`}
                      >
                        {isRemoving ? (
                          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <X className="size-3.5" aria-hidden="true" />
                        )}
                        Retirer
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-3 border-y py-5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="font-semibold text-success">Offerte</span>
                  </div>
                  {activePromotion ? (
                    <div className="flex items-center justify-between gap-4" data-testid="discount-row">
                      <span className="text-muted-foreground">Remise</span>
                      <span className="font-semibold tabular-nums text-success">
                        −{formatCurrency(discount)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-semibold">Total</p>
                    <p className="mt-1 text-xs text-muted-foreground">TVA incluse</p>
                  </div>
                  <p
                    className="text-3xl font-black tracking-tight tabular-nums"
                    data-testid="order-total"
                    aria-label={`Total à payer : ${formatCurrency(total)}`}
                  >
                    {formatCurrency(total)}
                  </p>
                </div>

                <Button type="button" size="lg" className="w-full">
                  Passer au paiement
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <LockKeyhole className="size-3.5" aria-hidden="true" />
                  Vos données sont chiffrées et protégées
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
