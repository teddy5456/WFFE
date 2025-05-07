import mysql.connector
import traceback
from mysql.connector import Error
from typing import Optional, Dict, List, Union
from datetime import datetime

class MarketingSubscriber:
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

    def subscribe(self, email: str, name: Optional[str] = None, user_id: Optional[int] = None, source: str = 'website') -> Dict:
        """Subscribe an email to marketing communications"""
        if not email or not isinstance(email, str):
            raise ValueError("Valid email is required")
        
        try:
            # Check if already subscribed
            existing = self._execute_query(
                "SELECT id, is_active FROM marketing_subscribers WHERE email = %s",
                (email,),
                fetch=True
            )
            
            if existing:
                subscriber = existing[0]
                if subscriber['is_active']:
                    return {"success": True, "message": "Already subscribed", "subscriber_id": subscriber['id']}
                
                # Reactivate if previously unsubscribed
                result = self._execute_query(
                    """UPDATE marketing_subscribers 
                    SET is_active = TRUE, 
                        unsubscribed_at = NULL,
                        name = COALESCE(%s, name),
                        source = %s,
                        user_id = COALESCE(%s, user_id)
                    WHERE email = %s""",
                    (name, source, user_id, email)
                )
                return {"success": True, "message": "Resubscribed successfully", "subscriber_id": subscriber['id']}
            
            # New subscription
            result = self._execute_query(
                """INSERT INTO marketing_subscribers 
                (email, name, user_id, source) 
                VALUES (%s, %s, %s, %s)""",
                (email, name, user_id, source)
            )
            
            return {"success": True, "message": "Subscribed successfully", "subscriber_id": result}
            
        except Error as e:
            print(f"Error subscribing {email}:", e)
            raise

    def unsubscribe(self, email: str) -> Dict:
        """Unsubscribe an email from marketing communications"""
        if not email or not isinstance(email, str):
            raise ValueError("Valid email is required")
        
        try:
            result = self._execute_query(
                """UPDATE marketing_subscribers 
                SET is_active = FALSE, 
                    unsubscribed_at = NOW() 
                WHERE email = %s""",
                (email,)
            )
            
            if result == 0:
                return {"success": False, "message": "Email not found in subscriptions"}
            
            return {"success": True, "message": "Unsubscribed successfully"}
            
        except Error as e:
            print(f"Error unsubscribing {email}:", e)
            raise

    def get_subscriber(self, email: str) -> Optional[Dict]:
        """Get subscriber details by email"""
        try:
            result = self._execute_query(
                """SELECT id, email, name, user_id, source, 
                          is_active, subscribed_at, unsubscribed_at, last_updated
                   FROM marketing_subscribers WHERE email = %s""",
                (email,),
                fetch=True
            )
            return result[0] if result else None
        except Error as e:
            print(f"Error getting subscriber {email}:", e)
            raise

    def get_active_subscribers(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict]:
        """Get all active subscribers with pagination"""
        try:
            query = """SELECT id, email, name, user_id, source, 
                              subscribed_at, last_updated
                       FROM marketing_subscribers 
                       WHERE is_active = TRUE 
                       ORDER BY subscribed_at DESC"""
            params = []
            
            if limit is not None:
                query += " LIMIT %s"
                params.append(limit)
                if offset is not None:
                    query += " OFFSET %s"
                    params.append(offset)
            
            return self._execute_query(query, tuple(params) if params else None, fetch=True)
        except Error as e:
            print("Error getting active subscribers:", e)
            raise

    def get_subscribers_by_source(self, source: str) -> List[Dict]:
        """Get subscribers by acquisition source"""
        valid_sources = ['website', 'registration', 'manual']
        if source not in valid_sources:
            raise ValueError(f"Invalid source. Must be one of: {', '.join(valid_sources)}")
        
        try:
            return self._execute_query(
                """SELECT id, email, name, user_id, is_active,
                          subscribed_at, unsubscribed_at
                   FROM marketing_subscribers 
                   WHERE source = %s 
                   ORDER BY subscribed_at DESC""",
                (source,),
                fetch=True
            )
        except Error as e:
            print(f"Error getting subscribers by source {source}:", e)
            raise

    def update_subscriber(self, email: str, update_data: Dict) -> Dict:
        """Update subscriber information"""
        if not update_data:
            raise ValueError("No update data provided")
            
        try:
            set_clauses = []
            params = []
            for field, value in update_data.items():
                if field != 'email':
                    set_clauses.append(f"{field} = %s")
                    params.append(value)
            
            params.append(email)
            query = f"""UPDATE marketing_subscribers 
                        SET {', '.join(set_clauses)} 
                        WHERE email = %s"""
            
            rows_affected = self._execute_query(query, tuple(params))
            return {"success": rows_affected > 0, "rows_affected": rows_affected}
        except Error as e:
            print(f"Error updating subscriber {email}:", e)
            raise

    def get_subscriber_count(self, active_only: bool = True) -> Dict:
        """Get count of subscribers"""
        try:
            query = "SELECT COUNT(*) as count FROM marketing_subscribers"
            if active_only:
                query += " WHERE is_active = TRUE"
            
            result = self._execute_query(query, fetch=True)
            return {"count": result[0]['count'], "success": True}
        except Error as e:
            print("Error getting subscriber count:", e)
            raise

    def get_subscription_stats(self) -> Dict:
        """Get subscription statistics"""
        try:
            # Total counts by source
            sources = self._execute_query(
                """SELECT 
                    source, 
                    COUNT(*) as total,
                    SUM(is_active) as active,
                    SUM(NOT is_active) as inactive
                   FROM marketing_subscribers
                   GROUP BY source""",
                fetch=True
            )
            
            # Growth over time
            growth = self._execute_query(
                """SELECT 
                    DATE(subscribed_at) as date,
                    COUNT(*) as new_subscribers
                   FROM marketing_subscribers
                   WHERE subscribed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                   GROUP BY DATE(subscribed_at)
                   ORDER BY date""",
                fetch=True
            )
            
            return {
                "sources": sources,
                "growth": growth,
                "success": True
            }
        except Error as e:
            print("Error getting subscription stats:", e)
            raise