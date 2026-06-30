import { rad2Deg } from "../constants";
//import { simplifyPolyRDP } from "../simplify_poly_RDP";
//import { simplifyRD } from "../simplify_poly_radial_distance";
import { checkLineIntersection, getAngle, getDeltaAngle, getDeltaAngle2, getDistManhattan, getPointOnEllipse, getSquareDistance, pointAtT, reducePoints, rotatePoint } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { getPolyBBox } from "./geometry_bbox";
import { pathDataFromPoly } from "./pathData_fromPoly";
import { refineAdjacentExtremes } from "./pathData_simplify_refineExtremes";
import { pathDataToD } from "./pathData_stringify";
import { cleanupPolyKeypoints, refineAdjacentPolyExtremes } from "./poly_analyze_cleanup";
import { getTangents } from "./poly_analyze_getTangents";
import { roundPoly } from "./rounding";
import { renderPath, renderPoint, renderPoly } from "./visualize";


export function getPolyCentroid(pts) {

    let l = pts.length;
    let x = 0, y = 0;
    for (let i = 0; l && i < l; i++) {
        let pt = pts[i];
        x += pt.x
        y += pt.y
    }

    let centroid = { x: x / l, y: y / l }
    return centroid
    //console.log(centroid);

}

export function getPolyCentroidWeighted(points) {
    if (!points || points.length === 0) return null;

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;

    for (const point of points) {
        let weight = point.weight || 1; // default weight = 1
        sumX += point.x * weight;
        sumY += point.y * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) return null;

    return {
        x: sumX / totalWeight,
        y: sumY / totalWeight
    };
}



export function detectRegularPolygon(pts, centroid = { x: 0, y: 0 }) {
    let rSq = getSquareDistance(pts[0], centroid);
    let isRegular = true;

    for (let i = 1, l = pts.length; i < l; i++) {
        let pt1 = pts[i];
        let dist = getSquareDistance(pt1, centroid);

        let diff = Math.abs(rSq - dist);
        let diffRel = diff / rSq
        //console.log('diffRel', diffRel);

        if (diffRel > 0.05) {
            return false;
        }


    }
    return isRegular;
}


export function analyzePoly(pts, {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    debug = false
} = {}) {

    //console.log(width, height);

    let l = pts.length;
    let left = x;
    let top = y;
    let right = x + width;
    let bottom = y + height;

    if (!width || !height) {
        ({ x, y, width, height, top, bottom, left, right } = getPolyBBox(pts));
    }

    // round 
    [x, y, width, height, top, bottom, left, right] = [x, y, width, height, top, bottom, left, right].map(val => +val.toFixed(8))


    // bounding box of this sub poly
    let bb0 = { x, y, top, left, width, height, right, bottom }


    //console.log(polyArea);
    let thresh = (width + height) * 0.01;

    // threshold for horizontal or vertical detection
    let thresh2 = thresh * 0.75

    let dims = [];

    //console.log(thresh);

    //pts = roundPoly(pts, 3)
    //console.log(pts);

    /*
    pts.forEach(pt=>{
        renderPoint(markers, pt, 'red', '2.5%')
    })
    */

    /**
     * 1st run:
     * collect more details 
     * area for sign change detection
     * deltas and distances
     */
    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        let area = getPolygonArea([p0, p1, p2], false);
        let dx = i > 0 ? +(p1.x - p0.x).toFixed(7) : 0
        let dy = i > 0 ? +(p1.y - p0.y).toFixed(7) : 0

        let dx2 = +(p2.x - p0.x).toFixed(7)
        let dy2 = +(p2.y - p0.y).toFixed(7)


        p1.area = area;
        p1.dist = i > 0 ? getDistManhattan(p0, p1) : 0;
        // add dist for long/short segment detection
        dims.push(p1.dist);
        p1.idx = i
        p1.dx = dx
        p1.dy = dy
        p1.dx2 = dx2
        p1.dy2 = dy2

        //pts[i] = p1
    }


    /**
     * find average segment length
     * for long/short segment detection
     */
    dims = dims.filter(Boolean).sort((a, b) => a - b)
    let lenD = dims.length;
    let dimMin = dims[0];
    let dimMax = dims[lenD - 1];
    //let idxMid = Math.abs(dims.length*0.5);
    let dimAv = dims.reduce((a, b) => a + b, 0) / lenD;
    let dimShort = (dimMin + dimAv) * 0.5
    let dimLong = dimAv * 2;
    //console.log('dims', dims, 'dimAv', dimAv, 'dimMin', dimMin, 'dimMax', dimMax, 'dimShort', dimShort);
    //console.log(pts);


    /*
    // round to adjust for minor deviations
    let idx_q = Math.ceil(lenD * 0.25);
    let dim_mid = dims[Math.floor(lenD * 0.5)]
    let dims_min = dims.slice(0, Math.floor(lenD * 0.25));
    let dim_min = ((dims_min.reduce((a, b) => a + b, 0) / idx_q) + dim_mid) * 0.5;

    let threshold = 75
    let decimalsAuto = dim_min > threshold * 1.5 ? 0 : Math.floor(threshold / dim_min).toString().length

    // clamp
    decimalsAuto = Math.min(Math.max(0, decimalsAuto), 8)
    //console.log('decimalsAuto', decimalsAuto);

    pts = roundPoly(pts, 2)
    console.log(pts);
    */


    /**
     * analyze topology: 
     * find significant commands:
     * extremes, inflections etc.
     */
    for (let i = 0; i < l; i++) {
        //let p02 = i > 1 ? pts[i - 2] : pts[l - 1];
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        // convert area to absolute for flatness checks
        let area1 = Math.abs(p1.area)
        let isCorner = false;
        let isSemiExtreme = false;
        let isShort = false;
        let isLong = false;

        /**
         * detect short or long
         */
        if (p1.dist > dimLong) {
            isLong = true;
        }

        if (p1.dist < dimShort) {
            isShort = true;
        }

        let flat = !p1.area || area1 < thresh



        /**
         * check extremes
         */
        let isExtreme = false;

        //console.log(bb0.top, p1.x, p1.y);

        // 1. total extreme
        let isTop = p1.y === bb0.top;
        let isBottom = p1.y === bb0.bottom;
        let isLeft = p1.x === bb0.left;
        let isRight = p1.x === bb0.right;

        if (i === 0) {
            //console.log(p1, bb0);
        }

        if (isTop || isBottom || isLeft || isRight) {
            isExtreme = true;
            //renderPoint(markers, p1, 'cyan', '2.75%')
        }

        // 1.2 horizontal or vertical
        /*
        let isHorizontal = isTop || isBottom || (p1.y === p0.y && p1.x !== p0.x);
        let isVertical = isLeft || isRight || (p1.x === p0.x && p1.y !== p0.y)


        if ((isHorizontal || isVertical)) {

            let diffX = Math.abs(p0.x - p1.x)
            let diffY = Math.abs(p0.y - p1.y)

            //renderPoint(markers, p0, 'cyan', '2.75%')

            if (isLong) {
            }

            if (isLong && (diffY < thresh2) && diffX > thresh) {
                p0.isExtreme = true;
                p0.isHorizontal = true;
            }
            else if (isLong && (diffX < thresh2) && diffY > thresh) {
                p0.isExtreme = true;
                p0.isVertical = true;
            }

            isExtreme = true
        }
        */

        let dx = Math.abs(p0.x - p1.x)
        let dy = Math.abs(p0.y - p1.y)

        let vh_thresh = thresh * 0.05
        //  vh_thresh = thresh * 0.25
        let isHorizontal = isTop || isBottom || (p1.y === p0.y && p1.x !== p0.x) || (dy <= vh_thresh);
        let isVertical = (isLeft || isRight || (p1.x === p0.x && p1.y !== p0.y) || (dx <= vh_thresh))


        // renderPoint(markers, p1, 'red', '0.5%')


        if (p1.y === p0.y) {

        }

        if (dy > 0) {
            //console.log(p1, dy);
            //renderPoint(markers, p1, 'red', '3%')
            //renderPoint(markers, p0, 'blue', '3%')
        }



        if ((isHorizontal || isVertical)) {

            //renderPoint(markers, p1, 'red', '3%')
            if (isLong && isHorizontal) {
                p0.isExtreme = true;
                p0.isHorizontal = true;

            }
            else if (isLong && isVertical) {
                p0.isExtreme = true;
                p0.isVertical = true;
            }

            isExtreme = true
        }



        // 1.3 is local or absolute extreme
        let bb = getPolyBBox([p0, p2]); // local bb
        let { left, right, top, bottom } = bb;

        //let extremeLocal = (p1.x <= left || p1.x >= right || p1.y <= top || p1.y >= bottom) 
        let extremeLocal = (p1.x < left || p1.x > right || p1.y < top || p1.y > bottom)
        if (!isExtreme && extremeLocal) {
            isExtreme = true
            //renderPoint(markers, p1, 'blue', '2%', '0.5')
        }


        /**
         * 2. sign changes
         */
        let signChange = (p0.area < 0 && p1.area > 0) || (p0.area > 0 && p1.area < 0)
        let isDirChange = signChange && !flat && !p0.isDirChange && isLong

        if (isDirChange) {
            //renderPoint(markers, p1, 'green', '3%')
        }



        /**
         * 3. corners
         */

        if (isExtreme) {

            let delta = getDeltaAngle(p1, p2, p0)
            let { deltaAngleDeg } = delta
            deltaAngleDeg = Math.abs(deltaAngleDeg)

            let isCornerDelta = deltaAngleDeg > 10 && deltaAngleDeg < 160
            if (isCornerDelta) {
                //console.log(deltaAngleDeg);
                isCorner = true;
                //console.log( p1.dx, p1.dy, p1.dx2, p1.dy2);
            }

        }


        if (isExtreme && !isCorner) {
            //console.log('dy', p1.dy, p1.dy2);
            if ((Math.abs(p1.dy2) < thresh2) && Math.abs(p1.dx2) > thresh) {
                isHorizontal = true
            }
            else if (Math.abs(p1.dx2) < thresh2 && Math.abs(p1.dy2) > thresh) {
                isVertical = true
            }
        }


        /**
         * semi extremes 
         * ~  45deg tangent
         */
        let diffX = Math.abs(p1.dx2)
        let diffY = Math.abs(p1.dy2)
        //let ratDelta = Math.abs(0.5-diffX/diffY)
        let ratDelta = (diffX / diffY)

        if (ratDelta > 0.8 && ratDelta <= 1.2) {
            isSemiExtreme = true;
        }


        p1.isCorner = isCorner;
        p1.isExtreme = isExtreme;
        p1.isSemiExtreme = isSemiExtreme;
        p1.isLong = isLong;
        p1.isShort = isShort;

        p1.isHorizontal = isHorizontal;
        p1.isVertical = isVertical;
        p1.isDirChange = isDirChange;

        //renderPoint(markers, p1, 'red', '2%', '0.5')

    }


    // add tangents
    getTangents(pts, { x, y, width, height })

    refineAdjacentPolyExtremes(pts)

    // filter adjacent significant points
    cleanupPolyKeypoints(pts);

    renderPolyTopology(pts)

    return pts
}

/*

*/



// just for visualization
function renderPolyTopology(pts, showTangents = true) {

    let l = pts.length


    //renderPoint(markers, pts[0], 'green', '1.5%', '0.5')

    // render
    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];


        //renderPoly(markers, [p0, p1, p2], '0.5%', 'none', (p1.area > 0 ? 'green' : 'blue'), true)


        if (p1.isDirChange) {
            renderPoint(markers, p1, 'orange', '1%', '0.75')
        }

        if (p1.isSemiExtreme) {
            renderPoint(markers, p1, 'red', '1%', '0.5')
        }

        /*
        if (p1.isLong && (p1.isDirChange || p1.isExtreme || p1.isCorner || p1.isSemiExtreme)) {
            renderPoint(markers, p1, 'green', '1.5%', '0.5')
        }
        */

        if (p1.isDirChange) {
            renderPoint(markers, p1, 'green', '1.5%', '0.5')
        }


        if (p1.isExtreme) {
            renderPoint(markers, p1, 'cyan', '1%', '0.5')
        }

        if (p1.isHorizontal) {
            renderPoint(markers, p1, 'blue', '1.5%', '0.25')
        }

        if (p1.isVertical) {
            renderPoint(markers, p1, 'purple', '1.5%', '0.25')
        }


        if (p1.isCorner) {
            renderPoint(markers, p1, 'magenta', '1%', '1')
        }

        //pts[i] = p1

        if (showTangents && (p1.isCorner || p1.isSemiExtreme || p1.isDirChange || p1.isExtreme)) {
            renderPoint(markers, p1.tangentL, 'darkred', '0.5%')
            renderPoint(markers, p1.tangentR, 'darkblue', '0.5%')

            /*
            if (p1.isDirChange) {
                renderPoint(markers, p1.tangentL, 'darkred', '1.5%')
                renderPoint(markers, p1.tangentR, 'darkblue', '1.5%')
            }
            */



        }

    }



}





/**
 * check whether a polygon is likely 
 * to be closed 
 * or an open polyline 
 */
export function isClosedPolygon(pts, reduce = 24) {

    let ptsR = reducePoints(pts, reduce);
    let { width, height } = getPolyBBox(ptsR);
    //let dimAvg = Math.max(width, height);
    let dimAvg = (width + height) / 2;
    //let closingThresh = (dimAvg / pts.length) ** 2
    let closingThresh = (dimAvg) ** 2
    let closingDist = getSquareDistance(pts[0], pts[pts.length - 1]);

    return closingDist < closingThresh;
}