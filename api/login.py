import mysql.connector
import bcrypt
import uuid
import time
from datetime import datetime, timedelta

class Login:
    def connect_to_db(self):
        """Create database connection"""
        return mysql.connector.connect(
            host="localhost",
            user="teddy",
            password="0857",
            database="waikas_db"
        )

    def verify_password(self, stored_hash, provided_password):
        """Verify password against stored bcrypt hash"""
        if not stored_hash or not stored_hash.startswith('$2b$'):
            return False
        return bcrypt.checkpw(provided_password.encode('utf-8'), stored_hash.encode('utf-8'))

    def login_user(self, data, remember_me=False):
        """Authenticate user and return session info with role"""
        conn = self.connect_to_db()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Get user including role from database
            cursor.execute(
                'SELECT id, email, password, full_name, role FROM users WHERE email = %s',
                (data['email'],)
            )
            user = cursor.fetchone()

            if not user or not self.verify_password(user['password'], data['password']):
                return {"error": "Invalid email or password"}

            # Session creation
            session_id = str(uuid.uuid4())
            
            # Remember me functionality determines session duration
            if remember_me:
                # 30 days expiration for persistent sessions
                expires = int(time.time()) + 30 * 24 * 3600
            else:
                # 1 hour expiration for temporary sessions
                expires = int(time.time()) + 3600
            
            # Store session in database
            cursor.execute(
                """INSERT INTO user_sessions 
                   (session_id, user_id, expires_at) 
                   VALUES (%s, %s, %s)""",
                (session_id, user['id'], datetime.fromtimestamp(expires))
            )
            conn.commit()
            
            # Prepare user data without password
            user_data = {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'] 
            }
            
            return {
                "success": True,
                "user": user_data,
                "session": {
                    "session_id": session_id,
                    "expires_at": expires
                }
            }

        except mysql.connector.Error as err:
            return {"error": f"Database error: {err}"}
        finally:
            cursor.close()
            conn.close()

    def check_auth(self, session_id):
        """Verify valid session and return user_id if authenticated"""
        if not session_id:
            return None
            
        try:
            conn = self.connect_to_db()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute(
                """SELECT user_id, expires_at 
                   FROM user_sessions 
                   WHERE session_id = %s""",
                (session_id,)
            )
            session_data = cursor.fetchone()
            
            if session_data:
                expires_at = session_data['expires_at'].timestamp()
                if expires_at > time.time():
                    return session_data['user_id']
                else:
                    # Cleanup expired session
                    cursor.execute(
                        "DELETE FROM user_sessions WHERE session_id = %s",
                        (session_id,)
                    )
                    conn.commit()
            return None
            
        except Exception as e:
            print(f"Auth check error: {e}")
            return None
        finally:
            cursor.close()
            conn.close()

    def logout(self, session_id):
        """Invalidate session by ID"""
        if not session_id:
            return False
            
        try:
            conn = self.connect_to_db()
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM user_sessions WHERE session_id = %s",
                (session_id,)
            )
            conn.commit()
            return True
            
        except Exception as e:
            print(f"Logout error: {e}")
            return False
        finally:
            cursor.close()
            conn.close()