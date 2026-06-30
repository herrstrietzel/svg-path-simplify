import { getSquareDistance, reducePoints } from "./svgii/geometry";
import { getPolygonArea } from "./svgii/geometry_area";
import { getPolyBBox } from "./svgii/geometry_bbox";


export function removeCoincidingVertices(pts = []) {
    let l = pts.length;
    if (!l) return pts;

    let ptsN = [pts[0]];
    let pt1, pt2;

    for (let i = 1; i < l; i++) {
        pt1 = pts[i - 1];
        pt2 = pts[i];

        /**
         * 1. Skip zero-length segments
         */
        if (pt1.x === pt2.x && pt1.y === pt2.y) {
            continue;
        }
        ptsN.push(pt2)
    }
    return ptsN

}

export function simplifyRC(pts = [], quality = 1, shiftStart = true) {

    let l = pts.length;
    if (l < 4) return pts;

    // starting point
    let M = pts[0];

    // last point
    let Z = pts[l - 1];

    // remove unnecessary closing point
    if (M.x === Z.x && M.y === Z.y) {
        pts.pop();
        l--;
        Z = pts[l - 1];
    }

    // init new point array
    let ptsSmp = [M];
    let pt0 = M;
    let pt1, pt2;

    // loop through vertices by triangles
    for (let i = 2; i < l; i++) {
        pt1 = pts[i - 1];
        pt2 = pts[i];
        let isLast = i === l - 1;

        /**
         * 1. Skip zero-length segments
         */
        if ((pt1.x === pt0.x && pt1.y === pt0.y) || (pt1.x === pt2.x && pt1.y === pt2.y)) {
            continue;
        }

        /**
         * 2. Check for perfectly flat
         * vertical/horizontal segments
         */
        let isVertical = (pt0.x === pt1.x);
        let isHorizontal = (pt0.y === pt1.y);

        if (isVertical || isHorizontal) {

            let isVertical2 = (pt1.x === pt2.x);
            let isHorizontal2 = (pt1.y === pt2.y);

            if (((isVertical && isVertical2) || (isHorizontal && isHorizontal2))) {

                // perfectly flat segment - skip
                if (!isLast) continue;

                // flat but last – add last and skip colinearity check
                if (isLast && M.x !== pt2.x && M.y !== pt2.y) {

                    ptsSmp.push(pt2);
                    continue
                }

            }
        }

        // check area
        let area = getPolygonArea([pt0, pt1, pt2], true)
        let thresh = getSquareDistance(pt0, pt2) * 0.005;

        // flat
        if (area <= thresh && i < l - 1) {
            //console.log(area, thresh, pt0, pt1, pt2, i);
            pt0 = pt1;
            continue
        }

        // no simplification - add mid pt 
        ptsSmp.push(pt1);

        // add last point if not first
        if (isLast && M.x !== pt2.x && M.y !== pt2.y) {
            // console.log('add last', M, pt2);
            ptsSmp.push(pt2);
        }

        // update previous point
        pt0 = pt1;

    }

    // 1st and last are colinear
    let area0 = getPolygonArea([ptsSmp[1], M, ptsSmp[ptsSmp.length - 1]], true)
    let thresh0 = getSquareDistance(ptsSmp[1], ptsSmp[ptsSmp.length - 1]) * 0.005
    // remove first point
    if (area0 < thresh0) ptsSmp.shift()

    return ptsSmp;
}