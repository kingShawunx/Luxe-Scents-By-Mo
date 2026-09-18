/* =========================================================
   LUXE SCENT BY MO
   FIREBASE INITIALIZATION
   =========================================================
   Real config for project: luxe-scent-by-mo
   This file contains ONLY the public Firebase Web App config
   (no service-account / private keys).
   ========================================================= */

window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCWnkCHAd0rfjffs5ivCq7Hy1aJHFP3vV4",
    authDomain: "luxe-scent-by-mo.firebaseapp.com",
    projectId: "luxe-scent-by-mo",
    storageBucket: "luxe-scent-by-mo.firebasestorage.app",
    messagingSenderId: "287067023407",
    appId: "1:287067023407:web:f797cbd05079bacc7f3eda",
    measurementId: "G-6VBHWXQ760"
};

/* Seller (admin) UID.
   Set this to the seller's real Firebase UID (from Firebase Console ->
   Authentication -> Users). The Firestore/security rules also reference
   this value (see firestore.rules). The seller should additionally carry
   the `seller: true` custom claim. */
window.SELLER_UID = "REPLACE_WITH_SELLER_FIREBASE_UID";

/* WhatsApp contact number (E.164) */
window.WHATSAPP_NUMBER = "2348127941749";

window.__firebaseInstance = null;
window.__firebaseAuth = null;
window.__firebaseDb = null;
window.__firebaseStorage = null;
window.__firebaseInitialized = false;

/* Initialize app, Auth, Firestore, Storage.
   Auth persistence is LOCAL so sessions survive page reloads. */
function initFirebase(callback) {
    if (window.__firebaseInitialized) {
        callback && callback();
        return;
    }

    if (typeof firebase === "undefined") {
        console.error("[LUXE SCENT] Firebase SDK not loaded. Include the Firebase compat scripts before firebase-config.js.");
        return;
    }

    firebase.initializeApp(window.FIREBASE_CONFIG);
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function (e) {
        console.warn("[LUXE SCENT] Could not set auth persistence:", e);
    });

    window.__firebaseInstance = firebase.app();
    window.__firebaseAuth = firebase.auth();
    window.__firebaseDb = firebase.firestore();
    try {
        window.__firebaseStorage = typeof firebase.storage === "function" ? firebase.storage() : null;
    } catch (e) {
        console.warn("[LUXE SCENT] Firebase Storage not available:", e);
        window.__firebaseStorage = null;
    }
    window.__firebaseInitialized = true;

    if (typeof callback === "function") callback();
}

/* Run a callback once Firebase services are available. */
function onFirebaseReady(callback) {
    if (window.__firebaseInitialized) {
        callback();
    } else {
        initFirebase(callback);
    }
}
