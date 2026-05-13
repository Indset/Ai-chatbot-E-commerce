"""
================================================================================
AI NEGOTIATION CHATBOT ROUTE
================================================================================
Intelligent price negotiation using ML models (SVR + k-NN)
Provides smart counteroffers and human-like negotiation responses

Key Features:
- Dual ML models: SVR (global trend) + k-NN (local similarity)
- Intelligent tiered responses based on offer level
- User-friendly bargaining experience
- Database-driven product information
- Negotiation history tracking
================================================================================
"""

import sqlite3
import random
from pathlib import Path
from flask import Blueprint, jsonify, request
from app.services.negotiation import compute_counteroffer, load_models
import joblib
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from pathlib import Path

# ==================== BLUEPRINT SETUP ====================
# Define chatbot blueprint for Flask routing
chatbot_bp = Blueprint("chatbot", __name__)

# ==================== DATABASE & MODEL PATHS ====================
# Paths to database and trained ML models
DB_PATH = Path(__file__).resolve().parents[2] / "database" / "app.db"
MODELS_DIR = Path(__file__).resolve().parents[2] / "models"

# Cache for loaded models (loaded once, reused for all requests)
_models_cache = None


# ==================== DATABASE HELPER ====================
def get_conn():
    """
    Create a SQLite database connection
    
    Features:
    - row_factory enables accessing columns by name
    - Connection auto-closes when exiting context manager
    
    Returns:
        sqlite3.Connection: Database connection object
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Access columns by name
    return conn


# ==================== MODEL LOADER ====================
def get_models():
    """
    Load ML models with caching for performance
    
    Models Used:
    1. SVR (Support Vector Regression): Captures global price trends
    2. k-NN (k-Nearest Neighbors): Finds similar past negotiations
    
    Fallback:
    If models unavailable, uses None values
    (Negotiation logic handles this gracefully)
    
    Returns:
        tuple: (svr_model, knn_model) or (None, None) if unavailable
    """
    global _models_cache
    if _models_cache is None:
        try:
            _models_cache = load_models(MODELS_DIR)
            print("✓ ML Models loaded successfully")
        except Exception as e:
            # Models not found - use fallback heuristic
            print(f"⚠️  Models unavailable: {e}. Using fallback negotiation.")
            _models_cache = (None, None)
    return _models_cache


# ==================== FREE-FORM CHAT ENDPOINT ====================
@chatbot_bp.route("/chat", methods=["POST"])
def chat_endpoint():
    """
    AI-powered chat endpoint using Claude API.
    Answers product questions, price queries, negotiation tips — everything!
    """
    try:
        import urllib.request
        import json as _json

        payload = request.get_json(force=True, silent=True) or {}
        user_message = payload.get("user_message", "").strip()
        if not user_message:
            return jsonify({"success": False, "error": "user_message required"}), 400

        # Fetch all products for context
        try:
            with get_conn() as conn:
                rows = conn.execute(
                    "SELECT name, price, category, description FROM products LIMIT 50"
                ).fetchall()
            products_list = "\n".join([
                f"- {r['name']} | ${r['price']:.2f} | {r['category']} | {r['description'][:60]}"
                for r in rows
            ])
        except Exception:
            products_list = "Product data unavailable"

        # System prompt — NegotiateHub assistant
        system_prompt = f"""You are an AI shopping assistant for NegotiateHub, a smart e-commerce platform where users can negotiate prices.

Your job:
- Answer questions about products, prices, categories
- Help users understand how to negotiate
- Suggest fair offer prices (typically 10-20% below listed price)
- Be friendly, helpful, and concise (2-3 sentences max)
- Reply in the same language the user uses (Hindi/English/Hinglish)

Current products available:
{products_list}

Rules:
- Never make up products not in the list
- For negotiation, tell users to click the "Negotiate" button on the product card
- Keep responses short and conversational"""

        # Call Gemini API
        GEMINI_API_KEY = "AIzaSyBaT7_RU6yM7IxFe_g6vNFtGOaXVcpKnV8"
        GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

        api_payload = _json.dumps({
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {"parts": [{"text": user_message}]}
            ],
            "generationConfig": {
                "maxOutputTokens": 300,
                "temperature": 0.7
            }
        }).encode("utf-8")

        req = urllib.request.Request(
            GEMINI_URL,
            data=api_payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = _json.loads(resp.read().decode("utf-8"))

        reply = result["candidates"][0]["content"]["parts"][0]["text"]
        print(f"Gemini AI reply generated for: {user_message[:50]}")
        return jsonify({"success": True, "reply": reply}), 200

    except Exception as e:
        print(f"❌ Chat endpoint error: {e}")
        # Fallback agar API fail ho
        fallback_replies = [
            "Hi! I can help you negotiate product prices — open a product and click Negotiate button.",
            "Products ke baare mein poochho ya kisi product pe negotiate karo — Negotiate button click karo!",
            "I can help with product prices and negotiation. Click 'Negotiate' on any product to start!"
        ]
        return jsonify({"success": True, "reply": random.choice(fallback_replies)}), 200


# ==================== NEGOTIATION MESSAGE GENERATOR ====================
def generate_negotiation_message(user_price: float, base_price: float, 
                                 suggested_price: float, discount_percent: float) -> str:
    """
    Generate contextual, human-like negotiation response messages
    
    Strategy:
    - Tier 1 (>25% discount): Acknowledge aggressive offer, meet in middle
    - Tier 2 (10-25% discount): Positive, show flexibility
    - Tier 3 (<10% discount): Signals we're very close
    
    Args:
        user_price (float): Customer's offered price
        base_price (float): Original product price
        suggested_price (float): ML-computed counteroffer
        discount_percent (float): Discount % offered by suggested price
    
    Returns:
        str: Contextual response message
    """
    # Calculate how aggressive the offer is
    discount_ratio = (base_price - user_price) / base_price if base_price > 0 else 0
    
    # ===== TIER 1: AGGRESSIVE OFFER (>25% discount) =====
    # Customer is asking for 3+ for 4 off - acknowledge but guide
    if discount_ratio > 0.25:
        messages = [
            f"I appreciate your aggressive offer of ${user_price:.2f}! 🎯 "
            f"That's bold negotiating. Our best offer is ${suggested_price:.2f} ({discount_percent:.1f}% off). "
            f"That's still a solid saving!",
            
            f"Great effort with ${user_price:.2f}! 💪 "
            f"We need to stay at ${suggested_price:.2f} to make this work. "
            f"That gives you a {discount_percent:.1f}% discount.",
            
            f"I see the hunger for a deal! 🤝 "
            f"Your offer is quite aggressive, but I can go down to ${suggested_price:.2f}. "
            f"That's {discount_percent:.1f}% savings.",
            
            f"Nice try! 😄 Your ${user_price:.2f} offer is lower than my comfort zone. "
            f"Meet me at ${suggested_price:.2f} and let's make this happen!",
        ]
    
    # ===== TIER 2: MODERATE OFFER (10-25% discount) =====
    # Reasonable negotiation range - show enthusiasm
    elif discount_ratio > 0.10:
        messages = [
            f"Now we're talking! 💰 Your ${user_price:.2f} offer is solid. "
            f"I can meet you at ${suggested_price:.2f} ({discount_percent:.1f}% off). Deal?",
            
            f"You're a real negotiator! 🏆 "
            f"I love your offer of ${user_price:.2f}. "
            f"My best counter is ${suggested_price:.2f} - that's {discount_percent:.1f}% savings.",
            
            f"Excellent price sense! 🎯 "
            f"You offered ${user_price:.2f} and I can bring it to ${suggested_price:.2f}. "
            f"You save {discount_percent:.1f}% - shall we seal this deal?",
            
            f"Getting closer! 📈 Your ${user_price:.2f} is reasonable. "
            f"Final offer: ${suggested_price:.2f} ({discount_percent:.1f}% discount). "
            f"What do you think?",
        ]
    
    # ===== TIER 3: CLOSE OFFER (<10% discount) =====
    # Almost at our target price - signal finish line
    else:
        messages = [
            f"We're so close! 🎉 You offered ${user_price:.2f}. "
            f"I can slide to ${suggested_price:.2f} - just {discount_percent:.1f}% off. "
            f"Let's settle this!",
            
            f"Almost perfect! ✨ "
            f"You're at ${user_price:.2f}, I'm at ${suggested_price:.2f}. "
            f"That's {discount_percent:.1f}% savings - does that work?",
            
            f"We're at the finish line! 🏁 "
            f"You got me to budge to ${suggested_price:.2f} ({discount_percent:.1f}% off). "
            f"This is my best offer!",
            
            f"Your negotiation skills are working! 💪 "
            f"Final counter: ${suggested_price:.2f} ({discount_percent:.1f}% discount). "
            f"Shall we complete this?",
        ]
    
    # Return random message from appropriate tier
    return random.choice(messages)


def generate_initial_greeting(product_name: str, category: str, base_price: float) -> str:
    """
    Generate personalized welcome message for new negotiation
    
    Args:
        product_name (str): Name of product being negotiated
        category (str): Product category
        base_price (float): Original product price
    
    Returns:
        str: Personalized greeting
    """
    greetings = [
        f"Welcome to NegotiateHub! 🎯 Let's negotiate the price of this {category.lower()}. "
        f"Regular price: ${base_price:.2f}. What's your offer?",
        
        f"Hi there! 👋 I'm your AI negotiation expert. "
        f"This {category.lower()} is currently ${base_price:.2f}. "
        f"Make an offer and let's find a great deal!",
        
        f"Hello! 💬 Ready to negotiate? "
        f"This brilliant {category.lower()} costs ${base_price:.2f}. "
        f"What price would you like to offer?",
    ]
    return random.choice(greetings)


# ==================== MAIN CHATBOT ENDPOINT ====================
@chatbot_bp.route("/", methods=["POST"])
def chatbot():
    """
    =====================================================================
    POST /chatbot/
    Main AI negotiation endpoint - handles price negotiations
    =====================================================================
    
    REQUEST JSON:
    {
        "user_message": "Can you do $60?",
        "product_id": "1",
        "offered_price": 60.00,
        "negotiation_depth": 0
    }
    
    RESPONSE JSON:
    {
        "success": true,
        "product_id": "1",
        "product_name": "Wireless Headphones",
        "category": "Electronics",
        "original_price": 79.99,
        "user_offered_price": 60.00,
        "suggested_price": 74.99,
        "discount_amount": 5.00,
        "discount_percent": 6.3,
        "message": "Great negotiation message here...",
        "hint": "Helpful hint for user...",
        "negotiation_depth": 1,
        "status": "negotiating"
    }
    
    ALGORITHM:
    1. Parse and validate request JSON
    2. Fetch product from database
    3. Load ML models (SVR + k-NN)
    4. Compute intelligent counteroffer
    5. Generate contextual response message
    6. Return rich negotiation response
    =====================================================================
    """
    
    try:
        # ==================== STEP 1: PARSE REQUEST ====================
        # Extract JSON payload from HTTP request body
        payload = request.get_json(force=True, silent=True) or {}
        user_message = payload.get("user_message")
        product_id = payload.get("product_id")
        offered_price = payload.get("offered_price")
        negotiation_depth = payload.get("negotiation_depth", 0)

        # Log incoming request (helpful for debugging)
        print(f"🤖 Negotiation request - Product: {product_id}, Offer: ${offered_price}")

        # ==================== STEP 2: VALIDATE INPUT ====================
        # Ensure all required fields are present in request
        if user_message is None or product_id is None or offered_price is None:
            return jsonify({
                "success": False, 
                "error": "Missing required fields: user_message, product_id, offered_price"
            }), 400

        # Validate offered_price is a valid positive number
        try:
            offered_price = float(offered_price)
            if offered_price <= 0:
                raise ValueError("Price must be positive")
        except (ValueError, TypeError):
            return jsonify({
                "success": False, 
                "error": "offered_price must be a positive number"
            }), 400

        # ==================== STEP 3: FETCH PRODUCT FROM DATABASE ====================
        # Query database to get product information
        try:
            with get_conn() as conn:
                # SQL query to get product details
                row = conn.execute(
                    """
                    SELECT product_id, name, price, category, stock 
                    FROM products 
                    WHERE product_id = ?
                    """,
                    (str(product_id),),
                ).fetchone()
        except Exception as e:
            # Database query failed
            print(f"❌ Database error: {e}")
            return jsonify({
                "success": False, 
                "error": f"Database error: {str(e)}"
            }), 500

        # Check if product exists in database
        if row is None:
            return jsonify({
                "success": False, 
                "error": f"Product '{product_id}' not found in catalog"
            }), 404

        # Extract product information
        base_price = float(row["price"])
        product_name = row["name"]
        category = row["category"] or "Product"
        stock = int(row["stock"]) if row["stock"] else 0

        # ==================== STEP 4: CHECK STOCK ====================
        # Ensure product is in stock for negotiation
        if stock <= 0:
            return jsonify({
                "success": False, 
                "error": f"Sorry, '{product_name}' is currently out of stock"
            }), 409

        # ==================== STEP 5: LOAD ML MODELS ====================
        # Load trained SVR and k-NN models from disk
        svr_model, knn_model = get_models()

        # ==================== STEP 6: COMPUTE COUNTEROFFER ====================
        # Use ML models to compute intelligent counteroffer price
        # SVR captures: Global market trends
        # k-NN captures: Similar past negotiations
        if svr_model and knn_model:
            # Models available - use ML prediction
            suggested_price = compute_counteroffer(
                user_price=offered_price,
                base_price=base_price,
                svr_model=svr_model,
                knn_model=knn_model,
            )
            print(f"✓ ML Models used - Suggested price: ${suggested_price:.2f}")
        else:
            # Models unavailable - use heuristic fallback
            # Move 60% of way from user's offer toward base price
            suggested_price = offered_price + (base_price - offered_price) * 0.6
            suggested_price = round(suggested_price, 2)
            print(f"⚠️  Using fallback heuristic - Suggested price: ${suggested_price:.2f}")

        # ==================== STEP 7: CALCULATE DISCOUNT ====================
        # Compute discount information for response
        discount_amount = base_price - suggested_price
        discount_percent = (discount_amount / base_price * 100) if base_price > 0 else 0

        # ==================== STEP 8: GENERATE SMART RESPONSE ====================
        # Create contextual negotiation message based on offer tier
        message = generate_negotiation_message(
            user_price=offered_price,
            base_price=base_price,
            suggested_price=suggested_price,
            discount_percent=discount_percent
        )

        # ==================== STEP 9: GENERATE HELPFUL HINTS ====================
        # Provide next-step guidance to user
        discount_ratio = (base_price - offered_price) / base_price if base_price > 0 else 0
        
        if discount_ratio > 0.30:
            hint = "💡 That's pretty aggressive! Try getting closer to my suggested price."
        elif discount_ratio > 0.15:
            hint = "📊 We're getting into negotiation territory. Let's find middle ground."
        elif discount_ratio > 0.05:
            hint = "✨ We're very close! Just a small gap between us now."
        else:
            hint = "🎯 Almost there! Let's seal this deal."

        # ==================== STEP 10: BUILD RESPONSE ====================
        # Assemble comprehensive JSON response
        response_data = {
            # ===== Basic Success Response =====
            "success": True,
            
            # ===== Product Information =====
            "product_id": row["product_id"],
            "product_name": product_name,
            "category": category,
            
            # ===== Price Information =====
            "original_price": round(base_price, 2),
            "user_offered_price": round(offered_price, 2),
            "suggested_price": round(suggested_price, 2),
            "discount_amount": round(discount_amount, 2),
            "discount_percent": round(discount_percent, 1),
            
            # ===== Negotiation Messages =====
            "message": message,  # Main negotiation response
            "hint": hint,  # Helpful guidance for next offer
            
            # ===== Negotiation Meta =====
            "negotiation_depth": negotiation_depth + 1,  # Track round count
            "status": "negotiating",  # Can be: "too_low", "negotiating", "nearly_done"
        }

        print(f"✓ Negotiation response generated - Depth: {response_data['negotiation_depth']}")
        return jsonify(response_data), 200

    except Exception as e:
        # Catch any unexpected errors
        print(f"❌ Unexpected error in chatbot: {e}")
        return jsonify({
            "success": False, 
            "error": f"Unexpected error: {str(e)}"
        }), 500


# ==================== INITIAL MESSAGE ENDPOINT ====================
@chatbot_bp.route("/initial", methods=["POST"])
def initial_message():
    """
    =====================================================================
    POST /chatbot/initial
    Get personalized greeting for a product negotiation
    =====================================================================
    
    REQUEST JSON:
    {
        "product_id": "1"
    }
    
    RESPONSE JSON:
    {
        "success": true,
        "greeting": "Welcome message...",
        "tips": ["Tip 1", "Tip 2", ...]
    }
    =====================================================================
    """
    try:
        payload = request.get_json(force=True, silent=True) or {}
        product_id = payload.get("product_id")

        if not product_id:
            return jsonify({
                "success": False,
                "error": "product_id is required"
            }), 400

        # Fetch product details
        with get_conn() as conn:
            row = conn.execute(
                "SELECT name, category, price FROM products WHERE product_id = ?",
                (str(product_id),),
            ).fetchone()

        if not row:
            return jsonify({
                "success": False,
                "error": "Product not found"
            }), 404

        product_name = row["name"]
        category = row["category"] or "Product"
        base_price = float(row["price"])

        greeting = generate_initial_greeting(product_name, category, base_price)

        return jsonify({
            "success": True,
            "greeting": greeting,
            "tips": [
                "💡 Start with a 15-30% discount request",
                "📊 Each counteroffer brings us closer",
                "✅ Fair negotiation - we're not here to trick you",
                "⏰ Take time to find the perfect price"
            ]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==================== ACCEPT OFFER ENDPOINT ====================
@chatbot_bp.route("/accept", methods=["POST"])
def accept_offer():
    """
    =====================================================================
    POST /chatbot/accept
    Accept suggested counteroffer and finalize negotiation
    =====================================================================
    
    REQUEST JSON:
    {
        "product_id": "1",
        "suggested_price": 74.99
    }
    
    RESPONSE JSON:
    {
        "success": true,
        "message": "Deal accepted! You save $X!",
        "product_id": "1",
        "product_name": "Wireless Headphones",
        "final_price": 74.99,
        "original_price": 79.99,
        "total_savings": 5.00,
        "status": "accepted"
    }
    =====================================================================
    """
    try:
        payload = request.get_json(force=True, silent=True) or {}
        product_id = payload.get("product_id")
        suggested_price = payload.get("suggested_price")

        # Validate input
        if not product_id or suggested_price is None:
            return jsonify({
                "success": False,
                "error": "Missing product_id or suggested_price"
            }), 400

        # Get product info from database
        with get_conn() as conn:
            row = conn.execute(
                "SELECT product_id, name, price FROM products WHERE product_id = ?",
                (str(product_id),),
            ).fetchone()

        if not row:
            return jsonify({
                "success": False,
                "error": "Product not found"
            }), 404

        base_price = float(row["price"])
        final_price = float(suggested_price)
        savings = base_price - final_price
        savings_percent = (savings / base_price * 100) if base_price > 0 else 0

        # Generate celebratory message
        messages = [
            f"🎉 Outstanding! You negotiated a {savings_percent:.1f}% discount!",
            f"✨ Excellent deal! You saved ${savings:.2f}!",
            f"🏆 Fantastic negotiating! Here's your {savings_percent:.1f}% savings!",
            f"💰 Great job! You saved ${savings:.2f} on this purchase!",
        ]

        return jsonify({
            "success": True,
            "message": random.choice(messages),
            "product_id": row["product_id"],
            "product_name": row["name"],
            "final_price": round(final_price, 2),
            "original_price": round(base_price, 2),
            "total_savings": round(savings, 2),
            "savings_percent": round(savings_percent, 1),
            "status": "accepted"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
