// product.js

// Wait for the DOM to be fully loaded before executing JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Announcement Bar Close Functionality
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
    
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
    }

    // Product Gallery Thumbnail Switching
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    const mainProductImage = document.getElementById('mainProductImage');
    
    if (thumbnails.length && mainProductImage) {
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function() {
                // Remove active class from all thumbnails
                thumbnails.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked thumbnail
                this.classList.add('active');
                
                // Change main image (in a real app, this would use the data from the thumbnail)
                const imgSrc = this.querySelector('img').src;
                mainProductImage.src = imgSrc;
            });
        });
    }

    // Color Swatch Selection
    const colorSwatches = document.querySelectorAll('.color-swatch');
    
    if (colorSwatches.length) {
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', function() {
                // Remove selected class from all swatches
                colorSwatches.forEach(s => s.classList.remove('selected'));
                
                // Add selected class to clicked swatch
                this.classList.add('selected');
                
                // In a real app, you would update the product image based on color selection
                const color = this.getAttribute('data-color');
                console.log('Selected color:', color);
            });
        });
    }

    // Fabric Selection
    const fabricChoices = document.querySelectorAll('.fabric-choice');
    const productPrice = document.querySelector('.price-current');
    const basePrice = 149999; // Base price in KES
    
    if (fabricChoices.length && productPrice) {
        fabricChoices.forEach(choice => {
            choice.addEventListener('click', function() {
                // Remove selected class from all fabric choices
                fabricChoices.forEach(c => c.classList.remove('selected'));
                
                // Add selected class to clicked choice
                this.classList.add('selected');
                
                // Update price based on fabric selection
                const fabricPrice = parseInt(this.getAttribute('data-price'));
                const newPrice = basePrice + fabricPrice;
                productPrice.textContent = `KES ${newPrice.toLocaleString()}`;
            });
        });
    }

    // Size Selection
    const sizeChoices = document.querySelectorAll('.size-choice');
    
    if (sizeChoices.length && productPrice) {
        sizeChoices.forEach(choice => {
            choice.addEventListener('click', function() {
                // Remove selected class from all size choices
                sizeChoices.forEach(c => c.classList.remove('selected'));
                
                // Add selected class to clicked choice
                this.classList.add('selected');
                
                // Update price based on size selection
                const sizePrice = parseInt(this.getAttribute('data-price'));
                productPrice.textContent = `KES ${sizePrice.toLocaleString()}`;
            });
        });
    }

    // Quantity Selector
    const quantityInput = document.querySelector('.quantity-input');
    const decrementBtn = document.querySelector('.quantity-decrement');
    const incrementBtn = document.querySelector('.quantity-increment');
    
    if (quantityInput && decrementBtn && incrementBtn) {
        decrementBtn.addEventListener('click', function(e) {
            e.preventDefault();
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
        
        incrementBtn.addEventListener('click', function(e) {
            e.preventDefault();
            let currentValue = parseInt(quantityInput.value);
            if (currentValue < 10) {
                quantityInput.value = currentValue + 1;
            }
        });
    }

    // Add to Cart Button
    const addToCartBtn = document.querySelector('.add-to-cart');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            // In a real app, this would add the product to the cart
            console.log('Product added to cart');
            
            // Update cart count
            const cartCount = document.querySelector('.cart-count');
            if (cartCount) {
                let currentCount = parseInt(cartCount.textContent);
                cartCount.textContent = currentCount + 1;
            }
            
            // Show a confirmation (in a real app, this would be more sophisticated)
            alert('Item added to cart!');
        });
    }

    // Wishlist Toggle
    const wishlistToggle = document.querySelector('.wishlist-toggle');
    
    if (wishlistToggle) {
        wishlistToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            
            // Update icon and wishlist count
            const icon = this.querySelector('i');
            const wishlistCount = document.querySelector('.wishlist-count');
            
            if (this.classList.contains('active')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                if (wishlistCount) {
                    let currentCount = parseInt(wishlistCount.textContent);
                    wishlistCount.textContent = currentCount + 1;
                }
                console.log('Added to wishlist');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                if (wishlistCount) {
                    let currentCount = parseInt(wishlistCount.textContent);
                    wishlistCount.textContent = Math.max(0, currentCount - 1);
                }
                console.log('Removed from wishlist');
            }
        });
    }

    // Tab Switching Functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    if (tabButtons.length && tabPanes.length) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                this.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // AR Modal Functionality
    const arButton = document.querySelector('.ar-button');
    const arModal = document.getElementById('arModal');
    const arClose = document.querySelector('.ar-close');
    
    if (arButton && arModal && arClose) {
        arButton.addEventListener('click', function() {
            arModal.style.display = 'block';
        });
        
        arClose.addEventListener('click', function() {
            arModal.style.display = 'none';
        });
        
        window.addEventListener('click', function(event) {
            if (event.target === arModal) {
                arModal.style.display = 'none';
            }
        });
    }

    // Video Modal Functionality
    const videoButton = document.querySelector('.video-button');
    const videoModal = document.getElementById('videoModal');
    const videoClose = document.querySelector('.video-close');
    
    if (videoButton && videoModal && videoClose) {
        videoButton.addEventListener('click', function() {
            videoModal.style.display = 'block';
            // In a real app, you would play the video here
        });
        
        videoClose.addEventListener('click', function() {
            videoModal.style.display = 'none';
            // In a real app, you would pause the video here
        });
        
        window.addEventListener('click', function(event) {
            if (event.target === videoModal) {
                videoModal.style.display = 'none';
                // In a real app, you would pause the video here
            }
        });
    }

    // Search Toggle Functionality
    const searchToggle = document.querySelector('.search-toggle');
    const searchContainer = document.querySelector('.search-container');
    
    if (searchToggle && searchContainer) {
        searchToggle.addEventListener('click', function() {
            searchContainer.classList.toggle('active');
        });
    }

    // Social Sharing Buttons
    const shareButtons = document.querySelectorAll('.share-button');
    
    if (shareButtons.length) {
        shareButtons.forEach(button => {
            button.addEventListener('click', function() {
                const platform = this.classList.contains('facebook') ? 'Facebook' :
                               this.classList.contains('twitter') ? 'Twitter' :
                               this.classList.contains('pinterest') ? 'Pinterest' :
                               this.classList.contains('whatsapp') ? 'WhatsApp' : 'Email';
                
                console.log(`Sharing to ${platform}`);
                // In a real app, this would open the appropriate sharing dialog
            });
        });
    }

    // Bundle Checkbox Functionality
    const bundleCheckboxes = document.querySelectorAll('.bundle-items input[type="checkbox"]');
    const bundleAddBtn = document.querySelector('.bundle-add');
    
    if (bundleCheckboxes.length && bundleAddBtn) {
        bundleCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateBundleTotal);
        });
        
        bundleAddBtn.addEventListener('click', function() {
            const selectedItems = Array.from(bundleCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.id);
            
            console.log('Adding bundle to cart:', selectedItems);
            alert('Bundle added to cart!');
        });
    }
    
    function updateBundleTotal() {
        // In a real app, this would calculate the total based on selected items
        console.log('Updating bundle total');
    }

    // Dropdown Menu Functionality
    const dropdownTriggers = document.querySelectorAll('.nav-item.dropdown');
    
    if (dropdownTriggers.length) {
        dropdownTriggers.forEach(trigger => {
            trigger.addEventListener('mouseenter', function() {
                this.querySelector('.dropdown-menu').style.display = 'block';
            });
            
            trigger.addEventListener('mouseleave', function() {
                this.querySelector('.dropdown-menu').style.display = 'none';
            });
        });
    }

    // Review Rating Stars
    const starInputs = document.querySelectorAll('.rating-input input');
    const starLabels = document.querySelectorAll('.rating-input .star-label');
    
    if (starInputs.length && starLabels.length) {
        starLabels.forEach(label => {
            label.addEventListener('click', function() {
                const rating = this.previousElementSibling.value;
                console.log('Selected rating:', rating);
            });
        });
    }

    // FAQ Question Toggle
    const questionHeaders = document.querySelectorAll('.question-header');
    
    if (questionHeaders.length) {
        questionHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                answer.style.display = answer.style.display === 'block' ? 'none' : 'block';
            });
        });
    }

    // Initialize any other components as needed
    initImageZoom();
    initARViewer();
});

// Image Zoom Functionality
function initImageZoom() {
    const zoomButton = document.querySelector('.zoom-button');
    const mainImage = document.getElementById('mainProductImage');
    
    if (zoomButton && mainImage) {
        zoomButton.addEventListener('click', function() {
            // In a real app, this would open a lightbox with a zoomed image
            console.log('Zooming image');
        });
    }
}

// AR Viewer Initialization (placeholder)
function initARViewer() {
    // In a real app, this would initialize an AR viewer like model-viewer
    console.log('Initializing AR viewer');
}