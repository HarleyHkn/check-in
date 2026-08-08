// Builds the content of each of the 4 toggle tabs inside a Weekly-page week
// card (Weight/Steps/Measure/Photo). weekly-page.js assembles these into the
// actual card + toggle bar.

import { getWeightForDate, upsertEntryForDate, deleteEntryForDate, weekAverage } from './weights-ui.js';
import { getStepsForDate, upsertStepsForDate, deleteStepsForDate, stepsWeekAverage } from './steps-ui.js';
import { measurementTypes, getMeasurementValue, upsertMeasurementValue } from './measurements-ui.js';
import { hasPhoto, photoUrl, uploadPhoto, deletePhoto } from './photos-ui.js';
import { buildAvgOverridePanel } from './avg-override-panel.js';
import { buildMeasurementsTab } from './measurements-tab.js';
import { formatDateKey } from './date-utils.js';
import { renderWeeklyPage } from './weekly-page.js';

// True if any day this week has a weight entry.
export function hasAnyWeightEntry(mondayDate) {
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        if (getWeightForDate(d) !== null) { return true; }
    }
    return false;
}

// True if any day this week has a steps entry.
export function hasAnyStepsEntry(mondayDate) {
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        if (getStepsForDate(d) !== null) { return true; }
    }
    return false;
}

// True if this week has a value for any active measurement type.
export function hasAnyMeasurementEntry(mondayDate) {
    for (let i = 0; i < measurementTypes.length; i++) {
        if (measurementTypes[i].isActive && getMeasurementValue(mondayDate, measurementTypes[i].name) !== null) {
            return true;
        }
    }
    return false;
}

// Overwrites a whole week with one average number - same "delete every day,
// then write just the Monday" trick week-modal.js's Save button already uses.
async function saveWeekAverageOverride(mondayDate, metric, value) {
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        if (metric === 'weight') { await deleteEntryForDate(d); } else { await deleteStepsForDate(d); }
    }
    if (metric === 'weight') { await upsertEntryForDate(mondayDate, value); } else { await upsertStepsForDate(mondayDate, value); }
}

// Builds the Weight or Steps tab: the average line plus the "edit average" shortcut.
export function buildAvgTab(mondayDate, metric) {          // metric: 'weight' or 'steps'
    const tab = document.createElement('div');
    tab.className = 'week-modal-tab';

    const hasEntry = metric === 'weight' ? hasAnyWeightEntry(mondayDate) : hasAnyStepsEntry(mondayDate);
    const avgValue = metric === 'weight' ? weekAverage(mondayDate) : stepsWeekAverage(mondayDate);
    const unitLabel = metric === 'weight' ? ' kg' : '';

    const row = document.createElement('div');
    row.className = 'week-avg-row';

    const line = document.createElement('span');
    line.textContent = (metric === 'weight' ? 'Weight' : 'Steps') + ': ' + (avgValue === 0 ? 'No data' : avgValue + unitLabel);
    row.appendChild(line);

    const inputId = 'weeklyAvgInput_' + metric + '_' + formatDateKey(mondayDate);
    const override = buildAvgOverridePanel(hasEntry, inputId, 'New avg' + (metric === 'weight' ? ' (kg)' : ''));

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'edit-avg-button';
    editButton.title = "Edit this week's average";
    editButton.textContent = '✎';
    editButton.addEventListener('click', override.openPanel);
    row.appendChild(editButton);

    tab.appendChild(row);
    tab.appendChild(override.panel);

    // Typing a value and tabbing/clicking away saves it right away - no
    // separate Save button needed for this one field. Grabbed straight off the
    // panel (not document.getElementById) since this card isn't in the live
    // document yet while it's still being built.
    override.panel.querySelector('input').addEventListener('change', async function (event) {
        const value = Number(event.target.value);
        if (event.target.value === '' || isNaN(value)) { return; }
        await saveWeekAverageOverride(mondayDate, metric, value);
        renderWeeklyPage();
    });

    return tab;
}

// Builds the Photo tab: the Front/Back/Side row, same as the Photos page's
// angle boxes but rendered inline here instead (near-duplicate of
// photos-page.js's buildAngleBox/buildWeekCard - kept duplicated rather than
// sharing a helper, since the two pages' surrounding markup differs enough
// that a shared helper would need its own set of options to bridge the gap).
export function buildWeeklyPhotoTab(mondayDate) {
    const mondayKey = formatDateKey(mondayDate);
    const tab = document.createElement('div');
    tab.className = 'week-modal-tab';

    const row = document.createElement('div');
    row.className = 'photo-angle-row';
    row.style.setProperty('--cols', 3);

    const angles = [['front', 'Front'], ['back', 'Back'], ['side', 'Side']];
    for (let i = 0; i < angles.length; i++) {
        const angleKey = angles[i][0];
        const angleLabel = angles[i][1];

        const box = document.createElement('div');
        box.className = 'photo-angle-box';

        const label = document.createElement('div');
        label.className = 'photo-angle-label';
        label.textContent = angleLabel;
        box.appendChild(label);

        const slot = document.createElement('div');
        if (hasPhoto(mondayKey, angleKey)) {
            slot.className = 'photo-slot filled ' + angleKey;
            const img = document.createElement('img');
            img.src = photoUrl(mondayKey, angleKey);
            img.alt = angleLabel + ' photo';
            slot.appendChild(img);

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'photo-remove-button';
            removeButton.title = 'Remove this photo';
            removeButton.textContent = '✕';
            removeButton.addEventListener('click', async function (event) {
                event.stopPropagation();
                if (confirm('Delete this ' + angleLabel.toLowerCase() + ' photo?')) {
                    await deletePhoto(mondayKey, angleKey);
                    renderWeeklyPage();
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

            slot.addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', async function () {
                if (fileInput.files && fileInput.files[0]) {
                    await uploadPhoto(mondayKey, angleKey, fileInput.files[0]);
                    renderWeeklyPage();
                }
            });
        }

        box.appendChild(slot);
        row.appendChild(box);
    }

    tab.appendChild(row);
    return tab;
}

// Builds the Measure tab: the same measurements-tab.js widget the week popup
// uses, plus its own Save button (the popup instead saves everything together
// via its one shared Save button, which this page doesn't have).
export function buildWeeklyMeasureTab(mondayDate) {
    const built = buildMeasurementsTab(mondayDate); // {element, gatherPendingSave}
    const tab = built.element;
    tab.className = 'week-modal-tab';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'small-btn';
    saveButton.style.marginTop = '10px';
    saveButton.textContent = 'Save measurements';
    saveButton.addEventListener('click', async function () {
        const pending = built.gatherPendingSave();
        for (let i = 0; i < pending.values.length; i++) {
            await upsertMeasurementValue(pending.date, pending.values[i].typeName, pending.values[i].value);
        }
        renderWeeklyPage();
    });
    tab.appendChild(saveButton);

    return tab;
}
