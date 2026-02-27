# Dynamic Negotiation E-Commerce

## Project Overview
This project is a starter scaffold for a **dynamic negotiation e-commerce** experience. It includes a Flask backend, a SQLite database for products, a simple frontend, and a negotiation chatbot powered by SVR + k-NN models.

## Tech Stack
- Python 3.x
- Flask
- SQLite
- HTML/CSS/JavaScript
- scikit-learn (SVR, k-NN)
- pandas, numpy, joblib

## Setup Instructions
1. Create and activate a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Database Import Steps
1. Ensure your CSV file exists (example):
   `c:\Users\mdkam\Downloads\negotation.csv`
2. Run the import script:
   ```bash
   python backend\scripts\init_db.py
   ```
3. Verify data in `database/app.db`.

## Running Backend and Frontend
### Backend
```bash
cd backend
python run.py
```
Backend will run at: `http://127.0.0.1:5000`

### Frontend
Open:
```
frontend/index.html
```
Or serve it via any static server.

## Training ML Models
Run the training script:
```bash
python backend\scripts\train_models.py
```
This will save trained models to:
- `backend/models/svr_model.joblib`
- `backend/models/knn_model.joblib`

## API Specification
### Products
- `GET /products/` — List all products
- `GET /products/<id>` — Product detail
- `POST /products/` — Add new product
- `PUT /products/<id>` — Update product
- `DELETE /products/<id>` — Delete product

### Chatbot
- `POST /chatbot/` — Get negotiation response

## Example Headers
```
Content-Type: application/json
```

## Sample Requests
### Add Product
```bash
curl -X POST http://127.0.0.1:5000/products/ \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "p123",
    "name": "Sample Product",
    "description": "A demo product",
    "price": 1999.99,
    "category": "electronics",
    "stock": 5,
    "negotiation_history": ""
  }'
```

### Chatbot Request
```bash
curl -X POST http://127.0.0.1:5000/chatbot/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_message": "Can you offer a discount?",
    "product_id": "p123",
    "offered_price": 1500
  }'
```
