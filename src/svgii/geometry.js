/*
import {abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
    log, max, min, pow, random, round, sin, sqrt, tan, PI} from '/.constants.js';
    */

import { deg2rad, rad2Deg, root2 } from "../constants";
//import { roundTo } from "./rounding";
//import { getPolyBBox } from "./geometry_bbox";
import { renderPoint } from "./visualize";


export const {
    abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
    log, max, min, pow, random, round, sin, sqrt, tan, PI
} = Math;


// get angle helper
export function getAngle(p1, p2, normalize = false) {
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    // normalize negative angles
    if (normalize && angle < 0) angle += Math.PI * 2
    return angle
}

export function getAngleFromDelta(dx, dy, normalize = false) {
    let angle = Math.atan2(dy, dx);
    // normalize negative angles
    if (normalize && angle < 0) angle += Math.PI * 2
    return angle
}


export function getPerpendicularPoint(A, B, C) {
    let dx = C.x - A.x;
    let dy = C.y - A.y;
    let t = ((B.x - A.x) * dx + (B.y - A.y) * dy) / (dx * dx + dy * dy);
    return { x: A.x + dx * t, y: A.y + dy * t };
}




export function getDeltaAngle2(centerPoint, startPoint, endPoint, largeArc = false) {

    const normalizeAngle = (angle) => {
        let normalized = angle % (2 * Math.PI);

        if (normalized > Math.PI) {
            normalized -= 2 * Math.PI;
        } else if (normalized <= -Math.PI) {
            normalized += 2 * Math.PI;
        }
        return normalized;
    }

    let startAngle = getAngle(centerPoint, startPoint, false)

    let endAngle = getAngle(centerPoint, endPoint, false)


    // Calculate raw delta angle (difference)
    let deltaAngle = endAngle - startAngle;

    // Normalize the delta angle to range (-π, π]
    //deltaAngle = normalizeAngle(deltaAngle);

    //if (largeArc) deltaAngle = Math.PI * 2 - Math.abs(deltaAngle);

    let phi = 180 / Math.PI
    let startAngleDeg = startAngle * phi
    let endAngleDeg = endAngle * phi
    let deltaAngleDeg = deltaAngle * phi

    return {
        startAngle, endAngle, deltaAngle, startAngleDeg,
        endAngleDeg,
        deltaAngleDeg
    };

}



export function getDeltaAngle(centerPoint, startPoint, endPoint, largeArc = false) {

    const normalizeAngle = (angle) => {
        let normalized = angle % (2 * Math.PI);

        if (normalized > Math.PI) {
            normalized -= 2 * Math.PI;
        } else if (normalized <= -Math.PI) {
            normalized += 2 * Math.PI;
        }
        return normalized;
    }

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

    let phi = 180 / Math.PI
    let startAngleDeg = startAngle * phi
    let endAngleDeg = endAngle * phi
    let deltaAngleDeg = deltaAngle * phi

    return {
        startAngle, endAngle, deltaAngle, startAngleDeg,
        endAngleDeg,
        deltaAngleDeg
    };

}




  /**
   * Returns an array of intersection points.
   * 0 points: No intersection
   * 1 point: Line is tangent
   * 2 points: Line is a secant
   */
  export function lineCircleIntersection(p1 = {x: 0,y: 0}, p2 = {x: 0,y: 0}, centroid = {x: 0,y: 0}, r = 1, exact = true, ignoreStartAndEnd=true
  ) {
    let error = 1e-8;
    r *= 1 + error
    let [x1, y1] = [p1.x, p1.y];
    let [x2, y2] = [p2.x, p2.y];
    let [cx, cy] = [centroid.x, centroid.y];
    let dx = x2 - x1;
    let dy = y2 - y1;
    let a = dx * dx + dy * dy;
    let b = 2 * (dx * (x1 - cx) + dy * (y1 - cy));
    let c = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy) - r * r;
    let discriminant = b * b - 4 * a * c;
    let intersections = [];
    // No intersection
    if (discriminant < 0) {
      return [];
    } else {
      
      let t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      let t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      // Sort t values to maintain drawing direction order
      let tValues = [t1, t2].sort((a, b) => a - b);
      
      let tMin = ignoreStartAndEnd ? 0.01 : 0;
      let tMax = ignoreStartAndEnd ? 0.99 : 1;

      tValues.forEach(t => {
        //let onSegment = !exact ? true : t >= 0 && t <= 1;
        let onSegment = !exact ? true : t > tMin && t < tMax;
        if (onSegment) {
          let pt = {
            x: x1 + t * dx,
            y: y1 + t * dy,
            t: t
          }
          
          intersections.push(pt);
        }
      });
    }
    /*
    intersections.forEach(pt => {
      renderPoint(svg, pt, 'green', '1.5%')
    })
     */
    return intersections;
  }



/**
 * based on:  Justin C. Round's 
 * http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
 */

export function checkLineIntersection(p1 = null, p2 = null, p3 = null, p4 = null, exact = true, respectDirection = false, debug = false) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    let denominator, a, b, numerator1, numerator2;
    let intersectionPoint = {}

    if (!p1 || !p2 || !p3 || !p4) {
        if (debug) console.warn('points missing');
        return false
    }

    // coinciding line points
    if (
        (p1.x === p2.x && p1.y === p2.y) ||
        (p3.x === p4.x && p3.y === p4.y)
    ) {
        return false
    }


    try {
        denominator = ((p4.y - p3.y) * (p2.x - p1.x)) - ((p4.x - p3.x) * (p2.y - p1.y));

        // parallel or colinear
        if (denominator === 0) {
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

    //console.log('denominator', denominator, a, b);

    // if we cast these lines infinitely in both directions, they intersect here:
    intersectionPoint = {
        x: p1.x + (a * (p2.x - p1.x)),
        y: p1.y + (a * (p2.y - p1.y)),
        t1: a,
        t2: b
    }

    let intersection = false;
    // if line1 is a segment and line2 is infinite, they intersect if:
    if ((a > 0 && a < 1) && (b > 0 && b < 1)) {
        intersection = true;
        //console.log('line inters');
    }

    // direction
    if (!exact && respectDirection && ((a > 0 && b < 0) || (a < 0 && b > 0))) {
        intersection = false;
        return false
    }


    if (exact && !intersection) {
        return false;
    }



    // if line1 and line2 are segments, they intersect if both of the above are true
    //console.log('inter', intersectionPoint)
    return intersectionPoint;
};


/** Get relationship between a point and a polygon using ray-casting algorithm
* based on timepp's answer
* https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon#63436180
*/
export function isPointInPolygon(pt, polygon, bb, skipBB = false) {
    const between = (p, a, b) => (p >= a && p <= b) || (p <= a && p >= b);
    let inside = false;

    // not in bbox - quit || no bbox defined
    if (!skipBB || !bb.bottom) {
        if (bb.left > pt.x || bb.top > pt.y || bb.bottom < pt.y || bb.right < pt.x) {
            return false;
        }
    }

    let l = polygon.length;
    for (let i = l - 1, j = 0; j < l; i = j, j++) {
        const A = polygon[i];
        const B = polygon[j];
        // corner cases
        if ((pt.x == A.x && pt.y == A.y) || (pt.x == B.x && pt.y == B.y))
            return true;
        if (A.y == B.y && pt.y == A.y && between(pt.x, A.x, B.x)) return true;
        if (between(pt.y, A.y, B.y)) {
            /** 
             * if pt inside the vertical range filter out "ray pass vertex" problem 
             * by treating the line a little lower
             */
            if ((pt.y == A.y && B.y >= A.y) || (pt.y == B.y && A.y >= B.y)) continue;
            // calc cross product `ptA X ptB`, pt lays on left side of AB if c > 0
            const c = (A.x - pt.x) * (B.y - pt.y) - (B.x - pt.x) * (A.y - pt.y);
            if (c == 0) return true;
            if (A.y < B.y == c > 0) inside = !inside;
        }
    }
    return inside ? true : false;
}




/**
* Linear  interpolation (LERP) helper
*/
export function interpolate(p1, p2, t, getTangent = false) {

    let pt = {
        x: (p2.x - p1.x) * t + p1.x,
        y: (p2.y - p1.y) * t + p1.y,
    };

    if (getTangent) {
        pt.angle = getAngle(p1, p2)

        // normalize negative angles
        if (pt.angle < 0) pt.angle += PI * 2
    }

    return pt
}


export function pointAtT(pts, t = 0.5, getTangent = false, getCpts = false, returnArray = false) {

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
                if (getTangent) pt.angle = getAngle(p0, cp1);
            }

            else if (t === 1 && !shortCp2) {
                pt.x = p.x;
                pt.y = p.y;
                if (getTangent) pt.angle = getAngle(cp2, p);
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
                    if (getTangent) pt.angle = getAngle(m3, m4);

                    /*
                    renderPoint(markers, m0, 'cyan')
                    renderPoint(markers, m3, 'magenta')
                    renderPoint(markers, pt, 'green')
                    renderPoint(markers, m4, 'cyan')
                    renderPoint(markers, m2, 'magenta')
                    */


                    // add control points
                    if (getCpts) {
                        pt.cpts = [m1, m2, m3, m4];
                        pt.segments = [
                            { p0, cp1: m0, cp2: m3, p: pt },
                            { p0: pt, cp1: m4, cp2: m2, p }
                        ]
                    }
                } else {
                    m1 = interpolate(p0, cp1, t);
                    m2 = interpolate(cp1, p, t);
                    pt = interpolate(m1, m2, t);
                    if (getTangent) pt.angle = getAngle(m1, m2);

                    // add control points
                    if (getCpts) {
                        pt.cpts = [m1, m2];
                        pt.segments = [
                            { p0, cp1: m1, p: pt },
                            { p0: p, cp1: m2, p }
                        ]
                    }
                }
            }

        }
        // take simplified calculations without tangent angles
        else {
            let t1 = 1 - t;

            // cubic beziers
            /*
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
            */

            if (isCubic) {
                pt = {
                    x:
                        t1 * t1 * t1 * p0.x +
                        3 * t1 * t1 * t * cp1.x +
                        3 * t1 * t * t * cp2.x +
                        t * t * t * p.x,
                    y:
                        t1 * t1 * t1 * p0.y +
                        3 * t1 * t1 * t * cp1.y +
                        3 * t1 * t * t * cp2.y +
                        t * t * t * p.y,
                };

            }


            // quadratic beziers
            else {
                pt = {
                    x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t * t * p.x,
                    y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t * t * p.y,
                };
            }

        }

        return pt

    }


    // normalize if input was array not pt object
    if (Array.isArray(pts[0])) {
        pts = pts.map(pt => { return { x: pt[0], y: pt[1] } })
        // also output array if not explicitely defined
        returnArray = true
    }


    let pt;
    if (pts.length > 2) {
        pt = getPointAtBezierT(pts, t, getTangent);
    }

    else {
        pt = interpolate(pts[0], pts[1], t, getTangent)
    }

    // normalize negative angles
    if (getTangent && pt.angle < 0) pt.angle += PI * 2

    return returnArray ? [pt.x, pt.y] : pt
}




/**
 * get vertices from path command final on-path points
 */

export function getPathDataVertices(pathData = [], includeCpts = false, decimals = -1) {
    let polyPoints = [];
    //console.log(pathData);

    pathData.forEach((com) => {
        let { type, values } = com;

        // get final on path point from last 2 values
        if (values.length) {

            // round
            if (decimals > -1) values = values.map(val => +val.toFixed(decimals))

            if (includeCpts) {

                for (let i = 1; i < values.length; i += 2) {
                    polyPoints.push({ x: values[i - 1], y: values[i] });
                }

            } else {
                polyPoints.push({ x: values[values.length - 2], y: values[values.length - 1] });
            }

        }
    });
    return polyPoints;
}

/*
export function getPathDataVertices(pathData) {
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
};
*/



/**
 *  based on @cuixiping;
 *  https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
 */


export function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2, normalize = true
) {

    //console.log('params', [x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2]);

    // helper for angle calculation
    const getAngle = (cx, cy, x, y, normalize = true) => {
        let angle = Math.atan2(y - cy, x - cx);
        if (normalize && angle < 0) angle += Math.PI * 2
        return angle
    };

    // make sure rx, ry are positive
    rx = Math.abs(rx);
    ry = Math.abs(ry);

    // normalize xAxis rotation
    xAxisRotation = rx === ry ? 0 : (xAxisRotation < 0 && normalize ? xAxisRotation + 360 : xAxisRotation);


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
        console.warn("rx and ry can not be 0");
        return arcData
    }


    /**
     * if rx===ry x-axis rotation is ignored
     * otherwise convert degrees to radians
     */
    let phi = rx === ry ? 0 : xAxisRotation * deg2rad;
    let cx, cy

    let s_phi = !phi ? 0 : Math.sin(phi);
    let c_phi = !phi ? 1 : Math.cos(phi);

    let hd_x = (x1 - x2) * 0.5;
    let hd_y = (y1 - y2) * 0.5;
    let hs_x = (x1 + x2) * 0.5;
    let hs_y = (y1 + y2) * 0.5;

    // F6.5.1
    let x1_ = !phi ? hd_x : c_phi * hd_x + s_phi * hd_y;
    let y1_ = !phi ? hd_y : c_phi * hd_y - s_phi * hd_x;

    // F.6.6 Correction of out-of-range radii
    //   Step 3: Ensure radii are large enough
    let lambda = (x1_ * x1_) / (rx * rx) + (y1_ * y1_) / (ry * ry);
    if (lambda > 1) {
        let lambdaRoot = Math.sqrt(lambda);
        rx = rx * lambdaRoot;
        ry = ry * lambdaRoot;

        // save real rx/ry
        arcData.rx = rx;
        arcData.ry = ry;
    }

    let rxry = rx * ry;
    let rxy1_ = rx * y1_;
    let ryx1_ = ry * x1_;
    let sum_of_sq = rxy1_ * rxy1_ + ryx1_ * ryx1_; // sum of square
    if (!sum_of_sq) {
        console.warn("start point can not be same as end point");
        return arcData

    }
    let coe = Math.sqrt(Math.abs((rxry * rxry - sum_of_sq) / sum_of_sq));
    if (largeArc === sweep) {
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
    let startAngle = getAngle(cx, cy, x1, y1, normalize);
    let endAngle = getAngle(cx, cy, x2, y2, normalize);

    // adjust end angle

    // Adjust angles based on sweep direction
    if (sweep) {
        // Clockwise
        if (endAngle < startAngle) {
            endAngle += Math.PI * 2;
        }
    } else {
        // Counterclockwise
        if (endAngle > startAngle) {
            endAngle -= Math.PI * 2;
        }
    }

    let deltaAngle = endAngle - startAngle;

    // The rest of your code remains the same
    arcData.startAngle = startAngle;
    arcData.startAngle_deg = startAngle * rad2Deg;
    arcData.endAngle = endAngle;
    arcData.endAngle_deg = endAngle * rad2Deg;
    arcData.deltaAngle = deltaAngle;
    arcData.deltaAngle_deg = deltaAngle * rad2Deg;

    //console.log('arc', arcData);
    return arcData;
}





export function svgArcToCenterParam_back(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2) {

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

    let shortcut = true
    //console.log('short');

    if (rx === ry && shortcut) {

        // test semicircles
        let diffX = Math.abs(x2 - x1)
        let diffY = Math.abs(y2 - y1)
        let r = diffX;

        let xMin = Math.min(x1, x2),
            yMin = Math.min(y1, y2),
            PIHalf = Math.PI * 0.5


        // semi circles
        if (diffX === 0 && diffY || diffY === 0 && diffX) {
            //console.log('semi');

            r = diffX === 0 && diffY ? diffY / 2 : diffX / 2;
            arcData.rx = r
            arcData.ry = r

            // verical
            if (diffX === 0 && diffY) {
                arcData.cx = x1;
                arcData.cy = yMin + diffY / 2;
                arcData.startAngle = y1 > y2 ? PIHalf : -PIHalf
                arcData.endAngle = y1 > y2 ? -PIHalf : PIHalf
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI

            }
            // horizontal
            else if (diffY === 0 && diffX) {
                arcData.cx = xMin + diffX / 2;
                arcData.cy = y1
                arcData.startAngle = x1 > x2 ? Math.PI : 0
                arcData.endAngle = x1 > x2 ? -Math.PI : Math.PI
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI
            }

            //console.log(arcData);
            return arcData;
        }
    }

    /**
     * if rx===ry x-axis rotation is ignored
     * otherwise convert degrees to radians
     */
    let phi = rx === ry ? 0 : (xAxisRotation * PI) / 180;
    let cx, cy

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
        //console.log('error:', rx, ry, rxy1_, ryx1_);
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
        //console.log('adj neg');
        endAngle -= Math.PI * 2
    }

    if (sweep && startAngle > endAngle) {
        //console.log('adj pos');
        endAngle = endAngle <= 0 ? endAngle + Math.PI * 2 : endAngle
    }

    let deltaAngle = endAngle - startAngle
    arcData.startAngle = startAngle;
    arcData.endAngle = endAngle;
    arcData.deltaAngle = deltaAngle;

    //console.log('arc', arcData);
    return arcData;
}



export function rotatePoint(pt, cx, cy, rotation = 0, convertToRadians = false) {
    if (!rotation) return pt;

    rotation = convertToRadians ? (rotation / 180) * Math.PI : rotation;

    return {
        x: cx + (pt.x - cx) * Math.cos(rotation) - (pt.y - cy) * Math.sin(rotation),
        y: cy + (pt.x - cx) * Math.sin(rotation) + (pt.y - cy) * Math.cos(rotation)
    };
}




export function reducepts(pts, max = 48) {
    if (!Array.isArray(pts) || pts.length <= max) return pts;

    // Calculate how many pts to skip between kept pts
    let len = pts.length;
    let step = len / max;
    let reduced = [];

    for (let i = 0; i < max; i++) {
        reduced.push(pts[Math.floor(i * step)]);
    }

    let lenR = reduced.length;
    // Always include the last point to maintain path integrity
    if (reduced[lenR - 1] !== pts[len - 1]) {
        reduced[lenR - 1] = pts[len - 1];
    }

    return reduced;
}


export function sortPolygonLeftTopFirst(pts) {
    if (pts.length === 0) return pts.slice();

    let firstIndex = 0;
    for (let i = 1; i < pts.length; i++) {
        const current = pts[i];
        const first = pts[firstIndex];
        if (current.x < first.x || (current.x === first.x && current.y < first.y)) {
            firstIndex = i;
        }
    }

    return pts.slice(firstIndex).concat(pts.slice(0, firstIndex));
}


export function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = false) {


    //console.log(cx, cy, rx, ry, angle, ellipseRotation, parametricAngle);

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
    }

    if (ellipseRotation) {
        pt.x = cx + (x - cx) * cos(ellipseRotation) - (y - cy) * sin(ellipseRotation)
        pt.y = cy + (x - cx) * sin(ellipseRotation) + (y - cy) * cos(ellipseRotation)
    }
    return pt
}


// to parametric angle helper
export function toParametricAngle(angle, rx, ry) {

    if (rx === ry || (angle % PI * 0.5 === 0)) return angle;
    let angleP = atan(tan(angle) * (rx / ry));

    // Ensure the parametric angle is in the correct quadrant
    angleP = cos(angle) < 0 ? angleP + PI : angleP;

    return angleP
}

// From parametric angle to non-parametric angle
export function toNonParametricAngle(angleP, rx, ry) {

    if (rx === ry || (angleP % PI * 0.5 === 0)) return angleP;

    let angle = atan(tan(angleP) * (ry / rx));
    // Ensure the non-parametric angle is in the correct quadrant
    return cos(angleP) < 0 ? angle + PI : angle;
};


/**
 * get tangent angle on ellipse
 * at angle
 */
export function getTangentAngle(rx, ry, parametricAngle) {

    // Derivative components
    let dx = -rx * sin(parametricAngle);
    let dy = ry * cos(parametricAngle);
    let tangentAngle = atan2(dy, dx);

    return tangentAngle;
}


export function bezierhasExtreme(p0 = null, cpts = []) {

    if (!p0) {
        p0 = cpts[0]
        cpts = cpts.slice(1, cpts.length)
    }

    let l = cpts.length;
    let p = cpts[l - 1];
    let cp1 = cpts[0]
    let cp2 = l === 3 ? cpts[1] : cp1

    // get bounding box
    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y)
    let left = Math.min(p0.x, p.x)
    let right = Math.max(p0.x, p.x)
    let bottom = Math.max(p0.y, p.y)

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


export function getSemiExtremesT(p0, cp1, cp2, p, angleRad = Math.PI / 2) {
    // Rotate all points by -angleRad
    let cos = Math.cos(-angleRad);
    let sin = Math.sin(-angleRad);

    const rotatePoint = (point) => ({
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos
    });

    let p0Rot = rotatePoint(p0);
    let cp1Rot = rotatePoint(cp1);
    let cp2Rot = rotatePoint(cp2);
    let pRot = rotatePoint(p);

    // Now find x-extrema in rotated coordinate system
    // These correspond to points where original tangent angle = angleRad

    let a = -3 * p0Rot.x + 9 * cp1Rot.x - 9 * cp2Rot.x + 3 * pRot.x;
    let b = 6 * p0Rot.x - 12 * cp1Rot.x + 6 * cp2Rot.x;
    let c = 3 * cp1Rot.x - 3 * p0Rot.x;

    let extremes = [];

    if (Math.abs(a) < 1e-12) {
        if (Math.abs(b) > 1e-12) {
            let t = -c / b;
            if (t > 0 && t < 1) extremes.push(t);
        }
        return extremes;
    }

    let discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
        let sqrtDisc = Math.sqrt(discriminant);
        let t1 = (-b + sqrtDisc) / (2 * a);
        let t2 = (-b - sqrtDisc) / (2 * a);

        if (t1 > 0 && t1 < 1) extremes.push(t1);
        if (t2 > 0 && t2 < 1) extremes.push(t2);
    }

    return extremes;
}

export function getBezierExtremeT(pts, { addExtremes = true, addSemiExtremes = false } = {}) {
    let tArr = pts.length === 4 ? cubicBezierExtremeT(pts[0], pts[1], pts[2], pts[3], { addExtremes, addSemiExtremes }) : quadraticBezierExtremeT(pts[0], pts[1], pts[2], { addExtremes, addSemiExtremes });
    if (tArr.length) {
        tArr = tArr.map(t => +t.toFixed(9)).sort();
    }

    return tArr
}


/**
 * based on Nikos M.'s answer
 * how-do-you-calculate-the-axis-aligned-bounding-box-of-an-ellipse
 * https://stackoverflow.com/questions/87734/#75031511
 * See also: https://github.com/foo123/Geometrize
 */

export function getArcExtemesParam({
    cx = 0, cy = 0, rx = 0, ry = 0,
    p = null,
    p0 = null,
    endAngle = 0,
    deltaAngle = 0,


} = {}) {
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
    }

    //parametrize arcto data
    //let arcData = svgArcToCenterParam(p0.x, p0.y, values[0], values[1], values[2], values[3], values[4], values[5], values[6]);
    //let { rx, ry, cx, cy, endAngle, deltaAngle } = arcData;

    // arc rotation
    let deg = values[2];

    // final on path point
    //let p = { x: values[5], y: values[6] }

    // collect extreme points – add end point
    let extremes = [p]

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
    let xArr = [p0.x, p.x]
    let yArr = [p0.y, p.y]
    let xMin = Math.min(...xArr)
    let xMax = Math.max(...xArr)
    let yMin = Math.min(...yArr)
    let yMax = Math.max(...yArr)


    // on path point close after start
    let angleAfterStart = endAngle - deltaAngle * 0.001
    let pP2 = arc(angleAfterStart, cx, cy, rx, ry, alpha);

    // on path point close before end
    let angleBeforeEnd = endAngle - deltaAngle * 0.999
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
        extremes.push(p1)
    }

    // left
    if (pP2.x < xMin || pP3.x < xMin) {
        // get anti-symmetric point
        p2 = arc(angle2, cx, cy, rx, ry, alpha);
        extremes.push(p2)
    }

    // top
    if (pP2.y < yMin || pP3.y < yMin) {
        // get anti-symmetric point
        p4 = arc(angle4, cx, cy, rx, ry, alpha);
        extremes.push(p4)
    }

    // bottom
    if (pP2.y > yMax || pP3.y > yMax) {
        // get point for this theta
        p3 = arc(angle3, cx, cy, rx, ry, alpha);
        extremes.push(p3)
    }

    return extremes;
}








export function getArcExtemes(p0, values) {
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
    }

    //parametrize arcto data
    let arcData = svgArcToCenterParam(p0.x, p0.y, values[0], values[1], values[2], values[3], values[4], values[5], values[6]);
    let { rx, ry, cx, cy, endAngle, deltaAngle } = arcData;

    // arc rotation
    let deg = values[2];

    // final on path point
    let p = { x: values[5], y: values[6] }

    // collect extreme points – add end point
    let extremes = [p]

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
    let xArr = [p0.x, p.x]
    let yArr = [p0.y, p.y]
    let xMin = Math.min(...xArr)
    let xMax = Math.max(...xArr)
    let yMin = Math.min(...yArr)
    let yMax = Math.max(...yArr)


    // on path point close after start
    let angleAfterStart = endAngle - deltaAngle * 0.001
    let pP2 = arc(angleAfterStart, cx, cy, rx, ry, alpha);

    // on path point close before end
    let angleBeforeEnd = endAngle - deltaAngle * 0.999
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
        extremes.push(p1)
    }

    // left
    if (pP2.x < xMin || pP3.x < xMin) {
        // get anti-symmetric point
        p2 = arc(angle2, cx, cy, rx, ry, alpha);
        extremes.push(p2)
    }

    // top
    if (pP2.y < yMin || pP3.y < yMin) {
        // get anti-symmetric point
        p4 = arc(angle4, cx, cy, rx, ry, alpha);
        extremes.push(p4)
    }

    // bottom
    if (pP2.y > yMax || pP3.y > yMax) {
        // get point for this theta
        p3 = arc(angle3, cx, cy, rx, ry, alpha);
        extremes.push(p3)
    }

    return extremes;
}



export function getTatAngles(cpts = [], angles = []) {

    let l = cpts.length;
    let isCubic = l === 4;
    //console.log(angles, isCubic);

    if (!angles.length) angles = [0];

    let anglesL = angles.length;
    let tArr = []

    for (let i = 0; i < anglesL; i++) {

        let ang = angles[i];
        let cptsN = ang ? [] : cpts.slice(0)

        // rotate cpts
        if (ang) {
            for (let j = 0; j < l; j++) {
                let pt = cpts[j]
                cptsN.push(rotatePoint(pt, 0, 0, ang))
            }
        }

        // get t arr
        let tVals = isCubic ? getTatCubicExtreme(...cptsN) : getTatQuadraticExtreme(...cptsN)
        tArr.push(...tVals)

    }

    // deduplicate and sort
    tArr = [... new Set(tArr)].sort()

    return tArr;

}



// t at cubic bezier extreme
export function getTatCubicExtreme(p0, cp1, cp2, p) {

    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    if (!bezierhasExtreme(p0, [cp1, cp2, p])) {
        //console.log('no extreme');
        return []
    }

    let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];
    let tArr = [], a, b, c, t, t1, t2, b2ac, sqrt_b2ac;
    let e = 1e-8

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




//For quadratic bezier.
export function getTatQuadraticExtreme(p0, cp1, p) {

    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    if (!bezierhasExtreme(p0, [cp1, p])) {
        //console.log('no extreme');
        return []
    }

    let a, b, c, t;
    let [x0, y0, x1, y1, x2, y2] = [p0.x, p0.y, cp1.x, cp1.y, p.x, p.y];
    let tArr = [];

    for (let i = 0; i < 2; ++i) {
        a = i == 0 ? x0 - 2 * x1 + x2 : y0 - 2 * y1 + y2;
        b = i == 0 ? -2 * x0 + 2 * x1 : -2 * y0 + 2 * y1;
        c = i == 0 ? x0 : y0;
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
export function cubicBezierExtremeT(p0, cp1, cp2, p,
    { addExtremes = true, addSemiExtremes = false } = {}) {


    // rotate cpts for semi extremes
    const rotatePoint = (pt) => {

        const angleRad = Math.PI / 4
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        return {
            x: pt.x * cos - pt.y * sin,
            y: pt.x * sin + pt.y * cos
        }
    };


    if (addSemiExtremes) {
        p0 = rotatePoint(p0)
        cp1 = rotatePoint(cp1)
        cp2 = rotatePoint(cp2)
        p = rotatePoint(p)
    }


    let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];


    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y)
    let left = Math.min(p0.x, p.x)
    let right = Math.max(p0.x, p.x)
    let bottom = Math.max(p0.y, p.y)

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

    //console.log('addSemiExtremes', addSemiExtremes, addExtremes, tArr);

    return tArr;
}

export function isMultipleOf45(angleRad, epsilon = 0.001) {
    let rad90 = Math.PI / 2;
    let rad45 = rad90 / 2;
    let isRightAngle = Math.abs(angleRad / rad90 - Math.round(angleRad / rad90)) < epsilon
    return !isRightAngle ? Math.abs(angleRad / rad45 - Math.round(angleRad / rad45)) < epsilon : false;
}


//For quadratic bezier.
export function quadraticBezierExtremeT(p0, cp1, p, { addExtremes = true, addSemiExtremes = false } = {}) {


    // rotate cpts for semi extremes
    const rotatePoint = (pt) => {
        const angleRad = -Math.PI / 4
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        return {
            x: pt.x * cos - pt.y * sin,
            y: pt.x * sin + pt.y * cos
        }
    };


    if (addSemiExtremes) {
        p0 = rotatePoint(p0)
        cp1 = rotatePoint(cp1)
        p = rotatePoint(p)
    }


    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y)
    let left = Math.min(p0.x, p.x)
    let right = Math.max(p0.x, p.x)
    let bottom = Math.max(p0.y, p.y)
    let a, b, c, t;

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
        c = i == 0 ? x0 : y0;
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
 * check if lines are intersecting
 * returns point and t value (where lines are intersecting)
 */
export function intersectLines(p1, p2, p3, p4) {

    const isOnLine = (x1, y1, x2, y2, px, py, tolerance = 0.001) => {
        var f = function (somex) { return (y2 - y1) / (x2 - x1) * (somex - x1) + y1; };
        return Math.abs(f(px) - py) < tolerance
            && px >= x1 && px <= x2;
    }


    /*
    // flat lines?
    let is_flat1 = p1.y === p2.y || p1.x === p2.x
    let is_flat2 = p3.y === p4.y || p1.y === p2.y
    console.log('flat', is_flat1, is_flat2);
    */


    if (
        Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) ||
        Math.min(p1.x, p2.x) > Math.max(p3.x, p4.x) ||
        Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) ||
        Math.min(p1.y, p2.y) > Math.max(p3.y, p4.y)
    ) {
        return false;
    }

    let denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (denominator == 0) {
        return false;
    }

    let a = p1.y - p3.y;
    let b = p1.x - p3.x;
    let numerator1 = ((p4.x - p3.x) * a) - ((p4.y - p3.y) * b);
    let numerator2 = ((p2.x - p1.x) * a) - ((p2.y - p1.y) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;


    let px = p1.x + (a * (p2.x - p1.x)),
        py = p1.y + (a * (p2.y - p1.y));

    let px2 = +px.toFixed(2),
        py2 = +py.toFixed(2);


    // is point in boundaries/actually on line?
    if (
        px2 < +Math.min(p1.x, p2.x).toFixed(2) ||
        px2 > +Math.max(p1.x, p2.x).toFixed(2) ||
        px2 < +Math.min(p3.x, p4.x).toFixed(2) ||
        px2 > +Math.max(p3.x, p4.x).toFixed(2) ||
        py2 < +Math.min(p1.y, p2.y).toFixed(2) ||
        py2 > +Math.max(p1.y, p2.y).toFixed(2) ||
        py2 < +Math.min(p3.y, p4.y).toFixed(2) ||
        py2 > +Math.max(p3.y, p4.y).toFixed(2)
    ) {

        // if final point is on line
        if (isOnLine(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y, 0.1)) {
            return { x: p2.x, y: p2.y };
        }
        return false;
    }
    return { x: px, y: py, t: b };
}







/**
 * get distance between 2 points
 * pythagorean theorem
 */
export function getDistance(p1, p2, isArray = false) {

    let dx = isArray ? p2[0] - p1[0] : (p2.x - p1.x);
    let dy = isArray ? p2[1] - p1[1] : (p2.y - p1.y);

    /*
    let sqrt2 = 1.4142135623730951 
    return dx===dy ? Math.abs(dx) * sqrt2 : Math.sqrt(dx * dx + dy * dy);
    */

    return Math.sqrt(dx * dx + dy * dy);
}


// just an alias
export function lineLength(p1, p2) {
    return getDistance(p1, p2)
}


export function getSquareDistance(p1, p2) {
    let dx = (p2.x - p1.x);
    let dy = (p2.y - p1.y);
    return dx * dx + dy * dy
}



/**
 * get Manhattan/Cab distance 
 * based on x/y deltas
 * sloppy but fast
 */
export function getDistManhattan(pt1, pt2) {
    //console.log(pt1, pt2);
    let dx = Math.abs(pt2.x - pt1.x);
    let dy = Math.abs(pt2.y - pt1.y);
    return dx + dy;
}

/**
 * sloppy distance calculation
 * based on "half Manhattan/Cab" distance
 */

export function getDistAv(pt1, pt2) {
    let dx = Math.abs(pt2.x - pt1.x);
    let dy = Math.abs(pt2.y - pt1.y);
    return (dx + dy) * 0.5;
}


/**
 * get command dimensions 
 * for threshold value
 */

export function getComThresh(pts, tolerance = 0.01) {
    let xArr = pts.map(pt => { return pt.x })
    let yArr = pts.map(pt => { return pt.y })
    let xMin = Math.min(...xArr)
    let xMax = Math.max(...xArr)
    let yMin = Math.min(...yArr)
    let yMax = Math.max(...yArr)

    let w = xMax - xMin
    let h = yMax - yMin

    let dimA = (w + h) / 2

    let thresh = dimA * tolerance
    return thresh
}

export function getComBBTolerance(p1, p2, tolerance = 0.5) {
    let xMin = Math.min(p1.x, p2.x)
    let xMax = Math.max(p1.x, p2.x)
    let yMin = Math.min(p1.y, p2.y)
    let yMax = Math.max(p1.y, p2.y)

    let w = xMax - xMin
    let h = yMax - yMin

    let thresh = (w + h) * 0.5 * tolerance
    if (thresh === 0) {
        //console.log('is zero', w,h, p1, p2);
    }
    return thresh
}






/**
 * reduce polypoints
 * for sloppy dimension approximations
 */
export function reducePoints(points, maxPoints = 48) {
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


export function getElementTransform(parent, el) {
    if (!parent || !el) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
    let matrix = parent.getScreenCTM().inverse().multiply(el.getScreenCTM());
    return matrix
}


export function mirrorCpts(cpt2_0, pt0, cpt2, pt1, outgoing = true, t = 0.666) {

    // hypotenuse angle
    let ang0 = getAngle(pt0, pt1, true);
    let ang1 = outgoing ? getAngle(pt1, cpt2, true) : getAngle(pt0, cpt2_0, true);


    let delta = ang0 - ang1
    let ang = ang0 + delta

    // calculate rotated cp
    let r = 2;

    // mirror control point
    let cp2_r = outgoing ? getPointOnEllipse(pt0.x, pt0.y, r, r, ang, 0, false) : getPointOnEllipse(pt1.x, pt1.y, r, r, ang, 0, false);

    // intersection control point
    let cpI = outgoing ? checkLineIntersection(pt1, cpt2, pt0, cp2_r, false) : checkLineIntersection(pt0, cpt2_0, pt1, cp2_r, false);

    //console.log('cpI', cpI);
    let cp1 = cpI ? pointAtT([pt0, cpI], t) : pt1;
    let cp2 = cpI ? pointAtT([pt1, cpI], t) : pt1;

    return { cp1, cp2 }


}
