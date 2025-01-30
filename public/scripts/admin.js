// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap';
import { 
    getFirestore, collection, getDocs, doc, 
    deleteDoc, updateDoc, onSnapshot, query, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { auth, app } from "./auth.js";

const db = getFirestore(app);

// Initialize Admin Dashboard
auth.onAuthStateChanged(async user => {
    if (!user) window.location.href = 'index.html';
    
    const isAdmin = await checkAdminRole(user.uid);
    if (!isAdmin) window.location.href = 'dashboard.html';
    
    loadDashboardData();
});

async function checkAdminRole(uid) {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.data()?.role === "admin";
}

// Shop Management
async function loadDashboardData() {
    // Real-time shop updates
    const shopsQuery = collection(db, "shops");
    onSnapshot(shopsQuery, (snapshot) => {
        const shopsList = document.getElementById('shopsList');
        shopsList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const shop = doc.data();
            const row = `
                <tr>
                    <td>${shop.name}</td>
                    <td>${shop.category}</td>
                    <td>Floor ${shop.floor}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" 
                            data-id="${doc.id}" onclick="editShop('${doc.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" 
                            data-id="${doc.id}" onclick="deleteShop('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
            shopsList.innerHTML += row;
        });
    });

    loadSelectOptions('categories', 'shopCategory');
    loadSelectOptions('floors', 'shopFloor');
}

// Add new shop
document.getElementById('shopForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const shopData = {
        name: document.getElementById('shopName').value,
        category: document.getElementById('shopCategory').value,
        floor: document.getElementById('shopFloor').value,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "shops"), shopData);
        bootstrap.Modal.getInstance(document.getElementById('addShopModal')).hide();
    } catch (error) {
        console.error("Error adding shop:", error);
        alert("Failed to add shop!");
    }
});

// Utility Functions
async function loadSelectOptions(collectionId, elementId) {
    const select = document.getElementById(elementId);
    const snapshot = await getDocs(collection(db, collectionId));
    
    select.innerHTML = '<option value="">Select...</option>';
    snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().name;
        option.textContent = doc.data().name;
        select.appendChild(option);
    });
}

window.deleteShop = async (shopId) => {
    if (confirm('Are you sure you want to delete this shop?')) {
        await deleteDoc(doc(db, "shops", shopId));
    }
};

window.editShop = async (shopId) => {
    const docSnap = await getDoc(doc(db, "shops", shopId));
    if (docSnap.exists()) {
        const shop = docSnap.data();
        document.getElementById('shopName').value = shop.name;
        document.getElementById('shopCategory').value = shop.category;
        document.getElementById('shopFloor').value = shop.floor;
        new bootstrap.Modal(document.getElementById('addShopModal')).show();
    }
};