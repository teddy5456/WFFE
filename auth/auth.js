document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost/WAIKAS/api/';
    // Password strength and matching functionality
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const passwordStrengthBar = document.getElementById("passwordStrengthBar");
    const passwordMatchMessage = document.getElementById("passwordMatch");

    // Password hints
    const lengthHint = document.getElementById("lengthHint");
    const uppercaseHint = document.getElementById("uppercaseHint");
    const numberHint = document.getElementById("numberHint");
    const specialHint = document.getElementById("specialHint");

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener("input", function() {
            const password = passwordInput.value;
            let strength = 0;

            // Validate password conditions
            const hasLength = password.length >= 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSpecial = /[\W_]/.test(password);

            // Update strength based on conditions met
            if (hasLength) strength += 1;
            if (hasUppercase) strength += 1;
            if (hasNumber) strength += 1;
            if (hasSpecial) strength += 1;

            // Update visual feedback
            lengthHint.style.color = hasLength ? "#4CAF50" : "#757575";
            uppercaseHint.style.color = hasUppercase ? "#4CAF50" : "#757575";
            numberHint.style.color = hasNumber ? "#4CAF50" : "#757575";
            specialHint.style.color = hasSpecial ? "#4CAF50" : "#757575";

            // Update password strength bar
            const strengthColors = ["#f44336", "#ff9800", "#ffeb3b", "#4caf50"];
            passwordStrengthBar.style.width = (strength * 25) + "%";
            passwordStrengthBar.style.backgroundColor = strengthColors[strength - 1] || "#eee";
        });
    }

    // Password matching checker
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", function() {
            if (confirmPasswordInput.value === passwordInput.value) {
                passwordMatchMessage.style.display = "none";
            } else {
                passwordMatchMessage.style.display = "block";
            }
        });
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form elements
            const email = loginForm.querySelector('#email').value.trim();
            const password = loginForm.querySelector('#password').value.trim();
            const submitButton = loginForm.querySelector('button[type="submit"]');
            
            // Validate inputs
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }

            // Disable button during request
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';

            try {
                const response = await fetch(`${API_BASE_URL}login.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log("Login SUCCESS - Redirecting to dashboard");
                    window.location.href = '../dashboard/index.html';
                } else {
                    console.log("Login FAILED: ", result.error || 'Unknown error');
                    alert(result.error || 'Login failed. Please try again.');
                }
            } catch (error) {
                console.error('Login FAILED with error:', error);
                alert('An error occurred during login. Please check your connection.');
            } finally {
                // Re-enable button
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
            }
        });
    }

    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fullName = registerForm.querySelector('#fullName').value.trim();
            const email = registerForm.querySelector('#email').value.trim();
            const phone = registerForm.querySelector('#phone').value.trim();
            const business = registerForm.querySelector('#business').value.trim();
            const password = registerForm.querySelector('#password').value;
            const confirmPassword = registerForm.querySelector('#confirmPassword').value;
            const terms = registerForm.querySelector('#terms').checked;
            
            if (!fullName || !email || !business || !password || !confirmPassword) {
                alert('Please fill in all required fields');
                return;
            }
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            if (!terms) {
                alert('You must agree to the terms and conditions');
                return;
            }
            
            const requestData = { fullName, email, phone, business, password };
            console.log("Registration Request Data:", requestData);

            try {
                const response = await fetch(`${API_BASE_URL}register.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                console.log("Raw Response:", response);
                
                const text = await response.text();
                console.log("Raw Response Text:", text);
                
                let result;
                try {
                    result = JSON.parse(text);
                } catch (jsonError) {
                    console.error('Invalid JSON response:', text);
                    throw new Error('Unexpected server response. Please try again.');
                }

                console.log("Registration Response Data:", result);
                
                if (result.success) {
                    window.location.href = result.redirect || 'login.html?registered=1';
                } else {
                    alert(result.error || 'Registration failed. Please try again.');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration. Please check your connection.');
            }
        });
    }
});