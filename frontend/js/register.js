/**
 * FinPocket Registration Page Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (redirectIfAuthenticated()) return;

    const form = document.getElementById('register-form');
    const fullNameInput = document.getElementById('reg-fullname');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const confirmPasswordInput = document.getElementById('reg-confirm-password');
    const phoneInput = document.getElementById('reg-phone');
    const togglePassword = document.getElementById('toggle-reg-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    const submitBtn = document.getElementById('register-btn');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    // Toggle password visibility
    function setupToggle(toggleBtn, input) {
        if (toggleBtn && input) {
            toggleBtn.addEventListener('click', () => {
                const type = input.type === 'password' ? 'text' : 'password';
                input.type = type;
                toggleBtn.textContent = type === 'password' ? '👁️' : '🙈';
            });
        }
    }

    setupToggle(togglePassword, passwordInput);
    setupToggle(toggleConfirmPassword, confirmPasswordInput);

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const strength = checkPasswordStrength(passwordInput.value);
            if (strengthFill) {
                strengthFill.className = 'strength-fill ' + strength.level;
            }
            if (strengthText) {
                strengthText.textContent = strength.text;
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const phone = phoneInput ? phoneInput.value.trim() : '';

        // Validation
        if (!fullName || fullName.length < 2) {
            showAlert('register-alert', 'Please enter your full name (at least 2 characters)');
            fullNameInput.focus();
            return;
        }

        if (!email || !isValidEmail(email)) {
            showAlert('register-alert', 'Please enter a valid email address');
            emailInput.focus();
            return;
        }

        if (!password || password.length < 6) {
            showAlert('register-alert', 'Password must be at least 6 characters');
            passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            showAlert('register-alert', 'Passwords do not match');
            confirmPasswordInput.focus();
            return;
        }

        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating Account...';

        try {
            const response = await registerUser(fullName, email, password, confirmPassword, phone);

            if (response.success) {
                showAlert('register-alert', response.message || 'Account created successfully! Please check your email to verify. Redirecting to login...', 'success');

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2500);
            }
        } catch (error) {
            showAlert('register-alert', error.message || 'Registration failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account';
        }
    });
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkPasswordStrength(password) {
    if (!password) return { level: '', text: '' };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 'weak', text: 'Weak' };
    if (score <= 2) return { level: 'fair', text: 'Fair' };
    if (score <= 3) return { level: 'good', text: 'Good' };
    return { level: 'strong', text: 'Strong' };
}
