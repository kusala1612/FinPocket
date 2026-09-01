/**
 * FinPocket Profile Page Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Require authentication
    if (!requireAuth()) return;

    // Initialize common dashboard components
    initSidebarUser();
    initSidebarToggle();
    initLogout();

    // Load profile data
    loadProfile();

    // Handle profile form submission
    const form = document.getElementById('profile-form');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }
});

async function loadProfile() {
    try {
        const response = await apiGet('/user/me');

        if (response.success && response.data) {
            populateProfile(response.data);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showAlert('profile-alert', 'Unable to load profile data. Please refresh.');
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

    if (nameInput) nameInput.value = user.fullName || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (roleInput) roleInput.value = user.role === 'ADMIN' ? 'Administrator' : 'Member';
    if (createdAtInput && user.createdAt) {
        createdAtInput.value = new Date(user.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    if (avatarEl) {
        const names = (user.fullName || '').trim().split(' ');
        avatarEl.textContent = names.length >= 2
            ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
            : (names[0] ? names[0][0].toUpperCase() : '?');
    }
    if (nameDisplay) nameDisplay.textContent = user.fullName || '';
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const fullName = document.getElementById('profile-fullname').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();

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
        const response = await apiPut('/user/profile', { fullName, phone });

        if (response.success) {
            showAlert('profile-alert', 'Profile updated successfully!', 'success');

            // Update local storage with new data
            const user = getCurrentUser();
            if (user) {
                user.fullName = response.data.fullName || fullName;
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
                initSidebarUser(); // Refresh sidebar
            }

            populateProfile(response.data);
        }
    } catch (error) {
        showAlert('profile-alert', error.message || 'Failed to update profile');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
    }
}
