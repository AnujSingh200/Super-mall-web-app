// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap';

import { getFirestore, collection, getDocs, doc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { auth, db } from "./auth.js";
import { showError, showLoading, hideLoading } from "./ui.js";

let selectedProducts = new Set();
let unsubscribeProducts = null;

// Initialize Dashboard
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        showLoading();
        await setupFilters();
        setupRealTimeUpdates();
        setupEventListeners();
    } catch (error) {
        showError("Failed to initialize dashboard: " + error.message);
    } finally {
        hideLoading();
    }
}

async function setupFilters() {
    try {
        await Promise.all([
            populateFilter('categories', 'categoryFilter'),
            populateFilter('floors', 'floorFilter'),
            populateFilter('shops', 'shopFilter')
        ]);
    } catch (error) {
        throw new Error("Filter setup failed: " + error.message);
    }
}

function setupRealTimeUpdates() {
    unsubscribeProducts = onSnapshot(collection(db, "products"), 
        (snapshot) => displayProducts(snapshot.docs),
        (error) => showError("Real-time update error: " + error.message)
    );
}

function setupEventListeners() {
    // Filter Events
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('floorFilter').addEventListener('change', applyFilters);
    document.getElementById('shopFilter').addEventListener('change', applyFilters);
    // dashboard.js
    document.getElementById('compareBtn').addEventListener('click', showCompareSection);
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    // Comparison
    document.getElementById('compareCanvas').addEventListener('hidden.bs.offcanvas', () => {
        selectedProducts.clear();
        updateCompareBadge();
    });
}

async function applyFilters() {
    try {
        showLoading();
        const filters = getCurrentFilters();
        const queryConstraints = buildQueryConstraints(filters);
        
        const q = queryConstraints.length > 0 
            ? query(collection(db, "products"), ...queryConstraints)
            : collection(db, "products");

        const snapshot = await getDocs(q);
        displayProducts(snapshot.docs);
    } catch (error) {
        showError("Filter application failed: " + error.message);
    } finally {
        hideLoading();
    }
}

function getCurrentFilters() {
    return {
        search: document.getElementById('searchInput').value.toLowerCase().trim(),
        category: document.getElementById('categoryFilter').value,
        floor: document.getElementById('floorFilter').value,
        shop: document.getElementById('shopFilter').value
    };
}

function buildQueryConstraints(filters) {
    const constraints = [];
    if (filters.category) constraints.push(where("category", "==", filters.category));
    if (filters.floor) constraints.push(where("floor", "==", filters.floor));
    if (filters.shop) constraints.push(where("shopId", "==", filters.shop));
    return constraints;
}

function displayProducts(products) {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '';

    products.forEach(productDoc => {
        const product = productDoc.data();
        if (!product.name || !product.price) return; // Skip invalid entries
        
        productGrid.innerHTML += `
            <div class="col">
                <div class="card h-100 product-card" 
                    data-id="${productDoc.id}"
                    data-category="${product.category}"
                    data-floor="${product.floor}"
                    data-shop="${product.shopId}">
                    
                    <img src="${product.imageUrl || 'images/placeholder.png'}" 
                         class="card-img-top product-image lazyload" 
                         alt="${product.name}"
                         loading="lazy">
                         
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.category}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="text-success">$${product.price.toFixed(2)}</h5>
                            <div class="form-check">
                                <input class="form-check-input compare-checkbox" 
                                    type="checkbox" 
                                    data-id="${productDoc.id}"
                                    ${selectedProducts.has(productDoc.id) ? 'checked' : ''}>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    addProductInteractions();
}

function addProductInteractions() {
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('compare-checkbox')) {
                showProductDetails(card.dataset.id);
            }
        });
    });

    document.querySelectorAll('.compare-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const productId = e.target.dataset.id;
            selectedProducts[e.target.checked ? 'add' : 'delete'](productId);
            updateCompareBadge();
        });
    });
}

async function showProductDetails(productId) {
    try {
        showLoading();
        const productDoc = await getDoc(doc(db, "products", productId));
        
        if (!productDoc.exists()) {
            showError("Product not found!");
            return;
        }

        const product = productDoc.data();
        const shopDoc = await getDoc(doc(db, "shops", product.shopId));
        
        document.getElementById('productDetailsContent').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <img src="${product.imageUrl}" 
                         class="img-fluid rounded mb-3" 
                         alt="${product.name}">
                </div>
                <div class="col-md-6">
                    <h3>${product.name}</h3>
                    <p class="text-muted">${product.category}</p>
                    <p>${product.description || 'No description available'}</p>
                    <h4 class="text-success">$${product.price.toFixed(2)}</h4>
                    <p class="text-muted">Sold by: ${shopDoc.data()?.name || 'Unknown Shop'}</p>
                    <button class="btn btn-primary" onclick="addToCart('${productId}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;

        new bootstrap.Modal('#productModal').show();
    } catch (error) {
        showError("Failed to load product details: " + error.message);
    } finally {
        hideLoading();
    }
}

async function populateFilter(collectionName, elementId) {
    try {
        const select = document.getElementById(elementId);
        select.innerHTML = '<option value="">All</option>';
        
        const snapshot = await getDocs(collection(db, collectionName));
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            select.appendChild(option);
        });
    } catch (error) {
        showError(`Failed to load ${collectionName}: ` + error.message);
    }
}

function updateCompareBadge() {
    const badge = document.getElementById('compareBadge');
    badge.textContent = selectedProducts.size;
    badge.classList.toggle('d-none', selectedProducts.size === 0);
}

window.showCompareSection = async () => {
    try {
        showLoading();
        const compareContent = document.getElementById('compareProducts');
        compareContent.innerHTML = '';
        
        const products = await Promise.all(
            Array.from(selectedProducts).map(id => getDoc(doc(db, "products", id)))
        );

        compareContent.innerHTML = products.map(doc => {
            const product = doc.data();
            return `
                <div class="compare-product border-bottom pb-3 mb-3">
                    <h5>${product.name}</h5>
                    <p class="text-success">$${product.price.toFixed(2)}</p>
                    <p class="text-muted">Category: ${product.category}</p>
                    <p class="text-muted">Shop: ${product.shopId}</p>
                </div>
            `;
        }).join('') || '<p class="text-muted">No products selected for comparison</p>';

        new bootstrap.Offcanvas('#compareCanvas').show();
    } catch (error) {
        showError("Comparison failed: " + error.message);
    } finally {
        hideLoading();
    }
};

window.resetFilters = () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('floorFilter').value = '';
    document.getElementById('shopFilter').value = '';
    applyFilters();
};

// Utility Functions
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}


// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeProducts) unsubscribeProducts();
});