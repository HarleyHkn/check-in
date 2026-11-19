// The Graph page's pan-to-scroll trend chart widget: drag the chart left/right to pan through
// weeks, with the current/latest week resting in the CENTER of the visible
// window (the right half stays blank - there's no future data yet, so you
// can only pan backward from there). Only one dot is ever marked - whichever
// week is the current headline number.
//
// Built once per page load (see graph-page.js), then only re-drawn via
// setData() when the Weight/Steps toggle switches - never torn down and
// rebuilt, so the drag listeners and animation loop stay the same ones the
// whole time, same reasoning as photos-carousel.js.

const svgNS = 'http://www.w3.org/2000/svg';

// Reads the actual coral color values from CSS instead of hardcoding hex
// here, so this file never falls out of sync with coral-theme.css's :root.
// Set directly as SVG presentation attributes (not CSS classes) - gradient
// <stop> color/opacity in particular is unreliable to style purely via an
// external stylesheet class, which is what was rendering the fill as plain
// black (stop-color's own default) instead of picking up the coral tint.
function readCoralColor(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

const CHART_W = 320, CHART_H = 160, PAD_Y = 16;
const VISIBLE_COUNT = 7;
const CENTER_SLOT = Math.floor((VISIBLE_COUNT - 1) / 2); // the middle slot of the visible window
const WEEK_SPACING = CHART_W / (VISIBLE_COUNT - 1);
const EASE_FACTOR = 0.16;

// Catmull-Rom-ish smoothing: curves through each point via control points
// derived from its neighbors, instead of drawing sharp straight-line corners.
function smoothPath(points) {
    let d = 'M ' + points[0].x + ',' + points[0].y;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C ' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2.x + ',' + p2.y;
    }
    return d;
}

// Builds the whole chart card's DOM inside containerEl once, wires up drag
// panning + the animation loop, and returns { setData, stop }. weeksData
// passed to setData is an array of {label, year, value}, oldest first, with
// every gap already filled in (see graph-page.js) - null means no data at all.
export function buildTrendPanChart(containerEl) {
    containerEl.innerHTML = '';

    const yearTag = document.createElement('div');
    yearTag.className = 'year-tag';
    containerEl.appendChild(yearTag);

    const headline = document.createElement('div');
    headline.className = 'chart-headline';
    headline.innerHTML =
        '<div><span class="big"></span><span class="unit"></span></div>' +
        '<div class="wk-tag"></div>';
    containerEl.appendChild(headline);
    const headlineValueEl = headline.querySelector('.big');
    const headlineUnitEl = headline.querySelector('.unit');
    const headlineWeekEl = headline.querySelector('.wk-tag');

    const emptyText = document.createElement('p');
    emptyText.className = 'graph-empty-text';
    emptyText.textContent = 'No data yet - check in a few weeks to see a trend.';
    emptyText.style.display = 'none';
    containerEl.appendChild(emptyText);

    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-wrap';
    containerEl.appendChild(chartWrap);

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + CHART_W + ' ' + CHART_H);
    svg.setAttribute('preserveAspectRatio', 'none');
    chartWrap.appendChild(svg);

    const accentColor = readCoralColor('--accent');
    const accentLightColor = readCoralColor('--accent-light');

    const gradient = document.createElementNS(svgNS, 'linearGradient');
    gradient.setAttribute('id', 'graphChartFade');
    gradient.setAttribute('x1', '0'); gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0'); gradient.setAttribute('y2', '1');
    const topStop = document.createElementNS(svgNS, 'stop');
    topStop.setAttribute('offset', '0%');
    topStop.setAttribute('stop-color', accentColor);
    topStop.setAttribute('stop-opacity', '0.45');
    const bottomStop = document.createElementNS(svgNS, 'stop');
    bottomStop.setAttribute('offset', '100%');
    bottomStop.setAttribute('stop-color', accentColor);
    bottomStop.setAttribute('stop-opacity', '0');
    gradient.appendChild(topStop);
    gradient.appendChild(bottomStop);
    const defs = document.createElementNS(svgNS, 'defs');
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const areaPath = document.createElementNS(svgNS, 'path');
    areaPath.setAttribute('fill', 'url(#graphChartFade)');
    svg.appendChild(areaPath);

    const linePath = document.createElementNS(svgNS, 'path');
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', accentLightColor);
    linePath.setAttribute('stroke-width', '2.5');
    svg.appendChild(linePath);

    // Just ONE persistent dot - it marks whichever week is the current
    // headline number, nothing else on the curve gets a marker.
    const activeDot = document.createElementNS(svgNS, 'circle');
    activeDot.setAttribute('r', '5');
    activeDot.setAttribute('fill', accentLightColor);
    svg.appendChild(activeDot);

    const xLabelsEl = document.createElement('div');
    xLabelsEl.className = 'x-labels';
    containerEl.appendChild(xLabelsEl);

    // Persistent x-axis label slots - always exactly VISIBLE_COUNT of them,
    // their TEXT changes as you pan rather than the elements themselves moving.
    const labelElements = [];
    for (let s = 0; s < VISIBLE_COUNT; s++) {
        const span = document.createElement('span');
        xLabelsEl.appendChild(span);
        labelElements.push(span);
    }

    let weeksData = null;
    let unit = '';
    let formatValue = function (v) { return String(v); };

    function clampViewStart(v) {
        if (weeksData === null) {
            return 0;
        }
        const maxViewStart = (weeksData.length - 1) - CENTER_SLOT;
        return Math.max(0, Math.min(maxViewStart, v));
    }

    let viewStart = 0;         // target: where panning wants to be (a whole week once released)
    let displayViewStart = 0;  // eased value that actually gets drawn - chases viewStart every frame
    let isDragging = false;
    let dragStartX = 0;
    let dragStartViewStart = 0;

    function yFor(value, min, range) {
        return PAD_Y + (1 - (value - min) / range) * (CHART_H - PAD_Y * 2);
    }

    // Draws everything for the current displayViewStart (can be fractional
    // while panning) - called every animation frame.
    function draw() {
        if (weeksData === null) {
            return;
        }

        const values = weeksData.map(function (w) { return w.value; });
        const min = Math.min.apply(null, values);
        const max = Math.max.apply(null, values);
        const range = (max - min) || 1;

        const points = values.map(function (v, i) {
            return { x: (i - displayViewStart) * WEEK_SPACING, y: yFor(v, min, range) };
        });

        const linedPath = smoothPath(points);
        linePath.setAttribute('d', linedPath);
        areaPath.setAttribute('d', linedPath + ' L ' + points[points.length - 1].x + ',' + CHART_H + ' L ' + points[0].x + ',' + CHART_H + ' Z');

        // the week currently sitting at the CENTER of the visible window is
        // the one the headline number reflects
        const headlineIndex = Math.max(0, Math.min(weeksData.length - 1, Math.round(displayViewStart + CENTER_SLOT)));

        activeDot.setAttribute('cx', points[headlineIndex].x);
        activeDot.setAttribute('cy', points[headlineIndex].y);

        for (let s = 0; s < VISIBLE_COUNT; s++) {
            const idx = Math.round(displayViewStart) + s;
            const label = labelElements[s];
            if (idx >= 0 && idx < weeksData.length) {
                label.textContent = weeksData[idx].label;
                label.classList.toggle('active', idx === headlineIndex);
            } else {
                label.textContent = '';
            }
        }

        headlineValueEl.textContent = formatValue(values[headlineIndex]);
        headlineUnitEl.textContent = unit;
        headlineWeekEl.textContent = weeksData[headlineIndex].label;
        yearTag.textContent = weeksData[headlineIndex].year;
    }

    let stopped = false;
    function animationLoop() {
        if (stopped) {
            return;
        }
        displayViewStart += (viewStart - displayViewStart) * EASE_FACTOR;
        draw();
        requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);

    chartWrap.addEventListener('pointerdown', function (event) {
        if (weeksData === null) {
            return;
        }
        // Without this, a real mouse/touch drag starts the browser's own
        // text-selection gesture instead of - or alongside - this custom one.
        event.preventDefault();

        isDragging = true;
        chartWrap.classList.add('dragging');
        dragStartX = event.clientX;
        dragStartViewStart = viewStart;
        chartWrap.setPointerCapture(event.pointerId);
    });

    chartWrap.addEventListener('pointermove', function (event) {
        if (!isDragging) {
            return;
        }
        const dragOffsetPx = event.clientX - dragStartX;
        // direct manipulation: the curve moves WITH the finger, so dragging
        // right slides the window left (reveals older weeks), like dragging a
        // strip of paper.
        viewStart = clampViewStart(dragStartViewStart - dragOffsetPx / WEEK_SPACING);
    });

    function endDrag() {
        if (!isDragging) {
            return;
        }
        isDragging = false;
        chartWrap.classList.remove('dragging');
        viewStart = clampViewStart(Math.round(viewStart)); // settle on a whole week boundary
    }
    chartWrap.addEventListener('pointerup', endDrag);
    chartWrap.addEventListener('pointercancel', endDrag);

    // Called by graph-page.js on first render and every time the Weight/Steps
    // toggle switches - redraws with new data without rebuilding any of the
    // DOM or listeners above.
    function setData(newWeeksData, newUnit, newFormatValue) {
        weeksData = newWeeksData;
        unit = newUnit;
        formatValue = newFormatValue;

        const hasData = weeksData !== null;
        chartWrap.style.display = hasData ? 'block' : 'none';
        xLabelsEl.style.display = hasData ? 'flex' : 'none';
        headline.style.display = hasData ? 'flex' : 'none';
        yearTag.style.display = hasData ? 'block' : 'none';
        emptyText.style.display = hasData ? 'none' : 'block';

        if (!hasData) {
            return;
        }

        // start with the latest week centered
        viewStart = clampViewStart(weeksData.length - 1 - CENTER_SLOT);
        displayViewStart = viewStart;
    }

    return {
        setData: setData,
        stop: function () { stopped = true; }
    };
}
