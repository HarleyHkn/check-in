// Builds the small "edit average" widget used in the week popup (see week-modal.js):
// a hidden panel that either shows a direct input (week has no entries yet) or an
// overwrite warning + confirm buttons first (week already has entries). Used once
// for weight, once for steps - pure DOM scaffolding, not metric-specific logic,
// so it's shared rather than copy-pasted twice, and kept in its own file since it's
// a reusable widget rather than week-popup-specific logic.

function buildAvgOverridePanel(hasExistingEntries, inputId, inputPlaceholder) {
    const panel = document.createElement('div');
    panel.className = 'avg-edit-panel';

    const warning = document.createElement('p');
    warning.className = 'avg-warning';
    warning.textContent = "This week already has daily entries. Setting a new average will overwrite all of them with this one number.";
    panel.appendChild(warning);

    const confirmRow = document.createElement('div');
    confirmRow.className = 'avg-confirm-buttons';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'small-btn';
    cancelButton.textContent = 'Cancel';
    confirmRow.appendChild(cancelButton);

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'small-btn confirm';
    confirmButton.textContent = 'Yes, overwrite';
    confirmRow.appendChild(confirmButton);

    panel.appendChild(confirmRow);

    const input = document.createElement('input');
    input.type = 'number';
    input.id = inputId;
    input.placeholder = inputPlaceholder;
    input.style.display = 'none';
    panel.appendChild(input);

    panel.style.display = 'none';

    cancelButton.addEventListener('click', function () {
        panel.style.display = 'none';
    });
    confirmButton.addEventListener('click', function () {
        warning.style.display = 'none';
        confirmRow.style.display = 'none';
        input.style.display = 'block';
    });

    function openPanel() {
        panel.style.display = 'block';
        if (hasExistingEntries) {
            warning.style.display = 'block';
            confirmRow.style.display = 'flex';
            input.style.display = 'none';
        } else {
            warning.style.display = 'none';
            confirmRow.style.display = 'none';
            input.style.display = 'block';
        }
    }

    return { panel: panel, openPanel: openPanel };
}
