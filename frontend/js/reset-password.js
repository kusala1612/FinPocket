/**
 * FinPocket Reset Password Page Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const form = document.getElementById('reset-form');
    const passwordInput = document.getElementById('reset-password');
    const confirmPasswordInput = document.getElementById('reset-confirm-password');
    const togglePassword = document.getElementById('toggle-reset-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    const submitBtn = document.getElementById('reset-btn');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    if (!token) {
        showAlert('reset-alert', 'Invalid or missing password reset token. Please request a new reset link.');
        if (submitBtn) submitBtn.disabled = true;
        if (passwordInput) passwordInput.disabled = true;
        if (confirmPasswordInput) confirmPasswordInput.disabled = true;
        return;
    }

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
            const val = passwordInput.value;
            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            let level = 'weak';
            let text = 'Weak';
            if (score >= 4) {
                level = 'strong';
                text = 'Strong';
            } else if (score >= 2) {
                level = 'medium';
                text = 'Medium';
            }

            if (strengthFill) strengthFill.className = 'strength-fill ' + level;
            if (strengthText) strengthText.textContent = text;
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!newPassword || newPassword.length < 6) {
            showAlert('reset-alert', 'Password must be at least 6 characters long');
            passwordInput.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('reset-alert', 'Passwords do not match');
            confirmPasswordInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Resetting Password...';

        try {
            const response = await apiPost('/auth/reset-password', {
                token: token.trim(),
                newPassword: newPassword
            });

            showAlert('reset-alert', response.message || 'Password reset successfully! Redirecting to login...', 'success');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (error) {
            showAlert('reset-alert', error.message || 'Failed to reset password. Link may be expired.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Password';
        }
    });
});
