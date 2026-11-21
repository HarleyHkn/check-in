// Training data layer. Mirrors steps-ui.js: holds trainingDays, loads/saves it
// via /api/training. A day being in the list means "trained that day".
// Training days are checked on the Check-in page (checkin-training.js).

import { toDateKey } from './date-utils.js';

let trainingDays = [];   // array of "YYYY-MM-DD" strings, one per trained day

// Fetches the logged-in user's training days from the server.
export async function loadTrainingDays() {
    const response = await fetch('/api/training');

    if (!response.ok) {
        trainingDays = [];   // not logged in - no demo data for training, just empty
        return;
    }

    const rows = await response.json();
    trainingDays = rows.map(function (row) {
        return row.entry_date;
    });
}

// Called by auth-ui.js's logout() - clears the previous user's data.
export function resetTrainingDays() {
    trainingDays = [];
}

export function trainedOnDate(date) {
    return trainingDays.includes(toDateKey(date));
}

// How many days were trained in the week starting on this Monday.
export function weekTrainingCount(mondayDate) {
    let count = 0;
    for (let i = 0; i < 7; i++) {
        const day = new Date(mondayDate);
        day.setDate(mondayDate.getDate() + i);
        if (trainedOnDate(day)) {
            count++;
        }
    }
    return count;
}

// Marks (trained = true) or un-marks a day on the server, then updates the
// local copy too. Does nothing if the day is already in the wanted state.
export async function setTrainedForDate(date, trained) {
    const dateKey = toDateKey(date);
    if (trainedOnDate(dateKey) === trained) {
        return true;
    }

    let response;
    if (trained) {
        response = await fetch('/api/training', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateKey })
        });
    } else {
        response = await fetch('/api/training/' + dateKey, { method: 'DELETE' });
    }

    if (!response.ok) {
        return false;
    }

    if (trained) {
        trainingDays.push(dateKey);
    } else {
        trainingDays.splice(trainingDays.indexOf(dateKey), 1);
    }
    return true;
}
