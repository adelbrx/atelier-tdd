from __future__ import annotations

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import (
    ApplyPromotionRequest,
    HealthResponse,
    PromotionApplicationResponse,
    PromotionCatalogResponse,
    RemovePromotionRequest,
)
from .promotions import PromotionError, PromotionService


def get_promotion_service(request: Request) -> PromotionService:
    return request.app.state.promotion_service


def create_app(promotion_service: PromotionService | None = None) -> FastAPI:
    application = FastAPI(
        title="MicroShop Promotions API",
        version="1.0.0",
        description="Gestion securisee des codes promotionnels du panier MicroShop.",
    )
    application.state.promotion_service = promotion_service or PromotionService()

    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @application.exception_handler(PromotionError)
    async def handle_promotion_error(
        _request: Request, error: PromotionError
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": error.message})

    @application.get("/health", response_model=HealthResponse, tags=["system"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @application.get(
        "/api/promotions",
        response_model=PromotionCatalogResponse,
        tags=["promotions"],
    )
    def list_promotions(
        service: PromotionService = Depends(get_promotion_service),
    ) -> PromotionCatalogResponse:
        return service.list_promotions()

    @application.post(
        "/api/promotions/apply",
        response_model=PromotionApplicationResponse,
        tags=["promotions"],
    )
    def apply_promotion(
        payload: ApplyPromotionRequest,
        service: PromotionService = Depends(get_promotion_service),
    ) -> PromotionApplicationResponse:
        return service.apply(
            subtotal=payload.subtotal,
            code=payload.code,
            active_code=payload.active_code,
        )

    @application.post(
        "/api/promotions/remove",
        response_model=PromotionApplicationResponse,
        tags=["promotions"],
    )
    def remove_promotion(
        payload: RemovePromotionRequest,
        service: PromotionService = Depends(get_promotion_service),
    ) -> PromotionApplicationResponse:
        return service.remove(
            subtotal=payload.subtotal,
            active_code=payload.active_code,
        )

    return application


app = create_app()

