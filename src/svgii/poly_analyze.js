import { rad2Deg } from "../constants";
//import { simplifyPolyRDP } from "../simplify_poly_RDP";
//import { simplifyRD } from "../simplify_poly_radial_distance";
import { checkLineIntersection, getAngle, getDeltaAngle, getDeltaAngle2, getDistManhattan, getPointOnEllipse, getSquareDistance, pointAtT, reducePoints, rotatePoint } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { getPolyBBox } from "./geometry_bbox";
import { pathDataFromPoly } from "./pathData_fromPoly";
import { pathDataToD } from "./pathData_stringify";
import { renderPath, renderPoint, renderPoly } from "./visualize";



export function analyzePoly(pts, {
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

    //console.log(polyArea);
    let thresh = (width + height) * 0.01

    //console.log(thresh);

    // get areas an distances
    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        let area = getPolygonArea([p0, p1, p2], false);
        p1.area = area;
        p1.dist = getDistManhattan(p0, p1)
        p1.idx = i
        //pts[i] = p1
    }



    for (let i = 0; i < l; i++) {
        let p02 = i > 1 ? pts[i - 2] : pts[l - 1];
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];


        let max = getSquareDistance(p0, p2) * 0.01

        let area0 = Math.abs(p0.area)
        let area1 = Math.abs(p1.area)
        let area2 = Math.abs(p2.area)
        let isCloseExtreme = false
        let isCorner = false;


        let flat = !p1.area || area1 < thresh


        //console.log(bb);
        //let extremeLocal = (p1.x < left || p1.x > right || p1.y < top || p1.y > bottom)

        let dist = getDistManhattan(p1, p0)
        let isNear = dist < thresh * 5



        /**
         * check extremes
         */

        let isExtreme = false;

        // 1. total extreme
        if ((p1.x === bb0.left || p1.x === bb0.right || p1.y === bb0.top || p1.y === bb0.bottom)) {
            isExtreme = true
        }

        // 1.2 horizontal or vertical
        let isHorizontal = p1.y === p0.y && p1.x !== p0.x;
        let isVertical = p1.x === p0.x && p1.y !== p0.y

        if ((isHorizontal || isVertical)) {
            p0.isExtreme = true
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
        let isDirChange = signChange && !flat && !p0.isDirChange



        /**
         * 3. corners
         */

        //isDirChange &&
        if (isExtreme) {

            let delta = getDeltaAngle(p1, p2, p0)
            let { deltaAngleDeg } = delta
            deltaAngleDeg = Math.abs(deltaAngleDeg)

            let isCornerDelta = deltaAngleDeg > 10 && deltaAngleDeg < 160
            if (isCornerDelta) {
                //console.log(deltaAngleDeg);
                isCorner = true;
            }

        }


        /*
        let debug = true
        if (debug) {

            if ((isHorizontal || isVertical)) {
                renderPoint(markers, p1, 'blue', '2%', '0.5')
                renderPoint(markers, p0, 'blue', '2%', '0.5')
            }

            if (isExtreme) {
                renderPoint(markers, p1, 'cyan', '1.5%', '0.5')
            }

            if (isDirChange) {
                renderPoint(markers, p1, 'orange', '0.75%', '0.5')
            }

            if (isCorner) {
                renderPoint(markers, p1, 'magenta', '2.75%', '0.5')
            }
        }
        */


        p1.isCorner = isCorner;
        p1.isExtreme = isExtreme;
        p1.isHorizontal = isHorizontal;
        p1.isVertical = isVertical;
        p1.isDirChange = isDirChange;

        //renderPoint(markers, p1, 'red', '2%', '0.5')


    }


    // filter adjacent extremes
    let pts1 = []
    let exclude = []
    let filterExtremes = true;

    if (filterExtremes) {
        for (let i = 0; i < pts.length; i++) {
            let p = pts[i]
            let p1 = pts[i + 1] || null
            let p2 = pts[i + 2] || null

            let extremes = []

            if (p1 && p1.isExtreme && p.isExtreme && !p.isCorner) {
                let has2nd = p1.dist < thresh * 2 && !p1.isCorner
                let has3rd = p2 && p2.isExtreme && p2.dist < thresh * 2 && !p2.isCorner
                let lastExt = p1

                if (has2nd && !has3rd) {
                    extremes.push(p, p1)
                    //renderPoint(markers, p1, 'magenta', '1%', '0.5')
                } else if (has3rd) {
                    extremes.push(p, p1, p2)
                    /*
                    renderPoint(markers, p, 'green', '1%', '0.5')
                    renderPoint(markers, p1, 'red', '1%', '0.5')
                    renderPoint(markers, p2, 'blue', '1%', '0.5')
                    */
                }

                if (extremes.length) {
                    // average extreme
                    //console.log(extremes);
                    let x = extremes.reduce((a, b) => a + b.x, 0) / extremes.length
                    let y = extremes.reduce((a, b) => a + b.y, 0) / extremes.length

                    ///extremes.length
                    p.x = x
                    p.y = y
                    //console.log(x);
                    i += extremes.length - 1
                }
            }

            if (p.isExtreme || p.isCorner || p.isDirChange) {
                exclude.push(pts1.length)
            }


            pts1.push(p)

            // remove last nearby extreme
            let l2 = pts1.length;
            let p0 = pts1[0]
            let pL = pts1[l2 - 1]
            let near0 = getDistManhattan(p0, pL) < thresh * 2
            if (p0.isExtreme && pL.isExtreme && near0) {
                pL.x = p0.x
                pL.y = p0.y
            }
        }

        pts = pts1
    }


    return pts
}






// just for visualization
function renderPolyTopology(pts) {

    let l = pts.length
    // render
    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];


        renderPoly(markers, [p0, p1, p2], '0.5%', 'none', (p1.area > 0 ? 'green' : 'blue'), true)


        if (p1.isDirChange) {
            renderPoint(markers, p1, 'orange', '1%', '0.75')
        }


        if (p1.isExtreme) {
            renderPoint(markers, p1, 'cyan', '1%', '0.5')
        }

        if (p1.isHorizontal) {
            //renderPoint(markers, p1, 'blue', '0.5%', '0.75')
        }

        if (p1.isVertical) {
            //renderPoint(markers, p1, 'purple', '0.5%', '0.5')
        }


        if (p1.isCorner) {
            renderPoint(markers, p1, 'magenta', '1%', '1')
        }

        //pts[i] = p1
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