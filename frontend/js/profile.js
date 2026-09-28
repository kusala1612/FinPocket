
/**
 * FinPocket Profile Page Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    initSidebarUser();
    initSidebarToggle();
    initLogout();

    loadProfile();

    const form = document.getElementById('profile-form');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }
});

async function loadProfile() {
    try {
        // Backend returns UserDto directly
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
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const nameInput = document.getElementById('profile-fullname');
    const phoneInput = document.getElementById('profile-phone');

    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!fullName || fullName.length < 2) {
        showAlert(
            'profile-alert',
            'Full name must be at least 2 characters'
        );
        return;
    }

    const saveBtn = document.getElementById('save-profile-btn');

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    }

    try {
        // Backend returns the updated UserDto directly
        const updatedUser = await apiPut('/user/profile', {
            fullName,
            phone
        });

        if (!updatedUser || !updatedUser.email) {
            throw new Error('Invalid profile response received');
        }

        populateProfile(updatedUser);

        // Update cached user details
        const cachedUser = getCurrentUser();

        if (cachedUser) {
            cachedUser.fullName = updatedUser.fullName || fullName;
            cachedUser.email = updatedUser.email;
            cachedUser.phone = updatedUser.phone || '';

            localStorage.setItem(
                AUTH_USER_KEY,
                JSON.stringify(cachedUser)
            );
        }

        initSidebarUser();

        showAlert(
            'profile-alert',
            'Profile updated successfully!',
            'success'
        );
    } catch (error) {
        console.error('Failed to update profile:', error);

        showAlert(
            'profile-alert',
            error.message || 'Failed to update profile'
        );
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
    }
}