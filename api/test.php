<?php
$input_password = "Teddy@2020"; // Your actual password input

// ✅ Ensure the hash is inside double or single quotes
$stored_hash = '$2y$10$6KLflYY.YIhY/NoAvEaK.ufI3LTzkeT8XtKiKIo6O0tI7ooV0GCqu';

if (password_verify($input_password, $stored_hash)) {
    echo "✅ Password matches!";
} else {
    echo "❌ Invalid credentials!";
}
?>
