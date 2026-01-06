from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.db import init_db
from app.routes import chat, conversations, speech, stt, tts
from app.services.llm import ProviderFactory
from app.services.tts_service import tts_service
from app.services.whisper_service import whisper_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


# Create FastAPI application
app = FastAPI(
    title="Babblr API",
    description="Language learning app with AI tutor - Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.babblr_frontend_url, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(speech.router)
app.include_router(tts.router)
app.include_router(stt.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Babblr API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Detailed health check."""
    # Check if Claude API key is properly configured (not placeholder)
    claude_configured = (
        settings.anthropic_api_key and settings.anthropic_api_key != "your_anthropic_api_key_here"
    )

    # Ollama model listing is best-effort: backend should still be healthy if Ollama is down.
    ollama_available_models: list[str] | None = None
    try:
        ollama = ProviderFactory.get_provider("ollama")
        if hasattr(ollama, "list_models"):
            ollama_available_models = await ollama.list_models()
    except Exception:
        ollama_available_models = None

    whisper_cuda = (
        whisper_service.get_cuda_info() if hasattr(whisper_service, "get_cuda_info") else {}
    )

    return {
        "status": "healthy",
        "database": "connected",
        "llm_provider": settings.llm_provider,
        "services": {
            "whisper": {
                "status": "loaded",
                "current_model": settings.whisper_model,
                "supported_models": whisper_service.get_available_models(),
                "supported_locales": (
                    whisper_service.get_supported_locales()
                    if hasattr(whisper_service, "get_supported_locales")
                    else whisper_service.get_supported_languages()
                ),
                "runtime": whisper_cuda,
            },
            "claude": "configured" if claude_configured else "not configured",
            "ollama": {
                "status": "configured",
                "base_url": settings.ollama_base_url,
                "configured_model": settings.ollama_model,
                "available_models": ollama_available_models,
            },  # Availability checked at request time
            "tts": {
                "status": "available" if tts_service.is_edge_tts_available() else "unavailable",
                "backend": "edge-tts" if tts_service.is_edge_tts_available() else None,
                "supported_locales": tts_service.get_supported_locales(),
            },
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host=settings.babblr_api_host, port=settings.babblr_api_port, reload=True
    )


def main():
    """Entry point for uv script."""
    import uvicorn

    uvicorn.run(
        "app.main:app", host=settings.babblr_api_host, port=settings.babblr_api_port, reload=True
    )
