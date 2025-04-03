import mysql.connector
import traceback
from mysql.connector import Error
from typing import Optional, Dict, List, Union

class Category:
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

    def get_all_categories(self, include_subcategories: bool = False) -> List[Dict]:
        """
        Retrieve all categories with optional subcategories
        :param include_subcategories: Whether to include subcategories
        :return: List of category dictionaries
        """
        try:
            # Get all parent categories
            query = """
                SELECT c.*, 
                    (SELECT COUNT(*) FROM products WHERE category_id = c.category_id) AS product_count
                FROM categories c
                ORDER BY c.name
            """
            categories = self._execute_query(query, fetch=True)
            
            if include_subcategories:
                for category in categories:
                    category['subcategories'] = self._execute_query(
                        """SELECT c.category_id, c.name, c.description, c.slug
                        FROM categories c
                        WHERE c.parent_id = %s
                        ORDER BY c.name""",
                        (category['category_id'],),
                        fetch=True
                    )

            return categories
        except Error as e:
            print("Error fetching categories:", e)
            raise

    def get_category(self, category_id: int) -> Optional[Dict]:
        """
        Retrieve a single category with its subcategories
        :param category_id: ID of the category to retrieve
        :return: Category dictionary or None if not found
        """
        if not isinstance(category_id, int) or category_id <= 0:
            raise ValueError("Invalid category ID")
            
        try:
            # Get main category details
            query = """
            SELECT c.*, 
                   (SELECT COUNT(*) FROM products WHERE category_id = c.category_id) as product_count
            FROM categories c
            WHERE c.category_id = %s
            """
            categories = self._execute_query(query, (category_id,), fetch=True)
            
            if not categories:
                return None
                
            category = categories[0]
            
            # Get subcategories
            subcat_query = """
            SELECT s.subcategory_id, s.name, s.description, s.slug, s.image_url
            FROM subcategories s
            WHERE s.category_id = %s
            ORDER BY s.display_order
            """
            
            category['subcategories'] = self._execute_query(
                subcat_query,
                (category_id,),
                fetch=True
            )
            
            return category
            
        except Exception as e:
            print(f"Error in get_category: {str(e)}")
            print(traceback.format_exc())
            raise

    def get_category_products(self, category_id: int, include_subcategories: bool = True) -> List[Dict]:
        """
        Retrieve products in a category (optionally including subcategories)
        :param category_id: ID of the category
        :param include_subcategories: Whether to include products from subcategories
        :return: List of product dictionaries
        """
        if not isinstance(category_id, int) or category_id <= 0:
            raise ValueError("Invalid category ID")
            
        try:
            # First get basic product data
            if include_subcategories:
                # Get all subcategory IDs
                subcategories = self._execute_query(
                    "SELECT subcategory_id FROM subcategories WHERE category_id = %s",
                    (category_id,),
                    fetch=True
                )
                category_ids = [category_id] + [s['subcategory_id'] for s in subcategories]
                
                # Get products from all categories
                query = """
                SELECT p.*, c.name as category_name
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                WHERE p.category_id IN ({})
                ORDER BY p.name
                """.format(','.join(['%s'] * len(category_ids)))
                
                products = self._execute_query(query, tuple(category_ids), fetch=True)
            else:
                # Get products only from this category
                query = """
                SELECT p.*, c.name as category_name
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                WHERE p.category_id = %s
                ORDER BY p.name
                """
                products = self._execute_query(query, (category_id,), fetch=True)

            if not products:
                return []

            # Get additional data for each product
            for product in products:
                product_id = product['product_id']
                
                # Get images
                product['images'] = self._execute_query(
                    "SELECT * FROM product_images WHERE product_id = %s ORDER BY display_order",
                    (product_id,),
                    fetch=True
                )
                
                # Get specifications
                product['specifications'] = self._execute_query(
                    "SELECT * FROM product_specifications WHERE product_id = %s ORDER BY display_order",
                    (product_id,),
                    fetch=True
                )
                
                # Get options
                product['options'] = self._execute_query(
                    "SELECT * FROM product_options WHERE product_id = %s ORDER BY display_order",
                    (product_id,),
                    fetch=True
                )
            
            return products
            
        except Error as e:
            print(f"Error fetching products for category {category_id}:", e)
            raise

    def create_category(self, data: Dict) -> Dict:
        """
        Create a new category
        :param data: Dictionary containing category data
        :return: Dictionary with new category ID
        """
        required_fields = {'name', 'slug'}
        missing_fields = required_fields - set(data.keys())
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        query = """
        INSERT INTO categories (
            name, description, slug, is_active
        ) VALUES (%s, %s, %s, %s)
        """
        params = (
            data['name'],
            data.get('description', ''),
            data['slug'],
            int(bool(data.get('is_active', True)))
        )
        
        try:
            category_id = self._execute_query(query, params)
            return {"category_id": category_id, "success": True}
        except Error as e:
            print("Error creating category:", e)
            raise

    def update_category(self, category_id: int, data: Dict) -> Dict:
        """
        Update an existing category
        :param category_id: ID of the category to update
        :param data: Dictionary containing fields to update
        :return: Dictionary with number of affected rows
        """
        if not data:
            raise ValueError("No data provided for update")
        if not isinstance(category_id, int) or category_id <= 0:
            raise ValueError("Invalid category ID")
        
        set_clause = []
        params = []
        for field, value in data.items():
            set_clause.append(f"{field} = %s")
            params.append(value)
        params.append(category_id)
        
        query = f"UPDATE categories SET {', '.join(set_clause)} WHERE category_id = %s"
        
        try:
            rows_affected = self._execute_query(query, tuple(params))
            return {"rows_affected": rows_affected, "success": rows_affected > 0}
        except Error as e:
            print(f"Error updating category {category_id}:", e)
            raise

    def delete_category(self, category_id: int) -> Dict:
        """
        Soft delete a category by setting is_active to 0
        :param category_id: ID of the category to delete
        :return: Dictionary with number of affected rows
        """
        if not isinstance(category_id, int) or category_id <= 0:
            raise ValueError("Invalid category ID")
            
        query = "UPDATE categories SET is_active = 0 WHERE category_id = %s"
        
        try:
            rows_affected = self._execute_query(query, (category_id,))
            return {"rows_affected": rows_affected, "success": rows_affected > 0}
        except Error as e:
            print(f"Error deleting category {category_id}:", e)
            raise