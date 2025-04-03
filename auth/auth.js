document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:8000/api/';
    
    // Password strength indicators
    const setupPasswordValidation = () => {
        const passwordInput = document.getElementById("password");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        const passwordStrengthBar = document.getElementById("passwordStrengthBar");
        const passwordMatchMessage = document.getElementById("passwordMatch");

        // Password hints
        const lengthHint = document.getElementById("lengthHint");
        const uppercaseHint = document.getElementById("uppercaseHint");
        const numberHint = document.getElementById("numberHint");
        const specialHint = document.getElementById("specialHint");

        if (passwordInput) {
            passwordInput.addEventListener("input", function() {
                const password = passwordInput.value;
                let strength = 0;

                // Validate password conditions
                const hasLength = password.length >= 8;
                const hasUppercase = /[A-Z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                const hasSpecial = /[\W_]/.test(password);

                // Update visual feedback
                lengthHint.style.color = hasLength ? "#4CAF50" : "#757575";
                uppercaseHint.style.color = hasUppercase ? "#4CAF50" : "#757575";
                numberHint.style.color = hasNumber ? "#4CAF50" : "#757575";
                specialHint.style.color = hasSpecial ? "#4CAF50" : "#757575";

                // Calculate strength
                strength = [hasLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
                
                // Update strength bar
                const strengthColors = ["#f44336", "#ff9800", "#ffeb3b", "#4caf50"];
                passwordStrengthBar.style.width = (strength * 25) + "%";
                passwordStrengthBar.style.backgroundColor = strengthColors[strength - 1] || "#eee";
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener("input", function() {
                passwordMatchMessage.style.display = 
                    confirmPasswordInput.value === passwordInput.value ? "none" : "block";
            });
        }
    };

    // Form submission handlers
    const setupFormHandlers = () => {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = {
                    email: loginForm.querySelector('#email').value.trim(),
                    password: loginForm.querySelector('#password').value.trim()
                };
                
                const submitButton = loginForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Logging in...';

                try {
                    const response = await fetch(`${API_BASE_URL}login`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Login failed');
                    }

                    // Successful login
                    window.location.href = '../products/product-landing.html';
                } catch (error) {
                    console.error('Login error:', error);
                    alert(error.message || 'Login failed. Please try again.');
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Sign In';
                }
            });
        }

        // Registration Form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = {
                    full_name: registerForm.querySelector('#fullName').value.trim(),
                    email: registerForm.querySelector('#email').value.trim(),
                    phone: registerForm.querySelector('#phone').value.trim(),
                    business: registerForm.querySelector('#business').value.trim(),
                    password: registerForm.querySelector('#password').value
                };

                const confirmPassword = registerForm.querySelector('#confirmPassword').value;
                const termsChecked = registerForm.querySelector('#terms').checked;
                
                // Validation
                if (!Object.values(formData).every(Boolean)) {
                    alert('Please fill in all required fields');
                    return;
                }
                if (formData.password !== confirmPassword) {
                    alert('Passwords do not match');
                    return;
                }
                if (!termsChecked) {
                    alert('You must agree to the terms and conditions');
                    return;
                }

                const submitButton = registerForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Registering...';

                try {
                    const response = await fetch(`${API_BASE_URL}register`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Registration failed');
                    }

                    // Successful registration - redirect to login
                    alert('Registration successful! Redirecting to login...');
                    window.location.href = '/auth/login.html'; // Update this path to your login page
                    // Optional: Redirect or reset form
                    registerForm.reset();
                } catch (error) {
                    console.error('Registration error:', error);
                    alert(error.message || 'Registration failed. Please try again.');
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Register';
                }
            });
        }
    };

    // Initialize
    setupPasswordValidation();
    setupFormHandlers();
});