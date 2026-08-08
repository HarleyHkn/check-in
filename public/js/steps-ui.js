// Steps data layer. Entry happens per-day, same as weight - but there's no
// standalone "Steps" page; daily step counts are entered through the week
// popup's Steps tab (see week-modal.js), and this file just holds the shared
// data (stepsLog) and the week-average calculation both the popup and the
// overview page use.

import { toDateKey, sameDay, formatDateKey, getMondayDate } from './date-utils.js';

let stepsLog = [];   // array of [date, steps] pairs, same shape as weightLog

// Fetches the logged-in user's step entries from the server.
export async function loadStepsLog() {
    const response = await fetch('/api/steps');

    if (!response.ok) {
        stepsLog = [];
        return;
    }

    const rows = await response.json();
    stepsLog = rows.map(function (row) {
        return [row.entry_date, Number(row.steps)];
    });
}

// Called by auth-ui.js's logout() - see weights-ui.js's resetWeightLog for why
// this small function exists instead of the caller just reassigning stepsLog.
export function resetStepsLog() {
    stepsLog = [];
}

// Finds this array's index for a given date, or -1 if there's no entry yet.
function findStepsIndexForDate(date) {
    for (let i = 0; i < stepsLog.length; i++) {
        if (sameDay(stepsLog[i][0], date)) {
            return i;
        }
    }
    return -1;
}

// Returns the step count logged for a date, or null if there isn't one.
export function getStepsForDate(date) {
    const index = findStepsIndexForDate(date);
    if (index === -1) {
        return null;
    }
    return stepsLog[index][1];
}

// Saves to the server, then updates the local copy too.
export async function upsertStepsForDate(date, steps) {
    const dateKey = toDateKey(date);

    const response = await fetch('/api/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey, steps: steps })
    });

    if (!response.ok) {
        return false;
    }

    const index = findStepsIndexForDate(dateKey);
    if (index === -1) {
        stepsLog.push([dateKey, steps]);
    } else {
        stepsLog[index] = [dateKey, steps];
    }
    return true;
}

// Deletes on the server, then updates the local copy too.
export async function deleteStepsForDate(date) {
    const dateKey = toDateKey(date);

    const response = await fetch('/api/steps/' + dateKey, {
        method: 'DELETE'
    });

    if (!response.ok) {
        return false;
    }

    const index = findStepsIndexForDate(dateKey);
    if (index !== -1) {
        stepsLog.splice(index, 1);
    }
    return true;
}

// Average steps for a given week (defaults to the current real week).
export function stepsWeekAverage(mondayDate = getMondayDate()) {
    const mondayKey = formatDateKey(mondayDate);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const sundayKey = formatDateKey(sundayDate);

    let totSteps = 0;
    let count = 0;

    for (let i = 0; i < stepsLog.length; i++) {
        const entryKey = toDateKey(stepsLog[i][0]);
        const entrySteps = stepsLog[i][1];

        if (entryKey >= mondayKey && entryKey <= sundayKey) {
            totSteps += entrySteps;
            count++;
        }
    }

    if (count == 0) { return 0; }

    return Math.round(totSteps / count);
}
