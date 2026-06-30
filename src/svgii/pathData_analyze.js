import { splitSubpaths } from './pathData_split.js';
import { getAngle, bezierhasExtreme, getPathDataVertices, svgArcToCenterParam, getSquareDistance, getDistManhattan, isMultipleOf45, pointAtT, getTatAngles, checkLineIntersection } from "./geometry.js";
import { getPolygonArea, getPathArea } from './geometry_area.js';
import { getPolyBBox } from './geometry_bbox.js';
import { renderPoint, renderPath } from "./visualize.js";
import { commandIsFlat } from './geometry_flatness.js';
import { roundPathData } from './rounding.js';


/**
 * create pathdata super set 
 * including geometrical properties such as:
 * segment introduces x/y extreme
 * corner
 * inflection/direction change
 */

export function analyzePathData(pathData = [], {
    detectExtremes = true,
    detectCorners = true,
    detectDirection = true,
    detectSemiExtremes = false,
    debug = false,
    addSquareLength = false,
    addArea = true,

} = {}) {

    // get verbose control point data
    pathData = getPathDataVerbose(pathData, { addSquareLength, addArea });
    //pathData = roundPathData(pathData, 3)

    // new pathdata adding properties
    let pathDataPlus = [];

    //console.log('pathData', pathData);
    //return pathData

    let pathPoly = getPathDataVertices(pathData);
    let bb = getPolyBBox(pathPoly)
    let { left, right, top, bottom, width, height } = bb;


    // init starting point data
    pathData[0].corner = false;
    pathData[0].extreme = false;
    pathData[0].semiExtreme = false;
    pathData[0].directionChange = false;
    pathData[0].closePath = false;
    //pathData[0].dimA = 0;


    // add first M command
    let pathDataProps = [pathData[0]];
    let len = pathData.length;

    // threshold for corner angles: 10 deg
    //let thresholdCorner = Math.PI * 2 / 360 * 10

    // define angle threshold for semi extremes
    //let thresholdAngle = detectSemiExtremes ? 0.01 : 0.05


    for (let c = 2; len && c <= len; c++) {

        let com = pathData[c - 1];
        let { type, values, p0, p, cp1 = null, cp2 = null, squareDist = 0, cptArea = 0, dimA = 0 } = com;

        //next command
        let comPrev = pathData[c-2];
        let comN = pathData[c] || null;


        // init properties
        com.corner = false;
        com.extreme = false;
        com.semiExtreme = false;
        com.directionChange = false;
        com.closePath = false;

        // get command points  
        let commandPts = (type === 'C' || type === 'Q') ?
            (type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p]) :
            ([p0, p]);


        // check flatness of command
        let toleranceFlat = 0.01;
        let thresholdLength = dimA * 0.1
        //let threshold = thresholdLength * 0.01
        let threshold = dimA * 0.005
        let areaThresh = squareDist * toleranceFlat;
        let isFlat = Math.abs(cptArea) < areaThresh;


        // bezier types
        let isBezier = type === 'Q' || type === 'C';
        let isArc = type === 'A';
        let isBezierN = comN && (comN.type === 'Q' || comN.type === 'C');


        /**
         * detect extremes
         * local or absolute 
         */
        let hasExtremes = false;

        //!isFlat &&
        if (detectExtremes && isBezier) {


            let dx = type === 'C' ? Math.abs(com.cp2.x - com.p.x) : Math.abs(com.cp1.x - com.p.x)
            let dy = type === 'C' ? Math.abs(com.cp2.y - com.p.y) : Math.abs(com.cp1.y - com.p.y)

            //let horizontal = (dy === 0 || dy<=threshold ) && dx > 0
            //let vertical = (dx === 0 || dx<=threshold ) && dy > 0
            let horizontal = (dy === 0 || dy <= threshold) && dx > 0
            let vertical = (dx === 0 || dx <= threshold) && dy > 0

            if (horizontal || vertical) {
                hasExtremes = true;
            }

            // is extreme relative to bounding box 

            // (cp1.x===p0.x && cp1.y!==p0.y  ) ||
            if ((cp1.x === p0.x && cp1.y !== p0.y) || (cp1.y === p0.y && cp1.x !== p0.x)) {
                //hasExtremes = true;
                //renderPoint(markers, p0 )
                //p0.extreme = true
                //let comP = pathDataProps[pathDataProps.length-1]
                pathDataProps[pathDataProps.length - 1].extreme = true
                //console.log(comP);
            }


            if ((p.x === left || p.y === top || p.x === right || p.y === bottom)) {
                hasExtremes = true;
            }

            // interpret segment as extreme if it has an implicit extreme
            if (!hasExtremes) {
                let couldHaveExtremes = bezierhasExtreme(null, commandPts)
                if (couldHaveExtremes) {
                    let tArr = getTatAngles(commandPts)

                    if (tArr.length && (tArr[0] > 0.2)) {
                        hasExtremes = true;
                    }
                }
            }
        }

        // check extremes introduce by small arcs
        else if(detectExtremes && isArc && comN && ((comPrev.type==='C' || comPrev.type==='Q') || (comN.type==='C' || comN.type==='Q'))  ){
            let distN = comN ? comN.dimA : 0
            let isShort = com.dimA < (comPrev.dimA + distN) * 0.1;
            let smallRadius = com.values[0] === com.values[1] && (com.values[0] < 1)

            if(isShort && smallRadius){
                let bb = getPolyBBox([comPrev.p0, comN.p])
                if(p.x>bb.right || p.x<bb.x || p.y<bb.y || p.y>bb.bottom){
                    hasExtremes = true;
                    //renderPoint(markers, p)
                }
            }

        }

        if (hasExtremes) com.extreme = true

        // Corners and semi extremes 
        if (detectCorners && isBezier && isBezierN) {

            /**
             * Detect direction change points
             * this will prevent distortions when simplifying
             * e.g in the "spine" of an "S" glyph
             */
            let signChange = (com.cptArea < 0 && comN.cptArea > 0) || (com.cptArea > 0 && comN.cptArea < 0) ? true : false;

            if (signChange) com.directionChange = true;

            // check corners
            if (!com.extreme) {

                let cp_0 = cp2 ? cp2 : cp1
                let cp_1 = comN.cp1

                let areaCpt = getPolygonArea([cp_0, p, cp_1], false)
                let threshArea = getSquareDistance(cp_0, cp_1) * 0.01
                let isFlat = Math.abs(areaCpt) < threshArea;

                let signChange2 = (areaCpt < 0 && com.cptArea > 0) || (areaCpt > 0 && com.cptArea < 0) ? true : false;

                let isCorner = !isFlat && signChange2;
                if (isCorner) com.corner = true;
            }
        }

        pathDataProps.push(com)

    }


    //debug = true;
    
    if (debug) {
        pathDataProps.forEach(com=>{
            //if (com.semiExtreme) renderPoint(markers, com.p, 'blue', '2%', '0.5')
            if (com.directionChange) renderPoint(markers, com.p, 'orange', '1.5%', '0.5')
            if (com.corner) renderPoint(markers, com.p, 'magenta', '1.5%', '0.5')
            if (com.extreme) renderPoint(markers, com.p, 'cyan', '1%', '0.5')
        })
    }


    //pathDataProps.push(comLast)


    let dimA = (width + height) / 2
    //pathDataPlus.push({ pathData: pathDataProps, bb: bb, dimA: dimA })
    pathDataPlus = { pathData: pathDataProps, bb: bb, dimA: dimA }

    //console.log('pathDataPlus', pathDataPlus);
    return pathDataPlus

}




export function addDimensionData(pathData) {

    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p;

    pathData[0].dimA = 0;
    let len = pathData.length

    for (let c = 2; len && c <= len; c++) {

        let com = pathData[c - 1];
        let { type, values } = com;
        let valsL = values.slice(-2);

        p = valsL.length ? { x: valsL[0], y: valsL[1] } : M;

        // update M for Z starting points
        if (type === 'M') {
            M = p;
        }
        else if (type.toLowerCase() === 'z') {
            p = M;
        }

        let dimA = getDistManhattan(p0, p);
        com.dimA = dimA;
        com.p0 = p0
        com.p = p


        if (type === 'C' || type === 'Q') com.cp1 = { x: values[0], y: values[1] }
        if (type === 'C') com.cp2 = { x: values[2], y: values[3] }

        p0 = p
    }


    //console.log('!!!pathData', pathData);
    return pathData
}




/**
 * create pathdata super set 
 * including geometrical properties such as:
 * start and end points
 * segment square distances and areas
 * elliptic arc parameters
 */
export function getPathDataVerbose(pathData, {
    addSquareLength = true,
    addArea = false,
    addArcParams = false,
    addAverageDim = true
} = {}) {

    // initial starting point coordinates
    let com0 = pathData[0];
    let M = { x: com0.values[0], y: com0.values[1] };
    let p0 = M;
    let p = M;

    com0.p0 = p0;
    com0.p = p;
    com0.idx = 0
    com0.dimA = 0


    let len = pathData.length;
    let pathDataVerbose = [com0];

    for (let i = 1; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valuesLen = values.length;

        p = valuesLen ? { x: values[valuesLen - 2], y: values[valuesLen - 1] } : M;
        let cp1, cp2;

        // add on-path points
        com.p0 = p0;
        com.p = p;
        com.dimA = getDistManhattan(p0, p)

        // update M for Z starting points
        if (type === 'M') {
            M = p;
        }

        // add bezier control point properties
        if (type === 'Q' || type === 'C') {
            cp1 = { x: values[0], y: values[1] }
            cp2 = type === 'C' ? { x: values[2], y: values[3] } : null;
            com.cp1 = cp1;
            if (cp2) {
                com.cp2 = cp2;
            }
        }

        else if (type === 'A' && addArcParams) {
            let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle } = svgArcToCenterParam(p0.x, p0.y, ...values)
            com.cx = cx
            com.cy = cy
            com.rx = rx
            com.ry = ry
            com.xAxisRotation = values[2] / 180 * Math.PI
            com.largeArc = values[3]
            com.sweep = values[4]
            com.startAngle = startAngle
            com.endAngle = endAngle
            com.deltaAngle = deltaAngle
        }

        /**
         * explicit and implicit linetos 
         * - introduced by Z
         */
        if (type === 'Z') {
            // if Z introduces an implicit lineto with a length
            if (M.x !== p.x && M.y !== p.y) {
                com.closePath = true;
            }
        }

        if (addSquareLength) {
            com.squareDist = getSquareDistance(p0, p)
        }

        if (addArea) {
            let cptArea = 0;
            if (type === 'C') cptArea = getPolygonArea([p0, cp1, cp2, p], false)
            if (type === 'Q') cptArea = getPolygonArea([p0, cp1, p], false)
            com.cptArea = cptArea;
        }

        com.idx = i;

        // update previous point
        p0 = p;
        pathDataVerbose.push(com)
    }

    //console.log('pathDataVerbose', pathDataVerbose);
    return pathDataVerbose;
}