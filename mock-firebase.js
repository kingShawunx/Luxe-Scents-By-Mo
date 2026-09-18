// Mock Firebase SDK for testing phone auth lifecycle
// This simulates a Firebase environment WITHOUT the storage module

window.__recaptchaCreators = 0;
window.__recaptchaClears = 0;
window.__signInCalls = [];
window.__firebaseInitCalled = false;

// Ensure reCAPTCHA container exists
var _ensureRecaptchaContainer = function () {
    if (!document.getElementById('phone-recaptcha')) {
        var div = document.createElement('div');
        div.id = 'phone-recaptcha';
        document.body.appendChild(div);
    }
};

// Run on load and also on DOMContentLoaded
if (document.readyState !== 'loading') {
    _ensureRecaptchaContainer();
} else {
    document.addEventListener('DOMContentLoaded', _ensureRecaptchaContainer);
}

window.firebase = {
    initializeApp: function () { window.__firebaseInitCalled = true; return {}; },
    app: function () { return {}; },
    firestore: function () {
        return {
            FieldValue: {
                serverTimestamp: function () { return 'ts'; },
                increment: function (n) { return n; }
            },
            collection: function () {
                return {
                    doc: function () {
                        return {
                            get: function () { return Promise.resolve({ exists: false }); },
                            set: function () { return Promise.resolve(); },
                            update: function () { return Promise.resolve(); }
                        };
                    }
                };
            },
            where: function () { return this; },
            orderBy: function () { return this; },
            get: function () { return Promise.resolve({ docs: [] }); },
            onSnapshot: function () {}
        };
    }
};

// firebase.auth is a function that returns auth service
window.firebase.auth = function () {
    return {
        setPersistence: function () { return Promise.resolve(); },
        signInWithPhoneNumber: function (phone, verifier) {
            window.__signInCalls.push({ phone: phone });
            return Promise.resolve({
                confirm: function () {
                    return Promise.resolve({
                        user: {
                            uid: 'test123',
                            phoneNumber: phone,
                            updateProfile: function () { return Promise.resolve(); }
                        }
                    });
                }
            });
        },
        onAuthStateChanged: function (cb) { cb(null); },
        currentUser: null
    };
};
window.firebase.auth.Auth = { Persistence: { LOCAL: 'local' } };
window.firebase.auth.RecaptchaVerifier = function (containerId, options) {
    window.__recaptchaCreators++;
    this.containerId = containerId;
    this.options = options;
    this.clear = function () { window.__recaptchaClears++; };
};
window.firebase.auth.PhoneAuthProvider = { PROOF_PROVIDER: 'default' };
// Deliberately do NOT define firebase.storage()
