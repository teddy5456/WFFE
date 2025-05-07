import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import threading
from queue import Queue
import logging
from datetime import datetime
import mysql.connector
from mysql.connector import Error

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailSender:
    def __init__(self):
        """Initialize email sender with SMTP configuration"""
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.email_user = os.getenv('EMAIL_USER', 'your_email@gmail.com')
        self.email_password = os.getenv('EMAIL_PASSWORD', 'your_password')
        self.max_threads = int(os.getenv('EMAIL_THREADS', 3))
        self.batch_size = int(os.getenv('EMAIL_BATCH_SIZE', 50))
        self.queue = Queue()
        self._init_workers()
        
        # Database connection pool
        self.db_pool = None
        self._init_db_pool()
    
    def _init_db_pool(self):
        """Initialize database connection pool"""
        try:
            self.db_pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="email_pool",
                pool_size=3,
                host='localhost',
                database='waikas_db',
                user='teddy',
                password='0857',
                autocommit=True
            )
            logger.info("Database connection pool initialized")
        except Error as e:
            logger.error(f"Error initializing database pool: {e}")
            raise
    
    def _get_db_connection(self):
        """Get a database connection from the pool"""
        try:
            return self.db_pool.get_connection()
        except Error as e:
            logger.error(f"Error getting database connection: {e}")
            raise
    
    def _init_workers(self):
        """Start worker threads for sending emails"""
        for i in range(self.max_threads):
            threading.Thread(
                target=self._worker,
                daemon=True,
                name=f"EmailWorker-{i}"
            ).start()
        logger.info(f"Started {self.max_threads} email worker threads")
    
    def _worker(self):
        """Worker thread that processes email tasks"""
        while True:
            task = self.queue.get()
            try:
                self._process_task(task)
            except Exception as e:
                logger.error(f"Error processing email task: {e}")
            finally:
                self.queue.task_done()
    
    def _process_task(self, task):
        """Process a single email sending task"""
        server = None
        conn = None
        try:
            # Get database connection
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Get campaign details
            cursor.execute(
                "SELECT name, subject, content, template_id FROM campaigns WHERE id = %s",
                (task['campaign_id'],)
            campaign = cursor.fetchone()
            
            if not campaign:
                logger.error(f"Campaign {task['campaign_id']} not found")
                return
            
            # Get recipients
            cursor.execute(
                """SELECT r.email, r.name 
                   FROM campaign_recipients cr
                   JOIN marketing_subscribers r ON cr.recipient_id = r.id
                   WHERE cr.campaign_id = %s AND cr.status = 'pending'""",
                (task['campaign_id'],))
            recipients = cursor.fetchall()
            
            if not recipients:
                logger.info(f"No pending recipients for campaign {task['campaign_id']}")
                return
            
            # Connect to SMTP server
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            
            for i, recipient in enumerate(recipients):
                try:
                    msg = self._create_message(
                        to=recipient['email'],
                        subject=campaign['subject'],
                        content=campaign['content'],
                        template_id=campaign.get('template_id'),
                        sender_name=task.get('sender_name', 'WFFE Connect')
                    )
                    
                    server.sendmail(
                        self.email_user,
                        [recipient['email']],
                        msg.as_string()
                    )
                    
                    # Update recipient status
                    cursor.execute(
                        """UPDATE campaign_recipients 
                           SET status = 'sent', sent_at = NOW() 
                           WHERE campaign_id = %s AND recipient_id = (
                               SELECT id FROM marketing_subscribers WHERE email = %s
                           )""",
                        (task['campaign_id'], recipient['email']))
                    
                    logger.info(f"Sent email to {recipient['email']}")
                    
                except Exception as e:
                    logger.error(f"Failed to send to {recipient['email']}: {e}")
                    # Mark as failed
                    cursor.execute(
                        """UPDATE campaign_recipients 
                           SET status = 'failed', error = %s 
                           WHERE campaign_id = %s AND recipient_id = (
                               SELECT id FROM marketing_subscribers WHERE email = %s
                           )""",
                        (str(e), task['campaign_id'], recipient['email']))
                
                # Reconnect periodically to avoid SMTP timeouts
                if i > 0 and i % self.batch_size == 0:
                    server.quit()
                    conn.commit()
                    server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                    server.starttls()
                    server.login(self.email_user, self.email_password)
            
            # Update campaign status
            cursor.execute(
                """UPDATE campaigns 
                   SET status = 'sent', sent_at = NOW() 
                   WHERE id = %s""",
                (task['campaign_id'],))
            
        except Exception as e:
            logger.error(f"Error in email task processing: {e}")
            if conn:
                conn.rollback()
        finally:
            if server:
                server.quit()
            if conn:
                conn.close()
    
    def _create_message(self, to, subject, content=None, template_id=None, sender_name=None):
        """Create MIME message for email"""
        msg = MIMEMultipart()
        msg['From'] = f'"{sender_name}" <{self.email_user}>'
        msg['To'] = to
        msg['Subject'] = subject
        msg['Date'] = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")
        
        # Use template if specified (in a real app, you'd fetch from DB)
        if template_id:
            # This is a simplified template system - you'd normally fetch from DB
            template_content = self._get_template_content(template_id)
            if template_content:
                msg.attach(MIMEText(template_content, 'html'))
            elif content:
                msg.attach(MIMEText(content, 'plain'))
        elif content:
            msg.attach(MIMEText(content, 'plain'))
        
        return msg
    
    def _get_template_content(self, template_id):
        """Get template content from database"""
        conn = None
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT html_content FROM email_templates WHERE id = %s",
                (template_id,))
            template = cursor.fetchone()
            return template['html_content'] if template else None
        except Error as e:
            logger.error(f"Error fetching template {template_id}: {e}")
            return None
        finally:
            if conn:
                conn.close()
    
    def send_campaign(self, campaign_id, sender_name=None):
        """Queue a campaign for sending"""
        if not campaign_id:
            raise ValueError("Campaign ID is required")
        
        self.queue.put({
            'campaign_id': campaign_id,
            'sender_name': sender_name
        })
        logger.info(f"Queued campaign {campaign_id} for sending")

# Singleton instance
email_sender = EmailSender()

# Helper functions for direct access
def send_campaign(campaign_id, sender_name=None):
    """Public interface for sending campaigns"""
    email_sender.send_campaign(campaign_id, sender_name)