// Draws the Overview hero card's "gradient wave" chart - a filled, fading area
// curve with one marked dot at the latest point. This is a different visual
// style from trend-chart.js (no gridlines/axis labels/tooltips, just the
// shape), so it gets its own small file instead of growing that one.

const svgNS = "http://www.w3.org/2000/svg";

// Reads the actual coral color values from CSS instead of hardcoding hex here,
// so this file never falls out of sync with coral-theme.css's :root.
function readCoralColor(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

export function buildHeroChart(container, values) {
    container.innerHTML = '';

    if (values.length < 2) {
        return; // not enough points yet to draw a trend line
    }

    const width = 320, height = 90, topMargin = 10, bottomMargin = 10;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const range = (max - min) || 1; // avoid dividing by zero if every value is the same

    function xFor(index) {
        return (index / (values.length - 1)) * width;
    }
    function yFor(value) {
        return topMargin + (1 - (value - min) / range) * (height - topMargin - bottomMargin);
    }

    // Catmull-Rom-ish smoothing: curves through each point via control points
    // derived from its neighbors, so the line flows continuously instead of
    // kinking at every point - same technique graph-chart.js uses, for the
    // same reason (the earlier version alternated a curve-to-midpoint with a
    // straight line back to the real point, which is what made it look jagged).
    const points = values.map(function (v, i) { return { x: xFor(i), y: yFor(v) }; });
    let linePath = "M " + points[0].x + "," + points[0].y;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        linePath += " C " + c1x + "," + c1y + " " + c2x + "," + c2y + " " + p2.x + "," + p2.y;
    }

    const fillPath = linePath + " L" + width + "," + height + " L0," + height + " Z";

    const accentColor = readCoralColor('--accent');
    const accentLightColor = readCoralColor('--accent-light');

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "hero-chart-svg");

    const gradient = document.createElementNS(svgNS, "linearGradient");
    gradient.setAttribute("id", "heroChartFade");
    gradient.setAttribute("x1", "0"); gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "0"); gradient.setAttribute("y2", "1");

    const topStop = document.createElementNS(svgNS, "stop");
    topStop.setAttribute("offset", "0%");
    topStop.setAttribute("stop-color", accentColor);
    topStop.setAttribute("stop-opacity", "0.45");

    const bottomStop = document.createElementNS(svgNS, "stop");
    bottomStop.setAttribute("offset", "100%");
    bottomStop.setAttribute("stop-color", accentColor);
    bottomStop.setAttribute("stop-opacity", "0");

    gradient.appendChild(topStop);
    gradient.appendChild(bottomStop);

    const defs = document.createElementNS(svgNS, "defs");
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const fill = document.createElementNS(svgNS, "path");
    fill.setAttribute("d", fillPath);
    fill.setAttribute("fill", "url(#heroChartFade)");
    svg.appendChild(fill);

    const line = document.createElementNS(svgNS, "path");
    line.setAttribute("d", linePath);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", accentLightColor);
    line.setAttribute("stroke-width", "2.5");
    svg.appendChild(line);

    const lastIndex = values.length - 1;
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", xFor(lastIndex));
    dot.setAttribute("cy", yFor(values[lastIndex]));
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", accentLightColor);
    svg.appendChild(dot);

    container.appendChild(svg);
}
