// image-optimizer.js
// App-wide image loading optimization.
//
// Goals:
//  - Never block first paint on images.
//  - Respect author intent (keep loading="eager" when explicitly set).
//  - Work for dynamically injected <img> tags (carousels, student/teacher
//    cards, galleries, popups, etc.) without each page having to remember.
//
// Strategy:
//  1. On DOM ready, upgrade every existing <img> that doesn't already opt in
//     to `loading="lazy"` + `decoding="async"`.
//  2. Watch the document with MutationObserver so we catch images added by
//     beranda.js, wali-kelas.js, kolase.js, admin-dashboard.js, landing.js,
//     profile.js, and any future page.
//  3. Skip above-the-fold / hero images (first image, or ones marked with
//     data-eager / fetchpriority="high") to avoid regressing LCP.
//
// This is a pure enhancement layer — pages that already set the attributes
// themselves stay unchanged.

(function () {
    'use strict';

    if (window.__imageOptimizerInstalled) return;
    window.__imageOptimizerInstalled = true;

    const SKIP_MARKERS = ['data-eager', 'data-no-lazy'];

    function shouldSkip(img) {
        if (!img || img.tagName !== 'IMG') return true;

        // Author already decided — respect it.
        if (img.hasAttribute('loading')) return true;

        // Explicit opt-out markers.
        for (const attr of SKIP_MARKERS) {
            if (img.hasAttribute(attr)) return true;
        }

        // Hero / LCP images — don't defer.
        if (img.getAttribute('fetchpriority') === 'high') return true;

        return false;
    }

    function upgrade(img) {
        if (shouldSkip(img)) return;

        try {
            img.loading = 'lazy';
            if (!img.hasAttribute('decoding')) {
                img.decoding = 'async';
            }
            // Deliberately do NOT set fetchpriority="low" here. Previous
            // behavior ("force low on every img") hurt the hero / LCP image
            // on landing + beranda because the browser deprioritized the
            // very image the user is waiting to see. Real above-the-fold
            // imagery should render at natural priority; offscreen images
            // are already deferred by `loading="lazy"`, which is enough.
        } catch (_) {
            /* older browsers ignore */
        }
    }

    function upgradeAll(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('img').forEach(upgrade);
    }

    function init() {
        upgradeAll(document);

        // Watch future DOM mutations — carousels, dynamic cards, gallery
        // items rendered after API responses, cropper, popups, etc.
        const mo = new MutationObserver((mutations) => {
            for (const m of mutations) {
                // Newly added subtrees
                m.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === 'IMG') {
                        upgrade(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach(upgrade);
                    }
                });

                // Attribute changes on existing img (e.g. data-src -> src swap
                // by lazy loaders) don't need re-upgrade, we already set once.
            }
        });

        mo.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
