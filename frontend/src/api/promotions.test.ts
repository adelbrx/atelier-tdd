import { afterEach, describe, expect, it, vi } from "vitest";

import { applyPromotion, PromotionApiError } from "@/api/promotions";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(payload: unknown) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(payload));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("contrat runtime de l’API promotions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepte une réponse cohérente avec le sous-total demandé", async () => {
    mockFetch({
      subtotal: "30.00",
      discount: "30.00",
      total: "0.00",
      applied_code: "CADEAU40",
      replaced_code: null,
      message: "Le code promo CADEAU40 a été appliqué.",
    });

    await expect(
      applyPromotion({ code: "CADEAU40", subtotal: "30.00", active_code: null }),
    ).resolves.toMatchObject({ total: "0.00", applied_code: "CADEAU40" });
  });

  it.each([
    {
      label: "total négatif",
      response: {
        subtotal: "30.00",
        discount: "40.00",
        total: "-10.00",
        applied_code: "CADEAU40",
        replaced_code: null,
        message: "Réponse incohérente",
      },
    },
    {
      label: "sous-total différent",
      response: {
        subtotal: "10.00",
        discount: "5.00",
        total: "5.00",
        applied_code: "PROMO05",
        replaced_code: null,
        message: "Réponse incohérente",
      },
    },
    {
      label: "champ monétaire absent",
      response: {
        subtotal: "30.00",
        discount: "5.00",
        applied_code: "PROMO05",
        replaced_code: null,
        message: "Réponse incomplète",
      },
    },
  ])("rejette une réponse 2xx malformée : $label", async ({ response }) => {
    mockFetch(response);

    await expect(
      applyPromotion({ code: "PROMO05", subtotal: "30.00", active_code: null }),
    ).rejects.toEqual(
      new PromotionApiError("La réponse du service de promotions est invalide."),
    );
  });
});

