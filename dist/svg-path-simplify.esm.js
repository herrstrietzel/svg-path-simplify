function renderPoint(
    svg,
    coords,
    fill = "red",
    r = "1%",
    opacity = "1",
    title = '',
    render = true,
    id = "",
    className = ""
) {
    if (Array.isArray(coords)) {
        coords = {
            x: coords[0],
            y: coords[1]
        };
    }
    let marker = `<circle class="${className}" opacity="${opacity}" id="${id}" cx="${coords.x}" cy="${coords.y}" r="${r}" fill="${fill}">
  <title>${title}</title></circle>`;

    if (render) {
        svg.insertAdjacentHTML("beforeend", marker);
    } else {
        return marker;
    }
}

function renderPath(svg, d = '', stroke = 'green', strokeWidth = '1%', opacity="1", render = true) {

    let path = `<path d="${d}" fill="none" stroke="${stroke}"  stroke-width="${strokeWidth}" stroke-opacity="${opacity}" /> `;

    if (render) {
        svg.insertAdjacentHTML("beforeend", path);
    } else {
        return path;
    }

}

function detectInputType(input) {
    let type = 'string';
    /*
    if (input instanceof HTMLImageElement) return "img";
    if (input instanceof SVGElement) return "svg";
    if (input instanceof HTMLCanvasElement) return "canvas";
    if (input instanceof File) return "file";
    if (input instanceof ArrayBuffer) return "buffer";
    if (input instanceof Blob) return "blob";
    */
    if (Array.isArray(input)) {
        if (input[0]?.type && input[0]?.values 
        ) {
            return "pathData";
        }

        return "array";
    }

    if (typeof input === "string") {
        input = input.trim();
        let isSVG = input.includes('<svg') && input.includes('</svg');
        let isPathData = input.startsWith('M') || input.startsWith('m');
        let isPolyString = !isNaN(input.substring(0, 1)) && !isNaN(input.substring(input.length - 1, input.length));

        if (isSVG) {
            type = 'svgMarkup';
        }
        else if (isPathData) {
            type = 'pathDataString';
        }
        else if (isPolyString) {
            type = 'polyString';
        }

        else {
            let url = /^(file:|https?:\/\/|\/|\.\/|\.\.\/)/.test(input);
            let dataUrl = input.startsWith('data:image');
            type = url || dataUrl ? "url" : "string";
        }

        return type
    }

    type = typeof input;
    let constructor = input.constructor.name;

    return (constructor || type).toLowerCase();
}

const {
    abs: abs$1, acos: acos$1, asin: asin$1, atan: atan$1, atan2: atan2$1, ceil: ceil$1, cos: cos$1, exp: exp$1, floor: floor$1,
    log: log$1, hypot, max: max$1, min: min$1, pow: pow$1, random: random$1, round: round$1, sin: sin$1, sqrt: sqrt$1, tan: tan$1, PI: PI$1
} = Math;

/*
import {abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
    log, max, min, pow, random, round, sin, sqrt, tan, PI} from '/.constants.js';
    */

const {
    abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
    log, max, min, pow, random, round, sin, sqrt, tan, PI
} = Math;

// get angle helper
function getAngle(p1, p2, normalize = false) {
    let angle = atan2(p2.y - p1.y, p2.x - p1.x);
    // normalize negative angles
    if (normalize && angle < 0) angle += Math.PI * 2;
    return angle
}

function getDeltaAngle(centerPoint, startPoint, endPoint, largeArc = false) {

    const normalizeAngle = (angle) => {
        let normalized = angle % (2 * Math.PI);

        if (normalized > Math.PI) {
            normalized -= 2 * Math.PI;
        } else if (normalized <= -Math.PI) {
            normalized += 2 * Math.PI;
        }
        return normalized;
    };

    let startAngle = Math.atan2(
        startPoint.y - centerPoint.y,
        startPoint.x - centerPoint.x
    );

    let endAngle = Math.atan2(
        endPoint.y - centerPoint.y,
        endPoint.x - centerPoint.x
    );

    // Calculate raw delta angle (difference)
    let deltaAngle = endAngle - startAngle;

    // Normalize the delta angle to range (-π, π]
    deltaAngle = normalizeAngle(deltaAngle);

    if (largeArc) deltaAngle = Math.PI * 2 - Math.abs(deltaAngle);

    let phi = 180 / Math.PI;
    let startAngleDeg = startAngle * phi;
    let endAngleDeg = endAngle * phi;
    let deltaAngleDeg = deltaAngle * phi;

    return {
        startAngle, endAngle, deltaAngle, startAngleDeg,
        endAngleDeg,
        deltaAngleDeg
    };

}

/**
 * based on:  Justin C. Round's 
 * http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
 */

function checkLineIntersection(p1 = null, p2 = null, p3 = null, p4 = null, exact = true, debug = false) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    let denominator, a, b, numerator1, numerator2;
    let intersectionPoint = {};

    if (!p1 || !p2 || !p3 || !p4) {
        if (debug) console.warn('points missing');
        return false
    }

    try {
        denominator = ((p4.y - p3.y) * (p2.x - p1.x)) - ((p4.x - p3.x) * (p2.y - p1.y));
        if (denominator == 0) {
            return false;
        }
    } catch {
        if (debug) console.warn('!catch', p1, p2, 'p3:', p3, 'p4:', p4);
        return false
    }

    a = p1.y - p3.y;
    b = p1.x - p3.x;
    numerator1 = ((p4.x - p3.x) * a) - ((p4.y - p3.y) * b);
    numerator2 = ((p2.x - p1.x) * a) - ((p2.y - p1.y) * b);

    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    intersectionPoint = {
        x: p1.x + (a * (p2.x - p1.x)),
        y: p1.y + (a * (p2.y - p1.y))
    };

    let intersection = false;
    // if line1 is a segment and line2 is infinite, they intersect if:
    if ((a > 0 && a < 1) && (b > 0 && b < 1)) {
        intersection = true;

    }

    if (exact && !intersection) {

        return false;
    }

    // if line1 and line2 are segments, they intersect if both of the above are true

    return intersectionPoint;
}

/**
* Linear  interpolation (LERP) helper
*/
function interpolate(p1, p2, t, getTangent = false) {

    let pt = {
        x: (p2.x - p1.x) * t + p1.x,
        y: (p2.y - p1.y) * t + p1.y,
    };

    if (getTangent) {
        pt.angle = getAngle(p1, p2);

        // normalize negative angles
        if (pt.angle < 0) pt.angle += PI * 2;
    }

    return pt
}

function pointAtT(pts, t = 0.5, getTangent = false, getCpts = false, returnArray = false) {

    const getPointAtBezierT = (pts, t, getTangent = false) => {

        let isCubic = pts.length === 4;
        let p0 = pts[0];
        let cp1 = pts[1];
        let cp2 = isCubic ? pts[2] : pts[1];
        let p = pts[pts.length - 1];
        let pt = { x: 0, y: 0 };

        if (getTangent || getCpts) {
            let m0, m1, m2, m3, m4;
            let shortCp1 = p0.x === cp1.x && p0.y === cp1.y;
            let shortCp2 = p.x === cp2.x && p.y === cp2.y;

            if (t === 0 && !shortCp1) {
                pt.x = p0.x;
                pt.y = p0.y;
                pt.angle = getAngle(p0, cp1);
            }

            else if (t === 1 && !shortCp2) {
                pt.x = p.x;
                pt.y = p.y;
                pt.angle = getAngle(cp2, p);
            }

            else {
                // adjust if cps are on start or end point
                if (shortCp1) t += 0.0000001;
                if (shortCp2) t -= 0.0000001;

                m0 = interpolate(p0, cp1, t);
                if (isCubic) {
                    m1 = interpolate(cp1, cp2, t);
                    m2 = interpolate(cp2, p, t);
                    m3 = interpolate(m0, m1, t);
                    m4 = interpolate(m1, m2, t);
                    pt = interpolate(m3, m4, t);

                    // add angles
                    pt.angle = getAngle(m3, m4);

                    // add control points
                    if (getCpts) pt.cpts = [m1, m2, m3, m4];
                } else {
                    m1 = interpolate(p0, cp1, t);
                    m2 = interpolate(cp1, p, t);
                    pt = interpolate(m1, m2, t);
                    pt.angle = getAngle(m1, m2);

                    // add control points
                    if (getCpts) pt.cpts = [m1, m2];
                }
            }

        }
        // take simplified calculations without tangent angles
        else {
            let t1 = 1 - t;

            // cubic beziers
            if (isCubic) {
                pt = {
                    x:
                        t1 ** 3 * p0.x +
                        3 * t1 ** 2 * t * cp1.x +
                        3 * t1 * t ** 2 * cp2.x +
                        t ** 3 * p.x,
                    y:
                        t1 ** 3 * p0.y +
                        3 * t1 ** 2 * t * cp1.y +
                        3 * t1 * t ** 2 * cp2.y +
                        t ** 3 * p.y,
                };

            }
            // quadratic beziers
            else {
                pt = {
                    x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
                    y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y,
                };
            }

        }

        return pt

    };

    // normalize if input was array not pt object
    if (Array.isArray(pts[0])) {
        pts = pts.map(pt => { return { x: pt[0], y: pt[1] } });
        // also output array if not explicitely defined
        returnArray = true;
    }

    let pt;
    if (pts.length > 2) {
        pt = getPointAtBezierT(pts, t, getTangent);
    }

    else {
        pt = interpolate(pts[0], pts[1], t, getTangent);
    }

    // normalize negative angles
    if (getTangent && pt.angle < 0) pt.angle += PI * 2;

    return returnArray ? [pt.x, pt.y] : pt
}

/**
 * get vertices from path command final on-path points
 */
function getPathDataVertices(pathData) {
    let polyPoints = [];
    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };

    pathData.forEach((com) => {
        let { type, values } = com;
        // get final on path point from last 2 values
        if (values.length) {
            let pt = values.length > 1 ? { x: values[values.length - 2], y: values[values.length - 1] }
                : (type === 'V' ? { x: p0.x, y: values[0] } : { x: values[0], y: p0.y });
            polyPoints.push(pt);
            p0 = pt;
        }
    });
    return polyPoints;
}

/**
 *  based on @cuixiping;
 *  https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
 */
function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2) {

    // helper for angle calculation
    const getAngle = (cx, cy, x, y) => {
        return atan2(y - cy, x - cx);
    };

    // make sure rx, ry are positive
    rx = abs(rx);
    ry = abs(ry);

    // create data object
    let arcData = {
        cx: 0,
        cy: 0,
        // rx/ry values may be deceptive in arc commands
        rx: rx,
        ry: ry,
        startAngle: 0,
        endAngle: 0,
        deltaAngle: 0,
        clockwise: sweep,
        // copy explicit arc properties
        xAxisRotation,
        largeArc,
        sweep
    };

    if (rx == 0 || ry == 0) {
        // invalid arguments
        throw Error("rx and ry can not be 0");
    }

    let shortcut = true;

    if (rx === ry && shortcut) {

        // test semicircles
        let diffX = Math.abs(x2 - x1);
        let diffY = Math.abs(y2 - y1);
        let r = diffX;

        let xMin = Math.min(x1, x2),
            yMin = Math.min(y1, y2),
            PIHalf = Math.PI * 0.5;

        // semi circles
        if (diffX === 0 && diffY || diffY === 0 && diffX) {

            r = diffX === 0 && diffY ? diffY / 2 : diffX / 2;
            arcData.rx = r;
            arcData.ry = r;

            // verical
            if (diffX === 0 && diffY) {
                arcData.cx = x1;
                arcData.cy = yMin + diffY / 2;
                arcData.startAngle = y1 > y2 ? PIHalf : -PIHalf;
                arcData.endAngle = y1 > y2 ? -PIHalf : PIHalf;
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI;

            }
            // horizontal
            else if (diffY === 0 && diffX) {
                arcData.cx = xMin + diffX / 2;
                arcData.cy = y1;
                arcData.startAngle = x1 > x2 ? Math.PI : 0;
                arcData.endAngle = x1 > x2 ? -Math.PI : Math.PI;
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI;
            }

            return arcData;
        }
    }

    /**
     * if rx===ry x-axis rotation is ignored
     * otherwise convert degrees to radians
     */
    let phi = rx === ry ? 0 : (xAxisRotation * PI) / 180;
    let cx, cy;

    let s_phi = !phi ? 0 : Math.sin(phi);
    let c_phi = !phi ? 1 : Math.cos(phi);

    let hd_x = (x1 - x2) / 2;
    let hd_y = (y1 - y2) / 2;
    let hs_x = (x1 + x2) / 2;
    let hs_y = (y1 + y2) / 2;

    // F6.5.1
    let x1_ = !phi ? hd_x : c_phi * hd_x + s_phi * hd_y;
    let y1_ = !phi ? hd_y : c_phi * hd_y - s_phi * hd_x;

    // F.6.6 Correction of out-of-range radii
    //   Step 3: Ensure radii are large enough
    let lambda = (x1_ * x1_) / (rx * rx) + (y1_ * y1_) / (ry * ry);
    if (lambda > 1) {
        rx = rx * Math.sqrt(lambda);
        ry = ry * Math.sqrt(lambda);

        // save real rx/ry
        arcData.rx = rx;
        arcData.ry = ry;
    }

    let rxry = rx * ry;
    let rxy1_ = rx * y1_;
    let ryx1_ = ry * x1_;
    let sum_of_sq = rxy1_ ** 2 + ryx1_ ** 2; // sum of square
    if (!sum_of_sq) {

        throw Error("start point can not be same as end point");
    }
    let coe = Math.sqrt(Math.abs((rxry * rxry - sum_of_sq) / sum_of_sq));
    if (largeArc == sweep) {
        coe = -coe;
    }

    // F6.5.2
    let cx_ = (coe * rxy1_) / ry;
    let cy_ = (-coe * ryx1_) / rx;

    /** F6.5.3
     * center point of ellipse
     */
    cx = !phi ? hs_x + cx_ : c_phi * cx_ - s_phi * cy_ + hs_x;
    cy = !phi ? hs_y + cy_ : s_phi * cx_ + c_phi * cy_ + hs_y;
    arcData.cy = cy;
    arcData.cx = cx;

    /** F6.5.5
     * calculate angles between center point and
     * commands starting and final on path point
     */
    let startAngle = getAngle(cx, cy, x1, y1);
    let endAngle = getAngle(cx, cy, x2, y2);

    // adjust end angle
    if (!sweep && endAngle > startAngle) {

        endAngle -= Math.PI * 2;
    }

    if (sweep && startAngle > endAngle) {

        endAngle = endAngle <= 0 ? endAngle + Math.PI * 2 : endAngle;
    }

    let deltaAngle = endAngle - startAngle;
    arcData.startAngle = startAngle;
    arcData.endAngle = endAngle;
    arcData.deltaAngle = deltaAngle;

    return arcData;
}

function rotatePoint(pt, cx, cy, rotation = 0, convertToRadians = false) {
    if (!rotation) return pt;

    rotation = convertToRadians ? (rotation / 180) * Math.PI : rotation;

    return {
        x: cx + (pt.x - cx) * Math.cos(rotation) - (pt.y - cy) * Math.sin(rotation),
        y: cy + (pt.x - cx) * Math.sin(rotation) + (pt.y - cy) * Math.cos(rotation)
    };
}

function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = false) {

    // Convert degrees to radians
    angle = degrees ? (angle * PI) / 180 : angle;
    ellipseRotation = degrees ? (ellipseRotation * PI) / 180 : ellipseRotation;
    // reset rotation for circles or 360 degree 
    ellipseRotation = rx !== ry ? (ellipseRotation !== PI * 2 ? ellipseRotation : 0) : 0;

    // is ellipse
    if (parametricAngle && rx !== ry) {
        // adjust angle for ellipse rotation
        angle = ellipseRotation ? angle - ellipseRotation : angle;
        // Get the parametric angle for the ellipse
        let angleParametric = atan(tan(angle) * (rx / ry));
        // Ensure the parametric angle is in the correct quadrant
        angle = cos(angle) < 0 ? angleParametric + PI : angleParametric;
    }

    // Calculate the point on the ellipse without rotation
    let x = cx + rx * cos(angle),
        y = cy + ry * sin(angle);
    let pt = {
        x: x,
        y: y
    };

    if (ellipseRotation) {
        pt.x = cx + (x - cx) * cos(ellipseRotation) - (y - cy) * sin(ellipseRotation);
        pt.y = cy + (x - cx) * sin(ellipseRotation) + (y - cy) * cos(ellipseRotation);
    }
    return pt
}

// to parametric angle helper
function toParametricAngle(angle, rx, ry) {

    if (rx === ry || (angle % PI * 0.5 === 0)) return angle;
    let angleP = atan(tan(angle) * (rx / ry));

    // Ensure the parametric angle is in the correct quadrant
    angleP = cos(angle) < 0 ? angleP + PI : angleP;

    return angleP
}

function bezierhasExtreme(p0 = null, cpts = []) {

    if (!p0) {
        p0 = cpts[0];
        cpts = cpts.slice(1, cpts.length);
    }

    let l = cpts.length;
    let p = cpts[l - 1];
    let cp1 = cpts[0];
    let cp2 = l === 3 ? cpts[1] : cp1;

    // get bounding box
    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y);
    let left = Math.min(p0.x, p.x);
    let right = Math.max(p0.x, p.x);
    let bottom = Math.max(p0.y, p.y);

    // within bbox - can't have extremes
    if (
        cp1.y >= top && cp1.y <= bottom &&
        cp2.y >= top && cp2.y <= bottom &&
        cp1.x >= left && cp1.x <= right &&
        cp2.x >= left && cp2.x <= right
    ) {
        return false
    }

    return true

}

function getBezierExtremeT(pts, { addExtremes = true, addSemiExtremes = false } = {}) {
    let tArr = pts.length === 4 ? cubicBezierExtremeT(pts[0], pts[1], pts[2], pts[3], { addExtremes, addSemiExtremes }) : quadraticBezierExtremeT(pts[0], pts[1], pts[2], { addExtremes, addSemiExtremes });
    return tArr;
}

/**
 * based on Nikos M.'s answer
 * how-do-you-calculate-the-axis-aligned-bounding-box-of-an-ellipse
 * https://stackoverflow.com/questions/87734/#75031511
 * See also: https://github.com/foo123/Geometrize
 */
function getArcExtemes(p0, values) {
    // compute point on ellipse from angle around ellipse (theta)
    const arc = (theta, cx, cy, rx, ry, alpha) => {
        // theta is angle in radians around arc
        // alpha is angle of rotation of ellipse in radians
        var cos = Math.cos(alpha),
            sin = Math.sin(alpha),
            x = rx * Math.cos(theta),
            y = ry * Math.sin(theta);

        return {
            x: cx + cos * x - sin * y,
            y: cy + sin * x + cos * y
        };
    };

    let arcData = svgArcToCenterParam(p0.x, p0.y, values[0], values[1], values[2], values[3], values[4], values[5], values[6]);
    let { rx, ry, cx, cy, endAngle, deltaAngle } = arcData;

    // arc rotation
    let deg = values[2];

    // final on path point
    let p = { x: values[5], y: values[6] };

    // collect extreme points – add end point
    let extremes = [p];

    // rotation to radians
    let alpha = deg * Math.PI / 180;
    let tan = Math.tan(alpha),
        p1, p2, p3, p4, theta;

    /**
    * find min/max from zeroes of directional derivative along x and y
    * along x axis
    */
    theta = Math.atan2(-ry * tan, rx);

    let angle1 = theta;
    let angle2 = theta + Math.PI;
    let angle3 = Math.atan2(ry, rx * tan);
    let angle4 = angle3 + Math.PI;

    // inner bounding box
    let xArr = [p0.x, p.x];
    let yArr = [p0.y, p.y];
    let xMin = Math.min(...xArr);
    let xMax = Math.max(...xArr);
    let yMin = Math.min(...yArr);
    let yMax = Math.max(...yArr);

    // on path point close after start
    let angleAfterStart = endAngle - deltaAngle * 0.001;
    let pP2 = arc(angleAfterStart, cx, cy, rx, ry, alpha);

    // on path point close before end
    let angleBeforeEnd = endAngle - deltaAngle * 0.999;
    let pP3 = arc(angleBeforeEnd, cx, cy, rx, ry, alpha);

    /**
     * expected extremes
     * if leaving inner bounding box
     * (between segment start and end point)
     * otherwise exclude elliptic extreme points
    */

    // right
    if (pP2.x > xMax || pP3.x > xMax) {
        // get point for this theta
        p1 = arc(angle1, cx, cy, rx, ry, alpha);
        extremes.push(p1);
    }

    // left
    if (pP2.x < xMin || pP3.x < xMin) {
        // get anti-symmetric point
        p2 = arc(angle2, cx, cy, rx, ry, alpha);
        extremes.push(p2);
    }

    // top
    if (pP2.y < yMin || pP3.y < yMin) {
        // get anti-symmetric point
        p4 = arc(angle4, cx, cy, rx, ry, alpha);
        extremes.push(p4);
    }

    // bottom
    if (pP2.y > yMax || pP3.y > yMax) {
        // get point for this theta
        p3 = arc(angle3, cx, cy, rx, ry, alpha);
        extremes.push(p3);
    }

    return extremes;
}

function getTatAngles(cpts = [], angles = []) {

    let l = cpts.length;
    let isCubic = l === 4;

    if (!angles.length) angles = [0];

    let anglesL = angles.length;
    let tArr = [];

    for (let i = 0; i < anglesL; i++) {

        let ang = angles[i];
        let cptsN = ang ? [] : cpts.slice(0);

        // rotate cpts
        if (ang) {
            for (let j = 0; j < l; j++) {
                let pt = cpts[j];
                cptsN.push(rotatePoint(pt, 0, 0, ang));
            }
        }

        // get t arr
        let tVals = isCubic ? getTatCubicExtreme(...cptsN) : getTatQuadraticExtreme(...cptsN);
        tArr.push(...tVals);

    }

    // deduplicate and sort
    tArr = [... new Set(tArr)].sort();

    return tArr;

}

// t at cubic bezier extreme
function getTatCubicExtreme(p0, cp1, cp2, p) {

    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    if (!bezierhasExtreme(p0, [cp1, cp2, p])) {

        return []
    }

    let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];
    let tArr = [], a, b, c, t, t1, t2, b2ac, sqrt_b2ac;
    let e = 1e-8;

    for (let i = 0; i < 2; ++i) {

        if (i == 0) {
            b = 6 * x0 - 12 * x1 + 6 * x2;
            a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
            c = 3 * x1 - 3 * x0;
        } else {
            b = 6 * y0 - 12 * y1 + 6 * y2;
            a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
            c = 3 * y1 - 3 * y0;
        }
        if (Math.abs(a) < e) {
            if (Math.abs(b) < e) {
                continue;
            }
            t = -c / b;
            if (t > 0 && t < 1) {
                tArr.push(t);
            }
            continue;
        }
        b2ac = b * b - 4 * c * a;
        if (b2ac < 0) {
            if (Math.abs(b2ac) < e) {
                t = -b / (2 * a);
                if (t > 0 && t < 1) {
                    tArr.push(t);
                }
            }
            continue;
        }
        sqrt_b2ac = Math.sqrt(b2ac);
        t1 = (-b + sqrt_b2ac) / (2 * a);
        if (t1 > 0 && t1 < 1) {
            tArr.push(t1);
        }
        t2 = (-b - sqrt_b2ac) / (2 * a);
        if (t2 > 0 && t2 < 1) {
            tArr.push(t2);
        }
    }

    let j = tArr.length;
    while (j--) {
        t = tArr[j];
    }

    return [...new Set(tArr)].sort();
}

function getTatQuadraticExtreme(p0, cp1, p) {

    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    if (!bezierhasExtreme(p0, [cp1, p])) {

        return []
    }

    let a, b, t;
    let [x0, y0, x1, y1, x2, y2] = [p0.x, p0.y, cp1.x, cp1.y, p.x, p.y];
    let tArr = [];

    for (let i = 0; i < 2; ++i) {
        a = i == 0 ? x0 - 2 * x1 + x2 : y0 - 2 * y1 + y2;
        b = i == 0 ? -2 * x0 + 2 * x1 : -2 * y0 + 2 * y1;
        if (Math.abs(a) > 1e-12) {
            t = -b / (2 * a);
            if (t > 0 && t < 1) {
                tArr.push(t);
            }
        }
    }

    return [...new Set(tArr)].sort();
}

// cubic bezier.
function cubicBezierExtremeT(p0, cp1, cp2, p,
    { addExtremes = true, addSemiExtremes = false } = {}) {

    // rotate cpts for semi extremes
    const rotatePoint = (pt) => {

        const angleRad = Math.PI / 4;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        return {
            x: pt.x * cos - pt.y * sin,
            y: pt.x * sin + pt.y * cos
        }
    };

    if (addSemiExtremes) {
        p0 = rotatePoint(p0);
        cp1 = rotatePoint(cp1);
        cp2 = rotatePoint(cp2);
        p = rotatePoint(p);
    }

    let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];

    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y);
    let left = Math.min(p0.x, p.x);
    let right = Math.max(p0.x, p.x);
    let bottom = Math.max(p0.y, p.y);

    if (
        cp1.y >= top && cp1.y <= bottom &&
        cp2.y >= top && cp2.y <= bottom &&
        cp1.x >= left && cp1.x <= right &&
        cp2.x >= left && cp2.x <= right
    ) {
        return []
    }

    let tArr = [], a, b, c, t, t1, t2, b2ac, sqrt_b2ac;

    for (let i = 0; i < 2; ++i) {
        if (i == 0) {
            b = 6 * x0 - 12 * x1 + 6 * x2;
            a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
            c = 3 * x1 - 3 * x0;
        } else {
            b = 6 * y0 - 12 * y1 + 6 * y2;
            a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
            c = 3 * y1 - 3 * y0;
        }
        if (Math.abs(a) < 1e-8) {
            if (Math.abs(b) < 1e-8) {
                continue;
            }
            t = -c / b;
            if (0 < t && t < 1) {
                tArr.push(t);
            }
            continue;
        }
        b2ac = b * b - 4 * c * a;
        if (b2ac < 0) {
            if (Math.abs(b2ac) < 1e-8) {
                t = -b / (2 * a);
                if (0 < t && t < 1) {
                    tArr.push(t);
                }
            }
            continue;
        }
        sqrt_b2ac = Math.sqrt(b2ac);
        t1 = (-b + sqrt_b2ac) / (2 * a);
        if (0 < t1 && t1 < 1) {
            tArr.push(t1);
        }
        t2 = (-b - sqrt_b2ac) / (2 * a);
        if (0 < t2 && t2 < 1) {
            tArr.push(t2);
        }
    }

    let j = tArr.length;
    while (j--) {
        t = tArr[j];
    }

    return tArr;
}

function isMultipleOf45(angleRad, epsilon = 0.001) {
    let rad90 = Math.PI / 2;
    let rad45 = rad90 / 2;
    let isRightAngle = Math.abs(angleRad / rad90 - Math.round(angleRad / rad90)) < epsilon;
    return !isRightAngle ? Math.abs(angleRad / rad45 - Math.round(angleRad / rad45)) < epsilon : false;
}

function quadraticBezierExtremeT(p0, cp1, p, { addExtremes = true, addSemiExtremes = false } = {}) {

    // rotate cpts for semi extremes
    const rotatePoint = (pt) => {
        const angleRad = -Math.PI / 4;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        return {
            x: pt.x * cos - pt.y * sin,
            y: pt.x * sin + pt.y * cos
        }
    };

    if (addSemiExtremes) {
        p0 = rotatePoint(p0);
        cp1 = rotatePoint(cp1);
        p = rotatePoint(p);
    }

    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y);
    let left = Math.min(p0.x, p.x);
    let right = Math.max(p0.x, p.x);
    let bottom = Math.max(p0.y, p.y);
    let a, b, t;

    if (
        cp1.y >= top && cp1.y <= bottom &&
        cp1.x >= left && cp1.x <= right
    ) {
        return []
    }

    let [x0, y0, x1, y1, x2, y2] = [p0.x, p0.y, cp1.x, cp1.y, p.x, p.y];
    let extemeT = [];

    for (let i = 0; i < 2; ++i) {
        a = i == 0 ? x0 - 2 * x1 + x2 : y0 - 2 * y1 + y2;
        b = i == 0 ? -2 * x0 + 2 * x1 : -2 * y0 + 2 * y1;
        if (Math.abs(a) > 1e-12) {
            t = -b / (2 * a);
            if (t > 0 && t < 1) {
                extemeT.push(t);
            }
        }
    }
    return extemeT
}

/**
 * get distance between 2 points
 * pythagorean theorem
 */
function getDistance(p1, p2, isArray = false) {

    let dx = isArray ? p2[0] - p1[0] : (p2.x - p1.x);
    let dy = isArray ? p2[1] - p1[1] : (p2.y - p1.y);

    return sqrt(dx * dx + dy * dy);
}

function getSquareDistance(p1, p2) {
    let dx = (p2.x - p1.x);
    let dy = (p2.y - p1.y);
    return dx * dx + dy * dy
}

/**
 * get Manhattan/Cab distance 
 * based on x/y deltas
 * sloppy but fast
 */
function getDistManhattan(pt1, pt2) {
    let dx = Math.abs(pt2.x - pt1.x);
    let dy = Math.abs(pt2.y - pt1.y);
    return dx + dy;
}

/**
 * sloppy distance calculation
 * based on "half Manhattan/Cab" distance
 */

function getDistAv(pt1, pt2) {
    let dx = Math.abs(pt2.x - pt1.x);
    let dy = Math.abs(pt2.y - pt1.y);
    return (dx + dy) * 0.5;
}

/**
 * reduce polypoints
 * for sloppy dimension approximations
 */
function reducePoints(points, maxPoints = 48) {
    if (!Array.isArray(points) || points.length <= maxPoints) return points;

    // Calculate how many points to skip between kept points
    let len = points.length;
    let step = len / maxPoints;
    let reduced = [];

    for (let i = 0; i < maxPoints; i++) {
        reduced.push(points[Math.floor(i * step)]);
    }

    let lenR = reduced.length;
    // Always include the last point to maintain path integrity
    if (reduced[lenR - 1] !== points[len - 1]) {
        reduced[lenR - 1] = points[len - 1];
    }

    return reduced;
}

/**
 * split compound paths into 
 * sub path data array
 */

function splitSubpaths(pathData) {
    let subPathArr = [];
    let current = [pathData[0]];
    let l = pathData.length;

    for (let i = 1; i < l; i++) {
        let com = pathData[i];

        if (com.type === 'M' || com.type === 'm') {
            subPathArr.push(current);
            current = [];
        }
        current.push(com);
    }

    if (current.length) subPathArr.push(current);

    return subPathArr;
}

/**
 * calculate split command points
 * for single t value 
 */
function splitCommand(points, t) {

    let seg1 = [];
    let seg2 = [];

    let p0 = points[0];
    let cp1 = points[1];
    let cp2 = points[points.length - 2];
    let p = points[points.length - 1];
    let m0, m1, m2, m3, m4, p2;

    // cubic
    if (points.length === 4) {
        m0 = pointAtT([p0, cp1], t);
        m1 = pointAtT([cp1, cp2], t);
        m2 = pointAtT([cp2, p], t);
        m3 = pointAtT([m0, m1], t);
        m4 = pointAtT([m1, m2], t);

        // split end point
        p2 = pointAtT([m3, m4], t);

        // 1. segment
        seg1.push(
            { x: p0.x, y: p0.y },
            { x: m0.x, y: m0.y },
            { x: m3.x, y: m3.y },
            { x: p2.x, y: p2.y },
        );
        // 2. segment
        seg2.push(
            { x: p2.x, y: p2.y },
            { x: m4.x, y: m4.y },
            { x: m2.x, y: m2.y },
            { x: p.x, y: p.y },
        );
    }

    // quadratic
    else if (points.length === 3) {
        m1 = pointAtT([p0, cp1], t);
        m2 = pointAtT([cp1, p], t);
        p2 = pointAtT([m1, m2], t);

        // 1. segment
        seg1.push(
            { x: p0.x, y: p0.y },
            { x: m1.x, y: m1.y },
            { x: p2.x, y: p2.y },
        );

        // 1. segment
        seg2.push(
            { x: p2.x, y: p2.y },
            { x: m2.x, y: m2.y },
            { x: p.x, y: p.y },
        );
    }

    // lineto
    else if (points.length === 2) {
        m1 = pointAtT([p0, p], t);

        // 1. segment
        seg1.push(
            { x: p0.x, y: p0.y },
            { x: m1.x, y: m1.y },
        );

        // 1. segment
        seg2.push(
            { x: m1.x, y: m1.y },
            { x: p.x, y: p.y },
        );
    }
    return [seg1, seg2];
}

/**
 * calculate command extremes
 */

function addExtemesToCommand(p0, values,
    { tMin = 0, tMax = 1, addExtremes = true, addSemiExtremes = false } = {}) {

    let pathDataNew = [];

    let type = values.length === 6 ? 'C' : 'Q';
    let cp1 = { x: values[0], y: values[1] };
    let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
    let p = { x: values[4], y: values[5] };

    /*
    // get inner bbox
    let xMax = Math.max(p.x, p0.x)
    let xMin = Math.min(p.x, p0.x)
    let yMax = Math.max(p.y, p0.y)
    let yMin = Math.min(p.y, p0.y)
    */

    let extremeCount = 0;

    tMin = 0;
    tMax = 1;

    let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];
    let tArrEx = addExtremes ? getBezierExtremeT(pts, { addExtremes, addSemiExtremes: false }) : [];
    let tArrSemi = addSemiExtremes ? getBezierExtremeT(pts, { addExtremes, addSemiExtremes }) : [];
    let tArr = Array.from(new Set([...tArrEx, ...tArrSemi])).sort();

    // avoid t split too close to start or end
    tArr = tArr.filter(t => t > tMin && t < tMax);

    if (tArr.length) {
        let commandsSplit = splitCommandAtTValues(p0, values, tArr);

        pathDataNew.push(...commandsSplit);
        extremeCount += commandsSplit.length;
    } else {

        pathDataNew.push({ type: type, values: values });
    }

    return { pathData: pathDataNew, count: extremeCount };

}

function addExtremePoints(pathData, {
    tMin = 0,
    tMax = 1,
    addExtremes = true,
    addSemiExtremes = false,
} = {}) {
    let pathDataNew = [pathData[0]];
    // previous on path point
    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let len = pathData.length;

    for (let c = 1; len && c < len; c++) {
        let com = pathData[c];

        let { type, values } = com;
        let valsL = values.slice(-2);
        ({ x: valsL[0], y: valsL[1] });

        if (type !== 'C' && type !== 'Q') {
            pathDataNew.push(com);
        }

        else {
            // add extremes
            if ((addExtremes || addSemiExtremes) && (type === 'C' || type === 'Q')) {
                let comExt = addExtemesToCommand(p0, values, { tMin, tMax, addExtremes, addSemiExtremes }).pathData;

                pathDataNew.push(...comExt);
            }
        }

        p0 = { x: valsL[0], y: valsL[1] };

        if (type.toLowerCase() === "z") {
            p0 = M;
        } else if (type === "M") {
            M = { x: valsL[0], y: valsL[1] };
        }
    }

    return pathDataNew;
}

/**
 * split commands multiple times
 * based on command points
 * and t array
 */
function splitCommandAtTValues(p0, values, tArr, returnCommand = true) {
    let segmentPoints = [];

    if (!tArr.length) {
        return false
    }

    let valuesL = values.length;
    let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
    let cp1, cp2, points;

    if (values.length === 2) {
        points = [p0, p];
    }
    else if (values.length === 4) {
        cp1 = { x: values[0], y: values[1] };
        points = [p0, cp1, p];
    }
    else if (values.length === 6) {
        cp1 = { x: values[0], y: values[1] };
        cp2 = { x: values[2], y: values[3] };
        points = [p0, cp1, cp2, p];
    }

    if (tArr.length) {
        // single t
        if (tArr.length === 1) {
            let segs = splitCommand(points, tArr[0]);
            let points1 = segs[0];
            let points2 = segs[1];
            segmentPoints.push(points1, points2);

        } else {

            // 1st segment
            let t1 = tArr[0];
            let seg0 = splitCommand(points, t1);
            let points0 = seg0[0];
            segmentPoints.push(points0);
            points = seg0[1];

            for (let i = 1; i < tArr.length; i++) {
                t1 = tArr[i - 1];
                let t2 = tArr[i];

                // new t value for 2nd segment
                let t2_1 = (t2 - t1) / (1 - t1);
                let segs2 = splitCommand(points, t2_1);
                segmentPoints.push(segs2[0]);

                if (i === tArr.length - 1) {
                    segmentPoints.push(segs2[segs2.length - 1]);
                }
                // take 2nd segment for next splitting
                points = segs2[1];
            }
        }
    }

    if (returnCommand) {

        let pathData = [];
        let com, values;

        segmentPoints.forEach(seg => {
            com = { type: '', values: [] };
            seg.shift();
            values = seg.map(val => { return Object.values(val) }).flat();
            com.values = values;

            // cubic
            if (seg.length === 3) {
                com.type = 'C';
            }

            // quadratic
            else if (seg.length === 2) {
                com.type = 'Q';
            }

            // lineto
            else if (seg.length === 1) {
                com.type = 'L';
            }
            pathData.push(com);
        });
        return pathData;
    }

    return segmentPoints;
}

/**
 * calculate polygon bbox
 */
function getPolyBBox(vertices, decimals = -1) {
    let xArr = vertices.map(pt => pt.x);
    let yArr = vertices.map(pt => pt.y);
    let left = Math.min(...xArr);
    let right = Math.max(...xArr);
    let top = Math.min(...yArr);
    let bottom = Math.max(...yArr);
    let bb = {
        x: left,
        left: left,
        right: right,
        y: top,
        top: top,
        bottom: bottom,
        width: right - left,
        height: bottom - top
    };

    // round

    if (decimals > -1) {
        for (let prop in bb) {
            bb[prop] = +bb[prop].toFixed(decimals);
        }
    }

    return bb;
}

function getSubPathBBoxes(subPaths) {
    let bboxArr = [];
    subPaths.forEach((pathData) => {

        let bb = getPathDataBBox_sloppy(pathData);
        bboxArr.push(bb);
    });

    return bboxArr;
}

function checkBBoxIntersections(bb, bb1) {
    let [x, y, width, height, right, bottom] = [
        bb.x,
        bb.y,
        bb.width,
        bb.height,
        bb.x + bb.width,
        bb.y + bb.height
    ];
    let [x1, y1, width1, height1, right1, bottom1] = [
        bb1.x,
        bb1.y,
        bb1.width,
        bb1.height,
        bb1.x + bb1.width,
        bb1.y + bb1.height
    ];
    let intersects = false;
    if (width * height != width1 * height1) {
        if (width * height > width1 * height1) {
            if (x < x1 && right > right1 && y < y1 && bottom > bottom1) {
                intersects = true;
            }
        }
    }
    return intersects;
}

/**
 * sloppy path bbox aaproximation
 */

function getPathDataBBox_sloppy(pathData) {
    let pts = getPathDataPoly(pathData);
    let bb = getPolyBBox(pts);
    return bb;
}

/**
 * get path data poly
 * including command points
 * handy for faster/sloppy bbox approximations
 */

function getPathDataPoly(pathData) {

    let poly = [];
    for (let i = 0; i < pathData.length; i++) {
        let com = pathData[i];
        let prev = i > 0 ? pathData[i - 1] : pathData[i];
        let { type, values } = com;
        let p0 = { x: prev.values[prev.values.length - 2], y: prev.values[prev.values.length - 1] };
        let p = values.length ? { x: values[values.length - 2], y: values[values.length - 1] } : '';
        let cp1 = values.length ? { x: values[0], y: values[1] } : '';

        switch (type) {

            // convert to cubic to get polygon
            case 'A':

                if (typeof arcToBezier !== 'function') {

                    // get real radii
                    let rx = getDistance(p0, p) / 2;
                    let ptMid = interpolate(p0, p, 0.5);

                    let pt1 = getPointOnEllipse(ptMid.x, ptMid.y, rx, rx, 0);
                    let pt2 = getPointOnEllipse(ptMid.x, ptMid.y, rx, rx, Math.PI);
                    poly.push(pt1, pt2, p);

                    break;
                }
                let cubic = arcToBezier(p0, values);
                cubic.forEach(com => {
                    let vals = com.values;
                    let cp1 = { x: vals[0], y: vals[1] };
                    let cp2 = { x: vals[2], y: vals[3] };
                    let p = { x: vals[4], y: vals[5] };
                    poly.push(cp1, cp2, p);
                });
                break;

            case 'C':
                let cp2 = { x: values[2], y: values[3] };
                poly.push(cp1, cp2);
                break;
            case 'Q':
                poly.push(cp1);
                break;
        }

        // M and L commands
        if (type.toLowerCase() !== 'z') {
            poly.push(p);
        }
    }

    return poly;
}

/**
 * get exact path BBox
 * calculating extremes for all command types
 */

function getPathDataBBox(pathData) {

    // save extreme values
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;

    const setXYmaxMin = (pt) => {
        if (pt.x < xMin) {
            xMin = pt.x;
        }
        if (pt.x > xMax) {
            xMax = pt.x;
        }
        if (pt.y < yMin) {
            yMin = pt.y;
        }
        if (pt.y > yMax) {
            yMax = pt.y;
        }
    };

    for (let i = 0; i < pathData.length; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valuesL = values.length;
        let comPrev = pathData[i - 1] ? pathData[i - 1] : pathData[i];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;

        if (valuesL) {
            let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };
            let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
            // add final on path point
            setXYmaxMin(p);

            if (type === 'C' || type === 'Q') {
                let cp1 = { x: values[0], y: values[1] };
                let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];

                let bezierExtremesT = getBezierExtremeT(pts);
                bezierExtremesT.forEach(t => {
                    let pt = pointAtT(pts, t);
                    setXYmaxMin(pt);
                });
            }

            else if (type === 'A') {
                let arcExtremes = getArcExtemes(p0, values);
                arcExtremes.forEach(pt => {
                    setXYmaxMin(pt);
                });
            }
        }
    }

    let bbox = { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
    return bbox
}

/**
 * get pathdata area
 */

function getPathArea(pathData, decimals = 9) {
    let totalArea = 0;
    let polyPoints = [];

    let subPathsData = splitSubpaths(pathData);
    let isCompoundPath = subPathsData.length > 1 ? true : false;
    let counterShapes = [];

    // check intersections for compund paths
    if (isCompoundPath) {
        let bboxArr = getSubPathBBoxes(subPathsData);

        bboxArr.forEach(function (bb, b) {

            for (let i = 0; i < bboxArr.length; i++) {
                let bb2 = bboxArr[i];
                if (bb != bb2) {
                    let intersects = checkBBoxIntersections(bb, bb2);
                    if (intersects) {
                        counterShapes.push(i);
                    }
                }
            }
        });
    }

    subPathsData.forEach((pathData, d) => {

        polyPoints = [];
        let comArea = 0;
        let pathArea = 0;
        let multiplier = 1;
        let pts = [];

        pathData.forEach(function (com, i) {
            let [type, values] = [com.type, com.values];
            let valuesL = values.length;

            if (values.length) {
                let prevC = i > 0 ? pathData[i - 1] : pathData[0];
                let prevCVals = prevC.values;
                let prevCValsL = prevCVals.length;
                let p0 = { x: prevCVals[prevCValsL - 2], y: prevCVals[prevCValsL - 1] };
                let p = { x: values[valuesL - 2], y: values[valuesL - 1] };

                // C commands
                if (type === 'C' || type === 'Q') {
                    let cp1 = { x: values[0], y: values[1] };
                    pts = type === 'C' ? [p0, cp1, { x: values[2], y: values[3] }, p] : [p0, cp1, p];
                    let areaBez = Math.abs(getBezierArea(pts));
                    comArea += areaBez;

                    polyPoints.push(p0, p);
                }

                // A commands
                else if (type === 'A') {
                    let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], com.values[3], com.values[4], p.x, p.y);
                    let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle } = arcData;

                    let arcArea = Math.abs(getEllipseArea(rx, ry, startAngle, endAngle));

                    // subtract remaining polygon between p0, center and p
                    let polyArea = Math.abs(getPolygonArea([p0, { x: cx, y: cy }, p]));
                    arcArea -= polyArea;

                    polyPoints.push(p0, p);
                    comArea += arcArea;
                }

                // L commands
                else {
                    polyPoints.push(p0, p);
                }
            }
        });

        let areaPoly = getPolygonArea(polyPoints);

        if (counterShapes.indexOf(d) !== -1) {
            multiplier = -1;
        }

        if (
            (areaPoly < 0 && comArea < 0)
        ) {
            // are negative
            pathArea = (Math.abs(comArea) - Math.abs(areaPoly)) * multiplier;

        } else {
            pathArea = (Math.abs(comArea) + Math.abs(areaPoly)) * multiplier;
        }

        totalArea += pathArea;
    });

    return totalArea;
}

/**
 * get ellipse area
 * skips to circle calculation if rx===ry
 */

function getEllipseArea(rx, ry, startAngle, endAngle) {
    const totalArea = Math.PI * rx * ry;
    let angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    // If circle, use simple circular formula
    if (rx === ry) return totalArea * (angleDiff / (2 * Math.PI));

    // Convert absolute angles to parametric angles
    const absoluteToParametric = (phi)=>{
      return Math.atan2(rx * Math.sin(phi), ry * Math.cos(phi));
    };
    startAngle = absoluteToParametric(startAngle);
    endAngle = absoluteToParametric(endAngle);
    angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    return totalArea * (angleDiff / (2 * Math.PI));
}

/**
 * compare areas 
 * for thresholds
 * returns a percentage value
 */

function getRelativeAreaDiff(area0, area1) {
    let diff = Math.abs(area0 - area1);
    return Math.abs(100 - (100 / area0 * (area0 + diff)))
}

/**
 * get bezier area
 */
function getBezierArea(pts, absolute=false) {

    let [p0, cp1, cp2, p] = [pts[0], pts[1], pts[2], pts[pts.length - 1]];
    let area;

    if (pts.length < 3) return 0;

    // quadratic beziers
    if (pts.length === 3) {
        cp1 = {
            x: pts[0].x * 1 / 3 + pts[1].x * 2 / 3,
            y: pts[0].y * 1 / 3 + pts[1].y * 2 / 3
        };

        cp2 = {
            x: pts[2].x * 1 / 3 + pts[1].x * 2 / 3,
            y: pts[2].y * 1 / 3 + pts[1].y * 2 / 3
        };
    }

    area = ((p0.x * (-2 * cp1.y - cp2.y + 3 * p.y) +
        cp1.x * (2 * p0.y - cp2.y - p.y) +
        cp2.x * (p0.y + cp1.y - 2 * p.y) +
        p.x * (-3 * p0.y + cp1.y + 2 * cp2.y)) *
        3) / 20;
        
    return absolute ? Math.abs(area) : area;
}

function getPolygonArea(points, absolute=false) {
    let area = 0;
    let l = points.length;
    for (let i = 0; l && i < l; i++) {
        let addX = points[i].x;
        let addY = points[i === points.length - 1 ? 0 : i + 1].y;
        let subX = points[i === points.length - 1 ? 0 : i + 1].x;
        let subY = points[i].y;
        area += addX * addY * 0.5 - subX * subY * 0.5;
    }
    if(absolute) area=Math.abs(area);
    return area;
}

/**
* serialize pathData array to 
* d attribute string 
*/

function pathDataToD(pathData, optimize = 0) {

    optimize = parseFloat(optimize);

    let len = pathData.length;
    let beautify = optimize > 1;
    let minify = beautify || optimize ? false : true;

    let d = '';
    let separator_command = beautify ? `\n` : (minify ? '' : ' ');
    let separator_type =  !minify ? ' ' : '';

    d = `${pathData[0].type}${separator_type}${pathData[0].values.join(" ")}${separator_command}`;

    for (let i = 1; i < len; i++) {
        let com0 = pathData[i - 1];
        let com = pathData[i];
        let { type, values } = com;

        // Minify Arc commands (A/a) – actually sucks!
        if (minify && (type === 'A' || type === 'a')) {
            values = [
                values[0], values[1], values[2],
                `${values[3]}${values[4]}${values[5]}`,
                values[6]
            ];
        }

        // Omit type for repeated commands
        type = (minify && com0.type === com.type && com.type.toLowerCase() !== 'm' )
            ? " "
            : (minify && com0.type === "M" && com.type === "L"
                ? " "
                : com.type);

        // concatenate subsequent floating point values
        if (minify) {

            let valsString = '';
            let prevWasFloat = false;

            for (let v = 0, l = values.length; v < l; v++) {
                let val = values[v];
                let valStr = val.toString();
                let isFloat = valStr.includes('.');
                let isSmallFloat = isFloat && Math.abs(val) < 1;

                // Remove leading zero from small floats *only* if the previous was also a float
                if (isSmallFloat && prevWasFloat) {
                    valStr = valStr.replace(/^0\./, '.');
                }

                // Add space unless this is the first value OR previous was a small float
                if (v > 0 && !(prevWasFloat && isSmallFloat)) {
                    valsString += ' ';
                }

                valsString += valStr;
                prevWasFloat = isSmallFloat;
            }

            d += `${type}${separator_type}${valsString}${separator_command}`;

        }
        // regular non-minified output
        else {
            d += `${type}${separator_type}${values.join(' ')}${separator_command}`;
        }
    }

    if (minify) {
        d = d
            .replace(/ 0\./g, " .") // Space before small decimals
            .replace(/ -/g, "-")     // Remove space before negatives
            .replace(/-0\./g, "-.")  // Remove leading zero from negative decimals
            .replace(/Z/g, "z");     // Convert uppercase 'Z' to lowercase
    }

    return d;
}

function getCombinedByDominant(com1, com2, maxDist = 0, tolerance = 1, debug = false) {

    // cubic Bézier derivative
    const cubicDerivative = (p0, p1, p2, p3, t) => {
        let mt = 1 - t;

        return {
            x:
                3 * mt * mt * (p1.x - p0.x) +
                6 * mt * t * (p2.x - p1.x) +
                3 * t * t * (p3.x - p2.x),
            y:
                3 * mt * mt * (p1.y - p0.y) +
                6 * mt * t * (p2.y - p1.y) +
                3 * t * t * (p3.y - p2.y)
        };
    };

    // if combining fails return original commands
    let commands = [com1, com2];

    // detect dominant 
    let dist1 = getDistAv(com1.p0, com1.p);
    let dist2 = getDistAv(com2.p0, com2.p);

    let reverse = dist1 > dist2;

    // backup original commands
    let com1_o = JSON.parse(JSON.stringify(com1));
    let com2_o = JSON.parse(JSON.stringify(com2));

    let ptI = checkLineIntersection(com1_o.p0, com1_o.cp1, com2_o.p, com2_o.cp2, false);

    if (!ptI) {

        return commands
    }

    if (reverse) {
        let com2_R = {
            p0: { x: com1.p.x, y: com1.p.y },
            cp1: { x: com1.cp2.x, y: com1.cp2.y },
            cp2: { x: com1.cp1.x, y: com1.cp1.y },
            p: { x: com1.p0.x, y: com1.p0.y },
        };

        let com1_R = {
            p0: { x: com2.p.x, y: com2.p.y },
            cp1: { x: com2.cp2.x, y: com2.cp2.y },
            cp2: { x: com2.cp1.x, y: com2.cp1.y },
            p: { x: com2.p0.x, y: com2.p0.y },
        };

        com1 = com1_R;
        com2 = com2_R;
    }

    let add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
    let sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    let mul = (a, s) => ({ x: a.x * s, y: a.y * s });
    let dot = (a, b) => a.x * b.x + a.y * b.y;

    // estimate extrapolation parameter t0

    let B0 = com2.p0;
    let D0 = cubicDerivative(
        com2.p0,
        com2.cp1,
        com2.cp2,
        com2.p,
        0
    );

    let v = sub(com1.p0, B0);

    // first-order projection onto tangent
    let t0 = dot(v, D0) / dot(D0, D0);

    // refine with one Newton iteration (optional but cheap)
    let P = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], t0);
    let dP = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, t0);
    let r = sub(P, com1.p0);

    t0 -= dot(r, dP) / dot(dP, dP);

    // construct merged cubic over [t0, 1]
    let Q0 = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], t0);
    let Q3 = com2.p;

    let d0 = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, t0);
    let d1 = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, 1);

    let scale = 1 - t0;

    let Q1 = add(Q0, mul(d0, scale / 3));
    let Q2 = sub(Q3, mul(d1, scale / 3));

    let result = {
        p0: Q0,
        cp1: Q1,
        cp2: Q2,
        p: Q3,
        t0
    };

    if (reverse) {
        result = {
            p0: Q3,
            cp1: Q2,
            cp2: Q1,
            p: Q0,
            t0
        };
    }

    let tMid = (1 - t0) * 0.5;

    let ptM = pointAtT([result.p0, result.cp1, result.cp2, result.p], tMid, false, true);
    let seg1_cp2 = ptM.cpts[2];

    let ptI_1 = checkLineIntersection(ptM, seg1_cp2, result.p0, ptI, false);
    let ptI_2 = checkLineIntersection(ptM, seg1_cp2, result.p, ptI, false);

    let cp1_2 = interpolate(result.p0, ptI_1, 1.333  );
    let cp2_2 = interpolate(result.p, ptI_2, 1.333  );

    // test self intersections and exit 
    let cp_intersection = checkLineIntersection(com1_o.p0, cp1_2, com2_o.p, cp2_2, true);
    if (cp_intersection) {

        return commands;
    }

    if (debug) renderPoint(markers, ptM, 'purple');

    result.cp1 = cp1_2;
    result.cp2 = cp2_2;

    // check distances between original starting point and extrapolated
    let dist3 = getDistAv(com1_o.p0, result.p0);
    let dist4 = getDistAv(com2_o.p, result.p);
    let dist5 = (dist3 + dist4);

    // use original points
    result.p0 = com1_o.p0;
    result.p = com2_o.p;
    result.extreme = com2_o.extreme;
    result.corner = com2_o.corner;
    result.dimA = com2_o.dimA;
    result.directionChange = com2_o.directionChange;
    result.type = 'C';
    result.values = [result.cp1.x, result.cp1.y, result.cp2.x, result.cp2.y, result.p.x, result.p.y];

    // extrapolated starting point is not completely off
    if (dist5 < maxDist) {

        /*
        let tTotal = 1 + Math.abs(t0);
        let tSplit = reverse ? 1 + t0 : Math.abs(t0);

        let pO = pointAtT([com2_o.p0, com2_o.cp1, com2_o.cp2, com2_o.p], t0);
*/

        // split t to meet original mid segment start point
        let tSplit = reverse ? 1 + t0 : Math.abs(t0);

        let tTotal = 1 + Math.abs(t0);
        tSplit = reverse ? 1 + t0 : Math.abs(t0) / tTotal;

        let ptSplit = pointAtT([result.p0, result.cp1, result.cp2, result.p], tSplit);
        let distSplit = getDistAv(ptSplit, com1.p);

        // not close enough - exit
        if (distSplit > maxDist * tolerance ) {

            return commands;
        }

        // compare combined with original area
        let pathData0 = [
            { type: 'M', values: [com1_o.p0.x, com1_o.p0.y] },
            { type: 'C', values: [com1_o.cp1.x, com1_o.cp1.y, com1_o.cp2.x, com1_o.cp2.y, com1_o.p.x, com1_o.p.y] },
            { type: 'C', values: [com2_o.cp1.x, com2_o.cp1.y, com2_o.cp2.x, com2_o.cp2.y, com2_o.p.x, com2_o.p.y] },
        ];

        let area0 = getPathArea(pathData0);
        let pathDataN = [
            { type: 'M', values: [result.p0.x, result.p0.y] },
            { type: 'C', values: [result.cp1.x, result.cp1.y, result.cp2.x, result.cp2.y, result.p.x, result.p.y] },
        ];

        let areaN = getPathArea(pathDataN);
        let areaDiff = Math.abs(areaN / area0 - 1);

        result.error = areaDiff * 5 * tolerance;

        if (debug) {
            let d = pathDataToD(pathDataN);
            renderPath(markers, d, 'orange');
        }

        // success!!!
        if (areaDiff < 0.05 * tolerance) {
            commands = [result];

        } 
    }

    return commands

}

function simplifyPathDataCubic(pathData, {
    keepExtremes = true,
    keepInflections = true,
    keepCorners = true,
    extrapolateDominant = true,
    tolerance = 1,
} = {}) {

    let pathDataN = [pathData[0]];
    let l = pathData.length;

    for (let i = 2; l && i <= l; i++) {
        let com = pathData[i - 1];
        let comN = i < l ? pathData[i] : null;
        let typeN = comN?.type || null;

        let { type, values, p0, p, cp1 = null, cp2 = null, extreme = false, directionChange = false, corner = false, dimA = 0 } = com;

        // next is also cubic
        if (type === 'C' && typeN === 'C') {

            // cannot be combined as crossing extremes or corners
            if (

                (keepCorners && corner) ||

                (keepExtremes && extreme)
            ) {

                pathDataN.push(com);
            }

            // try simplification
            else {

                let combined = combineCubicPairs(com, comN, { tolerance });
                let error = 0;

                // combining successful! try next segment
                if (combined.length === 1) {
                    com = combined[0];
                    let offset = 1;

                    // add cumulative error to prevent distortions
                    error += com.error;

                    // find next candidates
                    for (let n = i + 1; error < tolerance && n < l; n++) {
                        let comN = pathData[n];

                        if (comN.type !== 'C' ||
                            (
                                (keepInflections && com.directionChange) ||
                                (keepCorners && com.corner) ||
                                (keepExtremes && com.extreme)
                            )
                        ) {
                            break
                        }

                        let combined = combineCubicPairs(com, comN, { tolerance });

                        // failure - could not be combined - exit loop
                        if (combined.length > 1) {

                            break
                        }

                        /**
                         * success
                         * add cumulative error to prevent distortions
                         */
                        error += combined[0].error * 0.5;
                        offset++;

                        // return combined
                        com = combined[0];
                    }

                    pathDataN.push(com);

                    // skip to next candidates
                    if (i < l) {
                        i += offset;
                    }

                } else {
                    pathDataN.push(com);
                }
            }

        } // end of bezier command

        // other commands
        else {
            pathDataN.push(com);
        }

    } // end command loop

    return pathDataN
}

function combineCubicPairs(com1, com2, {
    tolerance = 1
} = {}) {

    let commands = [com1, com2];

    // assume 2 segments are result of a segment split
    let t = findSplitT(com1, com2);

    // quit if t is start
    if (!t) return commands;

    let distAv1 = getDistManhattan(com1.p0, com1.p);
    let distAv2 = getDistManhattan(com2.p0, com2.p);
    let distMin = Math.max(0, Math.min(distAv1, distAv2));

    let distScale = 0.08;
    let maxDist = distMin * distScale * tolerance;

    // get hypothetical combined command
    let comS = getExtrapolatedCommand(com1, com2, t);

    // test new point-at-t against original mid segment starting point
    let pt = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t);

    let dist0 = getDistManhattan(com1.p, pt);
    let dist1 = 0, dist2 = 0;
    let close = dist0 < maxDist;
    let success = false;

    // collect error data
    let error = dist0;

    if (close) {

        /**
         * check additional points
         * to prevent distortions
         */

        // 2nd segment mid
        let pt_2 = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], 0.5);

        // simplified path
        let t3 = (1 + t) * 0.5;
        let ptS_2 = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t3);
        dist1 = getDistManhattan(pt_2, ptS_2);

        error += dist1;

        if (dist1 < maxDist) {

            // 1st segment mid
            let pt_1 = pointAtT([com1.p0, com1.cp1, com1.cp2, com1.p], 0.5);

            let t2 = t * 0.5;
            let ptS_1 = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t2);
            dist2 = getDistManhattan(pt_1, ptS_1);

            error += dist2;

            if (error < maxDist) success = true;

        }

    } // end 1st try

    // add meta
    if (success) {

        // correct to exact start and end points
        comS.p0 = com1.p0;
        comS.p = com2.p;

        comS.dimA = getDistManhattan(comS.p0, comS.p);
        comS.type = 'C';
        comS.extreme = com2.extreme;
        comS.directionChange = com2.directionChange;

        comS.corner = com2.corner;

        comS.values = [comS.cp1.x, comS.cp1.y, comS.cp2.x, comS.cp2.y, comS.p.x, comS.p.y];

        // relative error
        comS.error = error / maxDist;

        commands = [comS];

    }

    return commands;
}

function getExtrapolatedCommand(com1, com2, t = 0) {

    let { p0, cp1 } = com1;
    let { p, cp2 } = com2;

    // extrapolate control points
    cp1 = {
        x: (cp1.x - (1 - t) * p0.x) / t,
        y: (cp1.y - (1 - t) * p0.y) / t
    };

    cp2 = {
        x: (cp2.x - t * p.x) / (1 - t),
        y: (cp2.y - t * p.y) / (1 - t)
    };

    return { p0, cp1, cp2, p };
}

function findSplitT(com1, com2) {
    // distances between 1st and 2nd segment cpt to mid point
    let l1 = getDistManhattan(com1.cp2, com1.p);

    // exit for zero length control point vectors
    if (l1 === 0) {

        return 0;
    }

    let l2 = getDistManhattan(com1.p, com2.cp1);
    if (l2 === 0) {

        return 0;
    }

    // dist between both segments' control points
    let l3 = getDistManhattan(com1.cp2, com2.cp1);

    /*
    // exit for zero length control point vectors
    if(l1===0 || l2===0 || l1===l3 || l2===l3) {
        console.log('!quit');
        return 0;
    }
    */

    return l1 / l3
}

function commandIsFlat(points, {
    tolerance = 1,
    debug=false
} = {}) {

    let isFlat=false;
    let report = {
        flat:true,
        steepness:0
    };

    let p0 = points[0];
    let p = points[points.length - 1];

    let xSet = new Set([...points.map(pt => +pt.x.toFixed(8))]);
    let ySet = new Set([...points.map(pt => +pt.y.toFixed(8))]);

    // must be flat
    if(xSet.size===1 || ySet.size===1) return !debug ? true : report;

    let squareDist = getSquareDistance(p0, p);
    let threshold = squareDist / 1000 * tolerance;
    let area = getPolygonArea(points, true);

    // flat enough
    if(area < threshold) isFlat = true;

    if(debug){
        report.flat = isFlat;

        report.steepness = area/squareDist*10;
    }

    return !debug ? isFlat : report;
}

function detectAccuracy(pathData) {
    let dims = [];

    // add average distances
    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values, p0 = null, p = null, dimA = 0 } = com;

        // use existing averave dimension value or calculate
        if (values.length && p && p0) {

            dimA = dimA ? dimA : getDistManhattan(p0, p);

            if (dimA) dims.push(dimA);

        }

    }

    let dim_min = dims.sort();
    let sliceIdx = Math.ceil(dim_min.length / 8);
    dim_min = dim_min.slice(0, sliceIdx);
    let minVal = dim_min.reduce((a, b) => a + b, 0) / sliceIdx;

    let threshold = 75;
    let decimalsAuto = minVal > threshold * 1.5 ? 0 : Math.floor(threshold / minVal).toString().length;

    // clamp
    return Math.min(Math.max(0, decimalsAuto), 8)

}

function roundTo(num = 0, decimals = 3) {
    if (!decimals) return Math.round(num);
    let factor = 10 ** decimals;
    return Math.round(num * factor) / factor;
}

/**
 * round path data
 * either by explicit decimal value or
 * based on suggested accuracy in path data
 */
function roundPathData(pathData, decimals = -1) {

    if (decimals < 0) return pathData;

    let len = pathData.length;

    for (let c = 0; c < len; c++) {

        let values = pathData[c].values;
        let valLen = values.length;
        if (!valLen) continue

        for (let v = 0; v < valLen; v++) {

            pathData[c].values[v] = roundTo(values[v], decimals);
        }
    }

    return pathData;
}

/**
 * create pathdata super set 
 * including geometrical properties such as:
 * segment introduces x/y extreme
 * corner
 * inflection/direction change
 */

function analyzePathData(pathData = [], {
    detectExtremes = true,
    detectCorners = true,
    detectDirection = true,
    detectSemiExtremes = false,
    debug = false,
    addSquareLength = true,
    addArea = true,

} = {}) {

    // get verbose control point data
    pathData = getPathDataVerbose(pathData, { addSquareLength, addArea });

    // new pathdata adding properties
    let pathDataPlus = [];

    let pathPoly = getPathDataVertices(pathData);
    let bb = getPolyBBox(pathPoly);
    let { left, right, top, bottom, width, height } = bb;

    // init starting point data
    pathData[0].corner = false;
    pathData[0].extreme = false;
    pathData[0].semiExtreme = false;
    pathData[0].directionChange = false;
    pathData[0].closePath = false;

    // add first M command
    let pathDataProps = [pathData[0]];
    let len = pathData.length;

    for (let c = 2; len && c <= len; c++) {

        let com = pathData[c - 1];
        let { type, values, p0, p, cp1 = null, cp2 = null, squareDist = 0, cptArea = 0, dimA = 0 } = com;

        let comN = pathData[c] || null;

        // init properties
        com.corner = false;
        com.extreme = false;
        com.semiExtreme = false;
        com.directionChange = false;
        com.closePath = false;

        // get command points  
        let commandPts = (type === 'C' || type === 'Q') ?
            (type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p]) :
            ([p0, p]);
        let thresholdLength = dimA * 0.1;

        // bezier types
        let isBezier = type === 'Q' || type === 'C';
        let isBezierN = comN && (comN.type === 'Q' || comN.type === 'C');

        /**
         * detect extremes
         * local or absolute 
         */
        let hasExtremes = false;

        if (isBezier) {

            let dx = type === 'C' ? Math.abs(com.cp2.x - com.p.x) : Math.abs(com.cp1.x - com.p.x);
            let dy = type === 'C' ? Math.abs(com.cp2.y - com.p.y) : Math.abs(com.cp1.y - com.p.y);

            let horizontal = dy === 0 && dx > 0;
            let vertical = dx === 0 && dy > 0;

            if (horizontal || vertical) hasExtremes = true;

            // is extreme relative to bounding box 
            if ((p.x === left || p.y === top || p.x === right || p.y === bottom)) {
                hasExtremes = true;
            }

            // interpret segment as extreme if it has an implicit extreme
            if (!hasExtremes) {
                let couldHaveExtremes = bezierhasExtreme(null, commandPts);
                if (couldHaveExtremes) {
                    let tArr = getTatAngles(commandPts);
                    if (tArr.length && (tArr[0] > 0.15)) {
                        hasExtremes = true;
                    }
                }
            }
        }

        if (hasExtremes) com.extreme = true;

        // Corners and semi extremes 
        if (isBezier && isBezierN) {

            // semi extremes
            if (detectSemiExtremes && !com.extreme) {

                let dx1 = Math.abs(p.x - cp2.x);
                let dy1 = Math.abs(p.y - cp2.y);
                let hasSemiExtreme = false;

                // exclude extremes or small deltas
                if (dx1 && dy1 && dx1 > thresholdLength || dy1 > thresholdLength) {
                    let ang1 = getAngle(cp2, p);
                    let ang2 = getAngle(p, comN.cp1);

                    let ang3 = Math.abs(ang1 + ang2) / 2;
                    hasSemiExtreme = isMultipleOf45(ang3);
                }

                if (hasSemiExtreme) {
                    com.semiExtreme = true;
                }
            }

            /**
             * Detect direction change points
             * this will prevent distortions when simplifying
             * e.g in the "spine" of an "S" glyph
             */
            let signChange = (com.cptArea < 0 && comN.cptArea > 0) || (com.cptArea > 0 && comN.cptArea < 0) ? true : false;

            if (signChange) com.directionChange = true;

            // check corners
            if (!com.extreme) {

                let cp_0 = cp2 ? cp2 : cp1;
                let cp_1 = comN.cp1;

                let areaCpt = getPolygonArea([cp_0, p, cp_1], false);
                let threshArea = getSquareDistance(cp_0, cp_1) * 0.01;
                let isFlat = Math.abs(areaCpt) < threshArea;

                let signChange2 = (areaCpt < 0 && com.cptArea > 0) || (areaCpt > 0 && com.cptArea < 0) ? true : false;

                let isCorner=!isFlat && signChange2;
                if (isCorner) com.corner = true;
            }
        }

        if (debug) {

            if (com.directionChange) renderPoint(markers, com.p, 'orange', '1.5%', '0.5');
            if (com.corner) renderPoint(markers, com.p, 'magenta', '1.5%', '0.5');
            if (com.extreme) renderPoint(markers, com.p, 'cyan', '1%', '0.5');

        }

        pathDataProps.push(com);

    }

    let dimA = (width + height) / 2;

    pathDataPlus = { pathData: pathDataProps, bb: bb, dimA: dimA };

    return pathDataPlus

}

/**
 * create pathdata super set 
 * including geometrical properties such as:
 * start and end points
 * segment square distances and areas
 * elliptic arc parameters
 */
function getPathDataVerbose(pathData, {
    addSquareLength = true,
    addArea = false,
    addArcParams = false,
    addAverageDim = true
} = {}) {

    // initial starting point coordinates
    let com0 = pathData[0];
    let M = { x: com0.values[0], y: com0.values[1] };
    let p0 = M;
    let p = M;

    com0.p0 = p0;
    com0.p = p;
    com0.idx = 0;
    com0.dimA = 0;

    let len = pathData.length;
    let pathDataVerbose = [com0];

    for (let i = 1; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valuesLen = values.length;

        p = valuesLen ? { x: values[valuesLen - 2], y: values[valuesLen - 1] } : M;
        let cp1, cp2;

        // add on-path points
        com.p0 = p0;
        com.p = p;
        com.dimA = getDistManhattan(p0, p);

        // update M for Z starting points
        if (type === 'M') {
            M = p;
        }

        // add bezier control point properties
        if (type === 'Q' || type === 'C') {
            cp1 = { x: values[0], y: values[1] };
            cp2 = type === 'C' ? { x: values[2], y: values[3] } : null;
            com.cp1 = cp1;
            if (cp2) {
                com.cp2 = cp2;
            }
        }

        else if (type === 'A') {
            let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle } = svgArcToCenterParam(p0.x, p0.y, ...values);
            com.cx = cx;
            com.cy = cy;
            com.rx = rx;
            com.ry = ry;
            com.xAxisRotation = values[2] / 180 * Math.PI;
            com.largeArc = values[3];
            com.sweep = values[4];
            com.startAngle = startAngle;
            com.endAngle = endAngle;
            com.deltaAngle = deltaAngle;
        }

        /**
         * explicit and implicit linetos 
         * - introduced by Z
         */
        if (type === 'Z') {
            // if Z introduces an implicit lineto with a length
            if (M.x !== p.x && M.y !== p.y) {
                com.closePath = true;
            }
        }

        if (addSquareLength) {
            com.squareDist = getSquareDistance(p0, p);
        }

        if (addArea) {
            let cptArea = 0;
            if (type === 'C') cptArea = getPolygonArea([p0, cp1, cp2, p], false);
            if (type === 'Q') cptArea = getPolygonArea([p0, cp1, p], false);
            com.cptArea = cptArea;
        }

        com.idx = i;

        // update previous point
        p0 = p;
        pathDataVerbose.push(com);
    }

    return pathDataVerbose;
}

function revertCubicQuadratic(p0 = {}, cp1 = {}, cp2 = {}, p = {}) {

    // test if cubic can be simplified to quadratic
    let cp1X = interpolate(p0, cp1, 1.5);
    let cp2X = interpolate(p, cp2, 1.5);

    let dist0 = getDistAv(p0, p);
    let threshold = dist0 * 0.03;
    let dist1 = getDistAv(cp1X, cp2X);

    let cp1_Q = null;
    let type = 'C';
    let values = [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];
    let comN = { type, values };

    if (dist1 && threshold && dist1 < threshold) {
        cp1_Q = checkLineIntersection(p0, cp1, p, cp2, false);
        if (cp1_Q) {

            comN.type = 'Q';
            comN.values = [cp1_Q.x, cp1_Q.y, p.x, p.y];
            comN.p0 = p0;
            comN.cp1 = cp1_Q;
            comN.cp2 = null;
            comN.p = p;
        }
    }

    return comN

}

function convertPathData(pathData, {
    toShorthands = true,
    toLonghands = false,
    toRelative = true,
    toAbsolute = false,
    decimals = 3,
    arcToCubic = false,
    quadraticToCubic = false,

    // assume we need full normalization
    hasRelatives = true,
    hasShorthands = true,
    hasQuadratics = true,
    hasArcs = true,
    testTypes = false

} = {}) {

    // pathdata properties - test= true adds a manual test 
    if (testTypes) {

        let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
        hasRelatives = /[lcqamts]/gi.test(commands);
        hasQuadratics = /[qt]/gi.test(commands);
        hasArcs = /[a]/gi.test(commands);
        hasShorthands = /[vhst]/gi.test(commands);
        isPoly = /[mlz]/gi.test(commands);
    }

    // some params exclude each other
    toRelative = toAbsolute ? false : toRelative;
    toShorthands = toLonghands ? false : toShorthands;

    if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);
    if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData);

    if (toShorthands) pathData = pathDataToShorthands(pathData);
    if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData);

    if (toAbsolute) pathData = pathDataToAbsolute(pathData);

    // pre round - before relative conversion to minimize distortions
    if (decimals > -1 && toRelative) pathData = roundPathData(pathData, decimals);
    if (toRelative) pathData = pathDataToRelative(pathData);
    if (decimals > -1) pathData = roundPathData(pathData, decimals);

    return pathData
}

/**
 * convert cubic circle approximations
 * to more compact arcs
 */

function pathDataArcsToCubics(pathData, {
    arcAccuracy = 1
} = {}) {

    let pathDataCubic = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

        if (com.type === 'A') {
            // add all C commands instead of Arc
            let cubicArcs = arcToBezier$1(p0, com.values, arcAccuracy);
            cubicArcs.forEach((cubicArc) => {
                pathDataCubic.push(cubicArc);
            });
        }

        else {
            // add command
            pathDataCubic.push(com);
        }
    }

    return pathDataCubic

}

function pathDataQuadraticToCubic(pathData) {

    let pathDataQuadratic = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

        if (com.type === 'Q') {
            pathDataQuadratic.push(quadratic2Cubic(p0, com.values));
        }

        else {
            // add command
            pathDataQuadratic.push(com);
        }
    }

    return pathDataQuadratic
}

/**
 * convert quadratic commands to cubic
 */
function quadratic2Cubic(p0, values) {
    if (Array.isArray(p0)) {
        p0 = {
            x: p0[0],
            y: p0[1]
        };
    }
    let cp1 = {
        x: p0.x + 2 / 3 * (values[0] - p0.x),
        y: p0.y + 2 / 3 * (values[1] - p0.y)
    };
    let cp2 = {
        x: values[2] + 2 / 3 * (values[0] - values[2]),
        y: values[3] + 2 / 3 * (values[1] - values[3])
    };
    return ({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, values[2], values[3]] });
}

/**
 * convert pathData to 
 * This is just a port of Dmitry Baranovskiy's 
 * pathToRelative/Absolute methods used in snap.svg
 * https://github.com/adobe-webplatform/Snap.svg/
 */

function pathDataToAbsoluteOrRelative(pathData, toRelative = false, decimals = -1) {
    if (decimals >= 0) {
        pathData[0].values = pathData[0].values.map(val => +val.toFixed(decimals));
    }

    let len = pathData.length;
    let M = pathData[0].values;
    let x = M[0],
        y = M[1],
        mx = x,
        my = y;

    for (let i = 1; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let vLen = values.length;
        let typeRel = type.toLowerCase();
        let typeAbs =type.toUpperCase();
        let typeNew = toRelative ? typeRel : typeAbs;

        if (type !== typeNew) {
            com.type = typeNew;

            switch (typeRel) {
                case "a":
                    values[5] = toRelative ? values[5] - x : values[5] + x;
                    values[6] = toRelative ? values[6] - y : values[6] + y;
                    break;
                case "v":
                    values[0] = toRelative ? values[0] - y : values[0] + y;
                    break;
                case "h":
                    values[0] = toRelative ? values[0] - x : values[0] + x;
                    break;
                case "m":
                    if (toRelative) {
                        values[0] -= x;
                        values[1] -= y;
                    } else {
                        values[0] += x;
                        values[1] += y;
                    }
                    mx = toRelative ? values[0] + x : values[0];
                    my = toRelative ? values[1] + y : values[1];
                    break;
                default:
                    if (values.length) {
                        for (let v = 0; v < values.length; v++) {
                            values[v] = toRelative
                                ? values[v] - (v % 2 ? y : x)
                                : values[v] + (v % 2 ? y : x);
                        }
                    }
            }
        }

        switch (typeRel) {
            case "z":
                x = mx;
                y = my;
                break;
            case "h":
                x = toRelative ? x + values[0] : values[0];
                break;
            case "v":
                y = toRelative ? y + values[0] : values[0];
                break;
            case "m":
                mx = values[vLen - 2] + (toRelative ? x : 0);
                my = values[vLen - 1] + (toRelative ? y : 0);
            default:
                x = values[vLen - 2] + (toRelative ? x : 0);
                y = values[vLen - 1] + (toRelative ? y : 0);
        }

        if (decimals >= 0) {
            com.values = com.values.map(val => +val.toFixed(decimals));
        }
    }
    return pathData;
}

function pathDataToRelative(pathData, decimals = -1) {
    return pathDataToAbsoluteOrRelative(pathData, true, decimals)
}

function pathDataToAbsolute(pathData, decimals = -1) {
    return pathDataToAbsoluteOrRelative(pathData, false, decimals)
}

/**
 * decompose/convert shorthands to "longhand" commands:
 * H, V, S, T => L, L, C, Q
 * reversed method: pathDataToShorthands()
 */

function pathDataToLonghands(pathData, decimals = -1, test = true) {

    // analyze pathdata – if you're sure your data is already absolute skip it via test=false
    let hasRel = false;

    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('');
        let hasShorthands = /[hstv]/gi.test(commandTokens);
        hasRel = /[astvqmhlc]/g.test(commandTokens);

        if (!hasShorthands) {
            return pathData;
        }
    }

    pathData = test && hasRel ? pathDataToAbsolute(pathData, decimals) : pathData;

    let pathDataLonghand = [];
    let comPrev = {
        type: "M",
        values: pathData[0].values
    };
    pathDataLonghand.push(comPrev);

    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valuesL = values.length;
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let [x, y] = [values[valuesL - 2], values[valuesL - 1]];
        let cp1X, cp1Y, cpN1X, cpN1Y, cpN2X, cpN2Y, cp2X, cp2Y;
        let [prevX, prevY] = [
            valuesPrev[valuesPrevL - 2],
            valuesPrev[valuesPrevL - 1]
        ];
        switch (type) {
            case "H":
                comPrev = {
                    type: "L",
                    values: [values[0], prevY]
                };
                break;
            case "V":
                comPrev = {
                    type: "L",
                    values: [prevX, values[0]]
                };
                break;
            case "T":
                [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                [prevX, prevY] = [
                    valuesPrev[valuesPrevL - 2],
                    valuesPrev[valuesPrevL - 1]
                ];
                // new control point
                cpN1X = prevX + (prevX - cp1X);
                cpN1Y = prevY + (prevY - cp1Y);
                comPrev = {
                    type: "Q",
                    values: [cpN1X, cpN1Y, x, y]
                };
                break;
            case "S":

                [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                [prevX, prevY] = [
                    valuesPrev[valuesPrevL - 2],
                    valuesPrev[valuesPrevL - 1]
                ];

                [cp2X, cp2Y] =
                    valuesPrevL > 2 && comPrev.type !== 'A' ?
                        [valuesPrev[2], valuesPrev[3]] :
                        [prevX, prevY];

                // new control points
                cpN1X = 2 * prevX - cp2X;
                cpN1Y = 2 * prevY - cp2Y;
                cpN2X = values[0];
                cpN2Y = values[1];
                comPrev = {
                    type: "C",
                    values: [cpN1X, cpN1Y, cpN2X, cpN2Y, x, y]
                };

                break;
            default:
                comPrev = {
                    type: type,
                    values: values
                };
        }
        // round final longhand values
        if (decimals > -1) {
            comPrev.values = comPrev.values.map(val => { return +val.toFixed(decimals) });
        }

        pathDataLonghand.push(comPrev);
    }
    return pathDataLonghand;
}

/**
 * apply shorthand commands if possible
 * L, L, C, Q => H, V, S, T
 * reversed method: pathDataToLonghands()
 */
function pathDataToShorthands(pathData, decimals = -1, test = false) {

    /** 
    * analyze pathdata – if you're sure your data is already absolute skip it via test=false
    */
    let hasRel;
    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('');
        hasRel = /[astvqmhlc]/g.test(commandTokens);
    }

    pathData = test && hasRel ? pathDataToAbsoluteOrRelative(pathData) : pathData;

    let len = pathData.length;
    let pathDataShorts = new Array(len);

    let comShort = pathData[0];
    pathDataShorts[0] = comShort;

    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p = p0;

    for (let i = 1; i < len; i++) {

        let com = pathData[i];
        comShort = com;
        let { type, values } = com;
        let valuesLen = values.length;
        let valuesLast = [values[valuesLen - 2], values[valuesLen - 1]];

        // previous command
        let comPrev = pathData[i - 1];

        p = { x: valuesLast[0], y: valuesLast[1] };

        // deltas for h or v
        let dx = Math.abs(p.x - p0.x);
        let dy = Math.abs(p.y - p0.y);
        let maxDist = getDistManhattan(p0, p) * 0.01;

        // first bezier control point for S/T shorthand tests
        let isShort = false, isHorizontal = false, isVertical = false;

        if ((type === 'C' && comPrev.type === 'C') || (type === 'Q' && comPrev.type === 'Q')) {
            let cpPrev = comPrev.type === 'C' ? { x: comPrev.values[2], y: comPrev.values[3] } : { x: comPrev.values[0], y: comPrev.values[1] };
            let cpFirst = { x: values[0], y: values[1] };

            let dx1 = (p0.x - cpPrev.x);
            let dy1 = (p0.y - cpPrev.y);

            maxDist = getDistManhattan(cpPrev, cpFirst) * 0.05;

            // reflected cp
            let cpR = { x: cpPrev.x + dx1 * 2, y: cpPrev.y + dy1 * 2 };
            let distCp = getDistManhattan(cpR, cpFirst);

            isShort = distCp < maxDist;

        }

        else if (type === 'L') {
            isHorizontal = dy === 0 || dy < maxDist;
            isVertical = dx === 0 || dx < maxDist;
            isShort = isVertical || isHorizontal;
        }

        switch (type) {
            case "L":
                if (isHorizontal) {

                    comShort = {
                        type: "H",
                        values: [values[0]]
                    };
                }

                // V
               if (isVertical) {

                    comShort = {
                        type: "V",
                        values: [values[1]]
                    };
                } 
                break;

            case "Q":

                if (isShort) {

                    comShort = {
                        type: "T",
                        values: [p.x, p.y]
                    };
                }

                break;
            case "C":
                if (isShort) {

                    comShort = {
                        type: "S",
                        values: [values[2], values[3], p.x, p.y]
                    };
                } 
                break;
            default:
                comShort = {
                    type: type,
                    values: values
                };
        }

        p0 = p;
        pathDataShorts[i] = comShort;
    }

    return pathDataShorts;
}

/**
 * Convert a parametrized SVG arc to cubic Beziers
 * Assumes arc parameters are already resolved
 */
function arcToBezierResolved({

    // start / end points
    p0 = { x: 0, y: 0 },
    p = { x: 0, y: 0 },

    // center
    centroid = { x: 0, y: 0 },

    // radii
    rx = 0,
    ry = 0,

    // SVG-style rotation
    xAxisRotation = 0,
    radToDegree = false,

    // optional
    startAngle = null,
    endAngle = null,
    deltaAngle = null

} = {}) {

    if (!rx || !ry) return [];

    // new pathData
    let pathData = [];

    // maximum delta for cubic approximations: Math.PI / 2 (90deg)
    const maxSegAngle = 1.5707963267948966;

    // Pomax cubic constant
    const k = 0.551785;

    // rotation
    let phi = radToDegree
        ? xAxisRotation
        : xAxisRotation * Math.PI / 180;

    let cosphi = Math.cos(phi);
    let sinphi = Math.sin(phi);

    // derive angles if not provided
    if (startAngle === null || endAngle === null || deltaAngle === null) {
        ({ startAngle, endAngle, deltaAngle } = getDeltaAngle(centroid, p0, p));
    }

    // parametrize for elliptic arcs
    let startAngleParam = rx !== ry ? toParametricAngle(startAngle, rx, ry) : startAngle;

    let deltaAngleParam = rx !== ry ? toParametricAngle(deltaAngle, rx, ry) : deltaAngle;

    let segments = Math.max(1, Math.ceil(Math.abs(deltaAngleParam) / maxSegAngle));
    let angStep = deltaAngleParam / segments;

    for (let i = 0; i < segments; i++) {

        const a = Math.abs(angStep) === maxSegAngle ?
            Math.sign(angStep) * k :
            (4 / 3) * Math.tan(angStep / 4);

        let cos0 = Math.cos(startAngleParam);
        let sin0 = Math.sin(startAngleParam);
        let cos1 = Math.cos(startAngleParam + angStep);
        let sin1 = Math.sin(startAngleParam + angStep);

        // unit arc → cubic
        let c1 = { x: cos0 - sin0 * a, y: sin0 + cos0 * a };
        let c2 = { x: cos1 + sin1 * a, y: sin1 - cos1 * a };
        let e = { x: cos1, y: sin1 };

        let values = [];

        [c1, c2, e].forEach(pt => {
            let x = pt.x * rx;
            let y = pt.y * ry;

            values.push(
                cosphi * x - sinphi * y + centroid.x,
                sinphi * x + cosphi * y + centroid.y
            );
        });

        pathData.push({
            type: 'C',
            values,
            cp1: { x: values[0], y: values[1] },
            cp2: { x: values[2], y: values[3] },
            p: { x: values[4], y: values[5] },
        });

        startAngleParam += angStep;
    }

    return pathData;
}

/** 
 * convert arctocommands to cubic bezier
 * based on puzrin's a2c.js
 * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
 * returns pathData array
*/

function arcToBezier$1(p0, values, splitSegments = 1) {
    const TAU = Math.PI * 2;
    let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

    if (rx === 0 || ry === 0) {
        return []
    }

    let phi = rotation ? rotation * TAU / 360 : 0;
    let sinphi = phi ? Math.sin(phi) : 0;
    let cosphi = phi ? Math.cos(phi) : 1;
    let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2;
    let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2;

    if (pxp === 0 && pyp === 0) {
        return []
    }
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    let lambda =
        pxp * pxp / (rx * rx) +
        pyp * pyp / (ry * ry);
    if (lambda > 1) {
        let lambdaRt = Math.sqrt(lambda);
        rx *= lambdaRt;
        ry *= lambdaRt;
    }

    /** 
     * parametrize arc to 
     * get center point start and end angles
     */
    let rxsq = rx * rx,
        rysq = rx === ry ? rxsq : ry * ry;

    let pxpsq = pxp * pxp,
        pypsq = pyp * pyp;
    let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq);

    if (radicant <= 0) {
        radicant = 0;
    } else {
        radicant /= (rxsq * pypsq) + (rysq * pxpsq);
        radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);
    }

    let centerxp = radicant ? radicant * rx / ry * pyp : 0;
    let centeryp = radicant ? radicant * -ry / rx * pxp : 0;
    let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2;
    let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2;

    let vx1 = (pxp - centerxp) / rx;
    let vy1 = (pyp - centeryp) / ry;
    let vx2 = (-pxp - centerxp) / rx;
    let vy2 = (-pyp - centeryp) / ry;

    // get start and end angle
    const vectorAngle = (ux, uy, vx, vy) => {
        let dot = +(ux * vx + uy * vy).toFixed(9);
        if (dot === 1 || dot === -1) {
            return dot === 1 ? 0 : Math.PI
        }
        dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot);
        let sign = (ux * vy - uy * vx < 0) ? -1 : 1;
        return sign * Math.acos(dot);
    };

    let ang1 = vectorAngle(1, 0, vx1, vy1),
        ang2 = vectorAngle(vx1, vy1, vx2, vy2);

    if (sweepFlag === 0 && ang2 > 0) {
        ang2 -= Math.PI * 2;
    }
    else if (sweepFlag === 1 && ang2 < 0) {
        ang2 += Math.PI * 2;
    }

    let ratio = +(Math.abs(ang2) / (TAU / 4)).toFixed(0) || 1;

    // increase segments for more accureate length calculations
    let segments = ratio * splitSegments;
    ang2 /= segments;
    let pathDataArc = [];

    // If 90 degree circular arc, use a constant
    // https://pomax.github.io/bezierinfo/#circles_cubic
    // k=0.551784777779014
    const angle90 = 1.5707963267948966;
    const k = 0.551785;
    let a = ang2 === angle90 ? k :
        (
            ang2 === -angle90 ? -k : 4 / 3 * Math.tan(ang2 / 4)
        );

    let cos2 = ang2 ? Math.cos(ang2) : 1;
    let sin2 = ang2 ? Math.sin(ang2) : 0;
    let type = 'C';

    const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
        let x1 = ang1 != ang2 ? Math.cos(ang1) : cos2;
        let y1 = ang1 != ang2 ? Math.sin(ang1) : sin2;
        let x2 = Math.cos(ang1 + ang2);
        let y2 = Math.sin(ang1 + ang2);

        return [
            { x: x1 - y1 * a, y: y1 + x1 * a },
            { x: x2 + y2 * a, y: y2 - x2 * a },
            { x: x2, y: y2 }
        ];
    };

    for (let i = 0; i < segments; i++) {
        let com = { type: type, values: [] };
        let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

        curve.forEach((pt) => {
            let x = pt.x * rx;
            let y = pt.y * ry;
            com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery);
        });
        pathDataArc.push(com);
        ang1 += ang2;
    }

    return pathDataArc;
}

/**
 * parse normalized
 */

function normalizePathData(pathData = [],
    {
        toAbsolute = true,
        toLonghands = true,
        quadraticToCubic = false,
        arcToCubic = false,
        arcAccuracy = 2,

        // assume we need full normalization
        hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true, testTypes = false

    } = {}
) {

    // pathdata properties - test= true adds a manual test 
    if (testTypes) {

        let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
        hasRelatives = /[lcqamts]/gi.test(commands);
        hasQuadratics = /[qt]/gi.test(commands);
        hasArcs = /[a]/gi.test(commands);
        hasShorthands = /[vhst]/gi.test(commands);
        isPoly = /[mlz]/gi.test(commands);
    }

    /**
     * normalize:
     * convert to all absolute
     * all longhands
     */

    if ((hasQuadratics && quadraticToCubic) || (hasArcs && arcToCubic)) {
        toLonghands = true;
        toAbsolute = true;
    }

    if (hasRelatives && toAbsolute) pathData = pathDataToAbsoluteOrRelative(pathData, false);
    if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData, -1, false);
    if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData, arcAccuracy);
    if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);

    return pathData;

}

function parsePathDataNormalized(d,
    {
        // necessary for most calculations
        toAbsolute = true,
        toLonghands = true,

        // not necessary unless you need cubics only
        quadraticToCubic = false,

        // mostly a fallback if arc calculations fail      
        arcToCubic = false,
        // arc to cubic precision - adds more segments for better precision     
        arcAccuracy = 4,
    } = {}
) {

    // is already array
    let isArray = Array.isArray(d);

    // normalize native pathData to regular array
    let hasConstructor = isArray && typeof d[0] === 'object' && typeof d[0].constructor === 'function';
    /*
    if (hasConstructor) {
        d = d.map(com => { return { type: com.type, values: com.values } })
        console.log('hasConstructor', hasConstructor, (typeof d[0].constructor), d);
    }
    */

    let pathDataObj = isArray ? d : parsePathDataString(d);

    let { hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true } = pathDataObj;
    let pathData = hasConstructor ? pathDataObj : pathDataObj.pathData;

    // normalize
    pathData = normalizePathData(pathData,
        { toAbsolute, toLonghands, quadraticToCubic, arcToCubic, arcAccuracy,
        hasRelatives, hasShorthands, hasQuadratics, hasArcs 
        },
    );

    return pathData;
}

const commandSet = new Set([
    0x4D, 0x6D, 0x41, 0x61, 0x43, 0x63,
    0x4C, 0x6C, 0x51, 0x71, 0x53, 0x73,
    0x54, 0x74, 0x48, 0x68, 0x56, 0x76,
    0x5A, 0x7A
]);

const paramCountsArr = new Uint8Array(128);
// M starting point
paramCountsArr[0x4D] = 2;
paramCountsArr[0x6D] = 2;

// A Arc
paramCountsArr[0x41] = 7;
paramCountsArr[0x61] = 7;

// C Cubic Bézier
paramCountsArr[0x43] = 6;
paramCountsArr[0x63] = 6;

// L Line To
paramCountsArr[0x4C] = 2;
paramCountsArr[0x6C] = 2;

// Q Quadratic Bézier
paramCountsArr[0x51] = 4;
paramCountsArr[0x71] = 4;

// S Smooth Cubic Bézier
paramCountsArr[0x53] = 4;
paramCountsArr[0x73] = 4;

// T Smooth Quadratic Bézier
paramCountsArr[0x54] = 2;
paramCountsArr[0x74] = 2;

// H Horizontal Line
paramCountsArr[0x48] = 1;
paramCountsArr[0x68] = 1;

// V Vertical Line
paramCountsArr[0x56] = 1;
paramCountsArr[0x76] = 1;

// Z Close Path
paramCountsArr[0x5A] = 0;
paramCountsArr[0x7A] = 0;

const SPECIAL_SPACES = new Set([
    0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
    0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
]);

const isSpace = (ch) => {
    return (ch === 0x20) || (ch === 0x002C) || // White spaces or comma
        (ch === 0x0A) || (ch === 0x0D) ||   // nl cr
        (ch === 0x2028) || (ch === 0x2029) || // Line terminators
        (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
        (ch >= 0x1680 && SPECIAL_SPACES.has(ch));
};

const sanitizeArc = (val='', valueIndex=0) => {
    let valLen = val.length;

    // large arc and sweep
    if (valueIndex === 3 && valLen === 2) {

        val = [+val[0], +val[1]];
        valueIndex++;
    }

    // sweep and final
    else if (valueIndex === 4 && valLen > 1) {

        val = [+val[0], +val.substring(1)];
        valueIndex++;
    }

    // large arc, sweep and final pt combined
    else if (valueIndex === 3 && valLen >= 3) {

        val = [+val[0], +val[1], +val.substring(2)];
        valueIndex += 2;
    }
    else {
        val = [+val];
    }

    return {val,valueIndex} ;

};

function parsePathDataString(d, debug = true) {
    d = d.trim();

    let pathDataObj = {
        pathData: [],
        hasRelatives: false,
        hasShorthands: false,
        hasArcs: false,
        hasQuadratics: false,
        isPolygon: false,
        log:[]
    };

    if (d === '') {
        return pathDataObj
    }

    let i = 0, len = d.length;
    let lastCommand = "";

    let itemCount = -1;
    let val = '';
    let wasE = false;
    let floatCount = 0;
    let valueIndex = 0;
    let maxParams = 0;
    let needsNewSegment = false;
    let foundCommands = new Set([]);

    // collect errors 

    let feedback;

    const addSeg = () => {
        // Create new segment if needed before adding the minus sign
        if (needsNewSegment) {

            // sanitize implicit linetos
            if (lastCommand === 'M') lastCommand = 'L';
            else if (lastCommand === 'm') lastCommand = 'l';

            pathDataObj.pathData.push({ type: lastCommand, values: [] });

            itemCount++;
            valueIndex = 0;
            needsNewSegment = false;
        }
    };

    const pushVal = (checkFloats = false) => {

        // regular value or float
        if (!checkFloats ? val !== '' : floatCount > 0) {

            // error: no first command
            if (debug && itemCount === -1) {

                feedback = 'Pathdata must start with M command';
                pathDataObj.log.push(feedback);

                // add M command to collect subsequent errors
                lastCommand = 'M';
                pathDataObj.pathData.push({ type: lastCommand, values: [] });
                maxParams = 2;
                valueIndex = 0;
                itemCount++;

            }

            if (lastCommand === 'A' || lastCommand === 'a') {
                ({val,valueIndex}  = sanitizeArc(val, valueIndex));

                pathDataObj.pathData[itemCount].values.push(...val);

            } else {
                // error: leading zeroes
                if (debug && val[1] && val[1] !== '.' && val[0] === '0') {
                    feedback = `${itemCount}. command: Leading zeros not valid: ${val}`;
                    pathDataObj.log.push(feedback);
                }
                pathDataObj.pathData[itemCount].values.push(+val);
            }

            valueIndex++;
            val = '';
            floatCount = 0;

            // Mark that a new segment is needed if maxParams is reached
            needsNewSegment = valueIndex >= maxParams;

        }
    };

    const validateCommand = () => {

        if (itemCount > 0) {
            let lastCom = pathDataObj.pathData[itemCount];
            let valLen = lastCom.values.length;

            if ((valLen && valLen < maxParams) || (valLen && valLen > maxParams) || ((lastCommand === 'z' || lastCommand === 'Z') && valLen > 0)) {
                let diff = maxParams - valLen;
                feedback = `${itemCount}. command of type "${lastCommand}": ${diff} values too few - ${maxParams} expected`;

                let prevFeedback = pathDataObj.log[pathDataObj.log.length - 1];

                if (prevFeedback !== feedback) {
                    pathDataObj.log.push(feedback);
                }
            }
        }
    };

    let isE = false;
    let isMinusorPlus = false;
    let isDot = false;
    let charCode='';

    while (i < len) {

        charCode = d.charCodeAt(i);

        let isDigit = (charCode > 47 && charCode < 58);
        if (!isDigit) {
            isE = (charCode === 101 || charCode === 69);
            isMinusorPlus = (charCode === 45 || charCode === 43);
            isDot = charCode === 46;
        }

        /**
         * number related:
         * digit, e-notation, dot or -/+ operator
         */

        if (
            isDigit ||
            isMinusorPlus ||
            isDot ||
            isE
        ) {

            // minus or float/dot separated: 0x2D=hyphen; 0x2E=dot
            if (!wasE && (charCode === 0x2D || charCode === 0x2E)) {

                // checkFloats changes condition for value adding
                let checkFloats = charCode === 0x2E;

                // new val
                pushVal(checkFloats);

                // new segment
                addSeg();

                // concatenated floats
                if (checkFloats) {
                    floatCount++;
                }
            }

            // regular splitting
            else {

                addSeg();
            }

            val += d[i];

            // e/scientific notation in value
            wasE = isE;
            i++;
            continue;
        }

        /**
         * Separated by white space 
         */
        if ((charCode < 48 || charCode > 5759) && isSpace(charCode)) {

            // push value
            pushVal();

            i++;
            continue;
        }

        /**
         * New command introduced by
         * alphabetic A-Z character
         */
        if (charCode > 64) {

            // is valid command
            let isValid = commandSet.has(charCode);

            if (!isValid) {
                feedback = `${itemCount}. command "${d[i]}" is not a valid type`;
                pathDataObj.log.push(feedback);
                i++;
                continue
            }

            // command is concatenated without whitespace
            if (val !== '') {
                pathDataObj.pathData[itemCount].values.push(+val);
                valueIndex++;
                val = '';
            }

            // check if previous command was correctly closed
            if (debug) validateCommand();

            lastCommand = d[i];
            maxParams = paramCountsArr[charCode];
            let isM = lastCommand === 'M' || lastCommand === 'm';
            let wasClosePath = itemCount > 0 && (pathDataObj.pathData[itemCount].type === 'z' || pathDataObj.pathData[itemCount].type === 'Z');

            foundCommands.add(lastCommand);

            // add omitted M command after Z
            if (wasClosePath && !isM) {
                pathDataObj.pathData.push({ type: 'm', values: [0, 0] });
                itemCount++;
            }

            // init new command
            pathDataObj.pathData.push({ type: lastCommand, values: [] });
            itemCount++;

            // reset counters
            floatCount = 0;
            valueIndex = 0;
            needsNewSegment = false;

            i++;
            continue;
        }

        // exceptions - prevent infinite loop
        if (!isDigit) {
            feedback = `${itemCount}. ${d[i]} is not a valid separarator or token`;
            pathDataObj.log.push(feedback);
            val = '';
        }

        i++;

    }

    // final value
    pushVal();
    if (debug) validateCommand();

    // return error log
    if (debug && pathDataObj.log.length) {
        feedback = 'Invalid path data:\n' + pathDataObj.log.join('\n');
        if (debug === 'log') {
            console.log(feedback);
        } else {

            console.warn(feedback);
        }
    }

    pathDataObj.pathData[0].type = 'M';

    /**
     * check if absolute/relative or 
     * shorthands are present
     * to specify if normalization is required
     */

    let commands = Array.from(foundCommands).join('');

    pathDataObj.hasRelatives = /[lcqamtsvh]/g.test(commands);
    pathDataObj.hasShorthands = /[vhst]/gi.test(commands);
    pathDataObj.hasArcs = /[a]/gi.test(commands);
    pathDataObj.hasQuadratics = /[qt]/gi.test(commands);
    pathDataObj.isPolygon = /[cqats]/gi.test(commands) ? false : true;

    return pathDataObj

}

function stringifyPathData(pathData) {
    return pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
}

function shapeElToPath(el) {

    let nodeName = el.nodeName.toLowerCase();
    if (nodeName === 'path') return el;

    let pathData = getPathDataFromEl(el);
    let d = pathData.map(com => { return `${com.type} ${com.values} ` }).join(' ');
    let attributes = [...el.attributes].map(att => att.name);

    let pathN = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathN.setAttribute('d', d);

    let exclude = ['x', 'y', 'cx', 'cy', 'dx', 'dy', 'r', 'rx', 'ry', 'width', 'height', 'points'];

    attributes.forEach(att => {
        if (!exclude.includes(att)) {
            let val = el.getAttribute(att);
            pathN.setAttribute(att, val);
        }
    });

    return pathN

}

// retrieve pathdata from svg geometry elements
function getPathDataFromEl(el, stringify = false) {

    let pathData = [];
    let type = el.nodeName;
    let atts, attNames, d, x, y, width, height, r, rx, ry, cx, cy, x1, x2, y1, y2;

    // convert relative or absolute units 
    const svgElUnitsToPixel = (el, decimals = 9) => {

        const svg = el.nodeName !== "svg" ? el.closest("svg") : el;

        // convert real life units to pixels
        const translateUnitToPixel = (value) => {

            if (value === null) {
                return 0
            }

            let dpi = 96;
            let unit = value.match(/([a-z]+)/gi);
            unit = unit ? unit[0] : "";
            let val = parseFloat(value);
            let rat;

            // no unit - already pixes/user unit
            if (!unit) {
                return val;
            }

            switch (unit) {
                case "in":
                    rat = dpi;
                    break;
                case "pt":
                    rat = (1 / 72) * 96;
                    break;
                case "cm":
                    rat = (1 / 2.54) * 96;
                    break;
                case "mm":
                    rat = ((1 / 2.54) * 96) / 10;
                    break;
                // just a default approximation
                case "em":
                case "rem":
                    rat = 16;
                    break;
                default:
                    rat = 1;
            }
            let valuePx = val * rat;
            return +valuePx.toFixed(decimals);
        };

        // svg width and height attributes
        let width = svg.getAttribute("width");
        width = width ? translateUnitToPixel(width) : 300;
        let height = svg.getAttribute("height");
        height = width ? translateUnitToPixel(height) : 150;

        let vB = svg.getAttribute("viewBox");
        vB = vB
            ? vB
                .replace(/,/g, " ")
                .split(" ")
                .filter(Boolean)
                .map((val) => {
                    return +val;
                })
            : [];

        let w = vB.length ? vB[2] : width;
        let h = vB.length ? vB[3] : height;
        let scaleX = w / 100;
        let scaleY = h / 100;
        let scalRoot = Math.sqrt((Math.pow(scaleX, 2) + Math.pow(scaleY, 2)) / 2);

        let attsH = ["x", "width", "x1", "x2", "rx", "cx", "r"];
        let attsV = ["y", "height", "y1", "y2", "ry", "cy"];

        let atts = el.getAttributeNames();
        atts.forEach((att) => {
            let val = el.getAttribute(att);
            let valAbs = val;
            if (attsH.includes(att) || attsV.includes(att)) {
                let scale = attsH.includes(att) ? scaleX : scaleY;
                scale = att === "r" && w != h ? scalRoot : scale;
                let unit = val.match(/([a-z|%]+)/gi);
                unit = unit ? unit[0] : "";
                if (val.includes("%")) {
                    valAbs = parseFloat(val) * scale;
                }

                else {
                    valAbs = translateUnitToPixel(val);
                }
                el.setAttribute(att, +valAbs);
            }
        });
    };

    svgElUnitsToPixel(el);

    const getAtts = (attNames) => {
        atts = {};
        attNames.forEach(att => {
            atts[att] = +el.getAttribute(att);
        });
        return atts
    };

    switch (type) {
        case 'path':
            d = el.getAttribute("d");
            pathData = parsePathDataNormalized(d);
            break;

        case 'rect':
            attNames = ['x', 'y', 'width', 'height', 'rx', 'ry'];
            ({ x, y, width, height, rx, ry } = getAtts(attNames));

            if (!rx && !ry) {
                pathData = [
                    { type: "M", values: [x, y] },
                    { type: "L", values: [x + width, y] },
                    { type: "L", values: [x + width, y + height] },
                    { type: "L", values: [x, y + height] },
                    { type: "Z", values: [] }
                ];
            } else {

                rx=rx? rx : ry;
                ry=ry ? ry : rx;

                if (rx > width / 2) {
                    rx = width / 2;
                }
                if (ry > height / 2) {
                    ry = height / 2;
                }
                pathData = [
                    { type: "M", values: [x + rx, y] },
                    { type: "L", values: [x + width - rx, y] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + width, y + ry] },
                    { type: "L", values: [x + width, y + height - ry] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + width - rx, y + height] },
                    { type: "L", values: [x + rx, y + height] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x, y + height - ry] },
                    { type: "L", values: [x, y + ry] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + rx, y] },
                    { type: "Z", values: [] }
                ];
            }
            break;

        case 'circle':
        case 'ellipse':

            attNames = ['cx', 'cy', 'rx', 'ry', 'r'];
            ({ cx, cy, r, rx, ry } = getAtts(attNames));

            let isCircle = type === 'circle';

            if (isCircle) {
                r = r;
                rx = r;
                ry = r;
            } else {
                rx = rx ? rx : r;
                ry = ry ? ry : r;
            }

            // simplified radii for cirecles
            let rxS = isCircle && r>=1 ? 1 : rx;
            let ryS = isCircle && r>=1 ? 1 : rx;

            pathData = [
                { type: "M", values: [cx + rx, cy] },
                { type: "A", values: [rxS, ryS, 0, 1, 1, cx - rx, cy] },
                { type: "A", values: [rxS, ryS, 0, 1, 1, cx + rx, cy] },
            ];

            break;
        case 'line':
            attNames = ['x1', 'y1', 'x2', 'y2'];
            ({ x1, y1, x2, y2 } = getAtts(attNames));
            pathData = [
                { type: "M", values: [x1, y1] },
                { type: "L", values: [x2, y2] }
            ];
            break;
        case 'polygon':
        case 'polyline':

            let points = el.getAttribute('points').replaceAll(',', ' ').split(' ').filter(Boolean);

            for (let i = 0; i < points.length; i += 2) {
                pathData.push({
                    type: (i === 0 ? "M" : "L"),
                    values: [+points[i], +points[i + 1]]
                });
            }
            if (type === 'polygon') {
                pathData.push({
                    type: "Z",
                    values: []
                });
            }
            break;
    }

    return stringify ? stringifyPathData(pathData) : pathData;

}

function pathDataRemoveColinear(pathData, {
    tolerance = 1,

    flatBezierToLinetos = true
} = {}) {

    let pathDataN = [pathData[0]];

    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p0 = M;
    let p = M;
    pathData[pathData.length - 1].type.toLowerCase() === 'z';

    for (let c = 1, l = pathData.length; c < l; c++) {

        let com = pathData[c];
        let comN = pathData[c + 1] || pathData[l - 1];

        let p1 = comN.type.toLowerCase() === 'z' ? M : { x: comN.values[comN.values.length - 2], y: comN.values[comN.values.length - 1] };

        let { type, values } = com;
        let valsL = values.slice(-2);
        p = type !== 'Z' ? { x: valsL[0], y: valsL[1] } : M;

        let area = p1 ? getPolygonArea([p0, p, p1], true) : Infinity;
        let distSquare = getSquareDistance(p0, p1);
        let distMax = distSquare ? distSquare / 333 * tolerance : 0;

        let isFlat = area < distMax;

        let isFlatBez = false;

        /*
        // flatness by cross product 
        let dx0 = Math.abs(p1.x - p0.x)
        let dy0 = Math.abs(p1.y - p0.y)

        let dx1 = Math.abs(p.x - p0.x)
        let dy1 = Math.abs(p.y - p0.y)

        let dx2 = Math.abs(p1.x - p.x)
        let dy2 = Math.abs(p1.y - p.y)

        // zero length segments are flat
        let isZeroLength = (!dy1 && !dx1) || (!dy2 && !dx2)
        if (isZeroLength) isFlat = true;

        // check cross products for colinearity
        if (!isFlat) {

            let cross0 = Math.abs(dx0 * dy1 - dy0 * dx1);

            let thresh = (dx0 + dy0) * 0.1

            if ( cross0 < thresh) {

                isFlat = true
            }
        }
        */

        if (!flatBezierToLinetos && type === 'C') isFlat = false;

        // convert flat beziers to linetos
        if (flatBezierToLinetos && (type === 'C' || type === 'Q')) {

            let cpts = type === 'C' ?
                [{ x: values[0], y: values[1] }, { x: values[2], y: values[3] }] :
                (type === 'Q' ? [{ x: values[0], y: values[1] }] : []);

            isFlatBez = commandIsFlat([p0, ...cpts, p], { tolerance });

            if (isFlatBez && c < l - 1) {
                type = "L";
                com.type = "L";
                com.values = valsL;

            }
        }

        // colinear – exclude arcs (as always =) as semicircles won't have an area

        if (isFlat && c < l - 1 && comN.type !== 'A' && (type === 'L' || (flatBezierToLinetos && isFlatBez))) {

            continue;
        }

        // update end point
        p0 = p;

        if (type === 'M') {
            M = p;
        }

        // proceed and add command
        pathDataN.push(com);

    }

    return pathDataN;

}

function removeOrphanedM(pathData) {

    let pathDataN = [];
    for (let i = 0, l = pathData.length; i < l; i++) {
        let com = pathData[i];
        if (!com) continue;
        let { type = null, values = [] } = com;
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        if ((type === 'M' || type === 'm')) {

            if (!comN || (comN && (comN.type === 'Z' || comN.type === 'z'))) {
                if(comN) i++;
                continue
            }
        }
        pathDataN.push(com);
    }

    return pathDataN;

}

/*
// remove zero-length segments introduced by rounding
export function removeZeroLengthLinetos_post(pathData) {
    let pathDataOpt = []
    pathData.forEach((com, i) => {
        let { type, values } = com;
        if (type === 'l' || type === 'v' || type === 'h') {
            let hasLength = type === 'l' ? (values.join('') !== '00') : values[0] !== 0
            if (hasLength) pathDataOpt.push(com)
        } else {
            pathDataOpt.push(com)
        }
    })
    return pathDataOpt
}
*/

function removeZeroLengthLinetos(pathData) {

    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p0 = M;
    let p = p0;

    let pathDataN = [pathData[0]];

    for (let c = 1, l = pathData.length; c < l; c++) {
        let com = pathData[c];
        let comPrev = pathData[c-1]; 
        let comNext = pathData[c+1] || null;
        let { type, values } = com;

        // zero length segments are simetimes used in icons for dots
        let isDot = comPrev.type.toLowerCase() ==='m' && !comNext;

        let valsLen = values.length;
        p = { x: values[valsLen-2], y: values[valsLen-1] };

        // skip lineto
        if (!isDot && type === 'L' && p.x === p0.x && p.y === p0.y) {
            continue
        }

        // skip minified zero length
        if (!isDot && (type === 'l' || type === 'v' || type === 'h')) {
            let noLength = type === 'l' ? (values.join('') === '00') : values[0] === 0;
            if(noLength) continue
        } 

        pathDataN.push(com);
        p0 = p;
    }

    return pathDataN

}

function pathDataToTopLeft(pathData) {

    let len = pathData.length;
    let isClosed = pathData[len - 1].type.toLowerCase() === 'z';

    // we can't change starting point for non closed paths
    if (!isClosed) {
        return pathData
    }

    let newIndex = 0;

    let indices = [];
    for (let i = 0; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valsLen = values.length;
        if (valsLen) {
            let p = { type: type, x: values[valsLen-2], y: values[valsLen-1], index: 0};
            p.index = i;
            indices.push(p);
        }
    }

    // reorder  to top left most

    indices = indices.sort((a, b) => +a.y.toFixed(8) - +b.y.toFixed(8) || a.x-b.x );
    newIndex = indices[0].index;

    return  newIndex ? shiftSvgStartingPoint(pathData, newIndex) : pathData;
}

function optimizeClosePath(pathData, {removeFinalLineto = true, autoClose = true}={}) {

    let pathDataNew = [];
    let l = pathData.length;
    let M = { x: +pathData[0].values[0].toFixed(8), y: +pathData[0].values[1].toFixed(8) };
    let isClosed = pathData[l - 1].type.toLowerCase() === 'z';

    let linetos = pathData.filter(com => com.type === 'L');

    // check if order is ideal
    let idxPenultimate = isClosed ? l-2 : l-1;

    let penultimateCom = pathData[idxPenultimate];
    let penultimateType = penultimateCom.type;
    let penultimateComCoords = penultimateCom.values.slice(-2).map(val => +val.toFixed(8));

    // last L command ends at M 
    let isClosingCommand = penultimateComCoords[0] === M.x && penultimateComCoords[1] === M.y;

    // add closepath Z to enable order optimizations
    if(!isClosed && autoClose && isClosingCommand){

        /*
        // adjust final coords
        let valsLast = pathData[idxPenultimate].values
        let valsLastLen = valsLast.length;
        pathData[idxPenultimate].values[valsLastLen-2] = M.x
        pathData[idxPenultimate].values[valsLastLen-1] = M.y
        */
        
        pathData.push({type:'Z', values:[]});
        isClosed = true;
        l++;
    }

    // if last segment is not closing or a lineto
    let skipReorder = pathData[1].type !== 'L' && (!isClosingCommand || penultimateCom.type === 'L');
    skipReorder = false;

    // we can't change starting point for non closed paths
    if (!isClosed) {
        return pathData
    }

    let newIndex = 0;

    if (!skipReorder) {

        let indices = [];
        for (let i = 0; i < l; i++) {
            let com = pathData[i];
            let { type, values } = com;
            if (values.length) {
                let valsL = values.slice(-2);
                let prevL = pathData[i - 1] && pathData[i - 1].type === 'L';
                let nextL = pathData[i + 1] && pathData[i + 1].type === 'L';
                let prevCom = pathData[i - 1] ? pathData[i - 1].type.toUpperCase() : null;
                let nextCom = pathData[i + 1] ? pathData[i + 1].type.toUpperCase() : null;
                let p = { type: type, x: valsL[0], y: valsL[1], dist: 0, index: 0, prevL, nextL, prevCom, nextCom };
                p.index = i;
                indices.push(p);
            }
        }

        // find top most lineto

        if (linetos.length) {
            let curveAfterLine = indices.filter(com => (com.type !== 'L' && com.type !== 'M') && com.prevCom &&
                com.prevCom === 'L' || com.prevCom === 'M' && penultimateType === 'L').sort((a, b) => a.y - b.y || a.x - b.x)[0];

            newIndex = curveAfterLine ? curveAfterLine.index - 1 : 0;

        }
        // use top most command
        else {
            indices = indices.sort((a, b) => +a.y.toFixed(8) - +b.y.toFixed(8) || a.x - b.x);
            newIndex = indices[0].index;
        }

        // reorder 
        pathData = newIndex ? shiftSvgStartingPoint(pathData, newIndex) : pathData;
    }

    M = { x: +pathData[0].values[0].toFixed(8), y: +pathData[0].values[1].toFixed(8) };

    l = pathData.length;

    // remove last lineto
    penultimateCom = pathData[l - 2];
    penultimateType = penultimateCom.type;
    penultimateComCoords = penultimateCom.values.slice(-2).map(val=>+val.toFixed(8));

    isClosingCommand = penultimateType === 'L' && penultimateComCoords[0] === M.x && penultimateComCoords[1] === M.y;

    if (removeFinalLineto && isClosingCommand) {
        pathData.splice(l - 2, 1);
    }

    pathDataNew.push(...pathData);

    return pathDataNew
}

/**
 * shift starting point
 */
function shiftSvgStartingPoint(pathData, offset) {
    let pathDataL = pathData.length;
    let newStartIndex = 0;
    let lastCommand = pathData[pathDataL - 1]["type"];
    let isClosed = lastCommand.toLowerCase() === "z";

    if (!isClosed || offset < 1 || pathData.length < 3) {
        return pathData;
    }

    let trimRight = isClosed ? 1 : 0;

    // add explicit lineto
    addClosePathLineto(pathData);

    // M start offset
    newStartIndex =
        offset + 1 < pathData.length - 1
            ? offset + 1
            : pathData.length - 1 - trimRight;

    // slice array to reorder
    let pathDataStart = pathData.slice(newStartIndex);
    let pathDataEnd = pathData.slice(0, newStartIndex);

    // remove original M
    pathDataEnd.shift();
    let pathDataEndL = pathDataEnd.length;

    let pathDataEndLastValues, pathDataEndLastXY;
    pathDataEndLastValues = pathDataEnd[pathDataEndL - 1].values || [];
    pathDataEndLastXY = [
        pathDataEndLastValues[pathDataEndLastValues.length - 2],
        pathDataEndLastValues[pathDataEndLastValues.length - 1]
    ];

    if (trimRight) {
        pathDataStart.pop();
        pathDataEnd.push({
            type: "Z",
            values: []
        });
    }
    // prepend new M command and concatenate array chunks
    pathData = [
        {
            type: "M",
            values: pathDataEndLastXY
        },
        ...pathDataStart,
        ...pathDataEnd,
    ];

    return pathData;
}

/**
 * Add closing lineto:
 * needed for path reversing or adding points
 */

function addClosePathLineto(pathData) {

    let pathDataL = pathData.length;
    let closed = pathData[pathDataL - 1].type.toLowerCase() === "z" ? true : false;

    let M = pathData[0];
    let [x0, y0] = [M.values[0], M.values[1]].map(val => { return +val.toFixed(8) });
    let comLast = closed ? pathData[pathDataL - 2] : pathData[pathDataL - 1];
    let comLastL = comLast.values.length;

    // last explicit on-path coordinates
    let [xL, yL] = [comLast.values[comLastL - 2], comLast.values[comLastL - 1]].map(val => { return +val.toFixed(8) });

    if (closed && (x0 != xL || y0 != yL)) {

        pathData.pop();
        pathData.push(
            {
                type: "L",
                values: [x0, y0]
            },
            {
                type: "Z",
                values: []
            }
        );
    }

    return pathData;
}

function simplifyRDP(pts, {
    quality = 0.9,
    width = 0,
    height = 0,
    absolute = false,
    // use square or manhattan distances
    manhattan = false,
    exclude = []
} = {}) {

    let excludeSet = new Set(exclude);

    /**
     * switch between absolute or 
     * quality based relative thresholds
     */
    if (typeof quality === 'string') {
        absolute = true;
        quality = parseFloat(quality);
    }

    if (pts.length < 4 || (!absolute && quality) >= 1) return pts;

    // convert quality to squaredistance or manhattan tolerance
    let tolerance = quality;

    if (!absolute) {

        tolerance = 1 - quality;

        // adjust for higher qualities
        if (quality > 0.5) tolerance /= 2;

        /**
         * approximate dimensions
         * adjust tolerance for 
         * very small polygons e.g geodata
         */
        if (!width && !height) {
            let polyS = reducePoints(pts, 12);
            ({ width, height } = getPolyBBox(polyS));
        }

        if (!manhattan) {
            // average side lengths
            let dimAvg = (width + height) / 2;
            let scale = dimAvg / 100;
            tolerance = (tolerance * (scale)) ** 2;
        } else {
            // use manhattan
            tolerance = (width + height) * 0.003 * (1 - quality);
        }

    }

    const segmentDistance = (p, p1, p2, manhattan = false) => {
        let x = p1.x, y = p1.y;
        let dx = p2.x - x, dy = p2.y - y;

        if (dx !== 0 || dy !== 0) {
            let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        // use manhattan or square distance
        return !manhattan ? (p.x - x) ** 2 + (p.y - y) ** 2 : Math.abs(p.x - x) + Math.abs(p.y - y);
    };

    // start collecting ptsSmp polyline
    let ptsSmp = [pts[0]];

    // create processing stack
    let stack = [];
    stack.push([0, pts.length - 1]);

    let maxDist = tolerance;
    let currentDist = 0;
    let index = -1;
    exclude.length;

    while (stack.length > 0) {
        let [first, last] = stack.pop();
        maxDist = tolerance;
        index = -1;
    
        // Check if there is an excluded point inside this segment
        let forcedIndex = -1;
        for (let i = first + 1; i < last; i++) {
            if (excludeSet.has(i)) {
                forcedIndex = i;
                break;
            }
        }
    
        if (forcedIndex !== -1) {
            // Force split at excluded point
            stack.push([forcedIndex, last], [first, forcedIndex]);
            continue;
        }
    
        //  Normal RDP distance check
        for (let i = first + 1; i < last; i++) {
            currentDist = segmentDistance(
                pts[i],
                pts[first],
                pts[last],
                manhattan
            );
    
            if (currentDist > maxDist) {
                index = i;
                maxDist = currentDist;
            }
        }
    
        if (maxDist > tolerance) {
            stack.push([index, last], [first, index]);
        } else {
            ptsSmp.push(pts[last]);
        }
    }
    

    return ptsSmp;
}

function simplifyRD(pts, {
    quality = 0.9,
    width = 0,
    height = 0,
    absolute = false,
    // use square or manhattan distances
    manhattan = false,
    exclude = []
} = {}) {

    /**
     * switch between absolute or 
     * quality based relative thresholds
     */

    if (typeof quality === 'string') {
        let value = parseFloat(quality);
        absolute = true;
        quality = value;
    }

    // nothing to do - exit
    if (pts.length < 4 || (!absolute && quality) >= 1) return pts;

    // convert quality to squaredistance tolerance
    let tolerance = quality;

    if (!absolute) {

        // quality to tolerance
        tolerance = 1 - quality;

        /**
         * approximate dimensions
         * adjust tolerance for 
         * very small polygons e.g geodata
         */

        if (!width && !height) {
            let polyS = reducePoints(pts, 12);
            ({ width, height } = getPolyBBox(polyS));
        }

        if (!manhattan) {
            // average side lengths
            let dimAvg = (width + height) / 2;
            let scale = dimAvg / 25;
            tolerance = (tolerance * (scale)) ** 2;
        } else {
            // use manhattan
            tolerance = (width + height) * 0.05 * (1 - quality);
        }

    }

    let p0 = pts[0];
    let pt;

    // new simplified point array
    let ptsSmp = [p0];
    let l = pts.length;
    let lenExclude = exclude.length;
    let dist = 0;

    for (let i = 1; i < l; i++) {
        pt = pts[i];

        // skip
        dist = manhattan ? getDistManhattan(p0, pt) : getSquareDistance(p0, pt);

        if ( dist < tolerance && (!lenExclude || !exclude.includes(i)) ) {
            p0 = pt;
            continue
        }

        ptsSmp.push(pt);
        p0 = pt;

    }

    // add last point - if not coinciding with first point
    if (p0.x !== pt.x && p0.y !== pt.y) {
        ptsSmp.push(pt);
    }

    return ptsSmp;

}

function pathDataFromPoly(pts, closed=true){

    let pathData = [
        { type: 'M', values: [pts[0].x, pts[0].y] },
        ...pts.slice(1).map(pt => { return { type: 'L', values: [pt.x, pt.y] } })
    ];

    if(closed) pathData.push({type:'Z', values:[]});

    return pathData

}

function analyzePoly(pts, {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    debug = false
} = {}) {

    let l = pts.length;

    // bounding box of this sub poly
    let bb0 = getPolyBBox(pts);

    if (!width || !height) {
        ({ x, y, width, height } = bb0);
    }

    let thresh = (width + height) * 0.01;

    // get areas
    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        let area = getPolygonArea([p0, p1, p2], false);
        p1.area = area;
        p1.dist = getDistManhattan(p0, p1);

    }

    for (let i = 0; i < l; i++) {
        i > 1 ? pts[i - 2] : pts[l - 1];
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        let bb = getPolyBBox([p0, p2]);
        getSquareDistance(p0, p2) * 0.01;

        let area0 = Math.abs(p0.area);
        let area1 = Math.abs(p1.area);
        let area2 = Math.abs(p2.area);
        let isCorner = false;

        let flat = !p1.area || area1 < thresh;

        let { left, right, top, bottom } = bb;

        // is local or absolute extreme
        let extremeLocal = (p1.x <= left || p1.x >= right || p1.y <= top || p1.y >= bottom);

        let isExtreme = (
            // extremeLocal ||
            (p1.x === bb0.left || p1.x === bb0.right || p1.y === bb0.top || p1.y === bb0.bottom)
        );

        getDistManhattan(p1, p0);

        let isHorizontal = p1.y === p0.y && p1.x !== p0.x;
        let isVertical = p1.x === p0.x && p1.y !== p0.y;

        if ((isHorizontal || isVertical)) {
            isExtreme = true;
        }

        let signChange = (p0.area < 0 && p1.area > 0) || (p0.area > 0 && p1.area < 0);
        let isDirChange = signChange && !flat;
        isCorner = isDirChange;

        // isDirChange = signChange && signChange3

        if (extremeLocal && !p0.isDirChange) {

            isExtreme = true;
        }

        if ((isVertical && p0.isHorizontal)) {

            p0.isCorner = true;
            p0.isExtreme = false;
            isExtreme = false;
        }

        /*
        if (isExtreme && p0.isExtreme && signChange && isNear) {

            isCorner = true
        }
        */

        /*

        if (isExtreme && p0.isExtreme) {
            let dist = getDistManhattan(p1, p0)
            if (dist < thresh * 5) {

                p1.isExtreme = false
                isExtreme=false
                isCloseExtreme = true
                remove.push(i)
            }

        }
        */

        // reset if 2 in sequence
        if (isDirChange && (p0.isDirChange || p0.isExtreme)) {
            isDirChange = false;
            p1.isDirChange = false;
        }

        /*
        let areaChange = area2*1.5<area1 && area0*1.5<area1;
        if(areaChange){

        }
        */

        /*
        let thresh2 = (width + height) * 0.01
        let isLong = p1.dist > thresh2
        console.log('thresh2', p1.dist, thresh2, thresh);

        if( isLong && isDirChange){
            renderPoint(markers, p0, 'red', '1.75%', '1')
            renderPoint(markers, p1, 'green', '1.75%', '1')
        }
        */

        // corner after extreme
        if (p0.isExtreme && area1 > area2 && !isDirChange && !p1.isHorizontal) ;

        // refine corner check
        /*
        if (isCorner) {
            let delta = getDeltaAngle(p1, p0, p2)
            delta = Math.abs(delta.deltaAngleDeg)
            if (delta > 160) {

                isCorner = false;
            } else {
                isCorner = true;
            }
            console.log(delta);
        }
        */

        if ((isExtreme || signChange || area1 > area0)) {

            let delta = getDeltaAngle(p1, p2, p0);
            let { deltaAngleDeg } = delta;
            deltaAngleDeg = Math.abs(deltaAngleDeg);

            // not a corner
            if (deltaAngleDeg < 3 || deltaAngleDeg > 160) {

                isCorner = false;
            }
            else {

                isCorner = true;
            }
        }

        p1.isCorner = isCorner;
        p1.isExtreme = isExtreme;
        p1.isHorizontal = isHorizontal;
        p1.isVertical = isVertical;
        p1.isDirChange = isDirChange;

    }

    // filter adjacent extremes
    let pts1 = [];
    let exclude = [];

    for (let i = 0; i < pts.length; i++) {
        let p = pts[i];
        let p1 = pts[i + 1] || null;
        let p2 = pts[i + 2] || null;

        let extremes = [];

        if (p1 && p1.isExtreme && p.isExtreme && !p.isCorner) {
            let has2nd = p1.dist < thresh * 2 && !p1.isCorner;
            let has3rd = p2 && p2.isExtreme && p2.dist < thresh * 2 && !p2.isCorner;

            if (has2nd && !has3rd) {
                extremes.push(p, p1);

            } else if (has3rd) {
                extremes.push(p, p1, p2);
                /*
                renderPoint(markers, p, 'green', '1%', '0.5')
                renderPoint(markers, p1, 'red', '1%', '0.5')
                renderPoint(markers, p2, 'blue', '1%', '0.5')
                */
            }

            if (extremes.length) {
                // average extreme

                let x = extremes.reduce((a, b) => a + b.x, 0) / extremes.length;
                let y = extremes.reduce((a, b) => a + b.y, 0) / extremes.length;

                p.x = x;
                p.y = y;

                i += extremes.length - 1;
            }
        }

        if (p.isExtreme || p.isCorner || p.isDirChange) {
            exclude.push(pts1.length);
        }

        pts1.push(p);
    }

    // remove last nearby extreme
    let l2 = pts1.length;
    let p0 = pts1[0];
    let pL = pts1[l2 - 1];
    let near0 = getDistManhattan(p0, pL) < thresh * 2;
    if (p0.isExtreme && pL.isExtreme && near0) {
        pL.x = p0.x;
        pL.y = p0.y;
    }

    // simplify via RDP - exclude extremes

    /*
    pts1.forEach(pt=>{
        renderPoint(markers, pt, 'green', '1%', '0.5')
    })
    */

    pts = pts1;

    // test render

    return pts
}

// split in chunks based on significant points

function getPolyChunks(pts,
    { closed = true,
        keepCorners = true,
        keepExtremes = true,
        keepInflections = false
    } = {}
) {
    let chunks = [];
    let chunk = [pts[0]];

    let l = pts.length;

    // render
    for (let i = 1; i < l; i++) {
        i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        chunk.push(p1);

        // start new chunk
        if (i > 0 && 
            (keepExtremes && p2.isExtreme || keepCorners && p2.isCorner)
            ) {
            chunks.push(chunk);
            chunk = [];
        }

    }

    // chunk is empty - extremes or corners
    if(!chunks.length && pts.length>1){
        chunks = [pts];
    }

    // test render

    return chunks;
}

function harmonizeCubicCptsThird(pathData = [], t = 0.666) {

    let l = pathData.length;
    for (let i = 0; i < l; i++) {
        let com = pathData[i];
        let comPrev = pathData[i - 1] || null;
        let { type, values } = com;
        pathData[i + 1] ? pathData[i + 1] : null;
        let adjust = false;

        if (type === 'C') {
            let cp1 = { x: values[0], y: values[1] };
            let cp2 = { x: values[2], y: values[3] };
            let valuesL = comPrev.values.slice(-2);
            let p0 = { x: valuesL[0], y: valuesL[1] };
            let p = { x: values[4], y: values[5] };

            let dist0 = getDistManhattan(p0, p);
            getDistManhattan(p0, cp1);
            getDistManhattan(p, cp2);
            let dist3 = getDistManhattan(cp1, cp2);

            let ptIV = checkLineIntersection(p0, cp1, p, cp2, false);

            if (ptIV) {

                // exact intersection
                let ptI = ptIV ? checkLineIntersection(p0, cp1, p, cp2, true) : null;

                // cpts are intersection
                if (ptI) {
                    adjust = true;
                }

                else if (dist3 < dist0 / 5) {
                    adjust = true;
                }
            }

            if (adjust) {
                cp1 = pointAtT([p0, ptIV], t);
                cp2 = pointAtT([p, ptIV], t);

                pathData[i].values[0] = cp1.x;
                pathData[i].values[1] = cp1.y;
                pathData[i].values[2] = cp2.x;
                pathData[i].values[3] = cp2.y;
            }

        }

    }

    return pathData

}

function harmonizeCubicCpts(pathData = [], t = 0.666) {

    let l = pathData.length;
    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let { type, values } = com;
        pathData[i + 1] ? pathData[i + 1] : null;
        let adjust = false;

        if (type === 'C') {
            let cp1 = { x: values[0], y: values[1] };
            let cp2 = { x: values[2], y: values[3] };
            let valuesL = comPrev.values.slice(-2);
            let p0 = { x: valuesL[0], y: valuesL[1] };
            let p = { x: values[4], y: values[5] };

            let dist0 = getDistManhattan(p0, p);
            let dist1 = getDistManhattan(p0, cp1);
            let dist2 = getDistManhattan(p, cp2);
            let dist3 = getDistManhattan(cp1, cp2);

            let ptIV = checkLineIntersection(p0, cp1, p, cp2, false);
            let ptI = ptIV ? checkLineIntersection(p0, cp1, p, cp2, true) : null;

            // intersection is on tangent vector
            if (ptIV && !ptI) {
                let ptIV2 = interpolate(p, cp2, 3);
                let pI2 = checkLineIntersection(p, ptIV2, p0, cp1, true);

                if (pI2) {
                    adjust = true;
                }
            }

            // very uneven lengths
            let diff1 = dist1 / dist0;
            let diff2 = dist2 / dist0;

            if (diff1 < 0.3 && diff2 > 0.4) {

                cp1 = pointAtT([p0, cp1], 1 + t / 2);
                cp2 = pointAtT([p, cp2], t);

                pathData[i].values[0] = cp1.x;
                pathData[i].values[1] = cp1.y;
                pathData[i].values[2] = cp2.x;
                pathData[i].values[3] = cp2.y;

            }

            // cpts are intersection
            if (ptI) {
                adjust = true;
            }

            else {
                if (ptIV) {
                    if (dist3 < dist0 / 5) {
                        adjust = true;
                    }
                }

            }

            if (adjust) {
                cp1 = pointAtT([p0, ptIV], t);
                cp2 = pointAtT([p, ptIV], t);

                pathData[i].values[0] = cp1.x;
                pathData[i].values[1] = cp1.y;
                pathData[i].values[2] = cp2.x;
                pathData[i].values[3] = cp2.y;

            }

        }

    }

    return pathData

}

let polyPtsToArray = (pts) => {
    return Array.from(pts).map(pt => [pt.x, pt.y])
};

// convert to pathdata
let bezierPtsToPathData = (beziers) => {

    let pathData = [];

    beziers.forEach(bez => {
        let cp1 = bez[1];
        let cp2 = bez[2];
        let p = bez[3];
        let com = { type: 'C', values: [cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]] };
        pathData.push(com);
    });

    return pathData
};

/**
 * Fit one or more Bezier curves to a set of pts.
 *
 */
function fitCurveN(pts, maxError, adjustCpts = true, harmonize= true) {

    if (!Array.isArray(pts) || (pts[0].x !== undefined)) {

        if (pts[0].x !== undefined) {
            pts = polyPtsToArray(pts);
        } else {
            throw Error("Not a valid point array");
        }
    }

    // Remove duplicate pts
    pts = pts.filter(function (point, i) {
        return i === 0 || !point.every((val, j) => {
            return val === pts[i - 1][j];
        });
    });

    if (pts.length === 1) {

        return [];
    }

    // single lineto
    if (pts.length === 2) {
        return [
            { type: 'L', values: [pts[0][0], pts[0][1]] },
            { type: 'L', values: [pts[1][0], pts[1][1]] }
        ]
    }

    let len = pts.length;

    let leftTangent = createTangent(pts[1], pts[0]);
    let rightTangent = createTangent(pts[len - 2], pts[len - 1]);

    let beziers = fitCubic(pts, leftTangent, rightTangent, maxError);

    // create pathdata
    let pathData = bezierPtsToPathData(beziers);

    // adjustCpts -post

    let cp1, cp2;
    if (adjustCpts) {

        let len2 = pathData.length;
        let com1 = pathData[0];

        // last cubic segment
        let com2 = pathData[len2 - 1];

        let p0 = { x: pts[0][0], y: pts[0][1] };
        let p1 = { x: pts[1][0], y: pts[1][1] };
        let p2 = pts[2] ? { x: pts[2][0], y: pts[2][1] } : null;

        if (p2) {
            cp1 = { x: com1.values[0], y: com1.values[1] };
            cp1 = adjustTangentAngle(cp1, p0, p1, p2);
            com1.values[0] = cp1.x;
            com1.values[1] = cp1.y;
        }

        let pL = { x: pts[len - 1][0], y: pts[len - 1][1] };
        let pL1 = { x: pts[len - 2][0], y: pts[len - 2][1] };
        let pL2 = pts[len - 3] ? { x: pts[len - 3][0], y: pts[len - 3][1] } : null;

        if (pL2) {
            cp2 = { x: com2.values[2], y: com2.values[3] };
            cp2 = adjustTangentAngle(cp2, pL, pL1, pL2);
            com2.values[2] = cp2.x;
            com2.values[3] = cp2.y;
        }

        // harmonize too tight tangents

        if(harmonize){
            pathData = harmonizeCubicCptsThird([{ type: 'M', values: [pts[0][0], pts[0][1]] }, 
            ...pathData]);
            pathData.shift();
        }

    }

    return pathData
}

function adjustTangentAngle(cp, p0, p1, p2) {
    let ang1 = getAngle(p0, p1);
    let ang2 = getAngle(p0, p2);
    let angDiff = (ang2 - ang1);
    cp = rotatePoint(cp, p0.x, p0.y, -angDiff);
    return cp
}

/**
 * Use least-squares method to find Bezier control pts for region.
*/
let generateBezier = (pts, parameters, leftTangent, rightTangent) => {

    let a, tmp, u, ux, firstPoint = pts[0], lastPoint = pts[pts.length - 1];

    let bezCurve = [firstPoint, null, null, lastPoint];
    let A = zeros_Xx2x2(parameters.length);
    let len = parameters.length;

    for (let i = 0; i < len; i++) {
        u = parameters[i];
        ux = 1 - u;
        a = A[i];

        a[0] = mulItems(leftTangent, 3 * u * (ux * ux));
        a[1] = mulItems(rightTangent, 3 * ux * (u * u));
    }

    let C = [[0, 0], [0, 0]];
    let X = [0, 0];
    let l = pts.length;

    for (let i = 0; i < l; i++) {
        u = parameters[i];
        a = A[i];

        C[0][0] += dot(a[0], a[0]);
        C[0][1] += dot(a[0], a[1]);
        C[1][0] += dot(a[0], a[1]);
        C[1][1] += dot(a[1], a[1]);

        tmp = subtract(pts[i], pointAtT([firstPoint, firstPoint, lastPoint, lastPoint], u));

        X[0] += dot(a[0], tmp);
        X[1] += dot(a[1], tmp);
    }

    let det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
    let det_C0_X = C[0][0] * X[1] - C[1][0] * X[0];
    let det_X_C1 = X[0] * C[1][1] - X[1] * C[0][1];

    let alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
    let alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;
    let segLength = getDistance(firstPoint, lastPoint, true);
    let epsilon = 1.0e-6 * segLength;

    if (alpha_l < epsilon || alpha_r < epsilon) {

        bezCurve[1] = addArrays(firstPoint, mulItems(leftTangent, segLength * 0.333));
        bezCurve[2] = addArrays(lastPoint, mulItems(rightTangent, segLength * 0.333));
    } else {
        // First and last control pts of the Bezier curve 
        bezCurve[1] = addArrays(firstPoint, mulItems(leftTangent, alpha_l));
        bezCurve[2] = addArrays(lastPoint, mulItems(rightTangent, alpha_r));
    }

    return bezCurve;
};

/**
 * Fit a Bezier curve to a (sub)set of digitized pts.
 * Your code should not call this function directly. Use {@link fitCurve} instead.
 *control-point-1, control-point-2, second-point] and pts are [x, y]
 */
let fitCubic = (pts, leftTangent, rightTangent, error) => {

    let MaxIterations = 20; 
    let bezCurve;

    if (pts.length === 2) {
        let dist = getDistance(pts[0], pts[1], true) * 0.333;
        bezCurve = [pts[0], addArrays(pts[0], mulItems(leftTangent, dist)), addArrays(pts[1], mulItems(rightTangent, dist)), pts[1]];
        return [bezCurve];
    }

    let u = chordLengthParameterize(pts);
    let _generateAndReport = generateAndReport(pts, u, u, leftTangent, rightTangent);

    bezCurve = _generateAndReport[0];
    let maxError = _generateAndReport[1];
    let splitPoint = _generateAndReport[2];

    if (maxError === 0 || maxError < error) {
        return [bezCurve];
    }

    if (maxError < error * error) {

        let uPrime = u;
        let prevErr = maxError;
        let prevSplit = splitPoint;

        for (let i = 0; i < MaxIterations; i++) {

            uPrime = reparameterize(bezCurve, pts, uPrime);

            let _generateAndReport2 = generateAndReport(pts, u, uPrime, leftTangent, rightTangent);

            bezCurve = _generateAndReport2[0];
            maxError = _generateAndReport2[1];
            splitPoint = _generateAndReport2[2];

            if (maxError < error) {
                return [bezCurve];
            }

            else if (splitPoint === prevSplit) {
                let errChange = maxError / prevErr;
                if (errChange > .9999 && errChange < 1.0001) {
                    break;
                }
            }

            prevErr = maxError;
            prevSplit = splitPoint;
        }
    }

    let beziers = [];
    let centerVector = subtract(pts[splitPoint - 1], pts[splitPoint + 1]);

    if (centerVector.every(function (val) {
        return val === 0;
    })) {

        centerVector = subtract(pts[splitPoint - 1], pts[splitPoint]);
        let _ref = [-centerVector[1], centerVector[0]];
        centerVector[0] = _ref[0];
        centerVector[1] = _ref[1];
    }

    let toCenterTangent = normalize(centerVector);

    let fromCenterTangent = mulItems(toCenterTangent, -1);

    beziers = beziers.concat(fitCubic(pts.slice(0, splitPoint + 1), leftTangent, toCenterTangent, error));
    beziers = beziers.concat(fitCubic(pts.slice(splitPoint), fromCenterTangent, rightTangent, error));
    return beziers;
};

const generateAndReport = (pts, paramsOrig, paramsPrime, leftTangent, rightTangent) => {
    let bezCurve, maxError, splitPoint;

    bezCurve = generateBezier(pts, paramsPrime, leftTangent, rightTangent);
    let _computeMaxError = computeMaxError(pts, bezCurve, paramsOrig);

    maxError = _computeMaxError[0];
    splitPoint = _computeMaxError[1];

    return [bezCurve, maxError, splitPoint];
};

/**
 * Given set of pts and their parameterization, try to find a better parameterization.
 */
function reparameterize(bezier, pts, parameters) {
    return parameters.map((p, i) => {
        return newtonRaphsonRootFind(bezier, pts[i], p);
    });
}
/**
 * Use Newton-Raphson iteration to find better root.
 */

function newtonRaphsonRootFind(bez, point, u) {
    // bez is [p0, cp1, cp2, p1] where each is [x, y]
    // point is the target point [x, y] we're trying to get close to
    // u is our current parameter value (0-1)

    // Calculate q(u) - point (the vector from target to curve point)

    let q = pointAtT(bez, u);

    let dx = q[0] - point[0];
    let dy = q[1] - point[1];

    // First derivative (tangent vector at u)
    let qp = bezierQprime(bez, u);

    // Numerator: dot product of (q(u) - point) and q'(u)
    // This represents how much the error aligns with the tangent
    let numerator = dx * qp[0] + dy * qp[1];

    // Denominator: |q'(u)|² + 2 * (q(u)-point) · q''(u)
    // First part: squared length of tangent vector
    let qpLenSq = qp[0] * qp[0] + qp[1] * qp[1];

    // Second derivative
    let qpp = bezierQprime(bez, u, true);

    // Second part: 2 * (q(u)-point) · q''(u)
    let secondPart = 2 * (dx * qpp[0] + dy * qpp[1]);

    let denominator = qpLenSq + secondPart;

    if (Math.abs(denominator) < 1e-10) { // Avoid division by zero
        return u;
    }

    // Newton-Raphson step: u_new = u - f(u)/f'(u)
    return u - numerator / denominator;
}

/**
 * Assign parameter values to digitized pts using relative distances between pts.
 */
function chordLengthParameterize(pts) {
    let u = [];
    let l = pts.length;
    let p0 = pts[0];
    let p = pts[1];
    let currU = 0;
    let prevU = 0;

    for (let i = 0; i < l; i++) {
        p = pts[i];

        currU = prevU + getDistance(p, p0, true);
        u.push(currU);
        prevU = currU;

        p0 = p;
    }

    u = u.map(function (x) {
        return x / prevU;
    });

    return u;
}
/**
 * Find the maximum squared distance of digitized pts to fitted curve.
 */
function computeMaxError(pts, bez, parameters) {
    let dist,
        maxDist,
        splitPoint,
        v,
        i, point, t;

    maxDist = 0;
    splitPoint = Math.floor(pts.length * 0.5);

    let t_distMap = mapTtoRelativeDistances(bez, 10);
    let l = pts.length;

    for (i = 0; i < l; i++) {
        point = pts[i];

        t = find_t(parameters[i], t_distMap, 10);

        v = subtract(pointAtT(bez, t), point);
        dist = v[0] * v[0] + v[1] * v[1];

        if (dist > maxDist) {
            maxDist = dist;
            splitPoint = i;
        }
    }

    return [maxDist, splitPoint];
}

function mapTtoRelativeDistances(bez, B_parts) {
    let B_t_curr;
    let B_t_dist = [0];
    let B_t_prev = bez[0];
    let sumLen = 0;

    for (let i = 1; i <= B_parts; i++) {
        B_t_curr = pointAtT(bez, i / B_parts);
        sumLen += getDistance(B_t_curr, B_t_prev, true);
        B_t_dist.push(sumLen);
        B_t_prev = B_t_curr;
    }

    B_t_dist = B_t_dist.map(function (x) {
        return x / sumLen;
    });
    return B_t_dist;
}
function find_t(param, t_distMap, B_parts) {

    if (param < 0) {
        return 0;
    }
    if (param > 1) {
        return 1;
    }

    let lenMax, lenMin, tMax, tMin, t;

    for (let i = 1; i <= B_parts; i++) {

        if (param <= t_distMap[i]) {
            tMin = (i - 1) / B_parts;
            tMax = i / B_parts;
            lenMin = t_distMap[i - 1];
            lenMax = t_distMap[i];
            t = (param - lenMin) / (lenMax - lenMin) * (tMax - tMin) + tMin;
            break;
        }
    }
    return t;
}

/**
 * Creates a vector of length 1 which shows the direction from B to A
 */
function createTangent(p1, p2) {
    // Returns unit vector pointing from B to A
    let dx = p1[0] - p2[0];
    let dy = p1[1] - p2[1];
    let length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return [0, 0];
    return [dx / length, dy / length];
}

/**
 * Math helpers
 */

// Basic vector utilities (only what's absolutely necessary)
function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}

function addArrays(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}

function mulItems(v, s) {
    return [v[0] * s, v[1] * s];
}

function normalize(v) {
    let len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}

function zeros_Xx2x2(x) {
    let zs = [];
    while (x--) {
        zs.push([0, 0]);
    }
    return zs;
}

// First derivative (tangent vector)
function bezierQprime(bez, u, second = false) {
    let p0 = bez[0], cp1 = bez[1], cp2 = bez[2], p1 = bez[3];
    let t = u;
    let mt = 1 - t;
    let mt2 = mt * mt;
    let t2 = t * t;
    let dx, dy;

    if (second) {
        dx = 6 * mt * (cp2[0] - 2 * cp1[0] + p0[0]) +
            6 * t * (p1[0] - 2 * cp2[0] + cp1[0]);

        dy = 6 * mt * (cp2[1] - 2 * cp1[1] + p0[1]) +
            6 * t * (p1[1] - 2 * cp2[1] + cp1[1]);

    } else {
        dx = 3 * mt2 * (cp1[0] - p0[0]) +
            6 * mt * t * (cp2[0] - cp1[0]) +
            3 * t2 * (p1[0] - cp2[0]);

        dy = 3 * mt2 * (cp1[1] - p0[1]) +
            6 * mt * t * (cp2[1] - cp1[1]) +
            3 * t2 * (p1[1] - cp2[1]);
    }

    return [dx, dy];
}

function simplifyPolygonToPathData(pts, {
    debug = false,
    width = 0,
    height = 0,
    denoise = 0.9,
    keepCorners=true,
    keepExtremes=true,
    keepInflections=false,
    manhattan = false,
    absolute = false,
    closed = true,
    tolerance = 1
} = {}) {

    denoise = 0;

    // denoise via RDP
    if (denoise && denoise !== 1) {
        pts = simplifyRDP(pts, {
            width,
            height,
            quality: denoise,
            manhattan,
            absolute
        });

    }

    // get topology of poly
    let polyAnalyzed = !keepExtremes&&!keepCorners ? pts : analyzePoly(pts, {
        debug: false

    });

    // split into segment chunks
    let chunks = !keepExtremes&&!keepCorners ? [polyAnalyzed] : getPolyChunks(polyAnalyzed, {keepCorners,keepExtremes, keepInflections});

    // Schneider curve fit
    let threshold = width && height ? (width + height) / 2 * 0.004 * tolerance : 2.5;

    threshold=2;

    let polyPath = simplifyPolyChunks(chunks, {
        closed,
        tolerance: threshold
    });

    return polyPath;
}

/**
 * convert polygon chunks
 * to cubic beziers 
 */

function simplifyPolyChunks(chunks = [], {
    closed = true,
    tolerance = 1,
} = {}) {

    let l = chunks.length;

    // new pathData
    let pathData = [{ type: 'M', values: [chunks[0][0].x, chunks[0][0].y] }];

    for (let i = 0; i < l; i++) {

        let chunk = chunks[i];
        let chunkN = chunks[i + 1] ? chunks[i + 1] : null;
        let segments = [];
        let chunklen = chunk.length;
        chunk[chunk.length - 1];

        // add from next command
        if (chunkN) {
            chunk.push(chunkN[0]);
        }

        // nothing to simplify
        if (chunklen < 2 || (chunklen === 2 && chunk[1].isExtreme) ) {
            chunk[chunk.length - 1];
            segments = chunk.map(com => { return { type: 'L', values: [com.x, com.y] } });

        } else {
            segments = fitCurveN(chunk, tolerance);
        }

        // remove first segment to connect to last segment
        pathData.push(...segments);

    }

    if (closed) pathData.push({ type: 'Z', values: [] });

    // refine extremes
    refineAdjacentExtremes$1(pathData);
    return pathData

}

function refineAdjacentExtremes$1(pathData) {
    let l = pathData.length;

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let comN = pathData[i + 1] || null;
        let { type, values } = com;

        if (type === 'C' && comN && comN.type === 'C') {
            let valuesN = comN.values;
            ({ x: values[0], y: values[1] });
            let cp2_1 = { x: values[2], y: values[3] };
            let p = { x: values[4], y: values[5] };

            let cp1_2 = { x: valuesN[0], y: valuesN[1] };
            ({ x: valuesN[2], y: valuesN[3] });

            let dx1 = Math.abs(cp2_1.x - p.x);
            let dy1 = Math.abs(cp2_1.y - p.y);

            let dx2 = Math.abs(cp1_2.x - p.x);
            let dy2 = Math.abs(cp1_2.y - p.y);

            let dist1 = getDistManhattan(cp1_2, cp2_1) * 0.02;

            // is almost horizontal
            let horizontal1 = dy1 < dist1 && dx1 > dist1;
            let horizontal2 = dy2 < dist1 && dx2 > dist1;
            let vertical1 = dx1 < dist1 && dy1 > dist1;
            let vertical2 = dx2 < dist1 && dy2 > dist1;
            let cp2N, cp1N;

            if (horizontal1 || vertical1) {

                // adjust cp2 to horizontal
                cp2N = horizontal1 ? {x:com.values[2], y: p.y} : (vertical1 ? {x:p.x, y:com.values[3]} : {x:com.values[2], y:com.values[3]});

                /*
                // adjust length
                distCpO = getDistManhattan(cp2_1, p)
                distCpN = getDistManhattan(cp2N, p)
 
                // interpolate
                t = distCpN/distCpO
                console.log(t,  distCpO, distCpN);
                cp2N = t>0.97 && t<0.99 ? interpolate(p, cp2N, t) : cp2N
                */
                com.values[2] = cp2N.x;
                com.values[3] = cp2N.y;

            }
 

            if (horizontal2 || vertical2) {
                // adjust cp1 to horizontal

                cp1N = horizontal2 ? 
                {x:comN.values[0], y: p.y} : 
                (vertical2 ? {x:p.x, y:comN.values[1]} : {x:comN.values[0], y:comN.values[1]});

                /*
                // adjust length
                distCpO = getDistManhattan(cp1_2, p)
                distCpN = getDistManhattan(cp1N, p)

                let sign = distCpO>distCpN ? -1 : 1

                // interpolate
                t = distCpN/distCpO
                cp1N = t>0.97 && t<0.99 ? interpolate(p, cp1N, t) : cp1N;

                */

                pathData[i + 1].values[0] = cp1N.x;
                pathData[i + 1].values[1] = cp1N.y;

            }
        }
    }
}

function refineAdjacentExtremes(pathData, {
    threshold = null, tolerance = 1
} = {}) {

    if (!threshold) {
        let bb = getPathDataBBox(pathData);

        threshold = (bb.width + bb.height) * 0.05;

    }

    let l = pathData.length;

    for (let i = 0; i < l; i++) {
        let com = pathData[i];
        let { type, values, extreme, corner = false, dimA, p0, p } = com;
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        let comN2 = pathData[i + 2] ? pathData[i + 2] : null;

        // check dist

        let diff = comN ? getDistManhattan(p, comN.p) : Infinity;
        let isCose = diff < threshold;

        let diff2 = comN2 ? getDistManhattan(comN2.p, comN.p) : Infinity;
        let isCose2 = diff2 < threshold*1;

        // next is extreme
        if (comN && comN2 && type === 'C' && comN.type === 'C' && extreme && comN2.extreme) {

            if (isCose2 || isCose) {

                // extrapolate
                let comEx = getCombinedByDominant(comN, comN2, threshold, tolerance, false);

                if (comEx.length === 1) {

                    comEx = comEx[0];

                    pathData[i + 1] = null;

                    pathData[i + 2].values = [comEx.cp1.x, comEx.cp1.y, comEx.cp2.x, comEx.cp2.y, comEx.p.x, comEx.p.y];
                    pathData[i + 2].cp1 = comEx.cp1;
                    pathData[i + 2].cp2 = comEx.cp2;
                    pathData[i + 2].p0 = comEx.p0;
                    pathData[i + 2].p = comEx.p;
                    pathData[i + 2].extreme = comEx.extreme;

                    i++;
                    continue
                }
            }

        }

        // short after extreme
        if (comN && type === 'C' && comN.type === 'C' && extreme) {

            if (isCose) {

                let area0 = getPolygonArea([com.p0, com.p, comN.p]);
                // cpts area
                let area1 = getPolygonArea([com.p0, com.cp1, com.cp2, com.p]);

                // sign change: is corner => skip
                if ((area0 < 0 && area1 > 0) || (area0 > 0 && area1 < 0)) {

                    continue;
                }
            }
        }

    }

    // remove commands
    pathData = pathData.filter(Boolean);
    l = pathData.length;

    /**
     * refine closing commands
     */

    let closed = pathData[l - 1].type.toLowerCase() === 'z';
    let lastIdx = closed ? l - 2 : l - 1;
    let lastCom = pathData[lastIdx];
    let penultimateCom = pathData[lastIdx - 1] || null;
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };

    let dec = 8;
    let lastVals = lastCom.values.slice(-2);
    let isClosingTo = +lastVals[0].toFixed(dec) === +M.x.toFixed(dec) && +lastVals[1].toFixed(dec) === +M.y.toFixed(dec);
    let fistExt = pathData[1].type === 'C' && pathData[1].extreme ? pathData[1] : null;

    let diff = getDistManhattan(lastCom.p0, lastCom.p);
    let isCose = diff < threshold;

    if (penultimateCom && penultimateCom.type === 'C' && isCose && isClosingTo && fistExt) {

        let comEx = getCombinedByDominant(penultimateCom, lastCom, threshold, tolerance, false);

        if (comEx.length === 1) {
            pathData[lastIdx - 1] = comEx[0];
            pathData[lastIdx] = null;
            pathData = pathData.filter(Boolean);
        }

    }

    return pathData

}

function removeEmptySVGEls(svg) {
  let els = svg.querySelectorAll('g, defs');
  els.forEach(el => {
    if (!el.children.length) el.remove();
  });
}

function cleanUpSVG(svgMarkup, {
  returnDom = false,
  removeHidden = true,
  removeUnused = true,
} = {}) {

  svgMarkup = cleanSvgPrologue(svgMarkup);

  // replace namespaced refs 
  svgMarkup = svgMarkup.replaceAll("xlink:href=", "href=");

  let svg = new DOMParser()

  .parseFromString(svgMarkup, "text/html")
  .querySelector("svg");

  let allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
  removeExcludedAttribues(svg, allowed);

  let removeEls = ['metadata', 'script'];

  let els = svg.querySelectorAll('*');

  let textEls = svg.querySelectorAll('text');
  let remove = !textEls.length ? ['font-family', 'font-weight', 'font-style', 'font-size'] : [];
  
  els.forEach(el => {
    let name = el.nodeName;
    // remove hidden elements
    let style = el.getAttribute('style') || '';
    let isHiddenByStyle = style ? style.trim().includes('display:none') : false;
    let isHidden = (el.getAttribute('display') && el.getAttribute('display') === 'none') || isHiddenByStyle;
    if (name.includes(':') || removeEls.includes(name) || (removeHidden && isHidden)) {
      el.remove();
    } else {
      // remove BS elements
      removeNameSpaceAtts(el);
      removeAtts(el,remove);
    }
  });

  if (returnDom) return svg

  let markup = stringifySVG(svg);

  return markup;
}

function cleanSvgPrologue(svgString) {
  return (
    svgString
      // Remove XML prologues like <?xml ... ?>
      .replace(/<\?xml[\s\S]*?\?>/gi, "")
      // Remove DOCTYPE declarations
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
      // Remove comments <!-- ... -->
      .replace(/<!--[\s\S]*?-->/g, "")
      // Trim extra whitespace
      .trim()
  );
}

function removeExcludedAttribues(el, allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class']) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (!allowed.includes(att)) {
      el.removeAttribute(att);
    }
  });
}

function removeAtts(el, remove=[]) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (remove.includes(att)) {
      el.removeAttribute(att);
    }
  });
}

function removeNameSpaceAtts(el) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (att.includes(":")) {
      el.removeAttribute(att);
    }
  });
}

function stringifySVG(svg) {
  let markup = new XMLSerializer().serializeToString(svg);
  markup = markup
    .replace(/\t/g, "")
    .replace(/[\n\r|]/g, "\n")
    .replace(/\n\s*\n/g, '\n')
    .replace(/ +/g, ' ');

  return markup
}

function refineRoundedCorners(pathData, {
    threshold = 0,
    tolerance = 1
} = {}) {

    // min size threshold for corners
    threshold *= tolerance;

    let l = pathData.length;

    // add fist command
    let pathDataN = [pathData[0]];

    let isClosed = pathData[l - 1].type.toLowerCase() === 'z';
    let zIsLineto = isClosed ?
    (pathData[l-1].p.x === pathData[0].p0.x && pathData[l-1].p.y === pathData[0].p0.y)
     : false ;

    let lastOff = isClosed ? 2 : 1;

    let comLast = pathData[l - lastOff];
    let lastIsLine = comLast.type === 'L';
    let lastIsBez = comLast.type === 'C';
    let firstIsLine = pathData[1].type === 'L';
    let firstIsBez = pathData[1].type === 'C';

    let normalizeClose = isClosed && firstIsBez && (lastIsLine || zIsLineto);

    // normalize closepath to lineto
    if (normalizeClose) {
        pathData[l - 1].values = pathData[0].values;
        pathData[l - 1].type = 'L';
        lastIsLine = true;
    }

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type } = com;
        let comN = pathData[i + 1] ? pathData[i + 1] : null;

        // search small cubic segments enclosed by linetos
        if ((type === 'L' && comN && comN.type === 'C') ||
            (type === 'C' && comN && comN.type === 'L')
        ) {
            let comL0 = type==='L' ? com : null;
            let comL1 = null;
            let comBez = [];
            let offset = 0;

            // start to end
            if (i === 1 && firstIsBez && lastIsLine) {
                comBez = [pathData[1]];
                comL0 = pathData[l - 1];
                comL1 = comN;

            }

            if(!comL0) {
                pathDataN.push(com);
                continue
            }

            // closing corner to start
            if (isClosed && lastIsBez && firstIsLine && i === l - lastOff - 1) {
                comL1 = pathData[1];
                comBez = [pathData[l - lastOff]];

            }

            for (let j = i + 1; j < l; j++) {
                let comN = pathData[j] ? pathData[j] : null;
                let comPrev = pathData[j - 1];

                if (comPrev.type === 'C') {
                    comBez.push(comPrev);
                }

                if (comN.type === 'L' && comPrev.type === 'C') {
                    comL1 = comN;
                    break;
                }
                offset++;
            }

            if (comL1) {

                // linetos
                let len1 = getDistManhattan(comL0.p0, comL0.p);
                let len2 = getDistManhattan(comL1.p0, comL1.p);

                // bezier

                comBez.length;

                let len3 = getDistManhattan(comL0.p, comL1.p0);

                // check concaveness by area sign change
                let area1 = getPolygonArea([comL0.p0, comL0.p, comL1.p0, comL1.p], false);
                let area2 = getPolygonArea([comBez[0].p0, comBez[0].cp1, comBez[0].cp2, comBez[0].p], false);

                let signChange = (area1 < 0 && area2 > 0) || (area1 > 0 && area2 < 0);

                // exclude mid bezier segments that are larger than surrounding linetos
                let bezThresh = len3*0.5 * tolerance;
                let isSmall = bezThresh < len1 && bezThresh < len2 ;

                if (comBez.length && !signChange &&  isSmall ) {

                    let isFlatBezier = Math.abs(area2) <= getSquareDistance(comBez[0].p0, comBez[0].p)*0.005;
                    let ptQ = !isFlatBezier ? checkLineIntersection(comL0.p0, comL0.p, comL1.p0, comL1.p, false) : null;

                    if (!isFlatBezier && ptQ) {

                        // final check: mid point proximity
                        let ptM = pointAtT([comL0.p, ptQ, comL1.p0], 0.5);

                        let ptM_bez = comBez.length===1 ? pointAtT( [comBez[0].p0, comBez[0].cp1, comBez[0].cp2, comBez[0].p], 0.5 ) : comBez[0].p ;

                        let dist1 = getDistManhattan(ptM, ptM_bez) * 0.75;

                        // not in tolerance – return original command
                        if(bezThresh && dist1>bezThresh && dist1>len3*0.3){

                            pathDataN.push(com);
                            continue;

                        } else {

                            let comQ = { type: 'Q', values: [ptQ.x, ptQ.y, comL1.p0.x, comL1.p0.y] };
                            comQ.p0 = comL0.p;
                            comQ.cp1 = ptQ;
                            comQ.p = comL1.p0;
    
                            // add quadratic command
                            pathDataN.push(comL0, comQ);
                            i += offset;

                            continue;
                        }

                    }
                }
            }
        }

        // skip last lineto
        if (normalizeClose && i === l - 1 && type === 'L') {
            continue
        }

        pathDataN.push(com);

    }

    // revert close path normalization
    if (normalizeClose  || (isClosed && pathDataN[pathDataN.length-1].type!=='Z') ) {
        pathDataN.push({ type: 'Z', values: [] });
    }

    return pathDataN;

}

function getArcFromPoly(pts) {
    if (pts.length < 3) return false

    // Pick 3 well-spaced points
    let  p1 = pts[0];
    let  p2 = pts[Math.floor(pts.length / 2)];
    let  p3 = pts[pts.length - 1];

    let  x1 = p1.x, y1 = p1.y;
    let  x2 = p2.x, y2 = p2.y;
    let  x3 = p3.x, y3 = p3.y;

    let  a = x1 - x2;
    let  b = y1 - y2;
    let  c = x1 - x3;
    let  d = y1 - y3;

    let  e = ((x1 * x1 - x2 * x2) + (y1 * y1 - y2 * y2)) / 2;
    let  f = ((x1 * x1 - x3 * x3) + (y1 * y1 - y3 * y3)) / 2;

    let  det = a * d - b * c;

    if (Math.abs(det) < 1e-10) {
        console.warn("Points are collinear or numerically unstable");
        return false;
    }

    // find center of arc
    let  cx = (d * e - b * f) / det;
    let  cy = (-c * e + a * f) / det;
    let  centroid = { x: cx, y: cy };

    // Radius (use start point)
    let  r = getDistance(centroid, p1);

    let angleData = getDeltaAngle(centroid, p1, p3);
    let {deltaAngle, startAngle, endAngle} = angleData;

    return {
        centroid,
        r,
        startAngle,
        endAngle,
        deltaAngle
    };
}

function refineRoundSegments(pathData, {
    threshold = 0,
    tolerance = 1,
    // take arcs or cubic beziers
    toCubic = false,
    debug = false
} = {}) {

    // min size threshold for corners
    threshold *= tolerance;

    let l = pathData.length;

    // add fist command
    let pathDataN = [pathData[0]];

    // just for debugging
    let pathDataTest = [];

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type } = com;
        let comP = pathData[i - 1];
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        let comN2 = pathData[i + 2] ? pathData[i + 2] : null;
        let comN3 = pathData[i + 3] ? pathData[i + 3] : null;
        let comBez = null;

        if ((com.type === 'C' || com.type === 'Q')) comBez = com;
        else if (comN && (comN.type === 'C' || comN.type === 'Q')) comBez = comN;

        let cpts = comBez ? (comBez.type === 'C' ? [comBez.p0, comBez.cp1, comBez.cp2, comBez.p] : [comBez.p0, comBez.cp1, comBez.p]) : [];

        let areaBez = 0;
        let areaLines = 0;
        let signChange = false;
        let L1, L2;
        let combine = false;

        let p0_S, p_S;
        let poly = [];
        let pMid;

        // 2. line-line-bezier-line-line
        if (
            comP.type === 'L' &&
            type === 'L' &&
            comBez &&
            comN2.type === 'L' &&
            comN3 && (comN3.type === 'L' || comN3.type === 'Z')
        ) {

            L1 = [com.p0, com.p];
            L2 = [comN2.p0, comN2.p];
            p0_S = com.p0;
            p_S = comN2.p;

            // don't allow sign changes
            areaBez = getPolygonArea(cpts, false);
            areaLines = getPolygonArea([...L1, ...L2], false);
            signChange = (areaBez < 0 && areaLines > 0) || (areaBez > 0 && areaLines < 0);

            if (!signChange) {

                // mid point of mid bezier
                pMid = pointAtT(cpts, 0.5);

                // add to poly
                poly = [p0_S, pMid, p_S];

                combine = true;
            }

        }

        // 1. line-bezier-bezier-line
        else if ((type === 'C' || type === 'Q') && comP.type === 'L') {

            // 1.2 next is cubic next is lineto
            if ((comN.type === 'C' || comN.type === 'Q') && comN2.type === 'L') {

                combine = true;

                L1 = [comP.p0, comP.p];
                L2 = [comN2.p0, comN2.p];
                p0_S = comP.p;
                p_S = comN2.p0;

                // mid point of mid bezier
                pMid = comBez.p;

                // add to poly
                poly = [p0_S, comBez.p, p_S];

            }
        }

        /**
         * calculate either combined
         * cubic or arc commands
         */
        if (combine) {

            // try to find center of arc
            let arcProps = getArcFromPoly(poly);
            if (arcProps) {

                let { centroid, r, deltaAngle, startAngle, endAngle } = arcProps;

                let xAxisRotation = 0;
                let sweep = deltaAngle > 0 ? 1 : 0;
                let largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0;

                let pCM = rotatePoint(p0_S, centroid.x, centroid.y, deltaAngle * 0.5);

                let dist2 = getDistAv(pCM, pMid);
                let thresh = getDistAv(p0_S, p_S) * 0.05;
                let bezierCommands;

                // point is close enough
                if (dist2 < thresh) {

                    bezierCommands = arcToBezierResolved(
                        {
                            p0: p0_S,
                            p: p_S,
                            centroid,
                            rx: r,
                            ry: r,
                            xAxisRotation,
                            sweep,
                            largeArc,
                            deltaAngle,
                            startAngle,
                            endAngle
                        }
                    );

                    if(bezierCommands.length === 1){

                        // prefer more compact quadratic - otherwise arcs
                        let comBezier = revertCubicQuadratic(p0_S, bezierCommands[0].cp1, bezierCommands[0].cp2, p_S);

                        if (comBezier.type === 'Q') {
                            toCubic = true;
                        }

                        com = comBezier;
                    }

                    // prefer arcs if 2 cubics are required
                    if (bezierCommands.length > 1) toCubic = false;

                    // return elliptic arc commands
                    if (!toCubic) {
                        // rewrite simplified command
                        com.type = 'A';
                        com.values = [r, r, xAxisRotation, largeArc, sweep, p_S.x, p_S.y];
                    }

                    com.p0 = p0_S;
                    com.p = p_S;
                    com.extreme = false;
                    com.corner = false;

                    // test rendering

                    if (debug) {
                        // arcs
                        if (!toCubic) {
                            pathDataTest = [
                                { type: 'M', values: [p0_S.x, p0_S.y] },
                                { type: 'A', values: [r, r, xAxisRotation, largeArc, sweep, p_S.x, p_S.y] },
                            ];
                        }
                        // cubics
                        else {
                            pathDataTest = [
                                { type: 'M', values: [p0_S.x, p0_S.y] },
                                ...bezierCommands
                            ];
                        }

                        let d = pathDataToD(pathDataTest);
                        renderPath(markers, d, 'orange', '0.5%', '0.5');
                    }

                    pathDataN.push(com);
                    i++;
                    continue

                }
            }
        }

        // pass through
        pathDataN.push(com);
    }

    return pathDataN;
}

function refineClosingCommand(pathData = [], {
    threshold = 0,
} = {}) {

    let l = pathData.length;
    let comLast = pathData[l - 1];
    let isClosed = comLast.type.toLowerCase() === 'z';
    let idxPenultimate = isClosed ? l - 2 : l - 1;
    let comPenultimate = isClosed ? pathData[idxPenultimate] : pathData[idxPenultimate];
    let valsPen = comPenultimate.values.slice(-2);

    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let pPen = { x: valsPen[0], y: valsPen[1] };
    let dist = getDistAv(M, pPen);

    // adjust last coordinates for better reordering
    if (dist && dist < threshold) {

        let valsLast = pathData[idxPenultimate].values;
        let valsLastLen = valsLast.length;
        pathData[idxPenultimate].values[valsLastLen - 2] = M.x;
        pathData[idxPenultimate].values[valsLastLen - 1] = M.y;

        // adjust cpts
        let comFirst = pathData[1];

        if (comFirst.type === 'C' && comPenultimate.type === 'C') {
            let dx1 = Math.abs(comFirst.values[0] - comPenultimate.values[2]);
            let dy1 = Math.abs(comFirst.values[1] - comPenultimate.values[3]);

            let dx2 = Math.abs(pathData[1].values[0] - comFirst.values[0]);
            let dy2 = Math.abs(pathData[1].values[1] - comFirst.values[1]);

            let dx3 = Math.abs(pathData[1].values[0] - comPenultimate.values[2]);
            let dy3 = Math.abs(pathData[1].values[1] - comPenultimate.values[3]);

            let ver = dx2 < threshold && dx3 < threshold && dy1;
            let hor = (dy2 < threshold && dy3 < threshold) && dx1;

            if (dx1 && dx1 < threshold && ver) {

                pathData[1].values[0] = M.x;
                pathData[idxPenultimate].values[2] = M.x;
            }

            if (dy1 && dy1 < threshold && hor) {

                pathData[1].values[1] = M.y;
                pathData[idxPenultimate].values[3] = M.y;
            }

        }
    }

    return pathData;

}

/**
* scale path data proportionaly
*/
function scalePathData(pathData, scale = 1) {
  let pathDataScaled = [];

  for (let i = 0, l = pathData.length; i < l; i++) {
    let com = pathData[i];
    let { type, values } = com;
    let comT = {
      type: type,
      values: []
    };

    switch (type.toLowerCase()) {
      // lineto shorthands
      case "h":
        comT.values = [values[0] * scale]; 
        break;
      case "v":
        comT.values = [values[0] * scale];
        break;

      // arcto
      case "a":
        comT.values = [
          values[0] * scale, // rx: scale
          values[1] * scale, // ry: scale
          values[2], // x-axis-rotation: keep it 
          values[3], // largeArc: dito
          values[4], // sweep: dito
          values[5] * scale, // final x: scale
          values[6] * scale // final y: scale
        ];
        break;

      /**
      * Other point based commands: L, C, S, Q, T
      * scale all values
      */
      default:
        if (values.length) {
          comT.values = values.map((val, i) => {
            return val * scale;
          });
        }
    }
    pathDataScaled.push(comT);
  }  return pathDataScaled;
}

/**
 * get viewBox 
 * either from explicit attribute or
 * width and height attributes
 */

function getViewBox(svg = null, decimals = -1) {

    const getUnit=(val)=>{
        return val && isNaN(val) ? val.match(/[^\d|.]+/g)[0] : '';
    };

    // browser default
    if (!svg) return false

    let hasWidth = svg.hasAttribute('width');
    let hasHeight = svg.hasAttribute('height');
    let hasViewBox = svg.hasAttribute('viewBox');

    let widthAtt = hasWidth ? svg.getAttribute('width') : 0;
    let heightAtt = hasHeight ? svg.getAttribute('height') : 0;

    let widthUnit = hasWidth ? getUnit(widthAtt) : false;
    let heightUnit = hasHeight ? getUnit(widthAtt) : false;

    let w = widthAtt ? (!widthAtt.includes('%') ? parseFloat(widthAtt) : 0 ) : 300;
    let h = heightAtt ? (!heightAtt.includes('%') ? parseFloat(heightAtt) : 0 ) : 150;

    let viewBoxVals =  hasViewBox ? svg.getAttribute('viewBox').split(/,| /).filter(Boolean).map(Number) : [0, 0, w, h];

    // round
    if (decimals>-1) {
        [w, h] = [w, h].map(val=>+val.toFixed(decimals));
        viewBoxVals = viewBoxVals.map(val=>+val.toFixed(decimals));
    }

    let viewBox = { x:viewBoxVals[0] , y:viewBoxVals[1], width:viewBoxVals[2], height:viewBoxVals[3], w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit };

    return viewBox
}

function redrawPathData(pathData, {
    tolerance = 1

} = {}) {
    let chunks = [];
    let chunk = [];

    let l = pathData.length;

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type, values, p0, cp1 = null, cp2 = null, p, extreme = null, semiExtreme = null, corner = null, directionChange } = com;

        let comN = pathData[i + 1] || null;

        /*
        if (extreme || corner || semiExtreme || directionChange) {

            if (extreme) renderPoint(markers, com.p, 'cyan', '1%', '0.5')

            if (semiExtreme) renderPoint(markers, com.p, 'orange', '1%', '0.5')
            if (corner) renderPoint(markers, com.p, 'magenta', '1.75%', '0.5')
        }
        */

        if (extreme || corner || (comN && comN.type !== type)) {
            chunk.push(com);
            chunks.push(chunk);
            chunk = [];
            continue
        }

        chunk.push(com);

    }

    console.log('!!!chunks', chunks);

    renderChunks(chunks);

    // cleanup chunks

    let chunksLen = chunks.length;

    

    for (let c = 0; c < chunksLen; c++) {
        let chunk = chunks[c];
        let chunkN = chunks[c + 1] || null;

        let chunkLen = chunk.length;

        if (chunkLen === 1 && chunkN && chunkN[0].type === 'C') ;

    }

    chunks = chunks.filter(Boolean);

    // test render

    let pathDataC = [pathData[0]];

    /**
     * combine chunk based
     */
    for (let c = 0; c < chunks.length; c++) {
        let chunk = chunks[c];
        let chunkLen = chunk.length;
        let comChunk0 = chunk[0];
        let comChunk1 = chunk[chunkLen - 1];
        let thresh = getDistManhattan(comChunk0.p0, comChunk1.p) * 0.05;

        // commands in chunk
        for (let i = 0, l = chunkLen; i < l; i++) {
            let com = chunk[i];
            chunk[i + 1];
            chunk[l - 1];

            let isBezier = comChunk0.type === 'C' && comChunk1.type === 'C';

            let { type, values, p0, cp1 = null, cp2 = null, p = null, extreme, semiExtreme = null, corner = null } = com;

            let pI1 = null, pI2 = null;
            let cp1_S = null, cp2_S = null;
            let cp2_M = null;
            let cp1_M = null;
            let pathDataS = [];
            let tSplit = 0.666;
            let comMid = null;

            // 0. adjust Extreme cpts
            if (isBezier) {
                let dx1 = Math.abs(comChunk0.p0.x - comChunk0.cp1.x);
                let dy1 = Math.abs(comChunk0.p0.y - comChunk0.cp1.y);
                let dx2 = Math.abs(comChunk1.p.x - comChunk1.cp2.x);
                let dy2 = Math.abs(comChunk1.p.y - comChunk1.cp2.y);

                let vertical1 = dx1 < thresh && dx1 < dy1;
                let horizontal1 = dy1 < thresh && dx1 > dy1;

                let vertical2 = dx2 < thresh && dx2 < dy2;
                let horizontal2 = dy2 < thresh && dx2 > dy2;

                if (horizontal1) comChunk0.cp1.y = comChunk0.p0.y;
                if (horizontal2) comChunk1.cp2.y = comChunk1.p.y;
                if (vertical1) comChunk0.cp1.x = comChunk0.p0.x;
                if (vertical2) comChunk1.cp2.x = comChunk1.p.x;
            }

            // test render - original pathdata
            let pathDataChunk = [
                { type: 'M', values: [com.p0.x, com.p0.y] },
                { type, values },
            ];

            pathDataToD(pathDataChunk);
            // renderPath(markers, d, stroke, '1%', '0.5')
            //  continue
            /*

            */

            // 1. only one command in chunk - nothing to simplify
            if (chunkLen === 1 || type !== 'C') {
                pathDataC.push(com);
            }

            // 2. could be simplified
            else {
                // 2.1 has semi extreme - extrapolate
                // 2.2 has sdirection change
                let semiExtremes = chunk.filter(ch => ch.semiExtreme);
                let comsDirectionChange = chunk.filter(ch => ch.directionChange);

                if (semiExtremes.length || comsDirectionChange.length) {

                    // semiExtreme command
                    comMid = semiExtremes.length ? semiExtremes[0] : comsDirectionChange[0];

                    // zero length cpt vectors
                    if (comChunk0.p0.x === comChunk0.cp1.x && comChunk0.p0.y === comChunk0.cp1.y) {
                        comChunk0.cp1 = pointAtT([comChunk0.p0, comChunk0.cp1, comChunk0.cp2, comChunk0.p], 0.5);
                    }
                    else if (comChunk1.p.x === comChunk1.cp2.x && comChunk1.p.y === comChunk1.cp2.y) {
                        comChunk1.cp2 = pointAtT([comChunk1.p0, comChunk1.cp1, comChunk1.cp2, comChunk1.p], 0.5);
                    }

                    pI1 = checkLineIntersection(comMid.p, comMid.cp2, comChunk0.p0, comChunk0.cp1, false);
                    pI2 = checkLineIntersection(comMid.p, comMid.cp2, comChunk1.p, comChunk1.cp2, false);

                    // intersections try to extrapolate cpts
                    if (pI1 && pI2) {

                        cp1_S = pointAtT([comChunk0.p0, pI1], tSplit);
                        cp2_S = pointAtT([comChunk1.p, pI2], tSplit);

                        cp2_M = pointAtT([comMid.p, pI1], tSplit);
                        cp1_M = pointAtT([comMid.p, pI2], tSplit);

                        /*
                        renderPoint(markers, cp1_S, 'magenta', '1%', '1' )
                        */

                        pathDataS = [
                            { type: 'M', values: [comChunk0.p0.x, comChunk0.p0.y] },
                            {
                                type: 'C', values: [
                                    cp1_S.x, cp1_S.y,
                                    cp2_M.x, cp2_M.y,
                                    comMid.p.x,
                                    comMid.p.y
                                ]
                            },
                            {
                                type: 'C', values: [
                                    cp1_M.x, cp1_M.y,
                                    cp2_S.x, cp2_S.y,
                                    comChunk1.p.x,
                                    comChunk1.p.y,
                                ]
                            },
                        ];
                        pathDataToD(pathDataS);

                        pathDataC.push(
                            {
                                type: 'C', values: [
                                    cp1_S.x, cp1_S.y,
                                    cp2_M.x, cp2_M.y,
                                    comMid.p.x,
                                    comMid.p.y
                                ],
                                p0: comChunk0.p0,
                                cp1: cp1_S,
                                cp2: cp2_M,
                                p: comMid.p,
                                dimA: getDistManhattan(comChunk0.p0, comMid.p)
                            },

                            {
                                type: 'C', values: [
                                    cp1_M.x, cp1_M.y,
                                    cp2_S.x, cp2_S.y,
                                    comChunk1.p.x,
                                    comChunk1.p.y,
                                ],
                                p0: comMid.p,
                                cp1: cp1_M,
                                cp2: cp2_S,
                                p: comChunk1.p,
                                extreme: true,
                                dimA: getDistManhattan(comMid.p, comChunk1.p)

                            }
                        );
                        break

                    }
                } else {
                    pathDataC.push(com);
                }

            }

        }

    }

    /*
    // render
    let d = pathDataToD(pathDataC)
    console.log(d);
    renderPath(markers, d, 'red', '1%', '0.5')
    */

    return pathDataC

}

function renderChunks(chunks) {

    console.log('chunks', chunks);

    let stroke = 'green';

    /**
     * combine chunk based
     */
    for (let c = 0; c < chunks.length; c++) {
        let chunk = chunks[c];
        let chunkLen = chunk.length;

        stroke = c % 2 === 0 ? 'orange' : 'green';
        let comChunk0 = chunk[0];
        let comChunk1 = chunk[chunkLen - 1];

        let pathDataChunk = [
            { type: 'M', values: [comChunk0.p0.x, comChunk0.p0.y] }
        ];

        // commands in chunk
        for (let i = 0, l = chunkLen; i < l; i++) {
            let com = chunk[i];
            chunk[i + 1];
            chunk[l - 1];
            comChunk0.type === 'C' && comChunk1.type === 'C';

            let { type, values, p0, cp1 = null, cp2 = null, p = null, extreme, semiExtreme = null, corner = null } = com;

            // test render - original pathdata
            pathDataChunk.push(
                { type, values },
            );

        }

        let d = pathDataToD(pathDataChunk);
        renderPath(markers, d, stroke, '1%', '0.5');

    }
}

function pathDataRevertCubicToQuadratic(pathData) {

    for (let c = 1, l = pathData.length; c < l; c++) {
        let com = pathData[c];
        let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;
        if (type === 'C') {

            let comQ = revertCubicQuadratic(p0, cp1, cp2, p);
            if (comQ.type === 'Q') {
                comQ.extreme = com.extreme;
                comQ.corner = com.corner;
                comQ.dimA = com.dimA;
                comQ.squareDist = com.squareDist;
                pathData[c] = comQ;
            }
        }
    }
    return pathData
}

function pathDataCubicsToArc(pathData, { areaThreshold = 2.5 } = {}) {

    for (let c = 0, l = pathData.length; c < l; c++) {
        let com = pathData[c];
        let comN = pathData[c + 1] || null;
        let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;

        if (type === 'C' && comN && comN.type === 'C') {
            let comA = cubicCommandToArc(p0, cp1, cp2, p, areaThreshold);
            let comAN = cubicCommandToArc(comN.p0, comN.cp1, comN.cp2, comN.p, areaThreshold);

            if (comA.isArc  && comAN.isArc) {

                let dist = getDistManhattan(p0, comN.p);
                let maxDist = dist * 0.01;
                let dx = Math.abs(comN.p.x - p0.x);
                let dy = Math.abs(comN.p.y - p0.y);

                let horizontal = dy < maxDist && dx > maxDist;
                let vertical = dx < maxDist && dy > maxDist;

                let { rx, ry } = comA;
                let area = getPolygonArea([p0, p, comN.p]);
                let sweep = area < 0 ? 0 : 1;

                if (vertical || horizontal) {
                    rx = Math.min(rx, comAN.rx);
                    ry = Math.min(ry, comAN.ry);
                    pathData[c] = null;
                    pathData[c + 1].type = 'A';
                    pathData[c + 1].values = [rx, ry, 0, 0, sweep, comN.p.x, comN.p.y];
                    continue
                }
            }
        }
    }

    pathData = pathData.filter(Boolean);

    return pathData

}

function cubicCommandToArc(p0, cp1, cp2, p, tolerance = 7.5) {

    let com = { type: 'C', values: [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] };

    let arcSegArea = 0, isArc = false;

    // check angles
    let angle1 = getAngle(p0, cp1, true);
    let angle2 = getAngle(p, cp2, true);
    let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;

    let angleDiff = Math.abs((deltaAngle % 180) - 90);
    let isRightAngle = angleDiff < 3;

    let rx = 0;
    let ry = 0;
    let ptC;

    if (isRightAngle) {
        // point between cps

        // center point
        let cp1_r = rotatePoint(cp1, p0.x, p0.y, (Math.PI * -0.5));
        let cp2_r = rotatePoint(cp2, p.x, p.y, (Math.PI * 0.5));

        // assumed centroid
        ptC = checkLineIntersection(p0, cp1_r, p, cp2_r, false);

        let pI = checkLineIntersection(p0, cp1, p, cp2, false);

        if (pI) {

            let r1 = getDistance(p0, pI);
            let r2 = getDistance(p, pI);

            let rMax = +Math.max(r1, r2).toFixed(8);
            let rMin = +Math.min(r1, r2).toFixed(8);

            rx = rMin;
            ry = rMax;

            let arcArea = getPolygonArea([p0, cp1, cp2, p]);
            let sweep = arcArea < 0 ? 0 : 1;

            let w = Math.abs(p.x - p0.x);
            let h = Math.abs(p.y - p0.y);
            let landscape = w > h;

            let circular = (100 / rx * Math.abs(rx - ry)) < 5;

            if (circular) {

                rx = rMax;
                ry = rx;
            }

            if (landscape) {

                rx = rMax;
                ry = rMin;
            }

            // get original cubic area 
            let comO = [
                { type: 'M', values: [p0.x, p0.y] },
                { type: 'C', values: [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] }
            ];

            let comArea = getPathArea(comO);

            // new arc command
            let comArc = { type: 'A', values: [rx, ry, 0, 0, sweep, p.x, p.y] };

            // calculate arc seg area
            arcSegArea = (Math.PI * (rx * ry)) / 4;

            // subtract polygon between start, end and center point
            arcSegArea -= Math.abs(getPolygonArea([p0, p, pI]));

            let areaDiff = getRelativeAreaDiff(comArea, arcSegArea);

            if (areaDiff < tolerance) {
                isArc = true;
                com = comArc;
            }

        }
    }

    return { com: com, isArc, area: arcSegArea, rx, ry, centroid: ptC }

}

/*

// combine adjacent arcs

export function combineArcs(pathData) {

    let arcSeq = [[]]
    let ind = 0
    let arcIndices = [[]];
    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] }, p;

    for (let i = 0, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;

        if (type === 'A') {

            let comPrev = pathData[i - 1];

            // previous p0 values might not be correct anymore due to cubic simplification
            let valsL = comPrev.values.slice(-2);
            p0 = { x: valsL[0], y: valsL[1] };

            let [rx, ry, xAxisRotation, largeArc, sweep, x, y] = values;

            // check if arc is circular
            let circular = (100 / rx * Math.abs(rx - ry)) < 5;

            p = { x: values[5], y: values[6] }
            com.p0 = p0;
            com.p = p;
            com.circular = circular;

            let comNext = pathData[i + 1];

            if (!arcSeq[ind].length && comNext && comNext.type === 'A') {
                arcSeq[ind].push(com)
                arcIndices[ind].push(i)
            }

            if (comNext && comNext.type === 'A') {
                let [rx1, ry1, xAxisRotation0, largeArc, sweep, x, y] = comNext.values;
                let diffRx = rx != rx1 ? 100 / rx * Math.abs(rx - rx1) : 0
                let diffRy = ry != ry1 ? 100 / ry * Math.abs(ry - ry1) : 0

                p = { x: comNext.values[5], y: comNext.values[6] }
                comNext.p0 = p0;
                comNext.p = p;

                // add if radii are almost same
                if (diffRx < 5 && diffRy < 5) {

                    arcSeq[ind].push(comNext)
                    arcIndices[ind].push(i + 1)
                } else {

                    // start new segment
                    arcSeq.push([])
                    arcIndices.push([])
                    ind++

                }
            }

            else {

                arcSeq.push([])
                arcIndices.push([])
                ind++
            }
        }
    }

    if (!arcIndices.length) return pathData;

    arcSeq = arcSeq.filter(item => item.length)
    arcIndices = arcIndices.filter(item => item.length)

    // Process in reverse to avoid index shifting
    for (let i = arcSeq.length - 1; i >= 0; i--) {
        const seq = arcSeq[i];
        const start = arcIndices[i][0];
        const len = seq.length;

        // Average radii to prevent distortions
        let rxA = 0, ryA = 0;
        seq.forEach(({ values }) => {
            const [rx, ry] = values;
            rxA += rx;
            ryA += ry;
        });
        rxA /= len;
        ryA /= len;

        // Correct near-circular arcs

        // check if arc is circular
        let circular = (100 / rxA * Math.abs(rxA - ryA)) < 5;

        if (circular) {
            // average radii
            rxA = (rxA + ryA) / 2;
            ryA = rxA;
        }

        let comPrev = pathData[start - 1]
        let comPrevVals = comPrev.values.slice(-2)
        let M = { type: 'M', values: [comPrevVals[0], comPrevVals[1]] }

        if (len === 4) {

            let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[1].values;
            let [, , , , , x2, y2] = seq[3].values;

            let xDiff = Math.abs(x2 - x1);
            let yDiff = Math.abs(y2 - y1);
            let horizontal = xDiff > yDiff;

            if (circular) {
                let adjustY = !horizontal ? rxA * 2 : 0;

                // simplify radii
                rxA = 1;
                ryA = 1;
            }

            let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x1, y1] };
            let com2 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

            // This now correctly replaces the original 4 arc commands with 2
            pathData.splice(start, len, com1, com2);

        }

        else if (len === 3) {

            let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[0].values;
            let [rx2, ry2, , , , x2, y2] = seq[2].values;

            // must be large arc
            largeArc = 1;
            let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

            // replace
            pathData.splice(start, len, com1);

        }

        else if (len === 2) {

            let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[0].values;
            let [rx2, ry2, , , , x2, y2] = seq[1].values;

            // if circular or non-elliptic xAxisRotation has no effect
            if (circular) {
                rxA = 1;
                ryA = 1;
                xAxisRotation = 0;
            }

            // check if arc is already ideal
            let { p0, p } = seq[0];
            let [p0_1, p_1] = [seq[1].p0, seq[1].p];

            if (p0.x !== p_1.x || p0.y !== p_1.y) {

                let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

                // replace
                pathData.splice(start, len, com1);
            }
        }

        else {

        }
    }

    return pathData
}

export function combineCubicsToArcs(pathData = [], {
    threshold = 0,
} = {}) {

    let l = pathData.length;
    let pathDataN = [pathData[0]];

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type, cp1 = null, cp2 = null, p0, p } = com;
        let comP = pathData[i - 1];
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        let comN2 = pathData[i + 2] ? pathData[i + 2] : null;

        if (type === 'C' && comN && comN.type === 'C') {

            let thresh = getDistAv(p0, p) * 0.02;

            let dx1 = Math.abs(p0.x - cp1.x)
            let dy1 = Math.abs(p0.y - cp1.y)

            let isHorizontal1 = dy1 < thresh;
            let isVertical1 = dx1 < thresh;

            let dx2 = Math.abs(comN.p0.x - comN.cp1.x)
            let dy2 = Math.abs(comN.p0.y - comN.cp1.y)

            let isHorizontal2 = dy2 < thresh;
            let isVertical2 = dx2 < thresh;

            // check angles
            let angleDiff1 = (isHorizontal1 || isVertical1) ? 0 : Infinity;
            let angleDiff2 = (isHorizontal2 || isVertical2) ? 0 : Infinity;

            if (!isHorizontal1 && !isVertical1) {

                let angle1 = getAngle(p0, cp1, true);
                let angle2 = getAngle(p, cp2, true);
                let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;
                angleDiff1 = Math.abs((deltaAngle % 180) - 90);
            }

            if (!isHorizontal2 && !isVertical2) {

                let angle1 = getAngle(p0, cp1, true);
                let angle2 = getAngle(p, cp2, true);
                let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;
                angleDiff2 = Math.abs((deltaAngle % 180) - 90);
            }

            let isRightAngle1 = angleDiff1 < 3;
            let isRightAngle2 = angleDiff2 < 3;

            let centroids = [];
            let poly = [];
            let rArr = []
            let largeArc = 0;

            // final on path point
            let p_a = p

            // 2  possible candidates - test radius
            if (isRightAngle1 && isRightAngle2) {

                let pI = checkLineIntersection(p0, cp1, p, cp2, false);
                let r1 = getDistance(p0, pI);
                let r2 = getDistance(p, pI);
                let rDiff1 = Math.abs(r1 - r2)

                rArr.push(r1, r2)

                poly.push(p0, p)
                p_a = p

                // 2 commands can be combined – similar radii  
                if (rDiff1 < thresh) {

                    // add to polygon for sweep
                    poly.push(comN.p)

                    // update final point
                    p_a = comN.p

                    // approximate/average final center point for final radius
                    let cp1_r = rotatePoint(cp1, p0.x, p0.y, (Math.PI * -0.5))
                    let cp2_r = rotatePoint(cp2, p.x, p.y, (Math.PI * 0.5))

                    let cp1_r2 = rotatePoint(comN.cp1, comN.p0.x, comN.p0.y, (Math.PI * -0.5))
                    let cp2_r2 = rotatePoint(comN.cp2, comN.p.x, comN.p.y, (Math.PI * 0.5))

                    // assumed centroid
                    let ptC = checkLineIntersection(p0, cp1_r, p, cp2_r, false)
                    let ptC2 = checkLineIntersection(comN.p0, cp1_r2, comN.p, cp2_r2, false)
                    let distC = ptC && ptC2 ? getDistAv(ptC, ptC2) : Infinity

                    // 2 commands can definitely be combined 
                    if (distC < thresh) {

                        // add to centroid array
                        centroids.push(ptC, ptC2)

                    }

                    if (comN2 && comN2.type === 'C') {

                        let cp1_r3 = rotatePoint(comN2.cp1, comN2.p0.x, comN2.p0.y, (Math.PI * -0.5))
                        let cp2_r3 = rotatePoint(comN2.cp2, comN2.p.x, comN2.p.y, (Math.PI * 0.5))
                        let ptC3 = checkLineIntersection(comN2.p0, cp1_r3, comN2.p, cp2_r3, false)

                        let distC2 = ptC && ptC3 ? getDistAv(ptC, ptC3) : Infinity

                        // can be combined with 3rd command
                        if (distC2 < thresh) {

                            let r3 = getDistance(ptC3, comN2.p)
                            rArr.push(r3)

                            // update final point
                            p_a = comN2.p
                            poly.push(p, comN2.p)

                            largeArc = 1;

                        }
                    }

                } else {
                    pathDataN.push(com)
                    continue
                }

            }

            // create new arc command
            if (poly.length > 1) {

                // get average radius

                let rA = Math.max(...rArr)
                rA = rArr[0]

                let centroidA;
                let xArr = centroids.map(pt => pt.x)
                let yArr = centroids.map(pt => pt.y)

                centroidA = {
                    x: (xArr.reduce((a, b) => a + b, 0)) / centroids.length,
                    y: (yArr.reduce((a, b) => a + b, 0)) / centroids.length
                }

                rA = getDistance(p0, centroidA)
                let rA2 = getDistance(p, centroidA)

                // rA = ((Math.min(...rArr) * 2 + Math.max(...rArr)) ) / 3

                let area = getPolygonArea(poly, false)
                let sweep = area < 0 ? 0 : 1;

                let comA = { type: 'A', values: [rA, rA, 0, largeArc, sweep, p_a.x, p_a.y], p0, p: p_a }

                console.log('comA', comA);

                pathDataN.push(comA)

                i += rArr.length - 1;

                continue

            }

            // test angles
        }

        pathDataN.push(com)
    }

    let d = pathDataToD(pathDataN)
    console.log(d);

    console.log('pathDataN', pathDataN);
    return pathDataN

}
*/

function pathDataToPolygon(pathData, {
    angles = [],
    split = 0,
    getPathData = true,
    width=0,
    height=0
} = {}) {

    let l = pathData.length;
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p0 = M;

    // collect polygon vertices
    let pathDataPoly = [];
    let pts = [p0];

    // get max length
    let minLength = 0;

    split = !split ? 1 : split;

    if(width && height){
        minLength = (width+height) * 0.025 / split;
    }else {

        let lengths = pathData.map(com => com.dimA || 0).filter(Boolean).sort();
        minLength = lengths[0];

    }

    for (let i = 1; i < l; i++) {
        let com = pathData[i];

        let comNext = pathData[i + 1] || null;
        let { type, values } = com;
        let valuesL = values.length;
        let p = valuesL ? { x: values[valuesL - 2], y: values[valuesL - 1] } : M;

        if (type === 'C' || type === 'Q') {

            let cp1 = { x: values[0], y: values[1] };
            let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
            let cpts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];

            // calculate split according to length
            let length = com.dimA;
            split = Math.ceil(length / minLength);

            let tArr = [];
            for(let i=1; i<split; i++){
                tArr.push(1/split*i);
            }

            tArr.forEach(t => {
                let pt = pointAtT(cpts, t);
                pts.push(pt);
            });

        }

        if (type === 'M') {
            M = p;
        }

        p.area = com.cptArea|| 0;
        p.isExtreme = com.extreme|| false;
        p.isCorner = com.corner|| false; 
        p.isDirChange = com.directionChange || false ;

        // segment end point
        pts.push(p);

        // exclude for polygon simplification
        if (com.extreme || com.corner || (comNext && comNext.type !== type) || type === 'L') ;

        p0 = p;

    }

    // reduce poly vertices

    pts = simplifyRD(pts, {quality:0.5, width, height});

    /*
    pts.forEach(pt => {

    })

    */

    pathDataPoly = pathDataFromPoly(pts);
    return getPathData ? pathDataPoly : pts;
}

function svgPathSimplify(input = '', {

    // return svg markup or object
    getObject = false,

    toAbsolute = true,
    toRelative = true,
    toShorthands = true,

    // not necessary unless you need cubics only
    quadraticToCubic = true,

    // mostly a fallback if arc calculations fail      
    arcToCubic = false,
    cubicToArc = false,

    simplifyBezier = true,
    optimizeOrder = true,
    autoClose = true,
    removeZeroLength = true,
    refineClosing = true,
    removeColinear = true,
    flatBezierToLinetos = true,
    revertToQuadratics = true,

    refineExtremes = true,
    simplifyCorners = false,

    keepExtremes = true,
    keepCorners = true,
    extrapolateDominant = true,
    keepInflections = false,
    addExtremes = false,
    addSemiExtremes = false,

    smoothPoly = false,
    harmonizeCpts = false,
    toPolygon = false,

    removeOrphanSubpaths = false,

    simplifyRound = false,

    scale = 1,
    scaleTo = 0,
    crop = false,
    alignToOrigin = false,

    // svg path optimizations
    decimals = 3,
    autoAccuracy = true,

    minifyD = 0,
    tolerance = 1,
    reverse = false,

    // svg cleanup options
    mergePaths = false,
    removeHidden = true,
    removeUnused = true,
    shapesToPaths = true,

    tMin = 0,
    tMax = 1,

    // redraw - for messed up paths
    redraw = false,

} = {}) {

    // clamp tolerance and scale
    tolerance = Math.max(0.1, tolerance);
    scale = Math.max(0.001, scale);

    let inputType = detectInputType(input);
    let svg = '';
    let svgSize = 0;
    let svgSizeOpt = 0;
    let compression = 0;
    let report = {};
    let d = '';
    let mode = inputType === 'svgMarkup' ? 1 : 0;

    let paths = [];

    /**
     * normalize input
     * switch mode
     */

    // original size
    svgSize = input.length;

    /**
     * global bbox and viewBox for 
     * path scaling
     * sorting and cropping
    */
    let viewBox = { x: 0, y: 0, width: 0, height: 0 };
    let bb_global = { x: 0, y: 0, width: 0, height: 0 };
    let xArr = [];
    let yArr = [];

    // mode:0 – single path
    if (!mode) {
        if (inputType === 'pathDataString') {
            d = input;
        } else if (inputType === 'polyString') {
            d = 'M' + input;
        }
        else if (inputType === 'pathData') {
            d = input;

            // stringify to compare lengths
            let dStr = d.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
            svgSize = dStr.length;

        }

        paths.push({ d, el: null });
    }
    // mode:1 – process complete svg DOM
    else {

        let returnDom = true;
        svg = cleanUpSVG(input, { returnDom, removeHidden, removeUnused }
        );

        if (shapesToPaths) {
            let shapes = svg.querySelectorAll('polygon, polyline, line, rect, circle, ellipse');
            shapes.forEach(shape => {
                let path = shapeElToPath(shape);
                shape.replaceWith(path);
            });
        }

        // collect paths
        let pathEls = svg.querySelectorAll('path');

        pathEls.forEach(path => {
            paths.push({ d: path.getAttribute('d'), el: path });
        });

        // get viewBox/dimensions
        viewBox = getViewBox(svg, decimals);

    }

    /**
     * process all paths
     * try simplifications and removals
     */

    // SVG optimization options
    let pathOptions = {
        toRelative,
        toShorthands,
        decimals,
    };

    // combinded path data for SVGs with mergePaths enabled
    let pathData_merged = [];

    for (let i = 0, l = paths.length; l && i < l; i++) {

        let path = paths[i];
        let { d, el } = path;

        let pathData = parsePathDataNormalized(d, { quadraticToCubic, toAbsolute, arcToCubic });

        // get polygon bbox
        let bb_poly = smoothPoly || toPolygon ? getPolyBBox(getPathDataVertices(pathData)) : null;

        // scale pathdata and viewBox
        if (scale !== 1 || scaleTo) {

            // get bbox of viewBox for scaling
            if (scaleTo) {

                if (viewBox.width && !crop) {
                    scale = scaleTo / viewBox.width;

                } else {

                    // convert arcs to cubics, add extreme to get precise bounding box
                    let pathDataExtr = pathData.map(com => { return { type: com.type, values: com.values } });
                    pathDataExtr = convertPathData(pathDataExtr, { arcToCubic: true });
                    pathDataExtr = addExtremePoints(pathDataExtr);

                    let poly = getPathDataVertices(pathDataExtr);
                    let bb = getPolyBBox(poly);
                    xArr.push(bb.x, bb.x + bb.width);
                    yArr.push(bb.y, bb.y + bb.height);

                    let scaleW = scaleTo / bb.width;
                    scale = scaleW;
                }
            }

            pathData = scalePathData(pathData, scale);
        }

        // count commands for evaluation
        let comCount = pathData.length;

        if (removeOrphanSubpaths) pathData = removeOrphanedM(pathData);

        /**
         * get sub paths
         */
        let subPathArr = splitSubpaths(pathData);
        let lenSub = subPathArr.length;

        // cleaned up pathData

        // reset array
        let pathDataPlusArr = [];

        // loop sub paths
        for (let i = 0; i < lenSub; i++) {

            let pathDataSub = subPathArr[i];

            /**
             * convert cureves to polygon
             * flattening
             */
            if (toPolygon) {
                simplifyBezier = false;
                smoothPoly = false;
                harmonizeCpts = false;

                pathDataSub = pathDataRemoveColinear(pathDataSub);

                let pathDataSubPlus = analyzePathData(pathDataSub);
                let { bb, pathData } = pathDataSubPlus;
                pathDataSub = pathData;

                pathDataSub = pathDataToPolygon(pathDataSub, {
                    angles: [],
                    split: 1,
                    width: bb_poly.width,
                    height: bb_poly.height,
                    getPathData: true
                });

            }

            /**
             * poly to beziers via
             * Philip J. Schneider's 
             * "Algorithm for Automatically Fitting Digitized Curves"
             */
            if (smoothPoly) {
                let coms = Array.from(new Set(pathDataSub.map(com => com.type))).join('');
                let isPoly = !(/[acqts]/gi).test(coms);
                let closed = (/[z]/gi).test(coms);

                if (isPoly) {
                    pathDataSub = removeZeroLengthLinetos(pathDataSub);
                    let poly = getPathDataVertices(pathDataSub);

                    // options for poly simplification
                    let optionsPoly = {
                        denoise: 0.8,
                        tolerance,
                        width: bb_poly.width,
                        height: bb_poly.height,
                        manhattan: false,
                        absolute: false,
                        keepCorners,
                        keepExtremes,
                        keepInflections,
                        closed
                    };
                    pathDataSub = simplifyPolygonToPathData(poly, optionsPoly);
                }
            }

            // harmonize cpts
            if (harmonizeCpts) pathDataSub = harmonizeCubicCpts(pathDataSub);

            // remove zero length linetos
            if (removeColinear || removeZeroLength) pathDataSub = removeZeroLengthLinetos(pathDataSub);

            /**
             * try to redraw messed up paths
             * based on significant points suchas
             * extremes, semi-extremes and corners
             */
            if (redraw) {
                addExtremes = true;
                addSemiExtremes = true;
                simplifyCorners = false;
                keepCorners = true;
                keepExtremes = true;
                optimizeOrder = true;

                tMin = 0;
                tMax = 0;
            }

            // sort to top left
            if (optimizeOrder) pathDataSub = pathDataToTopLeft(pathDataSub);

            // Preprocessing: remove colinear - ignore flat beziers (removed later)
            if (removeColinear) pathDataSub = pathDataRemoveColinear(pathDataSub, { tolerance, flatBezierToLinetos: false });

            if (addExtremes || addSemiExtremes) pathDataSub = addExtremePoints(pathDataSub,
                { tMin, tMax, addExtremes, addSemiExtremes, angles: [30] });

            // analyze pathdata to add info about signicant properties such as extremes, corners
            let pathDataPlus = analyzePathData(pathDataSub, {
                detectSemiExtremes: addSemiExtremes,
            });

            // simplify beziers
            let { pathData, bb, dimA } = pathDataPlus;
            xArr.push(bb.x, bb.x + bb.width);
            yArr.push(bb.y, bb.y + bb.height);

            if (refineClosing) pathData = refineClosingCommand(pathData, { threshold: dimA * 0.001 });

            pathData = simplifyBezier ? simplifyPathDataCubic(pathData, { simplifyBezier, keepInflections, keepExtremes, keepCorners, extrapolateDominant, revertToQuadratics, tolerance, reverse }) : pathData;

            // refine extremes
            if (refineExtremes) {

                let thresholdEx = (bb.width + bb.height) * 0.05;
                pathData = refineAdjacentExtremes(pathData, { threshold: thresholdEx, tolerance });
            }

            /**
              * try redrawing
              */

            if (redraw) {

                /*
                pathData = addExtremePoints(pathData,
                    { tMin: 0, tMax: 1, addExtremes: true, addSemiExtremes: true })
    
                    pathData = analyzePathData(pathDataSub, {
                        detectSemiExtremes: true,
                        detectExtremes: true,
                    }).pathData;
    
                    */

                (bb.width + bb.height) * 0.1;

                pathData = redrawPathData(pathData, { tolerance, threshold: dimA * 0.001 });

            }

            // cubic to arcs
            if (cubicToArc) pathData = pathDataCubicsToArc(pathData, { areaThreshold: 2.5 });

            // post processing: remove flat beziers
            if (removeColinear && flatBezierToLinetos) {
                pathData = pathDataRemoveColinear(pathData, { tolerance, flatBezierToLinetos });
            }

            // refine corners
            if (simplifyCorners) {

                let threshold = (bb.width + bb.height) * 0.1;
                pathData = refineRoundedCorners(pathData, { threshold, tolerance });
            }

            // refine round segment sequences
            if (simplifyRound) pathData = refineRoundSegments(pathData);

            // simplify to quadratics
            if (revertToQuadratics) pathData = pathDataRevertCubicToQuadratic(pathData);

            // optimize close path
            if (optimizeOrder) pathData = optimizeClosePath(pathData, { autoClose });

            // update

            pathDataPlusArr.push({ pathData, bb });

        } // end sup paths

        // sort subpaths to top left
        let xMin = Math.min(...xArr);
        let yMin = Math.min(...yArr);
        let xMax = Math.max(...xArr);
        let yMax = Math.max(...yArr);

        bb_global = { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
        let isPortrait = bb_global.height > bb_global.width;

        // prefer top to bottom priority for portrait aspect ratios 
        if (optimizeOrder) {
            pathDataPlusArr = isPortrait ? pathDataPlusArr.sort((a, b) => a.bb.y - b.bb.y || a.bb.x - b.bb.x) : pathDataPlusArr.sort((a, b) => a.bb.x - b.bb.x || a.bb.y - b.bb.y);
        }

        // flatten compound paths 
        pathData = [];
        pathDataPlusArr.forEach(sub => {
            pathData.push(...sub.pathData);
        });

        if (autoAccuracy) {
            decimals = detectAccuracy(pathData);
            pathOptions.decimals = decimals;

        }

        // collect for merged svg paths 
        if (el && mergePaths) {
            pathData_merged.push(...pathData);
        }
        // single output
        else {

            // optimize path data
            pathData = convertPathData(pathData, pathOptions);

            // remove zero-length segments introduced by rounding
            pathData = removeZeroLengthLinetos(pathData);

            // realign path to zero origin
            if (alignToOrigin) {
                console.log(bb_global);

                pathData[0].values[0] = (pathData[0].values[0] - bb_global.x).toFixed(decimals);
                pathData[0].values[1] = (pathData[0].values[1] - bb_global.y).toFixed(decimals);

                bb_global.x = 0;
                bb_global.y = 0;
            }

            // compare command count
            let comCountS = pathData.length;

            let dOpt = pathDataToD(pathData, minifyD);

            svgSizeOpt = dOpt.length;

            compression = +(100 / svgSize * (svgSizeOpt)).toFixed(2);

            path.d = dOpt;
            path.report = {
                original: comCount,
                new: comCountS,
                saved: comCount - comCountS,
                compression,
                decimals,

            };

            // apply new path for svgs
            if (el) el.setAttribute('d', dOpt);
        }

    } // end path array

    /**
     *  stringify new SVG
     */
    if (mode) {

        if (pathData_merged.length) {

            // optimize path data
            let pathData = convertPathData(pathData_merged, pathOptions);

            // remove zero-length segments introduced by rounding
            pathData = removeZeroLengthLinetos(pathData);

            let dOpt = pathDataToD(pathData, minifyD);

            // apply new path for svgs
            paths[0].el.setAttribute('d', dOpt);

            // remove other paths
            for (let i = 1; i < paths.length; i++) {
                let pathEl = paths[i].el;
                if (pathEl) pathEl.remove();
            }

            // remove empty groups e.g groups
            removeEmptySVGEls(svg);
        }

        // adjust viewBox and width for scale
        if (scale) {

            let { x, y, width, height, w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit } = viewBox;

            if (crop) {
                x = bb_global.x;
                y = bb_global.y;
                width = bb_global.width;
                height = bb_global.height;
                w = width;
                h = height;
            }

            if (hasViewBox) {
                svg.setAttribute('viewBox', [x, y, width, height].map(val => +(val * scale).toFixed(decimals)).join(' '));
            }
            if (hasWidth) {
                svg.setAttribute('width', +(w * scale).toFixed(decimals) + widthUnit);
            }

            if (hasHeight) {
                svg.setAttribute('height', +(h * scale).toFixed(decimals) + heightUnit);
            }
        }

        svg = stringifySVG(svg);

        svgSizeOpt = svg.length;

        compression = +(100 / svgSize * (svgSizeOpt)).toFixed(2);

        svgSize = +(svgSize / 1024).toFixed(3);
        svgSizeOpt = +(svgSizeOpt / 1024).toFixed(3);

        report = {
            svgSize,
            svgSizeOpt,
            compression,
            decimals
        };

    } else {
        ({ d, report } = paths[0]);
    }

    return !getObject ? (d ? d : svg) : { svg, d, report, inputType, mode };

}

// just for visual debugging

/*
import {simplifyPolySchneider} from './svgii/poly_smooth_schneider';
export {simplifyPolySchneider as simplifyPolySchneider }
*/

/*
import {parsePathDataFontello} from './svgii/pathData_parse_fontello';
export {parsePathDataFontello as parsePathDataFontello};
import {parsePathDataString} from './svgii/pathData_parse';
export {parsePathDataString as parsePathDataString}
import { fitCurveN } from './poly-fit-curve-schneider';
export {fitCurveN as fitCurveN}
*/

/*

import {parsePathDataString_plus} from './svgii/pathData_parse2';
export {parsePathDataString_plus as parsePathDataString_plus}
*/

// IIFE 
if (typeof window !== 'undefined') {
    window.svgPathSimplify = svgPathSimplify;

}

export { PI$1 as PI, abs$1 as abs, acos$1 as acos, asin$1 as asin, atan$1 as atan, atan2$1 as atan2, ceil$1 as ceil, cos$1 as cos, exp$1 as exp, floor$1 as floor, hypot, log$1 as log, max$1 as max, min$1 as min, pow$1 as pow, random$1 as random, round$1 as round, sin$1 as sin, sqrt$1 as sqrt, svgPathSimplify, tan$1 as tan };
