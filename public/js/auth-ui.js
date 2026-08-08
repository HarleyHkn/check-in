// Login / signup modal, session state, and logout. Reuses the same popup
// (modalOverlay/modalBody/modalTitle) that the day and week weight popups use -
// see modal.js for modalState/closeModal.

import { modalState } from './modal.js';
import { closeModal } from './modal.js';
import { loadWeightLog, resetWeightLog } from './weights-ui.js';
import { loadStepsLog, resetStepsLog } from './steps-ui.js';
import { loadMeasurementTypes, loadMeasurementValues, resetMeasurementTypes, resetMeasurementValues } from './measurements-ui.js';
import { loadPhotoList, resetPhotoList } from './photos-ui.js';
import { resetPhotoWeeksBackShown } from './photos-page.js';
import { resetSelectedHomeDay, refreshHomeStats, refreshHomeEntryBox } from './home-page.js';
import { renderWeekStrip } from './home-page.js';
import { calenderFunc } from './calender.js';

// Shared login state, read and set from many files across the app (modal.js,
// week-modal.js, home-page.js, and this file). Wrapped in one object instead of
// plain `let isLoggedIn`/`let pendingSaveAction` on purpose: an ES module can
// only REASSIGN a value from inside the file that exports it - other files
// that `import` it only get a read-only view of that binding. Putting the
// values on an object sidesteps that, since other files can still change a
// PROPERTY of an imported object (authState.isLoggedIn = true), just not the
// imported binding itself.
export const authState = {
    isLoggedIn: false,       // checked by saveWeight/saveDayModal/saveWeekModal before saving
    pendingSaveAction: null  // a save that got interrupted because login was required; retried after a successful login/signup
};

// Opens the login form inside the shared popup.
export function openLoginModal() {
    modalState.mode = 'login';
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

// Opens the signup form inside the shared popup - mirrors openLoginModal() above.
export function openSignupModal() {
    modalState.mode = 'signup';
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

// Submits the login form to the server.
export async function submitLogin() {
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

// Submits the signup form to the server.
export async function submitSignup() {
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
// account's data (it may have entries from before, even if this is a fresh
// page load that started out logged out), re-renders, then retries whatever save
// was interrupted to get here, if any.
async function afterLogin(username) {
    showLoggedIn(username);

    await loadWeightLog();
    await loadStepsLog();
    await loadMeasurementTypes();
    await loadMeasurementValues();
    await loadPhotoList();

    resetSelectedHomeDay(); // back to today for whoever just logged in
    refreshHomeStats();
    renderWeekStrip();
    refreshHomeEntryBox();
    calenderFunc(); // otherwise the calendar keeps showing stale tinting from before login

    if (authState.pendingSaveAction !== null) {
        const action = authState.pendingSaveAction;
        authState.pendingSaveAction = null;
        await action();
    }
}

// Logs out, clears every page's local data so the next visitor doesn't see this
// user's data flash by, and refreshes what's currently on screen.
export async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    showLoggedOut();

    // Clear every page's own copy of this user's data - don't keep showing the
    // previous user's data to whoever logs in next. Each reset*() lives in the
    // file that owns that data (see weights-ui.js's resetWeightLog for why it
    // has to be a function call rather than this file reassigning the arrays directly).
    resetWeightLog();
    resetStepsLog();
    resetMeasurementTypes();
    resetMeasurementValues();
    resetPhotoList();
    resetPhotoWeeksBackShown();        // back to just current + last week for whoever logs in next

    // Re-render everything that was just cleared, so the screen matches the
    // now-empty state immediately instead of showing stale data until the next click.
    resetSelectedHomeDay();
    refreshHomeStats();
    renderWeekStrip();
    refreshHomeEntryBox();
    calenderFunc(); // otherwise the calendar keeps showing the logged-out user's tinting
}

// Shows the "logged in" header state (Log Out button, hides the Log In prompts).
export function showLoggedIn(username) {
    authState.isLoggedIn = true;
    document.getElementById('loginButton').style.display = 'none';
    document.getElementById('logoutButton').style.display = 'inline-block';

    // Hide the extra "Log In" button shown at the top of Overview/Calendar/Photos
    const loginPromptButtons = document.querySelectorAll('.login-prompt-button');
    for (let i = 0; i < loginPromptButtons.length; i++) {
        loginPromptButtons[i].style.display = 'none';
    }
}

// Shows the "logged out" header state (Log In button, shows the Log In prompts).
export function showLoggedOut() {
    authState.isLoggedIn = false;
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
