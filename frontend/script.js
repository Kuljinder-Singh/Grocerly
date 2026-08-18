/**
 * Grocerly Integrated Logic - Hero & Grid Update
 */

let allProducts = [];
let cart = [];

/**
 * Grocerly Authentication & Token Management
 */

const API_BASE = "http://127.0.0.1:8000/api";

/**
 * 1. Modal Switching Logic
 */
window.openAuth = (type) => {
    document.getElementById('auth-overlay').style.display = 'block';
    document.querySelectorAll('.auth-modal').forEach(m => m.classList.remove('active'));
    document.getElementById(`${type}-modal`).classList.add('active');
};

window.closeAuthModal = () => {
    document.getElementById('auth-overlay').style.display = 'none';
    document.querySelectorAll('.auth-modal').forEach(m => m.classList.remove('active'));
};

window.switchModal = (type) => {
    document.querySelectorAll('.auth-modal').forEach(m => m.classList.remove('active'));
    document.getElementById(`${type}-modal`).classList.add('active');
};

/**
 * 2. Handle User Registration
 * Mapping to: POST /api/register/
 */
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch(`${API_BASE}/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (response.ok) {
            alert("Account created successfully! Please login.");
            switchModal('login');
        } else {
            const error = await response.json();
            alert(`Registration failed: ${JSON.stringify(error)}`);
        }
    } catch (err) {
        console.error("Reg Error:", err);
    }
}

/**
 * 3. Handle Login & JWT Retrieval
 * Mapping to: POST /api/token/
 */
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            // Store tokens in localStorage for persistence[cite: 1]
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('username', username);

            closeAuthModal();
            updateAuthUI();
            alert(`Welcome back, ${username}!`);
        } else {
            alert("Invalid credentials. Please try again.");
        }
    } catch (err) {
        console.error("Login Error:", err);
    }
}

/**
 * 4. Update UI based on Auth State
 */
function updateAuthUI() {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('username');
    const navActions = document.querySelector('.nav-actions');
    
    // Check if an auth button already exists to avoid duplicates
    let authBtn = document.getElementById('nav-auth-btn');
    if (!authBtn) {
        authBtn = document.createElement('button');
        authBtn.id = 'nav-auth-btn';
        authBtn.className = 'btn-secondary';
        authBtn.style.padding = '8px 16px';
        authBtn.style.borderRadius = '10px';
        authBtn.style.marginLeft = '10px';
        navActions.appendChild(authBtn);
    }

    if (token) {
        authBtn.innerHTML = `<i data-lucide="user" style="width:16px; vertical-align:middle; margin-right:5px;"></i> ${user} (Logout)`;
        authBtn.onclick = handleLogout;
    } else {
        authBtn.innerHTML = 'Login';
        authBtn.onclick = () => window.openAuth('login');
    }
    if (window.lucide) lucide.createIcons();
}

/**
 * 5. Handle Logout
 */
function handleLogout() {
    localStorage.clear();
    updateAuthUI();
    location.reload(); // Refresh to clear cart and sensitive data
}

// Call updateUI on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    // ... your existing loadGrocerlyApp() call
});
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('show-on-scroll');
    });
}, { threshold: 0.1 });

/**
 * Fetch Data and Setup Hero
 */
async function loadGrocerlyApp() {
    const grid = document.getElementById('product-grid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 100px 0;">
                <div class="loader" style="border-color: var(--primary); border-bottom-color: transparent; width: 40px; height: 40px; margin: 0 auto 20px;"></div>
                <p style="color: var(--text-muted); font-weight: 600;">Fetching fresh groceries...</p>
            </div>
        `;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/products/');
        if (!response.ok) throw new Error('Backend unreachable');

        allProducts = await response.json();
        
        // 1. Setup the Flash Deal (Hero Section)
        if (allProducts.length > 0) {
            setupFlashDeal(allProducts[0]); // Picks the first product as the deal
        }
        
        // 2. Render Main Grid
        renderGrocerlyGrid(allProducts);
        
        initSearch();
        initDealTimer();

    } catch (error) {
        console.error('Fetch error:', error);
        if(grid) grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px;"><h3 style="color: #be123c;">Server Connection Error</h3><p>Ensure Django is running at port 8000</p></div>`;
    }
}

/**
 * Update the Flash Deal Card in the Hero Section
 */
function setupFlashDeal(product) {
    const heroVisual = document.querySelector('.hero-visual');
    if (!product || !heroVisual) return;

    // Calculate a fake "Old Price" for the UI effect
    const oldPrice = (parseFloat(product.price) * 1.4).toFixed(2);

    heroVisual.innerHTML = `
        <div class="deal-card">
            <div class="deal-badge">Hot Deal</div>
            <div class="deal-content">
                <div class="deal-emoji" style="padding: 5px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 12px; height: 100px; width: 100px;">
                    ${product.image 
                        ? `<img src="${product.image}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">` 
                        : '🥑'}
                </div>
                <div class="deal-info">
                    <h3 style="font-size: 1.2rem; margin-bottom: 4px;">${product.name}</h3>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">${product.category || 'Premium Selection'}</p>
                    <div class="deal-pricing">
                        <span class="deal-price-new" style="color: var(--primary); font-weight: 800; font-size: 1.4rem;">₹${parseFloat(product.price).toFixed(2)}</span>
                        <span class="deal-price-old" style="text-decoration: line-through; color: var(--text-muted); font-size: 0.9rem; margin-left: 8px;">₹${oldPrice}</span>
                    </div>
                </div>
            </div>
            <div class="deal-timer" style="display: flex; gap: 10px; margin: 15px 0;">
                <div class="timer-unit" style="background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center; flex: 1;"><span id="timer-h" style="display: block; font-weight: 800;">04</span><small style="font-size: 0.6rem; text-transform: uppercase;">hrs</small></div>
                <div class="timer-unit" style="background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center; flex: 1;"><span id="timer-m" style="display: block; font-weight: 800;">12</span><small style="font-size: 0.6rem; text-transform: uppercase;">min</small></div>
                <div class="timer-unit" style="background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center; flex: 1;"><span id="timer-s" style="display: block; font-weight: 800;">45</span><small style="font-size: 0.6rem; text-transform: uppercase;">sec</small></div>
            </div>
            <button class="btn btn-primary deal-btn" onclick="addToCart(${product.id})" style="width: 100%; padding: 12px; border-radius: 12px; background: var(--primary); color: white; border: none; font-weight: 700; cursor: pointer;">Add to Basket</button>
        </div>
    `;
}

/**
 * Render Product Grid
 */
function renderGrocerlyGrid(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;"><p style="color:var(--text-muted)">No products found.</p></div>`;
        return;
    }

    products.forEach((product) => {
        const card = document.createElement('div');
        card.className = 'card show-on-scroll';
        const imageContent = product.image 
            ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<div style="font-size: 50px;">📦</div>`;

        card.innerHTML = `
            <div class="card-img" style="background: #f8fafc; height: 180px; display: flex; align-items: center; justify-content: center; overflow: hidden;">${imageContent}</div>
            <div class="card-body" style="padding: 15px;">
                <p style="font-size:0.7rem; text-transform:uppercase; font-weight:800; color:var(--primary); letter-spacing:1px; margin-bottom: 4px;">${product.category || 'Organic'}</p>
                <h3 style="margin:0 0 12px; font-size: 1.1rem; font-weight: 700;">${product.name}</h3>
                <div class="card-footer-row" style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="card-price" style="font-size: 1.3rem; font-weight: 800;">₹${parseFloat(product.price).toFixed(2)}</span>
                    <button class="btn-icon" onclick="addToCart(${product.id})" style="width:40px; height:40px; border-radius:10px; background:#f1f5f9; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i data-lucide="plus" style="width: 18px;"></i>
                    </button>
                </div>
            </div>`;
        grid.appendChild(card);
        scrollObserver.observe(card);
    });
    if (window.lucide) lucide.createIcons();
}

/**
 * Cart Logic
 */
window.addToCart = (id) => {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    const existing = cart.find(item => item.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    updateCartUI();
};

window.removeFromCart = (id) => { 
    cart = cart.filter(i => i.id !== id); 
    updateCartUI(); 
};

function updateCartUI() {
    const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
    
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');
    const subtotalEl = document.getElementById('cart-subtotal');

    if (countEl) countEl.innerText = totalCount;
    if (totalEl) totalEl.innerText = `₹${totalPrice.toFixed(2)}`;
    if (subtotalEl) subtotalEl.innerText = `₹${totalPrice.toFixed(2)}`;
    
    const list = document.getElementById('cart-items');
    if (!list) return;
    list.innerHTML = cart.length === 0 ? '<p style="text-align:center; padding: 20px; opacity:0.5;">Empty</p>' : '';
    
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '12px';
        div.style.marginBottom = '12px';
        div.innerHTML = `
            <div style="width:40px; height:40px; background:#f8fafc; border-radius:6px; overflow:hidden; padding:2px; display:flex; align-items:center; justify-content:center;">
                ${item.image ? `<img src="${item.image}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">` : '📦'}
            </div>
            <div style="flex:1">
                <p style="font-weight:700; font-size:0.8rem; margin:0;">${item.name}</p>
                <small style="color:var(--text-muted)">${item.quantity} x ₹${parseFloat(item.price).toFixed(2)}</small>
            </div>
            <button onclick="removeFromCart(${item.id})" style="border:none; background:none; color:#ef4444; cursor:pointer;">
                <i data-lucide="trash-2" style="width:14px;"></i>
            </button>`;
        list.appendChild(div);
    });
    if (window.lucide) lucide.createIcons();
}

/**
 * Utilities
 */
window.toggleCart = () => { 
    document.getElementById('cart-sidebar').classList.toggle('open'); 
    document.getElementById('cart-overlay').classList.toggle('active'); 
};

window.filterItems = (cat) => {
    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase() === cat.toLowerCase());
    });
    const filtered = cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat);
    renderGrocerlyGrid(filtered);
};

function initDealTimer() {
    let h=4, m=12, s=45;
    setInterval(() => {
        s--; if(s<0){s=59; m--;} if(m<0){m=59; h--;}
        const hE=document.getElementById('timer-h'), mE=document.getElementById('timer-m'), sE=document.getElementById('timer-s');
        if(hE){ 
            hE.innerText=String(h).padStart(2,'0'); 
            mE.innerText=String(m).padStart(2,'0'); 
            sE.innerText=String(s).padStart(2,'0'); 
        }
    }, 1000);
}

function initSearch() {
    const input = document.getElementById('grocery-search');
    const btn = document.getElementById('search-trigger');
    if(!input || !btn) return;
    
    const performSearch = () => {
        const query = input.value.toLowerCase().trim();
        renderGrocerlyGrid(allProducts.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.category && p.category.toLowerCase().includes(query))
        ));
    };

    btn.onclick = performSearch;
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
}

/**
 * Final Step: Checkout with JWT Authorization
 * Mapping to: POST /api/orders/ & POST /api/order-items/
 */
// Find your existing processCheckout function and replace it with this version
async function processCheckout() {
    // 1. Check if cart is empty
    if (cart.length === 0) {
        alert("Your basket is empty!");
        return;
    }

    // 2. Check for JWT Access Token
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert("Please login to place an order.");
        if (typeof window.openAuth === 'function') {
            window.openAuth('login');
        }
        return;
    }

    // UI Feedback: Show loader on the button
    const checkoutBtn = document.querySelector('.payment-section .btn-primary');
    const originalText = checkoutBtn.innerHTML;
    checkoutBtn.innerHTML = '<span class="loader"></span> Processing...';
    checkoutBtn.disabled = true;

    try {
        // Step A: Calculate total and Create the Order Shell
        const totalPrice = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        
        // Use your API_BASE variable if defined, otherwise default to local
        const baseUrl = typeof API_BASE !== 'undefined' ? API_BASE : 'http://127.0.0.1:8000/api';

        const orderResponse = await fetch(`${baseUrl}/orders/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                total_amount: totalPrice.toFixed(2),
                status: 'pending'
            })
        });

        if (!orderResponse.ok) throw new Error("Failed to create order.");
        const orderData = await orderResponse.json();
        const orderId = orderData.id;

        // Step B: Loop through cart and create OrderItems
        for (const item of cart) {
            const itemResponse = await fetch(`${baseUrl}/order-items/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    order: orderId,
                    product_id: item.id, // Maps to your Serializer field
                    quantity: item.quantity
                })
            });

            if (!itemResponse.ok) {
                const errorData = await itemResponse.json();
                throw new Error(errorData.detail || "Stock validation failed.");
            }
        }

        // --- STEP 3: SUCCESS & INSTANT RECEIPT DOWNLOAD ---
        alert("Order placed successfully! Your receipt will download now.");
        
        // This triggers your Django server-side PDF view
        window.location.href = `${baseUrl}/order/receipt/${orderId}/`;

        // Clear local state
        cart = []; 
        updateCartUI();
        if (typeof toggleCart === 'function') toggleCart();

    } catch (error) {
        console.error("Checkout Error:", error);
        alert(`Checkout Error: ${error.message}`);
    } finally {
        // Restore button state
        checkoutBtn.innerHTML = originalText;
        checkoutBtn.disabled = false;
    }
}
document.addEventListener('DOMContentLoaded', loadGrocerlyApp);