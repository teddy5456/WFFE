import json
import mysql.connector
from mysql.connector import Error
from typing import Optional, Dict, List, Union

class Product:
    def __init__(self):
        """Initialize database connection"""
        try:
            self.connection = mysql.connector.connect(
                host='localhost',
                database='waikas_db',
                user='teddy',  # Change these credentials
                password='0857',
                autocommit=False  # Explicitly manage transactions
            )
        except Error as e:
            print("Error while connecting to MySQL", e)
            raise  # Re-raise the exception to handle it at a higher level
    
    def __del__(self):
        """Clean up database connection when object is destroyed"""
        if hasattr(self, 'connection') and self.connection.is_connected():
            self.connection.close()

    def _execute_query(self, query: str, params: Optional[tuple] = None, fetch: bool = False) -> Union[List[Dict], int]:
        """
        Execute a SQL query with parameters
        :param query: SQL query string
        :param params: Tuple of parameters for the query
        :param fetch: Whether to fetch results or return row count
        :return: Either fetched results or row count
        """
        cursor = None
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params or ())
            
            if fetch:
                result = cursor.fetchall()
            else:
                self.connection.commit()
                result = cursor.rowcount
            return result
        except Error as e:
            self.connection.rollback()
            print(f"Database error: {e}")  # Better error logging
            raise  # Re-raise the exception to handle it at a higher level
        finally:
            if cursor:
                cursor.close()

    def get_all_products(self) -> List[Dict]:
        """
        Retrieve all active products with their category names
        :return: List of product dictionaries
        """
        query = """
        SELECT p.*, c.name as category_name 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE p.is_active = 1
        ORDER BY p.product_id
        """
        try:
            products = self._execute_query(query, fetch=True)
            return products
        except Error as e:
            print("Error fetching products:", e)
            return []  # Return empty list instead of dict with error

    def get_product(self, product_id: int) -> Optional[Dict]:
        """
        Retrieve a single product with all related data
        :param product_id: ID of the product to retrieve
        :return: Product dictionary or None if not found
        """
        if not isinstance(product_id, int) or product_id <= 0:
            raise ValueError("Invalid product ID")
            
        product_query = """
        SELECT p.*, c.name as category_name, s.name as subcategory_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
        WHERE p.product_id = %s AND p.is_active = 1
        """
        
        try:
            products = self._execute_query(product_query, (product_id,), fetch=True)
            if not products:
                return None
            
            product = products[0]
            
            # Get related data in a single transaction
            with self.connection.cursor(dictionary=True) as cursor:
                # Get product images
                cursor.execute("""
                    SELECT * FROM product_images 
                    WHERE product_id = %s 
                    ORDER BY display_order
                """, (product_id,))
                product['images'] = cursor.fetchall()
                
                # Get product specifications
                cursor.execute("""
                    SELECT * FROM product_specifications 
                    WHERE product_id = %s 
                    ORDER BY display_order
                """, (product_id,))
                product['specifications'] = cursor.fetchall()
                
                # Get product options
                cursor.execute("""
                    SELECT * FROM product_options 
                    WHERE product_id = %s 
                    ORDER BY display_order
                """, (product_id,))
                product['options'] = cursor.fetchall()
            
            return product
        except Error as e:
            print(f"Error fetching product {product_id}:", e)
            raise

    def create_product(self, data: Dict) -> Dict:
        """
        Create a new product
        :param data: Dictionary containing product data
        :return: Dictionary with new product ID
        """
        required_fields = {'name', 'category_id', 'price', 'stock_quantity'}
        missing_fields = required_fields - set(data.keys())
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        query = """
        INSERT INTO products (
            sku, name, subtitle, description, short_description, 
            category_id, subcategory_id, price, original_price, cost,
            stock_quantity, low_stock_threshold, weight_kg, dimensions,
            warranty_period, meta_title, meta_description, slug
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            data.get('sku'),
            data['name'],
            data.get('subtitle', ''),
            data.get('description', ''),
            data.get('short_description', ''),
            data['category_id'],
            data.get('subcategory_id'),
            float(data['price']),  # Ensure numeric values
            float(data.get('original_price', data['price'])),
            float(data.get('cost', 0)),
            int(data['stock_quantity']),
            int(data.get('low_stock_threshold', 3)),
            float(data.get('weight_kg', 0)) if data.get('weight_kg') is not None else None,
            data.get('dimensions'),
            data.get('warranty_period'),
            data.get('meta_title', data['name']),
            data.get('meta_description', ''),
            data.get('slug')
        )
        
        try:
            product_id = self._execute_query(query, params)
            return {"product_id": product_id, "success": True}
        except Error as e:
            print("Error creating product:", e)
            raise

    def update_product(self, product_id: int, data: Dict) -> Dict:
        """
        Update an existing product
        :param product_id: ID of the product to update
        :param data: Dictionary containing fields to update
        :return: Dictionary with number of affected rows
        """
        if not data:
            raise ValueError("No data provided for update")
        if not isinstance(product_id, int) or product_id <= 0:
            raise ValueError("Invalid product ID")
        
        # Validate numeric fields if they exist in the update data
        numeric_fields = ['price', 'original_price', 'cost', 'stock_quantity', 'low_stock_threshold', 'weight_kg']
        for field in numeric_fields:
            if field in data:
                try:
                    data[field] = float(data[field])
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid value for {field}. Must be a number.")
        
        set_clause = []
        params = []
        for field, value in data.items():
            set_clause.append(f"{field} = %s")
            params.append(value)
        params.append(product_id)
        
        query = f"UPDATE products SET {', '.join(set_clause)} WHERE product_id = %s"
        
        try:
            rows_affected = self._execute_query(query, params)
            return {"rows_affected": rows_affected, "success": rows_affected > 0}
        except Error as e:
            print(f"Error updating product {product_id}:", e)
            raise

    def delete_product(self, product_id: int) -> Dict:
        """
        Soft delete a product by setting is_active to 0
        :param product_id: ID of the product to delete
        :return: Dictionary with number of affected rows
        """
        if not isinstance(product_id, int) or product_id <= 0:
            raise ValueError("Invalid product ID")
            
        query = "UPDATE products SET is_active = 0 WHERE product_id = %s"
        
        try:
            rows_affected = self._execute_query(query, (product_id,))
            return {"rows_affected": rows_affected, "success": rows_affected > 0}
        except Error as e:
            print(f"Error deleting product {product_id}:", e)
            raise

    def add_product_image(self, product_id: int, data: Dict) -> Dict:
        """
        Add an image to a product
        :param product_id: ID of the product to add image to
        :param data: Dictionary containing image data
        :return: Dictionary with new image ID
        """
        if not isinstance(product_id, int) or product_id <= 0:
            raise ValueError("Invalid product ID")
            
        required_fields = {'image_url'}
        missing_fields = required_fields - set(data.keys())
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        query = """
        INSERT INTO product_images (
            product_id, image_url, alt_text, is_primary, display_order
        ) VALUES (%s, %s, %s, %s, %s)
        """
        params = (
            product_id,
            data['image_url'],
            data.get('alt_text', ''),
            int(bool(data.get('is_primary', False))),  # Convert to 0 or 1
            int(data.get('display_order', 0))
        )
        
        try:
            image_id = self._execute_query(query, params)
            return {"image_id": image_id, "success": True}
        except Error as e:
            print(f"Error adding image to product {product_id}:", e)
            raise