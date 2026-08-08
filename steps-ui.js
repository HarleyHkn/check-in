// Steps data layer. Entry happens per-day, same as weight - but there's no
// standalone "Steps" page; daily step counts are entered through the week
// popup's Steps tab (see modal.js openWeekModal), and this file just holds
// the shared data (stepsLog) and the week-average calculation both the popup
// and (later) the overview page will use.
// Reuses getMondayDate/formatDateKey/toDateKey/sameDay from app.js.

let stepsLog = [];   // array of [date, steps] pairs, same shape as weightLog

async function loadStepsLog() {
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

function findStepsIndexForDate(date) {
    for (let i = 0; i < stepsLog.length; i++) {
        if (sameDay(stepsLog[i][0], date)) {
            return i;
        }
    }
    return -1;
}

function getStepsForDate(date) {
    const index = findStepsIndexForDate(date);
    if (index === -1) {
        return null;
    }
    return stepsLog[index][1];
}

async function upsertStepsForDate(date, steps) {
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

async function deleteStepsForDate(date) {
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

function stepsWeekAverage(mondayDate = getMondayDate()) {
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

// loadStepsLog() is called from app.js's initPage() at startup (and from afterLogin()/
// logout() in auth-ui.js) - not called here, so there's exactly one coordinated place
// that decides when the initial fetch happens and what re-renders once it resolves.
