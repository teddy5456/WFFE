// product-landing.js

document.addEventListener('DOMContentLoaded', function() {
    // Announcement Bar Close
    const announcementClose = document.querySelector('.announcement-close');
    const announcementBar = document.querySelector('.announcement-bar');
    
    if (announcementClose && announcementBar) {
        announcementClose.addEventListener('click', function() {
            announcementBar.style.display = 'none';
        });
    }

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (mobileMenuClose && mobileMenu) {
        mobileMenuClose.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Mobile Dropdown Menus
    const mobileDropdowns = document.querySelectorAll('.mobile-dropdown');
    
    mobileDropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        link.addEventListener('click', function(e) {
            e.preventDefault();
            dropdown.classList.toggle('active');
        });
    });

    // Search Toggle
    const searchToggle = document.querySelector('.search-toggle');
    const searchContainer = document.querySelector('.search-container');
    
    if (searchToggle && searchContainer) {
        searchToggle.addEventListener('click', function() {
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) {
                searchContainer.querySelector('input').focus();
            }
        });
    }

    // Product Quick View
    const quickViewButtons = document.querySelectorAll('.quick-view');
    const quickViewModal = document.getElementById('quickViewModal');
    const quickViewClose = document.querySelector('.quickview-close');
    
    if (quickViewButtons.length && quickViewModal) {
        quickViewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.getAttribute('data-product');
                loadQuickView(productId);
                quickViewModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            });
        });
    }
    
    if (quickViewClose && quickViewModal) {
        quickViewClose.addEventListener('click', function() {
            quickViewModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === quickViewModal) {
            quickViewModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // Add to Cart
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartCount = document.querySelector('.cart-count');
    
    if (addToCartButtons.length) {
        addToCartButtons.forEach(button => {
            button.addEventListener('click', function() {
                // In a real app, this would add the product to cart
                console.log('Added to cart:', this.closest('.product-card').querySelector('.product-title').textContent);
                
                // Update cart count
                if (cartCount) {
                    let currentCount = parseInt(cartCount.textContent) || 0;
                    cartCount.textContent = currentCount + 1;
                    cartCount.classList.add('updated');
                    setTimeout(() => cartCount.classList.remove('updated'), 300);
                }
                
                // Show confirmation
                showNotification('Item added to cart!');
            });
        });
    }

    // Add to Wishlist
    const wishlistButtons = document.querySelectorAll('.add-to-wishlist');
    const wishlistCount = document.querySelector('.wishlist-count');
    
    if (wishlistButtons.length) {
        wishlistButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const icon = this.querySelector('i');
                
                if (icon.classList.contains('far')) {
                    // Add to wishlist
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    if (wishlistCount) {
                        let currentCount = parseInt(wishlistCount.textContent) || 0;
                        wishlistCount.textContent = currentCount + 1;
                    }
                    showNotification('Added to wishlist!');
                } else {
                    // Remove from wishlist
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                    if (wishlistCount) {
                        let currentCount = parseInt(wishlistCount.textContent) || 0;
                        wishlistCount.textContent = Math.max(0, currentCount - 1);
                    }
                    showNotification('Removed from wishlist');
                }
            });
        });
    }

    // Newsletter Form
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input').value;
            console.log('Subscribed with email:', email);
            this.querySelector('input').value = '';
            showNotification('Thanks for subscribing!');
        });
    }

    // Testimonial Slider
    initTestimonialSlider();

    // Helper Functions
    function loadQuickView(productId) {
        // In a real app, this would fetch product data from an API
        console.log('Loading quick view for product:', productId);
        const quickViewContent = document.querySelector('.quickview-content');
        
        // Simulate loading
        quickViewContent.innerHTML = `
            <div class="quickview-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading product details...</p>
            </div>
        `;
        
        // Simulate API call delay
        setTimeout(() => {
            quickViewContent.innerHTML = `
                <div class="quickview-product">
                    <div class="quickview-image">
                        <img src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92" alt="Product ${productId}" loading="lazy">
                    </div>
                    <div class="quickview-details">
                        <h3>Product ${productId}</h3>
                        <div class="quickview-price">KES 149,999</div>
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
                        <p class="quickview-description">This is a detailed description of the product that would be loaded from the database.</p>
                        <button class="quickview-add-to-cart">Add to Cart</button>
                    </div>
                </div>
            `;
            
            // Add event listener to the quick view add to cart button
            const quickViewAddToCart = document.querySelector('.quickview-add-to-cart');
            if (quickViewAddToCart) {
                quickViewAddToCart.addEventListener('click', function() {
                    if (cartCount) {
                        let currentCount = parseInt(cartCount.textContent) || 0;
                        cartCount.textContent = currentCount + 1;
                    }
                    quickViewModal.style.display = 'none';
                    document.body.style.overflow = '';
                    showNotification('Item added to cart!');
                });
            }
        }, 800);
    }

    function initTestimonialSlider() {
        // In a real app, this would initialize a proper slider (like Slick, Swiper, etc.)
        const testimonialSlider = document.querySelector('.testimonials-slider');
        if (testimonialSlider) {
            // This is just a placeholder for actual slider implementation
            console.log('Testimonial slider initialized');
        }
    }

    function showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});