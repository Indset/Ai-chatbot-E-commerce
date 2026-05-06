import csv
import sqlite3
from pathlib import Path

# Adjust these paths if needed
DB_PATH = Path(__file__).resolve().parents[1] / "database" / "app.db"

# CSV path — apna actual path yahan likho
CSV_PATH = Path(__file__).resolve().parents[2] / "negotation.csv"

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
    negotiable INTEGER DEFAULT 1,
    discount_percent REAL DEFAULT 0,
    negotiated_price REAL DEFAULT 0,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

INSERT_SQL = """
INSERT INTO products (product_id, name, description, price, category, stock, negotiation_history, negotiable, discount_percent, negotiated_price, image)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
"""

# Sample products for fallback
SAMPLE_PRODUCTS = [
    ('p1', 'Wireless Headphones', 'Premium wireless headphones with noise cancellation', 79.99, 'Electronics', 50, '', 1, 10, 71.99, ''),
    ('p2', 'USB-C Cable', 'Durable USB-C charging cable 2m', 12.99, 'Electronics', 200, '', 1, 5, 12.34, ''),
    ('p3', 'Cotton T-Shirt', 'Comfortable cotton t-shirt available in multiple sizes', 24.99, 'Clothing', 150, '', 1, 10, 22.49, ''),
    ('p4', 'Coffee Maker', 'Automatic drip coffee maker with timer', 45.99, 'Home', 30, '', 1, 15, 39.09, ''),
    ('p5', 'Running Shoes', 'Lightweight running shoes with cushioning', 89.99, 'Sports', 40, '', 1, 10, 80.99, ''),
    ('p6', 'Programming Book', 'Learn web development - Complete guide', 34.99, 'Books', 100, '', 0, 0, 34.99, ''),
    ('p7', 'Laptop Bag', 'Professional laptop bag with multiple compartments', 59.99, 'Electronics', 60, '', 1, 10, 53.99, ''),
    ('p8', 'Desk Lamp', 'LED desk lamp with adjustable brightness', 35.99, 'Home', 80, '', 1, 5, 34.19, ''),
    ('p9', 'Yoga Mat', 'Non-slip yoga mat with carrying strap', 29.99, 'Sports', 70, '', 1, 10, 26.99, ''),
    ('p10', 'Smartphone Case', 'Protective smartphone case with drop protection', 19.99, 'Electronics', 300, '', 1, 5, 18.99, ''),
]


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute(CREATE_TABLE_SQL)
        conn.commit()


def load_csv():
    """Load products from CSV file — tumhara negotation.csv"""
    if not CSV_PATH.exists():
        # Try alternative path — Downloads folder
        alt_path = Path.home() / "Downloads" / "negotation.csv"
        if alt_path.exists():
            return _load_from_path(alt_path)
        
        print(f"CSV not found at: {CSV_PATH}")
        print("Loading sample products instead...")
        load_sample_products()
        return

    _load_from_path(CSV_PATH)


def _load_from_path(path: Path):
    """Actually load CSV from given path"""
    print(f"Loading products from {path}...")
    
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        cur = conn.cursor()
        cur.execute("DELETE FROM products;")

        with path.open(newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            
            inserted = 0
            skipped = 0
            
            for idx, row in enumerate(reader, 1):
                try:
                    # ✅ Tumhare CSV ke actual column names use kar rahe hain
                    product_id      = f"p{idx}"
                    name            = row.get("Product Name", "").strip()
                    description     = row.get("Description", "").strip()
                    price           = float(row.get("Price", 0) or 0)
                    category        = row.get("Category", "General").strip()
                    negotiable_str  = row.get("Negotiable", "False").strip()
                    negotiable      = 1 if negotiable_str.lower() == "true" else 0
                    discount        = float(row.get("Discount (%)", 0) or 0)
                    negotiated_price= float(row.get("Negotiated Price", price) or price)
                    image           = row.get("Image", "").strip()
                    stock           = 100  # default stock
                    negotiation_history = ""

                    if not name:
                        skipped += 1
                        continue

                    cur.execute(INSERT_SQL, (
                        product_id,
                        name,
                        description,
                        price,
                        category,
                        stock,
                        negotiation_history,
                        negotiable,
                        discount,
                        negotiated_price,
                        image,
                    ))
                    inserted += 1

                except Exception as e:
                    print(f"  Skipping row {idx}: {e}")
                    skipped += 1
                    continue

        conn.commit()
        count = cur.execute("SELECT COUNT(*) FROM products;").fetchone()[0]
        print(f"✓ Loaded {count} products from CSV")
        if skipped:
            print(f"  Skipped {skipped} rows")


def load_sample_products():
    """Load sample products for testing"""
    print("Loading sample products...")
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        cur = conn.cursor()
        cur.execute("DELETE FROM products;")

        for product in SAMPLE_PRODUCTS:
            try:
                cur.execute(INSERT_SQL, product)
            except sqlite3.IntegrityError:
                print(f"Skipping duplicate: {product[0]}")
                continue

        conn.commit()
        count = cur.execute("SELECT COUNT(*) FROM products;").fetchone()[0]
        print(f"✓ Loaded {count} sample products")


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("✓ Tables created")

    try:
        load_csv()
    except Exception as e:
        print(f"Error loading CSV: {e}")
        print("Falling back to sample products...")
        load_sample_products()

    print("✓ Database initialization complete!")
