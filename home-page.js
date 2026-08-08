// Home page ("Check In") UI: the Weight/Steps toggle box, the Mon-Sun day strip
// (clicking a day selects it for editing instead of opening a popup), and the
// Avg weight / Avg steps tiles. Reuses getMondayDate/getWeekNumber/sameDay from
// date-utils.js, getWeightForDate/upsertEntryForDate/weekAverage from
// weights-ui.js, getStepsForDate/upsertStepsForDate/stepsWeekAverage from
// steps-ui.js, and buildDataDots from calender.js.

// Which day the top box is currently showing/editing - starts on today, but
// clicking a day in the strip below points this at that day instead.
let selectedHomeDay = new Date();

async function saveWeight() {                               // Function to save users weight

    const weightInput = document.getElementById('weight');  // grab box of data
    const weight = Number(weightInput.value);                       // Specify i want the users input as number

    if (!weightInput.value || isNaN(weight)) {
        return;                       // don't save garbage/empty input as 0
    }

    if (!isLoggedIn) {
        pendingSaveAction = saveWeight;      // after logging in, just run this whole function again -
        openLoginModal();                    // the typed value is still sitting in the box, nothing is lost
        return;
    }

    await upsertEntryForDate(selectedHomeDay, weight);

    // UPDATE THE UI AUTOMATICALLY ON CLICK:
    refreshHomeStats();
    renderWeekStrip(); // refresh the week strip too, not just the averages
    refreshHomeEntryBox(); // keep showing what was just saved, instead of clearing back to the placeholder
}

async function saveSteps() {                                // Mirrors saveWeight(), but for the Steps tab

    const stepsInput = document.getElementById('homeStepsInput');
    const steps = Number(stepsInput.value);

    if (!stepsInput.value || isNaN(steps)) {
        return;
    }

    if (!isLoggedIn) {
        pendingSaveAction = saveSteps;
        openLoginModal();
        return;
    }

    await upsertStepsForDate(selectedHomeDay, steps);

    refreshHomeStats();
    renderWeekStrip();
    refreshHomeEntryBox();
}

const buttonClicked = document.getElementById('submit-button'); // grab the button
buttonClicked.addEventListener('click', saveWeight); // add an event listener to the button

document.getElementById('submitStepsButton').addEventListener('click', saveSteps);

// Weight/Steps toggle at the top of the Home box - same show/hide-one-tab pattern
// as the day popup's toggle (see modal.js openDayModal).
const homeMetricToggle = document.getElementById('homeMetricToggle');
homeMetricToggle.addEventListener('click', function (event) {
    const button = event.target.closest('.week-modal-toggle-button');
    if (!button) {
        return;
    }

    const toggleButtons = homeMetricToggle.querySelectorAll('.week-modal-toggle-button');
    for (let i = 0; i < toggleButtons.length; i++) {
        toggleButtons[i].classList.remove('active');
    }
    button.classList.add('active');

    const metric = button.dataset.metric;
    document.getElementById('homeWeightTab').style.display = metric === 'weight' ? 'block' : 'none';
    document.getElementById('homeStepsTab').style.display = metric === 'steps' ? 'block' : 'none';
});

function displayDate (){            // Show date, e.g. "August 8" - no year, no weekday

    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    const getDateBox = document.getElementById('dateBox'); // grab the date box
    getDateBox.textContent = date;                          // Push date into that box
}

// Updates the box's heading + prefilled value to match whichever day is selected -
// called after picking a different day, and after initial load.
function refreshHomeEntryBox() {
    const isToday = sameDay(selectedHomeDay, new Date());
    const dayName = selectedHomeDay.toLocaleDateString('en-US', { weekday: 'long' });
    const namePrefix = isToday ? "Today's" : dayName + "'s";

    document.getElementById('homeWeightHeading').textContent = namePrefix + ' Weight';
    document.getElementById('homeStepsHeading').textContent = namePrefix + ' Steps';

    const existingWeight = getWeightForDate(selectedHomeDay);
    document.getElementById('weight').value = existingWeight !== null ? existingWeight : '';
    document.getElementById('deleteWeightButton').style.display = existingWeight !== null ? 'block' : 'none';

    const existingSteps = getStepsForDate(selectedHomeDay);
    document.getElementById('homeStepsInput').value = existingSteps !== null ? existingSteps : '';
    document.getElementById('deleteStepsButton').style.display = existingSteps !== null ? 'block' : 'none';
}

document.getElementById('deleteWeightButton').addEventListener('click', async function () {
    if (confirm('Delete this weight entry?')) {
        await deleteEntryForDate(selectedHomeDay);
        refreshHomeStats();
        renderWeekStrip();
        refreshHomeEntryBox();
    }
});

document.getElementById('deleteStepsButton').addEventListener('click', async function () {
    if (confirm('Delete this steps entry?')) {
        await deleteStepsForDate(selectedHomeDay);
        refreshHomeStats();
        renderWeekStrip();
        refreshHomeEntryBox();
    }
});

// Updates the Avg weight / Avg steps tiles for the current real week - the week
// strip only ever shows the current week, so there's no "which week" to check.
function refreshHomeStats() {
    const avgWeight = weekAverage();
    const avgSteps = stepsWeekAverage();

    document.getElementById('homeWeightAverage').textContent = avgWeight === 0 ? 'No data' : avgWeight + ' kg';
    document.getElementById('homeStepsAverage').textContent = avgSteps === 0 ? 'No data' : avgSteps;
}

function renderWeekStrip(mondayDate = getMondayDate()) {        // Draws the Mon-Sun strip on the Home page

    document.getElementById('homeWeekLabel').textContent = 'Week ' + getWeekNumber(mondayDate);

    const box = document.getElementById("weekStrip");

    box.innerHTML = "";     // pre clear the box

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();

    for (let i = 0; i < dayLabels.length; i++) {

        const currentDay = new Date(mondayDate);
        currentDay.setDate(mondayDate.getDate() + i);   // increase through whole week

        const button = document.createElement("button");
        button.type = "button";
        button.append(dayLabels[i]);

        const numberSpan = document.createElement("span");
        numberSpan.className = "day-number";
        numberSpan.textContent = currentDay.getDate();
        button.appendChild(numberSpan);

        if (sameDay(currentDay, today)) {
            button.classList.add("is-today");
        }
        if (sameDay(currentDay, selectedHomeDay)) {
            button.classList.add("is-selected");
        }

        // buildDataDots lives in calender.js - reused here so the dots mean the
        // same thing (1 = weight, 2 = weight+steps) everywhere in the app.
        const dots = buildDataDots(currentDay);
        if (dots !== null) {
            button.appendChild(dots);
        }

        // Selecting a day edits it right here in the box above, instead of
        // opening the popup (the Calendar page still uses the popup for that).
        button.addEventListener("click", function () {
            selectedHomeDay = currentDay;
            renderWeekStrip(mondayDate);
            refreshHomeEntryBox();
        });

        box.appendChild(button);
    }
}
