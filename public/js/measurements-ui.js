// Measurement types (Chest, Left Arm, etc.) and their day-by-day values.
// Mirrors the weight/steps data layer above.

import { sameDay, toDateKey } from './date-utils.js';

export let measurementTypes = [];   // [{name, isActive}, ...] - both base and custom types
let measurementValues = [];         // [date, typeName, value] triples

// Fetches this user's measurement types from the server (base + custom).
export async function loadMeasurementTypes() {
    const response = await fetch('/api/measurement-types');
    if (!response.ok) {
        measurementTypes = [];
        return;
    }
    const rows = await response.json();
    measurementTypes = rows.map(function (row) {
        return { name: row.name, isActive: row.is_active };
    });
}

// Fetches this user's measurement values from the server (every type, every date).
export async function loadMeasurementValues() {
    const response = await fetch('/api/measurements');
    if (!response.ok) {
        measurementValues = [];
        return;
    }
    const rows = await response.json();
    measurementValues = rows.map(function (row) {
        return [row.entry_date, row.type_name, Number(row.value)];
    });
}

// Called by auth-ui.js's logout() - see weights-ui.js's resetWeightLog for why
// these small functions exist instead of the caller just reassigning the arrays.
export function resetMeasurementTypes() {
    measurementTypes = [];
}
export function resetMeasurementValues() {
    measurementValues = [];
}

// Finds this array's index for a given date+type, or -1 if there's no entry yet.
function findMeasurementIndex(date, typeName) {
    for (let i = 0; i < measurementValues.length; i++) {
        if (sameDay(measurementValues[i][0], date) && measurementValues[i][1] === typeName) {
            return i;
        }
    }
    return -1;
}

// Returns the value logged for a date+type, or null if there isn't one.
export function getMeasurementValue(date, typeName) {
    const index = findMeasurementIndex(date, typeName);
    if (index === -1) {
        return null;
    }
    return measurementValues[index][2];
}

// Saves one measurement value to the server, then updates the local copy too.
export async function upsertMeasurementValue(date, typeName, value) {
    const dateKey = toDateKey(date);

    const response = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey, typeName: typeName, value: value })
    });

    if (!response.ok) {
        return false;
    }

    const index = findMeasurementIndex(dateKey, typeName);
    if (index === -1) {
        measurementValues.push([dateKey, typeName, value]);
    } else {
        measurementValues[index] = [dateKey, typeName, value];
    }
    return true;
}

// Adds a custom measurement type.
export async function addMeasurementType(name) {
    const response = await fetch('/api/measurement-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
    });

    if (!response.ok) {
        return false;
    }

    measurementTypes.push({ name: name, isActive: true });
    return true;
}

// "Removes" a measurement type - marks it inactive so it stops showing up in
// the entry form, but keeps its past values intact.
export async function removeMeasurementType(name) {
    const response = await fetch('/api/measurement-types/' + encodeURIComponent(name), {
        method: 'DELETE'
    });

    if (!response.ok) {
        return false;
    }

    for (let i = 0; i < measurementTypes.length; i++) {
        if (measurementTypes[i].name === name) {
            measurementTypes[i].isActive = false;
        }
    }
    return true;
}
