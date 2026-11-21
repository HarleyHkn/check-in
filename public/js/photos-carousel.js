// The Photos page's 3D "coverflow" carousel widget: drag a card left/right to spin
// through weeks. Split out of photos-page.js since the drag/animation math is
// a self-contained widget, not page-level logic (same reason hero-chart.js is its own file).
//
// Cards are built ONCE and only ever moved/restyled afterward, never
// recreated - recreating them every frame causes a stutter on release,
// since a brand new element has no
// "previous frame" for the browser to transition from.

import { getWeekNumber } from './date-utils.js';
import { hasPhoto, photoUrl, deletePhoto } from './photos-ui.js';
import { openPhotoViewer } from './photo-viewer.js';

const ANGLES = ['front', 'side', 'back'];
const ANGLE_LABELS = { front: 'Front', side: 'Side', back: 'Back' };

const CARD_SPACING = 92;   // px of drag that equals moving one whole card
const EASE_FACTOR = 0.14;  // how much of the remaining distance to close each frame - lower = more lag

// weekMondays: Date objects, oldest first (the last one is "current"/latest).
// onPhotoDeleted() is called after a delete, so the caller can re-render
// everything (the deleted week may now have fewer angles, or none at all).
export function buildPhotoCarousel(wrapEl, cardLayerEl, hintEl, weekMondays, onPhotoDeleted) {
    cardLayerEl.innerHTML = '';

    if (weekMondays.length === 0) {
        hintEl.textContent = 'No photos yet - add some from Check-in.';
        return;
    }

    const cardAngle = weekMondays.map(function () { return 'front'; }); // each card's own currently-shown angle
    let current = weekMondays.length - 1; // start on the latest week
    let targetPos = current;
    let displayPos = current;
    let isDragging = false;

    const cardElements = weekMondays.map(function (monday, i) {
        const card = document.createElement('div');
        card.className = 'carousel-card';

        const img = document.createElement('img');
        card.appendChild(img);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'carousel-remove-button';
        removeButton.title = 'Delete this photo';
        removeButton.textContent = '✕';
        removeButton.addEventListener('click', async function (event) {
            event.stopPropagation(); // don't start a drag from this click
            const angle = cardAngle[i];
            if (confirm('Delete this ' + ANGLE_LABELS[angle].toLowerCase() + ' photo?')) {
                await deletePhoto(monday, angle);
                onPhotoDeleted();
            }
        });
        card.appendChild(removeButton);

        const foot = document.createElement('div');
        foot.className = 'card-foot';

        const wk = document.createElement('div');
        wk.className = 'wk';
        wk.textContent = 'Week ' + getWeekNumber(monday);
        foot.appendChild(wk);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const range = document.createElement('div');
        range.className = 'range';
        range.textContent = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
            '–' + sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        foot.appendChild(range);

        const pills = document.createElement('div');
        pills.className = 'angle-pills';
        ANGLES.forEach(function (angle) {
            const pill = document.createElement('div');
            const available = hasPhoto(monday, angle);
            pill.className = 'angle-pill' + (available ? '' : ' unavailable');
            pill.textContent = ANGLE_LABELS[angle];
            if (available) {
                pill.addEventListener('click', function (event) {
                    event.stopPropagation();
                    cardAngle[i] = angle;
                    updateCardStyles(displayPos);
                });
            }
            pills.appendChild(pill);
        });
        foot.appendChild(pills);
        card.appendChild(foot);

        // Start on whichever angle this week actually has, not always "front".
        for (let a = 0; a < ANGLES.length; a++) {
            if (hasPhoto(monday, ANGLES[a])) {
                cardAngle[i] = ANGLES[a];
                break;
            }
        }

        cardLayerEl.appendChild(card);
        return { root: card, img: img, pills: pills.children };
    });

    // Just updates transform/opacity/image on the existing elements above -
    // called every animation frame, never rebuilds anything.
    function updateCardStyles(visualPos) {
        weekMondays.forEach(function (monday, i) {
            const offset = i - visualPos;
            const el = cardElements[i];

            if (Math.abs(offset) > 3) {
                el.root.style.opacity = 0;
                return;
            }

            const rotateY = offset * 32;             // degrees around the "cylinder"
            const translateZ = -Math.abs(offset) * 90;
            const translateX = offset * CARD_SPACING;
            const scale = 1 - Math.min(Math.abs(offset), 1) * 0.18;
            const opacity = Math.max(0, 1 - Math.abs(offset) * 0.3);

            el.root.style.transform = 'translateX(' + translateX + 'px) translateZ(' + translateZ + 'px) rotateY(' + (-rotateY) + 'deg) scale(' + scale + ')';
            el.root.style.opacity = opacity;
            el.root.style.zIndex = 10 - Math.round(Math.abs(offset));

            el.img.src = photoUrl(monday, cardAngle[i]);
            for (let p = 0; p < el.pills.length; p++) {
                el.pills[p].classList.toggle('active', cardAngle[i] === ANGLES[p]);
            }
        });

        hintEl.textContent = 'Week ' + (current + 1) + ' of ' + weekMondays.length + '  ·  drag to browse';
    }
    updateCardStyles(displayPos);

    // The animation heartbeat: every frame, displayPos closes part of the gap
    // to targetPos. While dragging, targetPos follows the pointer directly, so
    // displayPos trails slightly behind it - that trailing IS the "catch-up"
    // delay. Once released, targetPos snaps to a whole card and displayPos
    // eases smoothly the rest of the way.
    let stopped = false;
    function animationLoop() {
        if (stopped) {
            return; // this carousel got rebuilt (re-render) - stop its old loop
        }
        displayPos += (targetPos - displayPos) * EASE_FACTOR;
        updateCardStyles(displayPos);
        requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);

    let dragStartX = null;

    wrapEl.addEventListener('pointerdown', function (event) {
        // Without this, a real mouse/touch drag starts the browser's own
        // text-selection (or, over an <img>, its native "drag the image")
        // gesture instead of - or alongside - this custom one, which is why
        // dragging looked like it did nothing: the pointermove handler below
        // was firing, just masked by a blue text-selection highlight.
        event.preventDefault();

        isDragging = true;
        dragStartX = event.clientX;
        wrapEl.setPointerCapture(event.pointerId);
        wrapEl.classList.add('dragging');
    });

    wrapEl.addEventListener('pointermove', function (event) {
        if (!isDragging) {
            return;
        }
        const dragOffsetPx = event.clientX - dragStartX;
        targetPos = Math.max(0, Math.min(weekMondays.length - 1, current - dragOffsetPx / CARD_SPACING));
    });

    function endDrag(event) {
        if (!isDragging) {
            return;
        }
        isDragging = false;

        // A press that barely moved is a tap, not a drag - open that photo big.
        // Pointer capture sends every event to wrapEl, so look up what was under the finger.
        if (event.type === 'pointerup' && Math.abs(event.clientX - dragStartX) < 6) {
            const tapped = document.elementFromPoint(event.clientX, event.clientY);
            if (tapped && tapped.tagName === 'IMG') {
                const tappedIndex = cardElements.findIndex(function (el) { return el.root.contains(tapped); });
                openPhotoViewer(weekMondays, tappedIndex, cardAngle[tappedIndex]);
            }
        }
        wrapEl.classList.remove('dragging');
        current = Math.max(0, Math.min(weekMondays.length - 1, Math.round(targetPos)));
        targetPos = current; // animationLoop() eases displayPos the rest of the way on its own
    }
    wrapEl.addEventListener('pointerup', endDrag);
    wrapEl.addEventListener('pointercancel', endDrag);

    // Called by photos-page.js right before it rebuilds the carousel from
    // scratch (re-render after a delete, or leaving the page) - without this,
    // the old loop would keep calling requestAnimationFrame forever, piling up
    // alongside the new carousel's own loop.
    return function stopCarousel() {
        stopped = true;
    };
}
