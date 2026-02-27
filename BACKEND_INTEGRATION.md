# Backend Integration Setup Guide

## Prerequisites
- Python 3.8+
- pip package manager

## Step 1: Install Backend Dependencies

```powershell
cd c:\Users\mdkam\Downloads\project\backend
pip install -r requirements.txt
```

## Step 2: Initialize Database

```powershell
cd c:\Users\mdkam\Downloads\project\backend
python scripts/init_db.py
```

This will:
- Create database tables
- Load sample products (or CSV if available)
- Output status messages

## Step 3: Start Backend Server

```powershell
cd c:\Users\mdkam\Downloads\project\backend
python run.py
```

Expected output:
```
 * Running on http://localhost:5000
 * Debug mode: on
```

## Step 4: Open Frontend

Once backend is running, open browser to:
- **Local Frontend**: Open `c:\Users\mdkam\Downloads\project\frontend\index.html` in a web browser

Or if using a local server:
- **Via HTTP Server**: `python -m http.server 8000` in the frontend folder

## API Endpoints

### Products API
- **GET** `/products/` - List all products
- **GET** `/products/<id>` - Get specific product by ID
- **POST** `/products/` - Create new product (JSON body required)

### Chatbot/Negotiation API
- **POST** `/chatbot/` 
  - Request: `{ user_message, product_id, offered_price }`
  - Response: `{ success, product_id, original_price, suggested_price, message }`

### Health Check
- **GET** `/api/health` - Check if backend is running

## Troubleshooting

### Port 5000 Already in Use
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### CORS Errors
- CORS is enabled for all origins
- If still issues, check backend logs for errors

### Database Issues
```powershell
# Delete database and reinitialize
rm c:\Users\mdkam\Downloads\project\backend\database\app.db
python scripts/init_db.py
```

### Models Not Found
- Ensure scikit-learn models are trained
- Check `backend/models/` directory exists

## Frontend Features Integrated

✅ Product listing from backend  
✅ Price negotiation with ML models  
✅ Real-time chatbot responses  
✅ Shopping cart with localStorage  
✅ CORS-enabled for cross-origin requests  

## Sample Products

The system comes with 10 sample products:
1. Wireless Headphones - $79.99
2. USB-C Cable - $12.99
3. Cotton T-Shirt - $24.99
4. Coffee Maker - $45.99
5. Running Shoes - $89.99
6. Programming Book - $34.99
7. Laptop Bag - $59.99
8. Desk Lamp - $35.99
9. Yoga Mat - $29.99
10. Smartphone Case - $19.99

## Notes

- Backend runs on `http://localhost:5000`
- Frontend makes API calls to `http://localhost:5000/`
- All responses are in JSON format
- Error responses include `success: false` and error messages
