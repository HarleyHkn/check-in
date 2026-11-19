// The Check-in page: one flowing page (Weight -> Steps -> Measurements ->
// Photo -> Save) for the current week, opened via the floating "+" button in
// the bottom nav. Saves weight/steps against this week's Monday date instead
// of today's date - weight/steps are now weekly-only entries, same pattern
// measurements and photos already used. The section
// builders live in checkin-sections.js/checkin-photo.js - this file just
// orchestrates opening, closing, and saving.

import { getMondayDate, getWeekNumber } from './date-utils.js';
import { upsertEntryForDate } from './weights-ui.js';
import { upsertStepsForDate } from './steps-ui.js';
import { upsertMeasurementValue } from './measurements-ui.js';
import { buildHeader, buildWeightSection, buildStepsSection, buildMeasurementsSection, weekHasAnyData } from './checkin-sections.js';
import { buildPhotoSection } from './checkin-photo.js';
import { buildWeekPager } from './checkin-pager.js';
import { dataReady } from './data-ready.js';
import { authState, openLoginModal } from './auth-ui.js';
import { renderOverview } from './overview.js';
import { renderPhotosPage } from './photos-page.js';
import { renderCalendarPage } from './calendar.js';

let currentMonday = null;            // the week being edited - the current real week when opened via the FAB, or whichever week Calendar opened this for
let previousPageId = 'overviewPage'; // which tab was showing before Check-in was opened

// True when this was opened from Calendar for a week that already has saved
// data - gates the "Update check-in" button label + the confirm-before-save
// dialog below, since editing already-saved data is riskier than a fresh entry.
let isEditingExistingWeek = false;

// True when opened via Calendar (openCheckinPageForWeek), not the FAB - only
// then does dragging left/right to browse to the adjacent week make sense
// (the FAB always opens the current real week, and there's never a "next"
// week past that one to swipe into).
let canSwipeBetweenWeeks = false;

let stopCurrentPager = null; // stops the previous week-pager's animation loop before rebuilding it

function buildPhotoCard(monday) {
    const card = document.createElement('div');
    card.className = 'section-card';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Photo';
    card.appendChild(label);

    card.appendChild(buildPhotoSection(monday, renderCheckinPage)); // re-render everything after an upload
    return card;
}

// Builds the fully-interactive panel for currentMonday - the real inputs,
// wired to real save logic. Used directly (FAB-opened) or as the live center
// panel of the week-pager's 3-panel track (Calendar-opened).
function buildCurrentWeekPanel() {
    const panel = document.createElement('div');
    panel.appendChild(buildHeader(currentMonday));
    panel.appendChild(buildWeightSection(currentMonday));
    panel.appendChild(buildStepsSection(currentMonday));
    panel.appendChild(buildMeasurementsSection(currentMonday, renderCheckinPage));
    panel.appendChild(buildPhotoCard(currentMonday));
    return panel;
}

// Rebuilds the whole page for whichever week currentMonday points at - called
// on open, and again after anything changes (a photo upload, adding/removing
// a custom measurement type, a save). When opened from Calendar, this also
// rebuilds the drag-to-browse pager (see checkin-pager.js) around the fresh
// panel, so its left/right neighbors always match whatever week just loaded.
function renderCheckinPage() {
    if (stopCurrentPager !== null) {
        stopCurrentPager();
        stopCurrentPager = null;
    }

    const body = document.getElementById('checkinBody');
    const currentPanel = buildCurrentWeekPanel();

    if (canSwipeBetweenWeeks) {
        stopCurrentPager = buildWeekPager(body, currentPanel, currentMonday, openCheckinPageForWeek) || null;
    } else {
        body.innerHTML = '';
        body.appendChild(currentPanel);
    }

    document.getElementById('checkinSaveButton').textContent = isEditingExistingWeek ? 'Update check-in' : 'Save check-in';
}

// Switches which .page is shown, mirroring pages.js's showPage() - duplicated
// here (rather than imported) to avoid a circular import, since pages.js is
// the one that imports openCheckinPage() from this file.
function goToPage(pageId) {
    const pages = document.querySelectorAll('.page');
    for (let i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
    }
    document.getElementById(pageId).classList.add('active');

    const navButtons = document.querySelectorAll('.nav-item');
    for (let i = 0; i < navButtons.length; i++) {
        navButtons[i].classList.remove('active');
    }
    const navButton = document.querySelector('.nav-item[data-page="' + pageId + '"]');
    if (navButton !== null) {
        navButton.classList.add('active');
    }

    if (pageId === 'overviewPage') {
        renderOverview();
    }
    if (pageId === 'photosPage') {
        renderPhotosPage();
    }
}

// Shared by both entry points below: shows the Check-in page on top of
// whichever tab was active, with currentMonday/isEditingExistingWeek already set.
function activateCheckinPage() {
    const activePage = document.querySelector('.page.active');
    if (activePage !== null && activePage.id !== 'checkinPage') {
        previousPageId = activePage.id;
    }

    renderCheckinPage();

    const pages = document.querySelectorAll('.page');
    for (let i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
    }
    document.getElementById('checkinPage').classList.add('active');

    const navButtons = document.querySelectorAll('.nav-item');
    for (let i = 0; i < navButtons.length; i++) {
        navButtons[i].classList.remove('active'); // Check-in isn't one of the 4 tabs, so none should look active
    }
}

// Opens Check-in for the current real week - called by the floating "+"
// button, which is clickable the instant the app loads. Waits for app.js's
// initial data load to finish first (dataReady) - without this, opening
// Check-in too quickly after a page load would build it from empty
// measurement data (see data-ready.js for the full explanation). dataReady is
// already resolved in the normal case (the loads finish long before anyone
// manages to tap anything), so this almost never actually waits.
export async function openCheckinPage() {
    currentMonday = getMondayDate();
    isEditingExistingWeek = false;
    canSwipeBetweenWeeks = false;
    await dataReady;
    activateCheckinPage();
}

// Opens Check-in pre-filled for an arbitrary week - called by Calendar when a
// week-row is tapped. Same form as above, just a different week, and if that
// week already has saved data the Save button becomes "Update check-in" and
// asks for confirmation first (see saveCheckin() below).
export async function openCheckinPageForWeek(monday) {
    currentMonday = new Date(monday);
    await dataReady; // weekHasAnyData() below also reads measurement data, so wait before computing it too
    isEditingExistingWeek = weekHasAnyData(currentMonday);
    canSwipeBetweenWeeks = true;
    activateCheckinPage();
}

// Closes without saving - goes back to whichever tab was showing before.
function closeCheckinPage() {
    goToPage(previousPageId);
}

function updateConfirmText() {
    document.getElementById('checkinConfirmWeekLabel').textContent = 'Week ' + getWeekNumber(currentMonday) + "'s";
}

function openUpdateConfirm() {
    updateConfirmText();
    document.getElementById('checkinConfirmOverlay').classList.add('open');
}

function closeUpdateConfirm() {
    document.getElementById('checkinConfirmOverlay').classList.remove('open');
}

// The Save button's click handler - an existing week needs a yes/no confirm
// first so saved data isn't overwritten by accident; a fresh week saves right away.
function saveCheckin() {
    if (isEditingExistingWeek) {
        openUpdateConfirm();
        return;
    }
    performSave();
}

// Reads every input on the page and saves it, then returns to Overview.
async function performSave() {
    if (!authState.isLoggedIn) {
        authState.pendingSaveAction = performSave;
        openLoginModal();
        return;
    }

    const weightValue = document.getElementById('checkinWeightInput').value;
    if (weightValue !== '') {
        const weight = Number(weightValue);
        if (!isNaN(weight)) {
            await upsertEntryForDate(currentMonday, weight);
        }
    }

    const stepsValue = document.getElementById('checkinStepsInput').value;
    if (stepsValue !== '') {
        const steps = Number(stepsValue);
        if (!isNaN(steps)) {
            await upsertStepsForDate(currentMonday, steps);
        }
    }

    const measureInputs = document.querySelectorAll('.checkin-measure-input');
    for (let i = 0; i < measureInputs.length; i++) {
        const value = measureInputs[i].value;
        if (value === '') {
            continue;
        }
        const numberValue = Number(value);
        if (isNaN(numberValue)) {
            continue;
        }
        await upsertMeasurementValue(currentMonday, measureInputs[i].dataset.typeName, numberValue);
    }

    // Photos are already saved immediately on upload (see checkin-photo.js), nothing to do here.

    renderCalendarPage(); // refresh the calendar's week list now that this week's data changed
    goToPage('overviewPage');
}

document.getElementById('checkinCloseBtn').addEventListener('click', closeCheckinPage);
document.getElementById('checkinSaveButton').addEventListener('click', saveCheckin);
document.getElementById('checkinConfirmCancel').addEventListener('click', closeUpdateConfirm);
document.getElementById('checkinConfirmYes').addEventListener('click', function () {
    closeUpdateConfirm();
    performSave();
});
