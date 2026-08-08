// Weight data layer. Mirrors steps-ui.js. Reuses toDateKey/sameDay/formatDateKey/
// getMondayDate from date-utils.js.

let weightLog = [];   // array of [date, weight] pairs

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
