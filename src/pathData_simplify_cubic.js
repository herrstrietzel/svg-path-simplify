import { getCombinedByDominant } from "./pathData_simplify_cubic_extrapolate";
import { getDistance, getSquareDistance, checkLineIntersection, pointAtT, interpolate, getDistManhattan, getPerpendicularPoint } from "./svgii/geometry";
import { getBezierArea, getPolygonArea } from "./svgii/geometry_area";
import { pathDataToD } from "./svgii/pathData_stringify";
import { renderPath, renderPoint, renderPoly } from "./svgii/visualize";



export function simplifyPathDataCubic(pathData, {
    keepExtremes = true,
    keepInflections = true,
    keepCorners = true,
    extrapolateDominant = true,
    tolerance = 1,
} = {}) {

    let pathDataN = [pathData[0]];
    let l = pathData.length;

    for (let i = 2; l && i <= l; i++) {
        let com = pathData[i - 1];
        let comN = i < l ? pathData[i] : null;
        let typeN = comN?.type || null;
        //let isCornerN = comN?.corner || null;
        //let isExtremeN = comN?.extreme || null;

        let { type, values, p0, p, cp1 = null, cp2 = null, extreme = false, directionChange = false, corner = false, dimA = 0 } = com;

        //let isDirChange = com?.directionChange || null;
        //let isDirChangeN = comN?.directionChange || null;


        // next is also cubic
        if (type === 'C' && typeN === 'C') {

            // cannot be combined as crossing extremes or corners
            if (
                (keepCorners && corner) ||
                (keepExtremes && extreme)
            ) {
                //renderPoint(markers, p, 'red', '1%')
                pathDataN.push(com)
            }

            // try simplification
            else {


                //renderPoint(markers, p, 'magenta', '1%')
                let combined = combineCubicPairs(com, comN, { tolerance })
                let error = 0;


                // combining successful! try next segment
                if (combined.length === 1) {
                    com = combined[0]
                    let offset = 1;

                    // add cumulative error to prevent distortions
                    error += com.error;

                    // find next candidates
                    for (let n = i + offset; error < tolerance && n < l; n++) {
                        let comN = pathData[n]

                        if (comN.type !== 'C' ||
                            (
                                (keepInflections && com.directionChange) ||
                                (keepCorners && com.corner) ||
                                (keepExtremes && com.extreme)
                            )
                        ) {

                            break
                        }

                        let combined = combineCubicPairs(com, comN, { tolerance })

                        // failure - could not be combined - exit loop
                        if (combined.length > 1) {
                            //renderPoint(markers, com.p, 'orange', '1%', '0.5')
                            break
                        }

                        /**
                         * success
                         * add cumulative error to prevent distortions
                         */
                        //error += combined[0].error * 0.5;
                        error += combined[0].error * 0.5;
                        offset++

                        // return combined
                        com = combined[0]

                    }

                    //console.log('tests', log, offset);

                    //com.opt = true
                    pathDataN.push(com)

                    // skip to next candidates
                    if (i < l) {
                        i += offset
                    }

                } else {
                    pathDataN.push(com)
                }
            }

        } // end of bezier command


        // other commands
        else {
            pathDataN.push(com)
        }

    } // end command loop

    return pathDataN
}




export function combineCubicPairs(com1, com2, {
    tolerance = 1
} = {}) {

    let commands = [com1, com2];

    // assume 2 segments are result of a segment split
    let t = findSplitT(com1, com2);

    // quit if t is start
    if (!t) return commands;

    // get averaged threshold
    let distAv1 = getDistManhattan(com1.p0, com1.p);
    let distAv2 = getDistManhattan(com2.p0, com2.p);
    let distMin = Math.max(0, Math.min(distAv1, distAv2))

    //let distScale = 0.08
    let distScale = 0.075
    let maxDist = distMin * distScale * tolerance

    // get hypothetical combined command
    let comS = getExtrapolatedCommand(com1, com2, t)

    // test new point-at-t against original mid segment starting point
    let ptI = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t)

    let dist0 = getDistManhattan(com1.p, ptI)
    let dist1 = 0, dist2 = 0;
    let close = dist0 < maxDist;
    let success = false;

    // collect error data
    let error = dist0;

    if (close) {

        /**
         * check additional points
         * to prevent distortions
         */

        // 1st segment mid
        let ptM_seg1 = pointAtT([com1.p0, com1.cp1, com1.cp2, com1.p], 0.5)

        let t2 = t * 0.5;
        // combined interpolated mid point
        let ptI_seg1 = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t2)
        dist1 = getDistManhattan(ptM_seg1, ptI_seg1)

        error += dist1;

        if (dist1 < maxDist) {

            // 2nd segment mid
            let ptM_seg2 = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], 0.5)

            // simplified path
            let t3 = (1 + t) * 0.5;
            let ptI_seg2 = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t3)
            dist2 = getDistManhattan(ptM_seg2, ptI_seg2)

            error += dist2;

            if (error < maxDist) success = true;

        }

    } // end 1st try



    // add meta
    if (success) {

        // correct to exact start and end points
        comS.p0 = com1.p0
        comS.p = com2.p

        comS.dimA = getDistManhattan(comS.p0, comS.p);
        comS.type = 'C';

        comS.extreme = com2.extreme;
        comS.directionChange = com2.directionChange;
        comS.corner = com2.corner;

        comS.values = [comS.cp1.x, comS.cp1.y, comS.cp2.x, comS.cp2.y, comS.p.x, comS.p.y]

        // relative error
        comS.error = error / maxDist;

        //comS.p0 = com1.p0;
        commands = [comS];

    }


    //renderPoint(markers, com1.p, 'green', '1%', '0.5')
    //renderPoint(markers, pt, 'red', '0.75%', '0.5')

    return commands;
}





export function getError(com, area = 0, threshold = 0) {
    let areaN = getBezierCommandArea([com])
    let areaDiff = Math.abs(area - areaN)
    let error = areaDiff / threshold

    return error
}


export function getExtrapolatedCommand(com1, com2, t = 0) {

    let { p0, cp1 } = com1;
    let { p, cp2 } = com2;

    // extrapolate control points
    cp1 = {
        x: (cp1.x - (1 - t) * p0.x) / t,
        y: (cp1.y - (1 - t) * p0.y) / t
    };

    cp2 = {
        x: (cp2.x - t * p.x) / (1 - t),
        y: (cp2.y - t * p.y) / (1 - t)
    };

    return { p0, cp1, cp2, p };
}


export function getBezierCommandArea(commands = [com1, com2], absolute = true) {

    let bezArea = 0;
    let polyArea = 0;
    let poly = [commands[0].p0];

    commands.forEach(com => {
        bezArea += getBezierArea([com.p0, com.cp1, com.cp2, com.p])
        poly.push(com.p)

    })
    polyArea += getPolygonArea(poly)
    return Math.abs(bezArea + polyArea);

}



export function findSplitT(com1, com2) {
    // distances between 1st and 2nd segment cpt to mid point
    let l1 = getDistManhattan(com1.cp2, com1.p)


    // exit for zero length control point vectors
    if (l1 === 0) {
        //console.log('!quit1');
        return 0;
    }

    let l2 = getDistManhattan(com1.p, com2.cp1)
    if (l2 === 0) {
        //console.log('!quit2');
        return 0;
    }

    // dist between both segments' control points
    let l3 = getDistManhattan(com1.cp2, com2.cp1)

    /*
    // exit for zero length control point vectors
    if(l1===0 || l2===0 || l1===l3 || l2===l3) {
        console.log('!quit');
        return 0;
    }
    */

    let t = l1 / l3;
    //console.log('t', t);

    return t;
}
