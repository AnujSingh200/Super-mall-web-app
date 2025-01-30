// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap';

import { 
  getFirestore, collection, addDoc, getDocs, doc,
  serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js";
import { auth, app } from "./auth.js";

const db = getFirestore(app);
const storage = getStorage(app);

// Initialize UI based on user role
auth.onAuthStateChanged(async user => {
  if (!user) return;
  
  try {
    const isAdmin = await checkAdmin(user.uid);
    if (isAdmin) {
      document.getElementById('adminProductSection').style.display = 'block';
      await Promise.all([loadShopsForSelect(), loadCategoriesForSelect()]);
    }
    await loadProducts();
    setupEventListeners();
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Failed to initialize page: " + error.message);
  }
});

// Product operations
async function loadProducts() {
  try {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '<div class="spinner-border text-primary" role="status"></div>';
    
    const snapshot = await getDocs(collection(db, "products"));
    productGrid.innerHTML = snapshot.docs.map(doc => {
      const product = doc.data();
      return `
        <div class="col">
          <div class="card h-100 product-card">
            <img src="${product.imageUrl || 'images/placeholder.png'}" 
                 class="card-img-top" 
                 alt="${product.name}"
                 loading="lazy">
            <div class="card-body">
              <h5 class="card-title">${product.name}</h5>
              <p class="card-text">${product.description?.substring(0, 50) || ''}...</p>
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="text-success">$${product.price.toFixed(2)}</h5>
                <button class="btn btn-primary" data-id="${doc.id}">View Details</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error("Failed to load products:", error);
    alert("Failed to load products: " + error.message);
  }
}

// Form handling
async function handleProductSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const imageFile = formData.get('productImage');
  
  try {
    const imageUrl = await uploadProductImage(imageFile);
    
    const productData = {
      name: formData.get('productName').trim(),
      description: formData.get('productDescription').trim(),
      price: parseFloat(formData.get('productPrice')),
      categoryId: formData.get('productCategory'),
      shopId: formData.get('productShop'),
      imageUrl: imageUrl,
      createdAt: serverTimestamp()
    };

    if (!validateProductForm(productData)) return;

    await addDoc(collection(db, "products"), productData);
    alert('Product added successfully!');
    e.target.reset();
    await loadProducts();
  } catch (error) {
    console.error("Product submission failed:", error);
    alert("Error adding product: " + error.message);
  }
}

// Validation
function validateProductForm(productData) {
  if (!productData.name || productData.name.length < 3) {
    alert("Product name must be at least 3 characters");
    return false;
  }
  if (isNaN(productData.price) || productData.price <= 0) {
    alert("Please enter a valid price");
    return false;
  }
  return true;
}

// Image upload
async function uploadProductImage(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) throw new Error('Invalid file type');

  try {
    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    throw new Error('Image upload failed: ' + error.message);
  }
}

// Data loading
async function loadShopsForSelect() {
  const select = document.getElementById('productShop');
  select.innerHTML = '<option value="">Select Shop</option>';
  
  const snapshot = await getDocs(collection(db, "shops"));
  snapshot.forEach(doc => {
    select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
  });
}

async function loadCategoriesForSelect() {
  const select = document.getElementById('productCategory');
  select.innerHTML = '<option value="">Select Category</option>';
  
  const snapshot = await getDocs(collection(db, "categories"));
  snapshot.forEach(doc => {
    select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
  });
}

// Product details
async function showProductDetails(productId) {
  try {
    const productSnap = await getDoc(doc(db, "products", productId));
    if (!productSnap.exists()) throw new Error('Product not found');

    const product = productSnap.data();
    const shopSnap = await getDoc(doc(db, "shops", product.shopId));

    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductDescription').textContent = product.description || '';
    document.getElementById('modalProductPrice').textContent = product.price.toFixed(2);
    document.getElementById('modalProductImage').src = product.imageUrl || '';
    document.getElementById('modalProductShop').textContent = shopSnap.data()?.name || 'Unknown Shop';

    new bootstrap.Modal(document.getElementById('productModal')).show();
  } catch (error) {
    console.error("Failed to load product details:", error);
    alert("Error loading product: " + error.message);
  }
}

// Admin check
async function checkAdmin(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() && userDoc.data().role === "admin";
  } catch (error) {
    throw new Error("Admin check failed: " + error.message);
  }
}

// Event listeners
function setupEventListeners() {
  document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
  document.getElementById('productGrid').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      showProductDetails(e.target.dataset.id);
    }
  });
}