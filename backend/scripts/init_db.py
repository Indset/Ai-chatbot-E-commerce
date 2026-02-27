import csv
import sqlite3
from pathlib import Path

# Adjust these paths if needed
DB_PATH = Path(__file__).resolve().parents[1] / "database" / "app.db"
CSV_PATH = Path(r"c:\Users\mdkam\Downloads\negotation.csv")

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

INSERT_SQL = """
INSERT INTO products (product_id, name, description, price, category, stock, negotiation_history)
VALUES (?, ?, ?, ?, ?, ?, ?);
"""

# Sample products for fallback
SAMPLE_PRODUCTS = [
    ('p1', 'Wireless Headphones', 'Premium wireless headphones with noise cancellation', 79.99, 'Electronics', 50, ''),
    ('p2', 'USB-C Cable', 'Durable USB-C charging cable 2m', 12.99, 'Electronics', 200, ''),
    ('p3', 'Cotton T-Shirt', 'Comfortable cotton t-shirt available in multiple sizes', 24.99, 'Clothing', 150, ''),
    ('p4', 'Coffee Maker', 'Automatic drip coffee maker with timer', 45.99, 'Home', 30, ''),
    ('p5', 'Running Shoes', 'Lightweight running shoes with cushioning', 89.99, 'Sports', 40, ''),
    ('p6', 'Programming Book', 'Learn web development - Complete guide', 34.99, 'Books', 100, ''),
    ('p7', 'Laptop Bag', 'Professional laptop bag with multiple compartments', 59.99, 'Electronics', 60, ''),
    ('p8', 'Desk Lamp', 'LED desk lamp with adjustable brightness', 35.99, 'Home', 80, ''),
    ('p9', 'Yoga Mat', 'Non-slip yoga mat with carrying strap', 29.99, 'Sports', 70, ''),
    ('p10', 'Smartphone Case', 'Protective smartphone case with drop protection', 19.99, 'Electronics', 300, ''),
    ('p11', 'Bluetooth Speaker', 'Portable Bluetooth speaker with 12-hour battery life', 49.99, 'Electronics', 75, ''),
    ('p12', 'Mechanical Keyboard', 'RGB mechanical keyboard with Cherry MX switches', 129.99, 'Electronics', 40, ''),
    ('p13', 'Webcam 1080p', 'High-definition webcam for video calls and streaming', 39.99, 'Electronics', 85, ''),
    ('p14', 'Mouse Pad', 'Large extended mouse pad with non-slip base', 19.99, 'Electronics', 120, ''),
    ('p15', 'USB Hub', 'Multi-port USB 3.0 hub with fast data transfer', 29.99, 'Electronics', 95, ''),
    ('p16', 'Phone Stand', 'Adjustable phone stand for desk and table', 14.99, 'Accessories', 200, ''),
    ('p17', 'Screen Protector', 'Tempered glass screen protector for smartphones', 9.99, 'Accessories', 300, ''),
    ('p18', 'Power Bank 20000mAh', 'Fast charging power bank with dual USB ports', 34.99, 'Electronics', 110, ''),
    ('p19', 'Jeans', 'Classic blue jeans with comfortable fit', 54.99, 'Clothing', 120, ''),
    ('p20', 'Hoodie', 'Warm fleece hoodie perfect for casual wear', 44.99, 'Clothing', 80, ''),
    ('p21', 'Sports Socks Set', 'Pack of 6 premium athletic socks', 22.99, 'Clothing', 160, ''),
    ('p22', 'Winter Jacket', 'Waterproof winter jacket with thermal lining', 129.99, 'Clothing', 35, ''),
    ('p23', 'Leather Belt', 'Premium leather belt with metal buckle', 34.99, 'Clothing', 90, ''),
    ('p24', 'Sunglasses', 'UV protection sunglasses with polarized lenses', 59.99, 'Accessories', 70, ''),
    ('p25', 'Watch', 'Analog watch with stainless steel band', 89.99, 'Accessories', 55, ''),
    ('p26', 'Backpack', 'Spacious backpack with laptop compartment', 49.99, 'Accessories', 65, ''),
    ('p27', 'Dumbbell Set', '20kg adjustable dumbbell set with stand', 79.99, 'Sports', 45, ''),
    ('p28', 'Resistance Bands', 'Set of 5 resistance bands for home workout', 19.99, 'Sports', 140, ''),
    ('p29', 'Water Bottle', 'Insulated water bottle keeps drinks cold for 24 hours', 29.99, 'Sports', 180, ''),
    ('p30', 'Gym Bag', 'Spacious gym bag with shoe compartment', 39.99, 'Sports', 75, ''),
    ('p31', 'Python Programming', 'Advanced Python for data science and web development', 44.99, 'Books', 85, ''),
    ('p32', 'JavaScript Guide', 'Complete guide to modern JavaScript ES6+', 39.99, 'Books', 95, ''),
    ('p33', 'Database Design', 'Master SQL and database optimization', 49.99, 'Books', 70, ''),
    ('p34', 'Cloud Computing', 'Getting started with AWS and cloud services', 54.99, 'Books', 65, ''),
    ('p35', 'Blender', 'Durable kitchen blender for smoothies and soups', 59.99, 'Home', 40, ''),
    ('p36', 'Toaster', '4-slice stainless steel toaster with digital timer', 39.99, 'Home', 60, ''),
    ('p37', 'Electric Kettle', 'Fast boiling electric kettle with auto shut-off', 29.99, 'Home', 85, ''),
    ('p38', 'Microwave', 'Compact microwave oven 800W with multiple settings', 79.99, 'Home', 35, ''),
    ('p39', 'Vacuum Cleaner', 'Powerful cordless vacuum cleaner with HEPA filter', 199.99, 'Home', 25, ''),
    ('p40', 'Bedsheet Set', 'Premium cotton bedsheet set with 2 pillowcases', 49.99, 'Home', 100, ''),
    ('p41', 'Pillow Set', 'Memory foam pillows set of 2', 59.99, 'Home', 70, ''),
    ('p42', 'Comforter', 'Warm and cozy down comforter for all seasons', 89.99, 'Home', 50, ''),
    ('p43', 'Curtains', 'Blackout curtains for bedroom privacy', 39.99, 'Home', 80, ''),
    ('p44', 'Mirror', 'Large decorative wall mirror with wooden frame', 74.99, 'Home', 45, ''),
    ('p45', 'Bookshelf', 'Wooden bookshelf with 5 shelves', 129.99, 'Home', 30, ''),
    ('p46', 'Desk Chair', 'Ergonomic office chair with lumbar support', 199.99, 'Home', 40, ''),
    ('p47', 'Monitor', '27-inch 4K monitor with USB-C connectivity', 349.99, 'Electronics', 20, ''),
    ('p48', 'Graphics Card', 'RTX 4060 graphics card for gaming and 3D work', 249.99, 'Electronics', 15, ''),
    ('p49', 'SSD 1TB', 'NVMe SSD 1TB with high speed performance', 99.99, 'Electronics', 50, ''),
    ('p50', 'RAM 16GB', 'DDR4 16GB RAM with heat spreader', 69.99, 'Electronics', 60, ''),
]


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute(CREATE_TABLE_SQL)
        conn.commit()


def load_csv():
    """Load products from CSV file"""
    if not CSV_PATH.exists():
        print(f"CSV not found: {CSV_PATH}")
        print("Loading sample products instead...")
        load_sample_products()
        return

    print(f"Loading products from {CSV_PATH}...")
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        cur = conn.cursor()

        # Clear existing products
        cur.execute("DELETE FROM products;")
        
        with CSV_PATH.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            required = {"product_id", "name", "description", "price", "category", "stock", "negotiation_history"}
            missing = required - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"Missing columns in CSV: {', '.join(sorted(missing))}")

            for row in reader:
                try:
                    cur.execute(
                        INSERT_SQL,
                        (
                            row["product_id"],
                            row["name"],
                            row["description"],
                            float(row["price"]),
                            row["category"],
                            int(row["stock"]),
                            row.get("negotiation_history", ""),
                        ),
                    )
                except sqlite3.IntegrityError:
                    print(f"Skipping duplicate product_id: {row.get('product_id')}")
                    continue
        
        conn.commit()
        count = cur.execute("SELECT COUNT(*) FROM products;").fetchone()[0]
        print(f"✓ Loaded {count} products from CSV")


def load_sample_products():
    """Load sample products for testing"""
    print("Loading sample products...")
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        cur = conn.cursor()

        # Clear existing products
        cur.execute("DELETE FROM products;")
        
        for product in SAMPLE_PRODUCTS:
            try:
                cur.execute(INSERT_SQL, product)
            except sqlite3.IntegrityError:
                print(f"Skipping duplicate product_id: {product[0]}")
                continue
        
        conn.commit()
        count = cur.execute("SELECT COUNT(*) FROM products;").fetchone()[0]
        print(f"✓ Loaded {count} sample products")


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("✓ Tables created")
    
    # Try to load from CSV, fallback to sample data
    try:
        load_csv()
    except Exception as e:
        print(f"Error loading CSV: {e}")
        load_sample_products()
    
    print("✓ Database initialization complete!")

