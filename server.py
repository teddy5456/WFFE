from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import sys
import logging
import socket
import time
from pathlib import Path
from decimal import Decimal
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from api.register import Register
from api.login import Login
from api.product import Product
from api.category import Category
from api.subcategory import Subcategory
from api.campaign import Campaign
import mysql.connector
from mysql.connector import Error
from typing import Optional, Dict, List, Union

# Add project root to Python path
sys.path.append(str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    filename='api.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class EnhancedJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal and datetime objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(str(obj))
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

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

class RequestHandler(BaseHTTPRequestHandler):
    timeout = 30  # Request timeout in seconds
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Set common headers for responses"""
        try:
            if self.connection_closed():
                return False
                
            self.send_response(status_code)
            self.send_header('Content-Type', content_type)
            self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:5501')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            return True
        except Exception as e:
            logging.error(f"Failed to set headers: {str(e)}", exc_info=True)
            return False

    def connection_closed(self):
        """Check if connection was closed by client"""
        try:
            self.wfile.flush()
            return False
        except (ConnectionAbortedError, BrokenPipeError, OSError):
            return True

    def _send_response(self, data, status_code=200):
        """Send JSON response with proper encoding"""
        start_time = time.time()
        try:
            if self.connection_closed():
                logging.warning("Connection closed before sending response")
                return

            if not self._set_headers(status_code):
                return

            json_data = json.dumps(data, cls=EnhancedJSONEncoder).encode('utf-8')
            self.wfile.write(json_data)
            logging.info(f"Response sent in {(time.time()-start_time)*1000:.2f}ms")
            
        except (ConnectionAbortedError, BrokenPipeError):
            logging.warning("Client aborted connection during response")
        except Exception as e:
            logging.error(f"Response encoding failed: {str(e)}", exc_info=True)
            if not self.connection_closed():
                try:
                    self._set_headers(500)
                    self.wfile.write(json.dumps({"error": "Internal server error"}).encode('utf-8'))
                except Exception:
                    logging.error("Failed to send error response", exc_info=True)
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        try:
            if self._set_headers(204):
                logging.info("OPTIONS request handled successfully")
        except Exception as e:
            logging.error(f"OPTIONS request failed: {str(e)}", exc_info=True)
    
    def _parse_query_params(self):
        """Parse query parameters from URL"""
        try:
            query = urlparse(self.path).query
            return parse_qs(query)
        except Exception as e:
            logging.error(f"Failed to parse query params: {str(e)}")
            return {}

    def _get_request_body(self):
        """Extract and parse request body"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                return {}

            post_data = self.rfile.read(content_length)
            if not post_data:
                return {}
                
            return json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in request body: {str(e)}")
        except Exception as e:
            logging.error(f"Failed to read request body: {str(e)}")
            raise ValueError("Failed to process request body")

    def _validate_required_fields(self, data, required_fields):
        """Validate required fields in request body"""
        if not isinstance(data, dict):
            raise ValueError("Request body must be a JSON object")
            
        missing_fields = [field for field in required_fields if field not in data or data[field] in (None, '')]
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        return True

    def _handle_request(self, handler, required_fields=None, method='GET'):
        """Wrapper for handling requests with common validation"""
        start_time = time.time()
        try:
            data = self._get_request_body() if method in ('POST', 'PUT') else {}
            if required_fields:
                self._validate_required_fields(data, required_fields)
            response = handler(data)
            self._send_response(response)
            logging.info(f"{method} request completed in {(time.time()-start_time)*1000:.2f}ms")
        except ValueError as e:
            self._send_response({"error": str(e)}, 400)
            logging.warning(f"Validation error: {str(e)}")
        except Exception as e:
            logging.error(f"Operation failed after {(time.time()-start_time)*1000:.2f}ms: {str(e)}", exc_info=True)
            self._send_response({"error": "Internal server error"}, 500)

    def _parse_path(self):
        """Parse the request path into components"""
        path = self.path.split('?')[0]  # Remove query parameters
        return [part for part in path.split('/') if part]  # Remove empty parts

    def _handle_product_endpoints(self, path_parts, params):
        """Handle all product-related endpoints"""
        product_handler = Product()
        
        if len(path_parts) == 2:  # /api/products
            products = product_handler.get_all_products()
            self._send_response(products)
        elif len(path_parts) == 3 and path_parts[2].isdigit():  # /api/products/{id}
            product_id = int(path_parts[2])
            product = product_handler.get_product(product_id)
            if product:
                self._send_response(product)
            else:
                self._send_response({"error": "Product not found"}, 404)
        else:
            self._send_response({"error": "Invalid product endpoint"}, 404)

    def _handle_category_endpoints(self, path_parts, params):
        """Handle all category-related endpoints"""
        category_handler = Category()
        
        if len(path_parts) == 2:  # /api/categories
            include_sub = params.get('include_subcategories', ['false'])[0].lower() == 'true'
            categories = category_handler.get_all_categories(include_sub)
            self._send_response(categories)
        elif len(path_parts) == 3 and path_parts[2].isdigit():  # /api/categories/{id}
            category_id = int(path_parts[2])
            category = category_handler.get_category(category_id)
            if category:
                self._send_response(category)
            else:
                self._send_response({"error": "Category not found"}, 404)
        elif len(path_parts) == 4 and path_parts[2].isdigit() and path_parts[3] == 'products':  # /api/categories/{id}/products
            category_id = int(path_parts[2])
            include_sub = params.get('include_subcategories', ['true'])[0].lower() == 'true'
            products = category_handler.get_category_products(category_id, include_sub)
            self._send_response(products)
        else:
            self._send_response({"error": "Invalid category endpoint"}, 404)

    def _handle_subcategory_endpoints(self, path_parts, params):
        """Handle all subcategory-related endpoints"""
        subcategory_handler = Subcategory()
        
        if len(path_parts) == 2:  # /api/subcategories
            category_id = params.get('category_id', [None])[0]
            if category_id:
                try:
                    category_id = int(category_id)
                    subcategories = subcategory_handler.get_all_subcategories(category_id)
                except ValueError:
                    self._send_response({"error": "Invalid category_id"}, 400)
                    return
            else:
                subcategories = subcategory_handler.get_all_subcategories()
            self._send_response(subcategories)
        elif len(path_parts) == 3 and path_parts[2].isdigit():  # /api/subcategories/{id}
            subcategory_id = int(path_parts[2])
            subcategory = subcategory_handler.get_subcategory(subcategory_id)
            if subcategory:
                self._send_response(subcategory)
            else:
                self._send_response({"error": "Subcategory not found"}, 404)
        elif len(path_parts) == 4 and path_parts[2] == 'slug':  # /api/subcategories/slug/{slug}
            slug = path_parts[3]
            subcategory = subcategory_handler.get_subcategory_by_slug(slug)
            if subcategory:
                self._send_response(subcategory)
            else:
                self._send_response({"error": "Subcategory not found"}, 404)
        elif len(path_parts) == 4 and path_parts[2].isdigit() and path_parts[3] == 'products':  # /api/subcategories/{id}/products
            try:
                subcategory_id = int(path_parts[2])
                products = subcategory_handler.get_subcategory_products(subcategory_id)
                self._send_response(products)
            except ValueError:
                self._send_response({"error": "Invalid subcategory ID"}, 400)
            except Exception as e:
                logging.error(f"Error getting subcategory products: {str(e)}", exc_info=True)
                self._send_response({"error": "Failed to get subcategory products"}, 500)
        else:
            self._send_response({"error": "Invalid subcategory endpoint"}, 404)

    def _handle_campaign_endpoints(self, path_parts, params):
        """Handle all campaign-related endpoints"""
        campaign_handler = Campaign()
        
        if len(path_parts) == 2:  # /api/campaigns
            status = params.get('status', [None])[0]
            campaign_type = params.get('type', [None])[0]
            campaigns = campaign_handler.get_all_campaigns({
                'status': status,
                'campaign_type': campaign_type
            })
            self._send_response(campaigns)
        elif len(path_parts) == 3 and path_parts[2] == 'active':  # /api/campaigns/active
            campaigns = campaign_handler.get_active_campaigns()
            self._send_response(campaigns)
        elif len(path_parts) == 3 and path_parts[2].isdigit():  # /api/campaigns/{id}
            campaign_id = int(path_parts[2])
            campaign = campaign_handler.get_campaign(campaign_id)
            if campaign:
                self._send_response(campaign)
            else:
                self._send_response({"error": "Campaign not found"}, 404)
        elif len(path_parts) == 4 and path_parts[2].isdigit() and path_parts[3] == 'analytics':  # /api/campaigns/{id}/analytics
            campaign_id = int(path_parts[2])
            analytics = campaign_handler.get_campaign_analytics(campaign_id)
            self._send_response(analytics)
        else:
            self._send_response({"error": "Invalid campaign endpoint"}, 404)

    def _handle_marketing_endpoints(self, path_parts, params, method):
        """Handle all marketing subscriber endpoints"""
        marketing_handler = MarketingSubscriber()
        
        try:
            if len(path_parts) == 2:  # /api/marketing
                if method == 'GET':
                    # Get active subscribers
                    limit = params.get('limit', [None])[0]
                    offset = params.get('offset', [None])[0]
                    try:
                        limit = int(limit) if limit else None
                        offset = int(offset) if offset else None
                    except ValueError:
                        self._send_response({"error": "Invalid limit/offset parameters"}, 400)
                        return
                    
                    subscribers = marketing_handler.get_active_subscribers(limit, offset)
                    self._send_response(subscribers)
                elif method == 'POST':
                    # Subscribe new email
                    data = self._get_request_body()
                    required_fields = ['email']
                    self._validate_required_fields(data, required_fields)
                    
                    response = marketing_handler.subscribe(
                        email=data['email'],
                        name=data.get('name'),
                        user_id=data.get('user_id'),
                        source=data.get('source', 'website')
                    )
                    self._send_response(response, 201 if 'subscriber_id' in response else 200)
                    
            elif len(path_parts) == 3 and path_parts[2] == 'subscribe':  # /api/marketing/subscribe
                if method == 'POST':
                    data = self._get_request_body()
                    required_fields = ['email']
                    self._validate_required_fields(data, required_fields)
                    
                    response = marketing_handler.subscribe(
                        email=data['email'],
                        name=data.get('name'),
                        user_id=data.get('user_id'),
                        source=data.get('source', 'website')
                    )
                    self._send_response(response, 201 if 'subscriber_id' in response else 200)
                    
            elif len(path_parts) == 3 and path_parts[2] == 'unsubscribe':  # /api/marketing/unsubscribe
                if method == 'POST':
                    data = self._get_request_body()
                    required_fields = ['email']
                    self._validate_required_fields(data, required_fields)
                    
                    response = marketing_handler.unsubscribe(data['email'])
                    self._send_response(response)
                    
            elif len(path_parts) == 3 and path_parts[2] == 'stats':  # /api/marketing/stats
                if method == 'GET':
                    stats = marketing_handler.get_subscription_stats()
                    self._send_response(stats)
                    
            elif len(path_parts) == 3 and path_parts[2] == 'count':  # /api/marketing/count
                if method == 'GET':
                    active_only = params.get('active_only', ['true'])[0].lower() == 'true'
                    count = marketing_handler.get_subscriber_count(active_only)
                    self._send_response(count)
                    
            elif len(path_parts) == 3 and '@' in path_parts[2]:  # /api/marketing/{email}
                email = path_parts[2]
                if method == 'GET':
                    subscriber = marketing_handler.get_subscriber(email)
                    if subscriber:
                        self._send_response(subscriber)
                    else:
                        self._send_response({"error": "Subscriber not found"}, 404)
                elif method == 'PUT':
                    data = self._get_request_body()
                    response = marketing_handler.update_subscriber(email, data)
                    self._send_response(response)
                    
            elif len(path_parts) == 4 and path_parts[2] == 'source':  # /api/marketing/source/{source}
                source = path_parts[3]
                if method == 'GET':
                    subscribers = marketing_handler.get_subscribers_by_source(source)
                    self._send_response(subscribers)
                    
            else:
                self._send_response({"error": "Invalid marketing endpoint"}, 404)
                
        except ValueError as e:
            self._send_response({"error": str(e)}, 400)
        except Exception as e:
            logging.error(f"Marketing operation failed: {str(e)}", exc_info=True)
            self._send_response({"error": "Internal server error"}, 500)

    def do_GET(self):
        """Handle GET requests"""
        try:
            path_parts = self._parse_path()
            params = self._parse_query_params()

            if len(path_parts) < 1 or path_parts[0] != 'api':
                self._send_response({"error": "Invalid API endpoint"}, 404)
                return

            endpoint_type = path_parts[1] if len(path_parts) > 1 else None
            
            if not endpoint_type:
                self._send_response({"error": "Endpoint not specified"}, 400)
                return
            elif endpoint_type == 'check-auth':
                # Get session ID from Authorization header or query parameter
                session_id = self.headers.get('Authorization') or params.get('session_id', [None])[0]
                user_id = Login().check_auth(session_id)
                if user_id:
                    # Get additional user info if needed
                    conn = Login().connect_to_db()
                    cursor = conn.cursor(dictionary=True)
                    cursor.execute('SELECT id, role, email, full_name FROM users WHERE id = %s', (user_id,))
                    user = cursor.fetchone()
                    cursor.close()
                    conn.close()
                    
                    self._send_response({
                        "authenticated": True,
                        "user": user
                    })
                else:
                    self._send_response({"authenticated": False}, 401)
            elif endpoint_type == 'products':
                self._handle_product_endpoints(path_parts, params)
            elif endpoint_type == 'categories':
                self._handle_category_endpoints(path_parts, params)
            elif endpoint_type == 'subcategories':
                self._handle_subcategory_endpoints(path_parts, params)
            elif endpoint_type == 'campaigns':
                self._handle_campaign_endpoints(path_parts, params)
            elif endpoint_type == 'marketing':
                self._handle_marketing_endpoints(path_parts, params, 'GET')
            else:
                self._send_response({"error": "Endpoint not found"}, 404)
                
        except ValueError as e:
            self._send_response({"error": str(e)}, 400)
        except Exception as e:
            logging.error(f"GET request failed: {str(e)}", exc_info=True)
            self._send_response({"error": "Internal server error"}, 500)

    def _handle_post_products(self, path_parts):
        """Handle POST requests for products"""
        product_handler = Product()
        
        if len(path_parts) == 2:  # /api/products
            self._handle_request(
                product_handler.create_product,
                ['name', 'category_id', 'price', 'stock_quantity'],
                'POST'
            )
        elif len(path_parts) == 4 and path_parts[2].isdigit() and path_parts[3] == 'images':  # /api/products/{id}/images
            product_id = int(path_parts[2])
            data = self._get_request_body()
            response = product_handler.add_product_image(product_id, data)
            self._send_response(response, 201)
        else:
            self._send_response({"error": "Invalid product endpoint"}, 404)

    def _handle_post_campaigns(self, path_parts):
        """Handle POST requests for campaigns"""
        campaign_handler = Campaign()
        
        if len(path_parts) == 2:  # /api/campaigns
            self._handle_request(
                campaign_handler.create_campaign,
                ['name', 'campaign_type', 'start_date'],
                'POST'
            )
        elif len(path_parts) == 4 and path_parts[2].isdigit() and path_parts[3] == 'interactions':  # /api/campaigns/{id}/interactions
            campaign_id = int(path_parts[2])
            data = self._get_request_body()
            response = campaign_handler.record_interaction({
                'campaign_id': campaign_id,
                **data
            })
            self._send_response(response)
        else:
            self._send_response({"error": "Invalid campaign endpoint"}, 404)

    def do_POST(self):
        """Handle POST requests"""
        try:
            path_parts = self._parse_path()

            if len(path_parts) < 1 or path_parts[0] != 'api':
                self._send_response({"error": "Invalid API endpoint"}, 404)
                return

            endpoint_type = path_parts[1] if len(path_parts) > 1 else None
            
            if not endpoint_type:
                self._send_response({"error": "Endpoint not specified"}, 400)
                return
            elif endpoint_type == 'register':
                self._handle_request(
                    Register().register_user, 
                    ['full_name', 'email', 'password', 'business'],
                    'POST'
                )
            elif endpoint_type == 'login':
                data = self._get_request_body()
                remember_me = data.get('remember_me', False)
                response = Login().login_user(data, remember_me)
                self._send_response(response)
            elif endpoint_type == 'check-auth':
                data = self._get_request_body()
                session_id = self.headers.get('Authorization') or data.get('session_id')
                user_id = Login().check_auth(session_id)
                if user_id:
                    # Get additional user info if needed
                    conn = Login().connect_to_db()
                    cursor = conn.cursor(dictionary=True)
                    cursor.execute('SELECT id, email, full_name FROM users WHERE id = %s', (user_id,))
                    user = cursor.fetchone()
                    cursor.close()
                    conn.close()
                    
                    self._send_response({
                        "authenticated": True,
                        "user": user
                    })
                else:
                    self._send_response({"authenticated": False}, 401)
            elif endpoint_type == 'logout':
                data = self._get_request_body()
                session_id = self.headers.get('Authorization') or data.get('session_id')
                if Login().logout(session_id):
                    self._send_response({"success": True})
                else:
                    self._send_response({"error": "Logout failed"}, 400)
            elif endpoint_type == 'products':
                self._handle_post_products(path_parts)
            elif endpoint_type == 'categories':
                self._handle_request(
                    Category().create_category,
                    ['name', 'slug'],
                    'POST'
                )
            elif endpoint_type == 'subcategories':
                self._handle_request(
                    Subcategory().create_subcategory,
                    ['name', 'category_id'],
                    'POST'
                )
            elif endpoint_type == 'campaigns':
                self._handle_post_campaigns(path_parts)
            elif endpoint_type == 'marketing':
                self._handle_marketing_endpoints(path_parts, {}, 'POST')
            else:
                self._send_response({"error": "Endpoint not found"}, 404)
                
        except Exception as e:
            logging.error(f"POST request failed: {str(e)}", exc_info=True)
            self._send_response({"error": "Internal server error"}, 500)

    def _handle_put_request(self, endpoint_type, path_parts):
        """Handle PUT requests for different endpoint types"""
        if len(path_parts) != 3 or not path_parts[2].isdigit():  # /api/{endpoint}/{id}
            self._send_response({"error": "Invalid endpoint"}, 404)
            return

        entity_id = int(path_parts[2])
        data = self._get_request_body()
        
        handlers = {
            'products': Product().update_product,
            'categories': Category().update_category,
            'subcategories': Subcategory().update_subcategory,
            'campaigns': Campaign().update_campaign
        }
        
        if endpoint_type not in handlers:
            self._send_response({"error": "Endpoint not found"}, 404)
            return
            
        try:
            response = handlers[endpoint_type](entity_id, data)
            self._send_response(response)
        except Exception as e:
            logging.error(f"Failed to update {endpoint_type}: {str(e)}", exc_info=True)
            self._send_response({"error": f"Failed to update {endpoint_type}"}, 500)

    def do_PUT(self):
        """Handle PUT requests"""
        try:
            path_parts = self._parse_path()

            if len(path_parts) < 1 or path_parts[0] != 'api':
                self._send_response({"error": "Invalid API endpoint"}, 404)
                return

            endpoint_type = path_parts[1] if len(path_parts) > 1 else None
            
            if not endpoint_type:
                self._send_response({"error": "Endpoint not specified"}, 400)
                return
            elif endpoint_type == 'marketing' and len(path_parts) == 3 and '@' in path_parts[2]:
                # Handle marketing subscriber updates
                self._handle_marketing_endpoints(path_parts, {}, 'PUT')
            else:
                self._handle_put_request(endpoint_type, path_parts)
                
        except Exception as e:
            logging.error(f"PUT request failed: {str(e)}", exc_info=True)
            self._send_response({"error": "Internal server error"}, 500)

    def _handle_delete_request(self, endpoint_type, path_parts):
        """Handle DELETE requests for different endpoint types"""
        if len(path_parts) != 3 or not path_parts[2].isdigit():  # /api/{endpoint}/{id}
            self._send_response({"error": "Invalid endpoint"}, 404)
            return

        entity_id = int(path_parts[2])
        
        handlers = {
            'products': Product().delete_product,
            'categories': Category().delete_category,
            'subcategories': Subcategory().delete_subcategory,
            'campaigns': Campaign().delete_campaign
        }
        
        if endpoint_type not in handlers:
            self._send_response({"error": "Endpoint not found"}, 404)
            return
            
        try:
            response = handlers[endpoint_type](entity_id)
            self._send_response(response)
        except Exception as e:
            logging.error(f"Failed to delete {endpoint_type}: {str(e)}", exc_info=True)
            self._send_response({"error": f"Failed to delete {endpoint_type}"}, 500)

    def do_DELETE(self):
        """Handle DELETE requests"""
        try:
            path_parts = self._parse_path()

            if len(path_parts) < 1 or path_parts[0] != 'api':
                self._send_response({"error": "Invalid API endpoint"}, 404)
                return

            endpoint_type = path_parts[1] if len(path_parts) > 1 else None
            
            if not endpoint_type:
                self._send_response({"error": "Endpoint not specified"}, 400)
                return
                
            self._handle_delete_request(endpoint_type, path_parts)
                
        except Exception as e:
            logging.error(f"DELETE request failed: {str(e)}", exc_info=True)
            self._send_response({"error": "Internal server error"}, 500)

    def handle(self):
        """Override handle to add timeout protection"""
        try:
            super().handle()
        except socket.timeout:
            logging.warning("Request timed out")
            if not self.connection_closed():
                try:
                    self._set_headers(408)
                    self.wfile.write(json.dumps({"error": "Request timeout"}).encode('utf-8'))
                except Exception:
                    pass
        except (ConnectionAbortedError, BrokenPipeError):
            logging.warning("Client aborted connection")
        except Exception as e:
            logging.error(f"Unexpected error handling request: {str(e)}", exc_info=True)

def run(server_class=HTTPServer, handler_class=RequestHandler, port=8000):
    """Run the HTTP server"""
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    
    # Set socket options to allow address reuse
    httpd.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    print(f'Starting server on port {port}...')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()
    except Exception as e:
        logging.critical(f"Server crashed: {str(e)}", exc_info=True)
        raise
    finally:
        logging.info("Server shutdown complete")

if __name__ == '__main__':
    run()