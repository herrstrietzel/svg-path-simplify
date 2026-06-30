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
        let com = pathData[c];
        let { type, values } = com;
        let comN = pathData[c + 1] || pathData[l - 1];
        let valuesN = comN.values;
        let p1 = comN.type.toLowerCase() === 'z' ? M : { x: comN.values[comN.values.length - 2], y: comN.values[comN.values.length - 1] }


        let valsL = values.slice(-2)
        p = type !== 'Z' ? { x: valsL[0], y: valsL[1] } : M;

        let nextBezier = type!==comN.type && (comN.type==='C' || comN.type==='Q');


        let area = p1 ? getPolygonArea([p0, p, p1], true) : Infinity
        let distSquare = getSquareDistance(p0, p1)
        let distMax = distSquare ? distSquare / 333 * tolerance : 0

        let isFlat = area < distMax;
        let isFlatBez = false;
        let cpts = [];


        //if (comN.type === 'C') isFlat = false;
        //if (!flatBezierToLinetos && type === 'C') isFlat = false;

        /**
         * type change
         * check flatness
         */
        if (nextBezier) {
            cpts = comN.type === 'C' ?
                [{ x: valuesN[0], y: valuesN[1] }, { x: valuesN[2], y: valuesN[3] }] :
                (comN.type === 'Q' ? [{ x: valuesN[0], y: valuesN[1] }] : []);

            //isFlatBez = commandIsFlat([p0, ...cpts, p], { tolerance });

            isFlat = commandIsFlat([p0, ...cpts, p], { tolerance });
            //if(isFlat) continue;

            /*
            //console.log('isFlatBez', isFlatBez);
            if(!isFlatBez){
                pathDataN.push(com)
                continue
            }
            */

        }

        // convert flat beziers to linetos
        if (flatBezierToLinetos && (type === 'C' || type === 'Q')) {

            cpts = type === 'C' ?
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


        /**
         * colinear = simplification success
         * exclude arcs (as always =) 
         * as semicircles won't have an area
         */

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