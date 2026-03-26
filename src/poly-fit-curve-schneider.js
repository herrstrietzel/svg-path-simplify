
/**
  *  Algorithm for Automatically Fitting Digitized Curves
  *  by Philip J. Schneider
  *  "Graphics Gems", Academic Press, 1990
  *  The MIT License (MIT)
  *  https://github.com/soswow/fit-curves
  * 
  */

import { harmonizeCubicCpts, harmonizeCubicCptsThird } from "./pathData_simplify_harmonize_cpts";
import { checkLineIntersection, getAngle, getDistance, getSquareDistance, pointAtT, reducePoints, rotatePoint } from "./svgii/geometry";
import { getPolygonArea } from "./svgii/geometry_area";
import { detectRegularPolygon, getPolyCentroid } from "./svgii/poly_analyze";
import { renderPath, renderPoint } from "./svgii/visualize";






/**
 * Fit one or more Bezier curves to a set of pts.
 *
 */
export function fitCurveSchneider(pts, {
    maxError = 0,
    adjustCpts = true,
    harmonize = true,
    keepCorners = true
} = {}) {

    if (pts.length === 1) {
        return [];
    }

    // single lineto
    if (pts.length === 2) {
        return [
            { type: 'L', values: [pts[0].x, pts[0].y] },
            { type: 'L', values: [pts[1].x, pts[1].y] }
        ]
    }

    // prevent bulging
    //keepCorners = true
    //keepCorners = false

    let len = pts.length;
    let leftTangent = createTangent(pts[1], pts[0]);
    let rightTangent = createTangent(pts[len - 2], pts[len - 1]);
    let beziers = fitCubic(pts, leftTangent, rightTangent, maxError, keepCorners);

    // create pathdata
    let pathData = bezierPtsToPathData(beziers)
    let cp1, cp2;

    adjustCpts = false
    //harmonize = false;

    adjustCpts = true;
    //harmonize = true;


    if (adjustCpts) {

        //console.log('refine cpts');

        let len2 = pathData.length;
        let com1 = pathData[0]

        // last cubic segment
        let com2 = pathData[len2 - 1]

        //adjust 1st and last angle
        let p0 = { x: pts[0].x, y: pts[0].y }
        let p1 = { x: pts[1].x, y: pts[1].y }
        let p2 = pts[2] ? { x: pts[2].x, y: pts[2].y } : null

        if (p2) {
            cp1 = { x: com1.values[0], y: com1.values[1] }
            cp1 = adjustTangentAngle(cp1, p0, p1, p2)
            com1.values[0] = cp1.x
            com1.values[1] = cp1.y
        }

        let pL = { x: pts[len - 1].x, y: pts[len - 1].y }
        let pL1 = { x: pts[len - 2].x, y: pts[len - 2].y }
        let pL2 = pts[len - 3] ? { x: pts[len - 3][0], y: pts[len - 3][1] } : null

        if (pL2) {
            cp2 = { x: com2.values[2], y: com2.values[3] }
            cp2 = adjustTangentAngle(cp2, pL, pL1, pL2)
            com2.values[2] = cp2.x
            com2.values[3] = cp2.y
        }

        /*
        // harmonize too tight tangents
        let harmonize = true;
         harmonize = false;
        if (harmonize) {
            pathData = harmonizeCubicCptsThird([{ type: 'M', values: [pts[0].x, pts[0].y] },
            ...pathData])
            pathData.shift()
        }
        */

    }

    //console.log('pathData schneider', pathData);
    return pathData
}


/**
 * Fit a Bezier curve to a (sub)set of digitized pts.
 * Your code should not call this function directly. Use fitCurve instead.
 *control-point-1, control-point-2, second-point] and pts are [x, y]
 */
function fitCubic(pts, leftTangent, rightTangent, error, keepCorners = false) {


    //Max times to try iterating (to find an acceptable curve)
    let MaxIterations = 20;
    let bezCurve;

    /*
    //Use heuristic if region only has two pts in it
    if (pts.length === 2) {
        let dist = getDistance(pts[0], pts[1], false) * 0.333;
        bezCurve = [pts[0], addArrays(pts[0], mulItems(leftTangent, dist)), addArrays(pts[1], mulItems(rightTangent, dist)), pts[1]];
        return [bezCurve];
    }
    */


    //Parameterize pts, and attempt to fit curve
    let u = chordLengthParameterize(pts);
    let _generateAndReport = generateAndReport(pts, u, u, leftTangent, rightTangent);

    bezCurve = _generateAndReport[0];

    let maxError = _generateAndReport[1];
    let splitPoint = _generateAndReport[2];


    // check if curve is bulged
    if (keepCorners) {
        let checkBulge = areaDeviationTooLarge(pts, bezCurve);
        let { isBulged, bezierNew } = checkBulge;
        if (isBulged) {
            // return cubic corner segment
            bezCurve = bezierNew
        }
    }


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

    if (centerVector.x === 0 && centerVector.y === 0) {
        centerVector = subtract(pts[splitPoint - 1], pts[splitPoint]);
        let _ref = { x: -centerVector.y, y: centerVector.x };
        centerVector.x = _ref.x;
        centerVector.y = _ref.y;
    }

    let toCenterTangent = normalize(centerVector);
    //To and from need to point in opposite directions:
    let fromCenterTangent = mulItems(toCenterTangent, -1);

    if (pts.length === 3) {
        //splitPoint--
    }

    beziers.push(
        ...fitCubic(pts.slice(0, splitPoint + 1), leftTangent, toCenterTangent, error, keepCorners),
        ...fitCubic(pts.slice(splitPoint), fromCenterTangent, rightTangent, error, keepCorners)
    );



    return beziers;
};



/**
 * Use least-squares method to find Bezier control pts for region.
*/
function generateBezier(pts, parameters, leftTangent, rightTangent) {

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
    let segLength = getDistance(firstPoint, lastPoint, false);
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


function generateAndReport(pts, paramsOrig, paramsPrime, leftTangent, rightTangent) {
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

    let dx = q.x - point.x;
    let dy = q.y - point.y;

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
        currU = prevU + getDistance(p, p0, false);
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
    let ptOnPath = null

    for (i = 0; i < l; i++) {
        point = pts[i];
        //Find 't' for a point on the bez curve that's as close to 'point' as possible:
        t = find_t(parameters[i], t_distMap, 10);

        ptOnPath = pointAtT(bez, t);
        dist = getSquareDistance(ptOnPath, point)

        /*
        console.log('v', v);
        v = subtract(pointAtT(bez, t), point);
        dist = v.x * v.x + v.y * v.y;
        */

        if (dist > maxDist) {
            //renderPoint(markers, ptOnPath)
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
        sumLen += getDistance(B_t_curr, B_t_prev);
        B_t_dist.push(sumLen);
        B_t_prev = B_t_curr;
    }

    //Normalize B_length to the same interval as the parameter distances; 0 to 1:
    B_t_dist = B_t_dist.map((x) => {
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


function areaDeviationTooLarge(pts, bezCurve) {

    let split = 4;
    let step = 1 / split;
    let l = pts.length

    // create polygon from curve candidate
    let poly = [bezCurve[0]];
    let pt;

    for (let i = 1; i < split; i++) {
        let t = step * i
        pt = pointAtT(bezCurve, t)
        poly.push(pt);
    }

    poly.push(bezCurve[bezCurve.length - 1]);

    // Original area
    let polyArea = getPolygonArea(pts, false)

    // flat line
    if (!polyArea && pts.length === 2) {
        polyArea = getSquareDistance(pts[0], pts[1]) * 0.01
    }

    let curveArea = getPolygonArea(poly, false);
    let rat = curveArea / polyArea;

    let isBulged = rat > 1.1
    //|| rat < 0.9
    // isBulged = rat > 2
    let bezierNew = bezCurve
    if (isBulged) {
        let ptMid = pts[Math.floor(l * 0.5)]
        let p = pts[l - 1];
        /*
        let cp1 = pointAtT([pts[0], ptMid], 0.666);
        let cp2 = pointAtT([p, ptMid], 0.666);
        //let ptMid2 = pts[Math.floor(pts.length*0.666)]
        bezierNew = [pts[0], cp1, cp2, p]
        //bezierNew = [pts[0], ptMid, ptMid, p]
 
        //renderPoint(markers, cp1, 'cyan')
        //renderPoint(markers, cp2, 'cyan')
        //console.log('bezCurve', bezCurve,  pts);
 
        cp1 = pointAtT([bezCurve[0], bezCurve[3]], 0.333);
        cp2 = pointAtT([bezCurve[0], bezCurve[3]], 0.666);
        bezCurve = [bezCurve[0], cp1, cp2, bezCurve[3]]
        */

        //console.log('!!!bulged');

        bezCurve = [pts[0], ptMid, ptMid, p]
        bezierNew = bezCurve
    }

    return { isBulged, bezierNew };
}


/**
 * Creates a vector of length 1 which shows the direction from B to A
 */
function createTangent(p1, p2) {
    // Returns unit vector pointing from B to A
    let dx = p1.x - p2.x;
    let dy = p1.y - p2.y;
    let length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return { x: 0, y: 0 };
    return { x: dx / length, y: dy / length };
}


/**
 * Math helpers
 */

// Basic vector utilities (only what's absolutely necessary)
function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

function addArrays(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}


function mulItems(v, s) {
    return { x: v.x * s, y: v.y * s };
}


function normalize(v) {
    let len = Math.sqrt(v.x * v.x + v.y * v.y);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
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
        dx = 6 * mt * (cp2.x - 2 * cp1.x + p0.x) +
            6 * t * (p1.x - 2 * cp2.x + cp1.x);

        dy = 6 * mt * (cp2.y - 2 * cp1.y + p0.y) +
            6 * t * (p1.y - 2 * cp2.y + cp1.y);

    } else {
        dx = 3 * mt2 * (cp1.x - p0.x) +
            6 * mt * t * (cp2.x - cp1.x) +
            3 * t2 * (p1.x - cp2.x);

        dy = 3 * mt2 * (cp1.y - p0.y) +
            6 * mt * t * (cp2.y - cp1.y) +
            3 * t2 * (p1.y - cp2.y);
    }

    return [dx, dy];
}


function adjustTangentAngle(cp, p0, p1, p2) {
    let ang1 = getAngle(p0, p1)
    let ang2 = getAngle(p0, p2)
    let angDiff = (ang2 - ang1)
    cp = rotatePoint(cp, p0.x, p0.y, -angDiff)
    return cp
}



// convert to pathdata
function bezierPtsToPathData(beziers = []) {
    let pathData = [];
    beziers.forEach(bez => {

        let type = bez.length === 4 ? 'C' : (bez.length === 3 ? 'Q' : 'L')

        let cp1 = type === 'C' || type === 'Q' ? bez[1] : null;
        let cp2 = type === 'C' ? bez[2] : null;
        let p = bez[bez.length - 1]

        let values = type === 'C' ?
            [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] :
            (type === 'Q' ?
                [cp1.x, cp1.y, p.x, p.y] :
                [p.x, p.y]
            )

        let com = { type, values }
        pathData.push(com)
    })

    return pathData
}


