// Photos data layer. Mirrors measurements-ui.js/steps-ui.js, but photoList only
// holds metadata (which week+angle have a photo) - the actual image bytes are
// fetched one at a time straight into <img> tags via photoUrl(), never loaded
// into a JS array.

import { toDateKey } from './date-utils.js';

export let photoList = [];   // [{date, angle}, ...] - metadata only, no image bytes

// Fetches this user's photo metadata list from the server.
export async function loadPhotoList() {
    const response = await fetch('/api/photos');
    if (!response.ok) {
        photoList = [];
        return;
    }
    const rows = await response.json();
    photoList = rows.map(function (row) {
        return { date: row.entry_date, angle: row.angle };
    });
}

// Called by auth-ui.js's logout() - see weights-ui.js's resetWeightLog for why
// this small function exists instead of the caller just reassigning photoList.
export function resetPhotoList() {
    photoList = [];
}

// True if a photo exists for this exact date+angle.
export function hasPhoto(date, angle) {
    const dateKey = toDateKey(date);
    for (let i = 0; i < photoList.length; i++) {
        if (photoList[i].date === dateKey && photoList[i].angle === angle) {
            return true;
        }
    }
    return false;
}

// True if this week has a photo for ANY angle - used by the calendar to light up
// a week's button, which doesn't care which angle(s), just whether photos exist.
export function weekHasPhoto(date) {
    const dateKey = toDateKey(date);
    for (let i = 0; i < photoList.length; i++) {
        if (photoList[i].date === dateKey) {
            return true;
        }
    }
    return false;
}

// The URL an <img> tag can use directly to display this photo.
export function photoUrl(date, angle) {
    return '/api/photos/' + toDateKey(date) + '/' + angle;
}

// Uploads (or replaces) a photo, then updates the local metadata list too.
export async function uploadPhoto(date, angle, file) {
    const dateKey = toDateKey(date);

    const formData = new FormData();
    formData.append('date', dateKey);
    formData.append('angle', angle);
    formData.append('photo', file);

    const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData // no Content-Type header here - the browser sets the multipart boundary itself
    });

    if (!response.ok) {
        return false;
    }

    if (!hasPhoto(dateKey, angle)) {
        photoList.push({ date: dateKey, angle: angle });
    }
    return true;
}

// Deletes a photo, then updates the local metadata list too.
export async function deletePhoto(date, angle) {
    const dateKey = toDateKey(date);

    const response = await fetch('/api/photos/' + dateKey + '/' + angle, {
        method: 'DELETE'
    });

    if (!response.ok) {
        return false;
    }

    for (let i = 0; i < photoList.length; i++) {
        if (photoList[i].date === dateKey && photoList[i].angle === angle) {
            photoList.splice(i, 1);
            break;
        }
    }
    return true;
}
