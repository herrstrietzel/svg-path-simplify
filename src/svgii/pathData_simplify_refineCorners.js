import { checkLineIntersection, getDistManhattan, getSquareDistance, interpolate, pointAtT } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { getArcFromPoly } from "./geometry_deduceRadius";
import { commandIsFlat } from "./geometry_flatness";
import { pathDataToD } from "./pathData_stringify";
import { roundTo } from "./rounding";
import { renderPoint } from "./visualize";

export function refineRoundedCorners(pathData, {
    threshold = 0,
    simplifyQuadraticCorners = false,
    tolerance = 1
} = {}) {


    // min size threshold for corners
    threshold *= tolerance;

    let l = pathData.length;

    // add fist command
    let pathDataN = [pathData[0]]

    let isClosed = pathData[l - 1].type.toLowerCase() === 'z';
    let zIsLineto = isClosed ?
        (pathData[l - 1].p.x === pathData[0].p0.x && pathData[l - 1].p.y === pathData[0].p0.y)
        : false;

    let lastOff = isClosed ? 2 : 1;

    let comLast = pathData[l - lastOff];
    let lastIsLine = comLast.type === 'L'
    let lastIsBez = comLast.type === 'C'
    let firstIsLine = pathData[1].type === 'L';
    let firstIsBez = pathData[1].type === 'C';

    // in case we have simplified a corner connecting to the start
    let M_adj = null;


    let normalizeClose = isClosed && firstIsBez && (lastIsLine || zIsLineto);

    // normalize closepath to lineto
    if (normalizeClose) {
        pathData[l - 1].values = pathData[0].values
        pathData[l - 1].type = 'L'
        lastIsLine = true
    }

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type } = com;
        let comN = pathData[i + 1] ? pathData[i + 1] : null;

        // search small cubic segments enclosed by linetos
        if ((type === 'L' && comN && comN.type === 'C') ||
            (type === 'C' && comN && comN.type === 'L')
        ) {
            let comL0 = type === 'L' ? com : null;
            let comL1 = null;
            let comBez = [];
            let offset = 0;

            // start to end
            if (i === 1 && firstIsBez && lastIsLine) {
                comBez = [pathData[1]]
                comL0 = pathData[l - 1]
                comL1 = comN
                //renderPoint(markers, com.p, 'purple')
            }

            if (!comL0) {
                pathDataN.push(com)
                continue
            }

            // closing corner to start
            if (isClosed && lastIsBez && firstIsLine && i === l - lastOff - 1) {
                comL1 = pathData[1]
                //???
                comBez = [pathData[l - lastOff]]

                //renderPoint(markers, com.p)
            }

            // collect enclosed bezier segments
            for (let j = i + 1; j < l; j++) {
                let comN = pathData[j] ? pathData[j] : null;
                let comPrev = pathData[j - 1];

                if (comPrev.type === 'C' && j > 2) {
                    comBez.push(comPrev)
                }

                if (comN.type === 'L' && comPrev.type === 'C') {
                    comL1 = comN
                    break;
                }
                offset++
            }


            //comBez = comBez.filter(com=> com.values.join(''))

            if (comL1) {
                //console.log('comL1', comL1);


                // linetos
                let len1 = getDistManhattan(comL0.p0, comL0.p)
                let len2 = getDistManhattan(comL1.p0, comL1.p)

                // bezier
                //let comBezLen = comBez.length;
                //let len3 = getDistManhattan(comBez[0].p0, comBez[comBezLen - 1].p)
                let len3 = getDistManhattan(comL0.p, comL1.p0)

                // check concaveness by area sign change
                let area1 = getPolygonArea([comL0.p0, comL0.p, comL1.p0, comL1.p], false)
                let area2 = getPolygonArea([comBez[0].p0, comBez[0].cp1, comBez[0].cp2, comBez[0].p], false)
                //let isFlatBezier = area2 < getSquareDistance(comL0.p, comL1.p)*0.001

                let signChange = (area1 < 0 && area2 > 0) || (area1 > 0 && area2 < 0)

                // exclude mid bezier segments that are larger than surrounding linetos
                let bezThresh = len3 * 0.5 * tolerance
                let isSmall = bezThresh < len1 && bezThresh < len2;


                /*
                */


                //len1 > len3 && len2 > len3
                if (comBez.length && !signChange && isSmall) {


                    let isSquare = false;

                    if (comBez.length === 1) {
                        let dx = Math.abs(comBez[0].p.x - comBez[0].p0.x)
                        let dy = Math.abs(comBez[0].p.y - comBez[0].p0.y)
                        let diff = (dx - dy)
                        let rat = Math.abs(diff / dx)
                        isSquare = rat < 0.01;
                    }


                    let preferArcs = true;
                    preferArcs = false;


                    // if rectangular prefer arcs
                    if (preferArcs && isSquare) {

                        let pM = pointAtT([comBez[0].p0, comBez[0].cp1, comBez[0].cp2, comBez[0].p], 0.5)

                        let arcProps = getArcFromPoly([comBez[0].p0, pM, comBez[0].p])
                        let { r, centroid, deltaAngle } = arcProps;

                        let sweep = deltaAngle > 0 ? 1 : 0;
                        //let largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0;
                        let largeArc = 0;

                        let comArc = { type: 'A', values: [r, r, 0, largeArc, sweep, comBez[0].p.x, comBez[0].p.y] }

                        pathDataN.push(comL0, comArc);
                        i += offset
                        continue

                    }




                    let areaThresh = getSquareDistance(comBez[0].p0, comBez[0].p) * 0.005
                    let isFlatBezier = Math.abs(area2) < areaThresh;
                    let isFlatBezier2 = Math.abs(area2) < areaThresh * 10


                    let ptQ = !isFlatBezier ? checkLineIntersection(comL0.p0, comL0.p, comL1.p, comL1.p0, false, true) : null


                    // exit: is rather flat or has no intersection
                    //|| (isFlatBezier && comBez.length === 1)
                    if (!ptQ || (isFlatBezier2 && comBez.length === 1)) {
                        pathDataN.push(com);
                        continue
                    }

                    // check sign change - exit if present
                    if (ptQ) {
                        let area0 = getPolygonArea([comL0.p0, comL0.p, comL1.p0, comL1.p], false);
                        let area0_abs = Math.abs(area0);
                        let area1 = getPolygonArea([comL0.p0, comL0.p, ptQ, comL1.p0, comL1.p], false);
                        let area1_abs = Math.abs(area1);
                        let areaDiff = Math.abs(area0_abs - area1_abs) / area0_abs
                        let signChange = area0 < 0 && area1 > 0 || area0 > 0 && area1 < 0;

                        if (!ptQ || signChange || areaDiff > 0.5) {
                            pathDataN.push(com);
                            continue
                        }

                    }


                    // final check: mid point proximity
                    let ptM = pointAtT([comL0.p, ptQ, comL1.p0], 0.5)
                    let ptM_bez = comBez.length === 1 ? pointAtT([comBez[0].p0, comBez[0].cp1, comBez[0].cp2, comBez[0].p], 0.5) : comBez[0].p;

                    let dist1 = getDistManhattan(ptM, ptM_bez) * 0.75

                    //renderPoint(markers, ptM, 'red', '0.5%', '0.5')
                    //renderPoint(markers, ptM_bez, 'green', '0.5%', '0.5')

                    // not in tolerance – return original command
                    if (bezThresh && dist1 > bezThresh && dist1 > len3 * 0.3) {
                        pathDataN.push(com);
                        continue;

                    }

                    // return simplified quadratic Bézier command
                    let p_Q = comL1.p0;

                    // adjust previous end point to better fit the cubic curvature
                    let adjustQ = !simplifyQuadraticCorners;


                    if (adjustQ) {
                        //let t = 0.1333
                        let t = 0.1666
                        let p0_adj = interpolate(ptQ, comL0.p, (1 + t))
                        p_Q = interpolate(ptQ, comL1.p0, (1 + t))

                        // round for large enough segments
                        let isH = ptQ.y===comL0.p.y
                        let isV = ptQ.x===comL0.p.x
                        let isH2 = ptQ.y===comL1.p0.y
                        let isV2 = ptQ.x===comL1.p0.x

                        if(isSquare && com.dimA>3){
                            let dec = 0.5;
                            if(isH) p0_adj.x = roundTo(p0_adj.x, dec)
                            if(isV) p0_adj.y = roundTo(p0_adj.y, dec)
                            if(isH2) p_Q.x = roundTo(p_Q.x, dec)
                            if(isV2) p_Q.y = roundTo(p_Q.y, dec)
                        }


                        /*
                        renderPoint(markers, p0_adj, 'orange')
                        renderPoint(markers, p_Q, 'orange')
                        renderPoint(markers, comL0.p, 'green')
                        renderPoint(markers, comL1.p0, 'magenta')
                        */

                        // set new M starting point
                        if (i === l - lastOff - 1) {
                            //renderPoint(markers, p0_adj, 'red')
                            M_adj = p_Q
                        }

                        // adjust previous lineto end point
                        comL0.values = [p0_adj.x, p0_adj.y]
                        comL0.p = p0_adj;

                    }

                    let comQ = { type: 'Q', values: [ptQ.x, ptQ.y, p_Q.x, p_Q.y] }
                    comQ.cp1 = ptQ;
                    comQ.p0 = comL0.p;
                    comQ.p = p_Q;

                    // add quadratic command
                    pathDataN.push(comL0, comQ);



                    i += offset;
                    continue;

                }
            }
        }

        // skip last lineto
        if (normalizeClose && i === l - 1 && type === 'L') {
            continue
        }

        pathDataN.push(com)

    }

    // correct starting point connecting with last corner rounding
    if (M_adj) {
        pathDataN[0].values = [M_adj.x, M_adj.y]
        pathDataN[0].p0 = M_adj;
    }


    // revert close path normalization
    if (normalizeClose || (isClosed && pathDataN[pathDataN.length - 1].type !== 'Z')) {
        pathDataN.push({ type: 'Z', values: [] })
    }

    //console.log(pathDataN);

    return pathDataN;

}