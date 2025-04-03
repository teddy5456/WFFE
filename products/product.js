document.addEventListener('DOMContentLoaded', function() {
    // 1. Get product ID from session storage
    const productId = sessionStorage.getItem('selectedProductId');
    
    if (!productId) {
        console.error('No product ID found in session storage');
        window.location.href = '/';
        return;
    }

    // 2. Fetch product data
    fetchProductData(productId)
        .then(product => {
            if (!product) {
                throw new Error('No product data received');
            }
            
            // 3. Populate the page with data
            populateProductPage(product);
            
            // 4. Initialize interactive elements
            initProductInteractions();
        })
        .catch(error => {
            console.error('Error loading product:', error);
            showErrorState();
        });
});

async function fetchProductData(productId) {
    try {
        const response = await fetch(`http://localhost:8000/api/products/${productId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const productData = await response.json();
        console.log("Fetched data:", productData);

        // Validate required fields
        if (!productData?.product_id || !productData?.name || !productData?.price) {
            throw new Error('Invalid product data received');
        }
        
        return productData;
    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
}

// Updated populateProductPage function to match your JSON structure
function populateProductPage(product) {
    const productContainer = document.querySelector('.product-container');
    if (!productContainer) return;

    // 1. Update product gallery section
    updateProductGallery(product);

    // 2. Update product details section
    updateProductDetails(product);

    // 3. Update product tabs
    updateProductTabs(product);

    // 4. Initialize interactive elements
    initProductInteractions();

    if (product.is_customizable) {
        populateProductOptions(product);
    }
}

function updateProductGallery(product) {
    // Update main image (use primary image or first image)
    const mainImg = document.querySelector('.main-image');
    const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
    if (mainImg && primaryImage) {
        mainImg.src = primaryImage.image_url;
        mainImg.alt = primaryImage.alt_text || product.name;
    }

    // Update thumbnails
    const thumbnailsContainer = document.querySelector('.gallery-thumbnails');
    if (thumbnailsContainer) {
        // Clear existing thumbnails (except video and AR)
        const existingThumbs = thumbnailsContainer.querySelectorAll('.thumbnail-item:not(.video-thumbnail):not(.ar-thumbnail)');
        existingThumbs.forEach(thumb => thumb.remove());

        // Add new thumbnails, sorted by display_order
        const sortedImages = [...product.images].sort((a, b) => a.display_order - b.display_order);
        
        sortedImages.forEach((image, index) => {
            const thumb = document.createElement('button');
            thumb.className = 'thumbnail-item' + (index === 0 ? ' active' : '');
            thumb.innerHTML = `<img src="${image.image_url}" alt="${image.alt_text || product.name}" loading="lazy">`;
            
            thumb.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                if (mainImg) {
                    mainImg.src = image.image_url;
                    mainImg.alt = image.alt_text || product.name;
                }
            });
            
            // Insert before video thumbnail if it exists
            const videoThumb = thumbnailsContainer.querySelector('.video-thumbnail');
            if (videoThumb) {
                thumbnailsContainer.insertBefore(thumb, videoThumb);
            } else {
                thumbnailsContainer.appendChild(thumb);
            }
        });
    }

    // Update badges based on product flags
    const badgesContainer = document.querySelector('.image-badges');
    if (badgesContainer) {
        badgesContainer.innerHTML = '';
        
        if (product.is_new) {
            badgesContainer.innerHTML += '<span class="badge new">New Arrival</span>';
        }
        if (product.is_bestseller) {
            badgesContainer.innerHTML += '<span class="badge bestseller">Bestseller</span>';
        }
        if (product.is_featured) {
            badgesContainer.innerHTML += '<span class="badge featured">Featured</span>';
        }
    }
}



function updateProductDetails(product) {
    // Update product header
    updateTextContent('.product-title', product.name);
    updateTextContent('.product-subtitle', product.subtitle || '');
    updateTextContent('.current-category', product.category_name);
    updateTextContent('.current-subcategory', product.subcategory_name)
    updateTextContent('.current', product.name);

    
    // Update rating and reviews
    if (product.rating && product.review_count) {
        const ratingContainer = document.querySelector('.rating-container');
        if (ratingContainer) {
            // Update numeric rating
            const ratingValue = ratingContainer.querySelector('.rating-value');
            if (ratingValue) ratingValue.textContent = product.rating.toFixed(1);
            
            // Update star rating
            const starsContainer = ratingContainer.querySelector('.star-rating');
            if (starsContainer) {
                starsContainer.innerHTML = '';
                const fullStars = Math.floor(product.rating);
                const hasHalfStar = product.rating % 1 >= 0.5;
                
                for (let i = 0; i < 5; i++) {
                    const star = document.createElement('i');
                    if (i < fullStars) {
                        star.className = 'fas fa-star';
                    } else if (i === fullStars && hasHalfStar) {
                        star.className = 'fas fa-star-half-alt';
                    } else {
                        star.className = 'far fa-star';
                    }
                    starsContainer.appendChild(star);
                }
            }
            
            // Update review count
            const reviewLink = ratingContainer.querySelector('.review-count');
            if (reviewLink) {
                reviewLink.textContent = `${product.review_count} Reviews`;
            }
        }
    }
    
    // Update SKU
    updateTextContent('.product-sku span', `SKU: ${product.sku || 'N/A'}`);
    
    // Update pricing
    updateTextContent('.price-current', formatCurrency(product.price));
    if (product.original_price && product.original_price > product.price) {
        updateTextContent('.price-original', formatCurrency(product.original_price));
        updateTextContent('.price-discount', `Save ${formatCurrency(product.original_price - product.price)}`);
        showElement('.price-original');
        showElement('.price-discount');
    } else {
        hideElement('.price-original');
        hideElement('.price-discount');
    }
    
    // Update stock information
    const stockElement = document.querySelector('.availability-status');
    if (stockElement) {
        if (product.stock_quantity <= 0) {
            stockElement.className = 'availability-status out-of-stock';
            stockElement.innerHTML = '<i class="fas fa-times-circle"></i> Out of Stock';
        } else if (product.stock_quantity <= (product.low_stock_threshold || 5)) {
            stockElement.className = 'availability-status low-stock';
            stockElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> Low Stock (Only ${product.stock_quantity} left)`;
        } else {
            stockElement.className = 'availability-status in-stock';
            stockElement.innerHTML = '<i class="fas fa-check-circle"></i> In Stock';
        }
    }
    
    // Update dimensions
    if (product.dimensions) {
        updateTextContent('.dimensions', product.dimensions);
    }
    
    // Update weight
    if (product.weight_kg) {
        updateTextContent('.weight-kg', `${product.weight_kg} kg`);
    }
    
    // Update warranty
    if (product.warranty_period) {
        updateTextContent('.warranty-period', product.warranty_period);
    }
    
    // Update trust badges
    const trustBadges = [
        { icon: 'fa-shield-alt', text: `${product.warranty_period || '2-Year'} Warranty` },
        { icon: 'fa-leaf', text: 'Premium Materials' },
        { icon: 'fa-hands-helping', text: 'Quality Craftsmanship' },
        { icon: 'fa-exchange-alt', text: 'Easy Returns' }
    ];
    
    const trustContainer = document.querySelector('.trust-badges');
    if (trustContainer) {
        trustContainer.innerHTML = '';
        trustBadges.forEach(badge => {
            trustContainer.innerHTML += `
                <div class="trust-badge">
                    <i class="fas ${badge.icon}"></i>
                    <span>${badge.text}</span>
                </div>
            `;
        });
    }
    
    // Update product highlights
    const highlights = [
        { icon: 'fa-truck', title: 'Free Delivery', text: 'Within Nairobi for orders over KES 50,000' },
        { icon: 'fa-ruler-combined', title: 'Perfect Dimensions', text: product.dimensions || 'Ideal size for any space' },
        { icon: 'fa-palette', title: 'Premium Materials', text: product.specifications?.find(s => s.spec_name === 'Upholstery Material')?.spec_value || 'Luxurious fabrics' }
    ];
    
    const highlightsContainer = document.querySelector('.product-highlights');
    if (highlightsContainer) {
        highlightsContainer.innerHTML = '';
        highlights.forEach(highlight => {
            highlightsContainer.innerHTML += `
                <div class="highlight-item">
                    <i class="fas ${highlight.icon}"></i>
                    <div class="highlight-content">
                        <h4>${highlight.title}</h4>
                        <p>${highlight.text}</p>
                    </div>
                </div>
            `;
        });
    }
}

function populateProductOptions(product) {
    if (!product.options || product.options.length === 0) {
        console.log('No product options available');
        return;
    }

    // Group options by type
    const optionsByType = {};
    product.options.forEach(option => {
        if (!optionsByType[option.option_type]) {
            optionsByType[option.option_type] = [];
        }
        optionsByType[option.option_type].push(option);
    });

    // Color Options
    if (optionsByType['color']) {
        const colorContainer = document.querySelector('.color-swatches');
        if (colorContainer) {
            colorContainer.innerHTML = '';
            
            optionsByType['color'].forEach((color, index) => {
                const isDefault = color.is_default || index === 0;
                const colorElement = document.createElement('div');
                colorElement.className = `color-swatch ${isDefault ? 'selected' : ''}`;
                colorElement.dataset.color = color.name.toLowerCase().replace(/\s+/g, '-');
                colorElement.dataset.image = color.image_url || '';
                
                // Get hex color from name or use default
                const hexColor = getColorHex(color.name);
                
                colorElement.innerHTML = `
                    <div class="swatch-color" style="background-color: ${hexColor};"></div>
                    <span class="swatch-label">${color.name}</span>
                `;
                
                colorElement.addEventListener('click', function() {
                    document.querySelectorAll('.color-swatch').forEach(swatch => {
                        swatch.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    
                    // Update main image if this color has a specific image
                    if (this.dataset.image) {
                        const mainImg = document.querySelector('.main-image');
                        if (mainImg) {
                            mainImg.src = this.dataset.image;
                            mainImg.alt = `${product.name} in ${color.name}`;
                        }
                    }
                });
                
                colorContainer.appendChild(colorElement);
            });
        }
    }

    // Fabric Options
    if (optionsByType['fabric']) {
        const fabricContainer = document.querySelector('.fabric-choices');
        if (fabricContainer) {
            fabricContainer.innerHTML = '';
            
            optionsByType['fabric'].forEach((fabric, index) => {
                const isDefault = fabric.is_default || index === 0;
                const fabricElement = document.createElement('div');
                fabricElement.className = `fabric-choice ${isDefault ? 'selected' : ''}`;
                fabricElement.dataset.fabric = fabric.name.toLowerCase().replace(/\s+/g, '-');
                fabricElement.dataset.price = fabric.price_adjustment || 0;
                
                fabricElement.innerHTML = `
                    <div class="fabric-info">
                        <h4 class="fabric-name">${fabric.name}</h4>
                        <p class="fabric-description">${fabric.description || ''}</p>
                    </div>
                    <div class="fabric-price">${formatPriceAdjustment(fabric.price_adjustment)}</div>
                `;
                
                fabricElement.addEventListener('click', function() {
                    document.querySelectorAll('.fabric-choice').forEach(choice => {
                        choice.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    updateTotalPrice(product);
                });
                
                fabricContainer.appendChild(fabricElement);
            });
        }
    }

    // Size Options
    if (optionsByType['size']) {
        const sizeContainer = document.querySelector('.size-choices');
        if (sizeContainer) {
            sizeContainer.innerHTML = '';
            
            optionsByType['size'].forEach((size, index) => {
                const isDefault = size.is_default || index === 0;
                const sizeElement = document.createElement('div');
                sizeElement.className = `size-choice ${isDefault ? 'selected' : ''}`;
                sizeElement.dataset.size = size.name.toLowerCase().replace(/\s+/g, '-');
                sizeElement.dataset.dimensions = size.description || '';
                sizeElement.dataset.price = size.price_adjustment || product.price;
                
                sizeElement.innerHTML = `
                    <div class="size-info">
                        <h4 class="size-name">${size.name}</h4>
                        <p class="size-dimensions">${size.description || ''}</p>
                    </div>
                    <div class="size-price">${formatCurrency(sizeElement.dataset.price)}</div>
                `;
                
                sizeElement.addEventListener('click', function() {
                    document.querySelectorAll('.size-choice').forEach(choice => {
                        choice.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    updateTotalPrice(product);
                });
                
                sizeContainer.appendChild(sizeElement);
            });
        }
    }

    // Customization Options (features)
    if (optionsByType['feature']) {
        const customizationContainer = document.querySelector('.customization-choices');
        if (customizationContainer) {
            customizationContainer.innerHTML = '';
            
            optionsByType['feature'].forEach(feature => {
                const featureElement = document.createElement('div');
                featureElement.className = 'customization-choice';
                
                featureElement.innerHTML = `
                    <label class="customization-label">
                        <input type="checkbox" name="${feature.name.toLowerCase().replace(/\s+/g, '-')}" 
                               class="customization-checkbox" data-price="${feature.price_adjustment || 0}">
                        <span class="customization-name">${feature.name} (${formatPriceAdjustment(feature.price_adjustment)})</span>
                    </label>
                `;
                
                featureElement.querySelector('input').addEventListener('change', function() {
                    updateTotalPrice(product);
                });
                
                customizationContainer.appendChild(featureElement);
            });
        }
    }

    // Initialize price calculation
    updateTotalPrice(product);
}

function updateTotalPrice(product) {
    // Get base price from selected size or default to product price
    let basePrice = product.price;
    const selectedSize = document.querySelector('.size-choice.selected');
    if (selectedSize) {
        basePrice = parseFloat(selectedSize.dataset.price);
    }
    
    // Add fabric price adjustment
    const selectedFabric = document.querySelector('.fabric-choice.selected');
    if (selectedFabric) {
        basePrice += parseFloat(selectedFabric.dataset.price);
    }
    
    // Add customization prices
    let customizationsTotal = 0;
    document.querySelectorAll('.customization-checkbox:checked').forEach(checkbox => {
        customizationsTotal += parseFloat(checkbox.dataset.price);
    });
    
    const totalPrice = basePrice + customizationsTotal;
    
    // Update displayed price
    const priceElement = document.querySelector('.price-current');
    if (priceElement) {
        priceElement.textContent = formatCurrency(totalPrice);
    }
}

// Helper function to get hex color from color name
function getColorHex(colorName) {
    const colorMap = {
        'Midnight Blue': '#1e3a8a',
        'Ruby Red': '#831843',
        'Emerald Green': '#064e3b',
        'Charcoal Black': '#1c1917',
        'Blush Pink': '#fce7f3',
        'Oatmeal': '#e0d5c7',
        'Sage': '#8a9a6b'
    };
    return colorMap[colorName] || '#cccccc';
}

// Helper function to format price adjustments
function formatPriceAdjustment(amount) {
    if (!amount) return 'Included';
    amount = parseFloat(amount);
    if (amount > 0) return `+${formatCurrency(amount)}`;
    if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
    return 'Included';
}

// Helper function to format currency
function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount).replace('KES', 'KES ');
}

function updateProductTabs(product) {
    // Update description tab
    const descriptionTab = document.querySelector('#description .description-content');
    if (descriptionTab) {
        descriptionTab.innerHTML = `
            <div class="description-section">
                <h3>Product Description</h3>
                <p>${product.description || 'No description available.'}</p>
            </div>
            
            ${product.short_description ? `
            <div class="description-section">
                <h3>Key Features</h3>
                <p>${product.short_description}</p>
            </div>
            ` : ''}
            
            <div class="description-section">
                <h3>Care Instructions</h3>
                <p>Please refer to the product documentation for specific care instructions.</p>
                
                <div class="care-instructions">
                    <div class="care-item do">
                        <h4><i class="fas fa-check-circle"></i> Do</h4>
                        <ul>
                            <li>Vacuum regularly with upholstery attachment</li>
                            <li>Blot spills immediately with clean cloth</li>
                            <li>Rotate cushions periodically</li>
                        </ul>
                    </div>
                    <div class="care-item dont">
                        <h4><i class="fas fa-times-circle"></i> Don't</h4>
                        <ul>
                            <li>Use harsh chemicals or abrasive cleaners</li>
                            <li>Expose to direct sunlight for prolonged periods</li>
                            <li>Rub stains vigorously</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Update specifications tab
    const specsTab = document.querySelector('#specifications .specs-content');
    if (specsTab) {
        let specsHTML = '<div class="specs-section"><h3>Technical Specifications</h3><table class="specs-table">';
        
        if (product.specifications && product.specifications.length > 0) {
            // Sort specifications by display_order
            const sortedSpecs = [...product.specifications].sort((a, b) => a.display_order - b.display_order);
            
            sortedSpecs.forEach(spec => {
                specsHTML += `
                    <tr>
                        <th>${spec.spec_name}</th>
                        <td>${spec.spec_value}</td>
                    </tr>
                `;
            });
        } else {
            specsHTML += '<tr><td colspan="2">No specifications available</td></tr>';
        }
        
        specsHTML += '</table></div>';
        
        // Add dimensions section
        specsHTML += `
            <div class="specs-section">
                <h3>Dimensions</h3>
                <div class="dimension-diagram">
                    <div class="dimension-list">
                        <p><strong>Product Dimensions:</strong> ${product.dimensions || 'N/A'}</p>
                        <p><strong>Weight:</strong> ${product.weight_kg ? `${product.weight_kg} kg` : 'N/A'}</p>
                    </div>
                </div>
            </div>
        `;
        
        specsTab.innerHTML = specsHTML;
    }
    
    // Update reviews tab (simplified version)
    updateReviewsTab(product);
}

function updateReviewsTab(product) {
    const reviewsTab = document.querySelector('#reviews .reviews-content');
    if (!reviewsTab) return;
    
    reviewsTab.innerHTML = `
        <div class="reviews-summary">
            <div class="summary-overview">
                <div class="overview-rating">
                    <div class="rating-value">${product.rating?.toFixed(1) || '0.0'}</div>
                    <div class="rating-stars">
                        ${generateStarRating(product.rating || 0)}
                    </div>
                    <div class="rating-count">${product.review_count || 0} reviews</div>
                </div>
                <div class="overview-distribution">
                    ${[5, 4, 3, 2, 1].map(stars => `
                        <div class="distribution-bar">
                            <span class="bar-label">${stars} star</span>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${getStarPercentage(stars, product.rating || 0)}%;"></div>
                            </div>
                            <span class="bar-percent">${getStarPercentage(stars, product.rating || 0)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="summary-highlights">
                <h4>What customers say</h4>
                <div class="highlight-tags">
                    <button class="highlight-tag">Comfortable (32)</button>
                    <button class="highlight-tag">High quality (28)</button>
                    <button class="highlight-tag">Beautiful design (24)</button>
                </div>
            </div>
        </div>
        
        <div class="review-list">
            <div class="review-item">
                <div class="review-content">
                    <p>No reviews yet. Be the first to review this product!</p>
                </div>
            </div>
        </div>
        
        <div class="review-form-container">
            <h3>Write a Review</h3>
            <form class="review-form">
                <!-- Review form would be implemented here -->
            </form>
        </div>
    `;
}

// Helper functions
function generateStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    
    return stars;
}

function getStarPercentage(star, averageRating) {
    // Simplified percentage calculation for demo
    if (star === 5) return Math.min(100, Math.round(averageRating * 20));
    if (star === 4) return Math.min(100, Math.round((averageRating - 4) * 20));
    return Math.round((5 - star) * 10);
}

function formatCurrency(amount) {
    return typeof amount === 'number' ? `KES ${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'KES 0.00';
}

function updateTextContent(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
}

function showElement(selector) {
    const element = document.querySelector(selector);
    if (element) element.style.display = 'block';
}

function hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) element.style.display = 'none';
}

// Initialize product interactions
function initProductInteractions() {
    // Thumbnail click handlers
    document.querySelectorAll('.thumbnail-item').forEach(thumb => {
        thumb.addEventListener('click', function() {
            const img = this.querySelector('img');
            if (img) {
                const mainImg = document.querySelector('.main-image');
                if (mainImg) {
                    mainImg.src = img.src;
                    mainImg.alt = img.alt;
                }
                document.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Color swatch selection
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', function() {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
            // Here you would update the main image based on color selection
        });
    });

    // Quantity selector
    document.querySelector('.quantity-decrement')?.addEventListener('click', function(e) {
        e.preventDefault();
        const input = document.querySelector('.quantity-input');
        if (input && parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
        }
    });

    document.querySelector('.quantity-increment')?.addEventListener('click', function(e) {
        e.preventDefault();
        const input = document.querySelector('.quantity-input');
        if (input) {
            input.value = parseInt(input.value) + 1;
        }
    });
}