// Builds the Weekly page: one card per week, each with a Weight/Steps/Measure/
// Photo toggle - basically the week popup's own tabs, surfaced directly on a
// page instead of hidden behind the Calendar's week button. Tab contents come
// from weekly-tabs.js; this file just assembles the card/toggle bar and
// decides which weeks to show. parseDateKey/findMondayForWeekNumber are reused
// as-is from photos-page.js (they're generic, not photo-specific).

let weeklyWeeksBackShown = 1;     // current week + this many weeks back, always guaranteed a card
let weeklyManualWeekKeys = {};    // specific weeks added via "Add specific week"

function buildWeeklyWeekCard(weekMondayKey, isCurrentWeek) {
    const mondayDate = parseDateKey(weekMondayKey); // reused from photos-page.js

    const hasWeightData = hasAnyWeightEntry(mondayDate);
    const hasStepsData = hasAnyStepsEntry(mondayDate);
    const hasMeasurementData = hasAnyMeasurementEntry(mondayDate);
    const hasPhotoData = weekHasPhoto(weekMondayKey);
    const isFullyLogged = hasWeightData && hasStepsData && hasMeasurementData && hasPhotoData;

    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const rangeText = mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' – ' + sundayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const card = document.createElement('div');
    card.className = 'weeklyAvg overview-panel weekly-week-card';

    const head = document.createElement('div');
    head.className = 'photo-week-card-head';
    head.innerHTML =
        '<span class="photo-week-name">Week ' + getWeekNumber(mondayDate) +
        (isFullyLogged ? '<span class="week-complete-check">✓</span>' : '') +
        (isCurrentWeek ? '<span class="photo-latest-tag">LATEST</span>' : '') + '</span>' +
        '<span class="photo-week-range">' + rangeText + '</span>';
    card.appendChild(head);

    const tabs = [
        buildAvgTab(mondayDate, 'weight'),
        buildAvgTab(mondayDate, 'steps'),
        buildWeeklyMeasureTab(mondayDate),
        buildWeeklyPhotoTab(mondayDate)
    ];
    const hasDataFlags = [hasWeightData, hasStepsData, hasMeasurementData, hasPhotoData];
    const toggleLabels = ['Weight', 'Steps', 'Measure', 'Photo'];

    const toggleBar = document.createElement('div');
    toggleBar.className = 'week-modal-toggle';
    const buttons = [];

    for (let i = 0; i < toggleLabels.length; i++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'week-modal-toggle-button' + (i === 0 ? ' active' : '') + (hasDataFlags[i] ? ' has-data' : '');
        button.textContent = toggleLabels[i];
        toggleBar.appendChild(button);
        buttons.push(button);

        if (i !== 0) {
            tabs[i].style.display = 'none';
        }
    }

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function () {
            for (let j = 0; j < buttons.length; j++) {
                buttons[j].classList.remove('active');
                tabs[j].style.display = 'none';
            }
            buttons[i].classList.add('active');
            tabs[i].style.display = 'block';
        });
    }

    card.appendChild(toggleBar);
    for (let i = 0; i < tabs.length; i++) {
        card.appendChild(tabs[i]);
    }

    return card;
}

function getWeeklyWeekKeys() {
    const currentMonday = getMondayDate();

    const seen = {};
    for (let weeksBack = 0; weeksBack <= weeklyWeeksBackShown; weeksBack++) {
        const mondayForWeek = new Date(currentMonday);
        mondayForWeek.setDate(currentMonday.getDate() - weeksBack * 7);
        seen[formatDateKey(mondayForWeek)] = true;
    }
    for (const weekKey in weeklyManualWeekKeys) {
        seen[weekKey] = true;
    }

    const weekKeys = Object.keys(seen);
    weekKeys.sort();
    weekKeys.reverse();
    return weekKeys;
}

function renderWeeklyPage() {                 // called by pages.js whenever the Weekly tab is opened
    const weekKeys = getWeeklyWeekKeys();
    const currentMondayKey = formatDateKey(getMondayDate());

    const list = document.getElementById('weeklyWeekList');
    list.innerHTML = '';

    for (let i = 0; i < weekKeys.length; i++) {
        list.appendChild(buildWeeklyWeekCard(weekKeys[i], weekKeys[i] === currentMondayKey));
    }
}

document.getElementById('addPreviousWeeklyButton').addEventListener('click', function () {
    weeklyWeeksBackShown++;
    renderWeeklyPage();
});

document.getElementById('addSpecificWeeklyButton').addEventListener('click', function () {
    const typedValue = prompt('Which week number of this year? (e.g. 25)');
    if (!typedValue) { return; }

    const weekNumber = Number(typedValue);
    if (isNaN(weekNumber)) { alert('Please enter a number.'); return; }

    const mondayForWeek = findMondayForWeekNumber(weekNumber, new Date().getFullYear());
    if (mondayForWeek === null) { alert('That is not a valid week number.'); return; }

    weeklyManualWeekKeys[formatDateKey(mondayForWeek)] = true;
    renderWeeklyPage();
});
