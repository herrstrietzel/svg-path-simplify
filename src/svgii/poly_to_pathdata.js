
/**
* Chord-Length Parameterization 
* based on
* https://francoisromain.medium.com/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
*/

import { checkLineIntersection, getDistManhattan, interpolate, mirrorCpts } from "./geometry";
import { getPolyBBox } from "./geometry_bbox";
import { analyzePoly, getPolyChunks, isClosedPolygon } from "./poly_analyze";
import { fitCurveN } from "../poly-fit-curve-schneider";
import { renderPath, renderPoint, renderPoly } from "./visualize";
import { simplifyRDP } from "../simplify_poly_RDP";
import { pathDataFromPoly } from "./pathData_fromPoly";

export function simplifyPolygonToPathData(pts, {
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


    denoise = 0

    // denoise via RDP
    if (denoise && denoise !== 1) {
        pts = simplifyRDP(pts, {
            width,
            height,
            quality: denoise,
            manhattan,
            absolute
        })

    }

    // get topology of poly
    let polyAnalyzed = !keepExtremes&&!keepCorners ? pts : analyzePoly(pts, {
        debug: false
        //width,
        //height
    })


    // split into segment chunks
    let chunks = !keepExtremes&&!keepCorners ? [polyAnalyzed] : getPolyChunks(polyAnalyzed, {keepCorners,keepExtremes, keepInflections});


    // Schneider curve fit
    let threshold = width && height ? (width + height) / 2 * 0.004 * tolerance : 2.5

    threshold=2

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

export function simplifyPolyChunks(chunks = [], {
    closed = true,
    tolerance = 1,
} = {}) {


    let l = chunks.length;

    // new pathData
    let pathData = [{ type: 'M', values: [chunks[0][0].x, chunks[0][0].y] }]
    //let pathData = []
    //console.log('chunks', chunks);

    for (let i = 0; i < l; i++) {

        let chunk = chunks[i];
        let chunkN = chunks[i + 1] ? chunks[i + 1] : null
        let segments = []
        let chunklen = chunk.length
        let pLast = chunk[chunk.length - 1]

        // add from next command
        if (chunkN) {
            chunk.push(chunkN[0])
        }

        // nothing to simplify
        if (chunklen < 2 || (chunklen === 2 && chunk[1].isExtreme) ) {
            pLast = chunk[chunk.length - 1]
            segments = chunk.map(com => { return { type: 'L', values: [com.x, com.y] } })

        } else {
            segments = fitCurveN(chunk, tolerance)
        }

        // remove first segment to connect to last segment
        pathData.push(...segments)

    }


    if (closed) pathData.push({ type: 'Z', values: [] })

    //console.log('!!!pathData', pathData);

    // refine extremes
    refineAdjacentExtremes(pathData)
    return pathData

}



/* fix almost colinear control point tangents */
export function refineAdjacentExtremes(pathData) {
    let l = pathData.length;

    for (let i = 1; i < l; i++) {
        let com = pathData[i]
        let comN = pathData[i + 1] || null
        let { type, values } = com;

        if (type === 'C' && comN && comN.type === 'C') {
            let valuesN = comN.values
            let cp1_1 = { x: values[0], y: values[1] }
            let cp2_1 = { x: values[2], y: values[3] }
            let p = { x: values[4], y: values[5] }

            let cp1_2 = { x: valuesN[0], y: valuesN[1] }
            let cp2_2 = { x: valuesN[2], y: valuesN[3] }


            let dx1 = Math.abs(cp2_1.x - p.x)
            let dy1 = Math.abs(cp2_1.y - p.y)

            let dx2 = Math.abs(cp1_2.x - p.x)
            let dy2 = Math.abs(cp1_2.y - p.y)

            let dist1 = getDistManhattan(cp1_2, cp2_1) * 0.02

            // is almost horizontal
            let horizontal1 = dy1 < dist1 && dx1 > dist1
            let horizontal2 = dy2 < dist1 && dx2 > dist1
            let vertical1 = dx1 < dist1 && dy1 > dist1
            let vertical2 = dx2 < dist1 && dy2 > dist1


            let distCpO=0, distCpN=0, t=1;
            let cp2N, cp1N;

            if (horizontal1 || vertical1) {

                // adjust cp2 to horizontal
                cp2N = horizontal1 ? {x:com.values[2], y: p.y} : (vertical1 ? {x:p.x, y:com.values[3]} : {x:com.values[2], y:com.values[3]})

                /*
                // adjust length
                distCpO = getDistManhattan(cp2_1, p)
                distCpN = getDistManhattan(cp2N, p)
 
                // interpolate
                t = distCpN/distCpO
                console.log(t,  distCpO, distCpN);
                cp2N = t>0.97 && t<0.99 ? interpolate(p, cp2N, t) : cp2N
                */
                com.values[2] = cp2N.x
                com.values[3] = cp2N.y

            }
 

            if (horizontal2 || vertical2) {
                // adjust cp1 to horizontal

                cp1N = horizontal2 ? 
                {x:comN.values[0], y: p.y} : 
                (vertical2 ? {x:p.x, y:comN.values[1]} : {x:comN.values[0], y:comN.values[1]})

                /*
                // adjust length
                distCpO = getDistManhattan(cp1_2, p)
                distCpN = getDistManhattan(cp1N, p)

                let sign = distCpO>distCpN ? -1 : 1

                // interpolate
                t = distCpN/distCpO
                cp1N = t>0.97 && t<0.99 ? interpolate(p, cp1N, t) : cp1N;
                //console.log(t, sign, distCpO, distCpN);
                */

                pathData[i + 1].values[0] = cp1N.x
                pathData[i + 1].values[1] = cp1N.y

            }
        }
    }
}



// old Render the svg <path> element
export function getCurvePathData(pts, t = 0.666, closed = 'auto', keepCorners = true) {


    //auto detect closed polygon
    if (closed === 'auto') {
        closed = isClosedPolygon(pts)
    }


    // append first 2 pts for closed paths
    if (closed) {
        pts = pts.concat(pts.slice(0, 2));
    }


    // Position of a control point
    const controlPoint = (pt1, pt0, pt2, reverse = false, t = 0.666) => {

        let p = pt0 || pt1;
        let n = pt2 || pt1;

        let dx = n.x - p.x
        let dy = n.y - p.y
        let sign = reverse ? -1 : 1;

        let cp0 = {
            x: pt1.x + dx * sign,
            y: pt1.y + dy * sign
        };


        let t2 = 0.1 / (1 - t * 0.5)
        let cp = interpolate(pt1, cp0, t2)

        return cp;
    };


    // collect smoothed pathData
    let pathData = [];
    pathData.push({ type: "M", values: [pts[0].x, pts[0].y], p0: { x: pts[0].x, y: pts[0].y } });

    let cp2_0 = pts[0];
    let l = pts.length;


    for (let i = 1; i < l; i++) {

        let drawLine = false;
        let ptPrev = i > 1 ? pts[i - 2] : pts[l - 1];
        let ptNext = i < l - 1 ? pts[i + 1] : pts[0];
        //console.log(ptPrev, ptNext);

        let pt0 = pts[i - 1];
        let pt1 = pts[i];
        let cp1 = controlPoint(pt0, ptPrev, pt1, false, t);
        let cp2 = controlPoint(pt1, pt0, ptNext, true, t);

        let { isExtreme, isCorner, directionChange } = pt1;

        // get cp vector intersections
        let cpI = checkLineIntersection(pt0, cp1, pt1, cp2, false);


        // harmonize cpts
        if (cpI) {
            let { left, top, right, bottom, width, height } = getPolyBBox([pt0, pt1]);
            let outside = cpI ? (cpI.x < left || cpI.x > right || cpI.y < top || cpI.y > bottom) : false;

            // adjust/harmonize control points
            if (!outside) {
                cp1 = interpolate(pt0, cpI, t)
                cp2 = interpolate(pt1, cpI, t)
            } else {

                // check exact cp self intersections
                let cpI2 = checkLineIntersection(pt0, cp1, pt1, cp2, true);

                // control points are diverging - connction between cps and start/end point
                let interH = checkLineIntersection(pt0, pt1, cp1, cp2, true);

                cpI = !interH ? cpI : (cpI2 ? cpI2 : null)

                //&& i < l - 3
                if (cpI) {
                    cp1 = interpolate(pt0, cpI, t)
                    cp2 = interpolate(pt1, cpI, t)
                    //renderPoint(svg, cpI, 'magenta')
                }
            }

        }


        if (keepCorners) {

            // mirror cpts
            if ((pt1.isCorner && !pt0.isCorner) || (!pt1.isCorner && pt0.isCorner)) {
                let outgoing = !pt1.isCorner && pt0.isCorner;

                let cps = mirrorCpts(cp2_0, pt0, cp2, pt1, outgoing, t);
                let cp1_2 = cps.cp1
                let cp2_2 = cps.cp2

                cp1 = cp1_2;
                cp2 = cp2_2;

            }

            // withdraw cpts for sharp corners - tag as lineto
            else if ((pt1.isCorner && pt0.isCorner)) {

                cp1 = { x: pt0.x, y: pt0.y };
                cp2 = { x: pt1.x, y: pt1.y };
                drawLine = true
            }

        }


        // update last cp2
        cp2_0 = cp2;

        let com = {
            type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, pt1.x, pt1.y],
            drawLine,
            // add properties for chunk based simplification
            isExtreme, isCorner, directionChange
        };


        let values = com.values
        com.p0 = pt0
        com.cp1 = { x: values[0], y: values[1] }
        com.cp2 = { x: values[2], y: values[3] }
        com.p = { x: values[4], y: values[5] }


        pathData.push(com);
    }

    // copy last commands 1st controlpoint to first curveto
    if (closed) {
        let comLast = pathData[pathData.length - 1];
        let valuesLastC = comLast.values;
        let valuesFirstC = pathData[1].values;

        pathData[1].type = 'C'
        pathData[1].values = [valuesLastC[0], valuesLastC[1], ...valuesFirstC.slice(2)]
        let values0 = pathData[0].values
        let values = pathData[1].values
        pathData[1].p0 = { x: values0[0], y: values0[1] }
        pathData[1].cp1 = { x: values[0], y: values[1] }
        pathData[1].cp2 = { x: values[2], y: values[3] }
        pathData[1].p = { x: values[4], y: values[5] }

        // delete last curveto
        pathData = pathData.slice(0, pathData.length - 1);
        pathData.push({ type: 'z', values: [] })

    }

    // convert flat curves to linetos
    pathData.forEach((com, i) => {
        if (com.drawLine) {
            pathData[i].type = 'L'
            pathData[i].values = com.values.slice(-2);
        }
    })

    //console.log(pathData);
    return pathData;
};