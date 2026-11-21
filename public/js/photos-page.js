// Photos page: a drag-to-browse 3D carousel of every week that has at least one photo,
// plus a "Compare first vs latest" toggle. Uploading a NEW week's photos now
// happens through Check-in (see checkin-photo.js) - this page is browsing/
// comparing history, not an upload surface, so (unlike the old Home/Weekly-
// era version) there's no "always show an empty slot to catch up" behavior
// here anymore.

import { getWeekNumber, parseDateKey } from './date-utils.js';
import { photoList, hasPhoto, photoUrl } from './photos-ui.js';
import { buildPhotoCarousel } from './photos-carousel.js';

const ANGLES = ['front', 'side', 'back'];
const ANGLE_LABELS = { front: 'Front', side: 'Side', back: 'Back' };

let compareOn = false;
let compareAngle = 'front';
let stopCurrentCarousel = null; // stops the previous carousel's animation loop before rebuilding it

// Every distinct week (Monday) that has at least one photo, oldest first -
// the carousel reads left-to-right as "further back" -> "most recent".
function getWeeksWithPhotos() {
    const seenKeys = {};
    for (let i = 0; i < photoList.length; i++) {
        seenKeys[photoList[i].date] = true;
    }

    const weekKeys = Object.keys(seenKeys);
    weekKeys.sort(); // "YYYY-MM-DD" strings sort correctly as plain text, oldest first
    return weekKeys.map(parseDateKey);
}

function renderCarousel() {
    if (stopCurrentCarousel !== null) {
        stopCurrentCarousel();
    }

    const weekMondays = getWeeksWithPhotos();
    const wrap = document.getElementById('carouselWrap');
    const cardLayer = document.getElementById('photoCardLayer');
    const hint = document.getElementById('carouselHint');

    stopCurrentCarousel = buildPhotoCarousel(wrap, cardLayer, hint, weekMondays, renderPhotosPage) || null;

    document.getElementById('compareToggleRow').style.display = weekMondays.length >= 2 ? 'flex' : 'none';
}

function renderCompare() {
    const weekMondays = getWeeksWithPhotos();
    const first = weekMondays[0]; // the very first photo week, to show the whole journey
    const current = weekMondays[weekMondays.length - 1];

    function fillCard(monday, imgId, rangeId) {
        let angleToShow = compareAngle;
        if (!hasPhoto(monday, angleToShow)) {
            angleToShow = ANGLES.find(function (angle) { return hasPhoto(monday, angle); });
        }

        document.getElementById(imgId).src = photoUrl(monday, angleToShow);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        document.getElementById(rangeId).textContent = 'Week ' + getWeekNumber(monday) + ' · ' +
            monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '–' +
            sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    fillCard(first, 'compareLastImg', 'compareLastRange');
    fillCard(current, 'compareCurrentImg', 'compareCurrentRange');

    const pillsWrap = document.getElementById('comparePills');
    pillsWrap.innerHTML = '';
    ANGLES.forEach(function (angle) {
        const pill = document.createElement('div');
        pill.className = 'angle-pill' + (compareAngle === angle ? ' active' : '');
        pill.textContent = ANGLE_LABELS[angle];
        pill.addEventListener('click', function () {
            compareAngle = angle;
            renderCompare();
        });
        pillsWrap.appendChild(pill);
    });
}

// Called by pages.js whenever the Photos tab is opened, and again after a
// photo is deleted from the carousel.
export function renderPhotosPage() {
    renderCarousel();
    if (compareOn) {
        renderCompare();
    }
}

document.getElementById('compareToggle').addEventListener('click', function () {
    compareOn = !compareOn;
    document.getElementById('compareSwitch').classList.toggle('on', compareOn);
    document.getElementById('carouselWrap').style.display = compareOn ? 'none' : 'flex';
    document.getElementById('carouselHint').style.display = compareOn ? 'none' : 'block';
    document.getElementById('compareWrap').classList.toggle('visible', compareOn);
    document.getElementById('photosViewTitle').textContent = compareOn ? 'Compare' : 'Photos';

    if (compareOn) {
        renderCompare();
    }
});
