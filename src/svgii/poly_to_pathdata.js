
/**
* Chord-Length Parameterization 
* based on
* https://francoisromain.medium.com/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
*/

import { checkLineIntersection, getAngle, getDistance, getDistManhattan, getPathDataVertices, getPointOnEllipse, getSquareDistance, interpolate, mirrorCpts, reducePoints, rotatePoint } from "./geometry";
import { getPolyBBox } from "./geometry_bbox";
import { renderPath, renderPoint, renderPoly } from "./visualize";
import { simplifyPolyRDP } from "../simplify_poly_RDP";
import { pathDataFromPoly } from "./pathData_fromPoly";
import { getPolyChunks } from "./poly_analyze_get_chunks";
import { analyzePoly, detectRegularPolygon, getPolyCentroid, getPolyCentroidWeighted, isClosedPolygon } from "./poly_analyze";
import { fitCurveSchneider } from "../poly-fit-curve-schneider";
import { simplifyPolyRD } from "../simplify_poly_radial_distance";
import { simplifyRC } from "../simplify_poly_RC";
import { getPolygonArea } from "./geometry_area";
import { pathDataToD } from "./pathData_stringify";
import { fixIntersectingCpts } from "../pathData_simplify_harmonize_cpts";
import { convertPathData } from "./pathData_convert";
import { combineCubicPairs } from "../pathData_simplify_cubic";



export function simplifyPolygonToPathData(pts, {
    debug = false,
    width = 0,
    height = 0,
    denoise = 0.9,
    keepCorners = true,
    keepExtremes = true,
    keepInflections = false,
    manhattan = false,
    absolute = false,
    closed = true,
    tolerance = 1,
    simplifyRD = 1,
    simplifyRDP = 1,
    isClosed = true,
} = {}) {


    let polyPath = [];
    let l = pts.length;
    let M = pts[0]
    let Z = pts[l - 1]


    // triangle
    if (pts.length === 3) {

        let pM1 = interpolate(M, pts[1], 0.5)
        let pM2 = interpolate(pts[1], Z, 0.5)
        let pM3 = interpolate(Z, pts[0], 0.5)

        /*
        console.log('triangle');
        renderPoint(markers, M)
        renderPoint(markers, pM1)
        renderPoint(markers, pM2)
        renderPoint(markers, pM3)
        */

        if (closed) {
            let t = 0.6666
            let cp1_1 = interpolate(pM1, pts[1], t)
            let cp2_1 = interpolate(pM2, pts[1], t)
            let cp1_2 = interpolate(pM2, Z, t)
            let cp2_2 = interpolate(pM3, Z, t)
            let cp1_3 = interpolate(pM3, M, t)
            let cp2_3 = interpolate(pM1, M, t)

            polyPath = [
                { type: 'M', values: [pM1.x, pM1.y] },
                { type: 'C', values: [cp1_1.x, cp1_1.y, cp2_1.x, cp2_1.y, pM2.x, pM2.y] },
                { type: 'C', values: [cp1_2.x, cp1_2.y, cp2_2.x, cp2_2.y, pM3.x, pM3.y] },
                { type: 'C', values: [cp1_3.x, cp1_3.y, cp2_3.x, cp2_3.y, pM1.x, pM1.y] },
                { type: 'Z', values: [] },
            ]

        } else {
            polyPath = [
                //{ type: 'M', values: [pM1.x, pM1.y] },
                { type: 'M', values: [M.x, M.y] },
                { type: 'C', values: [pts[1].x, pts[1].y, pts[1].x, pts[1].y, Z.x, Z.y] },
            ]
        }
        return polyPath;
    }



    // remove colinear
    //pts = simplifyRC(pts)

    /**
     * detect regular polygon
     * curved path is a circle
     */
    let centroid = getPolyCentroid(simplifyRC(pts))
    let isRegularPolygon = detectRegularPolygon(pts, centroid)


    if (isRegularPolygon) {
        //renderPoint(markers, centroid)
        //let r = getDistance(centroid, pts[0])
        let ptAd = rotatePoint(pts[0], centroid.x, centroid.y, Math.PI)
        let sweep = getPolygonArea(pts) > 0 ? 1 : 0;

        polyPath = [
            { type: 'M', values: [pts[0].x, pts[0].y] },
            { type: 'A', values: [1, 1, 0, 0, sweep, ptAd.x, ptAd.y] },
            { type: 'A', values: [1, 1, 0, 0, sweep, pts[0].x, pts[0].y] }
        ]

        if (closed) {
            polyPath.push({ type: 'Z', values: [] })
        }
        return polyPath;
    }


    // remove colinear
    //pts = simplifyRC(pts)

    keepExtremes = false;
    keepCorners = false;

    keepExtremes = true;
    keepCorners = true;

    // check if closed
    /*
    let bb = getPolyBBox(pts)
    let thresh = (bb.width+bb.height)*0.25
    let dist0 = getDistManhattan(pts[0], pts[pts.length-1])

    //let isClosed = dist0<=thresh;
    //isClosed = false;
    //console.log('isClosed', isClosed, 'dist0', dist0, thresh);
    */

    // copy 1st first to end
    if (isClosed) {
        pts.push(pts[0])
    }

    // get topology of poly
    let polyAnalyzed = !keepExtremes && !keepCorners ? pts : analyzePoly(pts, {
        debug: false
        //width,
        //height
    })

    //console.log(polyAnalyzed, polyAnalyzed2);

    // split into segment chunks
    //let chunks = !keepExtremes && !keepCorners ? [polyAnalyzed] : getPolyChunks(polyAnalyzed, { keepCorners, keepExtremes, keepInflections });

    let chunks = getPolyChunks(polyAnalyzed, { keepCorners, keepExtremes, keepInflections: true });


    // Schneider curve fit
    let threshold = width && height ? (width + height) / 2 * 0.004 * tolerance : 2.5
    threshold = width && height ? (width + height) / 2 * 0.004 * tolerance : 2.5
    // console.log('tolerance', tolerance, threshold);


    //threshold = 2
    let useToplogy = true

    if (useToplogy) {

        polyPath = simplifyPolyChunksTopology(chunks, {
            closed,
            tolerance: threshold,
            keepCorners,
            keepExtremes: true,
        });
    } else {

        polyPath = simplifyPolyChunks(chunks, {
            closed,
            tolerance: threshold,
            keepCorners,
            keepExtremes: true,
        });
    }




    //polyPath = fixIntersectingCpts(polyPath);

    return polyPath;
}


/**
 * topology based curve fit
 */
export function simplifyPolyChunksTopology(chunks = [], {
    closed = true,
    keepCorners = true,
    tolerance = 1,
} = {}) {

    console.log(chunks);


    let l = chunks.length;

    // new pathData
    //let M = {x:chunks[0][0].x}
    let pathData = [{ type: 'M', values: [chunks[0][0].x, chunks[0][0].y] }]

    // loop chunks
    for (let i = 0; i < l; i++) {

        let chunkPrev = i > 0 ? chunks[i - 1] : (closed ? chunks[l - 1] : null);
        let chunk = chunks[i];
        let chunkN = chunks[i + 1] ? chunks[i + 1] : (closed ? chunks[0] : null)
        let segments = []

        // add from next command
        if (chunkN) {
            chunk.push(chunkN[0])
        }

        let chunklen = chunk.length
        let hasInflection = false;
        let segments_1 = [], segments_2 = [], segments_3 = [];
        let segsRequired = 3;

        // 1st point
        let p1 = chunk[0]
        // last point in chunk
        let p2 = chunk[chunklen - 1]
        let isLinetoSeg = false

        // nothing to simplify - lineto

        // if (chunklen < 2 || (chunklen === 2 && (chunk[1].isExtreme || i===l-1 && !closed)  )) {



        if (chunklen < 2 || (chunklen === 2 && (chunk[1].isExtreme))) {
            //segments_1 = chunk.map(com => { return { type: 'L', values: [com.x, com.y] } })

            isLinetoSeg = true

            if (chunklen === 2) {
                segsRequired = 2;
                segments_2 = [
                    {
                        type: 'L',
                        values: [p1.x, p1.y],
                        p0: chunkPrev,
                        p: p1,
                    },
                    {
                        type: 'L',
                        values: [chunk[1].x, chunk[1].y],
                        p0: p1,
                        p: p2,
                    }
                ]
            } else {
                segsRequired = 1;
                segments_1 = [
                    {
                        type: 'L',
                        values: [p1.x, p1.y],
                        p0: chunkPrev,
                        p: p2,
                    },
                ]
            }

        } else {
            //renderPoint(markers, chunk[0], 'green')

            // point before inflection
            let p3 = chunk[chunklen - 2];


            let extremes = chunk.filter(pt => pt.isExtreme)
            let semiExtremes = chunk.filter(pt => pt.isSemiExtreme)
            let corners = chunk.filter(pt => pt.isCorner)
            let inflections = chunk.filter(pt => pt.isDirChange && !pt.isCorner && !pt.isExtreme)
            hasInflection = inflections.length && inflections[0] !== p1


            let idxMid = Math.floor(chunklen * 0.5)
            let pMid = semiExtremes.length ? semiExtremes[Math.floor(semiExtremes.length * 0.5)] : chunk[idxMid]

            //check if mid is close to end 
            let dist0 = getDistManhattan(p1, p3)
            let dist1 = getDistManhattan(pMid, p3)
            let dist2 = getDistManhattan(pMid, p1)
            let thresh = dist0 * 0.25
            let shortMidSegment = dist1 < thresh || dist2 < thresh


            /**
             * we have 3 modes
             * 1 segment: only 1 segment between extremes/corners
             * 2 segments: semiextreme/mid in between
             * 3 segments: inflection
             */

            segsRequired = shortMidSegment ? (!hasInflection ? 1 : 2) : (hasInflection ? 3 : 2)

            //if(shortMidSegment){renderPoint(markers, pMid, 'red', '2%')}
            let cp1_1 = p1.tangentR;
            let cp2_1 = pMid.tangentL;
            let p_1 = pMid

            // renderPoint(markers, pMid, 'orange', '2%')

            let cp2_2 = p2.tangentL;
            let cp1_2 = pMid.tangentR;
            let p_2 = p2

            let cp1_3 = null
            let cp2_3 = null
            let p_3 = null

            // general extrapolation
            let t = 0.666;
            let d = ''
            let ptI_1 = null, ptI_2 = null, ptI_3 = null;


            // 1 segment
            ptI_1 = checkLineIntersection(p1, p1.tangentR, p2, p2.tangentL, false, true)
            if (ptI_1) {
                cp1_1 = interpolate(p1, ptI_1, t)
                cp2_1 = interpolate(p2, ptI_1, t)
                p_1 = p2;

                segments_1 = [
                    //{type: 'M', values: [p1.x, p1.y]},
                    {
                        type: 'C',
                        values: [cp1_1.x, cp1_1.y, cp2_1.x, cp2_1.y, p_1.x, p_1.y],
                        p0: p1,
                        cp1: cp1_1,
                        cp2: cp2_1,
                        p: p_1,
                    }
                ];

                //d = pathDataToD( [{ type: 'M', values: [p1.x, p1.y] },...segments_1])
                //renderPath(markers, d)
                //console.log(d);
            }


            // 2 segments
            ptI_1 = checkLineIntersection(p1, p1.tangentR, pMid, pMid.tangentL, false, true)
            ptI_2 = checkLineIntersection(p2, p2.tangentL, pMid, pMid.tangentR, false, true)

            if (ptI_1 && ptI_2) {
                cp1_1 = interpolate(p1, ptI_1, t)
                cp2_1 = interpolate(pMid, ptI_1, t)
                p_1 = pMid

                cp1_2 = interpolate(pMid, ptI_2, t)
                cp2_2 = interpolate(p2, ptI_2, t)
                p_2 = p2

                segments_2 = [
                    //{type: 'M', values: [p1.x, p1.y]},
                    {
                        type: 'C',
                        values: [cp1_1.x, cp1_1.y, cp2_1.x, cp2_1.y, p_1.x, p_1.y],
                        p0: p1,
                        cp1: cp1_1,
                        cp2: cp2_1,
                        p: p_1,
                        isExtreme: p_1.isExtreme
                    },
                    {
                        type: 'C',
                        values: [cp1_2.x, cp1_2.y, cp2_2.x, cp2_2.y, p_2.x, p_2.y],
                        p0: p_1,
                        cp1: cp1_2,
                        cp2: cp2_2,
                        p: p_2,
                        isExtreme: p_2.isExtreme

                        //isExtreme: true
                    },
                ];

                //d = pathDataToD( [{ type: 'M', values: [p1.x, p1.y] },...segments_2])
                //renderPath(markers, d)

            }


            // 3 segments
            //hasInflection=true
            if (hasInflection) {

                // get pt between dir change and mid
                let idx_3_4 = Math.floor(chunklen * 0.75)
                p3 = chunk[idx_3_4]
                ptI_3 = checkLineIntersection(p3, p3.tangentR, p2, p2.tangentL, false, false)

                if (ptI_3) {
                    let tangentR_beforeDirChange = interpolate(p3, ptI_3, t)

                    // extend right tangent
                    p3.tangentR.x = tangentR_beforeDirChange.x
                    p3.tangentR.y = tangentR_beforeDirChange.y

                    // extend dir change tangent
                    let tangentL_dirChange = interpolate(p2, ptI_3, t)
                    p2.tangentL.x = tangentL_dirChange.x
                    p2.tangentL.y = tangentL_dirChange.y
                } else {

                    if (p3 === p2) {

                        idx_3_4 = Math.floor(chunklen * 0.3)
                        p3 = chunk[idx_3_4]

                        //renderPoint(markers, p2, 'purple', '3%')
                        //renderPoint(markers, p3, 'orange', '2%')

                    }
                    let ptI_4 = checkLineIntersection(p3, p3.tangentR, p2, p2.tangentL, false, false)
                    //renderPoint(markers, ptI_4, 'orange', '2%')
                    //renderPoint(markers, p3, 'blue', '1%')
                    //renderPoint(markers, p1, 'magenta', '2%')

                    //let ptI_4 = checkLineIntersection(p3, p3.tangentL, p1, p1.tangentR, false, false)
                    //renderPoint(markers, ptI_4, 'blue', '1%')


                    //cp1_1 = interpolate(p1, ptI_4, t )
                    //cp2_1 = interpolate(p1, ptI_4, t )

                    cp1_1 = interpolate(p1, p1.tangentR, 1.333)
                    cp2_1 = interpolate(p2, p2.tangentL, 1.333)


                    segments_3 = [
                        {
                            type: 'C',
                            values: [cp1_1.x, cp1_1.y, cp2_1.x, cp2_1.y, p2.x, p2.y],
                            p0: p1,
                            cp1: cp1_1,
                            cp2: cp2_1,
                            p: p2,
                            isExtreme: p2.isExtreme
                            //isExtreme: true
                        },
                    ];


                    //let ptI_4 = checkLineIntersection(p2, p2.tangentL, p2, p2.tangentL, false, false)
                    //renderPoint(markers, ptI_3, 'orange', '2%')

                    /*
                    let tangentR_beforeDirChange = interpolate(p3, ptI_3, t)

                    // extend right tangent
                    p3.tangentR.x = tangentR_beforeDirChange.x
                    p3.tangentR.y = tangentR_beforeDirChange.y

                    let tangentL_dirChange = interpolate(p2, ptI_3, t)
                    p2.tangentL.x = tangentL_dirChange.x
                    p2.tangentL.y = tangentL_dirChange.y
                    */

                    d = pathDataToD([{ type: 'M', values: [p1.x, p1.y] }, ...segments_3])
                    //renderPath(markers, d)

                }



                cp1_3 = p3.tangentR
                cp2_3 = p2.tangentL
                p_3 = p2

                ptI_1 = checkLineIntersection(p1, p1.tangentR, pMid, pMid.tangentL, false, true)
                ptI_2 = checkLineIntersection(pMid, pMid.tangentR, p3, p3.tangentL, false, true)

                if (!ptI_3) {
                    //console.log(chunk, pMid, pMid.tangentR, 'p3', p3, p3.tangentL);
                }

                if (ptI_1 && ptI_2 && ptI_3) {

                    cp1_1 = interpolate(p1, ptI_1, t)
                    cp2_1 = interpolate(pMid, ptI_1, t)
                    p_1 = pMid

                    cp1_2 = interpolate(pMid, ptI_2, t)
                    cp2_2 = interpolate(p3, ptI_2, t)
                    p_2 = p3

                    segments_3 = [
                        {
                            type: 'C',
                            values: [cp1_1.x, cp1_1.y, cp2_1.x, cp2_1.y, p_1.x, p_1.y],
                            p0: p1,
                            cp1: cp1_1,
                            cp2: cp2_1,
                            p: p_1,
                            isExtreme: p_1.isExtreme
                            //isExtreme: true
                        },
                        {
                            type: 'C',
                            values: [cp1_2.x, cp1_2.y, cp2_2.x, cp2_2.y, p_2.x, p_2.y],
                            p0: p_1,
                            cp1: cp1_2,
                            cp2: cp2_2,
                            p: p_2,
                        },
                        {
                            type: 'C',
                            values: [cp1_3.x, cp1_3.y, cp2_3.x, cp2_3.y, p_3.x, p_3.y],
                            p0: p_2,
                            cp1: cp1_3,
                            cp2: cp2_3,
                            p: p_3,
                            isExtreme: p_3.isExtreme
                            //isExtreme: true
                        }
                    ];

                    d = pathDataToD([{ type: 'M', values: [p1.x, p1.y] }, ...segments_3])
                    //renderPath(markers, d)


                } else {
                    //console.log('incomplete', ptI_1, ptI_2, ptI_3);
                }

            }

            //console.log('chunk', chunk, extremes, semiExtremes, corners, inflections);

        }

        if (segsRequired === 1) {
            segments = segments_1
        } else if (segsRequired === 2 && segments_2.length) {
            segments = segments_2
        }
        else {
        }

        segments = segments_3.length ? segments_3 : segments_2
        //segments = segments_2.length ? segments_2 : segments_3
        //segments = segments_3


        /**
         * try simplification
         */
        let simplify = false
        /*
        if (simplify && !isLinetoSeg && segments.length > 1) {
    
            let com1 = segments[0]
            let com2 = segments[1]
    
            tolerance = 1.1
            let combined = combineCubicPairs(com1, com2, { tolerance })
            //let error = combined[0].error;
            let error = 0;
            let comsSimp =[]
    
            console.log('!!!combined', segments.length, combined);
    
            // success
            if (combined.length === 1) {
    
                if(segments.length === 2){
                    segments = combined
                }
    
                let com = combined[0]
            }
    
        }
        */

        // remove first segment to connect to last segment
        pathData.push(...segments)

    }



    if (closed) {
        pathData.push({ type: 'Z', values: [] })
    }
    //console.log('!!!pathData from poly', pathData);


    //pathData2 = convertPathData(pathData2, { toRelative: true, decimals: 5 });
    //let d = pathDataToD(pathData2);
    //renderPath(markers, d, 'green', '0.75%', '0.5')
    //console.log(d);


    // refine extremes
    return pathData

}




/**
 * convert polygon chunks
 * to cubic beziers 
 */

export function simplifyPolyChunks(chunks = [], {
    closed = true,
    keepCorners = true,
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
        if (chunklen < 2 || (chunklen === 2 && chunk[1].isExtreme)) {
            pLast = chunk[chunk.length - 1]
            segments = chunk.map(com => { return { type: 'L', values: [com.x, com.y] } })

        } else {
            segments = fitCurveSchneider(chunk, {
                maxError: tolerance, keepCorners
            })
        }

        // remove first segment to connect to last segment
        pathData.push(...segments)

    }


    if (closed) pathData.push({ type: 'Z', values: [] })
    //console.log('!!!pathData from poly', pathData);

    // refine extremes
    let refineExtremes = false;
    //refineExtremes=true;
    if (refineExtremes) refineAdjacentExtremes(pathData)
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


            let distCpO = 0, distCpN = 0, t = 1;
            let cp2N, cp1N;

            if (horizontal1 || vertical1) {

                // adjust cp2 to horizontal
                cp2N = horizontal1 ? { x: com.values[2], y: p.y } : (vertical1 ? { x: p.x, y: com.values[3] } : { x: com.values[2], y: com.values[3] })

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
                    { x: comN.values[0], y: p.y } :
                    (vertical2 ? { x: p.x, y: comN.values[1] } : { x: comN.values[0], y: comN.values[1] })

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