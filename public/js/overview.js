// Overview page: the
// hero card shows avg weight for the most recent check-in + a delta vs the
// previous one, the secondary row shows avg steps (+ delta) and a streak,
// and the measurements section shows a start-vs-now row per active type.

import { getMondayDate, getWeekNumber } from './date-utils.js';
import { weekAverage } from './weights-ui.js';
import { stepsWeekAverage } from './steps-ui.js';
import { measurementTypes, getMeasurementStartAndNow } from './measurements-ui.js';
import { buildHeroChart } from './hero-chart.js';

function hasWeightData(monday) { return weekAverage(monday) !== 0; }
function hasStepsData(monday) { return stepsWeekAverage(monday) !== 0; }
function hasAnyData(monday) { return hasWeightData(monday) || hasStepsData(monday); }

// Walks backward one week at a time from the current real week, collecting
// every past Monday (newest first) where hasDataFn() finds something - up to
// `limit` of them, giving up after `maxWeeksBack` weeks so a brand new
// account with zero data doesn't loop forever.
function findRecentDataWeeks(hasDataFn, limit, maxWeeksBack) {
    const results = [];
    const monday = getMondayDate();

    for (let i = 0; i <= maxWeeksBack && results.length < limit; i++) {
        if (hasDataFn(monday)) {
            results.push(new Date(monday));
        }
        monday.setDate(monday.getDate() - 7);
    }

    return results;
}

function renderHeroWeight() {
    const recentMondays = findRecentDataWeeks(hasWeightData, 8, 52);
    const valueEl = document.getElementById('overviewWeightValue');
    const deltaEl = document.getElementById('overviewWeightDelta');
    const chartContainer = document.getElementById('overviewHeroChart');

    if (recentMondays.length === 0) {
        valueEl.textContent = 'No data';
        deltaEl.style.display = 'none';
        chartContainer.innerHTML = '';
        return;
    }

    const latest = Number(weekAverage(recentMondays[0]));
    valueEl.innerHTML = latest + '<span class="hero-unit">kg</span>';

    if (recentMondays.length >= 2) {
        const previous = Number(weekAverage(recentMondays[1]));
        const diff = Math.round((latest - previous) * 10) / 10;
        deltaEl.style.display = 'inline-block';
        deltaEl.textContent = (diff <= 0 ? '↓ ' : '↑ ') + Math.abs(diff) + ' kg since last check-in';
    } else {
        deltaEl.style.display = 'none';
    }

    const chartValues = recentMondays.map(function (monday) {
        return Number(weekAverage(monday));
    }).reverse(); // oldest -> newest, left to right
    buildHeroChart(chartContainer, chartValues);
}

function renderSteps() {
    const recentMondays = findRecentDataWeeks(hasStepsData, 2, 52);
    const valueEl = document.getElementById('overviewStepsValue');
    const deltaEl = document.getElementById('overviewStepsDelta');

    if (recentMondays.length === 0) {
        valueEl.textContent = 'No data';
        deltaEl.style.display = 'none';
        return;
    }

    const latest = stepsWeekAverage(recentMondays[0]);
    valueEl.textContent = latest;

    if (recentMondays.length >= 2) {
        const previous = stepsWeekAverage(recentMondays[1]);
        const diff = latest - previous;
        deltaEl.style.display = 'inline-block';
        deltaEl.textContent = (diff >= 0 ? '↑ ' : '↓ ') + Math.abs(diff) + ' vs last week';
    } else {
        deltaEl.style.display = 'none';
    }
}

function renderStreak() {
    const monday = getMondayDate();

    // This week might not be checked in yet - start counting from last week
    // instead of resetting the streak to 0 just because today hasn't happened.
    if (!hasAnyData(monday)) {
        monday.setDate(monday.getDate() - 7);
    }

    let streak = 0;
    while (hasAnyData(monday) && streak < 520) { // 520 weeks (~10 years) is plenty of a safety cap
        streak++;
        monday.setDate(monday.getDate() - 7);
    }

    document.getElementById('overviewStreakValue').textContent = streak;
}

// Start is always a fixed center point (CENTER) on the track; Now moves away
// from it by a distance proportional to how many cm changed, so a bigger
// change visibly means a longer line.
const MEASURE_CENTER = 50;
const MEASURE_HALF_WIDTH = 38; // % each direction - leaves room for the dots' own radius at the edge
const MEASURE_MAX_CM = 8;      // cm change that reaches the full line
const MEASURE_MIN_FLOOR_PCT = 5; // minimum visible movement for ANY nonzero change, so a tiny change isn't a literal 0px dot

// 0 (no change) -> 1 (reached/passed MEASURE_MAX_CM). Both the dot's position
// (measureNowPos below) and its color (measureHeatColor below) are driven by
// this same number, so "near the edge of the line" and "glowing more red"
// always agree with each other.
//
// Two earlier versions tried to "boost" small changes with a curved scale
// (first a hard per-row cap, then a sqrt-smoothed hyperbolic curve) - both
// ended up compressing the MIDDLE/HIGH end instead, where it mattered more:
// an 8cm change and a 5cm change (or even 1.8 vs 2.1cm) started looking
// almost identical. This version is plain linear with no curve at all -
// `Math.max(floor, ...)` only touches values that would otherwise round down
// to an invisible sliver, it doesn't reshape the rest of the scale.
function measureMagnitudeFraction(diff) {
    const absDiff = Math.abs(diff);
    if (absDiff === 0) {
        return 0;
    }
    const linearPct = Math.min(absDiff / MEASURE_MAX_CM, 1) * 100;
    return Math.max(MEASURE_MIN_FLOOR_PCT, linearPct) / 100;
}

function measureNowPos(diff, fraction) {
    const offset = fraction * MEASURE_HALF_WIDTH;
    return MEASURE_CENTER + (diff >= 0 ? offset : -offset);
}

// Interpolates the "Now" dot's color from the normal accent-light toward a
// hot red as fraction climbs toward 1, so a dot sitting near/at the edge of
// the line visually reads as "this one moved a lot," not just as a longer
// line in the same color. Returns "r, g, b" (no rgb()/rgba() wrapper) so the
// caller can plug it into either depending on whether it needs an alpha.
function measureHeatColor(fraction) {
    const from = [252, 140, 92]; // --accent-light
    const to = [255, 59, 48];    // a hot/alert red
    const r = Math.round(from[0] + (to[0] - from[0]) * fraction);
    const g = Math.round(from[1] + (to[1] - from[1]) * fraction);
    const b = Math.round(from[2] + (to[2] - from[2]) * fraction);
    return r + ', ' + g + ', ' + b;
}

function buildMeasureRow(name, start, now) {
    const diff = Math.round((now - start) * 10) / 10;
    const fraction = measureMagnitudeFraction(diff);
    const startPos = MEASURE_CENTER;
    const nowPos = measureNowPos(diff, fraction);

    const row = document.createElement('div');
    row.className = 'measure-row';

    const top = document.createElement('div');
    top.className = 'measure-top';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'm-name';
    nameSpan.textContent = name;
    const deltaSpan = document.createElement('span');
    deltaSpan.className = 'm-delta';
    deltaSpan.textContent = (diff >= 0 ? '+' : '') + diff + ' cm';
    top.appendChild(nameSpan);
    top.appendChild(deltaSpan);

    const track = document.createElement('div');
    track.className = 'measure-track';
    const connector = document.createElement('div');
    connector.className = 'measure-connector';
    connector.style.left = Math.min(startPos, nowPos) + '%';
    connector.style.width = Math.abs(nowPos - startPos) + '%';
    const startDot = document.createElement('div');
    startDot.className = 'measure-dot start';
    startDot.style.left = startPos + '%';
    const nowDot = document.createElement('div');
    nowDot.className = 'measure-dot now';
    nowDot.style.left = nowPos + '%';
    const heatRgb = measureHeatColor(fraction);
    nowDot.style.background = 'rgb(' + heatRgb + ')';
    nowDot.style.boxShadow = '0 0 8px rgba(' + heatRgb + ', 0.7)';
    track.appendChild(connector);
    track.appendChild(startDot);
    track.appendChild(nowDot);

    const labels = document.createElement('div');
    labels.className = 'measure-labels';
    const startLabel = document.createElement('span');
    startLabel.textContent = 'Start ' + start + ' cm';
    const nowLabel = document.createElement('span');
    nowLabel.textContent = 'Now ' + now + ' cm';
    labels.appendChild(startLabel);
    labels.appendChild(nowLabel);

    row.appendChild(top);
    row.appendChild(track);
    row.appendChild(labels);
    return row;
}

function renderMeasurements() {
    const list = document.getElementById('overviewMeasurementsList');
    list.innerHTML = '';

    let anyShown = false;

    for (let i = 0; i < measurementTypes.length; i++) {
        const type = measurementTypes[i];
        if (!type.isActive) {
            continue;
        }

        const startAndNow = getMeasurementStartAndNow(type.name);
        if (startAndNow === null) {
            continue; // no data for this type yet
        }

        anyShown = true;
        list.appendChild(buildMeasureRow(type.name, startAndNow.start, startAndNow.now));
    }

    if (!anyShown) {
        const empty = document.createElement('p');
        empty.className = 'overview-empty-text';
        empty.textContent = 'No measurements yet.';
        list.appendChild(empty);
    }
}

// Called by pages.js whenever the Overview tab is opened.
export function renderOverview() {
    document.getElementById('overviewWeekLabel').textContent = 'Overview — Week ' + getWeekNumber(getMondayDate());
    renderHeroWeight();
    renderSteps();
    renderStreak();
    renderMeasurements();
}
