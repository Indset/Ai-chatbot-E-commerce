from flask import Flask, render_template, jsonify
from flask_cors import CORS
from .routes.products import products_bp
from .routes.chatbot import chatbot_bp
from .routes.auth import auth_bp
from .routes.payment import payment_bp
from pathlib import Path


def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all routes
    CORS(app, resources={r"/*": {"origins": "*"}})
    # Load optional config from backend/config.py if present
    try:
        cfg_path = Path(__file__).resolve().parents[1] / 'config.py'
        app.config.from_pyfile(str(cfg_path), silent=True)
    except Exception:
        pass

    app.register_blueprint(products_bp, url_prefix="/products")
    app.register_blueprint(chatbot_bp, url_prefix="/chatbot")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(payment_bp, url_prefix="/payment")

    @app.route("/")
    def index():
        return render_template("index.html")
    
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "message": "Backend is running"}), 200
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404
    
    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app
