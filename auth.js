/* =========================================================
   LUXE SCENT BY MO
   AUTHENTICATION SERVICE (auth.js)
   =========================================================
   Uses Firebase Authentication + Firestore users collection.
   No localStorage-based auth. No faked OTP codes.

   Email verification / password reset use Firebase's REAL email
   delivery (sendEmailVerification / sendPasswordResetEmail).

   Phone/SMS OTP uses Firebase Phone Auth (signInWithPhoneNumber,
   confirmation via the SMS code the user receives). A true email
   OTP flow would require a Firebase Cloud Function to generate and
   email a code - that is NOT implemented here; no code is faked.

   Prerequisites (see Firebase Console instructions):
   - Authentication -> Sign-in method -> Email/Password  (ENABLED)
   - Authentication -> Sign-in method -> Phone          (optional; SMS requires billing)
   - Firestore database created
   - "sender" custom claim or ALLOWLIST_SELLER_UID set for the seller
   ========================================================= */

(function (global) {
    "use strict";

    var auth = function () {
        return window.__firebaseAuth;
    };
    var db = function () {
        return window.__firebaseDb;
    };
    var firestore = function () {
        return window.firebase.firestore;
    };

    /* ---- public helpers ---- */
    function getCurrentUser() {
        return auth() ? auth().currentUser : null;
    }

    function onAuthStateChanged(callback) {
        if (!auth()) {
            setTimeout(function () { onAuthStateChanged(callback); }, 100);
            return;
        }
        return auth().onAuthStateChanged(callback);
    }

    /* Profile stored in Firestore: users/{uid} */
    function getUserProfile(uid) {
        uid = uid || (getCurrentUser() && getCurrentUser().uid);
        if (!uid) return Promise.reject(new Error("Not signed in"));
        return db().collection("users").doc(uid).get().then(function (snap) {
            return snap.exists ? snap.data() : null;
        }).catch(function () {
            return null;
        });
    }

    function updateUser(values) {
        var uid = (getCurrentUser() && getCurrentUser().uid);
        if (!uid) return Promise.reject(new Error("Not signed in"));
        var ref = db().collection("users").doc(uid);
        var update = {
            displayName: values.name || "",
            phone: values.phone || "",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return ref.set(update, { merge: true }).then(function () {
            if (values.photoURL) {
                return getCurrentUser().updateProfile({ photoURL: values.photoURL });
            }
            if (values.displayName !== undefined && getCurrentUser().displayName !== values.name) {
                return getCurrentUser().updateProfile({ displayName: values.name });
            }
        });
    }

    /* ---- EMAIL / PASSWORD ---- */
    function registerWithEmail(name, email, phone, password) {
        var a = auth();
        if (!a) return Promise.reject(new Error("Firebase not initialized"));
        return a.createUserWithEmailAndPassword(email, password).then(function (cred) {
            var user = cred.user;
            return user.updateProfile({ displayName: name, phoneNumber: phone })
                .then(function () {
                    // Store extra profile data in Firestore.
                    return db().collection("users").doc(user.uid).set({
                        uid: user.uid,
                        displayName: name,
                        email: user.email,
                        phone: phone,
                        role: "customer",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                })
                .then(function () {
                    // Send a REAL verification email (no faked OTP).
                    return user.sendEmailVerification({
                        url: window.location.origin + "/login.html",
                        handleCodeInApp: true
                    });
                })
                .then(function () {
                    return user;
                });
        });
    }

    function loginWithEmail(email, password) {
        var a = auth();
        if (!a) return Promise.reject(new Error("Firebase not initialized"));
        return a.signInWithEmailAndPassword(email, password).then(function (cred) {
            return refreshProfileCache(cred.user.uid).then(function () { return cred.user; });
        });
    }

    /* ---- GOOGLE SIGN-IN (real Firebase provider) ---- */
    function loginWithGoogle(redirectFallback) {
        var a = auth();
        if (!a) return Promise.reject(new Error("Firebase not initialized"));
        var provider = new firebase.auth.GoogleAuthProvider();
        return a.signInWithPopup(provider).then(function (result) {
            var user = result.user;
            return db().collection("users").doc(user.uid).get().then(function (snap) {
                if (!snap.exists) {
                    return db().collection("users").doc(user.uid).set({
                        uid: user.uid,
                        displayName: user.displayName || "",
                        email: user.email,
                        phone: user.phoneNumber || "",
                        role: "customer",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            }).then(function () {
                return refreshProfileCache(user.uid).then(function () { return user; });
            });
        });
    }

    function handleGoogleRedirect() {
        var a = auth();
        if (!a) return Promise.resolve(null);
        return a.getRedirectResult().then(function (result) {
            if (result && result.user) {
                return refreshProfileCache(result.user.uid).then(function () { return result.user; });
            }
            return null;
        });
    }

    function sendVerificationEmail() {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error("Not signed in"));
        return user.sendEmailVerification({
            url: window.location.origin + "/login.html",
            handleCodeInApp: true
        });
    }

    function isVerified() {
        var user = getCurrentUser();
        return !!(user && user.emailVerified);
    }

    /* ---- PASSWORD RECOVERY (real Firebase reset email) ---- */
    function sendPasswordReset(email) {
        var a = auth();
        if (!a) return Promise.reject(new Error("Firebase not initialized"));
        return a.sendPasswordResetEmail(email, {
            url: window.location.origin + "/login.html",
            handleCodeInApp: true
        });
    }

    function resetPassword(oobCode, newPassword) {
        var a = auth();
        if (!a) return Promise.reject(new Error("Firebase not initialized"));
        return a.confirmPasswordReset(oobCode, newPassword);
    }

    function changePassword(currentPassword, newPassword) {
        var user = getCurrentUser();
        if (!user) return Promise.reject(new Error("Not signed in"));
        var credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        return user.reauthenticateWithCredential(credential).then(function () {
            return user.updatePassword(newPassword);
        });
    }

    /* ---- PHONE / SMS OTP (real Firebase API, NOT faked) ----
       Requires: Authentication -> Phone provider enabled + billing.
       Renders an invisible reCAPTCHA, then the user submits the SMS code. */
    var _phoneConfirmation = null;
    var _phoneRecaptchaVerifier = null;

    function formatPhoneNumber(phone) {
        if (!phone) return phone;
        phone = String(phone).replace(/[\s\-().]/g, "");
        if (phone.startsWith("+")) return phone;
        if (phone.startsWith("234") && phone.length >= 13) return "+" + phone;
        if (phone.startsWith("0") && phone.length >= 10) return "+234" + phone.substring(1);
        return phone;
    }

    function startPhoneAuth(phoneNumber) {
        var a = auth();
        if (!a) return Promise.reject(new Error("Firebase not initialized"));

        phoneNumber = formatPhoneNumber(phoneNumber);

        if (!_phoneRecaptchaVerifier) {
            if (typeof document !== "undefined" && !document.getElementById("phone-recaptcha")) {
                return Promise.reject(new Error("reCAPTCHA container not found on page"));
            }
            _phoneRecaptchaVerifier = new firebase.auth.RecaptchaVerifier("phone-recaptcha", {
                size: "invisible",
                callback: function () {},
                'expired-callback': function () {}
            });
        }

        return a.signInWithPhoneNumber(phoneNumber, _phoneRecaptchaVerifier).then(function (confirmation) {
            _phoneConfirmation = confirmation;
            return confirmation;
        });
    }

    function resetPhoneAuth() {
        if (_phoneRecaptchaVerifier) {
            try { _phoneRecaptchaVerifier.clear(); } catch (e) {}
            _phoneRecaptchaVerifier = null;
        }
        _phoneConfirmation = null;
    }
    function verifyPhoneCode(smsCode, name, email) {
        if (!_phoneConfirmation) return Promise.reject(new Error("No phone verification in progress"));
        return _phoneConfirmation.confirm(smsCode).then(function (cred) {
            var user = cred.user;
            return user.updateProfile({ displayName: name, email: email, phoneNumber: user.phoneNumber })
                .then(function () {
                    return db().collection("users").doc(user.uid).set({
                        uid: user.uid,
                        displayName: name,
                        email: email,
                        phone: user.phoneNumber,
                        role: "customer",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                })
                .then(function () { return user; });
        });
    }

    /* ---- LOGOUT ---- */
    function logout() {
        var a = auth();
        if (!a) return Promise.reject(new Error("Firebase not initialized"));
        return a.signOut();
    }

    /* small in-memory cache of the profile */
    var _profileCache = null;
    function refreshProfileCache(uid) {
        return getUserProfile(uid).then(function (p) {
            _profileCache = p;
            return p;
        }).catch(function () {
            _profileCache = null;
            return null;
        });
    }
    function getCachedProfile() {
        return _profileCache;
    }

    /* ---- orders helper ---- */
    function getOrders(uid) {
        uid = uid || (getCurrentUser() && getCurrentUser().uid);
        if (!uid) return Promise.reject(new Error("Not signed in"));
        return db().collection("orders")
            .where("customerId", "==", uid)
            .orderBy("createdAt", "desc")
            .get()
            .then(function (snap) {
                return snap.docs.map(function (d) { return d.data(); });
            });
    }

    global.LuxeAuth = {
        getCurrentUser: getCurrentUser,
        onAuthStateChanged: onAuthStateChanged,
        getUserProfile: getUserProfile,
        getCachedProfile: getCachedProfile,
        updateUser: updateUser,
        registerWithEmail: registerWithEmail,
        loginWithEmail: loginWithEmail,
        loginWithGoogle: loginWithGoogle,
        handleGoogleRedirect: handleGoogleRedirect,
        sendVerificationEmail: sendVerificationEmail,
        isVerified: isVerified,
        sendPasswordReset: sendPasswordReset,
        resetPassword: resetPassword,
        changePassword: changePassword,
        startPhoneAuth: startPhoneAuth,
        verifyPhoneCode: verifyPhoneCode,
        resetPhoneAuth: resetPhoneAuth,
        logout: logout,
        getOrders: getOrders
    };
})(window);
