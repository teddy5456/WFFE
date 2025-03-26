<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight request
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

// Get JSON data
$rawData = file_get_contents("php://input");
$data = json_decode($rawData);

// Validate input
if (!isset($data->fullName, $data->email, $data->password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required fields"]);
    exit;
}

$fullName = trim($data->fullName);
$email = trim($data->email);
$phone = isset($data->phone) ? trim($data->phone) : '';
$business = isset($data->business) ? trim($data->business) : '';
$password = password_hash($data->password, PASSWORD_BCRYPT);

// Prepare and execute SQL query
$query = $conn->prepare("INSERT INTO users (full_name, email, phone, business, password) VALUES (?, ?, ?, ?, ?)");

if (!$query) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database query preparation failed"]);
    exit;
}

$query->bind_param("sssss", $fullName, $email, $phone, $business, $password);

if ($query->execute()) {
    http_response_code(201);
    echo json_encode(["success" => true, "redirect" => "login.html?registered=1"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Registration failed"]);
}

$query->close();
$conn->close();
?>
