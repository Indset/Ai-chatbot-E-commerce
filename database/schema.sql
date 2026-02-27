-- SQLite schema for products table
CREATE TABLE products (
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
