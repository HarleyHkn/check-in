// Builds the Measurements tab shown inside the week popup. Measurements are
// entered once per week (not per day), so this is just one set of fields,
// saved against that week's Monday - same pattern as the existing weight/steps
// "set the week's average" shortcut. Split out from week-modal.js to keep that
// file focused on the popup shell. Reuses measurementTypes/getMeasurementValue/
// addMeasurementType/removeMeasurementType from measurements-ui.js.

function buildMeasurementsTab(mondayDate) {
    const container = document.createElement('div');

    const fieldsContainer = document.createElement('div');
    container.appendChild(fieldsContainer);

    const addCustomButton = document.createElement('button');
    addCustomButton.type = 'button';
    addCustomButton.className = 'add-custom-button';
    addCustomButton.textContent = '+ Add custom measurement';
    addCustomButton.addEventListener('click', async function () {
        const name = prompt('Name of the new measurement (e.g. "Neck"):');
        if (!name || name.trim() === '') {
            return;
        }
        const added = await addMeasurementType(name.trim());
        if (added) {
            renderFields();
        } else {
            alert('Could not add that measurement - you may already have one with that name.');
        }
    });
    container.appendChild(addCustomButton);

    function renderFields() {
        fieldsContainer.innerHTML = '';

        for (let i = 0; i < measurementTypes.length; i++) {
            const type = measurementTypes[i];
            if (!type.isActive) {
                continue;
            }

            const existingValue = getMeasurementValue(mondayDate, type.name);

            const row = document.createElement('div');
            row.className = 'measurement-row';

            const label = document.createElement('label');
            label.textContent = type.name;
            row.appendChild(label);

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'measurement-value-input';
            input.placeholder = 'Value';
            input.dataset.typeName = type.name;
            if (existingValue !== null) {
                input.value = existingValue;
            }
            row.appendChild(input);

            const unit = document.createElement('span');
            unit.className = 'unit';
            unit.textContent = 'cm';
            row.appendChild(unit);

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'remove-type-button';
            removeButton.title = 'Stop tracking ' + type.name;
            removeButton.textContent = '✕';
            removeButton.addEventListener('click', async function () {
                const sure = confirm('Stop tracking ' + type.name + '? Past entries stay saved, but this field will no longer show up.');
                if (sure) {
                    await removeMeasurementType(type.name);
                    renderFields();
                }
            });
            row.appendChild(removeButton);

            fieldsContainer.appendChild(row);
        }
    }

    renderFields();

    // Called by week-modal.js's saveWeekModal() to find out what's currently typed in.
    function gatherPendingSave() {
        const inputs = fieldsContainer.querySelectorAll('.measurement-value-input');
        const values = [];
        for (let i = 0; i < inputs.length; i++) {
            const value = inputs[i].value;
            if (value === '') {
                continue;
            }
            const numberValue = Number(value);
            if (isNaN(numberValue)) {
                continue;
            }
            values.push({ typeName: inputs[i].dataset.typeName, value: numberValue });
        }
        return { date: mondayDate, values: values };
    }

    return { element: container, gatherPendingSave: gatherPendingSave };
}
