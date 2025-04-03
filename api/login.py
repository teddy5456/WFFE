import mysql.connector
import bcrypt
from http.cookies import SimpleCookie
import uuid
import time

# Mock database for active sessions (in production, use Redis or database)
active_sessions = {}

class Login:
    def connect_to_db(self):
        return mysql.connector.connect(
            host="localhost",
            user="teddy",
            password="0857",
            database="waikas_db"
        )

    def verify_password(self, stored_hash, provided_password):
        """Verify a stored password against one provided by user"""
        if not stored_hash or not stored_hash.startswith('$2b$'):
            return False
        return bcrypt.checkpw(provided_password.encode('utf-8'), stored_hash.encode('utf-8'))

    def login_user(self, data):
        """Authenticate user and return session cookie"""
        conn = self.connect_to_db()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute('SELECT id, email, password, full_name FROM users WHERE email = %s', (data['email'],))
            user = cursor.fetchone()

            if not user:
                return {"error": "Invalid email or password"}, None

            if not self.verify_password(user['password'], data['password']):
                return {"error": "Invalid email or password"}, None

            # Create session
            session_id = str(uuid.uuid4())
            expires = int(time.time()) + 3600  # 1 hour expiration
            
            # Store session in memory (replace with database in production)
            active_sessions[session_id] = {
                'user_id': user['id'],
                'email': user['email'],
                'expires': expires
            }
            
            # Create secure cookie
            cookie = SimpleCookie()
            cookie['session_id'] = session_id
            cookie['session_id']['httponly'] = True
            cookie['session_id']['max-age'] = 3600
            cookie['session_id']['path'] = '/'
            # cookie['session_id']['secure'] = True  # Uncomment in production with HTTPS
            cookie['session_id']['samesite'] = 'Lax'
            
            # Remove password before returning
            user.pop('password', None)
            
            return {"success": True, "user": user}, cookie

        except mysql.connector.Error as err:
            return {"error": f"Database error: {err}"}, None
        finally:
            cursor.close()
            conn.close()

    def check_auth(self, cookie_header):
        """Verify if user is logged in by checking session cookie"""
        if not cookie_header:
            return None
            
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_header)
            session_id = cookie['session_id'].value
            
            # Check session storage
            if session_id in active_sessions:
                session_data = active_sessions[session_id]
                if session_data['expires'] > time.time():
                    return session_data['user_id']
                
                # Session expired
                del active_sessions[session_id]
        except:
            pass
        
        return None

    def logout(self, cookie_header):
        """Invalidate session"""
        if not cookie_header:
            return None
            
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_header)
            session_id = cookie['session_id'].value
            if session_id in active_sessions:
                del active_sessions[session_id]
                
            # Create expired cookie
            expired_cookie = SimpleCookie()
            expired_cookie['session_id'] = ''
            expired_cookie['session_id']['expires'] = 'Thu, 01 Jan 1970 00:00:00 GMT'
            expired_cookie['session_id']['path'] = '/'
            return expired_cookie
        except:
            return None