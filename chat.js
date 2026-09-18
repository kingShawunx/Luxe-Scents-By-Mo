/* =========================================================
   LUXE SCENT BY MO
   PRIVATE CHAT SERVICE (chat.js)
   =========================================================
   - Each customer has ONE private conversation with the seller
      (conversation doc id = "c_" + customerId).
   - Messages are stored in /conversations/{id}/messages/{msgId}.
   - Real-time listeners keep the UI in sync.
   - Customers can never read another customer's conversation
      (enforced client-side here AND in firestore.rules).
   ========================================================= */

(function (global) {
    "use strict";

    function db() { return window.__firebaseDb; }
    function sellerId() { return window.SELLER_UID && window.SELLER_UID.indexOf("REPLACE_") === -1 ? window.SELLER_UID : null; }
    function currentUid() {
        var u = window.__firebaseAuth && window.__firebaseAuth.currentUser;
        return u ? u.uid : null;
    }

    /* Deterministic conversation id -> ONE per customer */
    function conversationIdForCustomer(cid) { return "c_" + cid; }

    /* Create-or-get the customer's private conversation with the seller */
    function getOrCreateConversation() {
        var cid = currentUid();
        var sid = sellerId();
        if (!cid) return Promise.reject(new Error("Not signed in"));
        if (!sid) return Promise.reject(new Error("Seller UID is not configured"));

        var cidId = conversationIdForCustomer(cid);
        var convRef = db().collection("conversations").doc(cidId);

        return convRef.get().then(function (snap) {
            if (snap.exists) return snap.data();
            // Create it (rules require customerId == uid, sellerId == SELLER_UID)
            var now = firebase.firestore.FieldValue.serverTimestamp();
            var data = {
                id: cidId,
                customerId: cid,
                sellerId: sid,
                status: "open",
                createdAt: now,
                updatedAt: now,
                lastMessage: "",
                unreadBySeller: 0
            };
            return convRef.set(data, { merge: true }).then(function () { return data; });
        });
    }

    /* Real-time listener on a conversation's messages */
    function listenMessages(conversationId, onMessages) {
        return db()
            .collection("conversations").doc(conversationId)
            .collection("messages")
            .orderBy("createdAt")
            .onSnapshot(function (snap) {
                var msgs = snap.docs.map(function (d) {
                    var m = d.data();
                    m.id = d.id;
                    return m;
                });
                onMessages(msgs);
            });
    }

    /* Real-time listener on the customer's conversation doc */
    function listenConversation(conversationId, cb) {
        return db().collection("conversations").doc(conversationId)
            .onSnapshot(function (snap) { cb(snap.data()); });
    }

    /* Send a message as the current user */
    function sendMessage(conversationId, text, senderType) {
        var uid = currentUid();
        if (!uid) return Promise.reject(new Error("Not signed in"));
        if (!conversationId) return Promise.reject(new Error("No conversation"));
        if (!text || !String(text).trim()) return Promise.resolve();

        var convRef = db().collection("conversations").doc(conversationId);
        var now = firebase.firestore.FieldValue.serverTimestamp();

        var message = {
            conversationId: conversationId,
            senderId: uid,
            senderType: senderType || "customer",
            message: String(text).trim(),
            createdAt: now,
            read: false
        };

        return convRef.collection("messages").add(message).then(function () {
            return convRef.update({
                lastMessage: message.message,
                updatedAt: now,
                unreadBySeller: firebase.firestore.FieldValue.increment(1)
            });
        });
    }

    /* Seller: list all conversations (seller claim required in rules) */
    function listAllConversations() {
        return db().collection("conversations")
            .orderBy("updatedAt", "desc")
            .get()
            .then(function (snap) {
                return snap.docs.map(function (d) {
                    var c = d.data(); c.id = d.id; return c;
                });
            });
    }

    function markReadForCustomer(conversationId) {
        return db().collection("conversations").doc(conversationId)
            .update({ unreadBySeller: firebase.firestore.FieldValue.increment(-1) });
        // Note: unread accounting is minimal; a per-customer unread counter
        // can be added later. The essential privacy is handled by rules.
    }

    function markConversationRead(conversationId) {
        return db().collection("conversations").doc(conversationId)
            .update({ unreadBySeller: 0 });
    }

    global.Luxechat = global.Luxechat || {};
    global.Luxechat = {
        conversationIdForCustomer: conversationIdForCustomer,
        getOrCreateConversation: getOrCreateConversation,
        listenMessages: listenMessages,
        listenConversation: listenConversation,
        sendMessage: sendMessage,
        listAllConversations: listAllConversations,
        markReadForCustomer: markReadForCustomer,
        markConversationRead: markConversationRead,
        sellerId: sellerId,
        currentUid: currentUid
    };
})(window);
