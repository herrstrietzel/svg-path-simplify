
/**
  *  Algorithm for Automatically Fitting Digitized Curves
  *  by Philip J. Schneider
  *  "Graphics Gems", Academic Press, 1990
  *  The MIT License (MIT)
  *  https://github.com/soswow/fit-curves
  * 
  */

import { harmonizeCubicCpts, harmonizeCubicCptsThird } from "./pathData_simplify_harmonize_cpts";
import { getAngle, getDistance, pointAtT, rotatePoint } from "./svgii/geometry";
import { renderPoint } from "./svgii/visualize";


let polyPtsToArray = (pts) => {
    return Array.from(pts).map(pt => [pt.x, pt.y])
}

// convert to pathdata
let bezierPtsToPathData = (beziers) => {
    //let pathData = [{ type: 'M', values: [beziers[0][0][0], beziers[0][0][1]] }];
    let pathData = [];

    beziers.forEach(bez => {
        let cp1 = bez[1]
        let cp2 = bez[2]
        let p = bez[3]
        let com = { type: 'C', values: [cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]] }
        pathData.push(com)
    })

    return pathData
}



/**
 * Fit one or more Bezier curves to a set of pts.
 *
 */
export function fitCurveN(pts, maxError, adjustCpts = true, harmonize= true) {

    if (!Array.isArray(pts) || (pts[0].x !== undefined)) {

        if (pts[0].x !== undefined) {
            pts = polyPtsToArray(pts)
        } else {
            throw Error("Not a valid point array");
        }
    }

    //console.log(pts);

    // Remove duplicate pts
    pts = pts.filter(function (point, i) {
        return i === 0 || !point.every((val, j) => {
            return val === pts[i - 1][j];
        });
    });

    if (pts.length === 1) {
        //return [{ type: 'L', values: [pts[0][0], pts[0][1]] }];
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
    let pathData = bezierPtsToPathData(beziers)



    // adjustCpts -post
    //adjustCpts = false
    //harmonize= false;

    let cp1, cp2;
    if (adjustCpts) {

        let len2 = pathData.length;
        let com1 = pathData[0]

        // last cubic segment
        let com2 = pathData[len2 - 1]

        //adjust 1st and last angle
        let p0 = { x: pts[0][0], y: pts[0][1] }
        let p1 = { x: pts[1][0], y: pts[1][1] }
        let p2 = pts[2] ? { x: pts[2][0], y: pts[2][1] } : null

        if (p2) {
            cp1 = { x: com1.values[0], y: com1.values[1] }
            cp1 = adjustTangentAngle(cp1, p0, p1, p2)
            com1.values[0] = cp1.x
            com1.values[1] = cp1.y
        }

        let pL = { x: pts[len - 1][0], y: pts[len - 1][1] }
        let pL1 = { x: pts[len - 2][0], y: pts[len - 2][1] }
        let pL2 = pts[len - 3] ? { x: pts[len - 3][0], y: pts[len - 3][1] } : null

        if (pL2) {
            cp2 = { x: com2.values[2], y: com2.values[3] }
            cp2 = adjustTangentAngle(cp2, pL, pL1, pL2)
            com2.values[2] = cp2.x
            com2.values[3] = cp2.y
        }

        // harmonize too tight tangents
        //let harmonize= true;
        if(harmonize){
            pathData = harmonizeCubicCptsThird([{ type: 'M', values: [pts[0][0], pts[0][1]] }, 
            ...pathData])
            pathData.shift()
        }


    }

    //console.log('pathData schneider', pathData);
    return pathData
}


function adjustTangentAngle(cp, p0, p1, p2) {
    let ang1 = getAngle(p0, p1)
    let ang2 = getAngle(p0, p2)
    let angDiff = (ang2 - ang1)
    cp = rotatePoint(cp, p0.x, p0.y, -angDiff)
    return cp
}


/**
 * Use least-squares method to find Bezier control pts for region.
*/
let generateBezier = (pts, parameters, leftTangent, rightTangent) => {

    //Bezier curve ctl pts
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

    //Create the C and X matrices
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

    //Compute the determinants of C and X
    let det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
    let det_C0_X = C[0][0] * X[1] - C[1][0] * X[0];
    let det_X_C1 = X[0] * C[1][1] - X[1] * C[0][1];

    //Finally, derive alpha values
    let alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
    let alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;
    let segLength = getDistance(firstPoint, lastPoint, true);
    let epsilon = 1.0e-6 * segLength;

    if (alpha_l < epsilon || alpha_r < epsilon) {
        //Fall back on standard (probably inaccurate) formula, and subdivide further if needed.
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
    //Max times to try iterating (to find an acceptable curve)
    let MaxIterations = 20; 
    let bezCurve;

    //Use heuristic if region only has two pts in it
    if (pts.length === 2) {
        let dist = getDistance(pts[0], pts[1], true) * 0.333;
        bezCurve = [pts[0], addArrays(pts[0], mulItems(leftTangent, dist)), addArrays(pts[1], mulItems(rightTangent, dist)), pts[1]];
        return [bezCurve];
    }

    //Parameterize pts, and attempt to fit curve
    let u = chordLengthParameterize(pts);
    let _generateAndReport = generateAndReport(pts, u, u, leftTangent, rightTangent);

    bezCurve = _generateAndReport[0];
    let maxError = _generateAndReport[1];
    let splitPoint = _generateAndReport[2];

    if (maxError === 0 || maxError < error) {
        return [bezCurve];
    }
    //If error not too large, try some reparameterization and iteration
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
            //If the development of the fitted curve grinds to a halt,
            //we abort this attempt (and try a shorter curve):
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

    //Fitting failed -- split at max error point and fit recursively
    let beziers = [];
    let centerVector = subtract(pts[splitPoint - 1], pts[splitPoint + 1]);

    if (centerVector.every(function (val) {
        return val === 0;
    })) {
        //[x,y] -> [-y,x]: http://stackoverflow.com/a/4780141/1869660
        centerVector = subtract(pts[splitPoint - 1], pts[splitPoint]);
        let _ref = [-centerVector[1], centerVector[0]];
        centerVector[0] = _ref[0];
        centerVector[1] = _ref[1];
    }

    let toCenterTangent = normalize(centerVector);
    //To and from need to point in opposite directions:
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
}



/**
 * Given set of pts and their parameterization, try to find a better parameterization.
 */
function reparameterize(bezier, pts, parameters) {
    return parameters.map((p, i) => {
        return newtonRaphsonRootFind(bezier, pts[i], p);
    });
};

/**
 * Use Newton-Raphson iteration to find better root.
 */

function newtonRaphsonRootFind(bez, point, u) {
    // bez is [p0, cp1, cp2, p1] where each is [x, y]
    // point is the target point [x, y] we're trying to get close to
    // u is our current parameter value (0-1)

    // Calculate q(u) - point (the vector from target to curve point)
    //let q = bezierQ(bez, u);
    let q = pointAtT(bez, u)

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
    let currU = 0
    let prevU = 0

    //prevU = 0
    //console.log('prevU', prevU);


    for (let i = 0; i < l; i++) {
        p = pts[i];
        //currU = i ? prevU + length(subtract(p, p0)) : 0;
        currU = prevU + getDistance(p, p0, true);
        u.push(currU);
        prevU = currU;

        p0 = p;
    };


    u = u.map(function (x) {
        return x / prevU;
    });

    return u;
};

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

    //console.log('computeMaxError', pts, bez, parameters);

    let t_distMap = mapTtoRelativeDistances(bez, 10);
    let l = pts.length

    for (i = 0; i < l; i++) {
        point = pts[i];
        //Find 't' for a point on the bez curve that's as close to 'point' as possible:
        t = find_t(parameters[i], t_distMap, 10);

        v = subtract(pointAtT(bez, t), point);
        dist = v[0] * v[0] + v[1] * v[1];

        if (dist > maxDist) {
            maxDist = dist;
            splitPoint = i;
        }
    }

    return [maxDist, splitPoint];
};

//Sample 't's and map them to relative distances along the curve:
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

    //Normalize B_length to the same interval as the parameter distances; 0 to 1:
    B_t_dist = B_t_dist.map(function (x) {
        return x / sumLen;
    });
    return B_t_dist;
};

function find_t(param, t_distMap, B_parts) {

    if (param < 0) {
        return 0;
    }
    if (param > 1) {
        return 1;
    }

    let lenMax, lenMin, tMax, tMin, t;

    //Find the two t-s that the current param distance lies between,
    //and then interpolate a somewhat accurate value for the exact t:
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



