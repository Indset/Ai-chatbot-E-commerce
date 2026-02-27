import sqlite3


def seed_products(db_path):
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO products (product_id, name, description, price, category, stock, negotiation_history)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("p1", "Product One", "Desc", 2000.0, "cat", 10, ""),
        )
        conn.execute(
            """
            INSERT INTO products (product_id, name, description, price, category, stock, negotiation_history)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("p2", "Product Two", "Desc", 1500.0, "cat", 5, ""),
        )
        conn.commit()


def test_get_products_returns_list(client, temp_db):
    seed_products(temp_db)

    resp = client.get("/products/")
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["success"] is True
    assert isinstance(payload["data"], list)
    assert len(payload["data"]) == 2


def test_chatbot_suggested_price_in_range(client, temp_db, mock_models):
    seed_products(temp_db)

    body = {"user_message": "offer", "product_id": "p1", "offered_price": 1500}
    resp = client.post("/chatbot/", json=body)

    assert resp.status_code == 200
    payload = resp.get_json()

    assert payload["success"] is True
    assert payload["product_id"] == "p1"
    assert payload["original_price"] == 2000.0

    suggested = payload["suggested_price"]
    # Business rule: suggestion should be >= offered_price and <= 1.05 * base price
    assert suggested >= 1500
    assert suggested <= 2100


def test_chatbot_offered_above_base(client, temp_db, mock_models):
    seed_products(temp_db)

    body = {"user_message": "offer", "product_id": "p2", "offered_price": 1800}
    resp = client.post("/chatbot/", json=body)

    assert resp.status_code == 200
    payload = resp.get_json()

    suggested = payload["suggested_price"]
    # If user offers above base, suggestion should not go below user's offer
    assert suggested >= 1800
