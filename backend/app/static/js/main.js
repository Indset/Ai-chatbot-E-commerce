async function fetchProducts() {
  const statusEl = document.getElementById("status");
  const grid = document.getElementById("product-grid");

  try {
    const resp = await fetch("/products/");
    if (!resp.ok) throw new Error("Failed to load products");
    const payload = await resp.json();

    if (!payload.success) throw new Error(payload.error || "API error");

    statusEl.textContent = "";
    payload.data.forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${p.name}</h3>
        <div class="price">$${Number(p.price).toFixed(2)}</div>
        <div class="category">${p.category || "Uncategorized"}</div>
        <button type="button" data-product-id="${p.product_id}" data-price="${p.price}">Negotiate</button>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

const chatToggle = document.getElementById("chat-toggle");
const chatPopup = document.getElementById("chat-popup");
const chatClose = document.getElementById("chat-close");
const chatSend = document.getElementById("chat-send");
const chatText = document.getElementById("chat-text");
const chatMessages = document.getElementById("chat-messages");

let selectedProductId = null;
let selectedBasePrice = null;

function addMessage(text, who) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${who}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatToggle.addEventListener("click", () => {
  chatPopup.classList.add("open");
});

chatClose.addEventListener("click", () => {
  chatPopup.classList.remove("open");
});

chatSend.addEventListener("click", async () => {
  const text = chatText.value.trim();
  if (!text) return;

  addMessage(text, "user");
  chatText.value = "";

  try {
    const resp = await fetch("/chatbot/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_message: text,
        product_id: selectedProductId || "p1",
        offered_price: selectedBasePrice ? selectedBasePrice * 0.9 : 100,
      }),
    });

    const payload = await resp.json();
    if (!payload.success) throw new Error(payload.error || "API error");

    addMessage(payload.message, "bot");
  } catch (err) {
    addMessage(err.message, "bot");
  }
});

// Hook negotiate buttons to open chatbot
window.addEventListener("click", (e) => {
  const target = e.target;
  if (target.matches("button[data-product-id]")) {
    selectedProductId = target.getAttribute("data-product-id");
    selectedBasePrice = Number(target.getAttribute("data-price")) || null;
    chatPopup.classList.add("open");
    addMessage(`Negotiating for product ${selectedProductId}`, "bot");
  }
});

fetchProducts();
