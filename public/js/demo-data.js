// Fake sample data shown only while logged out, so the app looks lived-in
// instead of empty on first glance (e.g. for screenshots/demos). Every
// load*() function in the other *-ui.js files falls back to one of these
// generators instead of an empty array whenever the server says "not logged
// in" - see weights-ui.js, steps-ui.js, measurements-ui.js, photos-ui.js.
// Real users never see this: once they log in, their own fetch succeeds and
// overwrites it with their real (actually empty, for a new account) data.

import { formatDateKey, getMondayDate } from './date-utils.js';

// Turns an SVG string into a data: URL an <img> tag can use directly.
function svgToDataUrl(svgMarkup) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgMarkup);
}

// Shared pieces every silhouette below is built from - a 300x400 canvas (same
// 3:4 shape as the real photo cards, see .carousel-card img in photos.css), a dark
// background, and the theme's --accent-deep/--accent-outline colors (hard-coded,
// since CSS variables don't reach inside an <img>'s SVG).
const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' +
    '<rect width="300" height="400" fill="#20202c"/>';
const SVG_CLOSE = '</svg>';
const SILHOUETTE_STYLE = 'fill="#603030" stroke="#D05038" stroke-width="3"';

// Facing the camera head-on: symmetric head, two arms, two legs.
const DEMO_PHOTO_FRONT = svgToDataUrl(
    SVG_OPEN +
    '<circle cx="150" cy="95" r="38" ' + SILHOUETTE_STYLE + '/>' +                         // head
    '<rect x="95" y="140" width="110" height="120" rx="16" ' + SILHOUETTE_STYLE + '/>' +   // torso
    '<rect x="68" y="145" width="24" height="110" rx="12" ' + SILHOUETTE_STYLE + '/>' +    // left arm
    '<rect x="208" y="145" width="24" height="110" rx="12" ' + SILHOUETTE_STYLE + '/>' +   // right arm
    '<rect x="116" y="258" width="30" height="125" rx="12" ' + SILHOUETTE_STYLE + '/>' +   // left leg
    '<rect x="154" y="258" width="30" height="125" rx="12" ' + SILHOUETTE_STYLE + '/>' +   // right leg
    SVG_CLOSE
);

// Turned sideways: only one arm/leg visible, plus a small nose bump on the
// head so it reads as a profile instead of just a smaller front view.
const DEMO_PHOTO_SIDE = svgToDataUrl(
    SVG_OPEN +
    '<circle cx="150" cy="95" r="38" ' + SILHOUETTE_STYLE + '/>' +                         // head
    '<path d="M 186 100 L 202 108 L 186 118 Z" ' + SILHOUETTE_STYLE + '/>' +               // nose bump
    '<rect x="118" y="140" width="64" height="120" rx="16" ' + SILHOUETTE_STYLE + '/>' +   // torso (narrower, side-on)
    '<rect x="178" y="150" width="24" height="100" rx="12" ' + SILHOUETTE_STYLE + '/>' +   // the one visible arm
    '<rect x="128" y="258" width="44" height="125" rx="14" ' + SILHOUETTE_STYLE + '/>' +   // the one visible leg
    SVG_CLOSE
);

// Facing away: same symmetric shape as the front view, but no face, plus a
// hair cap on the head and a spine groove down the torso so it clearly reads
// as "from behind" rather than a duplicate of the front silhouette.
const DEMO_PHOTO_BACK = svgToDataUrl(
    SVG_OPEN +
    '<circle cx="150" cy="95" r="38" ' + SILHOUETTE_STYLE + '/>' +                         // head
    '<path d="M 112 85 A 38 38 0 0 1 188 85 L 188 70 A 38 30 0 0 0 112 70 Z" fill="rgba(208,80,56,0.6)"/>' + // hair cap
    '<rect x="95" y="140" width="110" height="120" rx="16" ' + SILHOUETTE_STYLE + '/>' +   // torso
    '<line x1="150" y1="145" x2="150" y2="250" stroke="rgba(208,80,56,0.6)" stroke-width="2"/>' + // spine groove
    '<rect x="68" y="145" width="24" height="110" rx="12" ' + SILHOUETTE_STYLE + '/>' +    // left arm
    '<rect x="208" y="145" width="24" height="110" rx="12" ' + SILHOUETTE_STYLE + '/>' +   // right arm
    '<rect x="116" y="258" width="30" height="125" rx="12" ' + SILHOUETTE_STYLE + '/>' +   // left leg
    '<rect x="154" y="258" width="30" height="125" rx="12" ' + SILHOUETTE_STYLE + '/>' +   // right leg
    SVG_CLOSE
);

// Picks the right silhouette for whichever angle a demo photo entry has.
export function demoPhotoForAngle(angle) {
    if (angle === 'front') {
        return DEMO_PHOTO_FRONT;
    }
    if (angle === 'side') {
        return DEMO_PHOTO_SIDE;
    }
    return DEMO_PHOTO_BACK;
}

// Builds a Date for "today minus N days" without touching any other Date.
function daysAgo(daysBack) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return date;
}

// A year of daily weight entries, trending gently downward with some
// realistic noise and a few skipped days (nobody logs in literally every day).
export function generateDemoWeightLog() {
    const log = [];
    const startWeight = 88;   // kg, a year ago
    const totalDrop = 6;      // kg "lost" over the year, for a believable progress look

    for (let daysBack = 364; daysBack >= 0; daysBack--) {
        if (Math.random() < 0.15) {
            continue; // skip this day, same as a real user sometimes missing a day
        }
        const progress = (364 - daysBack) / 364;    // 0 (a year ago) -> 1 (today)
        const noise = (Math.random() - 0.5) * 0.8;   // +/- 0.4 kg of random wobble
        const weight = startWeight - (progress * totalDrop) + noise;

        log.push([formatDateKey(daysAgo(daysBack)), Number(weight.toFixed(1))]);
    }
    return log;
}

// A year of daily step counts, trending gently upward (getting more active).
export function generateDemoStepsLog() {
    const log = [];
    const startSteps = 5500;
    const totalGain = 3000;

    for (let daysBack = 364; daysBack >= 0; daysBack--) {
        if (Math.random() < 0.15) {
            continue;
        }
        const progress = (364 - daysBack) / 364;
        const noise = (Math.random() - 0.5) * 1500;  // +/- 750 steps of wobble
        const steps = startSteps + (progress * totalGain) + noise;

        log.push([formatDateKey(daysAgo(daysBack)), Math.max(0, Math.round(steps))]);
    }
    return log;
}

// The same 7 base measurement types every real user gets auto-seeded with
// (see routes/measurement-types.js) - all marked active for the demo.
export function generateDemoMeasurementTypes() {
    const names = ['Chest', 'Left Arm', 'Right Arm', 'Waist', 'Bottom', 'Left Leg', 'Right Leg'];
    return names.map(function (name) {
        return { name: name, isActive: true };
    });
}

// A starting value (cm) and how much it shrinks over the year, per type -
// waist/bottom shrink the most, arms/legs barely change, for a believable look.
const MEASUREMENT_STARTING_POINTS = {
    'Chest': { start: 102, drop: 3 },
    'Left Arm': { start: 32, drop: 1 },
    'Right Arm': { start: 32, drop: 1 },
    'Waist': { start: 94, drop: 8 },
    'Bottom': { start: 104, drop: 5 },
    'Left Leg': { start: 56, drop: 2 },
    'Right Leg': { start: 56, drop: 2 }
};

// One value per week per type, for the last 52 weeks.
export function generateDemoMeasurementValues() {
    const values = [];
    const thisMonday = getMondayDate(new Date());

    for (let weeksBack = 51; weeksBack >= 0; weeksBack--) {
        const monday = new Date(thisMonday);
        monday.setDate(thisMonday.getDate() - weeksBack * 7);
        const dateKey = formatDateKey(monday);
        const progress = (51 - weeksBack) / 51;

        for (const typeName in MEASUREMENT_STARTING_POINTS) {
            const point = MEASUREMENT_STARTING_POINTS[typeName];
            const noise = (Math.random() - 0.5) * 0.6;
            const value = point.start - (progress * point.drop) + noise;
            values.push([dateKey, typeName, Number(value.toFixed(1))]);
        }
    }
    return values;
}

// Photo metadata for roughly every other week, 3 angles each. No real image
// bytes exist for these - each entry is marked `demo: true` so photoUrl()
// (in photos-ui.js) knows to show DEMO_PHOTO_PLACEHOLDER instead of trying to
// fetch bytes from the server (which would 401 anyway, since this only runs
// while logged out).
export function generateDemoPhotoList() {
    const photos = [];
    const thisMonday = getMondayDate(new Date());
    const angles = ['front', 'side', 'back'];

    for (let weeksBack = 51; weeksBack >= 0; weeksBack -= 2) {
        const monday = new Date(thisMonday);
        monday.setDate(thisMonday.getDate() - weeksBack * 7);
        const dateKey = formatDateKey(monday);

        for (let i = 0; i < angles.length; i++) {
            photos.push({ date: dateKey, angle: angles[i], demo: true });
        }
    }
    return photos;
}
