// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap';


// import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendPasswordResetEmail, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, serverTimestamp ,getDoc
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
export const auth = getAuth(app);
export const db = getFirestore(app);

// auth.js
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
  
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html'; // Redirect on success
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed: " + error.message); // Show error message
    }
  });

  document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        await handleSignup(email, password);
        alert('Account created successfully! You can now login.');
        // Switch to login tab (optional)
        document.querySelector('#authTabs a[href="#login"]').click();
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
});

// Auth Handlers
export async function handleSignup(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: email,
            role: 'user',
            createdAt: serverTimestamp()
        });
        return userCredential;
    } catch (error) {
        throw error;
    }
}

export async function handleLogin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function handlePasswordReset(email) {
    return sendPasswordResetEmail(auth, email);
}

// Auth State Listener
export function initAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const role = userDoc.data()?.role || 'user';
            window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
        }
    });
}

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

// Reset Password
window.resetPassword = async () => {
    const email = prompt('Please enter your email for password reset:');
    if (email) {
        try {
            await handlePasswordReset(email);
            alert('Password reset email sent. Check your inbox.');
        } catch (error) {
            alert('Error sending reset email: ' + error.message);
        }
    }
};

// Continue as Guest
window.continueAsGuest = () => {
    window.location.href = 'guest-dashboard.html'; // Update with your guest page
};