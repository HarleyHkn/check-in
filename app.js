
// weightLog now comes from the server instead of localStorage. It starts empty
// and gets filled in by loadWeightLog(), called from initPage() at the bottom of this file.
let weightLog = [];

async function loadWeightLog() {                            // Fetches the logged-in user's entries from the server
    const response = await fetch('/api/weights');

    if (!response.ok) {
        weightLog = [];                  // not logged in (or an error) - nothing to show
        return;
    }

    const rows = await response.json();
    weightLog = rows.map(function (row) {
        return [row.entry_date, Number(row.weight)];
    });
}

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

    const date = new Date();                            // save the date of users input
    await upsertEntryForDate(date, weight);

    // UPDATE THE UI AUTOMATICALLY ON CLICK:
    document.getElementById("thisWeekAverage").innerText = weekAverage();
    renderWeekStrip(); // refresh the week strip too, not just the average
    weightInput.value = ""; // clear the box so it doesn't look like the old value is still pending

}


const buttonClicked = document.getElementById('submit-button'); // grab the button
buttonClicked.addEventListener('click', saveWeight); // add an event listener to the button


function displayDate (){            // Show date
    
    const date = new Date().toLocaleDateString();   // Get todays date
    
    const getDateBox = document.getElementById('dateBox'); // grab the date box
    getDateBox.textContent = date;                          // Push date into that box
}


function getMondayDate (date = new Date()) {                 // Find mondays date

   
    const weekday = date.getDay(); // get the current day of the week (0-6, where 0 is Sunday

    let mondayDate; // variable to store the date of monday

    // To solve issue of starting at 0.
    if(weekday == 0) { // if its sunday, set the weekday to 6 ie monday
        mondayDate = 6;
    }else {
        mondayDate= weekday-1; // otherwise -1 will give correct day.
    }

    // Calculate when monday this week was ie the date of monday. To get week avergage.
    date.setDate(date.getDate() -mondayDate);

    return date;
}

function getWeekNumber(mondayDate) {         // Which week number of the year this Monday falls in
    const startYear = new Date(mondayDate.getFullYear(), 0, 1); // Jan 1st of that year
    const msPerDay = 86400000;
    const daysPassed = (mondayDate - startYear) / msPerDay;
    return Math.ceil((daysPassed + startYear.getDay() + 1) / 7);
}

function weekAverage(mondayDate = getMondayDate()) {                    // Get this weeks avg or argument

    // Compare plain "YYYY-MM-DD" strings instead of Date objects - avoids any
    // time-of-day/timezone boundary issues entirely, since a date string sorts
    // correctly with plain >= / <= as long as every string uses this same format.
    const mondayKey = formatDateKey(mondayDate);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const sundayKey = formatDateKey(sundayDate);

    let totWeight = 0; // variable to store the total weight
    let count = 0; // variable to store the number of weights entered

    for(let i = 0; i < weightLog.length; i++) { // loop through the weight log
        const entryKey = toDateKey(weightLog[i][0]);          // get date
        const entryWeight = weightLog[i][1];       // get weight

        if ( entryKey >= mondayKey && entryKey <= sundayKey ){      // if within weeks dates add
            totWeight += entryWeight;
            count++;
        }
    }

    const weekAvg = totWeight/count;    // get average

    if(count == 0){ return 0;}

    return weekAvg.toFixed(2);
}

function renderWeekStrip(mondayDate = getMondayDate()) {        // Draws the Mon-Sun strip on the Home page

    const box = document.getElementById("weekStrip");

    box.innerHTML = "";     // pre clear the box

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();

    for (let i = 0; i < dayLabels.length; i++) {

        const currentDay = new Date(mondayDate);
        currentDay.setDate(mondayDate.getDate() + i);   // increase through whole week

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = dayLabels[i];

        if (sameDay(currentDay, today)) {
            button.classList.add("is-today");
        }

        // buildDataDots lives in calender.js - reused here so the dots mean the
        // same thing (1 = weight, 2 = weight+steps) everywhere in the app.
        const dots = buildDataDots(currentDay);
        if (dots !== null) {
            button.appendChild(dots);
        }

        button.addEventListener("click", function () {
            openDayModal(currentDay);
        });

        box.appendChild(button);
    }
}


// Data-layer helpers. Defined here (not modal.js) because renderWeekStrip/saveWeight
// above need them, and this file loads before modal.js.

function formatDateKey(date) {      // Turns a real Date into a plain "YYYY-MM-DD" string, using LOCAL time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function toDateKey(value) {         // Accepts either a Date object or an already-formatted "YYYY-MM-DD" string.
    if (typeof value === 'string') {
        return value;                    // already in the right format (this is how dates come back from the server)
    }
    return formatDateKey(value);         // a real Date object - format it ourselves (never parse date-only strings
                                          // with new Date(), that parses as UTC midnight and can shift the day)
}

function sameDay(a, b) {            // Check if same day
    return toDateKey(a) === toDateKey(b);
}

function findEntryIndexForDate(date) {          // Find weight
    for (let i = 0; i < weightLog.length; i++) {
        if (sameDay(weightLog[i][0], date)) {
            return i;
        }
    }
    return -1;
}

function getWeightForDate(date) {               //Enter weight
    const index = findEntryIndexForDate(date);
    if (index === -1) {
        return null;
    }
    return weightLog[index][1];
}

async function upsertEntryForDate(date, weight) {         // Saves to the server, then updates the local copy too.
    const dateKey = toDateKey(date);

    const response = await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey, weight: weight })
    });

    if (!response.ok) {
        return false;                 // e.g. not logged in - caller is responsible for checking isLoggedIn first
    }

    const index = findEntryIndexForDate(dateKey);
    if (index === -1) {
        weightLog.push([dateKey, weight]);
    } else {
        weightLog[index] = [dateKey, weight];
    }
    return true;
}

async function deleteEntryForDate(date) {                 // Deletes on the server, then updates the local copy too.
    const dateKey = toDateKey(date);

    const response = await fetch('/api/weights/' + dateKey, {
        method: 'DELETE'
    });

    if (!response.ok) {
        return false;
    }

    const index = findEntryIndexForDate(dateKey);
    if (index !== -1) {
        weightLog.splice(index, 1);
    }
    return true;
}

// Modal-popup logic (openDayModal, openWeekModal, save handlers) lives in modal.js only.


async function initPage() {
    await loadWeightLog();
    await loadStepsLog();
    await loadMeasurementTypes();
    await loadMeasurementValues(); // all data types need to be loaded before the calendar/week-strip tinting can be accurate
    await loadPhotoList();

    document.getElementById("thisWeekAverage").innerText = weekAverage();   // Display weeks avg
    displayDate(); // call the function to display the date
    renderWeekStrip();   // Draw the Mon-Sun strip
    calenderFunc();      // Re-render the calendar now that data has actually arrived
                          // (its own first render at the bottom of calender.js runs
                          // before this fetch finishes, so it starts out untinted)
}

initPage();

