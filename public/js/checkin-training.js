// The Check-in page's Training section: one chip-style circle per weekday
// (Mon-Sun) that the user taps to check. Tapping only changes the page;
// saveTrainingDays() writes it to the server when Save is pressed, same as
// every other field on the page. Own file because checkin-sections.js is
// close to the 300-line limit.

import { trainedOnDate, setTrainedForDate } from './training-ui.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The date for day number dayIndex (0 = Monday) of the given week.
function dateForDay(monday, dayIndex) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + dayIndex);
    return day;
}

function countText(count) {
    if (count === 1) {
        return '1 session';
    }
    return count + ' sessions';
}

// Fills or empties one day's circle - the same look as the header chips.
function showDayAsChecked(dot, checked) {
    if (checked) {
        dot.classList.add('done');
        dot.textContent = '✓';
    } else {
        dot.classList.remove('done');
        dot.textContent = '·';
    }
}

export function buildTrainingSection(monday) {
    const card = document.createElement('div');
    card.className = 'section-card';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Training (days this week)';
    card.appendChild(label);

    const row = document.createElement('div');
    row.className = 'training-row';

    const countLine = document.createElement('div');
    countLine.className = 'training-count';

    // Re-counts the checked circles on the page (not the saved data), so the
    // line updates right away when a day is tapped.
    function updateCount() {
        const checkedCount = row.querySelectorAll('.chip-dot.done').length;
        countLine.textContent = countText(checkedCount);
    }

    for (let i = 0; i < DAY_NAMES.length; i++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chip training-day';
        button.setAttribute('aria-label', 'Trained on ' + DAY_NAMES[i]);

        const dot = document.createElement('div');
        dot.className = 'chip-dot';
        showDayAsChecked(dot, trainedOnDate(dateForDay(monday, i)));
        button.appendChild(dot);

        const dayLabel = document.createElement('div');
        dayLabel.className = 'chip-label';
        dayLabel.textContent = DAY_NAMES[i];
        button.appendChild(dayLabel);

        button.setAttribute('aria-pressed', dot.classList.contains('done'));
        button.addEventListener('click', function () {
            const nowChecked = !dot.classList.contains('done');
            showDayAsChecked(dot, nowChecked);
            button.setAttribute('aria-pressed', nowChecked);
            updateCount();
        });

        row.appendChild(button);
    }

    card.appendChild(row);
    updateCount();
    card.appendChild(countLine);

    return card;
}

// Called by checkin-page.js's performSave(): saves each day's checked state.
// Only days that changed reach the server (setTrainedForDate skips the rest).
export async function saveTrainingDays(monday) {
    const dots = document.querySelectorAll('#checkinBody .training-day .chip-dot');
    for (let i = 0; i < dots.length; i++) {
        await setTrainedForDate(dateForDay(monday, i), dots[i].classList.contains('done'));
    }
}
