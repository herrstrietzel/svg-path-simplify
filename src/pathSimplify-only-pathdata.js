import { detectInputType } from './detect_input';
import { simplifyPathDataCubic } from './pathData_simplify_cubic';
import { analyzePathData } from './svgii/pathData_analyze';
import { convertPathData } from './svgii/pathData_convert';
import { parsePathDataNormalized } from './svgii/pathData_parse';
import { pathDataRemoveColinear } from './svgii/pathData_remove_collinear';
import { removeOrphanedM } from './svgii/pathData_remove_orphaned';
import { removeZeroLengthLinetos } from './svgii/pathData_remove_zerolength';
import { optimizeClosePath, pathDataToTopLeft } from './svgii/pathData_reorder';
import { addExtremePoints, splitSubpaths } from './svgii/pathData_split';
import { pathDataToD } from './svgii/pathData_stringify';
//import { pathDataToPolyPlus, pathDataToPolySingle } from './svgii/pathData_toPolygon';
import { detectAccuracy } from './svgii/rounding';
import { refineAdjacentExtremes } from './svgii/pathData_simplify_refineExtremes';
import { refineRoundedCorners } from './svgii/pathData_simplify_refineCorners';
import { refineRoundSegments } from './svgii/pathData_refine_round';
import { refineClosingCommand } from './svgii/pathData_remove_short';
import { pathDataRevertCubicToQuadratic } from './pathData_simplify_revertToquadratics';
import { pathDataLineToCubic } from './svgii/pathData_line_to_cubic';

//import { installDOMPolyfills } from './dom-polyfill';

export function simplifyPathData(input = '', {

    toAbsolute = true,
    toRelative = true,
    toShorthands = true,
    //optimize = 0,

    // not necessary unless you need cubics only
    quadraticToCubic = true,

    // mostly a fallback if arc calculations fail      
    arcToCubic = false,
    cubicToArc = false,


    simplifyBezier = true,
    optimizeOrder = true,
    autoClose = true,
    removeZeroLength = true,
    refineClosing = true,
    removeColinear = true,
    flatBezierToLinetos = true,
    revertToQuadratics = true,

    refineExtremes = true,
    simplifyCorners = false,
    fixDirections = false,

    keepExtremes = true,
    keepCorners = true,
    keepInflections = false,
    addExtremes = false,
    addSemiExtremes = false,

    harmonizeCpts = false,
    toPolygon = false,
    removeOrphanSubpaths = false,
    simplifyRound = false,

    //svg path optimizations
    decimals = 3,
    autoAccuracy = true,

    minifyD = 0,
    tolerance = 1,

    lineToCubic = false,
    // return svg markup or object
    getObject = false,

} = {}) {


    // clamp tolerance and scale
    tolerance = Math.max(0.1, tolerance);

    let compression = 0;
    let report = {};
    let d = '';

    /**
     * normalize input
     * switch mode
     */


    /**
     * global bbox and viewBox for 
     * path scaling
     * sorting and cropping
    */
    let viewBox = { x: 0, y: 0, width: 0, height: 0 }
    let bb_global = { x: 0, y: 0, width: 0, height: 0 }
    let xArr = []
    let yArr = []

    // mode:0 – single path
    let inputType = detectInputType(input)
    if (inputType === 'pathDataString') {
        d = input
    } else if (inputType === 'polyString') {
        d = 'M' + input
    }
    else if (inputType === 'pathData') {
        d = input;
    }else{
        return false
    }


    /**
     * process all paths
     * try simplifications and removals
     */

    // SVG optimization options
    let pathOptions = {
        toRelative,
        toShorthands,
        decimals,
    }


    let pathData = parsePathDataNormalized(d, { quadraticToCubic, toAbsolute, arcToCubic });


    // count commands for evaluation
    let comCount = pathData.length

    if (removeOrphanSubpaths) pathData = removeOrphanedM(pathData);


    /**
     * get sub paths
     */
    let subPathArr = splitSubpaths(pathData);
    let lenSub = subPathArr.length;


    // reset array
    let pathDataPlusArr = []

    // loop sub paths
    for (let i = 0; i < lenSub; i++) {

        //let { pathData, bb } = subPathArr[i];
        let pathDataSub = subPathArr[i];


        // remove zero length linetos
        if (removeColinear || removeZeroLength) pathDataSub = removeZeroLengthLinetos(pathDataSub)


        // sort to top left
        if (optimizeOrder) pathDataSub = pathDataToTopLeft(pathDataSub);


        // Preprocessing: remove colinear - ignore flat beziers (removed later)
        if (removeColinear) pathDataSub = pathDataRemoveColinear(pathDataSub, { tolerance, flatBezierToLinetos: false });

        if (addExtremes || addSemiExtremes) pathDataSub = addExtremePoints(pathDataSub,
            { tMin, tMax, addExtremes, addSemiExtremes, angles: [30] })


        // analyze pathdata to add info about signicant properties such as extremes, corners
        let pathDataPlus = analyzePathData(pathDataSub, {
            detectSemiExtremes: addSemiExtremes,
        });


        // simplify beziers
        let { pathData, bb, dimA } = pathDataPlus;
        xArr.push(bb.x, bb.x + bb.width)
        yArr.push(bb.y, bb.y + bb.height)


        if (refineClosing) pathData = refineClosingCommand(pathData, { threshold: dimA * 0.001 })

        pathData = simplifyBezier ? simplifyPathDataCubic(pathData, { simplifyBezier, keepInflections, keepExtremes, keepCorners, revertToQuadratics, tolerance }) : pathData;


        // refine extremes
        if (refineExtremes) {
            //let thresholdEx = (bb.width + bb.height) / 2 * 0.05
            let thresholdEx = (bb.width + bb.height) * 0.05
            pathData = refineAdjacentExtremes(pathData, { threshold: thresholdEx, tolerance })
        }



        // post processing: remove flat beziers
        if (removeColinear && flatBezierToLinetos) {
            pathData = pathDataRemoveColinear(pathData, { tolerance, flatBezierToLinetos });
        }


        // refine corners
        if (simplifyCorners) {

            let threshold = (bb.width + bb.height) * 0.1
            pathData = refineRoundedCorners(pathData, { threshold, tolerance })
        }

        // refine round segment sequences
        if (simplifyRound) pathData = refineRoundSegments(pathData);


        // simplify to quadratics
        if (revertToQuadratics) pathData = pathDataRevertCubicToQuadratic(pathData, tolerance);

        if (lineToCubic) pathData = pathDataLineToCubic(pathData);


        // optimize close path
        if (optimizeOrder) pathData = optimizeClosePath(pathData, { autoClose })


        // update
        pathDataPlusArr.push({ pathData, bb })

    } // end sup paths

    // sort subpaths to top left
    let xMin = Math.min(...xArr)
    let yMin = Math.min(...yArr)
    let xMax = Math.max(...xArr)
    let yMax = Math.max(...yArr)

    bb_global = { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin }
    let isPortrait = bb_global.height > bb_global.width;


    // prefer top to bottom priority for portrait aspect ratios 
    if (optimizeOrder) {
        pathDataPlusArr = isPortrait ? pathDataPlusArr.sort((a, b) => a.bb.y - b.bb.y || a.bb.x - b.bb.x) : pathDataPlusArr.sort((a, b) => a.bb.x - b.bb.x || a.bb.y - b.bb.y)
    }


    // flatten compound paths 
    pathData = [];
    pathDataPlusArr.forEach(sub => {
        pathData.push(...sub.pathData)
    })


    if (autoAccuracy) {
        decimals = detectAccuracy(pathData)
        pathOptions.decimals = decimals
    }


    // optimize path data
    pathData = convertPathData(pathData, pathOptions)

    // remove zero-length segments introduced by rounding
    pathData = removeZeroLengthLinetos(pathData);

    let dOpt = pathDataToD(pathData, minifyD)

    // remove custom properties
    if(getObject){
        pathData = pathData.map(com=>{return {type:com.type, values:com.values}});
    }

    return !getObject ? dOpt : pathData;

}





