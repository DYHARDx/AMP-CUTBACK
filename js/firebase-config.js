
const firebaseConfig = {
  apiKey: "AIzaSyAsXGL3iqPGdzRKWlyU3jzrV5oC1OG7fr4",
  authDomain: "amp-mediaz.firebaseapp.com",
  projectId: "amp-mediaz",
  storageBucket: "amp-mediaz.firebasestorage.app",
  messagingSenderId: "117826156017",
  appId: "1:117826156017:web:cbbed13f3e79965c500050",
  measurementId: "G-KXVBRXSRS5"
};

// Initialize Firebase (using CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
