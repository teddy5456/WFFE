import mysql.connector
import traceback
from mysql.connector import Error
from typing import Optional, Dict, List, Union

class Subcategory:
    def __init__(self):
        """Initialize database connection"""
        try:
            self.connection = mysql.connector.connect(
                host='localhost',
                database='waikas_db',
                user='teddy',
                password='0857',
                autocommit=False  # Explicitly manage transactions
            )
        except Error as e:
            print("Error while connecting to MySQL", e)
            raise
    
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
            print(f"Database error: {e}")
            raise
        finally:
            if cursor:
                cursor.close()

    def get_all_subcategories(self, category_id: Optional[int] = None) -> List[Dict]:
        """
        Retrieve all subcategories, optionally filtered by category_id
        :param category_id: Optional category ID to filter by
        :return: List of subcategory dictionaries
        """
        try:
            base_query = """
                SELECT s.*, 
                    c.name as category_name,
                    (SELECT COUNT(*) FROM products WHERE subcategory_id = s.subcategory_id) AS product_count
                FROM subcategories s
                JOIN categories c ON s.category_id = c.category_id
            """
            
            if category_id:
                base_query += " WHERE s.category_id = %s"
                params = (category_id,)
            else:
                params = None
                
            base_query += " ORDER BY s.display_order, s.name"
            
            return self._execute_query(base_query, params, fetch=True)
        except Error as e:
            print("Error fetching subcategories:", e)
            raise

    def get_subcategory(self, subcategory_id: int) -> Optional[Dict]:
        """
        Retrieve a single subcategory with its details
        :param subcategory_id: ID of the subcategory to retrieve
        :return: Subcategory dictionary or None if not found
        """
        if not isinstance(subcategory_id, int) or subcategory_id <= 0:
            raise ValueError("Invalid subcategory ID")
            
        try:
            query = """
            SELECT s.*, 
                   c.name as category_name,
                   (SELECT COUNT(*) FROM products WHERE subcategory_id = s.subcategory_id) as product_count
            FROM subcategories s
            JOIN categories c ON s.category_id = c.category_id
            WHERE s.subcategory_id = %s
            """
            subcategories = self._execute_query(query, (subcategory_id,), fetch=True)
            
            if not subcategories:
                return None
                
            subcategory = subcategories[0]
            return subcategory
            
        except Exception as e:
            print(f"Error in get_subcategory: {str(e)}")
            print(traceback.format_exc())
            raise

    def get_subcategory_by_slug(self, slug: str) -> Optional[Dict]:
        """
        Retrieve a subcategory by its slug
        :param slug: Slug of the subcategory to retrieve
        :return: Subcategory dictionary or None if not found
        """
        if not slug or not isinstance(slug, str):
            raise ValueError("Invalid slug")
            
        try:
            query = """
            SELECT s.*, 
                   c.name as category_name,
                   (SELECT COUNT(*) FROM products WHERE subcategory_id = s.subcategory_id) as product_count
            FROM subcategories s
            JOIN categories c ON s.category_id = c.category_id
            WHERE s.slug = %s
            """
            subcategories = self._execute_query(query, (slug,), fetch=True)
            
            if not subcategories:
                return None
                
            return subcategories[0]
            
        except Exception as e:
            print(f"Error in get_subcategory_by_slug: {str(e)}")
            print(traceback.format_exc())
            raise

    def get_subcategory_products(self, subcategory_id: int) -> List[Dict]:
        """
        Retrieve products in a subcategory with complete nested data
        :param subcategory_id: ID of the subcategory
        :return: List of product dictionaries with nested images, specifications, etc.
        """
        if not isinstance(subcategory_id, int) or subcategory_id <= 0:
            raise ValueError("Invalid subcategory ID")
        
        try:
            # Get basic product data
            query = """
            SELECT 
                p.*, 
                c.name AS category_name,
                s.name AS subcategory_name,
                (SELECT COUNT(*) FROM product_reviews pr 
                 WHERE pr.product_id = p.product_id AND pr.status = 'approved') AS review_count,
                (SELECT AVG(rating) FROM product_reviews pr 
                 WHERE pr.product_id = p.product_id AND pr.status = 'approved') AS average_rating
            FROM products p
            JOIN categories c ON p.category_id = c.category_id
            JOIN subcategories s ON p.subcategory_id = s.subcategory_id
            WHERE p.subcategory_id = %s
            ORDER BY p.is_featured DESC, p.is_bestseller DESC, p.name
            """
            products = self._execute_query(query, (subcategory_id,), fetch=True)

            if not products:
                return []

            # Get additional data for each product
            for product in products:
                product_id = product['product_id']
                
                # Get images
                product['images'] = self._execute_query(
                    """SELECT image_id, product_id, image_url, alt_text, 
                              is_primary, display_order
                       FROM product_images 
                       WHERE product_id = %s 
                       ORDER BY is_primary DESC, display_order""",
                    (product_id,),
                    fetch=True
                )
                
                # Get specifications
                product['specifications'] = self._execute_query(
                    """SELECT spec_id, product_id, spec_name, spec_value, display_order
                       FROM product_specifications 
                       WHERE product_id = %s 
                       ORDER BY display_order""",
                    (product_id,),
                    fetch=True
                )
                
                # Get options
                product['options'] = self._execute_query(
                    """SELECT option_id, product_id, option_type, name, description,
                              price_adjustment, image_url, display_order, is_default
                       FROM product_options 
                       WHERE product_id = %s 
                       ORDER BY display_order, option_type""",
                    (product_id,),
                    fetch=True
                )
                
                # Get related products
                product['related_products'] = self._execute_query(
                    """SELECT 
                           r.relation_id, r.relation_type, r.display_order,
                           p.product_id, p.name, p.slug, p.price, 
                           (SELECT image_url FROM product_images 
                            WHERE product_id = p.product_id AND is_primary = 1 LIMIT 1) AS image_url
                       FROM related_products r
                       JOIN products p ON r.related_product_id = p.product_id
                       WHERE r.product_id = %s
                       ORDER BY r.display_order
                       LIMIT 5""",
                    (product_id,),
                    fetch=True
                )
            
            return products
            
        except Error as e:
            print(f"Error fetching products for subcategory {subcategory_id}:", e)
            traceback.print_exc()
            raise

    def create_subcategory(self, data: Dict) -> Dict:
        """
        Create a new subcategory
        :param data: Dictionary containing subcategory data
        :return: Dictionary with new subcategory ID
        """
        required_fields = {'name', 'category_id'}
        missing_fields = required_fields - set(data.keys())
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        query = """
        INSERT INTO subcategories (
            name, slug, category_id, description, 
            image_url, display_order, is_active
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        # Generate slug if not provided
        slug = data.get('slug', data['name'].lower().replace(' ', '-'))
        
        params = (
            data['name'],
            slug,
            data['category_id'],
            data.get('description', ''),
            data.get('image_url', None),
            data.get('display_order', 0),
            int(bool(data.get('is_active', True)))
        )
        
        try:
            subcategory_id = self._execute_query(query, params)
            return {"subcategory_id": subcategory_id, "success": True}
        except Error as e:
            print("Error creating subcategory:", e)
            raise

    def update_subcategory(self, subcategory_id: int, data: Dict) -> Dict:
        """
        Update an existing subcategory
        :param subcategory_id: ID of the subcategory to update
        :param data: Dictionary containing fields to update
        :return: Dictionary with number of affected rows
        """
        if not data:
            raise ValueError("No data provided for update")
        if not isinstance(subcategory_id, int) or subcategory_id <= 0:
            raise ValueError("Invalid subcategory ID")
        
        set_clause = []
        params = []
        for field, value in data.items():
            set_clause.append(f"{field} = %s")
            params.append(value)
        params.append(subcategory_id)
        
        query = f"UPDATE subcategories SET {', '.join(set_clause)} WHERE subcategory_id = %s"
        
        try:
            rows_affected = self._execute_query(query, tuple(params))
            return {"rows_affected": rows_affected, "success": rows_affected > 0}
        except Error as e:
            print(f"Error updating subcategory {subcategory_id}:", e)
            raise

    def delete_subcategory(self, subcategory_id: int) -> Dict:
        """
        Delete a subcategory if no products are associated with it
        :param subcategory_id: ID of the subcategory to delete
        :return: Dictionary with operation status
        """
        if not isinstance(subcategory_id, int) or subcategory_id <= 0:
            raise ValueError("Invalid subcategory ID")
            
        try:
            # Check if there are any products in this subcategory
            product_count = self._execute_query(
                "SELECT COUNT(*) FROM products WHERE subcategory_id = %s",
                (subcategory_id,),
                fetch=True
            )[0]['COUNT(*)']
            
            if product_count > 0:
                return {
                    "success": False,
                    "message": "Cannot delete subcategory with associated products",
                    "product_count": product_count
                }
            
            # If no products, proceed with deletion
            rows_affected = self._execute_query(
                "DELETE FROM subcategories WHERE subcategory_id = %s",
                (subcategory_id,)
            )
            
            return {
                "success": rows_affected > 0,
                "rows_affected": rows_affected
            }
            
        except Error as e:
            print(f"Error deleting subcategory {subcategory_id}:", e)
            raise