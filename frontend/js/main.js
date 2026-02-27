// ===== STATE MANAGEMENT =====
let products = [];
let cart = [];
let currentProduct = null;
let currentNegotiation = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  setupEventListeners();
  loadCartFromStorage();
  setupAIChatWidget();
  setupAuthUI();
});

// API base derived from current host to support multiple frontend servers (5500, 8000, etc.)
const API_BASE = (() => {
  try {
    const host = location.hostname || 'localhost';
    return `${location.protocol}//${host}:5000`;
  } catch (e) {
    return 'http://localhost:5000';
  }
})();

function setupEventListeners() {
  // Filters
  document.querySelectorAll('.category-filter').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });
  
  document.querySelectorAll('.negotiation-filter').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });

  document.getElementById('price-range').addEventListener('input', (e) => {
    document.getElementById('price-value').textContent = '$' + e.target.value;
    applyFilters();
  });

  document.getElementById('sort-select').addEventListener('change', () => {
    displayProducts(products);
  });

  // Cart Modal
  document.getElementById('cart-btn').addEventListener('click', openCart);

  // Chat
  document.getElementById('chat-send').addEventListener('click', sendChatMessage);
  document.getElementById('chat-text').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Offer 
  document.getElementById('offer-price').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') makeOffer();
  });
}

// ===== AI CHAT WIDGET =====
function setupAIChatWidget() {
  const openBtn = document.getElementById('ai-chat-open');
  const closeBtn = document.getElementById('ai-chat-close');
  const exitBtn = document.getElementById('ai-chat-exit');
  const sendBtn = document.getElementById('ai-chat-send');

  if (openBtn) openBtn.addEventListener('click', openAIChat);
  if (closeBtn) closeBtn.addEventListener('click', closeAIChat);
  if (exitBtn) exitBtn.addEventListener('click', exitAIChat);
  if (sendBtn) sendBtn.addEventListener('click', sendAIChatMessage);

  const input = document.getElementById('ai-chat-input');
  if (input) input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAIChatMessage();
  });
}

// ===== AUTH UI =====
function setupAuthUI() {
  const loginBtn = document.getElementById('login-btn');
  const closeBtn = document.getElementById('auth-close');
  const exitBtn = document.getElementById('auth-exit');
  const registerBtn = document.getElementById('auth-register');
  const authLoginBtn = document.getElementById('auth-login');

  if (loginBtn) loginBtn.addEventListener('click', openAuthModal);
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
  if (exitBtn) exitBtn.addEventListener('click', exitAuth);
  if (registerBtn) registerBtn.addEventListener('click', handleRegister);
  if (authLoginBtn) authLoginBtn.addEventListener('click', handleLogin);
}

function openAuthModal() {
  document.getElementById('auth-modal').style.display = 'block';
  const msg = document.getElementById('auth-msg'); if (msg) msg.textContent = '';
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function exitAuth() {
  // Clear inputs and close modal
  const nameEl = document.getElementById('auth-name');
  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-password');
  const msg = document.getElementById('auth-msg');
  if (nameEl) nameEl.value = '';
  if (emailEl) emailEl.value = '';
  if (passEl) passEl.value = '';
  if (msg) msg.textContent = 'Exited.';
  setTimeout(() => { closeAuthModal(); if (msg) msg.textContent = ''; }, 600);
}

async function handleRegister() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const name = document.getElementById('auth-name').value.trim();
  const msg = document.getElementById('auth-msg');
  if (!email || !password) { if (msg) msg.textContent = 'Email and password required.'; return; }
  // basic email validation
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if (msg) msg.textContent = 'Please enter a valid email address.'; return; }

  try {
    const resp = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email, password, name})
    });
    let data = null;
    try { data = await resp.json(); } catch (e) { /* non-json response */ }
    if (resp.ok) {
      if (msg) msg.textContent = 'Registered successfully. You may now log in.';
    } else {
      const err = (data && data.error) ? data.error : `Status ${resp.status}`;
      if (msg) msg.textContent = `Registration failed: ${err}`;
      console.error('Register failed', resp.status, data);
    }
  } catch (e) {
    console.error('Register error', e); if (msg) msg.textContent = 'Registration error.';
  }
}

async function handleLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const msg = document.getElementById('auth-msg');
  if (!email || !password) { if (msg) msg.textContent = 'Email and password required.'; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if (msg) msg.textContent = 'Please enter a valid email address.'; return; }

  try {
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email, password})
    });
    let data = null;
    try { data = await resp.json(); } catch (e) { /* non-json */ }
    if (resp.ok && data && data.success) {
      if (msg) msg.textContent = 'Login successful!';
      // update UI - show logged in user
      const loginBtn = document.getElementById('login-btn');
      if (loginBtn) loginBtn.textContent = `👤 ${data.user.email}`;
      closeAuthModal();
    } else {
      const err = (data && data.error) ? data.error : `Status ${resp.status}`;
      if (msg) msg.textContent = `Login failed: ${err}`;
      console.error('Login failed', resp.status, data);
    }
  } catch (e) {
    console.error('Login error', e); if (msg) msg.textContent = 'Login error.';
  }
}

function openAIChat() {
  document.getElementById('ai-chat-modal').style.display = 'block';
  // initial message
  addAIMessage('Hi! I am your AI Negotiation Assistant. Ask me about negotiating prices or type an offer (e.g., "$60 for headphones").', 'bot');
}

function closeAIChat() {
  document.getElementById('ai-chat-modal').style.display = 'none';
  document.getElementById('ai-chat-messages').innerHTML = '';
  const input = document.getElementById('ai-chat-input'); if (input) input.value = '';
}

async function exitAIChat() {
  // Inform backend session ended (best-effort) then close UI
  try {
    await fetch(`${API_BASE}/chatbot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_message: '__session_end__' })
    });
  } catch (e) {
    // Ignore errors - exit is best-effort
    console.warn('Exit notification failed', e);
  }

  addAIMessage('Session ended. Thanks for chatting — closing now.', 'bot');
  setTimeout(() => {
    closeAIChat();
  }, 700);
}

function addAIMessage(text, who = 'user') {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const msg = document.createElement('div');
  msg.style.marginBottom = '0.6rem';
  if (who === 'user') {
    msg.style.textAlign = 'right';
    msg.innerHTML = `<div style="display:inline-block;background:#0ea5e9;color:#fff;padding:0.5rem 0.75rem;border-radius:8px;">${escapeHtml(text)}</div>`;
  } else {
    msg.style.textAlign = 'left';
    msg.innerHTML = `<div style="display:inline-block;background:#f3f4f6;color:#111;padding:0.5rem 0.75rem;border-radius:8px;">${escapeHtml(text)}</div>`;
  }
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendAIChatMessage() {
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  addAIMessage(text, 'user');
  input.value = '';

  try {
    const resp = await fetch(`${API_BASE}/chatbot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_message: text })
    });
    if (!resp.ok) throw new Error('Chat endpoint error');
    const data = await resp.json();
    if (data.success && data.reply) {
      addAIMessage(data.reply, 'bot');
    } else if (data.success && data.message) {
      addAIMessage(data.message, 'bot');
    } else {
      addAIMessage('Sorry, I could not process that right now.', 'bot');
    }
  } catch (err) {
    console.error('AI chat error', err);
    addAIMessage('Connection issue. Please try again later.', 'bot');
  }
}

// ===== FETCH PRODUCTS =====
async function fetchProducts() {
  const statusEl = document.getElementById('status');
  
  try {
    const resp = await fetch(`${API_BASE}/products/`);
    if (!resp.ok) throw new Error('Failed to load products');
    
    const payload = await resp.json();
    if (!payload.success) throw new Error(payload.error || 'API error');
    
    products = payload.data.map(p => ({
      ...p,
      negotiation_available: true,
      original_price: Number(p.price) * (1 + Math.random() * 0.3),
      discount_percent: Math.floor(Math.random() * 30)
    }));

    // Calculate statistics
    const avgPrice = (products.reduce((sum, p) => sum + parseFloat(p.price), 0) / products.length).toFixed(2);
    const minPrice = Math.min(...products.map(p => parseFloat(p.price))).toFixed(2);
    const maxPrice = Math.max(...products.map(p => parseFloat(p.price))).toFixed(2);
    const categories = [...new Set(products.map(p => p.category))].length;
    
    statusEl.innerHTML = `✅ Loaded ${products.length} products | Categories: ${categories} | Price Range: $${minPrice} - $${maxPrice} | Avg: $${avgPrice}`;
    statusEl.style.display = 'block';
    
    displayProducts(products);
    // mirror full list inside home section aside
    displayProducts(products, 'home-dataset-grid');
    loadDeals();
    // Populate home preview with a few products
    populateHomePreview(products.slice(0, 6));
  } catch (err) {
    statusEl.innerHTML = '❌ Error: ' + err.message + ' (Make sure backend is running on ' + API_BASE + ')';
    statusEl.style.display = 'block';
    console.error(err);
    
    // Fallback to CSV dataset, then static sample data as last resort.
    const loadedFromCsv = await loadProductsFromCsv();
    if (!loadedFromCsv) {
      loadSampleData();
    }
  }
}

// Populate the home hero preview with sample product cards
function populateHomePreview(items) {
  const container = document.getElementById('home-product-preview');
  if (!container) return;
  container.innerHTML = '';

  items.forEach(prod => {
    const card = document.createElement('div');
    card.style.minWidth = '220px';
    card.style.background = '#fff';
    card.style.padding = '0.75rem';
    card.style.borderRadius = '8px';
    card.style.boxShadow = '0 6px 18px rgba(2,6,23,0.06)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '0.5rem';

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.textContent = prod.name;

    const price = document.createElement('div');
    price.style.color = '#0f172a';
    price.style.fontWeight = '600';
    price.textContent = `$${Number(prod.price).toFixed(2)}`;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';

    const detailBtn = document.createElement('button');
    detailBtn.className = 'btn btn-small';
    detailBtn.textContent = 'Details';
    detailBtn.onclick = () => openProductDetail(prod.product_id);

    const negBtn = document.createElement('button');
    negBtn.className = 'btn btn-small';
    negBtn.textContent = 'Negotiate';
    negBtn.onclick = () => openNegotiationChat(prod.product_id);

    actions.appendChild(detailBtn);
    actions.appendChild(negBtn);

    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

// ===== SAMPLE DATA FALLBACK =====
function loadSampleData() {
  products = [
    { product_id: '1', id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Electronics', description: 'Premium wireless headphones', negotiation_available: true, original_price: 99.99, discount_percent: 20 },
    { product_id: '2', id: 2, name: 'USB-C Cable', price: 12.99, category: 'Electronics', description: 'Durable USB-C charging cable', negotiation_available: true, original_price: 16.99, discount_percent: 23 },
    { product_id: '3', id: 3, name: 'Cotton T-Shirt', price: 24.99, category: 'Clothing', description: 'Comfortable cotton t-shirt', negotiation_available: true, original_price: 34.99, discount_percent: 28 },
    { product_id: '4', id: 4, name: 'Coffee Maker', price: 45.99, category: 'Home', description: 'Automatic drip coffee maker', negotiation_available: true, original_price: 59.99, discount_percent: 23 },
    { product_id: '5', id: 5, name: 'Running Shoes', price: 89.99, category: 'Sports', description: 'Lightweight running shoes', negotiation_available: true, original_price: 119.99, discount_percent: 25 },
    { product_id: '6', id: 6, name: 'Programming Book', price: 34.99, category: 'Books', description: 'Learn web development guide', negotiation_available: true, original_price: 49.99, discount_percent: 30 }
  ];
  
  document.getElementById('status').textContent = '⚠️ Using sample data (Backend not connected)';
  displayProducts(products);
  displayProducts(products, 'home-dataset-grid');
  populateHomePreview(products.slice(0, 6));
  loadDeals();
}

async function loadProductsFromCsv() {
  const statusEl = document.getElementById('status');
  const csvPaths = ['../negotation.csv', './negotation.csv', '/negotation.csv'];

  for (const path of csvPaths) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        continue;
      }

      const csvText = await response.text();
      const rows = parseCsvRows(csvText);
      if (rows.length === 0) {
        continue;
      }

      products = rows.map(row => {
        const price = Number(row['Price']);
        const discountPercent = Number(row['Discount (%)']) || 0;
        const negotiatedPrice = Number(row['Negotiated Price']);
        const originalPrice = discountPercent > 0
          ? price / (1 - (discountPercent / 100))
          : price;

        return {
          id: Number(row['Product ID']),
          product_id: String(row['Product ID']),
          name: row['Product Name'] || 'Product',
          description: row['Description'] || 'Premium quality product',
          price: Number.isFinite(price) ? price : 0,
          category: row['Category'] || 'General',
          size: row['Size'] || '',
          color: row['Color'] || '',
          material: row['Material'] || '',
          negotiation_available: String(row['Negotiable']).toUpperCase() === 'TRUE',
          discount_percent: Number.isFinite(discountPercent) ? discountPercent : 0,
          negotiated_price: Number.isFinite(negotiatedPrice) ? negotiatedPrice : null,
          original_price: Number.isFinite(originalPrice) ? originalPrice : (Number.isFinite(price) ? price : 0)
        };
      });

      if (products.length === 0) {
        continue;
      }

      const minPrice = Math.min(...products.map(p => Number(p.price))).toFixed(2);
      const maxPrice = Math.max(...products.map(p => Number(p.price))).toFixed(2);
      const categories = [...new Set(products.map(p => p.category))].length;

      if (statusEl) {
        statusEl.innerHTML = `✅ Loaded ${products.length} products from CSV dataset | Categories: ${categories} | Price Range: $${minPrice} - $${maxPrice}`;
        statusEl.style.display = 'block';
      }

      displayProducts(products);
      displayProducts(products, 'home-dataset-grid');
      populateHomePreview(products.slice(0, 6));
      loadDeals();
      return true;
    } catch (error) {
      console.warn(`CSV load failed from ${path}`, error);
    }
  }

  return false;
}

function parseCsvRows(csvText) {
  if (!csvText) return [];

  const lines = csvText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

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

// ===== DISPLAY PRODUCTS =====
function displayProducts(productsToShow, containerId = 'product-grid') {
  const grid = document.getElementById(containerId);
  if (!grid) return; // nothing to display if container missing
  grid.innerHTML = '';

  if (productsToShow.length === 0) {
    grid.innerHTML = '<p class="status">No products found</p>';
    return;
  }

  const sorted = sortProducts([...productsToShow]);
  
  sorted.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Calculate discount and original price
    const originalPrice = product.original_price || product.price * 1.15;
    const discountPercent = product.discount_percent || Math.floor((originalPrice - product.price) / originalPrice * 100);
    const discountLabel = discountPercent > 0 
      ? `<span class="discount-label">-${discountPercent}%</span>` 
      : '';
    
    // Truncate description to 2 lines
    const shortDesc = product.description 
      ? product.description.substring(0, 80) + (product.description.length > 80 ? '...' : '')
      : 'Premium quality product';
    
    card.innerHTML = `
      <div class="product-image">
        <div class="product-image-placeholder" style="width:100%;height:160px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:0.9rem;margin-bottom:0.5rem;">📦 Image</div>
      </div>
      <div class="product-content">
        <span class="product-category">${product.category || 'General'}</span>
        <h3 class="product-title" title="${product.name}">${product.name}</h3>
        <p class="product-description" style="font-size:0.85rem;color:#666;margin:0.3rem 0;line-height:1.3;">${shortDesc}</p>
        <div class="product-rating">
          <span class="stars">★★★★★</span>
          <span style="font-size:0.85rem;">(${Math.floor(Math.random() * 500 + 50)} reviews)</span>
        </div>
        <div class="product-price-info">
          <span class="original-price" style="font-size:0.9rem;">$${parseFloat(originalPrice).toFixed(2)}</span>
          <span class="current-price" style="font-weight:bold;">$${Number(product.price).toFixed(2)}</span>
          ${discountLabel}
        </div>
        <div class="product-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
          <button class="add-to-cart-btn" onclick="quickAddToCart('${product.product_id}')" style="padding:0.5rem;font-size:0.85rem;">🛒 Cart</button>
          <button class="negotiate-btn" onclick="openNegotiationChat('${product.product_id}')" style="padding:0.5rem;font-size:0.85rem;cursor:pointer;background:#ec4899;color:white;border:none;border-radius:6px;">🤝 Negotiate</button>
          <button class="detail-btn" onclick="openProductDetail('${product.product_id}')" style="padding:0.5rem;font-size:0.85rem;cursor:pointer;grid-column:1/-1;">💬 Details</button>
        </div>
      </div>
    `;
    
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openProductDetail(product.product_id);
    });
    
    grid.appendChild(card);
  });
}

function sortProducts(prods) {
  const sortValue = document.getElementById('sort-select').value;
  
  switch(sortValue) {
    case 'price-low':
      return prods.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price-high':
      return prods.sort((a, b) => Number(b.price) - Number(a.price));
    case 'popular':
      return prods.sort(() => Math.random() - 0.5);
    case 'discount':
      return prods.sort((a, b) => b.discount_percent - a.discount_percent);
    default:
      return prods;
  }
}

// ===== PRODUCT DETAIL MODAL =====
function openProductDetail(productId) {
  const product = products.find(p => p.product_id === productId);
  if (!product) return;
  
  currentProduct = product;
  
  // Calculate discount
  const originalPrice = product.original_price || product.price * 1.15;
  const discountPercent = product.discount_percent || Math.floor((originalPrice - product.price) / originalPrice * 100);
  
  // Populate product details
  document.getElementById('detail-product-id').textContent = `ID: ${product.product_id}`;
  document.getElementById('detail-name').textContent = product.name;
  document.getElementById('detail-category').textContent = product.category || 'General';
  document.getElementById('detail-price').textContent = Number(product.price).toFixed(2);
  document.getElementById('detail-original-price').textContent = originalPrice.toFixed(2);
  
  // Stock status
  const stock = product.stock || 100;
  const stockStatus = stock > 50 ? '✓ In Stock' : stock > 0 ? '⚠ Low Stock' : '✗ Out of Stock';
  document.getElementById('detail-stock').textContent = stockStatus;
  document.getElementById('detail-units').textContent = `${stock} units available`;
  
  // Date (format nicely)
  const dateAdded = product.created_at 
    ? new Date(product.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Recently Added';
  document.getElementById('detail-date').textContent = dateAdded;
  
  // Full description
  document.getElementById('detail-description').textContent = product.description || 'Premium quality product from our collection.';
  document.getElementById('detail-about').textContent = product.description || 'This is a high-quality product available in our NegotiateHub store.';
  
  // Discount badge
  const discountBadge = document.getElementById('discount-badge');
  if (discountPercent > 0) {
    discountBadge.textContent = `Save ${discountPercent}%`;
    discountBadge.style.display = 'inline-block';
  } else {
    discountBadge.style.display = 'none';
  }
  
  // Reset quantity
  document.getElementById('qty-input').value = '1';
  
  // Open modal
  document.getElementById('product-detail-modal').style.display = 'block';
  
  // Setup negotiate button
  const negotiateBtn = document.getElementById('negotiate-btn');
  if (negotiateBtn) {
    negotiateBtn.onclick = () => openNegotiationChat(productId);
  }
}

function closeProductDetail() {
  document.getElementById('product-detail-modal').style.display = 'none';
  currentProduct = null;
}

// ===== FILTERS =====
function applyFilters() {
  const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked'))
    .map(el => el.value);
  const maxPrice = Number(document.getElementById('price-range').value);
  
  let filtered = products.filter(p => {
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category);
    const priceMatch = Number(p.price) <= maxPrice;
    return categoryMatch && priceMatch;
  });
  
  displayProducts(filtered);
}

function resetFilters() {
  document.querySelectorAll('.category-filter, .negotiation-filter').forEach(el => el.checked = false);
  document.getElementById('price-range').value = 5000;
  document.getElementById('price-value').textContent = '$5000';
  displayProducts(products);
}

// ===== PRODUCT DETAIL =====
function openProductDetail(productId) {
  currentProduct = products.find(p => p.product_id === productId);
  if (!currentProduct) return;
  
  document.getElementById('detail-name').textContent = currentProduct.name;
  document.getElementById('detail-original-price').textContent = currentProduct.original_price.toFixed(2);
  document.getElementById('detail-price').textContent = currentProduct.price;
  
  // Use actual product description from dataset, or fallback
  const description = currentProduct.description 
    ? currentProduct.description.substring(0, 200) + (currentProduct.description.length > 200 ? '...' : '')
    : `High-quality ${currentProduct.category || 'product'} with excellent features and reliability.`;
  
  document.getElementById('detail-description').textContent = description;
  
  const discountBadge = document.getElementById('discount-badge');
  if (currentProduct.discount_percent > 0) {
    discountBadge.textContent = `Save ${currentProduct.discount_percent}%`;
  } else {
    discountBadge.textContent = '';
  }
  
  const specs = [
    `Brand: Premium Quality`,
    `Category: ${currentProduct.category || 'General'}`,
    `Price: $${currentProduct.price.toFixed(2)}`,
    `Stock Status: Available (100+ units)`,
    `Shipping: Free Worldwide`,
    `Warranty: 1 Year`,
    `Return Policy: 30 Days Money Back Guarantee`
  ];
  
  const specsList = document.getElementById('detail-specs');
  specsList.innerHTML = specs.map(s => `<li>${s}</li>`).join('');
  
  document.getElementById('qty-input').value = 1;
  document.getElementById('product-detail-modal').classList.add('open');
  
  // Setup negotiate button
  document.getElementById('negotiate-btn').onclick = () => openNegotiationChat(productId);
}

function closeProductDetail() {
  document.getElementById('product-detail-modal').classList.remove('open');
  currentProduct = null;
}

function increaseQty() {
  const input = document.getElementById('qty-input');
  input.value = parseInt(input.value) + 1;
}

function decreaseQty() {
  const input = document.getElementById('qty-input');
  if (parseInt(input.value) > 1) {
    input.value = parseInt(input.value) - 1;
  }
}

function addToCart() {
  if (!currentProduct) return;
  
  const qty = parseInt(document.getElementById('qty-input').value);
  addToCartLogic(currentProduct, qty);
  
  alert(`✓ Added ${qty}x ${currentProduct.name} to cart!`);
  closeProductDetail();
}

function quickAddToCart(productId) {
  const product = products.find(p => p.product_id === productId);
  if (product) {
    addToCartLogic(product, 1);
    updateCartCount();
  }
}

function addToCartLogic(product, qty) {
  const existingItem = cart.find(item => item.product_id === product.product_id);
  
  if (existingItem) {
    existingItem.quantity += qty;
  } else {
    cart.push({
      ...product,
      quantity: qty,
      negotiated_price: null
    });
  }
  
  saveCartToStorage();
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const saved = localStorage.getItem('cart');
  if (saved) {
    cart = JSON.parse(saved);
    updateCartCount();
  }
}

// ===== CART MANAGEMENT =====
function openCart() {
  const cartItems = document.getElementById('cart-items');
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
  } else {
    cartItems.innerHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <div class="cart-item-image">Image</div>
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.name}</h4>
          <div class="cart-item-meta">
            <span>${item.category || 'Product'}</span>
            <span class="cart-item-price">$${Number(item.price).toFixed(2)}</span>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateCartQty(${idx}, -1)">−</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty(${idx}, 1)">+</button>
            <button class="cart-item-remove" onclick="removeFromCart(${idx})">Remove</button>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">
            $${(Number(item.price) * item.quantity).toFixed(2)}
          </div>
          <button class="btn btn-accent" onclick="openNegotiationChat('${item.product_id}')" style="padding: 0.5rem; font-size: 0.8rem;">
            Negotiate
          </button>
        </div>
      </div>
    `).join('');
  }
  
  updateCartSummary();
  document.getElementById('cart-modal').classList.add('open');
}

function updateCartQty(idx, change) {
  cart[idx].quantity += change;
  if (cart[idx].quantity <= 0) {
    removeFromCart(idx);
  } else {
    saveCartToStorage();
    updateCartCount();
    openCart();
  }
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  saveCartToStorage();
  updateCartCount();
  openCart();
}

function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const discount = cart.reduce((sum, item) => {
    if (item.negotiated_price) {
      return sum + ((Number(item.price) - item.negotiated_price) * item.quantity);
    }
    return sum + (item.discount_percent / 100 * Number(item.price) * item.quantity);
  }, 0);
  const total = subtotal - discount;
  
  document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('discount-amount').textContent = '-$' + discount.toFixed(2);
  document.getElementById('total').textContent = '$' + total.toFixed(2);
}

function closeCart() {
  document.getElementById('cart-modal').classList.remove('open');
}

function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  alert('✓ Order placed successfully! Thank you for shopping with NegotiateHub.');
  cart = [];
  saveCartToStorage();
  updateCartCount();
  closeCart();
}

// ===== NEGOTIATION CHAT =====
function openNegotiationChat(productId) {
  const product = products.find(p => p.product_id === productId);
  if (!product) return;
  
  currentNegotiation = {
    product,
    basePrice: Number(product.price),
    minPrice: Number(product.price) * 0.7,
    maxPrice: Number(product.price) * 1.2,
    currentOffer: null,
    messages: [],
    negotiationDepth: 0
  };
  
  document.getElementById('chat-product-name').textContent = product.name;
  document.getElementById('chat-base-price').textContent = currentNegotiation.basePrice.toFixed(2);
  document.getElementById('chat-min-price').textContent = currentNegotiation.minPrice.toFixed(2);
  document.getElementById('chat-messages').innerHTML = '';
  document.getElementById('chat-text').value = '';
  document.getElementById('offer-price').value = '';
  
  // Get initial message from chatbot API
  getInitialChatMessage(productId);
  
  document.getElementById('chat-modal').classList.add('open');
  closeCart();
  closeProductDetail();
}

async function getInitialChatMessage(productId) {
  try {
    const response = await fetch(`${API_BASE}/chatbot/initial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✓ Got initial chatbot greeting:', data);
        addChatMessage(data.greeting, 'bot');
        // Add tips as hint messages for nice yellow styling
        if (data.tips && data.tips.length > 0) {
          data.tips.forEach(tip => {
            addChatMessage(tip, 'hint');
          });
        }
      }
    } else {
      console.warn('⚠️ Initial greeting request failed:', response.status);
      showFallbackGreeting();
    }
  } catch (err) {
    console.error('❌ Error getting initial greeting:', err);
    showFallbackGreeting();
  }
}

function showFallbackGreeting() {
  addChatMessage(
    `🎯 Welcome! I'm your AI negotiator. The current price for this ${currentNegotiation.product.category} is $${currentNegotiation.basePrice.toFixed(2)}. Feel free to make an offer - let's find a deal that works for both of us!`,
    'bot'
  );
  // Show some helpful tips
  addChatMessage('💡 Pro tip: The lower you go, the higher my counter-offer will be.', 'hint');
  addChatMessage('💡 Pro tip: Making realistic offers leads to better negotiation outcomes.', 'hint');
}

function closeChat() {
  document.getElementById('chat-modal').classList.remove('open');
  currentNegotiation = null;
}

function sendChatMessage() {
  const text = document.getElementById('chat-text').value.trim();
  if (!text) return;
  
  addChatMessage(text, 'user');
  document.getElementById('chat-text').value = '';
  
  // Simulate bot response
  setTimeout(() => {
    const responses = [
      "That's a reasonable question! Let me help you with the details.",
      "Great question! This product has excellent quality and features.",
      "Your feedback is valuable. Would you like to make an offer?",
      "The price reflects the quality and market conditions. What offer do you have in mind?"
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    addChatMessage(response, 'bot');
  }, 500);
}

function makeOffer() {
  if (!currentNegotiation) return;
  
  const offerPrice = parseFloat(document.getElementById('offer-price').value);
  if (isNaN(offerPrice) || offerPrice <= 0) {
    alert('Please enter a valid price');
    return;
  }
  
  currentNegotiation.currentOffer = offerPrice;
  
  addChatMessage(`I'd like to offer $${offerPrice.toFixed(2)}`, 'user');
  document.getElementById('offer-price').value = '';
  
  // Call backend API for counteroffer
  callChatbotAPI(offerPrice);
}

async function callChatbotAPI(offeredPrice) {
  if (!currentNegotiation) return;
  
  try {
    const payload = {
      user_message: `I would like to offer $${offeredPrice.toFixed(2)}`,
      product_id: currentNegotiation.product.product_id,
      offered_price: offeredPrice,
      negotiation_depth: currentNegotiation.negotiationDepth
    };
    
    console.log('📤 Sending negotiation offer:', payload);
    
    const response = await fetch(`${API_BASE}/chatbot/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✓ Negotiation response:', data);
      
      // Update negotiation state with AI response
      currentNegotiation.negotiationDepth = data.negotiation_depth;
      currentNegotiation.currentOffer = offeredPrice;
      
      // Display intelligent bot response
      addChatMessage(data.message, 'bot');
      
      // Display helpful hint
      if (data.hint) {
        addChatMessage(data.hint, 'hint');
      }
      
      // Create accept offer button
      const buttonContainer = document.createElement('div');
      buttonContainer.style.marginTop = '1rem';
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '0.5rem';
      buttonContainer.style.justifyContent = 'center';
      
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'btn btn-primary';
      acceptBtn.style.padding = '0.75rem 1.5rem';
      acceptBtn.textContent = `✓ Accept $${data.suggested_price.toFixed(2)}`;
      acceptBtn.onclick = () => acceptOffer(
        data.suggested_price,
        data.product_id,
        data.product_name
      );
      
      const declineBtn = document.createElement('button');
      declineBtn.className = 'btn btn-secondary';
      declineBtn.style.padding = '0.75rem 1.5rem';
      declineBtn.textContent = 'Make Another Offer';
      declineBtn.onclick = () => {
        document.getElementById('offer-price').focus();
      };
      
      buttonContainer.appendChild(acceptBtn);
      buttonContainer.appendChild(declineBtn);
      
      document.getElementById('chat-messages').appendChild(buttonContainer);
      document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
      
      // Show discount info
      const discountInfo = document.createElement('div');
      discountInfo.style.padding = '0.75rem';
      discountInfo.style.background = '#f0fdf4';
      discountInfo.style.borderRadius = '6px';
      discountInfo.style.marginTop = '0.5rem';
      discountInfo.style.fontSize = '0.9rem';
      discountInfo.style.color = '#15803d';
      discountInfo.innerHTML = `
        <strong>💰 Deal Summary:</strong><br>
        Original: $${data.original_price.toFixed(2)}<br>
        Your Offer: $${data.user_offered_price.toFixed(2)}<br>
        My Offer: $${data.suggested_price.toFixed(2)}<br>
        <span style="font-weight: bold; color: #22c55e;">Your Savings: $${data.discount_amount.toFixed(2)} (${data.discount_percent.toFixed(1)}%)</span>
      `;
      document.getElementById('chat-messages').appendChild(discountInfo);
      document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
      
    } else {
      console.error('❌ API error:', data.error);
      addChatMessage(`Error: ${data.error}. Let me try a different approach.`, 'bot');
      simulateBotResponse(offeredPrice);
    }
  } catch (err) {
    console.error('Chatbot API error:', err);
    addChatMessage('I encountered a connection issue. Let me work with what I have...', 'bot');
    simulateBotResponse(offeredPrice);
  }
}

function simulateBotResponse(offerPrice) {
  setTimeout(() => {
    let response;
    const discount = ((currentNegotiation.basePrice - offerPrice) / currentNegotiation.basePrice) * 100;
    
    if (offerPrice >= currentNegotiation.basePrice * 0.95) {
      response = `That's very close to our asking price! I can accept $${(currentNegotiation.basePrice * 0.95).toFixed(2)}. Would that work for you?`;
    } else if (offerPrice >= currentNegotiation.minPrice * 1.1) {
      response = `Good offer! I can meet you at $${(offerPrice + (currentNegotiation.basePrice - offerPrice) * 0.3).toFixed(2)}. That's a ${discount.toFixed(1)}% discount!`;
    } else if (offerPrice >= currentNegotiation.minPrice) {
      response = `That's getting interesting! The lowest I can go is $${currentNegotiation.minPrice.toFixed(2)}. Shall we settle at that?`;
    } else {
      response = `I appreciate the offer, but the absolute minimum is $${currentNegotiation.minPrice.toFixed(2)}. That's already 30% off!`;
    }
    
    addChatMessage(response, 'bot');
  }, 600);
}

function acceptOffer(acceptedPrice, productId, productName) {
  if (!currentNegotiation) return;
  
  // Use provided productId or fall back to current negotiation
  const finalProductId = productId || currentNegotiation.product.product_id;
  const product = currentNegotiation.product;
  
  // Check if product already in cart
  let cartItem = cart.find(item => item.product_id === finalProductId);
  
  if (cartItem) {
    // Update existing cart item
    cartItem.quantity += 1;
    cartItem.negotiated_price = acceptedPrice;
  } else {
    // Add new item to cart
    cartItem = {
      product_id: finalProductId,
      name: product.name,
      price: product.price,
      negotiated_price: acceptedPrice,
      quantity: 1,
      category: product.category || 'General'
    };
    cart.push(cartItem);
  }
  
  const savings = (product.price - acceptedPrice).toFixed(2);
  addChatMessage(`✨ Excellent! Deal closed at $${acceptedPrice.toFixed(2)}! (You saved $${savings}) Added to your cart!`, 'bot');
  
  updateCartCount();
  saveCartToStorage();
  
  setTimeout(() => {
    closeChat();
  }, 2000);
}

function addChatMessage(message, type = 'user') {
  const messageDiv = document.createElement('div');
  messageDiv.style.display = 'grid';
  messageDiv.style.gridTemplateColumns = 'auto 1fr';
  messageDiv.style.gap = '0.75rem';
  messageDiv.style.marginBottom = '1rem';
  messageDiv.style.alignItems = type === 'user' ? 'flex-end' : 'flex-start';
  
  if (type === 'user') {
    messageDiv.style.justifyContent = 'flex-end';
  }
  
  // Status emoji
  const statusDiv = document.createElement('div');
  statusDiv.style.fontSize = '1.5rem';
  statusDiv.style.flexShrink = '0';
  
  if (type === 'user') {
    statusDiv.textContent = '👤';
  } else if (type === 'hint') {
    statusDiv.textContent = '💡';
  } else {
    statusDiv.textContent = '🤖';
  }
  
  // Message bubble
  const bubbleDiv = document.createElement('div');
  bubbleDiv.style.padding = '0.875rem 1rem';
  bubbleDiv.style.borderRadius = '12px';
  bubbleDiv.style.maxWidth = '85%';
  bubbleDiv.style.wordWrap = 'break-word';
  bubbleDiv.style.lineHeight = '1.5';
  
  if (type === 'user') {
    bubbleDiv.style.background = '#0ea5e9';
    bubbleDiv.style.color = 'white';
    bubbleDiv.style.textAlign = 'right';
  } else if (type === 'hint') {
    bubbleDiv.style.background = '#fef3c7';
    bubbleDiv.style.color = '#92400e';
    bubbleDiv.style.borderLeft = '3px solid #f59e0b';
    bubbleDiv.style.textAlign = 'left';
    bubbleDiv.style.fontStyle = 'italic';
  } else {
    bubbleDiv.style.background = '#f3f4f6';
    bubbleDiv.style.color = '#1f2937';
    bubbleDiv.style.textAlign = 'left';
  }
  
  bubbleDiv.innerHTML = message;
  
  if (type === 'user') {
    messageDiv.appendChild(bubbleDiv);
    messageDiv.appendChild(statusDiv);
  } else {
    messageDiv.appendChild(statusDiv);
    messageDiv.appendChild(bubbleDiv);
  }
  
  document.getElementById('chat-messages').appendChild(messageDiv);
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
}

// ===== DEALS SECTION =====
function loadDeals() {
  const dealsGrid = document.getElementById('deals-grid');
  const activeDeals = products.filter(p => p.discount_percent > 20).slice(0, 6);
  
  if (activeDeals.length === 0) {
    dealsGrid.innerHTML = '<p>No active deals at the moment</p>';
    return;
  }
  
  dealsGrid.innerHTML = activeDeals.map(deal => {
    return `
    <div class="deal-card">
      <div class="product-image-placeholder" style="width:100%;height:180px;background:#f0f0f0;border-radius:6px;margin-bottom:0.5rem;display:flex;align-items:center;justify-content:center;color:#999;">Image</div>
      <h3>${deal.name}</h3>
      <div class="price-section">
        <span class="original-price">Was: $${deal.original_price.toFixed(2)}</span>
        <span class="current-price">Now: $${Number(deal.price).toFixed(2)}</span>
      </div>
      <div class="savings">
        You Save: $${(deal.original_price - Number(deal.price)).toFixed(2)} (${deal.discount_percent}% off)
      </div>
      <button class="btn btn-primary" onclick="quickAddToCart('${deal.product_id}')" style="width: 100%;">
        Grab Deal
      </button>
    </div>
  `;
  }).join('');
}

// ===== SECTION NAVIGATION =====
function showSection(sectionId) {
  document.querySelectorAll('section').forEach(section => {
    section.style.display = 'none';
  });
  
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
