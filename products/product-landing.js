// product-landing.js

document.addEventListener('DOMContentLoaded', function() {
    // ================ GLOBAL VARIABLES ================
    const body = document.body;
    const html = document.documentElement;
    
    // ================ UTILITY FUNCTIONS ================
    const debounce = (func, wait = 100) => {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(this, args);
        }, wait);
      };
    };
  
    const throttle = (func, limit = 100) => {
      let lastFunc;
      let lastRan;
      return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
          func.apply(context, args);
          lastRan = Date.now();
        } else {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(function() {
            if ((Date.now() - lastRan) >= limit) {
              func.apply(context, args);
              lastRan = Date.now();
            }
          }, limit - (Date.now() - lastRan));
        }
      };
    };
  
    // ================ ANNOUNCEMENT BAR ================
    const announcementBar = document.querySelector('.announcement-bar');
    const announcementClose = document.querySelector('.announcement-close');
  
    if (announcementClose && announcementBar) {
      announcementClose.addEventListener('click', () => {
        announcementBar.style.display = 'none';
        // Store dismissal in localStorage
        localStorage.setItem('announcementDismissed', 'true');
      });
  
      // Check if announcement was previously dismissed
      if (localStorage.getItem('announcementDismissed') === 'true') {
        announcementBar.style.display = 'none';
      }
    }
  
    // ================ MOBILE MENU ================
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
  
    if (mobileMenuToggle && mobileMenu) {
      mobileMenuToggle.addEventListener('click', () => {
        mobileMenu.classList.add('active');
        body.style.overflow = 'hidden';
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
      });
    }
  
    if (mobileMenuClose && mobileMenu) {
      mobileMenuClose.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      });
    }
  
    mobileDropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const parent = toggle.closest('.mobile-dropdown');
        parent.classList.toggle('active');
      });
    });
  
    // ================ HEADER SCROLL EFFECT ================
    const header = document.querySelector('.main-header');
    let lastScroll = 0;
  
    const handleHeaderScroll = () => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll <= 100) {
        header.classList.remove('scrolled');
      } else {
        header.classList.add('scrolled');
        
        if (currentScroll > lastScroll && currentScroll > 200) {
          // Scrolling down
          header.style.transform = 'translateY(-100%)';
        } else {
          // Scrolling up
          header.style.transform = 'translateY(0)';
        }
      }
      
      lastScroll = currentScroll;
    };
  
    window.addEventListener('scroll', throttle(handleHeaderScroll, 100));
  
    // ================ SEARCH FUNCTIONALITY ================
    const searchToggle = document.querySelector('.search-toggle');
    const searchContainer = document.querySelector('.search-container');
    const searchDropdown = document.querySelector('.search-dropdown');
  
    if (searchToggle && searchContainer) {
      searchToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        searchContainer.classList.toggle('active');
        
        if (searchContainer.classList.contains('active')) {
          searchDropdown.querySelector('input').focus();
        }
      });
    }
  
    // Close search when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container') && searchContainer) {
        searchContainer.classList.remove('active');
      }
    });
  
    // ================ CART FUNCTIONALITY ================
    const cartContainer = document.querySelector('.cart-container');
    const cartLink = document.querySelector('.cart-link');
    const cartDropdown = document.querySelector('.cart-dropdown');
    const cartCount = document.querySelector('.cart-count');
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartItemRemoveButtons = document.querySelectorAll('.cart-item-remove');
  
    // Initialize cart from localStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateCartCount();
  
    // Add to cart functionality
    addToCartButtons.forEach(button => {
      button.addEventListener('click', () => {
        const productCard = button.closest('.product-card');
        const productId = productCard.dataset.productId || Math.random().toString(36).substr(2, 9);
        const productName = productCard.querySelector('.product-title').textContent;
        const productPrice = productCard.querySelector('.current-price').textContent;
        const productImage = productCard.querySelector('.product-image img').src;
        
        // Check if product already in cart
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            quantity: 1
          });
        }
        
        // Update localStorage and UI
        saveCart();
        updateCartCount();
        showNotification(`${productName} added to cart`);
        
        // If cart dropdown is open, update it
        if (cartDropdown.classList.contains('active')) {
          renderCartItems();
        }
      });
    });
  
    // Cart dropdown toggle
    if (cartContainer && cartLink && cartDropdown) {
      cartLink.addEventListener('click', (e) => {
        e.preventDefault();
        cartDropdown.classList.toggle('active');
        
        if (cartDropdown.classList.contains('active')) {
          renderCartItems();
        }
      });
    }
  
    // Close cart when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.cart-container') && cartDropdown) {
        cartDropdown.classList.remove('active');
      }
    });
  
    // Remove item from cart
    function handleRemoveItem(e) {
      const itemId = this.dataset.itemId;
      cart = cart.filter(item => item.id !== itemId);
      saveCart();
      updateCartCount();
      renderCartItems();
      showNotification('Item removed from cart');
    }
  
    // Cart helper functions
    function saveCart() {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  
    function updateCartCount() {
      if (cartCount) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        // Add animation class
        cartCount.classList.add('updated');
        setTimeout(() => cartCount.classList.remove('updated'), 300);
      }
    }
  
    function renderCartItems() {
      if (cartItemsContainer) {
        if (cart.length === 0) {
          cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
          return;
        }
        
        let html = '';
        let subtotal = 0;
        
        cart.forEach(item => {
          subtotal += parseFloat(item.price.replace(/[^0-9.]/g, '')) * item.quantity;
          
          html += `
            <div class="cart-item" data-item-id="${item.id}">
              <img src="${item.image}" alt="${item.name}">
              <div class="cart-item-details">
                <h5>${item.name}</h5>
                <div class="cart-item-price">${item.price}</div>
                <div class="cart-item-qty">Qty: ${item.quantity}</div>
              </div>
              <button class="cart-item-remove" aria-label="Remove item">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        });
        
        cartItemsContainer.innerHTML = html;
        
        // Update subtotal
        document.querySelector('.cart-subtotal span:last-child').textContent = `KES ${subtotal.toLocaleString()}`;
        document.querySelector('.cart-total span:last-child').textContent = `KES ${subtotal.toLocaleString()}`;
        
        // Reattach event listeners
        document.querySelectorAll('.cart-item-remove').forEach(button => {
          button.addEventListener('click', handleRemoveItem);
        });
      }
    }

    function openCategory(categoryId) {
      localStorage.setItem('selectedCategory', categoryId);
      window.location.href = "/category.html";  // Redirect to category page
  }
  
  
    // ================ WISHLIST FUNCTIONALITY ================
    const wishlistButtons = document.querySelectorAll('.add-to-wishlist');
    const wishlistLink = document.querySelector('.wishlist-link');
    const wishlistCount = document.querySelector('.wishlist-count');
    
    // Initialize wishlist from localStorage
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    updateWishlistCount();
  
    wishlistButtons.forEach(button => {
      button.addEventListener('click', function() {
        const icon = this.querySelector('i');
        const productCard = this.closest('.product-card');
        const productId = productCard.dataset.productId || Math.random().toString(36).substr(2, 9);
        
        if (icon.classList.contains('far')) {
          // Add to wishlist
          icon.classList.remove('far');
          icon.classList.add('fas');
          wishlist.push(productId);
          showNotification('Added to wishlist');
        } else {
          // Remove from wishlist
          icon.classList.remove('fas');
          icon.classList.add('far');
          wishlist = wishlist.filter(id => id !== productId);
          showNotification('Removed from wishlist');
        }
        
        saveWishlist();
        updateWishlistCount();
      });
    });
  
    // Wishlist helper functions
    function saveWishlist() {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  
    function updateWishlistCount() {
      if (wishlistCount) {
        wishlistCount.textContent = wishlist.length;
        
        // Add animation class
        wishlistCount.classList.add('updated');
        setTimeout(() => wishlistCount.classList.remove('updated'), 300);
      }
    }
  
    // ================ QUICK VIEW MODAL ================
    const quickViewButtons = document.querySelectorAll('.quick-view');
    const quickViewModal = document.getElementById('quickViewModal');
    const quickViewClose = document.querySelector('.quickview-close');
    const quickViewContent = document.querySelector('.quickview-content');
  
    quickViewButtons.forEach(button => {
      button.addEventListener('click', function() {
        const productCard = this.closest('.product-card');
        const productId = this.dataset.product || '1';
        
        // Show loading state
        quickViewContent.innerHTML = `
          <div class="quickview-loading">
            <div class="spinner"></div>
            <p>Loading product details...</p>
          </div>
        `;
        
        // Show modal
        quickViewModal.classList.add('active');
        body.style.overflow = 'hidden';
        
        // Simulate API call with timeout
        setTimeout(() => {
          renderQuickView(productCard, productId);
        }, 800);
      });
    });
  
    if (quickViewClose && quickViewModal) {
      quickViewClose.addEventListener('click', () => {
        quickViewModal.classList.remove('active');
        body.style.overflow = '';
      });
    }
  
    // Close modal when clicking overlay
    quickViewModal.addEventListener('click', (e) => {
      if (e.target === quickViewModal) {
        quickViewModal.classList.remove('active');
        body.style.overflow = '';
      }
    });
  
    function renderQuickView(productCard, productId) {
      const productName = productCard.querySelector('.product-title').textContent;
      const productPrice = productCard.querySelector('.current-price').textContent;
      const originalPrice = productCard.querySelector('.original-price')?.textContent || '';
      const productImage = productCard.querySelector('.product-image img').src;
      const productDescription = "This is a detailed description of the product that would normally come from your product database. It includes all the features, materials, and specifications that customers need to know before making a purchase.";
      
      quickViewContent.innerHTML = `
        <div class="quickview-product">
          <div class="quickview-gallery">
            <div class="gallery-main">
              <img src="${productImage}" alt="${productName}">
            </div>
            <div class="gallery-thumbnails">
              <div class="thumbnail active"><img src="${productImage}" alt="${productName}"></div>
              <div class="thumbnail"><img src="${productImage.replace('.jpg', '-2.jpg')}" alt="${productName} alternate view"></div>
              <div class="thumbnail"><img src="${productImage.replace('.jpg', '-3.jpg')}" alt="${productName} detail"></div>
            </div>
          </div>
          <div class="quickview-details">
            <h3>${productName}</h3>
            <div class="quickview-price">
              <span class="current-price">${productPrice}</span>
              ${originalPrice ? `<span class="original-price">${originalPrice}</span>` : ''}
            </div>
            <div class="quickview-rating">
              <div class="stars">
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star-half-alt"></i>
              </div>
              <span class="review-count">(142 reviews)</span>
            </div>
            <p class="quickview-description">${productDescription}</p>
            
            <div class="quickview-options">
              <div class="option-group">
                <h4>Color</h4>
                <div class="color-options">
                  <div class="color-option active" style="background-color: #1e3a8a;"></div>
                  <div class="color-option" style="background-color: #831843;"></div>
                  <div class="color-option" style="background-color: #064e3b;"></div>
                </div>
              </div>
              
              <div class="option-group">
                <h4>Size</h4>
                <div class="size-options">
                  <div class="size-option active">3-Seater</div>
                  <div class="size-option">2-Seater</div>
                  <div class="size-option">Loveseat</div>
                </div>
              </div>
              
              <div class="option-group">
                <h4>Quantity</h4>
                <div class="quantity-selector">
                  <button class="quantity-decrement">-</button>
                  <input type="number" value="1" min="1">
                  <button class="quantity-increment">+</button>
                </div>
              </div>
            </div>
            
            <button class="quickview-add-to-cart">Add to Cart</button>
            
            <div class="quickview-meta">
              <div class="meta-item">
                <i class="fas fa-truck"></i>
                <span>Free delivery to Nairobi</span>
              </div>
              <div class="meta-item">
                <i class="fas fa-shield-alt"></i>
                <span>5-year warranty</span>
              </div>
              <div class="meta-item">
                <i class="fas fa-undo"></i>
                <span>30-day returns</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add event listeners to quick view elements
      const thumbnails = quickViewContent.querySelectorAll('.thumbnail');
      const colorOptions = quickViewContent.querySelectorAll('.color-option');
      const sizeOptions = quickViewContent.querySelectorAll('.size-option');
      const quantityInput = quickViewContent.querySelector('.quantity-selector input');
      const decrementButton = quickViewContent.querySelector('.quantity-decrement');
      const incrementButton = quickViewContent.querySelector('.quantity-increment');
      const addToCartButton = quickViewContent.querySelector('.quickview-add-to-cart');
      
      // Thumbnail click handler
      thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
          thumbnails.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          const newSrc = this.querySelector('img').src;
          quickViewContent.querySelector('.gallery-main img').src = newSrc;
        });
      });
      
      // Color option click handler
      colorOptions.forEach(option => {
        option.addEventListener('click', function() {
          colorOptions.forEach(o => o.classList.remove('active'));
          this.classList.add('active');
        });
      });
      
      // Size option click handler
      sizeOptions.forEach(option => {
        option.addEventListener('click', function() {
          sizeOptions.forEach(o => o.classList.remove('active'));
          this.classList.add('active');
        });
      });
      
      // Quantity handlers
      decrementButton.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          quantityInput.value = currentValue - 1;
        }
      });
      
      incrementButton.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        quantityInput.value = currentValue + 1;
      });
      
      // Add to cart from quick view
      addToCartButton.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value);
        
        // Check if product already in cart
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            quantity: quantity
          });
        }
        
        saveCart();
        updateCartCount();
        showNotification(`${quantity} ${productName} added to cart`);
        
        // Close quick view
        quickViewModal.classList.remove('active');
        body.style.overflow = '';
      });
    }
  
    // ================ HERO SLIDER ================
    const heroSlider = document.querySelector('.hero-slider');
    const heroSlides = document.querySelectorAll('.hero-slide');
    const sliderDots = document.querySelectorAll('.slider-dot');
    const sliderPrev = document.querySelector('.slider-prev');
    const sliderNext = document.querySelector('.slider-next');
    let currentSlide = 0;
    let slideInterval;
  
    if (heroSlides.length > 0) {
      // Initialize slider
      heroSlides[0].classList.add('active');
      sliderDots[0].classList.add('active');
      
      // Start auto-rotation
      startSlider();
      
      // Pause on hover
      heroSlider.addEventListener('mouseenter', pauseSlider);
      heroSlider.addEventListener('mouseleave', startSlider);
      
      // Dot navigation
      sliderDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          goToSlide(index);
        });
      });
      
      // Arrow navigation
      if (sliderPrev && sliderNext) {
        sliderPrev.addEventListener('click', () => {
          pauseSlider();
          prevSlide();
        });
        
        sliderNext.addEventListener('click', () => {
          pauseSlider();
          nextSlide();
        });
      }
    }
  
    function startSlider() {
      slideInterval = setInterval(nextSlide, 5000);
    }
  
    function pauseSlider() {
      clearInterval(slideInterval);
    }
  
    function nextSlide() {
      goToSlide((currentSlide + 1) % heroSlides.length);
    }
  
    function prevSlide() {
      goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
    }
  
    function goToSlide(index) {
      heroSlides[currentSlide].classList.remove('active');
      sliderDots[currentSlide].classList.remove('active');
      
      currentSlide = index;
      
      heroSlides[currentSlide].classList.add('active');
      sliderDots[currentSlide].classList.add('active');
    }
  
    // ================ TESTIMONIAL SLIDER ================
    const testimonialSlider = document.querySelector('.testimonials-slider');
    
    if (testimonialSlider) {
      let isDragging = false;
      let startPos = 0;
      let currentTranslate = 0;
      let prevTranslate = 0;
      let animationID;
      let currentIndex = 0;
      
      testimonialSlider.addEventListener('mousedown', dragStart);
      testimonialSlider.addEventListener('touchstart', dragStart);
      
      testimonialSlider.addEventListener('mouseup', dragEnd);
      testimonialSlider.addEventListener('touchend', dragEnd);
      testimonialSlider.addEventListener('mouseleave', dragEnd);
      
      testimonialSlider.addEventListener('mousemove', drag);
      testimonialSlider.addEventListener('touchmove', drag);
      
      // Prevent image drag
      testimonialSlider.querySelectorAll('img').forEach(img => {
        img.addEventListener('dragstart', (e) => e.preventDefault());
      });
      
      function dragStart(e) {
        if (e.type === 'touchstart') {
          startPos = e.touches[0].clientX;
        } else {
          startPos = e.clientX;
          e.preventDefault();
        }
        
        isDragging = true;
        animationID = requestAnimationFrame(animation);
        testimonialSlider.classList.add('grabbing');
      }
      
      function drag(e) {
        if (isDragging) {
          const currentPosition = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
          currentTranslate = prevTranslate + currentPosition - startPos;
        }
      }
      
      function dragEnd() {
        isDragging = false;
        cancelAnimationFrame(animationID);
        
        const movedBy = currentTranslate - prevTranslate;
        
        if (movedBy < -100 && currentIndex < testimonialSlider.children.length - 1) {
          currentIndex += 1;
        }
        
        if (movedBy > 100 && currentIndex > 0) {
          currentIndex -= 1;
        }
        
        setPositionByIndex();
        testimonialSlider.classList.remove('grabbing');
      }
      
      function animation() {
        setSliderPosition();
        if (isDragging) requestAnimationFrame(animation);
      }
      
      function setSliderPosition() {
        testimonialSlider.style.transform = `translateX(${currentTranslate}px)`;
      }
      
      function setPositionByIndex() {
        currentTranslate = currentIndex * -testimonialSlider.children[0].offsetWidth;
        prevTranslate = currentTranslate;
        setSliderPosition();
      }
    }
  
    // ================ BACK TO TOP BUTTON ================
    const backToTopButton = document.querySelector('.back-to-top');
    
    if (backToTopButton) {
      window.addEventListener('scroll', debounce(() => {
        if (window.pageYOffset > 300) {
          backToTopButton.classList.add('visible');
        } else {
          backToTopButton.classList.remove('visible');
        }
      }, 100));
      
      backToTopButton.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  
    // ================ NOTIFICATION SYSTEM ================
    function showNotification(message, type = 'success') {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      // Show notification
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Hide after 3 seconds
      setTimeout(() => {
        notification.classList.remove('show');
        
        // Remove after animation
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
  
    // ================ VIEW OPTIONS TOGGLE ================
    const viewOptions = document.querySelectorAll('.view-option');
    const productsGrid = document.querySelector('.products-grid');
    
    viewOptions.forEach(option => {
      option.addEventListener('click', function() {
        if (this.dataset.view === 'grid') {
          productsGrid.classList.remove('list-view');
          productsGrid.classList.add('grid-view');
        } else {
          productsGrid.classList.remove('grid-view');
          productsGrid.classList.add('list-view');
        }
        
        viewOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
      });
    });
  
    // ================ LIVE CHAT ================
    const liveChatButton = document.querySelector('.live-chat-button');
    
    if (liveChatButton) {
      liveChatButton.addEventListener('click', () => {
        // In a real implementation, this would open your chat widget
        showNotification('Live chat is coming soon!', 'info');
      });
    }
  
    // ================ INITIALIZE COMPONENTS ================
    function init() {
      // Initialize any components that need setup
      updateCartCount();
      updateWishlistCount();
      
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        document.documentElement.style.setProperty('--transition-normal', '0s');
        document.documentElement.style.setProperty('--transition-fast', '0s');
      }
    }
  
    // Initialize the application
    init();
  });