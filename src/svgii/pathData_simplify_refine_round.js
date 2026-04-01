import { checkLineIntersection, getAngle, getDistAv, getDistManhattan, getDistance, getPointOnEllipse, getSquareDistance, pointAtT, rotatePoint } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { getArcFromPoly } from "./geometry_deduceRadius";
import { arcToBezierResolved, convertSmallArcsToLinetos, revertCubicQuadratic } from "./pathData_convert";
import { pathDataToD } from "./pathData_stringify";
import { renderPath, renderPoint, renderPoly } from "./visualize";


export function simplifyAdjacentRound(pathData, {
    threshold = 0,
    tolerance = 1,
    // take arcs or cubic beziers
    toCubic = false,
    debug = false
} = {}) {


    // fix small Arcs
    pathData = convertSmallArcsToLinetos(pathData);
    //return pathData

    // min size threshold for corners
    threshold *= tolerance;

    let l = pathData.length;

    // add fist command
    let pathDataN = [pathData[0]]


    // find adjacent cubics between extremes
    //console.log(pathData);

    for (let i = 1; i < l; i++) {
        let comPrev = pathData[i - 1];
        let com = pathData[i];
        let comN = pathData[i + 1] || null;

        if (!comN) {
            pathDataN.push(com);
            break
        }

        let { type, extreme = false, p0, p, dimA = 0 } = com;
        // for short segment detection
        let dimAN = comN.dimA;
        let dimA0 = dimA + dimAN;
        let thresh = 0.1
        let extreme0 = extreme

        // ignore short linetos
        let isShortN = dimAN < dimA0 * thresh;
        //let isFlat = 


        // adjacent cubic commands - accept short in between linetos
        if ((type === 'C') && (comN.type === 'C' || isShortN)) {

            //console.log((comN.type !== 'C' && isShortN), comN);
            let candidates = []

            for (let j = i + 1; j < l; j++) {
                let comN = pathData[j];
                let { type, extreme = false, corner = false, dimA = 0 } = comN;
                let isShort = dimA < dimA0 * thresh;

                // skip for type change(unless very short), extremes or corners
                /*
                if ( (comN.extreme || comN.corner) ) {
                    if(!extreme && !corner) candidates.push(comN)
                    break;
                }
                */

                //|| (type !== 'C' && !isShort && !corner && !extreme)
                if (extreme || corner) {

                    /*
                    if (comN.extreme) {
                        renderPoint(markers, comN.p, 'cyan')
                    }
                    else if (comN.corner) {
                        renderPoint(markers, comN.p, 'magenta')
                    }
                    else if (type !== 'C') {
                        console.log(type);
                        renderPoint(markers, comN.p, 'orange')
                    }
                    */

                    if ((extreme || corner) && type === 'C') {
                        //renderPoint(markers, com.p, 'purple')
                        //break
                    }

                    //&& comN.type !== 'C'
                    if (isShort && comN.type !== 'C') {
                        //renderPoint(markers, comN.p, 'purple')
                        //candidates.push(comN)
                    }


                    if ((extreme && !corner)) {
                        //console.log(comN);
                        //if(extreme) renderPoint(markers, comN.p0, 'purple')
                        //candidates.push(comN)
                        candidates.push(comN)
                    }

                    break;
                }


                candidates.push(comN)
            }

            // try to create arc command
            if (candidates.length > 1) {

                let clen = candidates.length;
                let pts = [com.p0, com.p,];

                // add interpolated points to prevent wrong arc replacements
                candidates.forEach(c => {
                    if (c.type === 'C') {
                        let pt = pointAtT([c.p0, c.cp1, c.cp2, c.p], 0.5)
                        pts.push(pt)
                    }
                    pts.push(c.p)
                })

                //let pts = [com.p0, com.p, ...candidates.map(com => com.p)];
                //console.log('pts', pts);

                let precise = true
                let arcProps = getArcFromPoly(pts, precise)

                // could be combined
                if (arcProps) {
                    //console.log(arcProps, pts);

                    let { centroid, r, deltaAngle, startAngle, endAngle } = arcProps;
                    let sweep = deltaAngle > 0 ? 1 : 0;
                    //let area = getPolygonArea(pts)
                    //let sweep = area > 0 ? 1 : 0;
                    let largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0;
                    largeArc = 0;
                    let comLast = candidates[clen - 1]
                    let p = comLast.p

                    let comArc = { type: 'A', values: [r, r, 0, largeArc, sweep, p.x, p.y] }

                    //console.log(comArc);

                    comArc.dimA = getDistManhattan(p0, p)
                    comArc.p0 = p0
                    comArc.p = p
                    comArc.error = 0
                    comArc.directionChange = comLast.directionChange
                    comArc.extreme = comLast.extreme
                    comArc.corner = comLast.corner
                    pathDataN.push(comArc)

                    i += candidates.length
                    continue

                }

                // arc radius calculation failed - return original
                else {
                    pathDataN.push(com)
                }
            }

            // could not be simplified – return original command
            else {
                pathDataN.push(com)
            }

        }
        // all other commands
        else {
            pathDataN.push(com)
        }
    }

    //console.log(pathDataN);
    return pathDataN
}


export function refineRoundSegments(pathData, {
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
    let pathDataN = [pathData[0]]

    // just for debugging
    let pathDataTest = []

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


        let cpts = comBez ? (comBez.type === 'C' ? [comBez.p0, comBez.cp1, comBez.cp2, comBez.p] : [comBez.p0, comBez.cp1, comBez.p]) : []

        let areaBez = 0;
        let areaLines = 0;
        let signChange = false;
        let L1, L2;
        let combine = false

        let p0_S, p_S;
        let poly = []
        let pMid;


        // 2. line-line-bezier-line-line
        if (
            comN2 && comN3 &&
            comP.type === 'L' &&
            type === 'L' &&
            comBez &&
            comN2.type === 'L' &&
            (comN3.type === 'L' || comN3.type === 'Z')
        ) {

            L1 = [com.p0, com.p];
            L2 = [comN2.p0, comN2.p];
            p0_S = com.p0
            p_S = comN2.p

            // don't allow sign changes
            areaBez = getPolygonArea(cpts, false)
            areaLines = getPolygonArea([...L1, ...L2], false)
            signChange = (areaBez < 0 && areaLines > 0) || (areaBez > 0 && areaLines < 0)

            if (!signChange) {

                // mid point of mid bezier
                pMid = pointAtT(cpts, 0.5)

                // add to poly
                poly = [p0_S, pMid, p_S]

                combine = true
            }

        }

        // 1. line-bezier-bezier-line
        else if (comN && (type === 'C' || type === 'Q') && comP.type === 'L') {

            //renderPoint(markers, com.p)

            // 1.2 next is cubic next is lineto
            if (comN2 && comN2.type === 'L' && (comN.type === 'C' || comN.type === 'Q')) {

                combine = true

                L1 = [comP.p0, comP.p];
                L2 = [comN2.p0, comN2.p];
                p0_S = comP.p
                p_S = comN2.p0

                // mid point of mid bezier
                pMid = comBez.p

                // add to poly
                poly = [p0_S, comBez.p, p_S]


            }
        }


        /**
         * calculate either combined
         * cubic or arc commands
         */
        if (combine) {


            // try to find center of arc
            let arcProps = getArcFromPoly(poly)
            if (arcProps) {

                let { centroid, r, deltaAngle, startAngle, endAngle } = arcProps;

                let xAxisRotation = 0;
                let sweep = deltaAngle > 0 ? 1 : 0;
                let largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0;

                let pCM = rotatePoint(p0_S, centroid.x, centroid.y, deltaAngle * 0.5)


                let dist2 = getDistAv(pCM, pMid)
                let thresh = getDistAv(p0_S, p_S) * 0.05
                let bezierCommands;

                // point is close enough
                if (dist2 < thresh) {

                    //toCubic = false;

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

                    if (bezierCommands.length === 1) {

                        // prefer more compact quadratic - otherwise arcs
                        let comBezier = revertCubicQuadratic(p0_S, bezierCommands[0].cp1, bezierCommands[0].cp2, p_S)

                        if (comBezier.type === 'Q') {
                            toCubic = true
                        }else{
                            comBezier = bezierCommands[0]
                        }

                        com = comBezier
                        //console.log('bezierCommands', comBezier);

                    }


                    // prefer arcs if 2 cubics are required
                    if (bezierCommands.length > 1) toCubic = false;


                    //toCubic = false

                    // return elliptic arc commands
                    if (!toCubic) {
                        // rewrite simplified command
                        com.type = 'A'
                        com.values = [r, r, xAxisRotation, largeArc, sweep, p_S.x, p_S.y];
                    }

                    //console.log(com);

                    com.p0 = p0_S;
                    com.p = p_S;
                    com.extreme = false;
                    com.corner = false;

                    // test rendering
                    //debug=true

                    /*
                    if (debug) {
                        // arcs
                        if (!toCubic) {
                            pathDataTest = [
                                { type: 'M', values: [p0_S.x, p0_S.y] },
                                { type: 'A', values: [r, r, xAxisRotation, largeArc, sweep, p_S.x, p_S.y] },
                            ]
                        }
                        // cubics
                        else {
                            pathDataTest = [
                                { type: 'M', values: [p0_S.x, p0_S.y] },
                                ...bezierCommands
                            ]

                        }

                        let d = pathDataToD(pathDataTest);
                        renderPath(markers, d, 'orange', '0.5%', '0.5')
                    }
                    */

                    pathDataN.push(com);
                    i++
                    continue

                }
            }
        }

        // pass through
        pathDataN.push(com)
    }

    //let d= pathDataToD(pathDataN)
    //console.log('!pathDataN', d);
    return pathDataN;
}
