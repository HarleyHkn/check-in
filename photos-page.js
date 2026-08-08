// Builds the Photos page: one card per week (current week first, then any older
// weeks that have a photo), each with a Front/Back/Side box, plus the All/Front/
// Back/Side filter pills. Mirrors overview.js's role for the Overview page -
// renderPhotosPage() is called by pages.js whenever the Photos tab is opened.
// Reuses getMondayDate/formatDateKey/getWeekNumber from app.js and
// hasPhoto/photoUrl/uploadPhoto/deletePhoto from photos-ui.js.

let activePhotoFilter = 'all'; // 'all', 'front', 'back', or 'side'

function parseDateKey(dateKey) { // "YYYY-MM-DD" -> local Date. Splitting it ourselves
    const parts = dateKey.split('-');                    // avoids the UTC-midnight shift that new Date("YYYY-MM-DD") causes.
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// Which week Mondays to show: the current week (so there's always somewhere to
// upload a new photo) plus every week that already has at least one photo.
function getPhotoWeekKeys() {
    const currentMondayKey = formatDateKey(getMondayDate());

    const seen = {}; // plain object used as a set of date-key strings
    seen[currentMondayKey] = true;
    for (let i = 0; i < photoList.length; i++) {
        seen[photoList[i].date] = true;
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
