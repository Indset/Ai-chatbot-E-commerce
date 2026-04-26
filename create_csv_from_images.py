import os
import csv
from pathlib import Path

# Image folder path
image_folder = r"C:\Users\mdkam\Downloads\project\frontend\image"

# Get all image files
image_files = []
for file in os.listdir(image_folder):
    if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif')):
        product_name = Path(file).stem
        image_files.append({
            'name': product_name,
            'file': file
        })

# Sort by name
image_files.sort(key=lambda x: x['name'])

print(f"Found {len(image_files)} images")

# Create CSV with products
csv_path = r"C:\Users\mdkam\Downloads\project\negotation.csv"
categories = ["Electronics", "Home", "Sports", "Books", "Clothing", "Accessories"]

with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Product ID', 'Product Name', 'Description', 'Price', 'Negotiable', 'Discount (%)', 'Negotiated Price', 'Size', 'Category', 'Color', 'Material', 'Image'])
    
    for idx, img in enumerate(image_files, 1):
        product_name = img['name']
        image_file = img['file']
        price = round(19.99 + (idx % 50) * 1.5, 2)
        negotiable = idx % 2 == 0  # Alternating
        discount = (idx % 5) * 5
        negotiated_price = round(price * (1 - discount/100), 2)
        category = categories[idx % len(categories)]
        description = f"Premium quality {product_name.lower()}. Best value product with excellent quality and durability."
        
        writer.writerow([
            idx,
            product_name,
            description,
            price,
            negotiable,
            discount,
            negotiated_price,
            'M',  # Size
            category,
            'Mixed',  # Color
            'Premium',  # Material
            image_file
        ])

print(f"✓ Created CSV: {csv_path}")
print(f"✓ Total products: {len(image_files)}")
