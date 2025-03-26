<?php
// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database configuration
define('DB_HOST', 'localhost'); 
define('DB_USER', 'root'); 
define('DB_PASS', ''); 
define('DB_NAME', 'authsystem');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check for database connection errors
if ($conn->connect_error) {
    die(json_encode(["success" => false, "error" => "Database connection failed: " . $conn->connect_error]));
}

// Set character encoding
$conn->set_charset("utf8mb4");

// Start session securely
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true, // Prevent JavaScript access to cookies
        'cookie_secure' => false,  // Set true if using HTTPS
        'use_strict_mode' => true
    ]);
}

// Set response header for JSON API
header('Content-Type: application/json');
?>
