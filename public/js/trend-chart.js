// Draws small SVG line charts into a container. Two functions:
// - buildTrendChart: one series (used by overview.js for the weight/steps trends)
// - buildMultiTrendChart: several series with a legend (used for the measurements trend)
// Kept generic (not weight/steps/measurement-specific) since these are reusable
// widgets, not page logic.

// Single-series chart: a handful of gridlines, axis labels, and a hover tooltip per point.
export function buildTrendChart(container, seriesClass, weekLabels, values, unit) {
    container.innerHTML = ''; // clear whatever was drawn there before

    const width = 320, height = 110, padL = 32, padR = 8, padT = 10, padB = 18;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = (max - min) || 1; // avoid dividing by zero if every value is the same

    function yFor(value) {
        return padT + (1 - (value - min) / range) * (height - padT - padB);
    }
    function xFor(index) {
        return padL + (index / (weekLabels.length - 1)) * (width - padL - padR);
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("class", "trend-svg");

    for (let g = 0; g <= 2; g++) {
        const gy = padT + (g / 2) * (height - padT - padB);
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", padL);
        line.setAttribute("x2", width - padR);
        line.setAttribute("y1", gy);
        line.setAttribute("y2", gy);
        line.setAttribute("class", "trend-gridline");
        svg.appendChild(line);
    }

    [min, max].forEach(function (value) {
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", 2);
        label.setAttribute("y", yFor(value) + 3);
        label.setAttribute("class", "trend-axislabel");
        label.textContent = Math.round(value * 10) / 10;
        svg.appendChild(label);
    });

    [0, Math.floor(weekLabels.length / 2), weekLabels.length - 1].forEach(function (index) {
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", xFor(index));
        label.setAttribute("y", height - 4);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "trend-axislabel");
        label.textContent = weekLabels[index];
        svg.appendChild(label);
    });

    const path = document.createElementNS(svgNS, "path");
    let d = "";
    values.forEach(function (value, index) {
        d += (index === 0 ? "M" : "L") + xFor(index) + " " + yFor(value) + " ";
    });
    path.setAttribute("d", d.trim());
    path.setAttribute("class", "trend-line " + seriesClass);
    svg.appendChild(path);

    const crosshair = document.createElementNS(svgNS, "line");
    crosshair.setAttribute("y1", padT);
    crosshair.setAttribute("y2", height - padB);
    crosshair.setAttribute("class", "trend-crosshair");
    svg.appendChild(crosshair);

    const tooltip = document.createElement('div');
    tooltip.className = 'trend-tooltip';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    values.forEach(function (value, index) {
        const dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("cx", xFor(index));
        dot.setAttribute("cy", yFor(value));
        dot.setAttribute("class", "trend-dot " + seriesClass + (index === values.length - 1 ? " last" : ""));
        svg.appendChild(dot);

        const hitArea = document.createElementNS(svgNS, "circle");
        hitArea.setAttribute("cx", xFor(index));
        hitArea.setAttribute("cy", yFor(value));
        hitArea.setAttribute("r", 10); // bigger than the visible dot, easier to hover/tap
        hitArea.setAttribute("class", "trend-hit-area");

        hitArea.addEventListener("mouseenter", function () {
            crosshair.style.display = 'block';
            crosshair.setAttribute("x1", xFor(index));
            crosshair.setAttribute("x2", xFor(index));

            tooltip.style.display = 'block';
            tooltip.style.left = ((xFor(index) / width) * 100) + '%';
            tooltip.style.top = ((yFor(value) / height) * 100) + '%';
            tooltip.textContent = weekLabels[index] + ': ' + value + unit;
        });
        hitArea.addEventListener("mouseleave", function () {
            crosshair.style.display = 'none';
            tooltip.style.display = 'none';
        });

        svg.appendChild(hitArea);
    });

    container.appendChild(svg);
}

// Multi-series chart with a legend and per-point tooltips (e.g. all measurement
// types at once). A series can have null for weeks it has no value - the line
// just skips across that gap instead of dropping to zero.
export function buildMultiTrendChart(container, seriesList, weekLabels) {
    container.innerHTML = '';

    const allValues = [];
    seriesList.forEach(function (series) {
        series.values.forEach(function (value) {
            if (value !== null) {
                allValues.push(value);
            }
        });
    });

    if (allValues.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'trend-empty';
        emptyMessage.textContent = 'No data yet.';
        container.appendChild(emptyMessage);
        return;
    }

    const width = 320, height = 130, padL = 32, padR = 8, padT = 10, padB = 18;
    const min = Math.min.apply(null, allValues);
    const max = Math.max.apply(null, allValues);
    const range = (max - min) || 1;

    function yFor(value) {
        return padT + (1 - (value - min) / range) * (height - padT - padB);
    }
    function xFor(index) {
        return padL + (index / (weekLabels.length - 1)) * (width - padL - padR);
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("class", "trend-svg");

    for (let g = 0; g <= 2; g++) {
        const gy = padT + (g / 2) * (height - padT - padB);
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", padL);
        line.setAttribute("x2", width - padR);
        line.setAttribute("y1", gy);
        line.setAttribute("y2", gy);
        line.setAttribute("class", "trend-gridline");
        svg.appendChild(line);
    }

    [0, Math.floor(weekLabels.length / 2), weekLabels.length - 1].forEach(function (index) {
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", xFor(index));
        label.setAttribute("y", height - 4);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "trend-axislabel");
        label.textContent = weekLabels[index];
        svg.appendChild(label);
    });

    const tooltip = document.createElement('div');
    tooltip.className = 'trend-tooltip';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    seriesList.forEach(function (series) {
        let d = "";
        let penIsDown = false;
        series.values.forEach(function (value, index) {
            if (value === null) {
                penIsDown = false; // gap - lift the pen, don't draw through the missing week
                return;
            }
            d += (penIsDown ? "L" : "M") + xFor(index) + " " + yFor(value) + " ";
            penIsDown = true;
        });

        if (d !== "") {
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", d.trim());
            path.setAttribute("class", "trend-line");
            path.setAttribute("stroke", series.color);
            svg.appendChild(path);
        }

        series.values.forEach(function (value, index) {
            if (value === null) {
                return;
            }

            const dot = document.createElementNS(svgNS, "circle");
            dot.setAttribute("cx", xFor(index));
            dot.setAttribute("cy", yFor(value));
            dot.setAttribute("r", 3);
            dot.setAttribute("fill", series.color);
            svg.appendChild(dot);

            const hitArea = document.createElementNS(svgNS, "circle");
            hitArea.setAttribute("cx", xFor(index));
            hitArea.setAttribute("cy", yFor(value));
            hitArea.setAttribute("r", 9);
            hitArea.setAttribute("class", "trend-hit-area");

            hitArea.addEventListener("mouseenter", function () {
                tooltip.style.display = 'block';
                tooltip.style.left = ((xFor(index) / width) * 100) + '%';
                tooltip.style.top = ((yFor(value) / height) * 100) + '%';
                tooltip.textContent = series.label + ' - ' + weekLabels[index] + ': ' + value + ' cm';
            });
            hitArea.addEventListener("mouseleave", function () {
                tooltip.style.display = 'none';
            });

            svg.appendChild(hitArea);
        });
    });

    container.appendChild(svg);

    if (seriesList.length > 1) {           // a single series doesn't need a legend - the chart title already names it
        const legend = document.createElement('div');
        legend.className = 'trend-legend';

        seriesList.forEach(function (series) {
            const item = document.createElement('span');
            item.className = 'trend-legend-item';

            const swatch = document.createElement('span');
            swatch.className = 'trend-legend-swatch';
            swatch.style.background = series.color;
            item.appendChild(swatch);

            item.appendChild(document.createTextNode(series.label));
            legend.appendChild(item);
        });

        container.appendChild(legend);
    }
}
