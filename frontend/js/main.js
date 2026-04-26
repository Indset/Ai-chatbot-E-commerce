const { useEffect, useMemo, useState } = React;

const API_BASE = (() => {
  try {
    const host = location.hostname || 'localhost';
    return `${location.protocol}//${host}:5000`;
  } catch (e) {
    return 'http://localhost:5000';
  }
})();

const SAMPLE_PRODUCTS = [
  { product_id: '1', id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Electronics', description: 'Premium wireless headphones', negotiation_available: true },
  { product_id: '2', id: 2, name: 'USB-C Cable', price: 12.99, category: 'Electronics', description: 'Durable USB-C charging cable', negotiation_available: true },
  { product_id: '3', id: 3, name: 'Cotton T-Shirt', price: 24.99, category: 'Clothing', description: 'Comfortable cotton t-shirt', negotiation_available: true },
  { product_id: '4', id: 4, name: 'Coffee Maker', price: 45.99, category: 'Home', description: 'Automatic drip coffee maker', negotiation_available: true },
  { product_id: '5', id: 5, name: 'Running Shoes', price: 89.99, category: 'Sports', description: 'Lightweight running shoes', negotiation_available: true },
  { product_id: '6', id: 6, name: 'Programming Book', price: 34.99, category: 'Books', description: 'Learn web development guide', negotiation_available: true }
];

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvRows(csvText) {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const row = {};
    const values = parseCsvLine(line);
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

function decorateProduct(p) {
  const fallbackId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const price = Number(p.price || 0);
  const discount = Number.isFinite(Number(p.discount_percent)) ? Number(p.discount_percent) : Math.floor(Math.random() * 30);
  const original = Number.isFinite(Number(p.original_price)) ? Number(p.original_price) : (price > 0 ? price / (1 - discount / 100) : 0);
  return {
    ...p,
    product_id: String(p.product_id ?? p.id ?? fallbackId),
    price,
    category: p.category || 'General',
    description: p.description || 'Premium quality product',
    negotiation_available: p.negotiation_available !== false,
    discount_percent: Math.max(0, Math.round(discount)),
    original_price: Number.isFinite(original) ? original : price
  };
}

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

// Smart image matcher — product name ke keywords se image file dhundta hai
// Tumhari actual image files ka naam yahan likho (extension ke saath)
const IMAGE_FILES = [
  "Backpack.webp",
  "Bedsheet Set.webp",
  "Blender.png",
  "Bluetooth Spe.webp",
  "book.png",
  "Bookshelf.webp",
  "Cloud Comput.webp",
  "coffee maker.jpg",
  "Comforter.webp",
  "Curtains.webp",
  "data cable.jpeg",
  "Database Desi.webp",
  "Desk Chair.jpg",
  "Dumbbell Set.webp",
  "Electric Kettle.jpg",
  "Graphics Card.webp",
  "Gym Bag.avif",
  "Hoodie.webp",
  "JavaScript Guide.jpg",
  "Jeans.webp",
  "lamp.webp",
  "laptop bag.jpg",
  "Leather Belt.jpg",
  "Mechanical Keyboard.webp",
  "Microwave.avif",
  "Mirror.webp",
  "Monitor.webp",
  "Mouse Pad.webp",
  "Phone Stand.jpg",
  "Pillow Set.avif",
  "Power Bank 20000mAh.webp",
  "Python Programming.png",
  "RAM 16GB.jpg",
 "Resistance Bands.webp",
"Screen Protector.webp",
"shoes.webp",
"Smartphone Case.webp",
"Sports Socks Set.jpg",
"SSD 1TB.jpg",
"Sunglasses.avif",
"Toaster.webp",
"tshirt.png",
"USB Hub.webp",
"Vacuum Cleaner.webp",
"Watch.webp",
"Water Bottle.webp",
"Webcam 1080p.webp",
"Winter Jacket.webp",
"wireless headphone.webp",
"yoga_mat.jpg"
];
  // ── Apni baaki images yahan add karo ──

// Keyword → image file mapping (product name mein ye word mile toh ye image use karo)
const KEYWORD_MAP = [
  { keys: ["headphone", "wireless", "bluetooth", "speaker", "audio"],  file: "Bluetooth Spe.webp" },
  { keys: ["cable", "usb", "charging", "wire", "data"],                file: "data cable.jpeg" },
  { keys: ["shirt", "tshirt", "t-shirt", "top", "clothing"],           file: "book.png" },
  { keys: ["coffee", "maker", "brewer", "kettle", "kitchen"],          file: "coffee maker.jpg" },
  { keys: ["shoe", "running", "sneaker", "footwear", "boot"],          file: "Backpack.webp" },
  { keys: ["book", "programming", "guide", "novel", "read"],           file: "book.png" },
  { keys: ["bag", "laptop bag", "backpack", "carry", "pack"],          file: "Backpack.webp" },
  { keys: ["lamp", "light", "desk lamp", "bulb", "led"],               file: "Desk Chair.jpg" },
  { keys: ["yoga", "mat", "exercise", "fitness", "gym"],               file: "Dumbbell Set.webp" },
  { keys: ["phone", "smartphone", "mobile", "case", "cover"],          file: "Bluetooth Spe.webp" },
  { keys: ["dumbbell", "weight", "barbell", "lifting"],                file: "Dumbbell Set.webp" },
  { keys: ["chair", "desk", "seat", "office", "furniture"],            file: "Desk Chair.jpg" },
  { keys: ["bedsheet", "sheet", "pillow", "bed", "linen"],             file: "Bedsheet Set.webp" },
  { keys: ["comforter", "blanket", "quilt", "duvet"],                  file: "Comforter.webp" },
  { keys: ["curtain", "drape", "window", "blind"],                     file: "Curtains.webp" },
  { keys: ["bookshelf", "shelf", "rack", "storage"],                   file: "Bookshelf.webp" },
  { keys: ["blender", "mixer", "juicer", "grinder"],                   file: "Blender.png" },
  { keys: ["graphics", "gpu", "video card", "gaming"],                 file: "Graphics Card.webp" },
  { keys: ["cloud", "storage", "server", "hosting", "database"],       file: "Cloud Comput.webp" },
  { keys: ["electric", "kettle", "water heater"],                      file: "Electric Kettle.jpg" },
];

// Cache — same product baar baar match na kare
const _imgCache = {};

function getProductImage(productId, productName) {
  const cacheKey = String(productId);
  if (_imgCache[cacheKey]) return _imgCache[cacheKey];

  const nameLower = (productName || '').toLowerCase();

  // Keyword match
  for (const { keys, file } of KEYWORD_MAP) {
    if (keys.some(k => nameLower.includes(k))) {
      const path = `image/${file}`;
      _imgCache[cacheKey] = path;
      return path;
    }
  }

  // Fallback — pehli available image
  if (IMAGE_FILES.length > 0) {
    const idx = Number(productId) % IMAGE_FILES.length;
    const path = `image/${IMAGE_FILES[idx]}`;
    _imgCache[cacheKey] = path;
    return path;
  }

  return 'image/placeholder.jpg';
}

function ProductCard({ product, onDetail, onAdd, onNegotiate }) {
  const imageUrl = getProductImage(product.product_id || product.id, product.name);

  return (
    <div className="product-card">
      <div className="product-image">
        <img
          src={imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'images/placeholder.jpg';
          }}
        />
      </div>
      <div className="product-content">
        <span className="product-category">{product.category}</span>
        <h3 className="product-title">{product.name}</h3>
        <p className="product-description">{product.description.slice(0, 90)}{product.description.length > 90 ? '...' : ''}</p>
        <div className="price-section">
          <span className="original-price">{money(product.original_price)}</span>
          <span className="current-price">{money(product.price)}</span>
          {product.discount_percent > 0 && <span className="discount-label">-{product.discount_percent}%</span>}
        </div>
        <div className="product-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-small" onClick={() => onDetail(product)}>Details</button>
          <button className="btn btn-primary btn-small" onClick={() => onAdd(product, 1)}>Add to Cart</button>
          <button className="btn btn-accent btn-small" onClick={() => onNegotiate(product)}>Negotiate</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [section, setSection] = useState('home');
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('Loading products...');
  const [selectedCats, setSelectedCats] = useState([]);
  const [onlyNegotiable, setOnlyNegotiable] = useState(false);
  const [priceCap, setPriceCap] = useState(5000);
  const [sortBy, setSortBy] = useState('newest');

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);

  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [negotiation, setNegotiation] = useState(null);
  const [offerInput, setOfferInput] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [loggedInUser, setLoggedInUser] = useState('');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState([]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const resp = await fetch(`${API_BASE}/products/`);
        if (!resp.ok) throw new Error('Backend not reachable');
        const payload = await resp.json();
        if (!payload.success) throw new Error(payload.error || 'API error');

        const data = payload.data.map(decorateProduct);
        if (!mounted) return;

        setProducts(data);
        setStatus(`Loaded ${data.length} products from backend`);
      } catch (err) {
        const csvData = await loadProductsFromCsv();
        if (!mounted) return;

        if (csvData.length > 0) {
          setProducts(csvData);
          setStatus(`Loaded ${csvData.length} products from CSV`);
        } else {
          const fallback = SAMPLE_PRODUCTS.map(decorateProduct);
          setProducts(fallback);
          setStatus('Using sample products (backend/csv unavailable)');
        }
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  async function loadProductsFromCsv() {
    const csvPaths = ['../negotation.csv', './negotation.csv', '/negotation.csv'];
    for (const path of csvPaths) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const csv = await res.text();
        const rows = parseCsvRows(csv);
        if (!rows.length) continue;

        return rows.map(row => decorateProduct({
          id: Number(row['Product ID']),
          product_id: String(row['Product ID']),
          name: row['Product Name'] || 'Product',
          description: row['Description'] || 'Premium quality product',
          price: Number(row['Price']) || 0,
          category: row['Category'] || 'General',
          discount_percent: Number(row['Discount (%)']) || 0,
          negotiation_available: String(row['Negotiable']).toUpperCase() === 'TRUE',
          image: row['Image'] || ''
        }));
      } catch (e) {
        continue;
      }
    }
    return [];
  }

  const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCats.length) {
      list = list.filter(p => selectedCats.includes(p.category));
    }

    list = list.filter(p => p.price <= priceCap);

    if (onlyNegotiable) {
      list = list.filter(p => p.negotiation_available);
    }

    if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price);
    if (sortBy === 'discount') list.sort((a, b) => b.discount_percent - a.discount_percent);
    if (sortBy === 'popular') list.sort((a, b) => b.name.localeCompare(a.name));

    return list;
  }, [products, selectedCats, priceCap, onlyNegotiable, sortBy]);

  const deals = useMemo(() => products.filter(p => p.discount_percent >= 20).slice(0, 6), [products]);
  const cartCount = useMemo(() => cart.reduce((sum, x) => sum + x.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, x) => sum + Number(x.price) * x.quantity, 0), [cart]);
  const discount = useMemo(() => cart.reduce((sum, item) => {
    const unit = item.negotiated_price ?? Number(item.price) * (item.discount_percent || 0) / 100;
    if (item.negotiated_price) return sum + (Number(item.price) - item.negotiated_price) * item.quantity;
    return sum + unit * item.quantity;
  }, 0), [cart]);

  function toggleCategory(cat) {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]);
  }

  function resetFilters() {
    setSelectedCats([]);
    setOnlyNegotiable(false);
    setPriceCap(5000);
    setSortBy('newest');
  }

  function addToCart(product, qty) {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product_id === product.product_id);
      if (idx === -1) return [...prev, { ...product, quantity: qty }];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
      return next;
    });
  }

  function updateCartQty(index, delta) {
    setCart(prev => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: next[index].quantity + delta };
      return next.filter(x => x.quantity > 0);
    });
  }

  function startNegotiation(product) {
    setNegotiation({
      product,
      minPrice: Number(product.price) * 0.7,
      messages: [
        { type: 'bot', text: `Welcome! Current price is ${money(product.price)}. Make your offer.` }
      ]
    });
    setOfferInput('');
    setNegotiationOpen(true);
  }

  async function makeOffer() {
    if (!negotiation) return;
    const offeredPrice = Number(offerInput);
    if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) {
      alert('Please enter a valid offer');
      return;
    }

    setOfferInput('');
    setNegotiation(prev => ({ ...prev, messages: [...prev.messages, { type: 'user', text: `I offer ${money(offeredPrice)}` }] }));

    try {
      const payload = {
        user_message: `I offer $${offeredPrice.toFixed(2)}`,
        product_id: negotiation.product.product_id,
        offered_price: offeredPrice,
        negotiation_depth: 0
      };

      const response = await fetch(`${API_BASE}/chatbot/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();

      if (data.success) {
        setNegotiation(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            { type: 'bot', text: data.message || `Suggested price: ${money(data.suggested_price)}` },
            { type: 'hint', text: `Suggested: ${money(data.suggested_price)} | Savings: ${money(data.discount_amount)}` }
          ],
          latestSuggestedPrice: Number(data.suggested_price)
        }));
        return;
      }

      throw new Error(data.error || 'Negotiation error');
    } catch (e) {
      const base = Number(negotiation.product.price);
      const min = Number(negotiation.minPrice);
      const suggested = Math.max(min, (offeredPrice + base) / 2);
      setNegotiation(prev => ({
        ...prev,
        messages: [...prev.messages, { type: 'bot', text: `Counter offer: ${money(suggested)}` }],
        latestSuggestedPrice: suggested
      }));
    }
  }

  function acceptNegotiatedPrice() {
    if (!negotiation || !negotiation.latestSuggestedPrice) return;
    addToCart({ ...negotiation.product, negotiated_price: negotiation.latestSuggestedPrice }, 1);
    setNegotiationOpen(false);
  }

  function resetAuthFields(message = '') {
    setAuthName('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthMessage(message);
  }

  function openAuthModal() {
    setAuthMessage('');
    setAuthOpen(true);
  }

  function closeAuthModal() {
    setAuthOpen(false);
  }

  function exitAuthModal() {
    resetAuthFields('Exited.');
    setTimeout(() => {
      setAuthOpen(false);
      setAuthMessage('');
    }, 500);
  }

  async function registerUser() {
    const email = authEmail.trim();
    const password = authPassword.trim();
    const name = authName.trim();
    if (!email || !password) {
      setAuthMessage('Email and password required.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setAuthMessage('Please enter a valid email address.');
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok) {
        setAuthMessage('Registered successfully. You may now log in.');
        return;
      }
      setAuthMessage(`Registration failed: ${(data && data.error) || `Status ${resp.status}`}`);
    } catch (e) {
      setAuthMessage('Registration error.');
    }
  }

  async function loginUser() {
    const email = authEmail.trim();
    const password = authPassword.trim();
    if (!email || !password) {
      setAuthMessage('Email and password required.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setAuthMessage('Please enter a valid email address.');
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data && data.success) {
        setLoggedInUser((data.user && data.user.email) || email);
        setAuthMessage('Login successful!');
        setTimeout(() => {
          setAuthOpen(false);
          setAuthMessage('');
        }, 300);
        return;
      }
      setAuthMessage(`Login failed: ${(data && data.error) || `Status ${resp.status}`}`);
    } catch (e) {
      setAuthMessage('Login error.');
    }
  }

  function openAIChat() {
    setAiChatOpen(true);
    setAiChatMessages(prev => {
      if (prev.length > 0) return prev;
      return [{ who: 'bot', text: 'Hi! I am your AI Negotiation Assistant. Ask me about prices or type an offer.' }];
    });
  }

  function closeAIChat() {
    setAiChatOpen(false);
    setAiChatInput('');
    setAiChatMessages([]);
  }

  async function exitAIChat() {
    try {
      await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: '__session_end__' })
      });
    } catch (e) {
      // Best effort exit notification.
    }

    setAiChatMessages(prev => [...prev, { who: 'bot', text: 'Session ended. Closing chat.' }]);
    setTimeout(() => closeAIChat(), 600);
  }

  async function sendAIChatMessage() {
    const text = aiChatInput.trim();
    if (!text) return;
    setAiChatInput('');
    setAiChatMessages(prev => [...prev, { who: 'user', text }]);

    try {
      const resp = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: text })
      });
      if (!resp.ok) throw new Error('Chat endpoint error');
      const data = await resp.json();
      const reply = (data && (data.reply || data.message)) || 'Sorry, I could not process that right now.';
      setAiChatMessages(prev => [...prev, { who: 'bot', text: reply }]);
    } catch (e) {
      setAiChatMessages(prev => [...prev, { who: 'bot', text: 'Connection issue. Please try again later.' }]);
    }
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1 className="logo">E-commerceHub</h1>
            <p className="tagline">Negotiate Better, Save More</p>
          </div>
          <nav className="nav-links">
            <a className="nav-link" onClick={() => setSection('home')}>Home</a>
            <a className="nav-link" onClick={() => setSection('shop')}>Shop</a>
            <a className="nav-link" onClick={() => setSection('deals')}>Deals</a>
          </nav>
          <div className="header-actions">
            <button className="cart-btn" onClick={() => setCartOpen(true)}>Cart <span className="cart-count">{cartCount}</span></button>
            <button className="user-btn" onClick={openAuthModal}>{loggedInUser ? `User: ${loggedInUser}` : 'Login'}</button>
          </div>
        </div>
      </header>

      <section id="home" className="hero-section" style={{ display: section === 'home' ? 'grid' : 'none' }}>
        <div className="hero-content">
          <h1>Welcome to E-commerceHub</h1>
          <p>Shop smarter, negotiate better, and save more on every purchase</p>
          <button className="btn btn-primary" onClick={() => setSection('shop')}>Start Shopping</button>
          <p style={{ marginTop: '1rem' }}>{status}</p>
        </div>
        <div className="hero-image-placeholder" style={{ width: '100%', maxWidth: '700px', margin: '1.5rem auto' }}>Smart shopping experience</div>
        <div id="home-product-preview" style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', padding: '0 1rem' }}>
          {products.slice(0, 6).map(p => (
            <div key={p.product_id} style={{ minWidth: '220px', padding: '0.75rem', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(2,6,23,0.06)' }}>
              {p.image && (
                <img src={`${API_BASE}/static/images/${p.image}`} alt={p.name} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} onError={(e) => { e.style.display = 'none'; }} />
              )}
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>{money(p.price)}</div>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button className="btn btn-small" onClick={() => setDetailProduct(p)}>Details</button>
                <button className="btn btn-small" onClick={() => startNegotiation(p)}>Negotiate</button>
              </div>
            </div>
          ))}
        </div>
        <aside className="home-aside" style={{ width: '100%', maxWidth: '900px', margin: '2rem auto' }}>
          <h3>All Available Products</h3>
          <div className="product-grid" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {products.map(product => (
              <ProductCard
                key={product.product_id}
                product={product}
                onDetail={setDetailProduct}
                onAdd={addToCart}
                onNegotiate={startNegotiation}
              />
            ))}
          </div>
        </aside>
      </section>

      <section id="shop" className="shop-section" style={{ display: section === 'shop' ? 'block' : 'none' }}>
        <div className="shop-container">
          <aside className="sidebar">
            <h3>Filters</h3>
            <div className="filter-group">
              <h4>Category</h4>
              <div className="checkbox-group">
                {categories.map(cat => (
                  <label key={cat}>
                    <input type="checkbox" checked={selectedCats.includes(cat)} onChange={() => toggleCategory(cat)} /> {cat}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Price Range</h4>
              <div className="price-filter">
                <input type="range" min="0" max="5000" value={priceCap} onChange={(e) => setPriceCap(Number(e.target.value))} />
                <span>{money(priceCap)}</span>
              </div>
            </div>

            <div className="filter-group">
              <h4>Negotiation</h4>
              <label><input type="checkbox" checked={onlyNegotiable} onChange={(e) => setOnlyNegotiable(e.target.checked)} /> Available only</label>
            </div>

            <button className="btn btn-secondary" onClick={resetFilters}>Reset Filters</button>
          </aside>

          <main className="main-content">
            <div className="sort-bar">
              <h2>All Products</h2>
              <div className="sort-options">
                <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                  <option value="discount">Highest Discount</option>
                </select>
              </div>
            </div>

            <div className="status">{filteredProducts.length} products found</div>
            <div className="product-grid">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  onDetail={setDetailProduct}
                  onAdd={addToCart}
                  onNegotiate={startNegotiation}
                />
              ))}
            </div>
          </main>
        </div>
      </section>

      <section id="deals" className="deals-section" style={{ display: section === 'deals' ? 'block' : 'none' }}>
        <h2>Active Negotiations</h2>
        <div className="deals-grid">
          {deals.map(deal => (
            <div className="deal-card" key={deal.product_id}>
              {deal.image ? (
                <img src={`${API_BASE}/static/images/${deal.image}`} alt={deal.name} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} onError={(e) => { e.style.display = 'none'; }} />
              ) : (
                <div className="product-image-placeholder" style={{ width: '100%', height: '180px', background: '#f0f0f0', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
              )}
              <h3>{deal.name}</h3>
              <div className="price-section">
                <span className="original-price">Was: {money(deal.original_price)}</span>
                <span className="current-price">Now: {money(deal.price)}</span>
              </div>
              <div className="savings">You Save: {money(deal.original_price - deal.price)} ({deal.discount_percent}% off)</div>
              <button className="btn btn-primary" onClick={() => addToCart(deal, 1)} style={{ width: '100%' }}>Grab Deal</button>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>About Us</h4>
            <p>NegotiateHub is your smart shopping companion that helps you negotiate better prices.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a onClick={() => setSection('home')}>Home</a></li>
              <li><a onClick={() => setSection('shop')}>Shop</a></li>
              <li><a onClick={() => setSection('deals')}>Deals</a></li>
            </ul>
          </div>
        </div>
      </footer>

      <div className={`modal ${cartOpen ? 'open' : ''}`}>
        <div className="modal-content cart-modal-content">
          <div className="modal-header">
            <h2>Shopping Cart</h2>
            <button className="modal-close" onClick={() => setCartOpen(false)}>&times;</button>
          </div>
          <div className="cart-items">
            {cart.length === 0 ? <p className="empty-cart">Your cart is empty</p> : cart.map((item, index) => (
              <div className="cart-item" key={`${item.product_id}-${index}`}>
                <div className="cart-item-details">
                  <h4 className="cart-item-title">{item.name}</h4>
                  <div className="cart-item-meta">
                    <span>{item.category}</span>
                    <span className="cart-item-price">{money(item.negotiated_price ?? item.price)}</span>
                  </div>
                  <div className="cart-item-qty">
                    <button className="qty-btn" onClick={() => updateCartQty(index, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateCartQty(index, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <div className="summary-row"><span>Subtotal:</span><span>{money(subtotal)}</span></div>
            <div className="summary-row"><span>Discount:</span><span>-{money(discount)}</span></div>
            <div className="summary-row total"><span>Total:</span><span>{money(subtotal - discount)}</span></div>
            <button className="btn btn-primary" onClick={() => {
              if (!cart.length) return;
              alert('Order placed successfully');
              setCart([]);
              setCartOpen(false);
            }}>Proceed to Checkout</button>
          </div>
        </div>
      </div>

      <div className={`modal ${detailProduct ? 'open' : ''}`}>
        <div className="modal-content product-detail-modal">
          <button className="modal-close" onClick={() => setDetailProduct(null)}>&times;</button>
          {detailProduct && (
            <div className="product-detail-container">
              <div className="product-image-section">
                <img
                  src={getProductImage(detailProduct.product_id || detailProduct.id, detailProduct.name)}
                  alt={detailProduct.name}
                  style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '8px' }}
                  onError={(e) => { e.target.onerror = null; e.target.src = 'images/placeholder.jpg'; }}
                />
              </div>
              <div className="product-info">
                <div className="detail-header">
                  <h2>{detailProduct.name}</h2>
                  <span className="product-id">{detailProduct.product_id}</span>
                </div>
                <div className="price-section">
                  <span className="original-price">Original: {money(detailProduct.original_price)}</span>
                  <span className="current-price">Current: {money(detailProduct.price)}</span>
                </div>
                <p className="product-description">{detailProduct.description}</p>
                <div className="quantity-selector">
                  <label>Quantity:</label>
                  <div className="qty-input">
                    <button onClick={() => setDetailQty(q => Math.max(1, q - 1))}>-</button>
                    <input type="number" value={detailQty} min="1" onChange={(e) => setDetailQty(Math.max(1, Number(e.target.value) || 1))} />
                    <button onClick={() => setDetailQty(q => q + 1)}>+</button>
                  </div>
                </div>
                <div className="action-buttons">
                  <button className="btn btn-primary" onClick={() => {
                    addToCart(detailProduct, detailQty);
                    setDetailQty(1);
                    setDetailProduct(null);
                  }}>Add to Cart</button>
                  <button className="btn btn-accent" onClick={() => startNegotiation(detailProduct)}>Negotiate Price</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`modal ${negotiationOpen ? 'open' : ''}`}>
        <div className="modal-content chat-modal-content">
          <div className="chat-header">
            <h3>Price Negotiation - {negotiation?.product.name}</h3>
            <button className="modal-close" onClick={() => setNegotiationOpen(false)}>&times;</button>
          </div>
          <div className="chat-info">
            <p>Base Price: {money(negotiation?.product.price)}</p>
            <p>Lowest Possible: {money(negotiation?.minPrice)}</p>
          </div>
          <div className="chat-messages">
            {(negotiation?.messages || []).map((m, idx) => (
              <div key={idx} style={{ marginBottom: '0.6rem', textAlign: m.type === 'user' ? 'right' : 'left' }}>
                <div style={{ display: 'inline-block', padding: '0.5rem 0.75rem', borderRadius: '8px', background: m.type === 'user' ? '#0ea5e9' : m.type === 'hint' ? '#fef3c7' : '#f3f4f6', color: m.type === 'user' ? '#fff' : '#111' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <div className="price-suggestion">
              <label>Your Offer: $</label>
              <input type="number" min="0" step="0.01" value={offerInput} onChange={(e) => setOfferInput(e.target.value)} />
              <button className="btn btn-primary" onClick={makeOffer}>Make Offer</button>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-accent" disabled={!negotiation?.latestSuggestedPrice} onClick={acceptNegotiatedPrice}>
                Accept {money(negotiation?.latestSuggestedPrice)}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`modal ${authOpen ? 'open' : ''}`}>
        <div className="modal-content" style={{ maxWidth: '420px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Account</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={exitAuthModal} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Exit</button>
              <button onClick={closeAuthModal} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>x</button>
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem', color: '#064e3b', fontStyle: 'italic' }}>{authMessage}</div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Full name (optional)" style={{ padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" style={{ padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} type="password" placeholder="Password" style={{ padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }} onKeyDown={(e) => { if (e.key === 'Enter') loginUser(); }} />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={registerUser}>Register</button>
              <button className="btn btn-primary" onClick={loginUser}>Login</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', right: '20px', bottom: '20px', zIndex: 1000 }}>
        <button aria-label="Open AI Chat" onClick={openAIChat} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '9999px', padding: '14px 16px', boxShadow: '0 8px 24px rgba(2,6,23,0.2)', cursor: 'pointer' }}>
          AI Chat
        </button>
      </div>

      <div className={`modal ${aiChatOpen ? 'open' : ''}`}>
        <div className="modal-content" style={{ maxWidth: '420px', padding: '1rem' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>AI Negotiation Assistant</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={exitAIChat} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Exit</button>
              <button onClick={closeAIChat} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>x</button>
            </div>
          </header>
          <div style={{ height: '320px', overflow: 'auto', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', marginBottom: '0.75rem' }}>
            {aiChatMessages.map((m, index) => (
              <div key={`${m.who}-${index}`} style={{ marginBottom: '0.6rem', textAlign: m.who === 'user' ? 'right' : 'left' }}>
                <div style={{ display: 'inline-block', background: m.who === 'user' ? '#0ea5e9' : '#f3f4f6', color: m.who === 'user' ? '#fff' : '#111', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input value={aiChatInput} onChange={(e) => setAiChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendAIChatMessage(); }} placeholder="Type your message or offer..." style={{ flex: 1, padding: '0.65rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
            <button onClick={sendAIChatMessage} style={{ background: '#06b6d4', color: '#fff', border: 'none', padding: '0.6rem 0.9rem', borderRadius: '8px' }}>Send</button>
          </div>
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
