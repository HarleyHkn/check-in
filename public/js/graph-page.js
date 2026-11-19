// Graph page: a Weight/Steps
// toggle over a pan-to-scroll trend chart. The actual drag/animation widget
// lives in graph-chart.js - this file is just the data (52 weeks of weekly
// averages, gaps filled in) and the toggle buttons.

import { getMondayDate, getWeekNumber } from './date-utils.js';
import { weekAverage } from './weights-ui.js';
import { stepsWeekAverage } from './steps-ui.js';
import { buildTrendPanChart } from './graph-chart.js';

const WEEKS_OF_HISTORY = 52; // how far back the chart can be panned, in weeks

let activeMetric = 'weight';
let chartController = null;

// Builds 53 weeks of {label, year, value} (oldest first, ending on the
// current real week) from a getWeekValue(monday) function - weekAverage() or
// stepsWeekAverage(). Weeks with no entry (value 0) are filled in from the
// nearest earlier week that has one, so the line doesn't cliff down to zero
// just because a week was skipped - and if a week comes before ANY real
// entry, it borrows the first real value instead. Returns null if there's no
// data anywhere in the whole window.
function buildWeeksData(getWeekValue) {
    const currentMonday = getMondayDate();
    const weeks = [];

    for (let weeksBack = WEEKS_OF_HISTORY; weeksBack >= 0; weeksBack--) {
        const monday = new Date(currentMonday);
        monday.setDate(currentMonday.getDate() - weeksBack * 7);
        // weekAverage() returns a STRING (it builds its result with .toFixed()),
        // while stepsWeekAverage() already returns a number - Number(...) here
        // normalizes both, same fix overview.js needed for the same reason.
        const rawValue = Number(getWeekValue(monday));
        weeks.push({
            label: 'W' + getWeekNumber(monday),
            year: monday.getFullYear(),
            value: rawValue === 0 ? null : rawValue
        });
    }

    let firstRealValue = null;
    for (let i = 0; i < weeks.length; i++) {
        if (weeks[i].value !== null) {
            firstRealValue = weeks[i].value;
            break;
        }
    }
    if (firstRealValue === null) {
        return null; // no data anywhere in this window
    }

    let lastRealValue = firstRealValue;
    for (let i = 0; i < weeks.length; i++) {
        if (weeks[i].value === null) {
            weeks[i].value = lastRealValue; // carry the last known value forward across the gap
        } else {
            lastRealValue = weeks[i].value;
        }
    }

    return weeks;
}

function formatWeight(value) {
    return value.toFixed(1);
}

function formatSteps(value) {
    return Math.round(value).toLocaleString('sv-SE');
}

function renderGraph() {
    if (activeMetric === 'weight') {
        chartController.setData(buildWeeksData(weekAverage), 'kg', formatWeight);
    } else {
        chartController.setData(buildWeeksData(stepsWeekAverage), '', formatSteps);
    }
}

// Called by pages.js whenever the Graph tab is opened.
export function renderGraphPage() {
    if (chartController === null) {
        chartController = buildTrendPanChart(document.getElementById('graphChartCard'));
    }
    renderGraph();
}

document.querySelectorAll('.metric-toggle button').forEach(function (button) {
    button.addEventListener('click', function () {
        document.querySelectorAll('.metric-toggle button').forEach(function (b) { b.classList.remove('active'); });
        button.classList.add('active');
        activeMetric = button.dataset.metric;
        renderGraph();
    });
});
