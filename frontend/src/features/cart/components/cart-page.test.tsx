import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyPromotion,
  getPromotions,
  PromotionApiError,
  removePromotion,
} from "@/api/promotions";
import { ToastProvider } from "@/components/ui/toast";
import { CartPage } from "@/features/cart/components/cart-page";
import type { PromotionResult } from "@/types/promotion";

vi.mock("@/api/promotions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/promotions")>();
  return {
    ...actual,
    applyPromotion: vi.fn(),
    getPromotions: vi.fn(),
    removePromotion: vi.fn(),
  };
});

const applyPromotionMock = vi.mocked(applyPromotion);
const getPromotionsMock = vi.mocked(getPromotions);
const removePromotionMock = vi.mocked(removePromotion);

function promotionResult(
  overrides: Partial<PromotionResult> & Pick<PromotionResult, "applied_code">,
): PromotionResult {
  return {
    subtotal: "50.00",
    discount: "0.00",
    total: "50.00",
    replaced_code: null,
    message: "Le code promotionnel a été appliqué.",
    ...overrides,
  };
}

function renderCart(subtotal: number) {
  return render(
    <ToastProvider>
      <CartPage initialSubtotal={subtotal} />
    </ToastProvider>,
  );
}

async function submitCode(code: string) {
  const user = userEvent.setup();
  const input = screen.getByRole("textbox", { name: /code promotionnel/i });
  await user.clear(input);
  await user.type(input, code);
  await user.click(screen.getByRole("button", { name: "Appliquer" }));
  return user;
}

describe("gestion des codes promotionnels au panier", () => {
  beforeEach(() => {
    applyPromotionMock.mockReset();
    getPromotionsMock.mockReset();
    removePromotionMock.mockReset();
    getPromotionsMock.mockResolvedValue({ promotions: [] });
  });

  it.each([
    {
      subtotal: 20,
      code: "BIENVENUE10",
      discount: "2.00",
      total: "18.00",
      expectedTotal: /18,00\s*€/, 
    },
    {
      subtotal: 50,
      code: "BIENVENUE10",
      discount: "5.00",
      total: "45.00",
      expectedTotal: /45,00\s*€/,
    },
    {
      subtotal: 30,
      code: "PROMO05",
      discount: "5.00",
      total: "25.00",
      expectedTotal: /25,00\s*€/,
    },
  ])(
    "applique $code sur un panier de $subtotal € et affiche le total attendu",
    async ({ subtotal, code, discount, total, expectedTotal }) => {
      applyPromotionMock.mockResolvedValueOnce(
        promotionResult({
          subtotal: subtotal.toFixed(2),
          discount,
          total,
          applied_code: code,
        }),
      );
      renderCart(subtotal);

      await submitCode(code.toLocaleLowerCase("fr-FR"));

      expect(await screen.findByTestId("active-promotion")).toHaveTextContent(code);
      expect(screen.getByTestId("order-total")).toHaveTextContent(expectedTotal);
      expect(applyPromotionMock).toHaveBeenLastCalledWith({
        code,
        subtotal: subtotal.toFixed(2),
        active_code: null,
      });
    },
  );

  it("remplace automatiquement le premier code valide et l'annonce clairement", async () => {
    applyPromotionMock
      .mockResolvedValueOnce(
        promotionResult({
          discount: "5.00",
          total: "45.00",
          applied_code: "BIENVENUE10",
        }),
      )
      .mockResolvedValueOnce(
        promotionResult({
          discount: "5.00",
          total: "45.00",
          applied_code: "PROMO05",
          replaced_code: "BIENVENUE10",
          message: "La meilleure offre active a été mise à jour.",
        }),
      );
    renderCart(50);

    await submitCode("BIENVENUE10");
    await screen.findByText("BIENVENUE10 appliqué");
    await submitCode("PROMO05");

    const activePromotion = await screen.findByTestId("active-promotion");
    expect(within(activePromotion).getByText("PROMO05")).toBeInTheDocument();
    expect(await screen.findByText("Code promotionnel remplacé")).toBeInTheDocument();
    expect(
      screen.getByText(/BIENVENUE10 a été remplacé automatiquement par PROMO05/),
    ).toBeInTheDocument();
    expect(applyPromotionMock).toHaveBeenNthCalledWith(2, {
      code: "PROMO05",
      subtotal: "50.00",
      active_code: "BIENVENUE10",
    });
  });

  it("affiche sans la modifier l'erreur d'expiration renvoyée par l'API", async () => {
    applyPromotionMock.mockRejectedValueOnce(
      new PromotionApiError("Ce code promo est expiré."),
    );
    renderCart(50);

    await submitCode("ANCIEN10");

    const alert = await screen.findByText("Code non appliqué");
    expect(alert.closest("[role='alert']")).toHaveTextContent("Ce code promo est expiré.");
    expect(screen.getByTestId("order-total")).toHaveTextContent(/50,00\s*€/);
    expect(screen.queryByTestId("active-promotion")).not.toBeInTheDocument();
  });

  it("refuse un code vide sans appeler l'API", async () => {
    const user = userEvent.setup();
    renderCart(50);

    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(applyPromotionMock).not.toHaveBeenCalled();
    const alertTitle = await screen.findByText("Code non appliqué");
    expect(alertTitle.closest("[role='alert']")).toHaveTextContent(
      "Saisissez un code promotionnel.",
    );
  });

  it("conserve le code et les montants actifs quand le second code est expiré", async () => {
    applyPromotionMock
      .mockResolvedValueOnce(
        promotionResult({
          discount: "5.00",
          total: "45.00",
          applied_code: "BIENVENUE10",
        }),
      )
      .mockRejectedValueOnce(new PromotionApiError("Ce code promo est expiré."));
    renderCart(50);

    await submitCode("BIENVENUE10");
    await screen.findByText("BIENVENUE10 appliqué");
    await submitCode("ANCIEN20");

    const activePromotion = await screen.findByTestId("active-promotion");
    expect(within(activePromotion).getByText("BIENVENUE10")).toBeInTheDocument();
    expect(screen.getByTestId("order-total")).toHaveTextContent(/45,00\s*€/);
    expect(screen.getByTestId("discount-row")).toHaveTextContent(/5,00\s*€/);
    expect(screen.getByText("Code non appliqué").closest("[role='alert']")).toHaveTextContent(
      "Ce code promo est expiré.",
    );
    expect(applyPromotionMock).toHaveBeenNthCalledWith(2, {
      code: "ANCIEN20",
      subtotal: "50.00",
      active_code: "BIENVENUE10",
    });
  });

  it("bloque le total à 0,00 € même si l'API retourne un total négatif", async () => {
    applyPromotionMock.mockResolvedValueOnce(
      promotionResult({
        subtotal: "30.00",
        discount: "40.00",
        total: "-10.00",
        applied_code: "CADEAU40",
      }),
    );
    renderCart(30);

    await submitCode("CADEAU40");

    expect(await screen.findByTestId("active-promotion")).toHaveTextContent("CADEAU40");
    expect(screen.getByTestId("order-total")).toHaveTextContent(/0,00\s*€/);
    expect(screen.getByTestId("discount-row")).toHaveTextContent(/30,00\s*€/);
    expect(screen.getByTestId("order-total")).not.toHaveTextContent("−");
  });

  it("retire le code actif via l'API et restaure le sous-total", async () => {
    applyPromotionMock.mockResolvedValueOnce(
      promotionResult({
        discount: "5.00",
        total: "45.00",
        applied_code: "BIENVENUE10",
      }),
    );
    removePromotionMock.mockResolvedValueOnce(
      promotionResult({
        discount: "0.00",
        total: "50.00",
        applied_code: null,
        message: "Le code BIENVENUE10 a été retiré.",
      }),
    );
    renderCart(50);
    const user = await submitCode("BIENVENUE10");

    await user.click(
      await screen.findByRole("button", { name: "Retirer le code BIENVENUE10" }),
    );

    await waitFor(() => {
      expect(screen.queryByTestId("active-promotion")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("order-total")).toHaveTextContent(/50,00\s*€/);
    expect(removePromotionMock).toHaveBeenCalledWith({
      subtotal: "50.00",
      active_code: "BIENVENUE10",
    });
  });

  it("réinitialise la promotion quand le sous-total du panier change", async () => {
    applyPromotionMock.mockResolvedValueOnce(
      promotionResult({
        discount: "5.00",
        total: "45.00",
        applied_code: "BIENVENUE10",
      }),
    );
    const view = renderCart(50);

    await submitCode("BIENVENUE10");
    expect(await screen.findByTestId("active-promotion")).toHaveTextContent("BIENVENUE10");

    view.rerender(
      <ToastProvider>
        <CartPage initialSubtotal={30} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("active-promotion")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("order-total")).toHaveTextContent(/30,00\s*€/);
    expect(screen.queryByTestId("discount-row")).not.toBeInTheDocument();
  });
});
