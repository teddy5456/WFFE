# campaign.py
import mysql.connector
from datetime import datetime
from decimal import Decimal
import logging

class Campaign:
    def __init__(self):
        self.conn = None

    def connect_to_db(self):
        """Establish database connection"""
        try:
            self.conn = mysql.connector.connect(
                host="localhost",
                user="teddy",
                password="0857",
                database="waikas_db"
            )
            return self.conn
        except mysql.connector.Error as err:
            logging.error(f"Database connection error: {err}")
            return None

    def _format_campaign(self, campaign_data):
        """Format campaign data for JSON response"""
        if not campaign_data:
            return None
            
        formatted = dict(campaign_data)
        
        # Convert Decimal to float
        for field in ['discount_value', 'impressions', 'clicks', 'conversions', 'revenue']:
            if field in formatted and isinstance(formatted[field], Decimal):
                formatted[field] = float(formatted[field])
                
        # Convert datetime to string
        for field in ['start_date', 'end_date', 'created_at', 'updated_at']:
            if field in formatted and isinstance(formatted[field], datetime):
                formatted[field] = formatted[field].isoformat()
                
        return formatted

    def get_all_campaigns(self, status=None):
        """Get campaigns with optional status filter"""
        conn = self.connect_to_db()
        if not conn:
            return {"error": "Database connection failed"}, 500
            
        try:
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM campaigns"
            params = ()
            
            if status:
                query += " WHERE status = %s"
                params = (status,)
                
            query += " ORDER BY start_date DESC"
            
            cursor.execute(query, params)
            campaigns = cursor.fetchall()
            return [self._format_campaign(c) for c in campaigns], 200
            
        except mysql.connector.Error as err:
            logging.error(f"Database error getting campaigns: {err}")
            return {"error": "Database operation failed"}, 500
        finally:
            if conn:
                conn.close()

    def get_active_campaigns(self):
        """Get all currently active campaigns"""
        conn = self.connect_to_db()
        if not conn:
            return {"error": "Database connection failed"}, 500
            
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT * FROM campaigns 
                WHERE status = 'active' 
                AND start_date <= NOW() 
                AND end_date >= NOW()
                ORDER BY start_date DESC
            """)
            campaigns = cursor.fetchall()
            return [self._format_campaign(c) for c in campaigns], 200
            
        except mysql.connector.Error as err:
            logging.error(f"Database error getting active campaigns: {err}")
            return {"error": "Database operation failed"}, 500
        finally:
            if conn:
                conn.close()

    def get_campaign(self, campaign_id):
        """Get a single campaign by ID"""
        conn = self.connect_to_db()
        if not conn:
            return {"error": "Database connection failed"}, 500
            
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM campaigns WHERE campaign_id = %s", (campaign_id,))
            campaign = cursor.fetchone()
            
            if not campaign:
                return {"error": "Campaign not found"}, 404
                
            # Get associated products
            cursor.execute("""
                SELECT p.*, cp.is_featured, cp.custom_discount
                FROM campaign_products cp
                JOIN products p ON cp.product_id = p.product_id
                WHERE cp.campaign_id = %s
            """, (campaign_id,))
            products = cursor.fetchall()
            
            # Get ad placements
            cursor.execute("""
                SELECT * FROM ad_placements 
                WHERE campaign_id = %s
                ORDER BY display_order
            """, (campaign_id,))
            placements = cursor.fetchall()
            
            campaign['products'] = products
            campaign['ad_placements'] = placements
            return self._format_campaign(campaign), 200
            
        except mysql.connector.Error as err:
            logging.error(f"Database error getting campaign: {err}")
            return {"error": "Database operation failed"}, 500
        finally:
            if conn:
                conn.close()

    def create_campaign(self, data):
        """Create a new campaign"""
        required_fields = ['name', 'campaign_type', 'start_date', 'end_date']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return {"error": f"Missing required fields: {', '.join(missing_fields)}"}, 400

        conn = self.connect_to_db()
        if not conn:
            return {"error": "Database connection failed"}, 500
            
        try:
            cursor = conn.cursor(dictionary=True)
            
            # Insert campaign
            sql = """
            INSERT INTO campaigns 
            (name, description, campaign_type, status, discount_type, discount_value, 
             start_date, end_date, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """
            cursor.execute(sql, (
                data['name'],
                data.get('description', ''),
                data['campaign_type'],
                data.get('status', 'draft'),
                data.get('discount_type'),
                data.get('discount_value'),
                data['start_date'],
                data['end_date']
            ))
            campaign_id = cursor.lastrowid
            
            # Add products if provided
            if 'products' in data and isinstance(data['products'], list):
                for product in data['products']:
                    cursor.execute("""
                        INSERT INTO campaign_products 
                        (campaign_id, product_id, is_featured, custom_discount)
                        VALUES (%s, %s, %s, %s)
                    """, (
                        campaign_id,
                        product['product_id'],
                        product.get('is_featured', False),
                        product.get('custom_discount')
                    ))
            
            # Add ad placements if provided
            if 'ad_placements' in data and isinstance(data['ad_placements'], list):
                for placement in data['ad_placements']:
                    cursor.execute("""
                        INSERT INTO ad_placements 
                        (campaign_id, location, image_url, alt_text, link_url, is_active, display_order)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        campaign_id,
                        placement['location'],
                        placement.get('image_url'),
                        placement.get('alt_text'),
                        placement.get('link_url'),
                        placement.get('is_active', True),
                        placement.get('display_order', 0)
                    ))
            
            conn.commit()
            return self.get_campaign(campaign_id)
            
        except mysql.connector.Error as err:
            conn.rollback()
            logging.error(f"Database error creating campaign: {err}")
            return {"error": "Database operation failed"}, 500
        finally:
            if conn:
                conn.close()

    def update_campaign(self, campaign_id, data):
        """Update an existing campaign"""
        conn = self.connect_to_db()
        if not conn:
            return {"error": "Database connection failed"}, 500
            
        try:
            cursor = conn.cursor()
            
            # Update campaign fields
            sql = """
            UPDATE campaigns 
            SET name = %s, 
                description = %s,
                campaign_type = %s,
                status = %s,
                discount_type = %s,
                discount_value = %s,
                start_date = %s,
                end_date = %s,
                updated_at = NOW()
            WHERE campaign_id = %s
            """
            cursor.execute(sql, (
                data.get('name'),
                data.get('description'),
                data.get('campaign_type'),
                data.get('status'),
                data.get('discount_type'),
                data.get('discount_value'),
                data.get('start_date'),
                data.get('end_date'),
                campaign_id
            ))
            
            # Update products if provided
            if 'products' in data:
                cursor.execute("DELETE FROM campaign_products WHERE campaign_id = %s", (campaign_id,))
                for product in data['products']:
                    cursor.execute("""
                        INSERT INTO campaign_products 
                        (campaign_id, product_id, is_featured, custom_discount)
                        VALUES (%s, %s, %s, %s)
                    """, (
                        campaign_id,
                        product['product_id'],
                        product.get('is_featured', False),
                        product.get('custom_discount')
                    ))
            
            # Update placements if provided
            if 'ad_placements' in data:
                cursor.execute("DELETE FROM ad_placements WHERE campaign_id = %s", (campaign_id,))
                for placement in data['ad_placements']:
                    cursor.execute("""
                        INSERT INTO ad_placements 
                        (campaign_id, location, image_url, alt_text, link_url, is_active, display_order)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        campaign_id,
                        placement['location'],
                        placement.get('image_url'),
                        placement.get('alt_text'),
                        placement.get('link_url'),
                        placement.get('is_active', True),
                        placement.get('display_order', 0)
                    ))
            
            conn.commit()
            return self.get_campaign(campaign_id)
            
        except mysql.connector.Error as err:
            conn.rollback()
            logging.error(f"Database error updating campaign: {err}")
            return {"error": "Database operation failed"}, 500
        finally:
            if conn:
                conn.close()

    def delete_campaign(self, campaign_id):
        """Delete a campaign"""
        conn = self.connect_to_db()
        if not conn:
            return {"error": "Database connection failed"}, 500
            
        try:
            cursor = conn.cursor()
            
            # Delete associations first
            cursor.execute("DELETE FROM campaign_products WHERE campaign_id = %s", (campaign_id,))
            cursor.execute("DELETE FROM ad_placements WHERE campaign_id = %s", (campaign_id,))
            
            # Delete campaign
            cursor.execute("DELETE FROM campaigns WHERE campaign_id = %s", (campaign_id,))
            
            conn.commit()
            return {"message": "Campaign deleted successfully"}, 200
            
        except mysql.connector.Error as err:
            conn.rollback()
            logging.error(f"Database error deleting campaign: {err}")
            return {"error": "Database operation failed"}, 500
        finally:
            if conn:
                conn.close()

    def record_metric(self, campaign_id, metric_type):
        """Record a campaign metric (impression, click, conversion)"""
        valid_metrics = ['impressions', 'clicks', 'conversions']
        if metric_type not in valid_metrics:
            return {"error": "Invalid metric type"}, 400

        conn = self.connect_to_db()
        if not conn:
            return {"error": "Database connection failed"}, 500
            
        try:
            cursor = conn.cursor()
            cursor.execute(
                f"UPDATE campaigns SET {metric_type} = {metric_type} + 1 WHERE campaign_id = %s",
                (campaign_id,)
            )
            conn.commit()
            return {"message": f"{metric_type} recorded"}, 200
            
        except mysql.connector.Error as err:
            conn.rollback()
            logging.error(f"Database error recording metric: {err}")
            return {"error": "Database operation failed"}, 500
        finally:
            if conn:
                conn.close()