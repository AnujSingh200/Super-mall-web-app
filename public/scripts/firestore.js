// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap';

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, setDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBfMmjqS2cxK3oXiYEHlaOcGcX39A6eaOs",
    authDomain: "super-mall-fa7bd.firebaseapp.com",
    projectId: "super-mall-fa7bd",
    storageBucket: "super-mall-fa7bd.appspot.com",
    messagingSenderId: "1068556499670",
    appId: "1:1068556499670:web:8db25a0943db03318d2777",
    measurementId: "G-HS6XRJZK2C"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// User Management
export async function addUserToFirestore(uid, email) {
    try {
        await setDoc(doc(db, "users", uid), {
            email: email,
            role: "user",
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding user:", error);
        throw error;
    }
}

// Shop Operations
export async function getShops() {
    const snapshot = await getDocs(collection(db, "shops"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addShop(shopData) {
    try {
        const docRef = await addDoc(collection(db, "shops"), {
            ...shopData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding shop:", error);
        throw error;
    }
}