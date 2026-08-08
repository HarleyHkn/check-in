// Week popup: Weight tab, Steps tab (each with 7 daily rows plus a "set the
// week's average directly" shortcut), and a Measurements tab (one set of
// fields per week, see measurements-tab.js). Split out from modal.js to keep
// each file focused on one popup. Uses modalMode/modalWeekDates/closeModal from modal.js,
// isLoggedIn/pendingSaveAction/openLoginModal from auth-ui.js, getStepsForDate/
// upsertStepsForDate/stepsWeekAverage from steps-ui.js, upsertMeasurementValue
// from measurements-ui.js, buildMeasurementsTab from measurements-tab.js, and
// buildAvgOverridePanel/buildTabToggle from avg-override-panel.js/tab-toggle.js.

let weekModalActiveMetric = 'weight'; // 'weight', 'steps', or 'measure' - which tab is showing, kept across saves
let currentMeasurementsTab = null;    // the {element, gatherPendingSave} object from buildMeasurementsTab, set below

function openWeekModal(mondayDate) {                   // Opens popup for a full week - Weight tab and Steps tab
    modalMode = 'week';
    // weekModalActiveMetric is NOT reset here - it stays whatever tab was last used,
    // so saving (which reopens this same popup) doesn't jump back to the Weight tab.

    document.getElementById('modalSaveButton').textContent = 'Save'; // in case the login/signup popup left it saying otherwise
    document.getElementById('modalDeleteButton').style.display = 'none'; // delete only applies to a single day

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    modalWeekDates = [];                                 // reset then rebuild for this specific week

    document.getElementById('modalTitle').textContent = 'Week ' + getWeekNumber(mondayDate);

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';                            // clear whatever was in there before

    for (let i = 0; i < days.length; i++) {
        const rowDate = new Date(mondayDate);
        rowDate.setDate(mondayDate.getDate() + i);        // one row per day, Monday through Sunday
        modalWeekDates.push(rowDate);                     // remember this row's date, same order as the inputs
    }

    // ---- Weight tab ----
    const weightTab = document.createElement('div');
    weightTab.className = 'week-modal-tab';

    let hasAnyWeightEntry = false;
    for (let i = 0; i < days.length; i++) {
        const existingWeight = getWeightForDate(modalWeekDates[i]); // null if no entry yet
        if (existingWeight !== null) {
            hasAnyWeightEntry = true;
        }

        const row = document.createElement("div");
        row.className = "weekModalRow";
        row.textContent = days[i] + ": ";

        const input = document.createElement("input");
        input.type = "number";
        input.className = "weekModalInput";               // used to grab all 7 inputs on save
        input.placeholder = "kg";
        if (existingWeight !== null) {
            input.value = existingWeight;                  // prefill if a weigh-in already exists
        }
        row.appendChild(input);

        weightTab.appendChild(row);
    }

    const weightAvgRow = document.createElement("div");
    weightAvgRow.className = "week-avg-row";

    const weightAverageLine = document.createElement("span");
    weightAverageLine.textContent = "Average: " + weekAverage(mondayDate) + " kg";
    weightAvgRow.appendChild(weightAverageLine);

    const weightOverride = buildAvgOverridePanel(hasAnyWeightEntry, "weekAvgWeightInput", "New avg (kg)");

    const weightEditButton = document.createElement("button");
    weightEditButton.type = "button";
    weightEditButton.className = "edit-avg-button";
    weightEditButton.title = "Edit this week's average";
    weightEditButton.textContent = "✎"; // pencil
    weightEditButton.addEventListener('click', weightOverride.openPanel);
    weightAvgRow.appendChild(weightEditButton);

    weightTab.appendChild(weightAvgRow);
    weightTab.appendChild(weightOverride.panel);

    modalBody.appendChild(weightTab);

    // ---- Steps tab ---- (mirrors the weight tab above)
    const stepsTab = document.createElement('div');
    stepsTab.className = 'week-modal-tab';

    let hasAnyStepsEntry = false;
    for (let i = 0; i < days.length; i++) {
        const existingSteps = getStepsForDate(modalWeekDates[i]); // null if no entry yet
        if (existingSteps !== null) {
            hasAnyStepsEntry = true;
        }

        const row = document.createElement("div");
        row.className = "weekModalRow";
        row.textContent = days[i] + ": ";

        const input = document.createElement("input");
        input.type = "number";
        input.className = "weekModalStepsInput";           // used to grab all 7 inputs on save
        input.placeholder = "steps";
        if (existingSteps !== null) {
            input.value = existingSteps;                    // prefill if a step count already exists
        }
        row.appendChild(input);

        stepsTab.appendChild(row);
    }

    const stepsAvgRow = document.createElement("div");
    stepsAvgRow.className = "week-avg-row";

    const stepsAverageLine = document.createElement("span");
    stepsAverageLine.textContent = "Average: " + stepsWeekAverage(mondayDate) + " steps";
    stepsAvgRow.appendChild(stepsAverageLine);

    const stepsOverride = buildAvgOverridePanel(hasAnyStepsEntry, "weekAvgStepsInput", "New avg steps");

    const stepsEditButton = document.createElement("button");
    stepsEditButton.type = "button";
    stepsEditButton.className = "edit-avg-button";
    stepsEditButton.title = "Edit this week's average";
    stepsEditButton.textContent = "✎";
    stepsEditButton.addEventListener('click', stepsOverride.openPanel);
    stepsAvgRow.appendChild(stepsEditButton);

    stepsTab.appendChild(stepsAvgRow);
    stepsTab.appendChild(stepsOverride.panel);

    // ---- Measurements tab ---- (built in measurements-tab.js; once per week, keyed to Monday)
    currentMeasurementsTab = buildMeasurementsTab(mondayDate);

    // Toggle bar: only one of the three tabs is visible at a time, but all three
    // stay in the DOM so switching tabs never loses whatever was typed elsewhere.
    const toggleBar = buildTabToggle(
        [
            { key: 'weight', label: 'Weight', element: weightTab },
            { key: 'steps', label: 'Steps', element: stepsTab },
            { key: 'measure', label: 'Measure', element: currentMeasurementsTab.element }
        ],
        weekModalActiveMetric,
        function (newKey) {
            weekModalActiveMetric = newKey;
        }
    );

    modalBody.appendChild(toggleBar);
    modalBody.appendChild(weightTab);
    modalBody.appendChild(stepsTab);
    modalBody.appendChild(currentMeasurementsTab.element);

    document.getElementById('modalOverlay').classList.add('open');
}

function saveWeekModal() {                       // Saves all 7 rows of the week popup, plus either average shortcut
    const weightInputs = document.querySelectorAll('.weekModalInput');      // same order as modalWeekDates
    const stepsInputs = document.querySelectorAll('.weekModalStepsInput');  // same order as modalWeekDates

    // If the "set the week's average" shortcut was used, it wins outright for that
    // metric - the daily rows are ignored, since using the shortcut means "replace
    // the whole week with this one number", not "also keep whatever I typed above".
    const weightAvgInput = document.getElementById('weekAvgWeightInput');
    const weightOverrideValue = weightAvgInput.value !== '' && !isNaN(Number(weightAvgInput.value))
        ? Number(weightAvgInput.value)
        : null;

    const weightEntriesToSave = [];        // {date, weight} for every row that actually has a value typed in
    if (weightOverrideValue === null) {
        for (let i = 0; i < weightInputs.length; i++) {
            const value = weightInputs[i].value;
            if (value === '') {
                continue;                             // blank = leave that day's existing entry untouched, not deleted
            }
            const weight = Number(value);
            if (isNaN(weight)) {
                continue;                             // skip garbage input
            }
            weightEntriesToSave.push({ date: modalWeekDates[i], weight: weight });
        }
    }

    const stepsAvgInput = document.getElementById('weekAvgStepsInput');
    const stepsOverrideValue = stepsAvgInput.value !== '' && !isNaN(Number(stepsAvgInput.value))
        ? Number(stepsAvgInput.value)
        : null;

    const stepsEntriesToSave = [];         // {date, steps} for every row that actually has a value typed in
    if (stepsOverrideValue === null) {
        for (let i = 0; i < stepsInputs.length; i++) {
            const value = stepsInputs[i].value;
            if (value === '') {
                continue;
            }
            const steps = Number(value);
            if (isNaN(steps)) {
                continue;
            }
            stepsEntriesToSave.push({ date: modalWeekDates[i], steps: steps });
        }
    }

    const saveInfo = {
        weightEntriesToSave: weightEntriesToSave,
        stepsEntriesToSave: stepsEntriesToSave,
        weightOverrideValue: weightOverrideValue,
        stepsOverrideValue: stepsOverrideValue,
        measurementsToSave: currentMeasurementsTab.gatherPendingSave(), // {date, values: [{typeName, value}]}
        mondayDate: modalWeekDates[0]
    };

    if (!isLoggedIn) {
        pendingSaveAction = function () {
            finishSaveWeekModal(saveInfo);
        };
        openLoginModal();
        return;
    }

    finishSaveWeekModal(saveInfo);
}

async function finishSaveWeekModal(saveInfo) {
    for (let i = 0; i < saveInfo.weightEntriesToSave.length; i++) {
        await upsertEntryForDate(saveInfo.weightEntriesToSave[i].date, saveInfo.weightEntriesToSave[i].weight);
    }
    for (let i = 0; i < saveInfo.stepsEntriesToSave.length; i++) {
        await upsertStepsForDate(saveInfo.stepsEntriesToSave[i].date, saveInfo.stepsEntriesToSave[i].steps);
    }

    if (saveInfo.weightOverrideValue !== null) {
        for (let i = 0; i < modalWeekDates.length; i++) {                 // clear every day this week first...
            await deleteEntryForDate(modalWeekDates[i]);
        }
        await upsertEntryForDate(saveInfo.mondayDate, saveInfo.weightOverrideValue); // ...then store just the one average
    }

    if (saveInfo.stepsOverrideValue !== null) {
        for (let i = 0; i < modalWeekDates.length; i++) {
            await deleteStepsForDate(modalWeekDates[i]);
        }
        await upsertStepsForDate(saveInfo.mondayDate, saveInfo.stepsOverrideValue);
    }

    for (let i = 0; i < saveInfo.measurementsToSave.values.length; i++) {
        const entry = saveInfo.measurementsToSave.values[i];
        await upsertMeasurementValue(saveInfo.measurementsToSave.date, entry.typeName, entry.value);
    }

    // Only refresh the on-page weekly panel if we just edited the CURRENT real week
    const editedMonday = getMondayDate(new Date(saveInfo.mondayDate));
    const thisMonday = getMondayDate(new Date());
    if (sameDay(editedMonday, thisMonday)) {
        document.getElementById("thisWeekAverage").innerText = weekAverage();
        renderWeekStrip();
    }

    calenderFunc(); // refresh the calendar's day-cell/week-button tinting right away

    // Re-open the same week instead of closing, so the popup reflects what was just
    // saved (updated averages, cleared/prefilled rows) and you can keep working in it.
    openWeekModal(new Date(saveInfo.mondayDate));
}
