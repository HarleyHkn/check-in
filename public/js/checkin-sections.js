// Builds the Check-in page's header (week label + progress chips), Weight
// section, Steps section, and Measurements grid. Split out of checkin-page.js
// to keep that file under the project's 300-line limit - checkin-page.js
// keeps just the open/close/save orchestration, this file just builds DOM.

import { getWeekNumber } from './date-utils.js';
import { weekAverage } from './weights-ui.js';
import { stepsWeekAverage } from './steps-ui.js';
import { measurementTypes, getMeasurementValue, addMeasurementType, removeMeasurementType } from './measurements-ui.js';
import { weekHasPhoto } from './photos-ui.js';
import { weekTrainingCount } from './training-ui.js';

// weekAverage()/stepsWeekAverage() are used everywhere below instead of
// getWeightForDate(monday)/getStepsForDate(monday) - a week's weight/steps
// can live on any day that week (demo data is daily, and even real accounts
// could in principle have more than one entry), not only on the Monday
// itself, so checking just Monday's exact date was missing real data.

// Walks back week by week (up to a year) looking for the most recent earlier
// week that has a saved weight, to show the "since last check-in" delta.
function findPreviousWeight(monday) {
    for (let weeksBack = 1; weeksBack <= 52; weeksBack++) {
        const candidate = new Date(monday);
        candidate.setDate(monday.getDate() - weeksBack * 7);
        const value = Number(weekAverage(candidate));
        if (value !== 0) {
            return value;
        }
    }
    return null;
}

function anyMeasurementFilledIn(monday) {
    for (let i = 0; i < measurementTypes.length; i++) {
        const type = measurementTypes[i];
        if (type.isActive && getMeasurementValue(monday, type.name) !== null) {
            return true;
        }
    }
    return false;
}

// True if this week has weight, steps, training, a measurement, or a photo - used by
// Calendar (checkin-page.js's openCheckinPageForWeek()) to decide whether
// opening a week counts as "editing existing data" (needs a confirm dialog
// before saving) or a fresh, empty week (no confirm needed).
export function weekHasAnyData(monday) {
    return Number(weekAverage(monday)) !== 0 ||
        Number(stepsWeekAverage(monday)) !== 0 ||
        weekTrainingCount(monday) !== 0 ||
        anyMeasurementFilledIn(monday) ||
        weekHasPhoto(monday);
}

function buildChip(label, done) {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const dot = document.createElement('div');
    dot.className = 'chip-dot' + (done ? ' done' : '');
    dot.textContent = done ? '✓' : '·';
    chip.appendChild(dot);

    const chipLabel = document.createElement('div');
    chipLabel.className = 'chip-label';
    chipLabel.textContent = label;
    chip.appendChild(chipLabel);

    return chip;
}

export function buildHeader(monday) {
    const header = document.createElement('div');
    header.className = 'checkin-header';

    const left = document.createElement('div');
    const wk = document.createElement('div');
    wk.className = 'wk';
    wk.textContent = 'Week ' + getWeekNumber(monday) + ' check-in';
    left.appendChild(wk);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const range = document.createElement('div');
    range.className = 'range';
    range.textContent = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' – ' + sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    left.appendChild(range);
    header.appendChild(left);

    const chips = document.createElement('div');
    chips.className = 'progress-chips';
    chips.appendChild(buildChip('Vikt', Number(weekAverage(monday)) !== 0));
    chips.appendChild(buildChip('Steg', Number(stepsWeekAverage(monday)) !== 0));
    chips.appendChild(buildChip('Mått', anyMeasurementFilledIn(monday)));
    chips.appendChild(buildChip('Foto', weekHasPhoto(monday)));
    chips.appendChild(buildChip('Träning', weekTrainingCount(monday) !== 0));
    header.appendChild(chips);

    return header;
}

export function buildWeightSection(monday) {
    const card = document.createElement('div');
    card.className = 'section-card';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Weight';
    card.appendChild(label);

    const inputRow = document.createElement('div');
    inputRow.className = 'hero-input-row';

    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'checkinWeightInput';
    input.className = 'hero-input';
    const weekWeight = Number(weekAverage(monday));
    const existingWeight = weekWeight !== 0 ? weekWeight : null;
    if (existingWeight !== null) {
        input.value = existingWeight;
    }
    inputRow.appendChild(input);

    const unit = document.createElement('span');
    unit.className = 'hero-unit';
    unit.textContent = 'kg';
    inputRow.appendChild(unit);
    card.appendChild(inputRow);

    if (existingWeight !== null) {
        const previousWeight = findPreviousWeight(monday);
        if (previousWeight !== null) {
            const delta = existingWeight - previousWeight;
            const arrow = delta <= 0 ? '↓' : '↑';
            const sub = document.createElement('div');
            sub.className = 'hero-sub';
            sub.textContent = arrow + ' ' + Math.abs(delta).toFixed(1) + ' kg since last check-in';
            card.appendChild(sub);
        }
    }

    return card;
}

export function buildStepsSection(monday) {
    const card = document.createElement('div');
    card.className = 'section-card';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Steps (this week)';
    card.appendChild(label);

    const row = document.createElement('div');
    row.className = 'steps-row';

    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'checkinStepsInput';
    input.className = 'steps-input';
    const weekSteps = Number(stepsWeekAverage(monday));
    const existingSteps = weekSteps !== 0 ? weekSteps : null;
    if (existingSteps !== null) {
        input.value = existingSteps;
    }
    row.appendChild(input);
    card.appendChild(row);

    const note = document.createElement('div');
    note.className = 'autosync-note';
    const switchMini = document.createElement('div');
    switchMini.className = 'switch-mini';
    switchMini.appendChild(document.createElement('div')).className = 'knob-mini';
    note.appendChild(switchMini);
    note.appendChild(document.createTextNode('Auto-sync from health tracker — coming soon'));
    card.appendChild(note);

    return card;
}

// onChange is called after a custom measurement type is added or removed, so
// the caller can re-render the whole Check-in body (the grid needs a field
// added/removed, and the header's "Mått" chip may need to update too).
export function buildMeasurementsSection(monday, onChange) {
    const card = document.createElement('div');
    card.className = 'section-card';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Measurements';
    card.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'measure-grid';

    for (let i = 0; i < measurementTypes.length; i++) {
        const type = measurementTypes[i];
        if (!type.isActive) {
            continue;
        }

        const field = document.createElement('div');
        field.className = 'measure-field';

        const fieldTop = document.createElement('div');
        fieldTop.className = 'measure-field-top';

        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = type.name;
        fieldTop.appendChild(fieldLabel);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'measure-remove-button';
        removeButton.title = 'Stop tracking ' + type.name;
        removeButton.textContent = '✕';
        removeButton.addEventListener('click', async function () {
            const sure = confirm('Stop tracking ' + type.name + '? Past entries stay saved, but this field will no longer show up.');
            if (sure) {
                await removeMeasurementType(type.name);
                onChange();
            }
        });
        fieldTop.appendChild(removeButton);
        field.appendChild(fieldTop);

        const row = document.createElement('div');
        row.className = 'field-row';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'checkin-measure-input';
        input.dataset.typeName = type.name;
        const existingValue = getMeasurementValue(monday, type.name);
        if (existingValue !== null) {
            input.value = existingValue;
        }
        row.appendChild(input);

        const unit = document.createElement('span');
        unit.className = 'unit';
        unit.textContent = 'cm';
        row.appendChild(unit);

        field.appendChild(row);
        grid.appendChild(field);
    }

    card.appendChild(grid);

    const addCustomButton = document.createElement('button');
    addCustomButton.type = 'button';
    addCustomButton.className = 'add-custom-measure-button';
    addCustomButton.textContent = '+ Add custom measurement';
    addCustomButton.addEventListener('click', async function () {
        const name = prompt('Name of the new measurement (e.g. "Neck"):');
        if (!name || name.trim() === '') {
            return;
        }
        const added = await addMeasurementType(name.trim());
        if (added) {
            onChange();
        } else {
            alert('Could not add that measurement - you may already have one with that name.');
        }
    });
    card.appendChild(addCustomButton);

    return card;
}
