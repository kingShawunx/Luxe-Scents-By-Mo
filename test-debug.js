const puppeteer = require('puppeteer');
const { server, PORT } = require('./test-server');

const BASE = `http://localhost:${PORT}`;

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const errors = [];
    const consoleMsgs = [];
    page.on('console', msg => {
        consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
        if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    // Mock firebase before scripts load
    await page.evaluateOnNewDocument(() => {
        window.__recaptchaCreators = 0;
        window.__recaptchaClears = 0;
        window.__signInCalls = [];

        document.addEventListener('DOMContentLoaded', function () {
            if (!document.getElementById('phone-recaptcha')) {
                var div = document.createElement('div');
                div.id = 'phone-recaptcha';
                document.body.appendChild(div);
            }
        });

        window.firebase = {
            initializeApp: function () { console.log('[MOCK] initializeApp called'); return {}; },
            app: function () { return {}; },
            firestore: function () {
                console.log('[MOCK] firestore() called');
                return {
                    FieldValue: { serverTimestamp: function () { return 'ts'; }, increment: function (n) { return n; } },
                    collection: function () { return { doc: function () { return { get: function () { return Promise.resolve({ exists: false }); }, set: function () { return Promise.resolve(); }, update: function () { return Promise.resolve(); } }; }; },
                    where: function () { return this; },
                    orderBy: function () { return this; },
                    get: function () { return Promise.resolve({ docs: [] }); },
                    onSnapshot: function () {}
                };
            }
        };

        window.firebase.auth = function () {
            console.log('[MOCK] firebase.auth() called');
            return {
                setPersistence: function () { console.log('[MOCK] setPersistence called'); return Promise.resolve(); },
                signInWithPhoneNumber: function (phone, verifier) {
                    console.log('[MOCK] signInWithPhoneNumber called with:', phone, 'verifier:', !!verifier);
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
                onAuthStateChanged: function (cb) { console.log('[MOCK] onAuthStateChanged called'); cb(null); },
                currentUser: null
            };
        };
        window.firebase.auth.Auth = { Persistence: { LOCAL: 'local' } };
        window.firebase.auth.RecaptchaVerifier = function (containerId, options) {
            console.log('[MOCK] RecaptchaVerifier created for:', containerId);
            window.__recaptchaCreators++;
            this.clear = function () { window.__recaptchaClears++; };
        };
        window.firebase.auth.PhoneAuthProvider = { PROOF_PROVIDER: 'default' };
        // NO firebase.storage() — simulates real environment
    });

    await page.goto(BASE + '/register.html', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('=== Console messages during page load ===');
    consoleMsgs.filter(m => m.includes('[MOCK]') || m.includes('[LUXE') || m.includes('error')).forEach(m => console.log(m));

    console.log('\n=== State after load ===');
    const state = await page.evaluate(() => ({
        firebaseDefined: typeof firebase !== 'undefined',
        firebaseAuthType: typeof firebase.auth,
        firebaseAuthAuthType: typeof (firebase.auth && firebase.auth.Auth),
        recaptchaVerifierType: typeof (firebase.auth && firebase.auth.RecaptchaVerifier),
        initialized: window.__firebaseInitialized,
        authService: !!window.__firebaseAuth,
        authServiceHasSignIn: !!(window.__firebaseAuth && window.__firebaseAuth.signInWithPhoneNumber),
        luxeAuthDefined: typeof LuxeAuth !== 'undefined',
        startPhoneAuthType: typeof (window.LuxeAuth && LuxeAuth.startPhoneAuth)
    }));
    console.log(JSON.stringify(state, null, 2));

    console.log('\n=== Calling startPhoneAuth ===');
    const callResult = await page.evaluate(() => {
        try {
            const result = LuxeAuth.startPhoneAuth('09071420246');
            console.log('[TEST] startPhoneAuth returned a promise:', result instanceof Promise);
            result.then(r => console.log('[TEST] resolved:', JSON.stringify(r)))
                .catch(e => console.log('[TEST] rejected:', e.message));
            return 'called';
        } catch (e) {
            return 'ERROR: ' + e.message;
        }
    });
    console.log('Call result:', callResult);

    await new Promise(r => setTimeout(r, 1000));

    console.log('\n=== State after startPhoneAuth ===');
    const afterState = await page.evaluate(() => ({
        recaptchaCreators: window.__recaptchaCreators,
        signInCalls: window.__signInCalls,
        lastError: window.__lastPhoneError || null
    }));
    console.log(JSON.stringify(afterState, null, 2));

    console.log('\n=== All console messages ===');
    consoleMsgs.forEach(m => console.log(m));

    browser.close();
    server.close();
    process.exit(0);
})();
