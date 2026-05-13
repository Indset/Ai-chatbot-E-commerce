"""
Payment routes for NegotiateHub.
Supports Razorpay (online) and Cash on Delivery (COD).
"""
import sqlite3
import json
import hmac
import hashlib
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app

payment_bp = Blueprint("payment", __name__)
DB_PATH = Path(__file__).resolve().parents[2] / "database" / "app.db"

# ⚠️ Apni Razorpay keys yahan daalo (ya config.py mein)
RAZORPAY_KEY_ID     = "rzp_test_YAHAN_KEY_ID_LIKHO"
RAZORPAY_KEY_SECRET = "YAHAN_KEY_SECRET_LIKHO"

CREATE_ORDERS_TABLE = """
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    amount REAL NOT NULL,
    items TEXT,
    customer_name TEXT,
    customer_email TEXT,
    razorpay_payment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def ensure_orders_table():
    with get_conn() as conn:
        conn.execute(CREATE_ORDERS_TABLE)
        conn.commit()

ensure_orders_table()


@payment_bp.route("/create-order", methods=["POST"])
def create_order():
    """
    Razorpay order create karo.
    Frontend se: { amount, items, customer_name, customer_email }
    """
    try:
        import razorpay
    except ImportError:
        return jsonify({"success": False, "error": "razorpay not installed. Run: pip install razorpay"}), 500

    try:
        data = request.get_json(force=True, silent=True) or {}
        amount  = float(data.get("amount", 0))
        items   = data.get("items", [])
        name    = data.get("customer_name", "")
        email   = data.get("customer_email", "")

        if amount <= 0:
            return jsonify({"success": False, "error": "Invalid amount"}), 400

        # Razorpay client
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

        # Amount paisa mein hota hai (1 rupee = 100 paisa)
        # Lekin tumhara app dollars use karta hai — cents mein convert
        amount_in_cents = int(amount * 100)

        rz_order = client.order.create({
            "amount": amount_in_cents,
            "currency": "USD",
            "receipt": f"order_{name[:10]}",
            "payment_capture": 1
        })

        # Database mein save karo
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO orders (order_id, payment_method, payment_status, amount, items, customer_name, customer_email)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (rz_order["id"], "razorpay", "pending", amount, json.dumps(items), name, email)
            )
            conn.commit()

        return jsonify({
            "success": True,
            "order_id": rz_order["id"],
            "amount": amount_in_cents,
            "currency": "USD",
            "key_id": RAZORPAY_KEY_ID
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@payment_bp.route("/verify", methods=["POST"])
def verify_payment():
    """
    Razorpay payment verify karo after successful payment.
    Frontend se: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        order_id   = data.get("razorpay_order_id", "")
        payment_id = data.get("razorpay_payment_id", "")
        signature  = data.get("razorpay_signature", "")

        # Signature verify karo
        msg = f"{order_id}|{payment_id}"
        expected_sig = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            msg.encode(),
            hashlib.sha256
        ).hexdigest()

        if expected_sig != signature:
            return jsonify({"success": False, "error": "Invalid signature"}), 400

        # Database update karo
        with get_conn() as conn:
            conn.execute(
                """UPDATE orders SET payment_status = 'paid', razorpay_payment_id = ?
                   WHERE order_id = ?""",
                (payment_id, order_id)
            )
            conn.commit()

        return jsonify({"success": True, "message": "Payment verified!"}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@payment_bp.route("/cod", methods=["POST"])
def cash_on_delivery():
    """
    Cash on Delivery order place karo.
    Frontend se: { amount, items, customer_name, customer_email, address }
    """
    try:
        data    = request.get_json(force=True, silent=True) or {}
        amount  = float(data.get("amount", 0))
        items   = data.get("items", [])
        name    = data.get("customer_name", "")
        email   = data.get("customer_email", "")
        address = data.get("address", "")

        if not name or not address:
            return jsonify({"success": False, "error": "Name aur address required hai"}), 400

        import time
        order_id = f"COD_{int(time.time())}"

        with get_conn() as conn:
            conn.execute(
                """INSERT INTO orders (order_id, payment_method, payment_status, amount, items, customer_name, customer_email)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (order_id, "cod", "confirmed", amount, json.dumps(items), name, email)
            )
            conn.commit()

        return jsonify({
            "success": True,
            "order_id": order_id,
            "message": f"COD order confirmed! Order ID: {order_id}"
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@payment_bp.route("/orders", methods=["GET"])
def list_orders():
    """Orders dekho — email se filter karo user ke liye"""
    try:
        email = request.args.get("email", "").strip()
        with get_conn() as conn:
            if email:
                rows = conn.execute(
                    "SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC",
                    (email,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM orders ORDER BY created_at DESC").fetchall()
        return jsonify({"success": True, "data": [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
