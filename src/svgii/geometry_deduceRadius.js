import { checkLineIntersection, getDeltaAngle, getDistance, getDistManhattan, getSquareDistance } from "./geometry";
import { renderPoint } from "./visualize";
//import { arcToBezierResolved } from "./pathData_convert";
//import { renderPoint, renderPoly } from "./visualize";

export function getArcFromPoly(pts, precise = false) {
    if (pts.length < 3) return false

    // Pick 3 well-spaced points
    let len = pts.length
    let idx1 = Math.floor(len * 0.333)
    let idx2 = Math.floor(len * 0.666)
    let idx3 = Math.floor(len * 0.5)


    let p1 = pts[0];
    let p2 = pts[idx3];
    let p3 = pts[len - 1];

    // Radius (use start point)
    let pts1 = [p1, p2, p3];
    let centroid = getPolyArcCentroid(pts1);

    let r = 0, deltaAngle = 0, startAngle = 0, endAngle = 0, angleData = {};


    // check if radii are consistent
    if (precise) {


        /**
         * check multiple centroids
         * if the polyline can be expressed as 
         * an arc - all centroids should be close
         */

        if (len > 3) {
            let centroid1 = getPolyArcCentroid([p1, pts[idx1], p3]);
            let centroid2 = getPolyArcCentroid([p1, pts[idx2], p3]);

            if (!centroid1 || !centroid2) return false;

            //let dist0 = getDistManhattan(p1, p3)
            let dist0 = getDistManhattan(centroid, p2)
            let dist1 = getDistManhattan(centroid, centroid1)
            let dist2 = getDistManhattan(centroid, centroid2)
            let errorCentroid = (dist1 + dist2)

            // centroids diverging too much 
            if (errorCentroid > dist0 * 0.05) {
                //renderPoint(markers, centroid, 'magenta')
                return false
            }

        }

        let rSqMid = getSquareDistance(centroid, p2);

        //check if radii are close enough 
        for (let i = 0; i < len; i++) {
            let pt = pts[i]
            let rSq = getSquareDistance(centroid, pt);
            let error = Math.abs(rSqMid - rSq) / rSqMid

            if (error > 0.0025) {
                /*
                console.log('error', error, len, idx1, idx2, idx3);
                renderPoint(markers, centroid, 'orange')
                renderPoint(markers, p1, 'green')
                renderPoint(markers, p2)
                renderPoint(markers, p3, 'purple')
                */
                return false;
            }
        }

        // calculate proper radius
        r = Math.sqrt(rSqMid);
        angleData = getDeltaAngle(centroid, p1, p3);
        ({ deltaAngle, startAngle, endAngle } = angleData);


    } else {
        r = getDistance(centroid, p1);
        angleData = getDeltaAngle(centroid, p1, p3);
        ({ deltaAngle, startAngle, endAngle } = angleData);
    }



    return {
        centroid,
        r,
        startAngle,
        endAngle,
        deltaAngle
    };
}



export function getPolyArcCentroid(pts = []) {

    pts = pts.filter(pt => pt !== undefined);
    if (pts.length < 3) return false
    //console.log(pts);

    let p1 = pts[0];
    let p2 = pts[Math.floor(pts.length / 2)];
    let p3 = pts[pts.length - 1];

    let x1 = p1.x, y1 = p1.y;
    let x2 = p2.x, y2 = p2.y;
    let x3 = p3.x, y3 = p3.y;

    let a = x1 - x2;
    let b = y1 - y2;
    let c = x1 - x3;
    let d = y1 - y3;

    let e = ((x1 * x1 - x2 * x2) + (y1 * y1 - y2 * y2)) / 2;
    let f = ((x1 * x1 - x3 * x3) + (y1 * y1 - y3 * y3)) / 2;

    let det = a * d - b * c;

    // colinear points
    if (Math.abs(det) < 1e-10) {
        return false;
    }

    // find center of arc
    let cx = (d * e - b * f) / det;
    let cy = (-c * e + a * f) / det;
    let centroid = { x: cx, y: cy };
    return centroid
}



