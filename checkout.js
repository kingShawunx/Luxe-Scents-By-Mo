(function () {
    var CART_KEY = "luxeScentCart";
    var DELIVERY_FEE = 1500;
    var FREE_THRESHOLD = 10000;

    function getCart() {
        var raw = localStorage.getItem(CART_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    function formatPrice(value) {
        var num = Number(value) || 0;
        return "₦" + num.toLocaleString("en-NG");
    }

    function renderOrder() {
        var cart = getCart();
        var list = document.getElementById("order-items");
        if (!list) return;

        if (cart.length === 0) {
            list.innerHTML =
                '<p class="empty">No items in your cart yet. ' +
                '<a href="shop.html">Shop perfumes</a>.</p>';
        } else {
            var html = "";
            for (var i = 0; i < cart.length; i++) {
                var item = cart[i];
                var line = item.price * item.qty;
                html +=
                    '<div class="order-item" data-id="' + item.id + '">' +
                    '<span class="item-name">' + item.name + '</span>' +
                    '<input type="number" min="1" class="item-qty" value="' + item.qty + '" aria-label="Quantity">' +
                    '<span class="item-price">' + formatPrice(item.price) + '</span>' +
                    '<span class="item-total">' + formatPrice(line) + '</span>' +
                    "</div>";
            }
            list.innerHTML = html;
        }

        computeTotals();
    }

    function computeTotals() {
        var cart = getCart();
        var subtotal = 0;
        for (var i = 0; i < cart.length; i++) {
            subtotal += cart[i].price * cart[i].qty;
        }

        var delivery = subtotal >= FREE_THRESHOLD ? 0 : DELIVERY_FEE;
        var total = subtotal + delivery;

        setText("#subtotal", formatPrice(subtotal));
        setText("#delivery-fee", delivery === 0 ? "FREE" : formatPrice(delivery));
        setText("#total-amount", formatPrice(total));
    }

    function setText(selector, text) {
        var el = document.querySelector(selector);
        if (el) el.textContent = text;
    }

    function updateQuantity(input) {
        var row = input.closest(".order-item");
        if (!row) return;
        var id = row.getAttribute("data-id");
        var qty = parseInt(input.value, 10);
        if (isNaN(qty) || qty < 1) {
            qty = 1;
            input.value = 1;
        }

        var cart = getCart();
        var unit = 0;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === id) {
                cart[i].qty = qty;
                unit = cart[i].price;
                break;
            }
        }
        saveCart(cart);

        var totalEl = row.querySelector(".item-total");
        if (totalEl) totalEl.textContent = formatPrice(unit * qty);

        computeTotals();
    }

    function initQty() {
        var inputs = document.querySelectorAll(".item-qty");
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener("change", function () {
                updateQuantity(this);
            });
            inputs[i].addEventListener("input", function () {
                updateQuantity(this);
            });
        }
    }

    function validateForm() {
        var form = document.getElementById("checkout-form");
        var fields = ["customer-name", "phone", "whatsapp", "address", "state", "city"];
        var payment = form.querySelector('input[name="payment"]:checked');

        for (var i = 0; i < fields.length; i++) {
            var el = form.querySelector("#" + fields[i] + ", [name=" + fields[i] + "]");
            if (!el || !el.value.trim()) {
                var label = el ? el.previousElementSibling : null;
                alert(
                    "Please fill in: " +
                    (label ? label.textContent.replace("*", "").trim() : fields[i])
                );
                if (el) el.focus();
                return false;
            }
        }

        if (!payment) {
            alert("Please select a payment method.");
            return false;
        }
        return true;
    }

    function initForm() {
        var form = document.getElementById("checkout-form");
        if (!form) return;

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!validateForm()) return;

            var cart = getCart();
            var itemsText = cart
                .map(function (item) {
                    return item.name + " (x" + item.qty + ")";
                })
                .join(", ");

            var summary =
                "Thank you for your order!\n\n" +
                "Items: " + itemsText + "\n" +
                "Total: " +
                document.getElementById("total-amount").textContent +
                "\nPayment: " +
                (form.querySelector('input[name="payment"]:checked').value) +
                "\n\nWe will contact you on WhatsApp to confirm delivery.";

            alert(summary);

            form.reset();
            var radios = form.querySelectorAll('input[name="payment"]');
            for (var i = 0; i < radios.length; i++) radios[i].checked = false;
            saveCart([]);
            renderOrder();
        });
    }

    function init() {
        renderOrder();
        initQty();
        initForm();
    }

    if (document.readyState !== "loading") {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }
})();
