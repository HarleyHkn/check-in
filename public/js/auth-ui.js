// Global profile icon + dropdown + login/signup "banner" + session state +
// logout. The markup (profile button/menu, banner overlay) lives once in
// index.html, outside any .page div, so it's visible on every page.

import { loadWeightLog, resetWeightLog } from './weights-ui.js';
import { loadStepsLog, resetStepsLog } from './steps-ui.js';
import { loadMeasurementTypes, loadMeasurementValues, resetMeasurementTypes, resetMeasurementValues } from './measurements-ui.js';
import { loadPhotoList, resetPhotoList } from './photos-ui.js';
import { renderCalendarPage } from './calendar.js';

// Shared login state, read and set from a few files across the app
// (checkin-page.js and this file). Wrapped in one object instead
// of plain `let isLoggedIn`/`let pendingSaveAction` on purpose: an ES module can
// only REASSIGN a value from inside the file that exports it - other files
// that `import` it only get a read-only view of that binding. Putting the
// values on an object sidesteps that, since other files can still change a
// PROPERTY of an imported object (authState.isLoggedIn = true), just not the
// imported binding itself.
export const authState = {
    isLoggedIn: false,       // checked by checkin-page.js before saving
    pendingSaveAction: null  // a save that got interrupted because login was required; retried after a successful login/signup
};

let bannerMode = 'login'; // or 'signup' - which form the banner is currently showing

const bannerOverlay = document.getElementById('bannerOverlay');
const bannerTitle = document.getElementById('bannerTitle');
const bannerUsernameInput = document.getElementById('bannerUsernameInput');
const bannerPasswordInput = document.getElementById('bannerPasswordInput');
const bannerErrorText = document.getElementById('bannerErrorText');
const bannerSubmit = document.getElementById('bannerSubmit');
const bannerSwitchLink = document.getElementById('bannerSwitchLink');

function setBannerMode(mode) {
    bannerMode = mode;
    const isLogin = mode === 'login';
    bannerTitle.textContent = isLogin ? 'Log In' : 'Sign Up';
    bannerSubmit.textContent = isLogin ? 'Log In' : 'Sign Up';
    bannerErrorText.textContent = '';
    bannerSwitchLink.innerHTML = isLogin
        ? 'Don\'t have an account? <b>Sign up</b>'
        : 'Already have an account? <b>Log in</b>';
}

// Opens the login banner - called by the dropdown's "Log in" button, and by
// any save action that needs login first (checkin-page.js).
export function openLoginModal() {
    document.getElementById('profileMenu').classList.remove('open');
    bannerUsernameInput.value = '';
    bannerPasswordInput.value = '';
    setBannerMode('login');
    bannerOverlay.classList.add('open');
}

function closeBanner() {
    bannerOverlay.classList.remove('open');
}

// Submits whichever form the banner is currently showing.
async function submitBanner() {
    const username = bannerUsernameInput.value;
    const password = bannerPasswordInput.value;
    const endpoint = bannerMode === 'login' ? '/api/login' : '/api/signup';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    });
    const data = await response.json();

    if (!response.ok) {
        bannerErrorText.textContent = data.error;
        return;
    }

    closeBanner();
    await afterLogin(data.username);
}

// Runs after a successful login or signup: updates the profile icon/dropdown,
// re-fetches this account's data (it may have entries from before, even if
// this is a fresh page load that started out logged out), re-renders, then
// retries whatever save was interrupted to get here, if any.
async function afterLogin(username) {
    showLoggedIn(username);

    await loadWeightLog();
    await loadStepsLog();
    await loadMeasurementTypes();
    await loadMeasurementValues();
    await loadPhotoList();

    renderCalendarPage(); // otherwise the calendar keeps showing stale chips from before login

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

    renderCalendarPage(); // otherwise the calendar keeps showing the logged-out user's chips
    document.getElementById('profileMenu').classList.remove('open');
}

// Shows the "logged in" state: coral ring+dot on the profile icon, dropdown
// swaps to the logged-in view.
function showLoggedIn(username) {
    authState.isLoggedIn = true;
    document.getElementById('profileBtn').classList.add('logged-in');
    document.getElementById('loggedOutView').style.display = 'none';
    document.getElementById('loggedInView').style.display = 'block';
    document.getElementById('profileUsername').textContent = username;
}

// Shows the "logged out" state: no ring, dropdown swaps back to the log-in prompt.
function showLoggedOut() {
    authState.isLoggedIn = false;
    document.getElementById('profileBtn').classList.remove('logged-in');
    document.getElementById('loggedOutView').style.display = 'block';
    document.getElementById('loggedInView').style.display = 'none';
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

// ---- profile icon + dropdown ----
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

profileBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    profileMenu.classList.toggle('open');
});
document.addEventListener('click', function () {
    profileMenu.classList.remove('open');
});
profileMenu.addEventListener('click', function (event) {
    event.stopPropagation();
});

document.getElementById('openBannerBtn').addEventListener('click', openLoginModal);
document.getElementById('logoutBtn').addEventListener('click', logout);

// ---- login/signup banner ----
document.getElementById('bannerClose').addEventListener('click', closeBanner);
bannerOverlay.addEventListener('click', function (event) {
    if (event.target === bannerOverlay) {
        closeBanner();              // click outside the sheet closes it
    }
});
bannerSwitchLink.addEventListener('click', function () {
    setBannerMode(bannerMode === 'login' ? 'signup' : 'login');
});
bannerSubmit.addEventListener('click', submitBanner);

checkLoginStatus();
