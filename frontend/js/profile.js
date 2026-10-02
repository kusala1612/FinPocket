/**
 * FinPocket Profile Page Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    initSidebarUser();
    initSidebarToggle();
    initLogout();

    loadProfile();
    loadPreferences();

    // Profile form
    const form = document.getElementById('profile-form');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }

    // Password form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // Preferences form
    const prefForm = document.getElementById('preferences-form');
    if (prefForm) {
        prefForm.addEventListener('submit', handlePreferencesUpdate);
    }

    // Test monthly summary button
    const testSummaryBtn = document.getElementById('test-summary-btn');
    if (testSummaryBtn) {
        testSummaryBtn.addEventListener('click', handleTestSummary);
    }

    // Resend profile verification button
    const resendVerifyBtn = document.getElementById('resend-profile-verify-btn');
    if (resendVerifyBtn) {
        resendVerifyBtn.addEventListener('click', handleResendVerification);
    }

    // Eye toggles for password fields
    setupPasswordToggle('toggle-current-password', 'current-password');
    setupPasswordToggle('toggle-new-password', 'new-password');
    setupPasswordToggle('toggle-confirm-new-password', 'confirm-new-password');
});

function setupPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (btn && input) {
        btn.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.textContent = isPassword ? '🙈' : '👁️';
        });
    }
}

async function loadProfile() {
    try {
        const user = await apiGet('/user/me');

        if (user && user.email) {
            populateProfile(user);
        } else {
            throw new Error('Invalid profile data received');
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showAlert(
            'profile-alert',
            error.message || 'Unable to load profile data. Please refresh.'
        );
    }
}

function populateProfile(user) {
    const nameInput = document.getElementById('profile-fullname');
    const emailInput = document.getElementById('profile-email');
    const phoneInput = document.getElementById('profile-phone');
    const roleInput = document.getElementById('profile-role');
    const createdAtInput = document.getElementById('profile-created');
    const avatarEl = document.getElementById('profile-avatar');
    const nameDisplay = document.getElementById('profile-name-display');
    const verifyBadge = document.getElementById('email-verification-badge');
    const verifyActions = document.getElementById('email-verify-actions');

    if (nameInput) nameInput.value = user.fullName || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';

    if (roleInput) {
        roleInput.value = user.role === 'ADMIN'
            ? 'Administrator'
            : 'Member';
    }

    if (createdAtInput) {
        createdAtInput.value = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : '';
    }

    if (avatarEl) {
        const names = (user.fullName || '').trim().split(/\s+/).filter(Boolean);
        avatarEl.textContent = names.length >= 2
            ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
            : (names[0] ? names[0][0].toUpperCase() : '?');
    }

    if (nameDisplay) {
        nameDisplay.textContent = user.fullName || '';
    }

    // Email verification status
    if (verifyBadge) {
        if (user.emailVerified) {
            verifyBadge.textContent = 'Verified ✓';
            verifyBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
            verifyBadge.style.color = '#22c55e';
            if (verifyActions) verifyActions.style.display = 'none';
        } else {
            verifyBadge.textContent = 'Not Verified ⚠️';
            verifyBadge.style.backgroundColor = 'rgba(234, 179, 8, 0.15)';
            verifyBadge.style.color = '#eab308';
            if (verifyActions) verifyActions.style.display = 'block';
        }
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const nameInput = document.getElementById('profile-fullname');
    const phoneInput = document.getElementById('profile-phone');

    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!fullName || fullName.length < 2) {
        showAlert('profile-alert', 'Full name must be at least 2 characters');
        return;
    }

    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    }

    try {
        const updatedUser = await apiPut('/user/profile', {
            fullName,
            phone
        });

        if (!updatedUser || !updatedUser.email) {
            throw new Error('Invalid profile response received');
        }

        populateProfile(updatedUser);

        const cachedUser = getCurrentUser();
        if (cachedUser) {
            cachedUser.fullName = updatedUser.fullName || fullName;
            cachedUser.email = updatedUser.email;
            cachedUser.phone = updatedUser.phone || '';
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(cachedUser));
        }

        initSidebarUser();
        showAlert('profile-alert', 'Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Failed to update profile:', error);
        showAlert('profile-alert', error.message || 'Failed to update profile');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
    }
}

async function handleResendVerification() {
    const resendBtn = document.getElementById('resend-profile-verify-btn');
    const msgEl = document.getElementById('profile-verify-msg');
    const emailInput = document.getElementById('profile-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) return;

    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Sending...';
    }

    try {
        const res = await apiPost('/auth/resend-verification', { email });
        if (msgEl) {
            msgEl.textContent = res.message || 'Verification link sent!';
            msgEl.style.color = '#22c55e';
        }
    } catch (err) {
        if (msgEl) {
            msgEl.textContent = err.message || 'Failed to send verification link.';
            msgEl.style.color = '#ef4444';
        }
    } finally {
        if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Verification Email';
        }
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const saveBtn = document.getElementById('save-password-btn');

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!currentPassword) {
        showAlert('password-alert', 'Please enter your current password');
        currentPasswordInput.focus();
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        showAlert('password-alert', 'New password must be at least 6 characters');
        newPasswordInput.focus();
        return;
    }

    if (newPassword === currentPassword) {
        showAlert('password-alert', 'New password cannot be the same as your current password');
        newPasswordInput.focus();
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showAlert('password-alert', 'New passwords do not match');
        confirmNewPasswordInput.focus();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Updating...';

    try {
        const res = await apiPut('/user/change-password', {
            currentPassword,
            newPassword
        });

        showAlert('password-alert', res.message || 'Password updated successfully!', 'success');
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
    } catch (error) {
        showAlert('password-alert', error.message || 'Failed to update password');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Update Password';
    }
}

async function loadPreferences() {
    try {
        const prefs = await apiGet('/notifications/preferences');
        if (prefs) {
            setCheckbox('pref-email', prefs.emailNotifications);
            setCheckbox('pref-overspending', prefs.overspendingAlerts);
            setCheckbox('pref-budget', prefs.budgetAlerts);
            setCheckbox('pref-goal', prefs.goalAlerts);
            setCheckbox('pref-reminder', prefs.reminderAlerts);
            setCheckbox('pref-summary', prefs.monthlySummary);
        }
    } catch (error) {
        console.warn('Could not load preferences:', error);
    }
}

function setCheckbox(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(val);
}

function getCheckbox(id) {
    const el = document.getElementById(id);
    return el ? el.checked : true;
}

async function handlePreferencesUpdate(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('save-pref-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    }

    const dto = {
        emailNotifications: getCheckbox('pref-email'),
        overspendingAlerts: getCheckbox('pref-overspending'),
        budgetAlerts: getCheckbox('pref-budget'),
        goalAlerts: getCheckbox('pref-goal'),
        reminderAlerts: getCheckbox('pref-reminder'),
        monthlySummary: getCheckbox('pref-summary')
    };

    try {
        await apiPut('/notifications/preferences', dto);
        showAlert('pref-alert', 'Notification preferences saved successfully!', 'success');
    } catch (error) {
        showAlert('pref-alert', error.message || 'Failed to save preferences.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Preferences';
        }
    }
}

async function handleTestSummary() {
    const btn = document.getElementById('test-summary-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Generating...';
    }

    try {
        const res = await apiPost('/notifications/monthly-summary', {});
        showAlert('pref-alert', res.message || 'Monthly summary generated and sent!', 'success');
    } catch (error) {
        showAlert('pref-alert', error.message || 'Failed to trigger summary report.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📧 Send Monthly Summary Now';
        }
    }
}