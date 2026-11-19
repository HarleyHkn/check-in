// The swipeable week-pager used by the Check-in page when opened from
// Calendar (not the FAB) - drag left/right to reveal the previous/next
// week's panel, same direct-manipulation carousel feel as the Photos page,
// with a visible gap between panels so it's clear you're dragging between
// pages. Side panels are lightweight PREVIEWS (header + weight + steps only,
// dimmed, not interactive) - landing on one triggers onNavigate(), which does
// a full fresh render of that week as the live, editable form. These preview
// panels are disposable scaffolding for the drag gesture, not real editors.

import { buildHeader, buildWeightSection, buildStepsSection } from './checkin-sections.js';
import { getMondayDate } from './date-utils.js';

const PANEL_GAP = 16; // px - must match .checkin-week-track's gap in checkin.css
const SWIPE_COMMIT_RATIO = 0.22; // drag past this fraction of a panel's width to commit to it
const EASE_FACTOR = 0.14; // same "catch-up" easing photos-carousel.js/graph-chart.js use - lower = more lag
const SETTLE_THRESHOLD_PX = 0.5; // how close displayOffset must get to a committed targetOffset before swapping to the real page

function buildPreviewPanel(monday) {
    const panel = document.createElement('div');
    panel.className = 'checkin-week-panel is-preview';
    panel.appendChild(buildHeader(monday));
    panel.appendChild(buildWeightSection(monday));
    panel.appendChild(buildStepsSection(monday));

    // buildWeightSection()/buildStepsSection() hardcode id="checkinWeightInput"/
    // "checkinStepsInput" (the live panel needs that, performSave() reads by
    // id) - a preview panel is disposable and never saved from, but leaving
    // those ids in would create duplicate ids in the DOM, and
    // document.getElementById() could then grab THIS throwaway input instead
    // of the real one. Strip them; pointer-events:none (see checkin.css)
    // already keeps these inputs from being typed into anyway.
    const weightInput = panel.querySelector('#checkinWeightInput');
    if (weightInput !== null) {
        weightInput.removeAttribute('id');
        weightInput.disabled = true;
    }
    const stepsInput = panel.querySelector('#checkinStepsInput');
    if (stepsInput !== null) {
        stepsInput.removeAttribute('id');
        stepsInput.disabled = true;
    }

    return panel;
}

// containerEl: the fixed-width viewport (#checkinBody, overflow:hidden).
// currentPanelEl: the already-built, fully-interactive panel for currentMonday
// (checkin-page.js builds this one - it has the real inputs/save logic).
// onNavigate(newMonday): called once a drag commits past the threshold.
export function buildWeekPager(containerEl, currentPanelEl, currentMonday, onNavigate) {
    containerEl.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'checkin-week-track';

    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const canGoNext = nextMonday <= getMondayDate(); // never swipe into a week that hasn't happened yet

    track.appendChild(buildPreviewPanel(prevMonday));
    currentPanelEl.classList.add('checkin-week-panel');
    track.appendChild(currentPanelEl);
    if (canGoNext) {
        track.appendChild(buildPreviewPanel(nextMonday));
    }

    containerEl.appendChild(track);

    function stepPx() {
        return containerEl.getBoundingClientRect().width + PANEL_GAP;
    }

    // The track always starts with [prev, current, next?] in that order, so
    // shifting left by exactly one step brings the CURRENT (2nd) panel to x=0.
    const baseOffset = -stepPx();

    // Same displayOffset/targetOffset + requestAnimationFrame pattern as
    // photos-carousel.js (displayPos/targetPos) and graph-chart.js
    // (displayViewStart/viewStart): targetOffset follows the pointer directly
    // while dragging, and displayOffset eases toward it every frame, which is
    // what gives the drag its "catch-up" lag feel instead of a stepped/jerky
    // 1:1 jump. Writing track.style.transform straight from raw pointermove
    // deltas (the old approach) skipped this per-frame easing entirely - that
    // was the actual cause of the choppy feel reported after this file first
    // shipped, not the panel/track structure itself.
    let targetOffset = baseOffset;
    let displayOffset = baseOffset;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // Set once a drag commits past the threshold (see endDrag below) - holds
    // which week to navigate to, but navigation doesn't fire immediately.
    // Instead targetOffset is set to the FULL slide-out distance and
    // animationLoop() keeps easing displayOffset toward it like any other
    // drag; only once displayOffset actually arrives (within
    // SETTLE_THRESHOLD_PX) does onNavigate() fire. Calling onNavigate()
    // straight from endDrag() (the first version of this fix) jumped straight
    // from "mid-drag position" to the new week's freshly-rendered page,
    // skipping the rest of the slide - that abrupt cut was the actual cause
    // of the release feeling jerky, not the drag itself.
    let pendingNavigateMonday = null;

    track.style.transform = 'translateX(' + displayOffset + 'px)';

    let stopped = false;
    function animationLoop() {
        if (stopped) {
            return; // this pager got rebuilt (re-render) - stop its old loop
        }
        displayOffset += (targetOffset - displayOffset) * EASE_FACTOR;
        track.style.transform = 'translateX(' + displayOffset + 'px)';

        if (pendingNavigateMonday !== null && Math.abs(targetOffset - displayOffset) < SETTLE_THRESHOLD_PX) {
            stopped = true; // the caller is about to rebuild this whole pager for the new week
            const monday = pendingNavigateMonday;
            pendingNavigateMonday = null;
            onNavigate(monday);
            return;
        }

        requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);

    containerEl.addEventListener('pointerdown', function (event) {
        // Don't hijack taps into inputs/buttons/the "+ Add" photo cards.
        if (event.target.closest('input, button, select, label, .add-angle-card')) {
            return;
        }
        // Without this, a real mouse/touch drag starts the browser's own
        // text-selection gesture alongside this custom one - same fix
        // photos-carousel.js/graph-chart.js already needed for the same reason.
        event.preventDefault();

        isDragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        pendingNavigateMonday = null; // grabbing again mid-slide cancels any commit still easing into place
        containerEl.setPointerCapture(event.pointerId);
    });

    containerEl.addEventListener('pointermove', function (event) {
        if (!isDragging) {
            return;
        }
        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;
        if (Math.abs(dy) > Math.abs(dx)) {
            return; // this is a vertical scroll, not a week-swipe
        }
        event.preventDefault();

        // Dragging past the last real week into empty "next" space resists
        // instead of sliding, the same way the Graph chart can't pan into
        // the future - there's nothing there to reveal.
        const clampedDx = (dx < 0 && !canGoNext) ? 0 : dx;
        targetOffset = baseOffset + clampedDx;
    });

    function endDrag(event) {
        if (!isDragging) {
            return;
        }
        isDragging = false;
        const dx = event.clientX - dragStartX;
        const commitDistance = stepPx() * SWIPE_COMMIT_RATIO;

        if (dx > commitDistance) {
            // Slide the rest of the way to fully reveal the prev panel first -
            // onNavigate() fires from inside animationLoop() once it arrives.
            targetOffset = baseOffset + stepPx();
            pendingNavigateMonday = prevMonday;
            return;
        }
        if (dx < -commitDistance && canGoNext) {
            targetOffset = baseOffset - stepPx();
            pendingNavigateMonday = nextMonday;
            return;
        }

        targetOffset = baseOffset; // didn't commit - animationLoop() eases back to center on its own
    }
    containerEl.addEventListener('pointerup', endDrag);
    containerEl.addEventListener('pointercancel', endDrag);

    // Called by checkin-page.js right before it rebuilds the pager from
    // scratch, so the old loop doesn't keep running forever alongside the new
    // pager's own loop (same convention as photos-carousel.js's stopCarousel).
    return function stopPager() {
        stopped = true;
    };
}
