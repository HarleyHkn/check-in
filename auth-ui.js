// Login / signup modal. Reuses the same popup (modalOverlay/modalBody/modalTitle)
// that the day and week weight popups use - see modal.js for modalMode/closeModal.

let isLoggedIn = false;      // checked by saveWeight/saveDayModal/saveWeekModal before saving
let pendingSaveAction = null; // a save that got interrupted because login was required; retried after a successful login/signup

function openLoginModal() {
    modalMode = 'login';
    document.getElementById('modalTitle').textContent = 'Log In';
    document.getElementById('modalSaveButton').textContent = 'Log In';
    document.getElementById('modalDeleteButton').style.display = 'none'; // delete button doesn't apply here

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'authUsernameInput';
    usernameInput.className = 'auth-input';
    usernameInput.placeholder = 'Username';
    modalBody.appendChild(usernameInput);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'authPasswordInput';
    passwordInput.className = 'auth-input';
    passwordInput.placeholder = 'Password';
    modalBody.appendChild(passwordInput);

    const errorText = document.createElement('p');
    errorText.id = 'authErrorText';
    modalBody.appendChild(errorText);

    const switchLink = document.createElement('a');
    switchLink.href = '#';
    switchLink.className = 'auth-switch-link';
    switchLink.textContent = "Don't have an account? Sign up";
    switchLink.addEventListener('click', function (event) {
        event.preventDefault();
        openSignupModal();
    });
    modalBody.appendChild(switchLink);

    document.getElementById('modalOverlay').classList.add('open');
}

function openSignupModal() {
    modalMode = 'signup';
    document.getElementById('modalTitle').textContent = 'Sign Up';
    document.getElementById('modalSaveButton').textContent = 'Sign Up';
    document.getElementById('modalDeleteButton').style.display = 'none';

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'authUsernameInput';
    usernameInput.className = 'auth-input';
    usernameInput.placeholder = 'Username';
    modalBody.appendChild(usernameInput);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'authPasswordInput';
    passwordInput.className = 'auth-input';
    passwordInput.placeholder = 'Password';
    modalBody.appendChild(passwordInput);

    const errorText = document.createElement('p');
    errorText.id = 'authErrorText';
    modalBody.appendChild(errorText);

    const switchLink = document.createElement('a');
    switchLink.href = '#';
    switchLink.className = 'auth-switch-link';
    switchLink.textContent = 'Already have an account? Log in';
    switchLink.addEventListener('click', function (event) {
        event.preventDefault();
        openLoginModal();
    });
    modalBody.appendChild(switchLink);

    document.getElementById('modalOverlay').classList.add('open');
}

async function submitLogin() {
    const username = document.getElementById('authUsernameInput').value;
    const password = document.getElementById('authPasswordInput').value;

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    });
    const data = await response.json();

    if (!response.ok) {
        document.getElementById('authErrorText').textContent = data.error;
        return;
    }

    closeModal();
    await afterLogin(data.username);
}

async function submitSignup() {
    const username = document.getElementById('authUsernameInput').value;
    const password = document.getElementById('authPasswordInput').value;

    const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    });
    const data = await response.json();

    if (!response.ok) {
        document.getElementById('authErrorText').textContent = data.error;
        return;
    }

    closeModal();
    await afterLogin(data.username);
}

// Runs after a successful login or signup: updates the header, re-fetches this
// account's weight data (it may have entries from before, even if this is a fresh
// page load that started out logged out), re-renders, then retries whatever save
// was interrupted to get here, if any.
async function afterLogin(username) {
    showLoggedIn(username);

    await loadWeightLog();
    await loadStepsLog();
    await loadMeasurementTypes();
    await loadMeasurementValues();
    await loadPhotoList();

    selectedHomeDay = new Date(); // back to today for whoever just logged in
    refreshHomeStats();
    renderWeekStrip();
    refreshHomeEntryBox();
    calenderFunc(); // otherwise the calendar keeps showing stale tinting from before login

    if (pendingSaveAction !== null) {
        const action = pendingSaveAction;
        pendingSaveAction = null;
        await action();
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    showLoggedOut();

    weightLog = [];                  // don't keep showing the previous user's data
    stepsLog = [];
    measurementTypes = [];
    measurementValues = [];
    photoList = [];
    photoWeeksBackShown = 1; // back to just current + last week for whoever logs in next
    manuallyAddedWeekKeys = {};

    selectedHomeDay = new Date();
    refreshHomeStats();
    renderWeekStrip();
    refreshHomeEntryBox();
    calenderFunc(); // otherwise the calendar keeps showing the logged-out user's tinting
}

function showLoggedIn(username) {
    isLoggedIn = true;
    document.getElementById('loginButton').style.display = 'none';
    document.getElementById('logoutButton').style.display = 'inline-block';

    // Hide the extra "Log In" button shown at the top of Overview/Calendar/Photos
    const loginPromptButtons = document.querySelectorAll('.login-prompt-button');
    for (let i = 0; i < loginPromptButtons.length; i++) {
        loginPromptButtons[i].style.display = 'none';
    }
}

function showLoggedOut() {
    isLoggedIn = false;
    document.getElementById('loginButton').style.display = 'inline-block';
    document.getElementById('logoutButton').style.display = 'none';

    const loginPromptButtons = document.querySelectorAll('.login-prompt-button');
    for (let i = 0; i < loginPromptButtons.length; i++) {
        loginPromptButtons[i].style.display = 'block'; // glass-button's normal display value
    }
}

// On page load, ask the server if we're already logged in (e.g. cookie from an earlier visit).
async function checkLoginStatus() {
    const response = await fetch('/api/whoami');
    if (response.ok) {
        const data = await response.json();
        showLoggedIn(data.username || ('user #' + data.userId));
    } else {
        showLoggedOut();
    }
}

document.getElementById('loginButton').addEventListener('click', openLoginModal);
document.getElementById('logoutButton').addEventListener('click', logout);

const loginPromptButtons = document.querySelectorAll('.login-prompt-button');
for (let i = 0; i < loginPromptButtons.length; i++) {
    loginPromptButtons[i].addEventListener('click', openLoginModal);
}

checkLoginStatus();
