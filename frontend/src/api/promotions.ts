import type {
  ApplyPromotionRequest,
  PromotionCatalogResponse,
  PromotionCatalogItem,
  PromotionResult,
  RemovePromotionRequest,
} from "@/types/promotion";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const API_BASE_URL = configuredBaseUrl.replace(/\/$/, "");

export class PromotionApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromotionApiError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorDetail(payload: unknown): string | null {
  if (!isObject(payload)) return null;
  return typeof payload.detail === "string" ? payload.detail : null;
}

function invalidResponse(): never {
  throw new PromotionApiError("La réponse du service de promotions est invalide.");
}

function moneyToCents(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;

  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 1e-7) {
    return null;
  }
  return cents;
}

function isOptionalCode(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && /^[A-Za-z0-9]+$/.test(value));
}

function parsePromotionResult(
  payload: unknown,
  expectedSubtotal: string,
  expectsAppliedCode: boolean,
): PromotionResult {
  if (!isObject(payload)) invalidResponse();

  const expectedSubtotalCents = moneyToCents(expectedSubtotal);
  const subtotalCents = moneyToCents(payload.subtotal);
  const discountCents = moneyToCents(payload.discount);
  const totalCents = moneyToCents(payload.total);

  if (
    expectedSubtotalCents === null ||
    subtotalCents === null ||
    discountCents === null ||
    totalCents === null ||
    subtotalCents !== expectedSubtotalCents ||
    discountCents + totalCents !== subtotalCents ||
    !isOptionalCode(payload.applied_code) ||
    !isOptionalCode(payload.replaced_code) ||
    typeof payload.message !== "string"
  ) {
    invalidResponse();
  }

  if (expectsAppliedCode ? payload.applied_code === null : payload.applied_code !== null) {
    invalidResponse();
  }

  return payload as unknown as PromotionResult;
}

function isPromotionCatalogItem(value: unknown): value is PromotionCatalogItem {
  if (!isObject(value)) return false;
  return (
    typeof value.code === "string" &&
    /^[A-Za-z0-9]+$/.test(value.code) &&
    Array.isArray(value.aliases) &&
    value.aliases.every((alias) => typeof alias === "string" && /^[A-Za-z0-9]+$/.test(alias)) &&
    (value.type === "percentage" || value.type === "fixed") &&
    moneyToCents(value.value) !== null &&
    moneyToCents(value.minimum_subtotal) !== null &&
    (value.expires_on === null || typeof value.expires_on === "string") &&
    typeof value.non_stackable === "boolean"
  );
}

function parsePromotionCatalog(payload: unknown): PromotionCatalogResponse {
  if (
    !isObject(payload) ||
    !Array.isArray(payload.promotions) ||
    !payload.promotions.every(isPromotionCatalogItem)
  ) {
    invalidResponse();
  }
  return payload as unknown as PromotionCatalogResponse;
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new PromotionApiError(
      "Le service de promotions est momentanément indisponible. Réessayez dans un instant.",
    );
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    throw new PromotionApiError(
      getErrorDetail(payload) ?? "Impossible de traiter ce code promotionnel.",
    );
  }

  if (payload === null) {
    throw new PromotionApiError("La réponse du service de promotions est invalide.");
  }

  return payload;
}

export async function applyPromotion(
  payload: ApplyPromotionRequest,
  signal?: AbortSignal,
): Promise<PromotionResult> {
  const result = await request("/api/promotions/apply", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
  return parsePromotionResult(result, payload.subtotal, true);
}

export async function removePromotion(
  payload: RemovePromotionRequest,
  signal?: AbortSignal,
): Promise<PromotionResult> {
  const result = await request("/api/promotions/remove", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
  return parsePromotionResult(result, payload.subtotal, false);
}

export async function getPromotions(signal?: AbortSignal): Promise<PromotionCatalogResponse> {
  const result = await request("/api/promotions", { signal });
  return parsePromotionCatalog(result);
}

export function getPromotionErrorMessage(error: unknown): string {
  if (error instanceof PromotionApiError) return error.message;
  return "Une erreur inattendue est survenue. Réessayez dans un instant.";
}
