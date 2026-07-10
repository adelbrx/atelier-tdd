import * as React from "react";

import { getCartItems } from "@/features/cart/cart-items";
import { CartBenefits } from "@/features/cart/components/cart-benefits";
import { CartItemsCard } from "@/features/cart/components/cart-items-card";
import { CheckoutHeading } from "@/features/cart/components/checkout-heading";
import { OrderSummary } from "@/features/cart/components/order-summary";
import { PromotionHelp } from "@/features/cart/components/promotion-help";
import { ShopHeader } from "@/features/cart/components/shop-header";
import { useCartPromotion } from "@/features/cart/hooks/use-cart-promotion";
import { usePromotionCatalog } from "@/features/cart/hooks/use-promotion-catalog";
import { toSafeMoney } from "@/lib/money";

interface CartPageProps {
  initialSubtotal?: number;
}

export function CartPage({ initialSubtotal = 50 }: CartPageProps) {
  const subtotal = React.useMemo(() => toSafeMoney(initialSubtotal), [initialSubtotal]);
  const items = React.useMemo(() => getCartItems(subtotal), [subtotal]);
  const promotions = usePromotionCatalog();
  const {
    code,
    activePromotion,
    errorMessage,
    discount,
    total,
    isApplying,
    isRemoving,
    updateCode,
    applyCode,
    removeCode,
  } = useCartPromotion(subtotal);

  return (
    <div className="min-h-screen">
      <ShopHeader />

      <main id="main-content" className="container py-10 lg:py-14">
        <CheckoutHeading />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section aria-labelledby="cart-items-title" className="space-y-6">
            <CartItemsCard items={items} />
            <CartBenefits />
            <PromotionHelp promotions={promotions} />
          </section>

          <OrderSummary
            code={code}
            onCodeChange={updateCode}
            onSubmit={applyCode}
            activePromotion={activePromotion}
            errorMessage={errorMessage}
            onRemove={removeCode}
            isApplying={isApplying}
            isRemoving={isRemoving}
            subtotal={subtotal}
            discount={discount}
            total={total}
          />
        </div>
      </main>
    </div>
  );
}
