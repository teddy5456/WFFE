document.addEventListener('DOMContentLoaded', function() {
  // ===== Global Variables =====
  let categoryData = {};

  // Fetch category data from the local server
  async function fetchCategoryData() {
    try {
      console.log('Fetching category data...'); // Log before the fetch request
      const response = await fetch('http://localhost:8000/api/categories');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      categoryData = await response.json();
      console.log('Category data fetched successfully:', categoryData); // Log after data is fetched
      init(); // Initialize page after data is fetched
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
    }
  }
  
  // ===== DOM Elements =====
  const elements = {
    // Header
    mobileMenuToggle: document.querySelector('.mobile-menu-toggle'),
    mobileMenu: document.getElementById('mobileMenu'),
    announcementClose: document.querySelector('.announcement-close'),
    announcementBar: document.querySelector('.announcement-bar'),
    
    // Category Hero
    categoryHero: document.getElementById('categoryHero'),
    categoryTitle: document.getElementById('categoryTitle'),
    categoryDescription: document.getElementById('categoryDescription'),
    currentCategory: document.getElementById('currentCategory'),
    
    // Subcategory Navigation
    subcategoryNav: document.getElementById('subcategoryNav'),
    
    // Filters
    filtersSidebar: document.getElementById('filtersSidebar'),
    closeFilters: document.getElementById('closeFilters'),
    filterToggle: document.getElementById('filterToggle'),
    mobileFiltersOverlay: document.getElementById('mobileFiltersOverlay'),
    priceMin: document.getElementById('priceMin'),
    priceMax: document.getElementById('priceMax'),
    minPrice: document.getElementById('minPrice'),
    maxPrice: document.getElementById('maxPrice'),
    colorFilters: document.getElementById('colorFilters'),
    applyFilters: document.getElementById('applyFilters'),
    resetFilters: document.getElementById('resetFilters'),
    
    // Products
    productsGrid: document.getElementById('productsGrid'),
    productCount: document.getElementById('productCount'),
    sortBy: document.getElementById('sortBy'),
    
    // FAQ
    faqQuestions: document.querySelectorAll('.faq-question'),
    
    // Modals
    quickViewModal: document.getElementById('quickViewModal'),
    quickViewButtons: document.querySelectorAll('.quick-view'),
    modalClose: document.querySelectorAll('.modal-close'),
    
    // Lookbook
    shopLookButtons: document.querySelectorAll('.shop-the-look')
  };

  // ===== State Management =====
  let state = {
    currentCategory: getCategoryFromURL(),
    activeFilters: {
      price: { min: 0, max: 500000 },
      colors: [],
      materials: []
    },
    sortBy: 'featured',
    currentPage: 1,
    productsPerPage: 12
  };

  // ===== Initialize Page =====
  function init() {
    // Set category data from the fetched data
    const category = categoryData[state.currentCategory] || categoryData['living-room'];
    
    // Update hero section
    elements.categoryHero.style.backgroundImage = `url('${category.heroImage}')`;
    elements.categoryTitle.textContent = category.title;
    elements.categoryDescription.textContent = category.description;
    elements.currentCategory.textContent = category.title;
    
    // Update subcategory navigation
    renderSubcategoryNav(category.subcategories);
    
    // Update color filters
    renderColorFilters(category.colors);
    
    // Render products
    renderProducts();
    
    // Set up event listeners
    setupEventListeners();
  }

  // ===== URL Handling =====
  function getCategoryFromURL() {
    const path = window.location.pathname;
    const category = path.split('/').pop();
    return category in categoryData ? category : 'living-room';
  }

  function updateURL(category) {
    const newURL = `/category/${category}`;
    window.history.pushState({}, '', newURL);
  }

  // ===== Render Functions =====
  function renderSubcategoryNav(subcategories) {
    elements.subcategoryNav.innerHTML = subcategories.map(sub => `
      <li><a href="#${sub.toLowerCase().replace(' ', '-')}" 
           data-subcategory="${sub.toLowerCase().replace(' ', '-')}">
           ${sub}
         </a></li>
    `).join('');
  }

  function renderColorFilters(colors) {
    const colorMap = {
      'blue': '#1e3a8a',
      'green': '#064e3b',
      'gray': '#6b7280',
      'black': '#1c1917',
      'red': '#831843',
      'white': '#f3f4f6'
    };
    
    elements.colorFilters.innerHTML = colors.map(color => `
      <div class="color-option" 
           data-color="${color}" 
           style="background-color: ${colorMap[color]};"
           aria-label="${color}">
      </div>
    `).join('');
  }

  function renderProducts() {
    const category = categoryData[state.currentCategory];
    let products = [...category.products];
    
    // Apply filters
    products = applyFilters(products);
    
    // Apply sorting
    products = sortProducts(products);
    
    // Pagination
    const paginatedProducts = paginateProducts(products);
    
    // Update product count
    elements.productCount.textContent = paginatedProducts.length;
    
    // Render products
    elements.productsGrid.innerHTML = paginatedProducts.map(product => `
      <article class="product-card" data-id="${product.id}">
        ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          <div class="product-actions">
            <button class="quick-view" data-product="${product.id}">
              <i class="fas fa-expand"></i> Quick View
            </button>
            <button class="add-wishlist" aria-label="Add to wishlist">
              <i class="far fa-heart"></i>
            </button>
          </div>
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.name}</h3>
          <div class="product-price">
            <span class="current-price">KES ${formatPrice(product.price)}</span>
            ${product.originalPrice ? `
              <span class="original-price">KES ${formatPrice(product.originalPrice)}</span>
              <span class="discount">(${calculateDiscount(product.price, product.originalPrice)}% off)</span>
            ` : ''}
          </div>
          <div class="product-meta">
            <div class="product-rating">
              <div class="stars">
                ${renderStars(product.rating)}
              </div>
              <span class="count">(${product.reviewCount})</span>
            </div>
            ${product.colors ? `
              <div class="product-colors">
                ${renderColorDots(product.colors)}
                ${product.colors.length > 2 ? `<span class="color-count">+${product.colors.length - 2} more</span>` : ''}
              </div>
            ` : ''}
          </div>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      </article>
    `).join('');
    
    // Update pagination
    updatePagination(products.length);
  }

  // Call fetchCategoryData to initialize page with fetched data
  fetchCategoryData();
});
