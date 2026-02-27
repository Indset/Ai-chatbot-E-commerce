# 🏪 NegotiateHub - Full Integration Complete!

**Status:** ✅ **Backend & Frontend Fully Integrated**

## 🚀 Quick Start

### Backend is Already Running!
The Flask backend server is currently running on `http://localhost:5000` with:
- ✅ 10 sample products loaded
- ✅ CORS enabled for frontend communication  
- ✅ Price negotiation API ready
- ✅ Health check endpoint active

### Open the Frontend
1. Open this file in your browser: `c:\Users\mdkam\Downloads\project\STARTUP.html`
2. Click **"Open Frontend"** button to launch the e-commerce site
3. Start shopping and negotiating!

---

## 📁 Project Structure

```
project/
├── backend/                          # Flask API Server
│   ├── app/
│   │   ├── __init__.py              # Flask app with CORS enabled
│   │   ├── routes/
│   │   │   ├── products.py          # Product listing API
│   │   │   └── chatbot.py           # Negotiation chatbot API
│   │   ├── services/
│   │   │   └── negotiation.py       # ML price negotiation logic
│   │   └── models/                  # Trained ML models
│   ├── database/
│   │   └── app.db                   # SQLite database (created)
│   ├── scripts/
│   │   └── init_db.py               # Database initialization
│   ├── run.py                       # Backend server entry
│   └── requirements.txt             # Python dependencies
│
├── frontend/                         # Web Frontend
│   ├── index.html                   # Main SPA (UPDATED - full e-commerce)
│   ├── css/
│   │   └── main.css                 # Responsive styling (600+ lines)
│   ├── js/
│   │   └── main.js                  # Frontend logic + Backend integration
│   └── images/                      # Image placeholders (vacant as requested)
│
├── database/
│   └── schema.sql                   # Database schema reference
│
├── STARTUP.html                     # Quick start guide (NEW)
├── BACKEND_INTEGRATION.md           # Integration documentation (NEW)
└── README.md                        # Original project readme
```

---

## 🔗 API Integration Points

### **Products API**
**Endpoint:** `GET http://localhost:5000/products/`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": "1",
      "name": "Wireless Headphones",
      "price": 79.99,
      "category": "Electronics",
      "description": "...",
      "stock": 50
    },
    ...
  ]
}
```

The frontend fetches this on page load to display products.

### **Negotiation/Chatbot API**
**Endpoint:** `POST http://localhost:5000/chatbot/`

**Request:**
```json
{
  "user_message": "I would like to offer $60",
  "product_id": "1",
  "offered_price": 60
}
```

**Response:**
```json
{
  "success": true,
  "product_id": "1",
  "original_price": 79.99,
  "suggested_price": 74.99,
  "message": "We reviewed your offer of 60.00. Our suggested price is 74.99."
}
```

The frontend calls this when users make price offers.

### **Health Check**
**Endpoint:** `GET http://localhost:5000/api/health`

Returns: `{"status": "ok", "message": "Backend is running"}`

---

## 🛍️ Frontend Features

✅ **Product Listing** - Fetches from backend API  
✅ **Dynamic Grid** - Responsive product cards  
✅ **Search & Filter** - Category, price range, negotiation status  
✅ **Sorting** - Price, discount, popularity  
✅ **Product Detail Modal** - Full product information  
✅ **Shopping Cart** - LocalStorage persistence  
✅ **Price Negotiation** - Real ML-powered offers via chatbot API  
✅ **Negotiation Chat** - Interactive price negotiation interface  
✅ **Deal Section** - Highlights discounted products  
✅ **Mobile Responsive** - Works on all devices  
✅ **Image Placeholders** - Vacant as requested  

---

## 💾 Database

**Location:** `c:\Users\mdkam\Downloads\project\backend\database\app.db`

**Tables:**
- `products` - Product catalog with negotiation history

**Sample Products** (10 pre-loaded):
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

---

## 🤖 ML Negotiation Model

The negotiation chatbot uses:
- **SVR (Support Vector Regression)** - For price prediction
- **k-NN (k-Nearest Neighbors)** - For counteroffer optimization
- **Input Features:** User's offer vs. base price
- **Output:** ML-calculated optimal counteroffer

Located in: `backend/app/services/negotiation.py`

---

## 🔧 How It Works

### User Flow:
1. **Load Products** → Frontend calls `GET /products/` → Displays product grid
2. **View Product** → Click product card → Shows detail modal
3. **Make Offer** → Enter price offer → Frontend calls `POST /chatbot/`
4. **Get Counteroffer** → Backend runs ML prediction → Returns suggested price
5. **Accept Deal** → Add to cart with negotiated price
6. **Checkout** → Review cart and finalize purchase

### Technical Flow:
```
Frontend (index.html)
    ↓
Fetch Products API (server.py:list_products)
    ↓
SQLite Database (app.db)
    ↓
Display Product Grid
    ↓
User Makes Price Offer
    ↓
Call Chatbot API (chatbot.py:chatbot)
    ↓
Load ML Models (negotiation.py:compute_counteroffer)
    ↓
Return Suggested Price
    ↓
Update UI with Counteroffer
```

---

## 📝 Installation & Setup Steps (Already Done!)

### ✅ Completed:
- [x] Flask backend installed with CORS
- [x] Database initialized with sample products
- [x] Backend server running on port 5000
- [x] Frontend updated with backend integration
- [x] API integration implemented
- [x] Error handling with fallbacks
- [x] Sample data loaded

### If You Need to Reinitialize:

**Reinstall dependencies:**
```powershell
cd c:\Users\mdkam\Downloads\project\backend
pip install -r requirements.txt
```

**Reinitialize database:**
```powershell
cd c:\Users\mdkam\Downloads\project\backend
python scripts/init_db.py
```

**Restart backend:**
```powershell
cd c:\Users\mdkam\Downloads\project\backend
python run.py
```

---

## 🐛 Troubleshooting

### "Cannot fetch products"
- ✅ Check if backend is running (`http://localhost:5000/api/health`)
- ✅ Verify CORS is enabled in `backend/app/__init__.py`
- ✅ Check browser console for errors

### "Port 5000 already in use"
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### "Database errors"
```powershell
# Delete and reinitialize
rm backend/database/app.db
python backend/scripts/init_db.py
```

### "ML models not found"
- Ensure `backend/app/models/` directory exists with trained models
- Models are loaded by `load_models()` in negotiation.py

### Frontend shows "⚠️ Using sample data"
- Backend may not be running
- Check that server is on `http://localhost:5000`
- Wait for backend to fully start

---

## 🎨 UI Customization

### Colors (in `frontend/css/main.css`):
```css
--primary: #0ea5e9      /* Blue */
--secondary: #8b5cf6    /* Purple */
--accent: #ec4899       /* Pink */
--success: #22c55e      /* Green */
```

### Fonts:
System fonts with fallbacks to common web fonts

### Breakpoints:
- Mobile: < 480px
- Tablet: < 768px
- Desktop: > 768px

---

## 📊 Sample API Requests

### Fetch Products
```bash
curl http://localhost:5000/products/
```

### Make Price Offer
```bash
curl -X POST http://localhost:5000/chatbot/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_message": "Best price?",
    "product_id": "1",
    "offered_price": 60
  }'
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

---

## 🎯 Next Steps

1. **Open STARTUP.html** in your browser
2. **Click "Open Frontend"** to launch the app
3. **Browse products** fetched from backend
4. **Try negotiating** a price - watch the ML magic!
5. **Add items** to cart with negotiated prices
6. **Customize** products, colors, or add more features

---

## 📞 Support

The system comes with:
- ✅ Error handling with user-friendly messages
- ✅ Fallback to sample data if backend down
- ✅ CORS enabled for cross-origin requests
- ✅ Comprehensive logging in backend
- ✅ LocalStorage for cart persistence

---

**🚀 Everything is ready! Start shopping and negotiate like a pro!**
