// Calendar page: a flat list of weeks grouped under month headers (data is
// weekly, so there's no day grid). Each row shows 5
// checkmark chips (Vikt/Steg/Mått/Foto/Träning); tapping a row opens the same
// Check-in form, pre-filled with that week's saved values.

import { getMondayDate, formatDateKey, getWeekNumber, parseDateKey } from './date-utils.js';
import { weekAverage } from './weights-ui.js';
import { stepsWeekAverage } from './steps-ui.js';
import { measurementTypes, getMeasurementValue } from './measurements-ui.js';
import { weekHasPhoto } from './photos-ui.js';
import { weekTrainingCount } from './training-ui.js';
import { openCheckinPageForWeek } from './checkin-page.js';

// How many weeks before the current one always get a row, data or not.
// Older empty weeks are reached through the week picker (week-picker.js).
const WEEKS_BACK_SHOWN = 8;

function anyMeasurementFilledIn(monday) {
    for (let i = 0; i < measurementTypes.length; i++) {
        const type = measurementTypes[i];
        if (type.isActive && getMeasurementValue(monday, type.name) !== null) {
            return true;
        }
    }
    return false;
}

// Which week Mondays to show: the current week plus WEEKS_BACK_SHOWN
// weeks before it, plus every week that already has ANY data (which can reach
// further back than that).
function getCalendarWeekKeys() {
    const currentMonday = getMondayDate();

    const seen = {}; // plain object used as a set of date-key strings
    for (let weeksBack = 0; weeksBack <= WEEKS_BACK_SHOWN; weeksBack++) {
        const mondayForWeek = new Date(currentMonday);
        mondayForWeek.setDate(currentMonday.getDate() - weeksBack * 7);
        seen[formatDateKey(mondayForWeek)] = true;
    }

    // Walk back up to 2 years looking for any older week that has data, so a
    // week doesn't disappear from the list just because it's further back
    // than WEEKS_BACK_SHOWN.
    for (let weeksBack = WEEKS_BACK_SHOWN + 1; weeksBack <= 104; weeksBack++) {
        const mondayForWeek = new Date(currentMonday);
        mondayForWeek.setDate(currentMonday.getDate() - weeksBack * 7);
        if (Number(weekAverage(mondayForWeek)) !== 0 || Number(stepsWeekAverage(mondayForWeek)) !== 0 ||
            anyMeasurementFilledIn(mondayForWeek) || weekHasPhoto(mondayForWeek)) {
            seen[formatDateKey(mondayForWeek)] = true;
        }
    }

    const weekKeys = Object.keys(seen);
    weekKeys.sort();      // "YYYY-MM-DD" strings sort correctly as plain text
    weekKeys.reverse();   // newest week first
    return weekKeys;
}

function buildChip(label, done) {
    const item = document.createElement('div');
    item.className = 'check-item';

    const dot = document.createElement('div');
    dot.className = 'check-dot' + (done ? ' done' : '');
    dot.textContent = done ? '✓' : '·';
    item.appendChild(dot);

    const dotLabel = document.createElement('div');
    dotLabel.className = 'check-label';
    dotLabel.textContent = label;
    item.appendChild(dotLabel);

    return item;
}

// Builds one week-row: week number + date range (+ "latest" tag for the
// current week) and the 4 checkmark chips. Tapping anywhere on the row opens
// the Check-in form for that week.
function buildWeekRow(weekMondayKey, isCurrentWeek) {
    const row = document.createElement('div');
    row.className = 'week-row' + (isCurrentWeek ? ' current' : '');

    const mondayDate = parseDateKey(weekMondayKey);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const rangeText = mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' – ' + sundayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const info = document.createElement('div');
    info.className = 'wk-info';

    const num = document.createElement('span');
    num.className = 'wk-num';
    num.textContent = 'Week ' + getWeekNumber(mondayDate);
    info.appendChild(num);

    if (isCurrentWeek) {
        const tag = document.createElement('span');
        tag.className = 'wk-tag';
        tag.textContent = '● latest';
        info.appendChild(tag);
    }

    const range = document.createElement('div');
    range.className = 'wk-range';
    range.textContent = rangeText;
    info.appendChild(range);

    row.appendChild(info);

    const checkGroup = document.createElement('div');
    checkGroup.className = 'check-group';
    checkGroup.appendChild(buildChip('Vikt', Number(weekAverage(mondayDate)) !== 0));
    checkGroup.appendChild(buildChip('Steg', Number(stepsWeekAverage(mondayDate)) !== 0));
    checkGroup.appendChild(buildChip('Mått', anyMeasurementFilledIn(mondayDate)));
    checkGroup.appendChild(buildChip('Foto', weekHasPhoto(mondayDate)));
    checkGroup.appendChild(buildChip('Träning', weekTrainingCount(mondayDate) !== 0));

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.textContent = '›';
    checkGroup.appendChild(chevron);

    row.appendChild(checkGroup);

    row.addEventListener('click', function () {
        openCheckinPageForWeek(mondayDate);
    });

    return row;
}

// Draws the whole week list - called by pages.js whenever the Calendar tab is
// opened, and again by checkin-page.js after a save so the list reflects it.
export function renderCalendarPage() {
    const weekKeys = getCalendarWeekKeys();
    const currentMondayKey = formatDateKey(getMondayDate());

    const list = document.getElementById('calendarWeekList');
    list.innerHTML = '';

    let lastMonthLabel = null;

    for (let i = 0; i < weekKeys.length; i++) {
        const mondayDate = parseDateKey(weekKeys[i]);
        const monthLabel = mondayDate.toLocaleDateString('en-US', { month: 'long' });

        if (monthLabel !== lastMonthLabel) {
            const monthHeader = document.createElement('div');
            monthHeader.className = 'month-label';
            monthHeader.textContent = monthLabel;
            list.appendChild(monthHeader);
            lastMonthLabel = monthLabel;
        }

        list.appendChild(buildWeekRow(weekKeys[i], weekKeys[i] === currentMondayKey));
    }
}


renderCalendarPage();
