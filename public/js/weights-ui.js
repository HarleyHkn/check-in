// Weight data layer. Mirrors steps-ui.js.

import { toDateKey, sameDay, formatDateKey, getMondayDate } from './date-utils.js';

let weightLog = [];   // array of [date, weight] pairs

// Fetches the logged-in user's entries from the server.
export async function loadWeightLog() {
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

// Called by auth-ui.js's logout() - can't just reassign weightLog from another
// file (only this file, the one that exports it, is allowed to do that), so
// this small function exists to let other files ask for the reset.
export function resetWeightLog() {
    weightLog = [];
}

// Finds this array's index for a given date, or -1 if there's no entry yet.
function findEntryIndexForDate(date) {
    for (let i = 0; i < weightLog.length; i++) {
        if (sameDay(weightLog[i][0], date)) {
            return i;
        }
    }
    return -1;
}

// Returns the weight logged for a date, or null if there isn't one.
export function getWeightForDate(date) {
    const index = findEntryIndexForDate(date);
    if (index === -1) {
        return null;
    }
    return weightLog[index][1];
}

// Saves to the server, then updates the local copy too.
export async function upsertEntryForDate(date, weight) {
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

// Deletes on the server, then updates the local copy too.
export async function deleteEntryForDate(date) {
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

// Average weight for a given week (defaults to the current real week).
export function weekAverage(mondayDate = getMondayDate()) {

    // Compare plain "YYYY-MM-DD" strings instead of Date objects - avoids any
    // time-of-day/timezone boundary issues entirely, since a date string sorts
    // correctly with plain >= / <= as long as every string uses this same format.
    const mondayKey = formatDateKey(mondayDate);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const sundayKey = formatDateKey(sundayDate);

    let totWeight = 0; // variable to store the total weight
    let count = 0; // variable to store the number of weights entered

    for (let i = 0; i < weightLog.length; i++) { // loop through the weight log
        const entryKey = toDateKey(weightLog[i][0]);          // get date
        const entryWeight = weightLog[i][1];       // get weight

        if (entryKey >= mondayKey && entryKey <= sundayKey) {      // if within weeks dates add
            totWeight += entryWeight;
            count++;
        }
    }

    const weekAvg = totWeight / count;    // get average

    if (count == 0) { return 0; }

    return weekAvg.toFixed(2);
}
