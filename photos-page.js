// Builds the Photos page: one card per week (current week first, then any older
// weeks that have a photo), each with a Front/Back/Side box, plus the All/Front/
// Back/Side filter pills. Mirrors overview.js's role for the Overview page -
// renderPhotosPage() is called by pages.js whenever the Photos tab is opened.
// Reuses getMondayDate/formatDateKey/getWeekNumber from app.js and
// hasPhoto/photoUrl/uploadPhoto/deletePhoto from photos-ui.js.

let activePhotoFilter = 'all'; // 'all', 'front', 'back', or 'side'

// How many weeks before the current one are always guaranteed a (possibly empty)
// card, regardless of whether they have a photo yet. Starts at 1 (current + last
// week), and grows by itself as the oldest guaranteed week gets filled in - see
// the upload handler in buildAngleBox() below.
let photoWeeksBackShown = 1;

// Specific weeks added by typing a week number into the "Add week" box - kept
// separate from photoWeeksBackShown since these can be any single week, not
// necessarily next to each other. Keyed by that week's Monday "YYYY-MM-DD".
let manuallyAddedWeekKeys = {};

function parseDateKey(dateKey) { // "YYYY-MM-DD" -> local Date. Splitting it ourselves
    const parts = dateKey.split('-');                    // avoids the UTC-midnight shift that new Date("YYYY-MM-DD") causes.
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// How many whole weeks before the current one this Monday falls on (0 = this week,
// 1 = last week, 2 = the week before that, ...).
function weeksBackFromCurrent(weekMondayKey) {
    const currentMonday = getMondayDate();
    const weekMonday = parseDateKey(weekMondayKey);
    const diffDays = Math.round((currentMonday - weekMonday) / 86400000);
    return diffDays / 7;
}

// Finds the Monday for a given week number in the given year, by walking forward
// from Jan 1st one week at a time until getWeekNumber() agrees - simplest way to
// reverse that function without duplicating its date math. Returns null if the
// week number doesn't exist (e.g. typed 99).
function findMondayForWeekNumber(weekNumber, year) {
    let monday = getMondayDate(new Date(year, 0, 1));
    for (let i = 0; i < 53; i++) {
        if (getWeekNumber(monday) === weekNumber) {
            return monday;
        }
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        monday = nextMonday;
    }
    return null;
}

// Which week Mondays to show: the current week plus photoWeeksBackShown weeks
// before it (so there's always somewhere to upload a new or catch-up photo),
// plus every week that already has at least one photo (which can reach further
// back than photoWeeksBackShown if the user jumped ahead with the button).
function getPhotoWeekKeys() {
    const currentMonday = getMondayDate();

    const seen = {}; // plain object used as a set of date-key strings
    for (let weeksBack = 0; weeksBack <= photoWeeksBackShown; weeksBack++) {
        const mondayForWeek = new Date(currentMonday);
        mondayForWeek.setDate(currentMonday.getDate() - weeksBack * 7);
        seen[formatDateKey(mondayForWeek)] = true;
    }
    for (let i = 0; i < photoList.length; i++) {
        seen[photoList[i].date] = true;
    }
    for (const weekKey in manuallyAddedWeekKeys) {
        seen[weekKey] = true;
    }

    const weekKeys = Object.keys(seen);
    weekKeys.sort();      // "YYYY-MM-DD" strings sort correctly as plain text
    weekKeys.reverse();   // newest week first
    return weekKeys;
}

function buildAngleBox(weekMondayKey, angleKey, angleLabel) {
    const box = document.createElement('div');
    box.className = 'photo-angle-box';
    box.dataset.angle = angleKey;

    const label = document.createElement('div');
    label.className = 'photo-angle-label';
    label.textContent = angleLabel;
    box.appendChild(label);

    const slot = document.createElement('div');

    if (hasPhoto(weekMondayKey, angleKey)) {
        slot.className = 'photo-slot filled ' + angleKey;

        const img = document.createElement('img');
        img.src = photoUrl(weekMondayKey, angleKey);
        img.alt = angleLabel + ' photo';
        slot.appendChild(img);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'photo-remove-button';
        removeButton.title = 'Remove this photo';
        removeButton.textContent = '✕'; // small X
        removeButton.addEventListener('click', async function (event) {
            event.stopPropagation(); // don't also trigger the slot's own click handler
            if (confirm('Delete this ' + angleLabel.toLowerCase() + ' photo?')) {
                await deletePhoto(weekMondayKey, angleKey);
                renderPhotosPage();
            }
        });
        slot.appendChild(removeButton);
    } else {
        slot.className = 'photo-slot empty';

        const plus = document.createElement('span');
        plus.className = 'photo-plus';
        plus.textContent = '+';
        slot.appendChild(plus);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        slot.appendChild(fileInput);

        slot.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', async function () {
            if (fileInput.files && fileInput.files[0]) {
                await uploadPhoto(weekMondayKey, angleKey, fileInput.files[0]);

                // If this was the oldest guaranteed-empty week, reveal one more
                // week below it automatically - keeps the catch-up chain going
                // without needing another button click.
                if (weeksBackFromCurrent(weekMondayKey) === photoWeeksBackShown) {
                    photoWeeksBackShown++;
                }

                renderPhotosPage();
            }
        });
    }

    box.appendChild(slot);
    return box;
}

function buildWeekCard(weekMondayKey, isCurrentWeek) {
    const card = document.createElement('div');
    card.className = 'photo-week-card' + (isCurrentWeek ? ' is-latest' : '');

    const mondayDate = parseDateKey(weekMondayKey);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const rangeText = mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' – ' + sundayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const head = document.createElement('div');
    head.className = 'photo-week-card-head';
    head.innerHTML =
        '<span class="photo-week-name">Week ' + getWeekNumber(mondayDate) +
        (isCurrentWeek ? '<span class="photo-latest-tag">LATEST</span>' : '') + '</span>' +
        '<span class="photo-week-range">' + rangeText + '</span>';
    card.appendChild(head);

    const row = document.createElement('div');
    row.className = 'photo-angle-row';
    row.appendChild(buildAngleBox(weekMondayKey, 'front', 'Front'));
    row.appendChild(buildAngleBox(weekMondayKey, 'back', 'Back'));
    row.appendChild(buildAngleBox(weekMondayKey, 'side', 'Side'));
    card.appendChild(row);

    return card;
}

// Shows only the selected angle's box (or all three) - doesn't rebuild anything,
// just toggles which boxes are visible, so it can also be re-applied after a
// re-render without losing the current filter choice.
function applyPhotoFilter() {
    const rows = document.querySelectorAll('#photoWeekList .photo-angle-row');
    for (let i = 0; i < rows.length; i++) {
        rows[i].style.setProperty('--cols', activePhotoFilter === 'all' ? 3 : 1);
    }

    const boxes = document.querySelectorAll('#photoWeekList .photo-angle-box');
    for (let i = 0; i < boxes.length; i++) {
        const show = activePhotoFilter === 'all' || boxes[i].dataset.angle === activePhotoFilter;
        boxes[i].classList.toggle('is-hidden', !show);
    }
}

function renderPhotosPage() {           // called by pages.js whenever the Photos tab is opened
    const weekKeys = getPhotoWeekKeys();
    const currentMondayKey = formatDateKey(getMondayDate());

    const list = document.getElementById('photoWeekList');
    list.innerHTML = '';

    for (let i = 0; i < weekKeys.length; i++) {
        const weekMondayKey = weekKeys[i];
        list.appendChild(buildWeekCard(weekMondayKey, weekMondayKey === currentMondayKey));
    }

    applyPhotoFilter();
}

const photoFilterBar = document.getElementById('photoFilterBar');
photoFilterBar.addEventListener('click', function (event) {
    const button = event.target.closest('.photo-filter-button');
    if (!button) {
        return;
    }

    const buttons = photoFilterBar.querySelectorAll('.photo-filter-button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    button.classList.add('active');

    activePhotoFilter = button.dataset.filter;
    applyPhotoFilter();
});

document.getElementById('addPreviousWeekButton').addEventListener('click', function () {
    photoWeeksBackShown++;   // reveal one more empty week further back
    renderPhotosPage();
});

document.getElementById('addSpecificWeekButton').addEventListener('click', function () {
    const typedValue = prompt('Which week number of this year? (e.g. 25)');
    if (!typedValue) {
        return; // cancelled
    }

    const weekNumber = Number(typedValue);
    if (isNaN(weekNumber)) {
        alert('Please enter a number.');
        return;
    }

    const currentYear = new Date().getFullYear();
    const mondayForWeek = findMondayForWeekNumber(weekNumber, currentYear);

    if (mondayForWeek === null) {
        alert('That is not a valid week number.');
        return;
    }

    manuallyAddedWeekKeys[formatDateKey(mondayForWeek)] = true;
    renderPhotosPage();
});
