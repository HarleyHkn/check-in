// Shared modal plumbing, plus the single-day popup. The week popup lives in
// week-modal.js.

import { getWeightForDate, upsertEntryForDate, deleteEntryForDate } from './weights-ui.js';
import { getStepsForDate, upsertStepsForDate, deleteStepsForDate } from './steps-ui.js';
import { getMondayDate, sameDay } from './date-utils.js';
import { refreshHomeStats, renderWeekStrip, refreshHomeEntryBox } from './home-page.js';
import { calenderFunc } from './calender.js';
import { authState, openLoginModal, submitLogin, submitSignup } from './auth-ui.js';
import { saveWeekModal } from './week-modal.js';

// Which popup is currently open ('day', 'week', 'login', or 'signup') - read by
// handleModalSave() below to know which save function to run, and set by
// whichever file opens a popup (this file, week-modal.js, auth-ui.js).
// Wrapped in an object instead of a plain `let modalMode` for the same reason
// auth-ui.js's authState is - see that file's header comment for the full explanation.
export const modalState = {
    mode: null
};

let modalDate = null;                // tracks which date the day-popup is currently editing
let dayModalActiveMetric = 'weight'; // 'weight' or 'steps' - which tab of the day popup is showing, kept across saves

// Hides the popup by removing the 'open' class.
export function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

document.getElementById('modalClose').addEventListener('click', closeModal); // X button closes popup

document.getElementById('modalOverlay').addEventListener('click', function (event) {   // Click outside the card closes it
    if (event.target.id === 'modalOverlay') {         // Only true if the backdrop itself was clicked, not something inside .modal
        closeModal();
    }
});

document.addEventListener('keydown', function (event) {   // Escape key closes popup
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Builds the Weight tab's content: the input (prefilled if a weigh-in already
// exists) plus its delete button. Mirrored by buildDayStepsTab() below - kept
// as two separate small functions rather than one shared/parameterized helper,
// same call made for week-modal.js's weight/steps tabs.
function buildDayWeightTab(date) {
    const existingWeight = getWeightForDate(date);      // null if no entry yet
    const weightTab = document.createElement('div');
    weightTab.className = 'week-modal-tab';
    if (dayModalActiveMetric !== 'weight') {
        weightTab.style.display = 'none';
    }

    const weightRow = document.createElement('div');
    weightRow.className = 'day-input-row';

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.id = 'dayWeightInput';
    weightInput.placeholder = 'kg';
    if (existingWeight !== null) {
        weightInput.value = existingWeight;              // prefill if a weigh-in already exists
    }
    weightRow.appendChild(weightInput);

    if (existingWeight !== null) {                        // only offer delete if there's something to delete
        const weightDeleteButton = document.createElement('button');
        weightDeleteButton.type = 'button';
        weightDeleteButton.className = 'small-delete-button';
        weightDeleteButton.title = 'Delete this weight entry';
        weightDeleteButton.textContent = '✕'; // small X
        weightDeleteButton.addEventListener('click', function () {
            if (confirm('Delete this weight entry?')) {
                deleteDayMetric('weight', date);
            }
        });
        weightRow.appendChild(weightDeleteButton);
    }

    weightTab.appendChild(weightRow);
    return weightTab;
}

// Builds the Steps tab's content - mirrors buildDayWeightTab() above.
function buildDayStepsTab(date) {
    const existingSteps = getStepsForDate(date);        // null if no entry yet
    const stepsTab = document.createElement('div');
    stepsTab.className = 'week-modal-tab';
    if (dayModalActiveMetric !== 'steps') {
        stepsTab.style.display = 'none';
    }

    const stepsRow = document.createElement('div');
    stepsRow.className = 'day-input-row';

    const stepsInput = document.createElement('input');
    stepsInput.type = 'number';
    stepsInput.id = 'dayStepsInput';
    stepsInput.placeholder = 'steps';
    if (existingSteps !== null) {
        stepsInput.value = existingSteps;                // prefill if a step count already exists
    }
    stepsRow.appendChild(stepsInput);

    if (existingSteps !== null) {
        const stepsDeleteButton = document.createElement('button');
        stepsDeleteButton.type = 'button';
        stepsDeleteButton.className = 'small-delete-button';
        stepsDeleteButton.title = 'Delete this steps entry';
        stepsDeleteButton.textContent = '✕';
        stepsDeleteButton.addEventListener('click', function () {
            if (confirm('Delete this steps entry?')) {
                deleteDayMetric('steps', date);
            }
        });
        stepsRow.appendChild(stepsDeleteButton);
    }

    stepsTab.appendChild(stepsRow);
    return stepsTab;
}

// Opens the popup for a single day - Weight tab and Steps tab.
export function openDayModal(date) {
    modalState.mode = 'day';
    modalDate = date;
    // dayModalActiveMetric is NOT reset here - it stays whatever tab was last used,
    // so saving (which reopens this same popup) doesn't jump back to the Weight tab.
    document.getElementById('modalTitle').textContent = date.toDateString();
    document.getElementById('modalSaveButton').textContent = 'Save'; // in case the login/signup popup left it saying otherwise
    document.getElementById('modalDeleteButton').style.display = 'none'; // day popup uses its own small per-tab delete buttons instead

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';                            // clear whatever was in there before

    // Toggle bar - same widget/classes as the week popup, for a consistent look
    const toggleBar = document.createElement('div');
    toggleBar.className = 'week-modal-toggle';

    const weightToggleButton = document.createElement('button');
    weightToggleButton.type = 'button';
    weightToggleButton.className = 'week-modal-toggle-button' + (dayModalActiveMetric === 'weight' ? ' active' : '');
    weightToggleButton.textContent = 'Weight';
    toggleBar.appendChild(weightToggleButton);

    const stepsToggleButton = document.createElement('button');
    stepsToggleButton.type = 'button';
    stepsToggleButton.className = 'week-modal-toggle-button' + (dayModalActiveMetric === 'steps' ? ' active' : '');
    stepsToggleButton.textContent = 'Steps';
    toggleBar.appendChild(stepsToggleButton);

    modalBody.appendChild(toggleBar);

    const weightTab = buildDayWeightTab(date);
    modalBody.appendChild(weightTab);

    const stepsTab = buildDayStepsTab(date);
    modalBody.appendChild(stepsTab);

    weightToggleButton.addEventListener('click', function () {
        weightTab.style.display = 'block';
        stepsTab.style.display = 'none';
        weightToggleButton.classList.add('active');
        stepsToggleButton.classList.remove('active');
        dayModalActiveMetric = 'weight';
    });
    stepsToggleButton.addEventListener('click', function () {
        weightTab.style.display = 'none';
        stepsTab.style.display = 'block';
        stepsToggleButton.classList.add('active');
        weightToggleButton.classList.remove('active');
        dayModalActiveMetric = 'steps';
    });

    document.getElementById('modalOverlay').classList.add('open');
}

// Reads the day popup's inputs and either saves right away, or - if not logged
// in - stashes the save to retry after login.
function saveDayModal() {
    const weightInput = document.getElementById('dayWeightInput');
    const stepsInput = document.getElementById('dayStepsInput');

    const weight = weightInput.value !== '' ? Number(weightInput.value) : null;
    const steps = stepsInput.value !== '' ? Number(stepsInput.value) : null;

    if (weight !== null && isNaN(weight)) {
        return;                       // don't save garbage input
    }
    if (steps !== null && isNaN(steps)) {
        return;
    }
    if (weight === null && steps === null) {
        return;                       // nothing typed into either tab
    }

    if (!authState.isLoggedIn) {
        const dateToSave = modalDate;             // capture now - openLoginModal is about to replace this popup's content
        authState.pendingSaveAction = function () {
            finishSaveDayModal(dateToSave, weight, steps);
        };
        openLoginModal();
        return;
    }

    finishSaveDayModal(modalDate, weight, steps);
}

// Actually saves the day popup's weight/steps, then re-renders everything that
// might now be stale (this week's stats, the calendar tinting, the popup itself).
async function finishSaveDayModal(date, weight, steps) {
    if (weight !== null) {
        await upsertEntryForDate(date, weight);
    }
    if (steps !== null) {
        await upsertStepsForDate(date, steps);
    }

    // Only refresh the on-page weekly panel if we just edited a day in the CURRENT real week
    const editedMonday = getMondayDate(new Date(date));
    const thisMonday = getMondayDate(new Date());
    if (sameDay(editedMonday, thisMonday)) {
        refreshHomeStats();
        renderWeekStrip();
        refreshHomeEntryBox(); // in case the edited day is also the one selected on Home
    }

    calenderFunc(); // refresh the calendar's day-cell tinting right away, not just on next navigation

    // Re-open the same day instead of closing, so the popup reflects what was just saved
    // (and stays on whichever tab - Weight or Steps - was active).
    openDayModal(date);
}

// Deletes just the weight or just the steps entry for this day, then re-renders
// the same things finishSaveDayModal() does.
async function deleteDayMetric(metric, date) {
    if (metric === 'weight') {
        await deleteEntryForDate(date);
    } else {
        await deleteStepsForDate(date);
    }

    const editedMonday = getMondayDate(new Date(date));
    const thisMonday = getMondayDate(new Date());
    if (sameDay(editedMonday, thisMonday)) {
        refreshHomeStats();
        renderWeekStrip();
        refreshHomeEntryBox(); // in case the edited day is also the one selected on Home
    }

    calenderFunc();
    openDayModal(date); // refresh in place, same as after a save
}

// Runs whichever save logic matches the currently open popup.
async function handleModalSave() {
    if (modalState.mode === 'day') {
        saveDayModal();
    } else if (modalState.mode === 'week') {
        saveWeekModal();      // defined in week-modal.js
    } else if (modalState.mode === 'login') {
        await submitLogin();
    } else if (modalState.mode === 'signup') {
        await submitSignup();
    }
}

document.getElementById('modalSaveButton').addEventListener('click', handleModalSave);
