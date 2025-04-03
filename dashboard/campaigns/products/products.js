document.addEventListener('DOMContentLoaded', function() {
    console.log('Started');
   
    let productData = {};

    async function fetchProductData() {
        try {
            console.log("fetching product data");
            const response = await fetch('http://localhost:8000/api/products');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            productData = await response.json();
            init();
        }
        catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        }
    }

    function init() {
        // Assuming productData is an array of products
        const tableBody = document.querySelector('tbody'); // Select your table body
        
        productData.forEach(product => {
            const row = document.createElement('tr');
            
            // Product name cell
            const nameCell = document.createElement('td');
            const productDiv = document.createElement('div');
            productDiv.className = 'product-cell';
            const productSpan = document.createElement('span');
            productSpan.className = 'product-cell-text';
            productSpan.textContent = product.name || 'Premium Lounge Chair'; // Use actual data
            productDiv.appendChild(productSpan);
            nameCell.appendChild(productDiv);
            
            // Product code cell
            const codeCell = document.createElement('td');
            codeCell.textContent = product.code || 'WFFE-CH-001'; // Use actual data
            
            // Stock cell
            const stockCell = document.createElement('td');
            const stockSpan = document.createElement('span');
            stockSpan.className = `stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`;
            stockSpan.textContent = product.stock || '42'; // Use actual data
            stockCell.appendChild(stockSpan);
            
            // Date cell
            const dateCell = document.createElement('td');
            dateCell.textContent = product.date ? formatDate(product.date) : 'Jun 15, 2023'; // Use actual data
            
            // Action cell
            const actionCell = document.createElement('td');
            const actionButton = document.createElement('button');
            actionButton.className = 'action-btn inventory';
            actionButton.innerHTML = '<i class="fas fa-boxes"></i> Update';
            actionCell.appendChild(actionButton);
            
            // Append all cells to the row
            row.appendChild(nameCell);
            row.appendChild(codeCell);
            row.appendChild(stockCell);
            row.appendChild(dateCell);
            row.appendChild(actionCell);
            
            // Append row to table body
            tableBody.appendChild(row);
        });
    }

    // Helper function to format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    // Actually call the fetch function
    fetchProductData();
});