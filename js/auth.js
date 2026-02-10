
import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DEFAULT_ADMIN = {
    email: "dyhardeveloper@gmail.com",
    password: "113114",
    role: "admin"
};

// Load Branding for Login
const loadBranding = async () => {
    try {
        const brandingDoc = await getDoc(doc(db, 'settings', 'branding'));
        if (brandingDoc.exists()) {
            const data = brandingDoc.data();
            const loginLogo = document.getElementById('login-logo');
            if (loginLogo && data.logoUrl) loginLogo.src = data.logoUrl;
        }
    } catch (e) {
        console.error("Logo load error:", e);
    }
};
loadBranding();


// Bootstrap Admin automatically
async function bootstrapAdmin() {
    try {
        // Check if admin doc exists in Firestore
        const adminDoc = await getDoc(doc(db, 'users', DEFAULT_ADMIN.email));
        if (!adminDoc.exists()) {
            console.log("Bootstrapping admin account...");

            // Try to create the Auth user
            // Note: If user already exists in Auth but not Firestore, this will fail
            // We handle that in the catch block
            try {
                await createUserWithEmailAndPassword(auth, DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
            } catch (authError) {
                if (authError.code !== 'auth/email-already-in-use') {
                    throw authError;
                }
            }

            // Create/Update Firestore document
            await setDoc(doc(db, 'users', DEFAULT_ADMIN.email), {
                email: DEFAULT_ADMIN.email,
                role: 'admin',
                active: true,
                createdAt: serverTimestamp()
            });
            console.log("Admin account created successfully.");
        }
    } catch (error) {
        console.error("Bootstrap error:", error);
    }
}

// Perform bootstrap on load
bootstrapAdmin();

const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        errorMsg.style.display = 'none';

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user role from Firestore
            const userDoc = await getDoc(doc(db, 'users', email));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (!userData.active) {
                    await auth.signOut();
                    throw new Error("Your account is deactivated.");
                }

                // Log Login Activity
                try {
                    let ip = 'Unknown';
                    try {
                        const ipRes = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipRes.json();
                        ip = ipData.ip;
                    } catch (e) { }

                    await addDoc(collection(db, 'activity'), {
                        type: 'login',
                        email: email,
                        userName: userData.name || email,
                        ip: ip,
                        timestamp: serverTimestamp()
                    });
                } catch (e) { console.error("Activity log error:", e); }

                // Redirect based on role
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // If doc doesn't exist, check if it's the admin bootstrap case
                if (email === DEFAULT_ADMIN.email) {
                    await setDoc(doc(db, 'users', email), {
                        email: email,
                        role: 'admin',
                        active: true,
                        createdAt: serverTimestamp()
                    });
                    window.location.href = 'admin.html';
                } else {
                    throw new Error("User record not found in database.");
                }
            }
        } catch (error) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
        }
    });
}

// Auth check for protected pages
export function checkAuth(requiredRole) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.email));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (requiredRole && userData.role !== requiredRole) {
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    });
}
