import { findSplitT, getExtrapolatedCommand } from "../pathData_simplify_cubic";
import { getCombinedByDominant, getCombinedByDominant_back } from "../pathData_simplify_cubic_extrapolate";
import { bezierhasExtreme, checkLineIntersection, getDistAv, getDistManhattan, getSquareDistance, interpolate } from "./geometry";
import { getPathArea, getPolygonArea } from "./geometry_area";
import { getPathDataBBox } from "./geometry_bbox";
import { interpolatedPathData } from "./pathData_interpolate";
import { pathDataToD } from "./pathData_stringify";
import { renderPath, renderPoint } from "./visualize";

export function refineAdjacentExtremes(pathData, {
    threshold = null, tolerance = 1
} = {}) {

    //console.log('!!!refineAdjacentExtremes', pathData);


    //dimA = dimA ? dimA : 
    if (!threshold) {
        let bb = getPathDataBBox(pathData);
        //threshold = (bb.width + bb.height) / 2 * 0.05
        threshold = (bb.width + bb.height) * 0.05
        //console.log('new threshold', threshold);
    }

    //let bb = getPathDataBBox(pathData);
    //threshold = (bb.width + bb.height) / 2 * 0.1


    let l = pathData.length

    for (let i = 0; i < l; i++) {
        let com = pathData[i];
        let { type, values, extreme, corner = false, dimA, p0, p } = com;
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        let comN2 = pathData[i + 2] ? pathData[i + 2] : null;


        // check dist
        //threshold = threshold*1.05
        let diff = comN ? getDistManhattan(p, comN.p) : Infinity;
        let isCose = diff < threshold;

        let diff2 = comN2 ? getDistManhattan(comN2.p, comN.p) : Infinity
        let isCose2 = diff2 < threshold*1;

        //let selfIntersecting = false

        // next is extreme
        if (comN && comN2 && type === 'C' && comN.type === 'C' && extreme && comN2.extreme) {

            //renderPoint(markers, comN.p)

            if (isCose2 || isCose) {

                // extrapolate
                let comEx = getCombinedByDominant(comN, comN2, threshold, tolerance, false)

                if (comEx.length === 1) {

                    comEx = comEx[0]
                    pathData[i + 1] = null;
                    pathData[i + 2].values = [comEx.cp1.x, comEx.cp1.y, comEx.cp2.x, comEx.cp2.y, comEx.p.x, comEx.p.y]
                    pathData[i + 2].cp1 = comEx.cp1
                    pathData[i + 2].cp2 = comEx.cp2
                    pathData[i + 2].p0 = comEx.p0
                    pathData[i + 2].p = comEx.p
                    pathData[i + 2].extreme = comEx.extreme

                    i++
                    continue
                }
            }

        }


        // short after extreme
        if (comN && type === 'C' && comN.type === 'C' && extreme) {

            if (isCose) {

                let area0 = getPolygonArea([com.p0, com.p, comN.p])
                // cpts area
                let area1 = getPolygonArea([com.p0, com.cp1, com.cp2, com.p])

                // sign change: is corner => skip
                if ((area0 < 0 && area1 > 0) || (area0 > 0 && area1 < 0)) {
                    //renderPoint(markers, com.p, 'orange', '1%', '0.5')
                    continue;
                }
            }
        }


    }

    // remove commands
    pathData = pathData.filter(Boolean)
    l = pathData.length



    /**
     * refine closing commands
     */

    let closed = pathData[l - 1].type.toLowerCase() === 'z';
    let lastIdx = closed ? l - 2 : l - 1;
    let lastCom = pathData[lastIdx];
    let penultimateCom = pathData[lastIdx - 1] || null;
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] }

    let dec = 8
    let lastVals = lastCom.values.slice(-2);
    let isClosingTo = +lastVals[0].toFixed(dec) === +M.x.toFixed(dec) && +lastVals[1].toFixed(dec) === +M.y.toFixed(dec)
    let fistExt = pathData[1].type === 'C' && pathData[1].extreme ? pathData[1] : null;


    //renderPoint(markers, M, 'blue')
    //renderPoint(markers, fistExt.cp1, 'blue')
    //renderPoint(markers, fistExt.p0, 'blue')



    let diff = getDistManhattan(lastCom.p0, lastCom.p)
    let isCose = diff < threshold;


    if (penultimateCom && penultimateCom.type === 'C' && isCose && isClosingTo && fistExt) {

        let comEx = getCombinedByDominant(penultimateCom, lastCom, threshold, tolerance, false)

        if (comEx.length === 1) {
            pathData[lastIdx - 1] = comEx[0];
            pathData[lastIdx] = null;
            pathData = pathData.filter(Boolean)
        }

        //console.log(pathData);
    }


    //console.log('pathData ex', pathData);

    return pathData

}