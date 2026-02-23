import { getDeltaAngle, getDistAv, getDistManhattan, getSquareDistance } from "./geometry.js";
import { getPolygonArea } from "./geometry_area.js";
import { checkBezierFlatness, commandIsFlat } from "./geometry_flatness.js";
import { renderPoint, renderPoly } from "./visualize.js";

export function pathDataRemoveColinear(pathData, {
    tolerance = 1,
    //toleranceCubics = null,
    flatBezierToLinetos = true
} = {}) {

    //toleranceCubics = !toleranceCubics ? tolerance : toleranceCubics;
    let pathDataN = [pathData[0]];

    let M = { x: pathData[0].values[0], y: pathData[0].values[1] }
    let p0 = M;
    let p = M
    let isClosed = pathData[pathData.length - 1].type.toLowerCase() === 'z'

    for (let c = 1, l = pathData.length; c < l; c++) {
        //let comPrev = pathData[c - 1];
        let com = pathData[c];
        let comN = pathData[c + 1] || pathData[l - 1];
        //let p1 = comN.type.toLowerCase() === 'z' ? M : { x: comN.values[comN.values.length - 2], y: comN.values[comN.values.length - 1] }
        let p1 = comN.type.toLowerCase() === 'z' ? M : { x: comN.values[comN.values.length - 2], y: comN.values[comN.values.length - 1] }


        let { type, values } = com;
        let valsL = values.slice(-2)
        p = type !== 'Z' ? { x: valsL[0], y: valsL[1] } : M;


        /*
        let area = p1 ? getPolygonArea([p0, p, p1], true) : Infinity
        let distSquare = getSquareDistance(p0, p1)
        let distMax = distSquare ? distSquare / 333 * tolerance : 0
        */

        //let isFlat = area < distMax;
        let isFlat = false;
        let isFlatBez = false;


        // flatness by cross product 
        let dx0 = Math.abs(p1.x - p0.x)
        let dy0 = Math.abs(p1.y - p0.y)

        let dx1 = Math.abs(p.x - p0.x)
        let dy1 = Math.abs(p.y - p0.y)

        let dx2 = Math.abs(p1.x - p.x)
        let dy2 = Math.abs(p1.y - p.y)

        // zero length segments are flat
        let isZeroLength = (!dy1 && !dx1) || (!dy2 && !dx2)
        if (isZeroLength) isFlat = true;

        // check cross products for colinearity
        if (!isFlat) {

            let cross0 = Math.abs(dx0 * dy1 - dy0 * dx1);
            //let cross1 = Math.abs(dx1 * dy2 - dy1 * dx2);
            //let crossDiff = Math.abs(cross0-cross1)
            //let cross = Math.max(cross0, cross1)
            let thresh = (dx0 + dy0) * 0.1

            //!cross0 ||
            if ( cross0 < thresh) {
                //renderPoint(markers, p)
                isFlat = true
            }
        }


        if (!flatBezierToLinetos && type === 'C') isFlat = false;

        // convert flat beziers to linetos
        if (flatBezierToLinetos && (type === 'C' || type === 'Q')) {

            let cpts = type === 'C' ?
                [{ x: values[0], y: values[1] }, { x: values[2], y: values[3] }] :
                (type === 'Q' ? [{ x: values[0], y: values[1] }] : []);

            isFlatBez = commandIsFlat([p0, ...cpts, p], { tolerance });

            if (isFlatBez && c < l - 1) {
                type = "L"
                com.type = "L"
                com.values = valsL
                //renderPoint(markers, p, 'cyan', '2%', '0.5')
            }
        }


        // colinear – exclude arcs (as always =) as semicircles won't have an area
        //&& comN.type==='L'
        if (isFlat && c < l - 1 && comN.type !== 'A' && (type === 'L' || (flatBezierToLinetos && isFlatBez))) {

            continue;
        }

        // update end point
        p0 = p;


        if (type === 'M') {
            M = p
        }

        // proceed and add command
        pathDataN.push(com)

    }

    // add close path
    if (isClosed) {
        //pathDataN.push({ type: 'Z', values: [] })
    }
    //console.log('pathDataN', pathDataN);

    return pathDataN;

}