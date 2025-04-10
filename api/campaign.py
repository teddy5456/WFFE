import mysql.connector
import traceback
from mysql.connector import Error
from typing import Optional, Dict, List, Union
from datetime import datetime

class Campaign:
    def __init__(self):
        """Initialize database connection"""
        try:
            self.connection = mysql.connector.connect(
                host='localhost',
                database='waikas_db',
                user='teddy',
                password='0857',
                autocommit=False
            )
        except Error as e:
            print("Error while connecting to MySQL", e)
            raise
    
    def __del__(self):
        """Clean up database connection"""
        if hasattr(self, 'connection') and self.connection.is_connected():
            self.connection.close()

    def _execute_query(self, query: str, params: Optional[tuple] = None, fetch: bool = False) -> Union[List[Dict], int]:
        """Generic query executor"""
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

    def create_campaign(self, data: Dict) -> Dict:
        """Create a new campaign"""
        required_fields = {'name', 'campaign_type', 'start_date'}
        missing_fields = required_fields - set(data.keys())
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

        # Type-specific fields
        type_specific = {
            'in_app_ad': ['banner_image_url', 'target_url', 'locations'],
            'email': ['email_subject', 'recipient_count', 'template_id'],
            'social_media': ['social_platform', 'post_id', 'ad_spend']
        }.get(data['campaign_type'], [])

        fields = ['name', 'description', 'campaign_type', 'status', 
                 'start_date', 'end_date', 'discount_amount', 'discount_type'] + type_specific
        params = [data.get(field) for field in fields]

        query = f"""
        INSERT INTO campaigns ({', '.join(fields)})
        VALUES ({', '.join(['%s'] * len(fields))})
        """

        try:
            campaign_id = self._execute_query(query, tuple(params))
            
            if 'products' in data:
                self._add_campaign_products(campaign_id, data['products'])
            
            return {"campaign_id": campaign_id, "success": True}
        except Error as e:
            print("Error creating campaign:", e)
            raise

    def get_campaign(self, campaign_id: int) -> Optional[Dict]:
        """Get a single campaign"""
        try:
            query = "SELECT * FROM campaigns WHERE campaign_id = %s"
            result = self._execute_query(query, (campaign_id,), fetch=True)
            return result[0] if result else None
        except Error as e:
            print(f"Error getting campaign {campaign_id}:", e)
            raise

    def get_all_campaigns(self, filters: Optional[Dict] = None) -> List[Dict]:
        """Get all campaigns with optional filters"""
        try:
            query = "SELECT * FROM campaigns"
            params = []
            
            if filters:
                where_clauses = []
                for field, value in filters.items():
                    if value:
                        where_clauses.append(f"{field} = %s")
                        params.append(value)
                
                if where_clauses:
                    query += " WHERE " + " AND ".join(where_clauses)
            
            query += " ORDER BY start_date DESC"
            return self._execute_query(query, tuple(params) if params else None, fetch=True)
        except Error as e:
            print("Error getting campaigns:", e)
            raise

    def get_active_campaigns(self) -> List[Dict]:
        """Get all active campaigns"""
        try:
            query = """
            SELECT * FROM campaigns 
            WHERE status = 'active' 
            AND start_date <= NOW() 
            AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY start_date DESC
            """
            return self._execute_query(query, fetch=True)
        except Error as e:
            print("Error getting active campaigns:", e)
            raise

    def update_campaign(self, campaign_id: int, data: Dict) -> Dict:
        """Update a campaign"""
        if not data:
            raise ValueError("No data provided for update")
            
        try:
            set_clause = []
            params = []
            for field, value in data.items():
                if field != 'products':
                    set_clause.append(f"{field} = %s")
                    params.append(value)
            
            params.append(campaign_id)
            query = f"UPDATE campaigns SET {', '.join(set_clause)} WHERE campaign_id = %s"
            
            rows_affected = self._execute_query(query, tuple(params))
            
            if 'products' in data:
                self._execute_query(
                    "DELETE FROM campaign_products WHERE campaign_id = %s",
                    (campaign_id,)
                )
                self._add_campaign_products(campaign_id, data['products'])
            
            return {"rows_affected": rows_affected, "success": rows_affected > 0}
        except Error as e:
            print(f"Error updating campaign {campaign_id}:", e)
            raise

    def delete_campaign(self, campaign_id: int) -> Dict:
        """Soft delete a campaign"""
        try:
            query = "UPDATE campaigns SET status = 'deleted' WHERE campaign_id = %s"
            rows_affected = self._execute_query(query, (campaign_id,))
            return {"rows_affected": rows_affected, "success": rows_affected > 0}
        except Error as e:
            print(f"Error deleting campaign {campaign_id}:", e)
            raise

    def record_interaction(self, interaction_data: Dict) -> Dict:
        """Record a campaign interaction"""
        required_fields = {'campaign_id', 'interaction_type'}
        missing_fields = required_fields - set(interaction_data.keys())
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

        metric_field = {
            'impression': 'impressions',
            'click': 'clicks',
            'conversion': 'conversions'
        }.get(interaction_data['interaction_type'])

        if not metric_field:
            raise ValueError("Invalid interaction type")

        try:
            # Update campaign metrics
            update_query = f"""
            UPDATE campaigns 
            SET {metric_field} = {metric_field} + 1
            {', revenue = revenue + %s' if interaction_data['interaction_type'] == 'conversion' else ''}
            WHERE campaign_id = %s
            """
            
            update_params = []
            if interaction_data['interaction_type'] == 'conversion':
                update_params.append(float(interaction_data.get('conversion_amount', 0)))
            update_params.append(interaction_data['campaign_id'])
            
            self._execute_query(update_query, tuple(update_params))
            
            # Record detailed interaction
            interaction_query = """
            INSERT INTO campaign_interactions (
                campaign_id, user_id, interaction_type, source_url, 
                device_type, conversion_amount, email_address, social_platform
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            interaction_params = (
                interaction_data['campaign_id'],
                interaction_data.get('user_id'),
                interaction_data['interaction_type'],
                interaction_data.get('source_url'),
                interaction_data.get('device_type'),
                float(interaction_data.get('conversion_amount', 0)) if interaction_data['interaction_type'] == 'conversion' else 0.0,
                interaction_data.get('email_address'),
                interaction_data.get('social_platform')
            )
            
            self._execute_query(interaction_query, interaction_params)
            
            return {"success": True}
        except Error as e:
            print("Error recording interaction:", e)
            raise

    def get_campaign_analytics(self, campaign_id: int) -> Dict:
        """Get analytics for a campaign"""
        try:
            campaign = self.get_campaign(campaign_id)
            if not campaign:
                raise ValueError("Campaign not found")
            
            # Time-series data
            time_series = self._execute_query("""
                SELECT 
                    DATE(interaction_time) AS date,
                    interaction_type,
                    COUNT(*) AS count,
                    SUM(IF(interaction_type='conversion', conversion_amount, 0)) AS revenue
                FROM campaign_interactions
                WHERE campaign_id = %s
                GROUP BY DATE(interaction_time), interaction_type
                ORDER BY date
            """, (campaign_id,), fetch=True)
            
            # Traffic sources
            traffic_sources = self._execute_query("""
                SELECT 
                    CASE
                        WHEN source_url LIKE '%facebook%' THEN 'Facebook'
                        WHEN source_url LIKE '%instagram%' THEN 'Instagram'
                        WHEN source_url LIKE '%google%' THEN 'Google'
                        WHEN email_address IS NOT NULL THEN 'Email'
                        ELSE 'Direct'
                    END AS source,
                    COUNT(*) AS interactions,
                    SUM(IF(interaction_type='conversion', 1, 0)) AS conversions,
                    SUM(IF(interaction_type='conversion', conversion_amount, 0)) AS revenue
                FROM campaign_interactions
                WHERE campaign_id = %s
                GROUP BY source
                ORDER BY interactions DESC
            """, (campaign_id,), fetch=True)
            
            return {
                "campaign": campaign,
                "time_series": time_series,
                "traffic_sources": traffic_sources,
                "success": True
            }
        except Error as e:
            print(f"Error getting analytics for campaign {campaign_id}:", e)
            raise

    def _add_campaign_products(self, campaign_id: int, product_ids: List[int]) -> None:
        """Helper to add products to a campaign"""
        if not product_ids:
            return
            
        values = [(campaign_id, pid) for pid in product_ids]
        query = "INSERT INTO campaign_products (campaign_id, product_id) VALUES (%s, %s)"
        
        cursor = None
        try:
            cursor = self.connection.cursor()
            cursor.executemany(query, values)
            self.connection.commit()
        except Error as e:
            self.connection.rollback()
            print("Error adding campaign products:", e)
            raise
        finally:
            if cursor:
                cursor.close()