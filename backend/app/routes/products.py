import sqlite3
from pathlib import Path
from flask import Blueprint, jsonify, request

products_bp = Blueprint("products", __name__)
DB_PATH = Path(__file__).resolve().parents[2] / "database" / "app.db"

CREATE_TABLE_SQL = """
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


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_table():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.execute(CREATE_TABLE_SQL)
        conn.commit()


@products_bp.route("/", methods=["GET"])
def list_products():
    try:
        with get_conn() as conn:
            rows = conn.execute("SELECT * FROM products").fetchall()
        data = [dict(r) for r in rows]
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@products_bp.route("/<int:id>", methods=["GET"])
def get_product(id):
    try:
        with get_conn() as conn:
            row = conn.execute("SELECT * FROM products WHERE id = ?", (id,)).fetchone()
        if row is None:
            return jsonify({"success": False, "error": "Product not found"}), 404
        return jsonify({"success": True, "data": dict(row)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@products_bp.route("/", methods=["POST"])
def create_product():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        required = ["product_id", "name", "price"]
        missing = [k for k in required if k not in payload]
        if missing:
            return jsonify({"success": False, "error": f"Missing fields: {', '.join(missing)}"}), 400

        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO products (product_id, name, description, price, category, stock, negotiation_history)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.get("product_id"),
                    payload.get("name"),
                    payload.get("description"),
                    float(payload.get("price")),
                    payload.get("category"),
                    int(payload.get("stock") or 0),
                    payload.get("negotiation_history"),
                ),
            )
            conn.commit()
        return jsonify({"success": True, "data": payload}), 201
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Duplicate product_id"}), 409
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@products_bp.route("/<int:id>", methods=["PUT"])
def update_product(id):
    try:
        payload = request.get_json(force=True, silent=True) or {}
        fields = ["product_id", "name", "description", "price", "category", "stock", "negotiation_history"]
        updates = {k: payload[k] for k in fields if k in payload}
        if not updates:
            return jsonify({"success": False, "error": "No fields provided"}), 400

        set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [id]

        with get_conn() as conn:
            cur = conn.execute(f"UPDATE products SET {set_clause} WHERE id = ?", values)
            conn.commit()
        if cur.rowcount == 0:
            return jsonify({"success": False, "error": "Product not found"}), 404
        return jsonify({"success": True, "data": {"id": id, **updates}}), 200
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Duplicate product_id"}), 409
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@products_bp.route("/<int:id>", methods=["DELETE"])
def delete_product(id):
    try:
        with get_conn() as conn:
            cur = conn.execute("DELETE FROM products WHERE id = ?", (id,))
            conn.commit()
        if cur.rowcount == 0:
            return jsonify({"success": False, "error": "Product not found"}), 404
        return jsonify({"success": True, "data": {"id": id}}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
