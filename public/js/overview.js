// Overview page: browse a week's avg weight/steps, plus a trend of the 8 weeks
// leading up to and including whichever week is currently selected - the graph
// moves together with the week selector. Also a combined measurements trend
// with a dropdown to isolate one type.

import { getMondayDate, getWeekNumber } from './date-utils.js';
import { weekAverage } from './weights-ui.js';
import { stepsWeekAverage } from './steps-ui.js';
import { measurementTypes, getMeasurementValue } from './measurements-ui.js';
import { buildTrendChart, buildMultiTrendChart } from './trend-chart.js';

let overviewSelectedMonday = getMondayDate(); // starts on the current real week

// Fixed color order for measurement types (by their position in measurementTypes,
// not by which ones happen to be active) - so a type's color doesn't shift around
// just because another type was removed.
const MEASUREMENT_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

// Fills in the "Week ##" label, date range, and Avg weight/Avg steps values for
// whichever week is currently selected.
function renderOverviewStats() {
    document.getElementById('overviewWeekLabel').textContent = 'Week ' + getWeekNumber(overviewSelectedMonday);

    const sundayDate = new Date(overviewSelectedMonday);
    sundayDate.setDate(overviewSelectedMonday.getDate() + 6);
    document.getElementById('overviewWeekRange').textContent =
        overviewSelectedMonday.toDateString() + ' - ' + sundayDate.toDateString();

    const avgWeight = weekAverage(overviewSelectedMonday);
    const avgSteps = stepsWeekAverage(overviewSelectedMonday);

    document.getElementById('overviewWeightValue').textContent = (avgWeight === 0 ? 'No data' : avgWeight + ' kg');
    document.getElementById('overviewStepsValue').textContent = (avgSteps === 0 ? 'No data' : avgSteps);
}

// Draws the weight and steps trend charts for the 8 weeks ending on the selected week.
function renderOverviewTrend() {
    const weekCount = 8;
    const weekLabels = [];
    const weightValues = [];
    const stepsValues = [];

    for (let i = weekCount - 1; i >= 0; i--) {
        const mondayForWeek = new Date(overviewSelectedMonday);
        mondayForWeek.setDate(overviewSelectedMonday.getDate() - i * 7); // ends at the selected week

        weekLabels.push('W' + getWeekNumber(mondayForWeek));
        weightValues.push(weekAverage(mondayForWeek));
        stepsValues.push(stepsWeekAverage(mondayForWeek));
    }

    buildTrendChart(document.getElementById('overviewWeightChart'), 'weight', weekLabels, weightValues, ' kg');
    buildTrendChart(document.getElementById('overviewStepsChart'), 'steps', weekLabels, stepsValues, '');
}

// Rebuilds the measurement-type dropdown from whatever types are currently active.
function populateMeasurementSelect() {
    const select = document.getElementById('overviewMeasurementSelect');
    const previousValue = select.value;

    select.innerHTML = '<option value="all">All measurements</option>';

    for (let i = 0; i < measurementTypes.length; i++) {
        if (!measurementTypes[i].isActive) {
            continue;
        }
        const option = document.createElement('option');
        option.value = measurementTypes[i].name;
        option.textContent = measurementTypes[i].name;
        select.appendChild(option);
    }

    let stillValid = false;                     // keep whatever was selected before, if it's still an option
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === previousValue) {
            stillValid = true;
        }
    }
    select.value = stillValid ? previousValue : 'all';
}

// Draws the measurements trend chart for whichever type(s) the dropdown selects.
function renderOverviewMeasurementsChart() {
    const weekCount = 8;
    const weekLabels = [];
    const mondays = [];

    for (let i = weekCount - 1; i >= 0; i--) {
        const mondayForWeek = new Date(overviewSelectedMonday);
        mondayForWeek.setDate(overviewSelectedMonday.getDate() - i * 7); // ends at the selected week
        weekLabels.push('W' + getWeekNumber(mondayForWeek));
        mondays.push(mondayForWeek);
    }

    const selectedType = document.getElementById('overviewMeasurementSelect').value;

    const seriesList = [];
    for (let i = 0; i < measurementTypes.length; i++) {
        const type = measurementTypes[i];
        if (!type.isActive) {
            continue;
        }
        if (selectedType !== 'all' && type.name !== selectedType) {
            continue;
        }

        const values = mondays.map(function (monday) {
            return getMeasurementValue(monday, type.name);
        });

        seriesList.push({
            label: type.name,
            color: MEASUREMENT_COLORS[i % MEASUREMENT_COLORS.length],
            values: values
        });
    }

    buildMultiTrendChart(document.getElementById('overviewMeasurementsChart'), seriesList, weekLabels);
}

document.getElementById('overviewMeasurementSelect').addEventListener('change', function () {
    renderOverviewMeasurementsChart();
});

// Called by pages.js whenever the Overview tab is opened.
export function renderOverview() {
    renderOverviewStats();
    renderOverviewTrend();
    populateMeasurementSelect();
    renderOverviewMeasurementsChart();
}

document.getElementById('overviewPrevWeek').addEventListener('click', function () {
    overviewSelectedMonday.setDate(overviewSelectedMonday.getDate() - 7);
    renderOverviewStats();
    renderOverviewTrend();                  // the graph's 8-week window moves back with it
    renderOverviewMeasurementsChart();
});

document.getElementById('overviewNextWeek').addEventListener('click', function () {
    overviewSelectedMonday.setDate(overviewSelectedMonday.getDate() + 7);
    renderOverviewStats();
    renderOverviewTrend();
    renderOverviewMeasurementsChart();
});
