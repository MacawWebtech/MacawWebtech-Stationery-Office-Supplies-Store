/* Product grid renderer and client-side catalogue filtering/sorting. */
(() => {
  'use strict';

  const products = Array.isArray(window.PENORA_PRODUCTS) ? window.PENORA_PRODUCTS : [];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const cartAttributes = (product) => `data-id="${esc(product.id)}" data-name="${esc(product.name)}" data-price="${Number(product.price).toFixed(2)}" data-image="${esc(product.image)}"`;
  const productCard = (product) => `
    <article class="product-card" data-product-id="${esc(product.id)}">
      <a class="product-image-wrap" href="product-details.html?id=${encodeURIComponent(product.id)}" aria-label="View ${esc(product.name)}">
        <img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy">
        ${product.tag ? `<span class="product-tag">${esc(product.tag)}</span>` : ''}
      </a>
      <div class="product-info">
        <span class="product-category">${esc(product.categoryName)}</span>
        <h3><a href="product-details.html?id=${encodeURIComponent(product.id)}">${esc(product.name)}</a></h3>
        <p class="product-description">${esc(product.description)}</p>
        <div class="product-price-row">
          <span class="product-price">$${Number(product.price).toFixed(2)}</span>
          <span class="product-availability">${product.availability === 'in' ? 'In stock' : 'Limited'}</span>
        </div>
        <div class="product-card-actions">
          <div class="product-card-links">
            <a class="product-detail-link" href="product-details.html?id=${encodeURIComponent(product.id)}">View details</a>
            <button class="product-quick-view" type="button" data-quick-view="${esc(product.id)}" ${cartAttributes(product)} aria-label="Quick view ${esc(product.name)}">Quick view</button>
          </div>
          <button class="button button-dark product-add-button" type="button" data-add-to-cart="${esc(product.id)}" ${cartAttributes(product)} aria-label="Add ${esc(product.name)} to cart">Add to cart</button>
        </div>
      </div>
    </article>
  `;

  document.querySelectorAll('[data-product-grid]').forEach((grid) => {
    if (!(grid instanceof HTMLElement)) return;
    const mode = grid.dataset.products || 'featured';
    let list = [...products];

    if (mode === 'featured') list = list.filter((product) => product.best).slice(0, Number(grid.dataset.limit) || 4);
    if (mode === 'new') list = list.filter((product) => product.isNew);
    if (mode === 'office') list = list.filter((product) => ['equipment', 'filing', 'desk', 'paper'].includes(product.category)).slice(0, Number(grid.dataset.limit) || 4);
    if (mode === 'related') {
      const productId = new URLSearchParams(window.location.search).get('id');
      const currentProduct = products.find((product) => product.id === productId);
      list = list.filter((product) => product.id !== productId && (!currentProduct || product.category === currentProduct.category)).slice(0, Number(grid.dataset.limit) || 4);
      if (list.length < 4) {
        const existingIds = new Set(list.map((product) => product.id));
        list = [...list, ...products.filter((product) => product.id !== productId && !existingIds.has(product.id)).slice(0, 4 - list.length)];
      }
    }
    if (grid.id === 'arrivalsGrid') list = list.slice(0, Number(grid.dataset.limit) || 12);
    if (grid.dataset.limit) list = list.slice(0, Number(grid.dataset.limit));
    grid.innerHTML = list.map(productCard).join('');
  });

  const shopGrid = document.querySelector('[data-shop-grid]');
  if (shopGrid instanceof HTMLElement) {
    const fields = {
      search: document.getElementById('productSearch'),
      category: document.getElementById('categoryFilter'),
      type: document.getElementById('typeFilter'),
      brand: document.getElementById('brandFilter'),
      price: document.getElementById('priceFilter'),
      availability: document.getElementById('availabilityFilter'),
      newOnly: document.getElementById('newOnly'),
      bestOnly: document.getElementById('bestOnly'),
      sort: document.getElementById('sortProducts')
    };

    const parameters = new URLSearchParams(window.location.search);
    if (parameters.has('category') && fields.category instanceof HTMLSelectElement) fields.category.value = parameters.get('category');
    if (parameters.has('q') && fields.search instanceof HTMLInputElement) fields.search.value = parameters.get('q');

    const renderShop = () => {
      let list = [...products];
      const query = fields.search instanceof HTMLInputElement ? fields.search.value.trim().toLowerCase() : '';
      if (query) {
        list = list.filter((product) => `${product.name} ${product.description} ${product.categoryName} ${product.brand}`.toLowerCase().includes(query));
      }

      if (fields.category instanceof HTMLSelectElement && fields.category.value !== 'all') list = list.filter((product) => product.category === fields.category.value);
      if (fields.type instanceof HTMLSelectElement && fields.type.value !== 'all') list = list.filter((product) => product.productType === fields.type.value);
      if (fields.brand instanceof HTMLSelectElement && fields.brand.value !== 'all') list = list.filter((product) => product.brand === fields.brand.value);

      const priceRange = fields.price instanceof HTMLSelectElement ? fields.price.value : 'all';
      if (priceRange === 'under10') list = list.filter((product) => product.price < 10);
      if (priceRange === '10-25') list = list.filter((product) => product.price >= 10 && product.price <= 25);
      if (priceRange === '25-50') list = list.filter((product) => product.price > 25 && product.price <= 50);
      if (priceRange === 'over50') list = list.filter((product) => product.price > 50);

      if (fields.availability instanceof HTMLSelectElement && fields.availability.value !== 'all') list = list.filter((product) => product.availability === fields.availability.value);
      if (fields.newOnly instanceof HTMLInputElement && fields.newOnly.checked) list = list.filter((product) => product.isNew);
      if (fields.bestOnly instanceof HTMLInputElement && fields.bestOnly.checked) list = list.filter((product) => product.best);

      const sortOrder = fields.sort instanceof HTMLSelectElement ? fields.sort.value : 'featured';
      if (sortOrder === 'newest') list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
      if (sortOrder === 'low-high') list.sort((a, b) => a.price - b.price);
      if (sortOrder === 'high-low') list.sort((a, b) => b.price - a.price);
      if (sortOrder === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
      if (sortOrder === 'featured') list.sort((a, b) => Number(b.best) - Number(a.best));

      shopGrid.innerHTML = list.map(productCard).join('');
      const resultSummary = document.getElementById('resultSummary');
      const shopCount = document.getElementById('shopCount');
      const emptyState = document.getElementById('emptyState');
      if (resultSummary) resultSummary.textContent = `Showing ${list.length} of ${products.length} products`;
      if (shopCount) shopCount.textContent = `${list.length} items`;
      if (emptyState) emptyState.hidden = list.length > 0;
    };

    Object.values(fields).forEach((field) => {
      if (!field) return;
      field.addEventListener('input', renderShop);
      field.addEventListener('change', renderShop);
    });

    const clearFilters = () => {
      Object.entries(fields).forEach(([key, field]) => {
        if (!field) return;
        if (key === 'newOnly' || key === 'bestOnly') field.checked = false;
        else if (key === 'search') field.value = '';
        else if (key === 'sort') field.value = 'featured';
        else field.value = 'all';
      });
      renderShop();
    };

    const clearButton = document.getElementById('clearFilters');
    const emptyClearButton = document.getElementById('emptyClear');
    if (clearButton) clearButton.addEventListener('click', clearFilters);
    if (emptyClearButton) emptyClearButton.addEventListener('click', clearFilters);

    const mobileFilterButton = document.getElementById('filterMobileToggle');
    const mobileFilterPanel = document.getElementById('shopFilters');
    if (mobileFilterButton && mobileFilterPanel) {
      mobileFilterButton.setAttribute('aria-controls', 'shopFilters');
      mobileFilterButton.setAttribute('aria-expanded', 'false');
      mobileFilterButton.addEventListener('click', () => {
        const isOpen = mobileFilterPanel.classList.toggle('is-open');
        mobileFilterButton.setAttribute('aria-expanded', String(isOpen));
        mobileFilterButton.textContent = isOpen ? 'Hide filters' : 'Filters';
      });
    }

    renderShop();
  }

  const arrivalsGrid = document.getElementById('arrivalsGrid');
  const arrivalSort = document.getElementById('arrivalSort');
  const arrivalCategory = document.getElementById('arrivalCategory');
  if (arrivalsGrid) {
    const renderArrivals = () => {
      let list = products.filter((product) => product.isNew);
      if (arrivalCategory instanceof HTMLSelectElement && arrivalCategory.value !== 'all') {
        list = list.filter((product) => product.category === arrivalCategory.value);
      }
      if (arrivalSort instanceof HTMLSelectElement && arrivalSort.value === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
      if (arrivalSort instanceof HTMLSelectElement && arrivalSort.value === 'low-high') list.sort((a, b) => a.price - b.price);
      arrivalsGrid.innerHTML = list.map(productCard).join('');
    };
    if (arrivalSort) arrivalSort.addEventListener('change', renderArrivals);
    renderArrivals();
    if (arrivalCategory) arrivalCategory.addEventListener('change', renderArrivals);
  }

  const productDetail = document.querySelector('[data-product-detail]');
  if (productDetail instanceof HTMLElement && products.length > 0) {
    const parameters = new URLSearchParams(window.location.search);
    const selectedProduct = products.find((product) => product.id === parameters.get('id')) || products[0];
    const galleryImages = [
      selectedProduct.image,
      ...((window.PENORA_GALLERY?.[selectedProduct.category] || []).filter((source) => source !== selectedProduct.image).slice(0, 2))
    ];

    document.title = `${selectedProduct.name} | Penora Stationery`;
    const detailDescription = document.querySelector('meta[name="description"]');
    if (detailDescription) detailDescription.setAttribute('content', selectedProduct.description);
    productDetail.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-gallery">
          <div class="product-detail-image"><img id="detailMainImage" src="${selectedProduct.image}" alt="${selectedProduct.name}"></div>
          <div class="product-thumbnails">
            ${galleryImages.map((source, index) => `<button type="button" class="product-thumbnail ${index === 0 ? 'active' : ''}" data-gallery-image="${source}" aria-label="Show product image ${index + 1}"><img src="${esc(source)}" alt="${esc(selectedProduct.name)} thumbnail ${index + 1}"></button>`).join('')}
          </div>
        </div>
        <div class="product-detail-copy">
          <span class="product-category">${selectedProduct.categoryName}</span>
          <h2>${selectedProduct.name}</h2>
          <p class="detail-price">$${selectedProduct.price.toFixed(2)}</p>
          <p class="detail-description">${selectedProduct.description}</p>
          <div class="product-meta">
            <span class="product-stars" aria-label="Sample rating"><img src="assets/icons/svg/star.svg" alt=""><img src="assets/icons/svg/star.svg" alt=""><img src="assets/icons/svg/star.svg" alt=""><img src="assets/icons/svg/star.svg" alt=""><img src="assets/icons/svg/star.svg" alt=""></span>
            <span>Sample customer rating</span>
          </div>
          <dl class="detail-specs">${Object.entries({ Brand: selectedProduct.brand, ...selectedProduct.specs }).map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl>
          <div class="detail-actions">
            <button class="button button-dark" type="button" data-add-to-cart="${esc(selectedProduct.id)}" ${cartAttributes(selectedProduct)}>Add to cart</button>
            <a href="bulk-orders.html" class="button button-outline">Enquire about this product</a>
            <a href="shop.html" class="button button-outline">Back to shop</a>
          </div>
          <p class="form-disclaimer">Prices and availability are sample catalogue data. Confirm current details with the store before purchasing.</p>
        </div>
      </div>
    `;

    productDetail.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const thumbnail = target?.closest('[data-gallery-image]');
      const mainImage = document.getElementById('detailMainImage');
      if (!thumbnail || !(mainImage instanceof HTMLImageElement)) return;
      const imageSource = thumbnail.getAttribute('data-gallery-image');
      if (!imageSource) return;
      mainImage.src = imageSource;
      mainImage.alt = `${selectedProduct.name} product image`;
      productDetail.querySelectorAll('.product-thumbnail').forEach((button) => button.classList.toggle('active', button === thumbnail));
    });
  }

  const blogSearch = document.getElementById('blogSearch');
  const blogCategory = document.getElementById('blogCategory');
  const loadMoreButton = document.getElementById('loadMoreArticles');
  if (blogSearch || blogCategory || loadMoreButton) {
    const blogCards = [...document.querySelectorAll('.blog-card')];
    let expanded = false;
    const runBlogFilters = () => {
      const query = blogSearch instanceof HTMLInputElement ? blogSearch.value.toLowerCase().trim() : '';
      const category = blogCategory instanceof HTMLSelectElement ? blogCategory.value : 'all';
      const matches = blogCards.filter((card) => {
        const title = (card.dataset.title || card.textContent || '').toLowerCase();
        return title.includes(query) && (category === 'all' || card.dataset.blogCategory === category);
      });
      blogCards.forEach((card) => {
        const index = matches.indexOf(card);
        card.hidden = index < 0 || (!expanded && index >= 3);
      });
      const emptyMessage = document.getElementById('blogEmpty');
      if (emptyMessage) emptyMessage.hidden = matches.length > 0;
      if (loadMoreButton) loadMoreButton.hidden = matches.length <= 3 || expanded;
    };
    if (blogSearch) blogSearch.addEventListener('input', () => { expanded = false; runBlogFilters(); });
    if (blogCategory) blogCategory.addEventListener('change', () => { expanded = false; runBlogFilters(); });
    if (loadMoreButton) loadMoreButton.addEventListener('click', () => { expanded = true; runBlogFilters(); });
    runBlogFilters();
  }
})();
