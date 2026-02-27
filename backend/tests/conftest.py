import sqlite3
from pathlib import Path

import pytest

from app import create_app
import app.routes.products as products_routes
import app.routes.chatbot as chatbot_routes


@pytest.fixture()
def temp_db(tmp_path):
    db_path = tmp_path / "test.db"

    # Patch DB paths used by the routes
    products_routes.DB_PATH = db_path
    chatbot_routes.DB_PATH = db_path

    # Ensure schema exists
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT,
                stock INTEGER DEFAULT 0,
                negotiation_history TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        conn.commit()

    return db_path


@pytest.fixture()
def client(temp_db):
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


class DummyModel:
    def __init__(self, value):
        self.value = value

    def predict(self, X):
        # Return constant prediction for test stability
        return [self.value for _ in range(len(X))]


@pytest.fixture()
def mock_models(monkeypatch):
    def _fake_load_models(_models_dir):
        return DummyModel(1900.0), DummyModel(1800.0)

    monkeypatch.setattr(chatbot_routes, "load_models", _fake_load_models)
    # Reset cache so patched loader is used
    chatbot_routes._models_cache = None

    return _fake_load_models
