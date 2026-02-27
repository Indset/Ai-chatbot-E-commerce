"""
Import products from HuggingFace negotation dataset
"""
import sqlite3
from pathlib import Path
from datasets import load_dataset

DB_PATH = Path(__file__).resolve().parents[1] / "database" / "app.db"

def import_hf_dataset():
    """Load and import negotiation dataset from HuggingFace (basic product info only)"""
    print("Loading HuggingFace negotiation dataset...")
    try:
        ds = load_dataset('ANASAKHTAR/negotation')
        train_data = ds['train']
        print(f"✓ Dataset loaded with {len(train_data)} products\n")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return

    print(f"Importing products to database (basic info only)...")
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        cur = conn.cursor()
        
        # Clear existing products
        cur.execute("DELETE FROM products;")
        print("Cleared existing products\n")
        
        # Prepare insert statement
        INSERT_SQL = """
        INSERT INTO products (product_id, name, description, price, category, stock, negotiation_history)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """
        
        # Insert all products - basic info only
        inserted = 0
        failed = 0
        
        for idx, row in enumerate(train_data, 1):
            try:
                product_id = f"p{idx}"  # Simple product ID
                name = row['Product Name']
                description = row['Description']
                price = float(row['Price'])
                category = row['Category']
                stock = 100  # Default stock
                negotiation_info = ""  # Empty - keep existing theme
                
                cur.execute(INSERT_SQL, (product_id, name, description, price, category, stock, negotiation_info))
                inserted += 1
                
                # Progress indicator
                if idx % 1000 == 0:
                    print(f"  Processed {idx}/10000 products...")
                    
            except Exception as e:
                failed += 1
                if failed <= 5:  # Show first 5 errors
                    print(f"  Error on row {idx}: {e}")
        
        conn.commit()
        print(f"\n✓ Import complete!")
        print(f"  Successfully inserted: {inserted} products")
        print(f"  Failed: {failed} products")
        
        # Verify
        cur.execute("SELECT COUNT(*) FROM products;")
        total = cur.fetchone()[0]
        print(f"  Total products in database: {total}")

if __name__ == "__main__":
    import_hf_dataset()
