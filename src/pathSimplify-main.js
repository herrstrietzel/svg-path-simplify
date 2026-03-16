import { detectInputType } from './detect_input';
import { simplifyPathDataCubic } from './pathData_simplify_cubic';
import { getDistManhattan, getDistance, getPathDataVertices, interpolate, pointAtT } from './svgii/geometry';
import { getPolyBBox } from './svgii/geometry_bbox';
import { analyzePathData } from './svgii/pathData_analyze';
import { normalizePathData, parsePathDataNormalized, convertPathData } from './svgii/pathData_convert';
import { shapeElToPath } from './svgii/pathData_parse_els';
import { pathDataRemoveColinear } from './svgii/pathData_remove_collinear';
import { removeOrphanedM } from './svgii/pathData_remove_orphaned';
import { removeZeroLengthLinetos } from './svgii/pathData_remove_zerolength';
import { optimizeClosePath, pathDataToTopLeft } from './svgii/pathData_reorder';
import { reversePathData } from './svgii/pathData_reverse';
import { addExtremePoints, splitSubpaths } from './svgii/pathData_split';
import { pathDataToD } from './svgii/pathData_stringify';
import { detectAccuracy, roundPathData } from './svgii/rounding';
import { refineAdjacentExtremes } from './svgii/pathData_simplify_refineExtremes';
import { cleanUpSVG, removeEmptySVGEls, stringifySVG } from './svgii/svg_cleanup';
import { refineRoundedCorners } from './svgii/pathData_simplify_refineCorners';
import { refineRoundSegments } from './svgii/pathData_refine_round';
import { refineClosingCommand } from './svgii/pathData_remove_short';
import { scalePathData } from './svgii/pathData_transform_scale';
import { getViewBox } from './svg_getViewbox';
import { pathDataRevertCubicToQuadratic } from './pathData_simplify_revertToquadratics';
import { pathDataCubicsToArc } from './pathData_simplify_cubicsToArcs';
import { harmonizeCubicCpts } from './pathData_simplify_harmonize_cpts';
import { pathDataToPolygon } from './svgii/pathData_toPolygon';
import { pathDataLineToCubic } from './svgii/pathData_line_to_cubic';
import { fixPathDataDirections } from './svgii/pathData_fix_directions';
import { simplifyPolyChunks, getCurvePathData, simplifyPolygonToPathData } from './svgii/poly_to_pathdata';
import { pathDataFromPoly } from './svgii/pathData_fromPoly';
import { normalizePoly } from './svgii/poly_normalize';
import { simplifyPolyRD } from './simplify_poly_radial_distance';
import { simplifyPolyRDP } from './simplify_poly_RDP';
//import { getPolyChunks } from "./svgii/poly_analyze_get_chunks";


//import { installDOMPolyfills } from './dom-polyfill';

export function svgPathSimplify(input = '', {

    // return svg markup or object
    getObject = false,

    toAbsolute = false,
    toRelative = true,
    toShorthands = true,
    toLonghands = false,

    //optimize = 0,

    // not necessary unless you need cubics only
    quadraticToCubic = true,

    // mostly a fallback if arc calculations fail      
    arcToCubic = false,
    cubicToArc = false,


    simplifyBezier = true,
    optimizeOrder = true,
    autoClose = false,
    removeZeroLength = true,
    refineClosing = true,
    removeColinear = true,
    flatBezierToLinetos = true,
    revertToQuadratics = true,

    refineExtremes = true,
    simplifyCorners = false,
    removeDimensions = false,
    removeIds = false,
    removeClassNames = false,
    omitNamespace = false,

    fixDirections = false,

    keepExtremes = true,
    keepCorners = true,
    extrapolateDominant = true,
    keepInflections = false,
    addExtremes = false,
    addSemiExtremes = false,

    toPolygon = false,
    smoothPoly = false,
    polyFormat = 'points',
    precisionPoly = 1,

    simplifyRD = 1,
    simplifyRDP = 1,

    harmonizeCpts = false,

    removeOrphanSubpaths = false,
    simplifyRound = false,

    //svg scaling
    scale = 1,
    scaleTo = 0,
    crop = false,
    alignToOrigin = false,

    // flatten transforms
    convertTransforms = false,



    //svg path optimizations
    decimals = 3,
    autoAccuracy = true,

    // experimental
    //roundSub = false,

    minifyD = 0,
    tolerance = 1,
    reversePath = false,

    //svg cleanup options
    minifyRgbColors = false,
    removePrologue = true,
    removeHidden = true,
    removeUnused = true,
    cleanupDefs = true,
    cleanupClip = true,
    cleanupSVGAtts = true,

    stylesToAttributes = false,
    fixHref = false,
    legacyHref = false,
    removeNameSpaced = true,

    //attributesToGroup = false,
    removeOffCanvas = false,
    unGroup = false,
    mergePaths = false,

    // shape conversions
    shapesToPaths = false,


    //toPaths || toShapes
    shapeConvert = 0,
    convert_rects = false,
    convert_ellipses = false,
    convert_poly = false,
    convert_lines = false,



    lineToCubic = false,
    cleanUpStrokes = true,
    addViewBox = false,
    addDimensions = false,

    removeComments = true,

} = {}) {


    // clamp tolerance and scale
    tolerance = Math.max(0.1, tolerance);
    scale = Math.max(0.001, scale)

    let inputType = detectInputType(input);
    let svg = '';
    let svgSize = 0;
    let svgSizeOpt = 0;
    let compression = 0;
    let report = {};
    let d = '';
    let mode = inputType === 'svgMarkup' ? 1 : 0;
    //console.log('inputType', inputType);

    // pathdata superset array - containing additional data
    let pathDataPlusArr_global = []
    let paths = []
    let polys = []
    let dStr = '';

    /**
     * normalize input
     * switch mode
     */

    // original size
    svgSize = input.length;


    /**
     * global bbox and viewBox for 
     * path scaling
     * sorting and cropping
    */
    let viewBox = { x: 0, y: 0, width: 0, height: 0 }
    let bb_global = { x: 0, y: 0, width: 0, height: 0 }
    let xArr = []
    let yArr = []

    arcToCubic = toPolygon ? true : arcToCubic;
    autoClose = false;
    let accuracyArr = []


    //console.log('inputType', inputType);

    // single path or polys
    if (inputType !== 'svgMarkup') {
        if (inputType === 'pathDataString') {
            d = input
        } else if (inputType === 'polyString') {
            d = 'M' + input
        }

        else if (inputType === 'polyArray' || inputType === 'polyObjectArray' || inputType === 'polyComplexArray' || inputType === 'polyComplexObjectArray') {

            // normalize poly input to object array
            let poly = normalizePoly(input)

            // convert to pathdata
            d = pathDataFromPoly(poly)

            // calculate size
            dStr = d.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
            svgSize = dStr.length;
        }

        else if (inputType === 'pathData') {
            d = input;

            // stringify to compare lengths
            dStr = Array.from(d).map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
            svgSize = dStr.length;
        }

        paths.push({ d, el: null })
    }

    // mode:1 – process complete svg DOM
    else {

        // convert all shapes to paths
        if (shapesToPaths) {
            shapeConvert = true
            convert_rects = true
            convert_ellipses = true
            convert_poly = true
            convert_lines = true
        }

        //sanitize
        let svgPropObject = cleanUpSVG(input, {
            removeIds, removeClassNames, removeDimensions, cleanupSVGAtts, cleanUpStrokes, removeHidden, removeUnused, removeNameSpaced, stylesToAttributes, removePrologue, fixHref, mergePaths, convertTransforms, legacyHref, cleanupDefs, cleanupClip, addViewBox, removeOffCanvas, addDimensions,
            shapeConvert, convert_rects, convert_ellipses, convert_poly, convert_lines, minifyRgbColors, unGroup, convertTransforms
        }
        );

        let { svgElProps } = svgPropObject
        svg = svgPropObject.svg;



        // collect paths
        let pathEls = svg.querySelectorAll('path')
        //let pathEls2 = svg.getElementsByTagName('path')
        //console.log(pathEls2);

        pathEls.forEach((path, i) => {
            paths.push({ d: path.getAttribute('d'), el: path, idx: i })
        })


        // get viewBox/dimensions
        viewBox = getViewBox(svg, decimals)

    }



    /**
     * process all paths
     * try simplifications and removals
     */

    // SVG optimization options
    let pathOptions = {
        toRelative,
        toAbsolute,
        toLonghands,
        toShorthands,
        decimals,
    }

    // combinded path data for SVGs with mergePaths enabled
    let pathData_merged = [];


    for (let i = 0, l = paths.length; l && i < l; i++) {

        let pathDataPlusArr = []
        let path = paths[i];
        let { d, el } = path;
        let dN = ''


        let pathData = parsePathDataNormalized(d, { quadraticToCubic, arcToCubic });
        //console.log('!!!pathData', pathData, arcToCubic);

        // get polygon bbox
        let bb_poly = smoothPoly || toPolygon ? getPolyBBox(getPathDataVertices(pathData)) : null

        // scale pathdata and viewBox
        if (scale !== 1 || scaleTo) {

            // get bbox of viewBox for scaling
            if (scaleTo) {

                if (viewBox.width && !crop) {
                    scale = scaleTo / viewBox.width;

                } else {

                    // convert arcs to cubics, add extreme to get precise bounding box
                    let pathDataExtr = pathData.map(com => { return { type: com.type, values: com.values } })
                    pathDataExtr = convertPathData(pathDataExtr, { arcToCubic: true })
                    pathDataExtr = addExtremePoints(pathDataExtr);

                    let poly = getPathDataVertices(pathDataExtr)
                    let bb = getPolyBBox(poly);
                    xArr.push(bb.x, bb.x + bb.width)
                    yArr.push(bb.y, bb.y + bb.height)


                    let scaleW = scaleTo / bb.width
                    scale = scaleW;
                }
            }

            //console.log('scale', scale, scaleTo);
            pathData = scalePathData(pathData, scale)
        }

        // count commands for evaluation
        let comCount = pathData.length

        if (removeOrphanSubpaths) pathData = removeOrphanedM(pathData);


        /**
         * get sub paths
         */
        let subPathArr = splitSubpaths(pathData);
        let lenSub = subPathArr.length;

        //console.log('subPathArr', subPathArr);


        // loop sub paths
        for (let i = 0; i < lenSub; i++) {

            //let { pathData, bb } = subPathArr[i];
            let pathDataSub = subPathArr[i];
            let poly = []

            let coms = Array.from(new Set(pathDataSub.map(com => com.type))).join('')
            let isPoly = !(/[acqts]/gi).test(coms)
            let closed = (/[z]/gi).test(coms)

            if (isPoly) {

                poly = getPathDataVertices(pathDataSub);
                //console.log(poly);

                // simplify polygon
                if (simplifyRD > 0) {
                    poly = simplifyPolyRD(poly, { quality: simplifyRD + 'px' })
                }

                if (simplifyRDP > 0) {
                    poly = simplifyPolyRDP(poly, { quality: simplifyRDP + 'px' })
                }

                pathDataSub = pathDataFromPoly(poly, closed)

            }


            /**
             * convert curves to polygon
             * flattening
             */
            else if (toPolygon) {
                simplifyBezier = false
                smoothPoly = false;
                harmonizeCpts = false;

                //pathDataSub = normalizePathData(pathDataSub, {arcToCubic:true})
                //console.log(pathDataSub);

                let pathDataSubPlus = analyzePathData(pathDataSub)
                let { bb, pathData } = pathDataSubPlus;
                pathDataSub = pathData;


                let polyData = pathDataToPolygon(pathDataSub, {
                    precisionPoly,
                    autoAccuracy,
                    polyFormat,
                    decimals,
                    simplifyRD,
                    simplifyRDP
                })



                //poly.push(polyData.poly)
                polys.push(polyData.poly)
                pathDataSub = polyData.pathData

            }



            /**
             * poly to beziers via
             * Philip J. Schneider's 
             * "Algorithm for Automatically Fitting Digitized Curves"
             */
            if (smoothPoly) {
                //flatBezierToLinetos=false

                if (isPoly) {
                    pathDataSub = removeZeroLengthLinetos(pathDataSub)
                    let poly = getPathDataVertices(pathDataSub)

                    // options for poly simplification
                    let optionsPoly = {
                        denoise: 0.8,
                        tolerance,
                        width: bb_poly.width,
                        height: bb_poly.height,
                        manhattan: false,
                        absolute: false,
                        keepCorners,
                        keepExtremes,
                        keepInflections,
                        closed,
                        simplifyRD,
                        simplifyRDP,
                    }
                    pathDataSub = simplifyPolygonToPathData(poly, optionsPoly)
                }
            }



            // harmonize cpts
            // if (harmonizeCpts) pathDataSub = harmonizeCubicCpts(pathDataSub)


            // remove zero length linetos
            if (removeColinear || removeZeroLength) pathDataSub = removeZeroLengthLinetos(pathDataSub)



            // sort to top left
            if (optimizeOrder) pathDataSub = pathDataToTopLeft(pathDataSub);


            // Preprocessing: remove colinear - ignore flat beziers (removed later)
            if (removeColinear) pathDataSub = pathDataRemoveColinear(pathDataSub, { tolerance, flatBezierToLinetos: false });

            let tMin = 0, tMax = 1;
            if (addExtremes || addSemiExtremes) pathDataSub = addExtremePoints(pathDataSub,
                { tMin, tMax, addExtremes, addSemiExtremes, angles: [30] })



            // reverse
            if (reversePath) {
                pathDataSub = reversePathData(pathDataSub)
            }


            // analyze pathdata to add info about signicant properties such as extremes, corners
            let pathDataPlus = analyzePathData(pathDataSub, {
                detectSemiExtremes: addSemiExtremes,
            });


            // simplify beziers
            let { pathData, bb, dimA } = pathDataPlus;
            xArr.push(bb.x, bb.x + bb.width)
            yArr.push(bb.y, bb.y + bb.height)


            if (refineClosing) pathData = refineClosingCommand(pathData, { threshold: dimA * 0.001 })


            pathData = simplifyBezier ? simplifyPathDataCubic(pathData, { simplifyBezier, keepInflections, keepExtremes, keepCorners, extrapolateDominant, revertToQuadratics, tolerance }) : pathData;


            // refine extremes
            if (refineExtremes) {
                let thresholdEx = (bb.width + bb.height) * 0.05
                pathData = refineAdjacentExtremes(pathData, { threshold: thresholdEx, tolerance })
            }


            // cubic to arcs
            if (!arcToCubic && cubicToArc) pathData = pathDataCubicsToArc(pathData, { areaThreshold: 2.5 })


            // post processing: remove flat beziers
            if (removeColinear && flatBezierToLinetos) {
                pathData = pathDataRemoveColinear(pathData, { tolerance, flatBezierToLinetos });
            }


            // refine corners
            if (simplifyCorners) {
                //pathData = removeZeroLengthLinetos(pathData);

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


            // sub path rounding
            if (autoAccuracy) {
                //let decimalsSub = Math.max(2, detectAccuracy(pathData));
                let decimalsSub = detectAccuracy(pathData);
                accuracyArr.push(decimalsSub);
                //let decimalsSub = detectAccuracy(pathData);

                // pre round sub path
                //if(roundSub) pathData = roundPathData(pathData, decimalsSub);

            }

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

        //console.log(xMin, xMax, 'y:', yMin, yMax, 'bb_global', bb_global);
        //console.log(i, pathDataPlusArr);



        // prefer top to bottom priority for portrait aspect ratios 
        if (optimizeOrder) {
            pathDataPlusArr = isPortrait ? pathDataPlusArr.sort((a, b) => a.bb.y - b.bb.y || a.bb.x - b.bb.x) : pathDataPlusArr.sort((a, b) => a.bb.x - b.bb.x || a.bb.y - b.bb.y)
        }


        // fix path directions
        if (fixDirections) {
            pathDataPlusArr = fixPathDataDirections(pathDataPlusArr);
        }



        // flatten compound paths 
        pathData = [];

        // add to global array - including multiple path elements
        pathDataPlusArr_global.push(pathDataPlusArr);

        pathDataPlusArr.forEach(sub => {
            pathData.push(...sub.pathData)
        })


        if (autoAccuracy) {
            accuracyArr = accuracyArr.sort().reverse();
            let decimalsMid = accuracyArr[Math.floor(accuracyArr.length * 0.5)]
            decimals = Math.floor((accuracyArr[0] + decimalsMid) * 0.5)
            //decimals = detectAccuracy(pathData)
            //console.log('decimals', decimals, 'decimalsMid', decimalsMid, accuracyArr);
            pathOptions.decimals = decimals
        }


        // collect for merged svg paths 
        mergePaths = false
        if (el && mergePaths) {
            pathData_merged.push(...pathData)
        }
        // single output
        else {

            // clone pathdata 
            //pathData = pathData.map(com => ({ type: com.type, values: [...com.values] }));
            pathData = JSON.parse(JSON.stringify(pathData));

            // optimize path data
            pathData = convertPathData(pathData, pathOptions)

            // remove zero-length segments introduced by rounding
            if (removeZeroLength) pathData = removeZeroLengthLinetos(pathData);

            // realign path to zero origin
            if (alignToOrigin) {

                pathData[0].values[0] = (pathData[0].values[0] - bb_global.x).toFixed(decimals)
                pathData[0].values[1] = (pathData[0].values[1] - bb_global.y).toFixed(decimals)

                bb_global.x = 0
                bb_global.y = 0
            }


            // compare command count
            let comCountS = pathData.length

            let dOpt = pathDataToD(pathData, minifyD)
            //svgSizeOpt = new Blob([dOpt]).size;
            svgSizeOpt = dOpt.length

            compression = +(100 / svgSize * (svgSizeOpt)).toFixed(2)

            path.d = dOpt
            path.report = {
                original: comCount,
                new: comCountS,
                saved: comCount - comCountS,
                compression,
                decimals,
                //success: comCountS < comCount
            }

            //console.log('el', el);
            // apply new path for svgs
            if (el) {
                el.setAttribute('d', dOpt)
            }
        }

    } // end path array

    /**
     *  stringify new SVG
     */
    if (mode) {

        //console.log(pathData_merged);
        if (pathData_merged.length) {

            // optimize path data
            let pathData = convertPathData(pathData_merged, pathOptions)

            // remove zero-length segments introduced by rounding
            pathData = removeZeroLengthLinetos(pathData);

            let dOpt = pathDataToD(pathData, minifyD)

            // apply new path for svgs
            paths[0].el.setAttribute('d', dOpt)

            // remove other paths
            for (let i = 1; i < paths.length; i++) {
                let pathEl = paths[i].el
                if (pathEl) pathEl.remove()
            }

            // remove empty groups e.g groups
            removeEmptySVGEls(svg);
        }

        // adjust viewBox and width for scale
        if (scale) {

            let { x, y, width, height, w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit } = viewBox;
            //console.log('bb_global', bb_global);

            if (crop) {
                x = bb_global.x
                y = bb_global.y
                width = bb_global.width
                height = bb_global.height
                w = width;
                h = height;
            }

            if (hasViewBox) {
                svg.setAttribute('viewBox', [x, y, width, height].map(val => +(val * scale).toFixed(decimals)).join(' '))
            }
            if (hasWidth) {
                svg.setAttribute('width', +(w * scale).toFixed(decimals) + widthUnit)
            }

            if (hasHeight) {
                svg.setAttribute('height', +(h * scale).toFixed(decimals) + heightUnit)
            }
        }

        // remove fill rules
        if (fixDirections) {
            let elsFill = svg.querySelectorAll('path[fill-rule], path[clip-rule]');
            elsFill.forEach(el => {
                el.removeAttribute('fill-rule')
                el.removeAttribute('clip-rule')
            })
        }


        svg = stringifySVG(svg, { omitNamespace, removeComments });


        //svgSizeOpt = new Blob([svg]).size
        svgSizeOpt = svg.length;
        //compression = +(100/svgSize * (svgSize-svgSizeOpt)).toFixed(2)
        compression = +(100 / svgSize * (svgSizeOpt)).toFixed(2)

        svgSize = +(svgSize / 1024).toFixed(3)
        svgSizeOpt = +(svgSizeOpt / 1024).toFixed(3)

        report = {
            svgSize,
            svgSizeOpt,
            compression,
            decimals
        }

    } else {
        ({ d, report } = paths[0]);
    }

    if (polys.length && polys.length === 1) {
        polys = polys[0]
    }

    return !getObject ? (d ? d : svg) : { svg, d, polys, report, pathDataPlusArr: pathDataPlusArr_global, inputType };

}





