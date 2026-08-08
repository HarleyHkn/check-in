// Shared modal plumbing, plus the single-day popup. The week popup lives in week-modal.js.
// Uses functions/data from app.js (getWeightForDate, upsertEntryForDate, weekAverage,
// renderWeekStrip, getMondayDate, sameDay) - app.js must load before this file.

let modalDate = null;        // tracks which date the day-popup is currently editing
let modalMode = null;        // 'day', 'week', 'login', or 'signup' - which popup is open, so Save knows what to do
let modalWeekDates = [];     // the 7 dates shown in the week-popup, in the same order as its inputs (set by week-modal.js)
let dayModalActiveMetric = 'weight'; // 'weight' or 'steps' - which tab of the day popup is showing, kept across saves

function closeModal() {                  // Hides the popup by removing the 'open' class
    document.getElementById('modalOverlay').classList.remove('open');
}

document.getElementById('modalClose').addEventListener('click', closeModal); // X button closes popup

document.getElementById('modalOverlay').addEventListener('click', function(event) {   // Click outside the card closes it
    if (event.target.id === 'modalOverlay') {         // Only true if the backdrop itself was clicked, not something inside .modal
        closeModal();
    }
});

document.addEventListener('keydown', function(event) {   // Escape key closes popup
    if (event.key === 'Escape') {
        closeModal();
    }
});

function openDayModal(date) {                          // Opens popup for a single day - Weight tab and Steps tab
    modalMode = 'day';
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
    modalBody.appendChild(weightTab);

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

    if (!isLoggedIn) {
        const dateToSave = modalDate;             // capture now - openLoginModal is about to replace this popup's content
        pendingSaveAction = function () {
            finishSaveDayModal(dateToSave, weight, steps);
        };
        openLoginModal();
        return;
    }

    finishSaveDayModal(modalDate, weight, steps);
}

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
        document.getElementById("thisWeekAverage").innerText = weekAverage();
        renderWeekStrip();
    }

    calenderFunc(); // refresh the calendar's day-cell tinting right away, not just on next navigation

    // Re-open the same day instead of closing, so the popup reflects what was just saved
    // (and stays on whichever tab - Weight or Steps - was active).
    openDayModal(date);
}

async function deleteDayMetric(metric, date) {   // Deletes just the weight or just the steps entry for this day
    if (metric === 'weight') {
        await deleteEntryForDate(date);
    } else {
        await deleteStepsForDate(date);
    }

    const editedMonday = getMondayDate(new Date(date));
    const thisMonday = getMondayDate(new Date());
    if (sameDay(editedMonday, thisMonday)) {
        document.getElementById("thisWeekAverage").innerText = weekAverage();
        renderWeekStrip();
    }

    calenderFunc();
    openDayModal(date); // refresh in place, same as after a save
}

async function handleModalSave() {               // Runs whichever save logic matches the currently open popup
    if (modalMode === 'day') {
        saveDayModal();
    } else if (modalMode === 'week') {
        saveWeekModal();      // defined in week-modal.js
    } else if (modalMode === 'login') {
        await submitLogin();
    } else if (modalMode === 'signup') {
        await submitSignup();
    }
}

document.getElementById('modalSaveButton').addEventListener('click', handleModalSave);
