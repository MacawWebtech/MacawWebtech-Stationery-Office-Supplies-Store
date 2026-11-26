/* Shared navigation, search, sticky header, persistent cart, back-to-top and countdown. */
(() => {
  'use strict';

  const currentPage = document.body?.dataset.active || '';
  const navigationLinks = document.querySelectorAll('[data-nav]');

  navigationLinks.forEach((link) => {
    if (!(link instanceof HTMLElement)) return;
    const isCurrent = Boolean(currentPage) && link.dataset.nav === currentPage;
    link.classList.toggle('active', isCurrent);
    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const menuButton = document.getElementById('menuToggle');
  const primaryNavigation = document.getElementById('primaryNav');
  if (menuButton && primaryNavigation) {
    menuButton.addEventListener('click', () => {
      const isOpen = primaryNavigation.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      menuButton.innerHTML = `<img src="assets/icons/svg/${isOpen ? 'close' : 'menu'}.svg" alt="" aria-hidden="true">`;
    });
  }


  // Home dropdown: tap the caret on touch/tablet, close on outside click or Escape.
  const homeItem = document.querySelector('.nav-item.has-dropdown');
  if (homeItem) {
    const caret = homeItem.querySelector('.nav-caret');
    const setOpen = (open) => {
      homeItem.classList.toggle('is-open', open);
      if (caret) caret.setAttribute('aria-expanded', String(open));
    };
    if (caret) caret.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!homeItem.classList.contains('is-open'));
    });
    document.addEventListener('click', (event) => {
      if (!homeItem.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    homeItem.querySelectorAll('[data-home-link]').forEach((link) => {
      const target = (link.getAttribute('href') || '').toLowerCase();
      const current = target === here || (here === '' && target === 'index.html');
      link.classList.toggle('is-current', current);
      if (current) link.setAttribute('aria-current', 'page');
    });
  }

  const searchButton = document.getElementById('searchToggle');
  const searchPanel = document.getElementById('headerSearch');
  const searchInput = document.getElementById('headerSearchInput');
  if (searchButton && searchPanel) {
    searchButton.addEventListener('click', () => {
      const willOpen = searchPanel.hidden;
      searchPanel.hidden = !willOpen;
      searchButton.setAttribute('aria-expanded', String(willOpen));
      if (willOpen && searchInput) searchInput.focus();
    });
  }

  const searchForm = document.getElementById('headerSearchForm');
  if (searchForm instanceof HTMLFormElement) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = searchInput instanceof HTMLInputElement ? searchInput.value.trim() : '';
      if (query) window.location.href = `shop.html?q=${encodeURIComponent(query)}`;
    });
  }

  const header = document.getElementById('siteHeader');
  const backToTopButton = document.getElementById('backToTop');
  const updateScrollState = () => {
    const scrollPosition = window.scrollY || window.pageYOffset || 0;
    if (header) header.classList.toggle('is-scrolled', scrollPosition > 10);
    if (backToTopButton) backToTopButton.classList.toggle('visible', scrollPosition > 500);
  };
  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();

  if (backToTopButton) {
    backToTopButton.addEventListener('click', () => {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  document.querySelectorAll('[data-year]').forEach((node) => {
    if (node instanceof HTMLElement) node.textContent = String(new Date().getFullYear());
  });

  const countdown = document.querySelector('[data-countdown]');
  if (countdown instanceof HTMLElement) {
    const targetDate = new Date(countdown.dataset.countdown || '').getTime();
    if (Number.isFinite(targetDate)) {
      const updateCountdown = () => {
        const remaining = Math.max(0, targetDate - Date.now());
        const values = {
          days: Math.floor(remaining / 86400000),
          hours: Math.floor((remaining % 86400000) / 3600000),
          minutes: Math.floor((remaining % 3600000) / 60000),
          seconds: Math.floor((remaining % 60000) / 1000)
        };
        Object.entries(values).forEach(([key, value]) => {
          const valueNode = countdown.querySelector(`[data-${key}]`);
          if (valueNode) valueNode.textContent = String(value).padStart(2, '0');
        });
      };
      updateCountdown();
      window.setInterval(updateCountdown, 1000);
    }
  }

  /* Slide-over cart, quick view and bulk-order hand-off. Demo only: no payment is collected. */
  const products = Array.isArray(window.PENORA_PRODUCTS) ? window.PENORA_PRODUCTS : [];
  const productById = new Map(products.map((product) => [String(product.id), product]));
  const TAX_RATE = Number.isFinite(Number(window.PENORA_TAX_RATE)) ? Number(window.PENORA_TAX_RATE) : 0.08;
  const CART_STORAGE_KEY = 'penora-cart';
  let cart = [];
  let lastCartTrigger = null;
  let lastQuickViewTrigger = null;

  const clampQuantity = (value) => Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
  const formatPrice = (amount) => `$${Number(amount || 0).toFixed(2)}`;
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  /* A cart line keeps its own name, price and image so it still renders if the catalogue changes. */
  const lineFromSource = (id, source = {}) => {
    const product = productById.get(String(id));
    const name = source.name || product?.name;
    const price = Number(source.price ?? product?.price);
    const image = source.image || product?.image || '';
    if (!id || !name || !Number.isFinite(price)) return null;
    return { id: String(id), name: String(name), price, image: String(image) };
  };

  const readStoredCart = () => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((entry) => {
        const line = entry ? lineFromSource(entry.id, entry) : null;
        return line ? { ...line, quantity: clampQuantity(entry.quantity) } : null;
      }).filter(Boolean);
    } catch (error) {
      return [];
    }
  };

  const saveCart = () => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      /* The in-memory cart remains usable when browser storage is unavailable. */
    }
  };

  const headerActions = document.querySelector('.header-actions');
  let cartToggle = document.getElementById('cartToggle');
  if (!cartToggle && headerActions) {
    cartToggle = document.createElement('button');
    cartToggle.type = 'button';
    cartToggle.id = 'cartToggle';
    cartToggle.className = 'icon-button cart-toggle';
    cartToggle.setAttribute('aria-controls', 'penoraCartDrawer');
    cartToggle.setAttribute('aria-expanded', 'false');
    cartToggle.innerHTML = '<img src="assets/icons/svg/shopping-bag.svg" alt="" aria-hidden="true"><span class="cart-count" data-cart-count>0</span>';
    const searchAction = headerActions.querySelector('#searchToggle');
    if (searchAction) searchAction.insertAdjacentElement('afterend', cartToggle);
    else headerActions.prepend(cartToggle);
  }

  const makeLayer = (tag, className, id, html, attributes = {}) => {
    const element = document.createElement(tag);
    element.className = className;
    element.id = id;
    element.hidden = true;
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    element.innerHTML = html;
    document.body.appendChild(element);
    return element;
  };

  const cartBackdrop = makeLayer('div', 'penora-cart-backdrop', 'penoraCartBackdrop', `
    <aside class="penora-cart-drawer" id="penoraCartDrawer" role="dialog" aria-modal="true" aria-labelledby="penoraCartTitle" tabindex="-1">
      <header class="penora-cart-header">
        <div><span class="penora-cart-kicker">Your selection</span><h2 id="penoraCartTitle">Shopping bag <span data-cart-item-count>(0)</span></h2></div>
        <button class="penora-cart-close" type="button" data-cart-close aria-label="Close shopping cart">&times;</button>
      </header>
      <div class="penora-cart-items" id="penoraCartItems" aria-live="polite"></div>
      <footer class="penora-cart-footer">
        <dl class="penora-cart-totals">
          <div><dt>Subtotal</dt><dd id="penoraCartSubtotal">$0.00</dd></div>
          <div><dt>Estimated tax (<span id="penoraCartTaxRate">8%</span>)</dt><dd id="penoraCartTax">$0.00</dd></div>
          <div class="penora-cart-total"><dt>Total</dt><dd id="penoraCartTotal">$0.00</dd></div>
        </dl>
        <p class="penora-cart-note">Demo store: shipping is not charged and no payment is collected.</p>
        <button class="button button-dark button-full penora-cart-checkout" id="penoraCartCheckout" type="button" disabled>Place demo order</button>
        <a class="penora-cart-bulk" href="bulk-orders.html?from=cart#bulkEnquiryForm" data-bulk-order>Need larger quantities? Order in bulk</a>
        <button class="penora-cart-continue" type="button" data-cart-close>Continue shopping</button>
      </footer>
    </aside>
  `);

  const cartToast = makeLayer('div', 'penora-cart-toast', 'penoraCartToast', '', { role: 'status', 'aria-live': 'polite' });

  const checkoutBackdrop = makeLayer('div', 'penora-checkout-backdrop', 'penoraCheckoutBackdrop', `
    <section class="penora-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="penoraCheckoutTitle" tabindex="-1">
      <span class="penora-checkout-mark" aria-hidden="true">✓</span>
      <h2 id="penoraCheckoutTitle">Order confirmed</h2>
      <p class="penora-checkout-order" id="penoraCheckoutOrder"></p>
      <ul class="penora-checkout-lines" id="penoraCheckoutLines"></ul>
      <p id="penoraCheckoutMessage"></p>
      <button class="button button-dark button-full" type="button" data-checkout-close>Continue shopping</button>
    </section>
  `);

  const quickViewBackdrop = makeLayer('div', 'penora-checkout-backdrop penora-quickview-backdrop', 'penoraQuickViewBackdrop', `
    <section class="penora-quickview" role="dialog" aria-modal="true" aria-labelledby="penoraQuickViewTitle" tabindex="-1">
      <button class="penora-cart-close penora-quickview-close" type="button" data-quickview-close aria-label="Close quick view">&times;</button>
      <div class="penora-quickview-body" id="penoraQuickViewBody"></div>
    </section>
  `);

  const cartItemsContainer = document.getElementById('penoraCartItems');
  const cartSubtotal = document.getElementById('penoraCartSubtotal');
  const cartTax = document.getElementById('penoraCartTax');
  const cartTotal = document.getElementById('penoraCartTotal');
  const cartItemCount = cartBackdrop.querySelector('[data-cart-item-count]');
  const cartCheckoutButton = document.getElementById('penoraCartCheckout');
  const cartDrawer = document.getElementById('penoraCartDrawer');
  const checkoutMessage = document.getElementById('penoraCheckoutMessage');
  const checkoutOrder = document.getElementById('penoraCheckoutOrder');
  const checkoutLines = document.getElementById('penoraCheckoutLines');
  const quickViewBody = document.getElementById('penoraQuickViewBody');
  const taxRateLabel = document.getElementById('penoraCartTaxRate');
  if (taxRateLabel) taxRateLabel.textContent = `${Math.round(TAX_RATE * 1000) / 10}%`;
  let toastTimer = 0;

  const itemCount = () => cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const taxAmount = () => Math.round(subtotal() * TAX_RATE * 100) / 100;

  const updateCartBadges = () => {
    const count = itemCount();
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(count);
      badge.classList.toggle('is-empty', count === 0);
    });
    if (cartToggle) cartToggle.setAttribute('aria-label', `Open shopping cart, ${count} ${count === 1 ? 'item' : 'items'}`);
    if (cartItemCount) cartItemCount.textContent = `(${count})`;
  };

  const renderCart = () => {
    if (!cartItemsContainer || !cartSubtotal || !cartCheckoutButton) return;
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<div class="penora-cart-empty"><img src="assets/icons/svg/shopping-bag.svg" alt="" aria-hidden="true"><h3>Your bag is empty</h3><p>Add a few stationery favourites to get started.</p></div>';
    } else {
      cartItemsContainer.innerHTML = cart.map((item) => `
          <article class="penora-cart-item" data-cart-item="${escapeHTML(item.id)}">
            <img class="penora-cart-item-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy">
            <div class="penora-cart-item-copy">
              <h3>${escapeHTML(item.name)}</h3>
              <span class="penora-cart-item-price">${formatPrice(item.price)}</span>
              <div class="penora-cart-item-controls">
                <div class="penora-cart-quantity" role="group" aria-label="Quantity for ${escapeHTML(item.name)}">
                  <button type="button" data-cart-quantity="decrease" data-product-id="${escapeHTML(item.id)}" aria-label="Decrease quantity of ${escapeHTML(item.name)}">−</button>
                  <span aria-live="polite">${item.quantity}</span>
                  <button type="button" data-cart-quantity="increase" data-product-id="${escapeHTML(item.id)}" aria-label="Increase quantity of ${escapeHTML(item.name)}">+</button>
                </div>
                <button class="penora-cart-remove" type="button" data-cart-remove="${escapeHTML(item.id)}">Remove</button>
              </div>
            </div>
            <strong class="penora-cart-line-total">${formatPrice(item.price * item.quantity)}</strong>
          </article>
        `).join('');
    }
    cartSubtotal.textContent = formatPrice(subtotal());
    if (cartTax) cartTax.textContent = formatPrice(taxAmount());
    if (cartTotal) cartTotal.textContent = formatPrice(subtotal() + taxAmount());
    cartCheckoutButton.disabled = cart.length === 0;
    updateCartBadges();
  };

  const focusableSelector = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const anyLayerOpen = () => !cartBackdrop.hidden || !checkoutBackdrop.hidden || !quickViewBackdrop.hidden;
  const unlockScrollIfIdle = () => { if (!anyLayerOpen()) document.body.classList.remove('penora-cart-open'); };

  const openCart = (trigger = null) => {
    if (trigger instanceof HTMLElement) lastCartTrigger = trigger;
    cartBackdrop.hidden = false;
    document.body.classList.add('penora-cart-open');
    if (cartToggle) cartToggle.setAttribute('aria-expanded', 'true');
    window.requestAnimationFrame(() => {
      cartBackdrop.classList.add('is-open');
      (cartBackdrop.querySelector('[data-cart-close]') || cartDrawer)?.focus();
    });
  };

  const closeCart = (restoreFocus = true) => {
    cartBackdrop.classList.remove('is-open');
    if (cartToggle) cartToggle.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => {
      if (!cartBackdrop.classList.contains('is-open')) {
        cartBackdrop.hidden = true;
        unlockScrollIfIdle();
      }
    }, 300);
    if (restoreFocus && lastCartTrigger instanceof HTMLElement && document.contains(lastCartTrigger)) lastCartTrigger.focus();
  };

  const showToast = (message) => {
    cartToast.textContent = message;
    cartToast.hidden = false;
    cartToast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      cartToast.classList.remove('is-visible');
      cartToast.hidden = true;
    }, 2400);
  };

  const addToCart = (productId, quantity = 1, source = {}) => {
    const line = lineFromSource(String(productId || ''), source);
    if (!line) {
      showToast('This product could not be added. Please refresh and try again.');
      return false;
    }
    const amount = clampQuantity(quantity);
    const existing = cart.find((item) => item.id === line.id);
    if (existing) existing.quantity = Math.min(99, existing.quantity + amount);
    else cart.push({ ...line, quantity: amount });
    saveCart();
    renderCart();
    showToast(`${line.name} added to your bag.`);
    openCart(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    return true;
  };

  const updateQuantity = (productId, delta) => {
    const item = cart.find((entry) => entry.id === String(productId));
    if (!item) return;
    item.quantity = Math.min(99, item.quantity + delta);
    if (item.quantity < 1) cart = cart.filter((entry) => entry.id !== item.id);
    saveCart();
    renderCart();
  };

  const removeFromCart = (productId) => {
    cart = cart.filter((item) => item.id !== String(productId));
    saveCart();
    renderCart();
  };

  const closeCheckout = () => {
    checkoutBackdrop.hidden = true;
    unlockScrollIfIdle();
    cartToggle?.focus();
  };

  const completeDemoCheckout = () => {
    if (cart.length === 0) return;
    const count = itemCount();
    const sub = subtotal();
    const tax = taxAmount();
    const orderNumber = `ST-${String(Date.now()).slice(-6)}`;
    if (checkoutOrder) checkoutOrder.textContent = `Demo order ${orderNumber}`;
    if (checkoutLines) {
      checkoutLines.innerHTML = cart.map((item) => `<li><span>${item.quantity} × ${escapeHTML(item.name)}</span><span>${formatPrice(item.price * item.quantity)}</span></li>`).join('')
        + `<li><span>Subtotal</span><span>${formatPrice(sub)}</span></li><li><span>Estimated tax</span><span>${formatPrice(tax)}</span></li><li class="is-total"><span>Total</span><span>${formatPrice(sub + tax)}</span></li>`;
    }
    if (checkoutMessage) checkoutMessage.textContent = `${count} ${count === 1 ? 'item' : 'items'} confirmed. This is a demo: no payment was processed.`;
    cart = [];
    saveCart();
    renderCart();
    closeCart(false);
    window.setTimeout(() => {
      checkoutBackdrop.hidden = false;
      document.body.classList.add('penora-cart-open');
      checkoutBackdrop.querySelector('[data-checkout-close]')?.focus();
    }, 320);
  };

  const openQuickView = (productId, trigger, fallback = {}) => {
    const product = productById.get(String(productId));
    const line = lineFromSource(String(productId), { ...fallback });
    if (!line || !quickViewBody) return;
    lastQuickViewTrigger = trigger instanceof HTMLElement ? trigger : null;
    const details = product || {};
    quickViewBody.innerHTML = `
      <div class="penora-quickview-image"><img src="${escapeHTML(line.image)}" alt="${escapeHTML(line.name)}"></div>
      <div class="penora-quickview-copy">
        ${details.categoryName ? `<span class="product-category">${escapeHTML(details.categoryName)}</span>` : ''}
        <h2 id="penoraQuickViewTitle">${escapeHTML(line.name)}</h2>
        <p class="penora-quickview-price">${formatPrice(line.price)}</p>
        ${details.description ? `<p>${escapeHTML(details.description)}</p>` : ''}
        ${details.availability ? `<p class="penora-quickview-stock">${details.availability === 'in' ? 'In stock' : 'Limited availability'}</p>` : ''}
        <div class="penora-quickview-actions">
          <button class="button button-dark" type="button" data-add-to-cart="${escapeHTML(line.id)}" data-id="${escapeHTML(line.id)}" data-name="${escapeHTML(line.name)}" data-price="${line.price.toFixed(2)}" data-image="${escapeHTML(line.image)}" data-close-quickview>Add to cart</button>
          <a class="button button-outline" href="product-details.html?id=${encodeURIComponent(line.id)}">Full details</a>
        </div>
      </div>`;
    quickViewBackdrop.hidden = false;
    document.body.classList.add('penora-cart-open');
    quickViewBackdrop.querySelector('[data-quickview-close]')?.focus();
  };

  const closeQuickView = (restoreFocus = true) => {
    quickViewBackdrop.hidden = true;
    unlockScrollIfIdle();
    if (restoreFocus && lastQuickViewTrigger && document.contains(lastQuickViewTrigger)) lastQuickViewTrigger.focus();
  };

  const sourceFromElement = (element) => ({
    name: element.getAttribute('data-name') || undefined,
    price: element.getAttribute('data-price') ?? undefined,
    image: element.getAttribute('data-image') || undefined
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const addButton = target.closest('[data-add-to-cart], [data-cart-add], .add-to-cart');
    if (addButton) {
      event.preventDefault();
      const productId = addButton.getAttribute('data-add-to-cart')
        || addButton.getAttribute('data-cart-add')
        || addButton.getAttribute('data-id')
        || addButton.getAttribute('data-product-id')
        || addButton.closest('[data-product-id]')?.getAttribute('data-product-id');
      const closeQuick = addButton.hasAttribute('data-close-quickview');
      if (closeQuick) closeQuickView(false);
      addToCart(productId, Number(addButton.getAttribute('data-quantity')) || 1, sourceFromElement(addButton));
      return;
    }

    const quickButton = target.closest('[data-quick-view]');
    if (quickButton) {
      event.preventDefault();
      openQuickView(quickButton.getAttribute('data-quick-view'), quickButton, sourceFromElement(quickButton));
      return;
    }

    if (target.closest('[data-quickview-close]') || target === quickViewBackdrop) { closeQuickView(); return; }

    const bulkLink = target.closest('[data-bulk-order]');
    if (bulkLink) {
      if (!cartBackdrop.hidden) closeCart(false);
      const bulkHref = bulkLink.getAttribute('href') || '';
      if (cart.length > 0 && bulkHref.startsWith('bulk-orders.html') && !bulkHref.includes('from=cart')) {
        bulkLink.setAttribute('href', bulkHref.replace('bulk-orders.html', 'bulk-orders.html?from=cart'));
      }
    }

    const openButton = target.closest('[data-cart-open], #cartToggle');
    if (openButton) {
      event.preventDefault();
      openCart(openButton);
      return;
    }

    if (target.closest('[data-cart-close]')) {
      event.preventDefault();
      closeCart();
      return;
    }

    const quantityButton = target.closest('[data-cart-quantity]');
    if (quantityButton) {
      updateQuantity(quantityButton.getAttribute('data-product-id'), quantityButton.getAttribute('data-cart-quantity') === 'increase' ? 1 : -1);
      return;
    }

    const removeButton = target.closest('[data-cart-remove]');
    if (removeButton) {
      removeFromCart(removeButton.getAttribute('data-cart-remove'));
      return;
    }

    if (target === cartBackdrop) { closeCart(); return; }
    if (target === checkoutBackdrop || target.closest('[data-checkout-close]')) { closeCheckout(); return; }
    if (target.closest('#penoraCartCheckout')) completeDemoCheckout();
  });

  document.addEventListener('keydown', (event) => {
    const layer = [quickViewBackdrop, checkoutBackdrop, cartBackdrop].find((node) => !node.hidden);
    if (!layer) return;
    if (event.key === 'Escape') {
      if (layer === quickViewBackdrop) closeQuickView();
      else if (layer === checkoutBackdrop) closeCheckout();
      else closeCart();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...layer.querySelectorAll(focusableSelector)].filter((node) => node instanceof HTMLElement && node.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  /* Keep several open tabs in step with the stored cart. */
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY) { cart = readStoredCart(); renderCart(); }
  });

  cart = readStoredCart();
  renderCart();

  /* Bulk hand-off: arriving from the cart drawer pre-fills the enquiry with the bag contents. */
  const bulkRequirements = document.querySelector('#bulkEnquiryForm textarea[name="requirements"]');
  if (bulkRequirements instanceof HTMLTextAreaElement && cart.length > 0 && new URLSearchParams(window.location.search).get('from') === 'cart' && !bulkRequirements.value.trim()) {
    bulkRequirements.value = `Bulk pricing request for:\n${cart.map((item) => `- ${item.quantity} × ${item.name} (${formatPrice(item.price)} each)`).join('\n')}`;
  }

  window.PenoraCart = {
    add: addToCart,
    open: openCart,
    close: closeCart,
    remove: removeFromCart,
    getItems: () => cart.map((item) => ({ ...item })),
    clear: () => { cart = []; saveCart(); renderCart(); }
  };
})();

/* FAQ accordion: answers open one by one — opening a question closes the others. */
(function () {
  document.querySelectorAll('.faq-list').forEach((list) => {
    const items = Array.from(list.querySelectorAll(':scope > details'));
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach((other) => { if (other !== item) other.open = false; });
      });
    });
  });
})();
