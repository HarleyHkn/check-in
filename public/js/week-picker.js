// "Check in for another week" box on the Calendar page: type a week number
// (the year sits in the corner, editable via the pencil) and Open goes straight
// to Check-in for that week. A week that already has data opens pre-filled, and
// Check-in's own "Are you sure" guard asks before anything is overwritten.

import { getMondayDate, formatDateKey, findMondayForWeekNumber } from './date-utils.js';
import { openCheckinPageForWeek } from './checkin-page.js';

const overlay = document.getElementById('weekPickerOverlay');
const yearBox = document.getElementById('weekPickerYearBox');
const yearText = document.getElementById('weekPickerYearText');
const yearInput = document.getElementById('weekPickerYear');
const weekInput = document.getElementById('weekPickerWeek');
const errorText = document.getElementById('weekPickerError');

function openWeekPicker() {
    const thisYear = new Date().getFullYear();
    yearInput.value = thisYear;
    yearText.textContent = thisYear;
    yearBox.classList.remove('editing');
    weekInput.value = '';
    errorText.textContent = '';
    overlay.classList.add('open');
    weekInput.focus();
}

function closeWeekPicker() {
    overlay.classList.remove('open');
}

function submitWeekPicker() {
    const weekNumber = Number(weekInput.value.trim());
    const year = Number(yearInput.value.trim());
    const thisYear = new Date().getFullYear();

    if (!Number.isInteger(year) || year < 2000 || year > thisYear) {
        errorText.textContent = 'Enter a year between 2000 and ' + thisYear + '.';
        return;
    }
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
        errorText.textContent = 'Enter a week between 1 and 53.';
        return;
    }

    const monday = findMondayForWeekNumber(weekNumber, year);
    if (monday === null) {
        errorText.textContent = year + ' has no week ' + weekNumber + '.';
        return;
    }
    // "YYYY-MM-DD" strings compare correctly as plain text
    if (formatDateKey(monday) > formatDateKey(getMondayDate())) {
        errorText.textContent = "That week hasn't started yet.";
        return;
    }

    closeWeekPicker();
    openCheckinPageForWeek(monday);
}

document.getElementById('openWeekPickerButton').addEventListener('click', openWeekPicker);
document.getElementById('weekPickerCancel').addEventListener('click', closeWeekPicker);
document.getElementById('weekPickerOpen').addEventListener('click', submitWeekPicker);

document.getElementById('weekPickerYearEdit').addEventListener('click', function () {
    yearBox.classList.add('editing');
    yearInput.focus();
    yearInput.select();
});
yearInput.addEventListener('input', function () {
    yearText.textContent = yearInput.value;
});

// Tapping the dark area outside the box closes it, like a cancel.
overlay.addEventListener('click', function (event) {
    if (event.target === overlay) {
        closeWeekPicker();
    }
});

document.addEventListener('keydown', function (event) {
    if (!overlay.classList.contains('open')) {
        return;
    }
    if (event.key === 'Escape') {
        closeWeekPicker();
    } else if (event.key === 'Enter') {
        submitWeekPicker();
    }
});
