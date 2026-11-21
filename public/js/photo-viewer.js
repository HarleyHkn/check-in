// Full-screen view of one photo, with its week and dates underneath. Opened by
// tapping a photo in the carousel or in Compare. Swipe, the arrow buttons or the
// arrow keys step to the previous/next week in the SAME angle (weeks without
// that angle are skipped). Tapping without dragging, the X or Escape closes it.

import { getWeekNumber } from './date-utils.js';
import { hasPhoto, photoUrl } from './photos-ui.js';

const ANGLE_LABELS = { front: 'Front', side: 'Side', back: 'Back' };
const SWIPE_THRESHOLD_PX = 50; // drag at least this far to change week
const TAP_SLOP_PX = 6;          // moved less than this = a tap, which closes

const viewer = document.getElementById('photoViewer');
const viewerImg = document.getElementById('photoViewerImg');
const prevButton = document.getElementById('photoViewerPrev');
const nextButton = document.getElementById('photoViewerNext');

let viewerWeeks = [];   // Monday dates, oldest first - the same list the caller shows
let viewerIndex = 0;    // which of viewerWeeks is on screen
let viewerAngle = 'front';

function weekRangeText(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '–' +
        sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function weeksWithAngle() {
    return viewerWeeks.filter(function (monday) { return hasPhoto(monday, viewerAngle); });
}

function showCurrentWeek() {
    const monday = viewerWeeks[viewerIndex];
    viewerImg.src = photoUrl(monday, viewerAngle);
    document.getElementById('photoViewerWeek').textContent = 'Week ' + getWeekNumber(monday);
    document.getElementById('photoViewerRange').textContent = weekRangeText(monday);

    const withAngle = weeksWithAngle();
    const position = withAngle.indexOf(monday) + 1;
    document.getElementById('photoViewerHint').textContent =
        ANGLE_LABELS[viewerAngle] + ' · ' + position + ' of ' + withAngle.length + ' · swipe to browse';
    prevButton.disabled = position === 1;
    nextButton.disabled = position === withAngle.length;
}

// weekMondays: oldest first. index: the week tapped. angle: the angle shown there.
export function openPhotoViewer(weekMondays, index, angle) {
    viewerWeeks = weekMondays;
    viewerIndex = index;
    viewerAngle = angle;
    showCurrentWeek();
    viewer.classList.add('open');
}

function closePhotoViewer() {
    viewer.classList.remove('open');
}

// step = -1 (older) or +1 (newer). Does nothing at either end.
function stepWeek(step) {
    for (let i = viewerIndex + step; i >= 0 && i < viewerWeeks.length; i += step) {
        if (hasPhoto(viewerWeeks[i], viewerAngle)) {
            viewerIndex = i;
            // Jump the new photo to the side it comes from, then let the CSS
            // transition slide it back to the middle.
            viewerImg.classList.add('dragging');
            viewerImg.style.transform = 'translateX(' + (step * 60) + 'px)';
            viewerImg.style.opacity = '0';
            showCurrentWeek();
            requestAnimationFrame(function () {
                viewerImg.classList.remove('dragging');
                viewerImg.style.transform = '';
                viewerImg.style.opacity = '';
            });
            return;
        }
    }
}

// Buttons: stopPropagation so the click doesn't also reach the viewer and close it.
prevButton.addEventListener('click', function (event) {
    event.stopPropagation();
    stepWeek(-1);
});
nextButton.addEventListener('click', function (event) {
    event.stopPropagation();
    stepWeek(+1);
});
document.getElementById('photoViewerClose').addEventListener('click', function (event) {
    event.stopPropagation();
    closePhotoViewer();
});

let dragStartX = null;
let dragged = false;

viewer.addEventListener('pointerdown', function (event) {
    if (event.target.closest('button')) {
        return; // buttons are clicks, not the start of a swipe
    }
    event.preventDefault(); // stops the browser's own "drag this image" gesture
    dragStartX = event.clientX;
    dragged = false;
    viewerImg.classList.add('dragging');
});

viewer.addEventListener('pointermove', function (event) {
    if (dragStartX === null) {
        return;
    }
    const dragX = event.clientX - dragStartX;
    if (Math.abs(dragX) > TAP_SLOP_PX) {
        dragged = true;
    }
    viewerImg.style.transform = 'translateX(' + dragX + 'px)';
});

function endDrag(event) {
    if (dragStartX === null) {
        return;
    }
    const dragX = event.clientX - dragStartX;
    dragStartX = null;
    viewerImg.classList.remove('dragging');
    viewerImg.style.transform = '';

    // Drag left = newer week, drag right = older week, like the carousel.
    if (dragX < -SWIPE_THRESHOLD_PX) {
        stepWeek(+1);
    } else if (dragX > SWIPE_THRESHOLD_PX) {
        stepWeek(-1);
    }
}
viewer.addEventListener('pointerup', endDrag);
viewer.addEventListener('pointercancel', endDrag);

viewer.addEventListener('click', function () {
    if (!dragged) {
        closePhotoViewer();
    }
});

document.addEventListener('keydown', function (event) {
    if (!viewer.classList.contains('open')) {
        return;
    }
    if (event.key === 'Escape') {
        closePhotoViewer();
    } else if (event.key === 'ArrowLeft') {
        stepWeek(-1);
    } else if (event.key === 'ArrowRight') {
        stepWeek(+1);
    }
});
