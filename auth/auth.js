document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = 'http://localhost:8000/api/';

    // Error handling utilities
    const showError = (input, message) => {
        let error = input.nextElementSibling;
        if (!error || !error.classList.contains('error-message')) {
            error = document.createElement('div');
            error.className = 'error-message';
            error.style.color = 'red';
            error.style.fontSize = '0.875rem';
            input.insertAdjacentElement('afterend', error);
        }
        error.textContent = message;
    };

    const clearError = (input) => {
        const error = input.nextElementSibling;
        if (error && error.classList.contains('error-message')) {
            error.textContent = '';
        }
    };

    

    // Validation functions
    const isValidName = (name) => /^[A-Za-z\s]{2,}(?: [A-Za-z\s]{2,})+$/.test(name);
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPhone = (phone) => /^(?:\+254|0)?7\d{8}$/.test(phone);
    const isValidBusiness = (biz) => /^[\w\s\-&,.'"]{3,}$/.test(biz);
    const hasStrongPassword = (pw) => pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[\W_]/.test(pw);

    // Generic validation attachment
    const attachBlurValidation = (input, validatorFn, message) => {
        input.addEventListener('blur', () => {
            if (!validatorFn(input.value.trim())) {
                showError(input, message);
            } else {
                clearError(input);
            }
        });
    };

    // Password strength indicators
    const setupPasswordValidation = () => {
        const passwordInput = document.getElementById("password");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        const passwordStrengthBar = document.getElementById("passwordStrengthBar");

        const lengthHint = document.getElementById("lengthHint");
        const uppercaseHint = document.getElementById("uppercaseHint");
        const numberHint = document.getElementById("numberHint");
        const specialHint = document.getElementById("specialHint");
        const passwordMatchMessage = document.getElementById("passwordMatch");

        const updateHint = (hint, condition) => {
            hint.style.color = condition ? "#4CAF50" : "#757575";
        };

        passwordInput?.addEventListener("input", function () {
            const password = passwordInput.value;
            const hasLength = password.length >= 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSpecial = /[\W_]/.test(password);

            updateHint(lengthHint, hasLength);
            updateHint(uppercaseHint, hasUppercase);
            updateHint(numberHint, hasNumber);
            updateHint(specialHint, hasSpecial);

            const strength = [hasLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
            const strengthColors = ["#f44336", "#ff9800", "#ffeb3b", "#4caf50"];
            passwordStrengthBar.style.width = (strength * 25) + "%";
            passwordStrengthBar.style.backgroundColor = strengthColors[strength - 1] || "#eee";
        });

        confirmPasswordInput?.addEventListener("input", function () {
            passwordMatchMessage.style.display =
                confirmPasswordInput.value !== passwordInput.value ? "block" : "none";
        });

        confirmPasswordInput?.addEventListener("blur", function () {
            if (confirmPasswordInput.value !== passwordInput.value) {
                showError(confirmPasswordInput, "Passwords do not match");
            } else {
                clearError(confirmPasswordInput);
            }
        });
    };

    // Enhanced Toast notification system
    function showToast(message, type = 'success', duration = 3000) {
        // Longer duration for success messages
        if (type === 'success') {
            duration = 5000; // 5 seconds for success messages
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            min-width: 250px;
            margin-top: 10px;
            padding: 16px;
            border-radius: 4px;
            font-size: 0.9rem;
            color: #fff;
            background-color: ${type === 'success' ? '#4caf50' : '#f44336'};
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        `;

        // Add progress bar for toast
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            width: 100%;
            background-color: rgba(255,255,255,0.3);
        `;
        
        const progress = document.createElement('div');
        progress.style.cssText = `
            height: 100%;
            width: 100%;
            background-color: #fff;
            animation: progress ${duration}ms linear forwards;
        `;
        
        progressBar.appendChild(progress);
        toast.appendChild(progressBar);

        const container = document.getElementById('toastContainer') || document.body;
        container.appendChild(toast);

        // Add animation for progress bar
        const style = document.createElement('style');
        style.textContent = `
            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(style);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.addEventListener('transitionend', () => {
                toast.remove();
                style.remove();
            });
        }, duration);
    }

    // Registration form handling
    const setupRegisterForm = () => {
        const form = document.getElementById('registerForm');
        if (!form) return;

        const fullNameInput = form.querySelector('#fullName');
        const emailInput = form.querySelector('#email');
        const phoneInput = form.querySelector('#phone');
        const businessInput = form.querySelector('#business');
        const passwordInput = form.querySelector('#password');
        const confirmPasswordInput = form.querySelector('#confirmPassword');
        const termsCheckbox = form.querySelector('#terms');

        attachBlurValidation(fullNameInput, isValidName, "Enter your full name (first and last, no foreign symbols)");
        attachBlurValidation(emailInput, isValidEmail, "Enter a valid email address");
        attachBlurValidation(phoneInput, isValidPhone, "Enter a valid Kenyan phone number");
        attachBlurValidation(businessInput, isValidBusiness, "Enter a valid business name");
        attachBlurValidation(passwordInput, hasStrongPassword, "Password must be at least 8 characters, with uppercase, number, and special character");

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const formData = {
                full_name: fullNameInput.value.trim(),
                email: emailInput.value.trim(),
                phone: phoneInput.value.trim(),
                business: businessInput.value.trim(),
                password: passwordInput.value
            };

            let hasError = false;

            if (!isValidName(formData.full_name)) {
                showError(fullNameInput, "Enter your full name (first and last, no foreign symbols)");
                hasError = true;
            }

            if (!isValidEmail(formData.email)) {
                showError(emailInput, "Enter a valid email address");
                hasError = true;
            }

            if (!isValidPhone(formData.phone)) {
                showError(phoneInput, "Enter a valid Kenyan phone number");
                hasError = true;
            }

            if (!isValidBusiness(formData.business)) {
                showError(businessInput, "Enter a valid business name");
                hasError = true;
            }

            if (!termsCheckbox.checked) {
                showToast("You must agree to the terms and conditions", 'error');
                return;
            }

            if (hasError) return;

            const submitButton = form.querySelector('button[type="submit"]');
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
                if (!response.ok) throw new Error(data.error || 'Registration failed');

                showToast('Registration successful! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = '/auth/login.html';
                }, 2000);
            } catch (error) {
                showToast(error.message || 'Registration failed. Please try again.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
            }
        });
    };

    const setupLoginForm = () => {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;
    
        const emailInput = loginForm.querySelector('#email');
        const passwordInput = loginForm.querySelector('#password');
        const rememberMeCheckbox = loginForm.querySelector('#rememberMe');
    
        attachBlurValidation(emailInput, isValidEmail, "Enter a valid email");
        attachBlurValidation(passwordInput, pw => pw.length > 0, "Password is required");
    
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                email: emailInput.value.trim(),
                password: passwordInput.value.trim(),
                remember_me: rememberMeCheckbox?.checked || false
            };
            
            // Clear previous errors
            clearError(emailInput);
            clearError(passwordInput);
    
            // Validate inputs
            let hasError = false;
            if (!formData.email) {
                showError(emailInput, "Email is required");
                hasError = true;
            } else if (!isValidEmail(formData.email)) {
                showError(emailInput, "Enter a valid email address");
                hasError = true;
            }
            
            if (!formData.password) {
                showError(passwordInput, "Password is required");
                hasError = true;
            }
            
            if (hasError) {
                showToast("Please fix the errors in the form", 'error');
                return;
            }
    
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
                
                // Check for error in response
                if (data.error) {
                    throw new Error(data.error);
                }
                
                if (!response.ok) {
                    throw new Error(data.error || 'Login failed. Please check your credentials.');
                }
    
                // Store session ID in cookie
                if (data.session?.session_id) {
                    const expiresDate = new Date(data.session.expires_at * 1000);
                    let cookieString = `session_id=${data.session.session_id}; path=/; SameSite=Lax`;
                    
                    // Add secure flag in production (HTTPS)
                    if (window.location.protocol === 'https:') {
                        cookieString += '; Secure';
                    }
                    
                    // Add expiration if "remember me" was checked
                    if (formData.remember_me) {
                        cookieString += `; expires=${expiresDate.toUTCString()}`;
                    }
                    
                    // Set the cookie
                    document.cookie = cookieString;
                    
                    // For debugging: verify cookie was set
                    console.log('Cookie set:', document.cookie);
                }
    
                // Show success toast with longer duration
                showToast('Login successful! Redirecting to dashboard...');
                
                // Redirect to dashboard or protected page
                window.location.href = '/products/product-landing.html';
                
            } catch (error) {
                console.error('Login error:', error);
                showToast(error.message || 'Login failed. Please try again.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
            }
        });
    };

    // Initialize all components
    setupPasswordValidation();
    setupRegisterForm();
    setupLoginForm();
    
    
    // Create toast container if it doesn't exist
    if (!document.getElementById('toastContainer')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1000';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '10px';
        document.body.appendChild(toastContainer);
    }
});