// Builds a pill-button toggle bar that shows exactly one of several tab elements
// at a time. Used by the week popup (Weight/Steps/Measurements) - pure DOM
// scaffolding, not popup-specific logic, so it's shared rather than each popup
// re-writing its own show/hide-and-highlight wiring.

function buildTabToggle(tabs, activeKey, onSwitch) {
    // tabs: array of { key, label, element }
    const toggleBar = document.createElement('div');
    toggleBar.className = 'week-modal-toggle';

    const buttons = [];

    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'week-modal-toggle-button' + (tab.key === activeKey ? ' active' : '');
        button.textContent = tab.label;
        toggleBar.appendChild(button);
        buttons.push(button);

        if (tab.key !== activeKey) {
            tab.element.style.display = 'none';
        }
    }

    for (let i = 0; i < tabs.length; i++) {
        buttons[i].addEventListener('click', function () {
            for (let j = 0; j < tabs.length; j++) {
                tabs[j].element.style.display = (tabs[j].key === tabs[i].key) ? 'block' : 'none';
                if (tabs[j].key === tabs[i].key) {
                    buttons[j].classList.add('active');
                } else {
                    buttons[j].classList.remove('active');
                }
            }
            onSwitch(tabs[i].key);
        });
    }

    return toggleBar;
}
