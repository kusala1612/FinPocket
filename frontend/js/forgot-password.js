/**
 * FinPocket Forgot Password Page Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (redirectIfAuthenticated()) return;

    const form = document.getElementById('forgot-form');
    const emailInput = document.getElementById('forgot-email');
    const submitBtn = document.getElementById('forgot-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        if (!email) {
            showAlert('forgot-alert', 'Please enter your email address');
            emailInput.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showAlert('forgot-alert', 'Please enter a valid email address');
            emailInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending...';

        try {
            const response = await apiPost('/auth/forgot-password', { email });

            showAlert(
                'forgot-alert',
                response.message || 'If an account exists with that email, a password reset link has been sent. Please check your inbox.',
                'success'
            );

            // Clear input
            emailInput.value = '';
        } catch (error) {
            showAlert('forgot-alert', error.message || 'Failed to send reset link. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Send Reset Link';
        }
    });
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
