<?php
// Allow CORS for frontend interaction
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
include_once './config.php';

// Ensure database connection is established
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit;
}

// Read input data
$data = json_decode(file_get_contents("php://input"));

// Validate input
if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing email or password"]);
    exit;
}

// Sanitize input
$email = filter_var($data->email, FILTER_SANITIZE_EMAIL);
$password = $data->password;

// Prepare and execute SQL query
$query = $conn->prepare("SELECT id, password FROM users WHERE email = ?");
$query->bind_param("s", $email);
$query->execute();
$result = $query->get_result();

// Check if user exists
if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();

    // Debugging logs
    error_log("User found: " . json_encode($user)); 

    // Verify password
    if (password_verify($password, $user["password"])) {
        // ✅ Fix: Prevent session_start() error
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $user['id'];

        echo json_encode(["success" => true, "redirect" => "../dashboard/index.html"]);
    } else {
        error_log("Login failed: Invalid password for email $email");
        echo json_encode(["success" => false, "error" => "Invalid credentials"]);
    }
} else {
    error_log("Login failed: User not found with email $email");
    echo json_encode(["success" => false, "error" => "Invalid credentials"]);
}

// Close resources
$query->close();
$conn->close();
exit;
?>
