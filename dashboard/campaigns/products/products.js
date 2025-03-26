document.addEventListener('DOMContentLoaded', function() {
    // Modal Handling
    const productModal = document.getElementById('product-modal');
    const addProductBtn = document.getElementById('add-product');
    const closeModalBtn = document.querySelector('#product-modal .close-btn');
    const cancelProductBtn = document.getElementById('cancel-product');

    // Show modal
    addProductBtn.addEventListener('click', () => {
        productModal.style.display = 'block';
    });

    // Hide modal
    closeModalBtn.addEventListener('click', () => {
        productModal.style.display = 'none';
    });

    cancelProductBtn.addEventListener('click', () => {
        productModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.style.display = 'none';
        }
    });

    // Image Upload Handling
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('product-images');
    const imagePreview = document.getElementById('image-preview');

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFiles);
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('highlight');
    }

    function unhighlight() {
        dropZone.classList.remove('highlight');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }

    function handleFiles(e) {
        const files = e.target.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'image-preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <span class="remove-image"><i class="fas fa-times"></i></span>
                    `;
                    imagePreview.appendChild(previewItem);
                    
                    // Add remove functionality
                    previewItem.querySelector('.remove-image').addEventListener('click', () => {
                        previewItem.remove();
                    });
                };
                reader.readAsDataURL(file);
            }
        }
    }

    // Form Submission
    const productForm = document.getElementById('product-form');
    productForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Form validation
        const productName = document.getElementById('product-name').value;
        if (!productName) {
            alert('Please enter a product name');
            return;
        }

        // Here you would typically send data to the server
        console.log('Product form submitted');
        
        // For demo purposes
        alert('Product saved successfully!');
        productModal.style.display = 'none';
        productForm.reset();
        imagePreview.innerHTML = '';
    });

    // Search functionality
    const productSearch = document.getElementById('product-search');
    productSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const productName = card.querySelector('h3').textContent.toLowerCase();
            if (productName.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Filter functionality
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    
    [categoryFilter, statusFilter].forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    function applyFilters() {
        const categoryValue = categoryFilter.value;
        const statusValue = statusFilter.value;
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const cardCategory = card.dataset.category || '';
            const cardStatus = card.querySelector('.product-status').classList.contains(statusValue) ? 
                              statusValue : 
                              card.querySelector('.product-status').textContent.toLowerCase().replace(' ', '-');
            
            const categoryMatch = !categoryValue || cardCategory === categoryValue;
            const statusMatch = !statusValue || cardStatus === statusValue;
            
            if (categoryMatch && statusMatch) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }
});