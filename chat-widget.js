/* =========================================================
   LUXE SCENT BY MO
   CHAT FLOATING BUTTON (chat-widget.js)
   =========================================================
   Pure DOM (no Firebase dependency) so it is lightweight on every
   front-end page. Adds a "Chat With Us" floating button that opens
   chat.html, where the private conversation is created/managed.
   ========================================================= */

(function () {
    "use strict";

    function createChatButton() {
        if (document.getElementById("chat-float")) return;

        var a = document.createElement("a");
        a.id = "chat-float";
        a.href = "chat.html";
        a.className = "chat-float";
        a.setAttribute("aria-label", "Chat with us");
        a.textContent = "Chat With Us";
        document.body.appendChild(a);
    }

    if (document.readyState !== "loading") {
        createChatButton();
    } else {
        document.addEventListener("DOMContentLoaded", createChatButton);
    }
})();
