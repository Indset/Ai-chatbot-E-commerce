import os
import csv
from pathlib import Path

# Image folder path
image_folder = r"C:\Users\mdkam\Desktop\image"

# Get all image files
image_files = []
for file in os.listdir(image_folder):
    if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif')):
        # Remove extension to get product name
        product_name = Path(file).stem
        image_files.append({
            'name': product_name,
            'file': file
        })

# Sort by name
image_files.sort(key=lambda x: x['name'])

# Create CSV with products
csv_path = r"C:\Users\mdkam\Downloads\project\image_products.csv"
categories = ["Electronics", "Home", "Sports", "Books", "Clothing", "Accessories"]

with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Product ID', 'Product Name', 'Description', 'Price', 'Negotiable', 'Discount (%)', 'Negotiated Price', 'Category', 'Image File'])
    
    for idx, img in enumerate(image_files, 1):
        product_name = img['name']
        image_file = img['file']
        price = 29.99 + (idx % 5) * 10  # Vary prices
        negotiable = idx % 2 == 0  # Alternating
        discount = (idx % 4) * 5
        negotiated_price = price * (1 - discount/100)
        category = categories[idx % len(categories)]
        description = f"High quality {product_name.lower()}. Premium product for excellent value."
        
        writer.writerow([
            idx,
            product_name,
            description,
            round(price, 2),
            negotiable,
            discount,
            round(negotiated_price, 2),
            category,
            image_file
        ])

print(f"✓ Created {csv_path} with {len(image_files)} products")
print(f"✓ Found {len(image_files)} images")
