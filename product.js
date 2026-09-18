/* =========================================================
   LUXE SCENT BY MO
   PRODUCT DATA (product.js)
   ========================================================= */

(function (global) {
    "use strict";

    var PRODUCTS = {
        "oud-marjan": {
            id: "oud-marjan",
            name: "Oud Marjan",
            price: 3500,
            image: "images/Half Part 10.jpeg",
            desc: "A warm, resinous blend of Arabian oud and amber.",
            notes: "Top: Saffron, Rose | Heart: Oud, Amber | Base: Sandalwood, Woody Musk",
            size: "10ml",
            category: "Oud"
        },
        "musk-pheromone": {
            id: "musk-pheromone",
            name: "Musk Pheromone",
            price: 2500,
            image: "images/Half Part 11.avif",
            desc: "An intoxicating mix of white musk and exotic florals.",
            notes: "Top: Bergamot, Jasmine | Heart: White Musk, Tuberose | Base: Amber, Vanilla",
            size: "10ml",
            category: "Musk"
        },
        "amber-wood": {
            id: "amber-wood",
            "name": "Amber Wood",
            price: 3000,
            image: "images/Half Part 12.jpeg",
            desc: "Woody amber with hints of vanilla and sandalwood.",
            notes: "Top: Cardamom, Pink Pepper | Heart: Amber, Sandalwood | Base: Vanilla, Tonka",
            size: "10ml",
            category: "Amber"
        },
        "vanilla-dream": {
            id: "vanilla-dream",
            name: "Vanilla Dream",
            price: 2000,
            image: "images/Half Part 13.jpeg",
            desc: "A sweet, creamy trail of vanilla orchid and tonka bean.",
            notes: "Top: Bergamot, Pear | Heart: Vanilla Orchid, Tonka Bean | Base: Sandalwood, Creamy Musk",
            size: "10ml",
            category: "Vanilla"
        },
        "rose-noir": {
            id: "rose-noir",
            name: "Rose Noir",
            price: 2800,
            image: "images/Half Part 7.jpeg",
            desc: "A dark, velvety rose accented with blackcurrant.",
            notes: "Top: Blackcurrant, Citrus | Heart: Bulgarian Rose, Jasmine | Base: Patchouli, Leather",
            size: "10ml",
            category: "Floral"
        },
        "jasmine-oud": {
            id: "jasmine-oud",
            name: "Jasmine Oud",
            price: 3200,
            image: "images/Half Part 8.jpeg",
            desc: "Night-blooming jasmine woven through smoky oud wood.",
            notes: "Top: Saffron, Cardamom | Heart: Jasmine, Rose | Base: Oud, Leather, Amber",
            size: "10ml",
            category: "Oud"
        }
    };

    function formatPrice(value) {
        var num = Number(value) || 0;
        return "₦" + num.toLocaleString("en-NG");
    }

    function getProduct(id) {
        return PRODUCTS[id] || null;
    }

    function getAllProducts() {
        return Object.keys(PRODUCTS).map(function (k) { return PRODUCTS[k]; });
    }

    global.LuxeProducts = {
        PRODUCTS: PRODUCTS,
        getProduct: getProduct,
        getAllProducts: getAllProducts,
        formatPrice: formatPrice
    };
})(typeof window !== "undefined" ? window : globalThis);
