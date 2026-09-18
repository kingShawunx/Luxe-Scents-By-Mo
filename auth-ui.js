/* =========================================================
   LUXE SCENT BY MO
   AUTH UI HELPERS (auth-ui.js)
   =========================================================
   Shared helpers for login/register/forgot/account/chat pages.
   Depends on: firebase SDK (compat), firebase-config.js, auth.js
   ========================================================= */

(function (global) {
    "use strict";

    /* Initialize Firebase if needed, then wait for auth state. */
    function initAuth(callback) {
        if (typeof onFirebaseReady !== "function") {
            setTimeout(function () { initAuth(callback); }, 100);
            return;
        }
        onFirebaseReady(function () {
            firebase.auth().onAuthStateChanged(function (user) {
                if (!user) {
                    callback(null);
                    return;
                }
                // Refresh so emailVerified reflects the latest server state
                // (avoid stale "not verified" redirects after a user verifies).
                user.reload().then(function () {
                    callback(user);
                }).catch(function () {
                    callback(user);
                });
            });
        });
    }

    /* Redirect to a page. */
    function redirect(path) {
        window.location.href = path;
    }

    /* Show an inline message on a form. */
    function showMessage(form, text, type) {
        var existing = form.parentNode.querySelector(".auth-error, .auth-success");
        if (existing) existing.remove();
        var el = document.createElement("div");
        el.className = type === "error" ? "auth-error" : "auth-success";
        el.textContent = text;
        form.parentNode.insertBefore(el, form);
    }

    /* Require verified+sign-in -> redirect to account if logged in. */
    function requireLoggedIn() {
        initAuth(function (user) {
            if (user && user.emailVerified) {
                redirect("account.html");
            }
        });
    }

    /* Require sign-out -> redirect to login if already verified+in. */
    function requireLoggedOut() {
        initAuth(function (user) {
            if (user && user.emailVerified) {
                redirect("account.html");
            }
        });
    }

    global.AuthUI = {
        initAuth: initAuth,
        redirect: redirect,
        showMessage: showMessage,
        requireLoggedIn: requireLoggedIn,
        requireLoggedOut: requireLoggedOut
    };
})(window);
