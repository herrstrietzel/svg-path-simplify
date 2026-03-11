import { checkLineIntersection, getDistManhattan, getSquareDistance, interpolate, pointAtT } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { commandIsFlat } from "./geometry_flatness";
import { renderPoint } from "./visualize";

export function refineRoundedCorners(pathData, {
    threshold = 0,
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
                comBez = [pathData[l - lastOff]]
                //renderPoint(markers, com.p)
            }

            for (let j = i + 1; j < l; j++) {
                let comN = pathData[j] ? pathData[j] : null;
                let comPrev = pathData[j - 1];

                if (comPrev.type === 'C') {
                    comBez.push(comPrev)
                }

                if (comN.type === 'L' && comPrev.type === 'C') {
                    comL1 = comN
                    break;
                }
                offset++
            }

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


                //len1 > len3 && len2 > len3
                if (comBez.length && !signChange && isSmall) {

                    let isFlatBezier = Math.abs(area2) < getSquareDistance(comBez[0].p0, comBez[0].p) * 0.005
                    let ptQ = !isFlatBezier ? checkLineIntersection(comL0.p0, comL0.p, comL1.p, comL1.p0, false, true) : null

                    if (!ptQ) {
                        pathDataN.push(com);
                        continue
                    }

                    // check sign change
                    if (ptQ) {
                        let area0 = getPolygonArea([comL0.p0, comL0.p, comL1.p0, comL1.p], false);
                        let area0_abs = Math.abs(area0);
                        let area1 = getPolygonArea([comL0.p0, comL0.p, ptQ, comL1.p0, comL1.p], false);
                        let area1_abs = Math.abs(area1);
                        let areaDiff = Math.abs(area0_abs - area1_abs) / area0_abs
                        //console.log('areaDiff', areaDiff);


                        /*
                        renderPoint(markers, comL0.p0, 'green', '0.5%', '0.5')
                        renderPoint(markers, comL0.p, 'red', '1.5%', '0.5')
                        renderPoint(markers, comL1.p0, 'blue', '0.5%', '0.5')
                        renderPoint(markers, comL1.p, 'orange', '0.5%', '0.5')
                        if(!area0) {
                            pathDataN.push(com);
                            continue
                        }
                        */

                        let signChange = area0 < 0 && area1 > 0 || area0 > 0 && area1 < 0;

                        if (!ptQ || signChange || areaDiff > 0.5) {
                            //console.log(signChange, area0, area1, 'pts', comL0.p0, comL0.p, comL1.p0, comL1.p);
                            //renderPoint(markers, ptQ, 'cyan', '0.5%', '0.5')
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
                        //renderPoint(markers, ptM_bez, 'cyan', '0.5%', '0.5')
                        //renderPoint(markers, ptQ, 'magenta', '0.5%', '0.5')
                        pathDataN.push(com);
                        continue;

                    } else {

                        //renderPoint(markers, ptQ, 'magenta', '0.5%', '0.5')
                        let comQ = { type: 'Q', values: [ptQ.x, ptQ.y, comL1.p0.x, comL1.p0.y] }
                        comQ.p0 = comL0.p;
                        comQ.cp1 = ptQ;
                        comQ.p = comL1.p0;

                        // add quadratic command
                        pathDataN.push(comL0, comQ);
                        i += offset;
                        //i++

                        //offset++
                        continue;
                    }

                }
            }
        }

        // skip last lineto
        if (normalizeClose && i === l - 1 && type === 'L') {
            continue
        }

        pathDataN.push(com)

    }



    // revert close path normalization
    if (normalizeClose || (isClosed && pathDataN[pathDataN.length - 1].type !== 'Z')) {
        pathDataN.push({ type: 'Z', values: [] })
    }


    //console.log(pathDataN);

    return pathDataN;

}