from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import sys
import logging
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

# Add project root to Python path
sys.path.append(str(Path(__file__).parent))

# Configure logging
logging.basicConfig(
    filename='api.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class EnhancedJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal and datetime objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(str(obj))
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Set common headers for responses"""
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def _send_response(self, data, status_code=200):
        """Send JSON response with proper encoding"""
        try:
            self._set_headers(status_code)
            self.wfile.write(json.dumps(data, cls=EnhancedJSONEncoder).encode('utf-8'))
        except Exception as e:
            logging.error(f"Response encoding failed: {str(e)}")
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": "Internal server error"}).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self._set_headers(204)
    
    def _parse_query_params(self):
        """Parse query parameters from URL"""
        query = urlparse(self.path).query
        return parse_qs(query)
    
    def _get_request_body(self):
        """Extract and parse request body"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        
        try:
            post_data = self.rfile.read(content_length)
            return json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON in request body")

    def _validate_required_fields(self, data, required_fields):
        """Validate required fields in request body"""
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        return True

    def _handle_request(self, handler, required_fields=None):
        """Wrapper for handling requests with common validation"""
        try:
            data = self._get_request_body()
            if required_fields:
                self._validate_required_fields(data, required_fields)
            response = handler(data)
            self._send_response(response)
        except ValueError as e:
            self._send_response({"error": str(e)}, 400)
        except Exception as e:
            logging.error(f"Operation failed: {str(e)}")
            self._send_response({"error": str(e)}, 500)

    def do_GET(self):
        """Handle GET requests"""
        try:
            path = self.path.split('?')[0]  # Remove query parameters
            path_parts = path.split('/')
            
            # Product endpoints
            if path == '/api/products':
                products = Product().get_all_products()
                self._send_response(products)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'products' and path_parts[3].isdigit():
                product_id = int(path_parts[3])
                product = Product().get_product(product_id)
                if product:
                    self._send_response(product)
                else:
                    self._send_response({"error": "Product not found"}, 404)
            
            # Category endpoints
            elif path == '/api/categories':
                params = self._parse_query_params()
                include_sub = params.get('include_subcategories', ['false'])[0].lower() == 'true'
                categories = Category().get_all_categories(include_sub)
                self._send_response(categories)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'categories' and path_parts[3].isdigit():
                category_id = int(path_parts[3])
                category = Category().get_category(category_id)
                if category:
                    self._send_response(category)
                else:
                    self._send_response({"error": "Category not found"}, 404)
            elif len(path_parts) == 5 and path_parts[1] == 'api' and path_parts[2] == 'categories' and path_parts[3].isdigit() and path_parts[4] == 'products':
                category_id = int(path_parts[3])
                params = self._parse_query_params()
                include_sub = params.get('include_subcategories', ['true'])[0].lower() == 'true'
                products = Category().get_category_products(category_id, include_sub)
                self._send_response(products)
            
            # Subcategory endpoints
            elif path == '/api/subcategories':
                params = self._parse_query_params()
                category_id = params.get('category_id', [None])[0]
                if category_id:
                    try:
                        category_id = int(category_id)
                        subcategories = Subcategory().get_all_subcategories(category_id)
                    except ValueError:
                        self._send_response({"error": "Invalid category_id"}, 400)
                        return
                else:
                    subcategories = Subcategory().get_all_subcategories()
                self._send_response(subcategories)
                
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'subcategories' and path_parts[3].isdigit():
                subcategory_id = int(path_parts[3])
                subcategory = Subcategory().get_subcategory(subcategory_id)
                if subcategory:
                    self._send_response(subcategory)
                else:
                    self._send_response({"error": "Subcategory not found"}, 404)
                    
            elif len(path_parts) == 5 and path_parts[1] == 'api' and path_parts[2] == 'subcategories' and path_parts[3] == 'slug':
                slug = path_parts[4]
                subcategory = Subcategory().get_subcategory_by_slug(slug)
                if subcategory:
                    self._send_response(subcategory)
                else:
                    self._send_response({"error": "Subcategory not found"}, 404)
                    
            elif len(path_parts) == 5 and path_parts[1] == 'api' and path_parts[2] == 'subcategories' and path_parts[3].isdigit() and path_parts[4] == 'products':
                try:
                    subcategory_id = int(path_parts[3])
                    products = Subcategory().get_subcategory_products(subcategory_id)
                    self._send_response(products)
                except ValueError:
                    self._send_response({"error": "Invalid subcategory ID"}, 400)
                except Exception as e:
                    logging.error(f"Error getting subcategory products: {str(e)}")
                    self._send_response({"error": "Failed to get subcategory products"}, 500)

            # Campaign endpoints
            elif path == '/api/campaigns':
                params = self._parse_query_params()
                status = params.get('status', [None])[0]
                campaign_type = params.get('type', [None])[0]
                campaigns = Campaign().get_all_campaigns({
                    'status': status,
                    'campaign_type': campaign_type
                })
                self._send_response(campaigns)
            
            elif path == '/api/campaigns/active':
                campaigns = Campaign().get_active_campaigns()
                self._send_response(campaigns)
            
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'campaigns' and path_parts[3].isdigit():
                campaign_id = int(path_parts[3])
                campaign = Campaign().get_campaign(campaign_id)
                if campaign:
                    self._send_response(campaign)
                else:
                    self._send_response({"error": "Campaign not found"}, 404)
            
            elif len(path_parts) == 5 and path_parts[1] == 'api' and path_parts[2] == 'campaigns' and path_parts[3].isdigit() and path_parts[4] == 'analytics':
                campaign_id = int(path_parts[3])
                analytics = Campaign().get_campaign_analytics(campaign_id)
                self._send_response(analytics)
            
            else:
                self._send_response({"error": "Endpoint not found"}, 404)
                
        except ValueError as e:
            self._send_response({"error": str(e)}, 400)
        except Exception as e:
            logging.error(f"GET request failed: {str(e)}")
            self._send_response({"error": "Internal server error"}, 500)

    def do_POST(self):
        """Handle POST requests"""
        try:
            path = self.path.split('?')[0]
            
            if path == '/api/register':
                self._handle_request(Register().register_user, 
                                    ['full_name', 'email', 'password', 'business'])
            elif path == '/api/login':
                self._handle_request(Login().login_user, 
                                    ['email', 'password'])
            elif path == '/api/products':
                self._handle_request(Product().create_product,
                                    ['name', 'category_id', 'price', 'stock_quantity'])
            elif path.startswith('/api/products/') and '/images' in path:
                parts = path.split('/')
                if len(parts) == 6 and parts[3].isdigit():
                    product_id = int(parts[3])
                    data = self._get_request_body()
                    response = Product().add_product_image(product_id, data)
                    self._send_response(response, 201)
                else:
                    self._send_response({"error": "Invalid endpoint"}, 404)
            elif path == '/api/categories':
                self._handle_request(Category().create_category,
                                    ['name', 'slug'])
            elif path == '/api/subcategories':
                self._handle_request(Subcategory().create_subcategory,
                                    ['name', 'category_id'])
            elif path == '/api/campaigns':
                self._handle_request(Campaign().create_campaign,
                                    ['name', 'campaign_type', 'start_date'])
            elif path.startswith('/api/campaigns/') and '/interactions' in path:
                parts = path.split('/')
                if len(parts) == 5 and parts[3].isdigit():
                    campaign_id = int(parts[3])
                    data = self._get_request_body()
                    response = Campaign().record_interaction({
                        'campaign_id': campaign_id,
                        **data
                    })
                    self._send_response(response)
                else:
                    self._send_response({"error": "Invalid endpoint"}, 404)
            else:
                self._send_response({"error": "Endpoint not found"}, 404)
                
        except Exception as e:
            logging.error(f"POST request failed: {str(e)}")
            self._send_response({"error": str(e)}, 500)

    def do_PUT(self):
        """Handle PUT requests"""
        try:
            path = self.path.split('?')[0]
            path_parts = path.split('/')
            
            if len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'products' and path_parts[3].isdigit():
                product_id = int(path_parts[3])
                data = self._get_request_body()
                response = Product().update_product(product_id, data)
                self._send_response(response)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'categories' and path_parts[3].isdigit():
                category_id = int(path_parts[3])
                data = self._get_request_body()
                response = Category().update_category(category_id, data)
                self._send_response(response)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'subcategories' and path_parts[3].isdigit():
                subcategory_id = int(path_parts[3])
                data = self._get_request_body()
                response = Subcategory().update_subcategory(subcategory_id, data)
                self._send_response(response)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'campaigns' and path_parts[3].isdigit():
                campaign_id = int(path_parts[3])
                data = self._get_request_body()
                response = Campaign().update_campaign(campaign_id, data)
                self._send_response(response)
            else:
                self._send_response({"error": "Endpoint not found"}, 404)
                
        except Exception as e:
            logging.error(f"PUT request failed: {str(e)}")
            self._send_response({"error": str(e)}, 500)

    def do_DELETE(self):
        """Handle DELETE requests"""
        try:
            path = self.path.split('?')[0]
            path_parts = path.split('/')
            
            if len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'products' and path_parts[3].isdigit():
                product_id = int(path_parts[3])
                response = Product().delete_product(product_id)
                self._send_response(response)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'categories' and path_parts[3].isdigit():
                category_id = int(path_parts[3])
                response = Category().delete_category(category_id)
                self._send_response(response)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'subcategories' and path_parts[3].isdigit():
                subcategory_id = int(path_parts[3])
                response = Subcategory().delete_subcategory(subcategory_id)
                self._send_response(response)
            elif len(path_parts) == 4 and path_parts[1] == 'api' and path_parts[2] == 'campaigns' and path_parts[3].isdigit():
                campaign_id = int(path_parts[3])
                response = Campaign().delete_campaign(campaign_id)
                self._send_response(response)
            else:
                self._send_response({"error": "Endpoint not found"}, 404)
                
        except Exception as e:
            logging.error(f"DELETE request failed: {str(e)}")
            self._send_response({"error": str(e)}, 500)

def run(server_class=HTTPServer, handler_class=RequestHandler, port=8000):
    """Run the HTTP server"""
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting server on port {port}...')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    run()