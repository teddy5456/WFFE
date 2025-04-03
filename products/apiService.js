// apiService.js

class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost8000/api';
    }

    async fetchCategories() {
        try {
            const response = await fetch(`${this.baseUrl}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            return await response.json();
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    async fetchProducts(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${this.baseUrl}/products?${queryString}`);
            if (!response.ok) throw new Error('Failed to fetch products');
            return await response.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    async fetchProductDetails(productId) {
        try {
            const response = await fetch(`${this.baseUrl}/products/${productId}`);
            if (!response.ok) throw new Error('Failed to fetch product details');
            return await response.json();
        } catch (error) {
            console.error('Error fetching product details:', error);
            throw error;
        }
    }
}

const apiService = new ApiService();