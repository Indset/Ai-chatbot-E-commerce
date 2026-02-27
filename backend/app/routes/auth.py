import sqlite3
import smtplib
import traceback
from email.message import EmailMessage
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# Database path
DB_PATH = Path(__file__).resolve().parents[2] / "database" / "app.db"

def get_conn():
    """Create a SQLite database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_users_table():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def send_login_notification(user_email: str, name: str | None, remote_addr: str | None):
    """Send (or log) a notification containing login details to configured address."""
    subject = f"User logged in: {user_email}"
    body = f"A user has logged in:\n\nEmail: {user_email}\nName: {name or 'N/A'}\nIP: {remote_addr or 'unknown'}\n"

    # Read SMTP/config from Flask app config if available
    try:
        app_cfg = current_app.config if current_app else {}
    except RuntimeError:
        # Outside request context
        app_cfg = {}
    
    SMTP_HOST = app_cfg.get('SMTP_HOST')
    SMTP_PORT = app_cfg.get('SMTP_PORT')
    SMTP_USER = app_cfg.get('SMTP_USER')
    SMTP_PASS = app_cfg.get('SMTP_PASS')
    NOTIFY_EMAIL = app_cfg.get('NOTIFY_EMAIL', 'mdkamran9708@gmail.com')
    FROM_EMAIL = app_cfg.get('FROM_EMAIL', 'no-reply@negotiatehub.local')
    LOGIN_LOG = app_cfg.get('LOGIN_NOTIFICATION_LOG')

    try:
        if SMTP_HOST and SMTP_PORT and SMTP_USER and SMTP_PASS:
            msg = EmailMessage()
            msg['Subject'] = subject
            msg['From'] = FROM_EMAIL
            msg['To'] = NOTIFY_EMAIL
            msg.set_content(body)

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
                smtp.starttls()
                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.send_message(msg)
            return True
    except Exception as e:
        print('⚠️ SMTP send failed:', e)

    # Fallback: append to local log file if configured, else to current directory
    try:
        log_path = LOGIN_LOG or Path(__file__).resolve().parents[2] / 'logs' / 'login_notifications.log'
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, 'a', encoding='utf-8') as fh:
            fh.write(body + '\n---\n')
        print(f'ℹ️ Notification logged to {log_path}')
        return True
    except Exception as e:
        print('❌ Failed to write login notification log:', e)
        traceback.print_exc()
        return False


@auth_bp.route('/register', methods=['POST'])
def register():
    payload = request.get_json(force=True, silent=True) or {}
    email = payload.get('email')
    password = payload.get('password')
    name = payload.get('name')

    if not email or not password:
        return jsonify({'success': False, 'error': 'email and password required'}), 400

    ensure_users_table()
    pwd_hash = generate_password_hash(password)

    try:
        with get_conn() as conn:
            conn.execute('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)', (email, name, pwd_hash))
        return jsonify({'success': True, 'message': 'Registered successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'Email already registered'}), 409
    except Exception as e:
        print('Register error:', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    payload = request.get_json(force=True, silent=True) or {}
    email = payload.get('email')
    password = payload.get('password')

    if not email or not password:
        return jsonify({'success': False, 'error': 'email and password required'}), 400

    ensure_users_table()
    try:
        with get_conn() as conn:
            row = conn.execute('SELECT id, email, name, password_hash FROM users WHERE email = ?', (email,)).fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        if not check_password_hash(row['password_hash'], password):
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        # Notify admin / owner about login
        remote = request.remote_addr
        send_login_notification(user_email=email, name=row['name'], remote_addr=remote)

        return jsonify({'success': True, 'message': 'Logged in', 'user': {'email': row['email'], 'name': row['name']}}), 200

    except Exception as e:
        print('Login error:', e)
        return jsonify({'success': False, 'error': str(e)}), 500
