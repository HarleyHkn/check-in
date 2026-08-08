// Measurement types (Chest, Left Arm, etc.) and their day-by-day values.
// Mirrors the weight/steps data layer in app.js/steps-ui.js. Reuses
// sameDay/toDateKey from app.js.

let measurementTypes = [];   // [{name, isActive}, ...] - both base and custom types
let measurementValues = [];  // [date, typeName, value] triples

async function loadMeasurementTypes() {
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

async function loadMeasurementValues() {
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

function findMeasurementIndex(date, typeName) {
    for (let i = 0; i < measurementValues.length; i++) {
        if (sameDay(measurementValues[i][0], date) && measurementValues[i][1] === typeName) {
            return i;
        }
    }
    return -1;
}

function getMeasurementValue(date, typeName) {
    const index = findMeasurementIndex(date, typeName);
    if (index === -1) {
        return null;
    }
    return measurementValues[index][2];
}

async function upsertMeasurementValue(date, typeName, value) {
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

async function addMeasurementType(name) {
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

async function removeMeasurementType(name) {
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
