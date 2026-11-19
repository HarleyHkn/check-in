// Builds the Check-in page's Photo section: a card for every angle that
// already has a photo this week, plus "+ Add <angle>" ghost buttons for
// whichever angles don't yet. Split out of checkin-page.js to keep that file
// under the project's 300-line limit.

import { hasPhoto, photoUrl, uploadPhoto } from './photos-ui.js';

const ANGLES = ['front', 'side', 'back'];
const ANGLE_LABELS = { front: 'Front', side: 'Side', back: 'Back' };

// Builds one filled photo card (image + angle tag). No remove button on this page.
function buildPhotoCard(monday, angle) {
    const card = document.createElement('div');
    card.className = 'photo-card';

    const img = document.createElement('img');
    img.src = photoUrl(monday, angle);
    img.alt = ANGLE_LABELS[angle] + ' photo';
    card.appendChild(img);

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = ANGLE_LABELS[angle];
    card.appendChild(tag);

    return card;
}

// Builds one "+ Add <angle>" empty card, the same size/shape as a filled
// photo-card above (not a full-width ghost row) - clicking it opens the
// native file picker, same hidden-<input type="file">-triggered-by-click
// pattern already used by photos-page.js's old buildAngleBox(). onUploaded()
// re-renders the whole Check-in page once the upload finishes, so the new
// photo shows up and the Foto progress chip updates.
function buildAddAngleCard(monday, angle, onUploaded) {
    const card = document.createElement('div');
    card.className = 'photo-card add-angle-card';

    const plus = document.createElement('span');
    plus.className = 'add-angle-plus';
    plus.textContent = '+';
    card.appendChild(plus);

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = ANGLE_LABELS[angle];
    card.appendChild(tag);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    card.appendChild(fileInput);

    card.addEventListener('click', function () {
        fileInput.click();
    });

    fileInput.addEventListener('change', async function () {
        if (fileInput.files && fileInput.files[0]) {
            await uploadPhoto(monday, angle, fileInput.files[0]);
            onUploaded();
        }
    });

    return card;
}

// Builds the whole Photo section: always exactly 3 equal-size boxes side by
// side (Front/Side/Back), each either a filled photo or an "+ Add" card -
// never a lopsided mix of a fixed-width card next to a full-width ghost
// column, which is what happened before this always showed exactly 3 slots.
export function buildPhotoSection(monday, onUploaded) {
    const row = document.createElement('div');
    row.className = 'photo-row';

    for (let i = 0; i < ANGLES.length; i++) {
        const angle = ANGLES[i];
        if (hasPhoto(monday, angle)) {
            row.appendChild(buildPhotoCard(monday, angle));
        } else {
            row.appendChild(buildAddAngleCard(monday, angle, onUploaded));
        }
    }

    return row;
}
