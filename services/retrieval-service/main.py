"""Retrieval Service - Entry point for local development."""

import uvicorn

from src.config import Config

if __name__ == "__main__":
    config = Config.from_env()
    uvicorn.run("src.app:app", host="0.0.0.0", port=config.port, reload=True)
