/**
 * FinPocket Email Verification Page Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const verifyState = document.getElementById('verify-state');
    const resendContainer = document.getElementById('resend-container');
    const resendForm = document.getElementById('resend-form');
    const resendEmail = document.getElementById('resend-email');
    const resendBtn = document.getElementById('resend-btn');

    if (!token) {
        showFailure(
            'Missing Verification Token',
            'No verification token was provided in the link. Please request a new verification email.'
        );
        return;
    }

    try {
        const response = await apiGet(`/auth/verify-email?token=${encodeURIComponent(token.trim())}`);

        if (response.success) {
            showSuccess(response.message || 'Your email has been verified successfully!');
        } else {
            showFailure('Verification Incomplete', response.message || 'Could not verify your email.');
        }
    } catch (error) {
        showFailure('Verification Failed', error.message || 'The verification link is invalid or has expired.');
    }

    function showSuccess(message) {
        verifyState.innerHTML = `
            <div class="verify-icon">🎉</div>
            <h2 style="color: var(--text-primary); margin-bottom: 8px;">Email Verified!</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5;">${message}</p>
            <a href="login.html" class="btn btn-primary btn-auth" style="display: inline-block; text-decoration: none;">
                Proceed to Sign In
            </a>
        `;
        if (resendContainer) resendContainer.style.display = 'none';
    }

    function showFailure(title, message) {
        verifyState.innerHTML = `
            <div class="verify-icon">⚠️</div>
            <h2 style="color: var(--danger, #ef4444); margin-bottom: 8px;">${title}</h2>
            <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">${message}</p>
        `;
        if (resendContainer) {
            resendContainer.style.display = 'block';
        }
    }

    // Handle Resend Form
    if (resendForm) {
        resendForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = resendEmail.value.trim();
            if (!email) {
                showAlert('verify-alert', 'Please enter your email address');
                resendEmail.focus();
                return;
            }

            resendBtn.disabled = true;
            resendBtn.innerHTML = '<span class="spinner"></span> Sending...';

            try {
                const res = await apiPost('/auth/resend-verification', { email });
                showAlert('verify-alert', res.message || 'A new verification link has been sent to your email!', 'success');
                resendEmail.value = '';
            } catch (err) {
                showAlert('verify-alert', err.message || 'Failed to resend verification email.');
            } finally {
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Resend Verification Email';
            }
        });
    }
});
