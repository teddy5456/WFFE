import mysql.connector
import bcrypt  # Make sure to install: pip install bcrypt

class Register:
    def connect_to_db(self):
        return mysql.connector.connect(
            host="localhost",
            user="teddy",
            password="0857",  # Replace with your actual MySQL password
            database="waikas_db"
        )

    def hash_password(self, plain_password):
        """Hash a password for storing."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(plain_password.encode('utf-8'), salt)

    def verify_password(self, stored_hash, provided_password):
        """Verify a stored password against one provided by user"""
        if not stored_hash.startswith('$2b$'):  # Simple check for bcrypt hash
            return False
        return bcrypt.checkpw(provided_password.encode('utf-8'), stored_hash.encode('utf-8'))

    def register_user(self, data):
        conn = self.connect_to_db()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Check if email exists
            cursor.execute('SELECT * FROM users WHERE email = %s', (data['email'],))
            user = cursor.fetchone()

            if user:
                return {"error": "Email is already registered"}

            # Hash the password before storing
            hashed_password = self.hash_password(data['password'])

            # Insert new user with hashed password
            cursor.execute("""
                INSERT INTO users (full_name, email, phone, business, password) 
                VALUES (%s, %s, %s, %s, %s)
            """, (
                data['full_name'],
                data['email'],
                data['phone'],
                data['business'],
                hashed_password.decode('utf-8')  # Decode bytes to string for storage
            ))

            conn.commit()
            return {"success": True, "message": "User registered successfully"}

        except mysql.connector.Error as err:
            conn.rollback()
            return {"error": f"Database error: {err}"}
        except Exception as e:
            conn.rollback()
            return {"error": f"Unexpected error: {str(e)}"}
        finally:
            cursor.close()
            conn.close()