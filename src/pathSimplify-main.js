import { detectInputType } from './detect_input';
import { simplifyPathDataCubic } from './pathData_simplify_cubic';
import { getDistManhattan, getDistance, getPathDataVertices, getSquareDistance, interpolate, pointAtT, reducePoints, svgArcToCenterParam, toParametricAngle } from './svgii/geometry';
import { getPolyBBox } from './svgii/geometry_bbox';
import { analyzePathData, getPathDataVerbose } from './svgii/pathData_analyze';
import { normalizePathData, parsePathDataNormalized, convertPathData } from './svgii/pathData_convert';
import { shapeElToPath } from './svgii/pathData_parse_els';
import { pathDataRemoveColinear } from './svgii/pathData_remove_collinear';
import { removeOrphanedM } from './svgii/pathData_remove_orphaned';
import { removeZeroLengthLinetos } from './svgii/pathData_remove_zerolength';
import { optimizeClosePath, pathDataToTopLeft } from './svgii/pathData_reorder';
import { reversePathData } from './svgii/pathData_reverse';
import { addExtremePoints, splitSubpaths } from './svgii/pathData_split';
import { pathDataToD } from './svgii/pathData_stringify';
import { detectAccuracy, roundPathData, roundTo } from './svgii/rounding';
import { refineAdjacentExtremes } from './svgii/pathData_simplify_refineExtremes';
import { cleanUpSVG, removeEmptySVGEls } from './svgii/svg_cleanup';
import { refineRoundedCorners } from './svgii/pathData_simplify_refineCorners';
import { refineRoundSegments, simplifyAdjacentRound } from './svgii/pathData_simplify_refine_round';
import { refineClosingCommand } from './svgii/pathData_remove_short';
import { scalePathData } from './svgii/pathData_transform_scale';
import { getViewBox } from './svg_getViewbox';
import { pathDataRevertCubicToQuadratic } from './pathData_simplify_revertToquadratics';
import { pathDataCubicsToArc } from './pathData_simplify_cubicsToArcs';
import { harmonizeCubicCpts } from './pathData_simplify_harmonize_cpts';
import { pathDataToPolygonOpt } from './svgii/pathData_toPolygon';
import { pathDataLineToCubic } from './svgii/pathData_line_to_cubic';
import { fixPathDataDirections } from './svgii/pathData_fix_directions';
import { simplifyPolyChunks, getCurvePathData, simplifyPolygonToPathData } from './svgii/poly_to_pathdata';
import { pathDataFromPoly } from './svgii/pathData_fromPoly';
import { normalizePoly, polyPtsToArray } from './svgii/poly_normalize';
import { simplifyPolyRD } from './simplify_poly_radial_distance';
import { simplifyPolyRDP, simplifyPolyRDP__, simplifyRDP_rel } from './simplify_poly_RDP';
import { getEllipseLengthLG, getLegendreGaussValues, getLength, waArr_global } from './svgii/geometry_length';
import { deg2rad, dummySVG } from './constants';
import { getPathDataLength } from './svgii/pathData_getLength';
import { stringifySVG } from './string_helpers';
import { presetSettings, settingsDefaults } from './pathSimplify-presets';
import { splitCompundGroups } from './svgii/pathData_split_to_groups';
//import { getPolyChunks } from "./svgii/poly_analyze_get_chunks";


//import { installDOMPolyfills } from './dom-polyfill';

export function svgPathSimplify(input = '', settings = {}) {

    let preset = settings['preset'] !== undefined && settings['preset'] ? settings['preset'] : null;
    let defaults = preset && presetSettings[preset] !== undefined ? presetSettings[preset] : presetSettings['default'];


    // merge settings
    settings = {
        ...defaults,
        ...settings
    }


    let { getObject = false, removeComments, removeOffCanvas, unGroup, mergePaths, removeElements, removeDimensions, removeIds, removeClassNames, omitNamespace, cleanUpStrokes, addViewBox, addDimensions, removePrologue, removeHidden, removeUnused, cleanupDefs, cleanupClip, cleanupSVGAtts, removeNameSpaced, removeNameSpacedAtts, attributesToGroup, minifyRgbColors, stylesToAttributes, fixHref, legacyHref, allowMeta, allowDataAtts, allowAriaAtts, removeSVGAttributes, removeElAttributes, shapesToPaths, shapeConvert, convertShapes, simplifyBezier, optimizeOrder, autoClose, removeZeroLength, refineClosing, removeColinear, flatBezierToLinetos, revertToQuadratics, refineExtremes, simplifyCorners, fixDirections, keepExtremes, keepCorners, keepInflections, addExtremes, reversePath, toAbsolute, toRelative, toMixed, toShorthands, toLonghands, quadraticToCubic, arcToCubic, cubicToArc, lineToCubic, decimals, autoAccuracy, minifyD, tolerance, toPolygon, smoothPoly, polyFormat, precisionPoly, simplifyRD, simplifyRDP, harmonizeCpts, removeOrphanSubpaths, simplifyRound, simplifyQuadraticCorners, scale, scaleTo, crop, alignToOrigin, convertTransforms, keepSmaller, splitCompound, convertPathLength, toAbsoluteUnits } = settings;

    //toAbsolute = !toRelative;

    // clamp tolerance and scale
    tolerance = Math.max(0.1, tolerance);
    scale = Math.max(0.001, scale)
    if (fixDirections) keepSmaller = false;
    if (scale !== 1 || scaleTo || crop || alignToOrigin) {
        convertTransforms = true;
        settings.convertTransforms = true
    }


    /**
     * intercept 
     * invalid inputs
     */

    let inputDetection = detectInputType(input);
    let { inputType, log } = inputDetection

    // invalid file
    if (inputType === 'invalid' || input === dummySVG) {
        // return dummy SVG to continue processing
        //input = dummySVG;
        //inputType = 'invalid';

        //console.warn(`Input is not valid!\n  ${log}`);
        //console.log(input);
        //return false

        let report = {
            original: 0,
            new: 0,
            saved: 0,
            svgSize:0,
            svgSizeOpt:0,
            compression:0,
            decimals:0,
            invalid:true
        }

        return { svg: dummySVG, d: '', polys: [], report, pathDataPlusArr: [], pathDataPlusArr_global: [], inputType: 'invalid', dOriginal: '' };

    }


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
    let paths = [];
    let isPoly = false;
    let polys = [];
    let poly = [];
    let dStr = '';
    let dOriginal = '';

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
    //console.log(inputType);

    // validate point JSON
    if (inputType === 'json') {
        let pts = [];
        let needsQuotes = /([{,]\s*)(x|y)(\s*:)/.test(input)
        if (needsQuotes) input = input.replaceAll('x:', '"x":').replaceAll('y:', '"y":')

        try {
            pts = JSON.parse(input)
        } catch {
            console.warn('No valid JSON');
        }
        if (pts.length) {
            inputType = 'polyArray'
            input = normalizePoly(pts);
            isPoly = true;
        }
    }

    //console.log('inputType', inputType);


    // single path or polys
    if (inputType !== 'svgMarkup' && inputType !== 'symbol') {
        if (inputType === 'pathDataString') {
            d = input
        } else if (inputType === 'polyString') {
            splitCompound = false;
            isPoly = true;
            poly = normalizePoly(input)
            d = pathDataFromPoly(poly, closed)
            //console.log(poly);

        }

        else if (inputType === 'polyArray' || inputType === 'polyObjectArray' || inputType === 'polyComplexArray' || inputType === 'polyComplexObjectArray') {
            splitCompound = false;

            // normalize poly input to object array
            poly = normalizePoly(input)

            // convert to pathdata
            let closed = true;

            isPoly = true;
            //polys.push(poly)

            // calculate size
            d = pathDataFromPoly(poly, closed)
            dStr = d.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
            dOriginal = dStr;
            svgSize = dStr.length;

            /*
            d=''
            dOriginal = '';
            svgSize = input.length;
            */

        }

        else if (inputType === 'pathData') {
            d = input;

            // stringify to compare lengths
            dStr = Array.from(d).map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
            svgSize = dStr.length;
            isPoly = false;

        }
        // not valid - set dummy path data
        else {
            d = 'M0 0 h0'
        }

        paths.push({ d, el: null })
    }

    // mode:1 – process complete svg DOM
    else {


        // convert symbol temporarily to SVG
        if (inputType === 'symbol') {
            input = input.replaceAll('<symbol', '<svg').replaceAll('</symbol', '</svg')
            // ids are mandatory for symbols
            removeIds = false
            removeDimensions = true
        }

        // convert all shapes to paths
        if (shapesToPaths) {
            shapeConvert = 'toPaths'
            convertShapes = ['rect', 'polygon', 'polyline', 'line', 'circle', 'ellipse']
        }

        //console.log('shapesToPaths', shapesToPaths, 'shapeConvert', shapeConvert, convert_rects, convert_ellipses, convert_poly);

        // sanitize SVG - clone/decouple settings
        let svgPropObject = cleanUpSVG(input, JSON.parse(JSON.stringify(settings)));

        //console.log('settings', settings);
        //console.log('svgPropObject', svgPropObject);

        let { svgElProps } = svgPropObject
        svg = svgPropObject.svg;
        //console.log(svgPropObject);


        // collect paths
        let pathEls = svg.querySelectorAll('path')
        //let pathEls2 = svg.getElementsByTagName('path')
        //console.log(pathEls);

        pathEls.forEach((path, i) => {
            let d = path.getAttribute('d');
            //console.log(d, path.nodeName, path.id);
            paths.push({ d, el: path, idx: i })
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
        toMixed,
        toShorthands,
        decimals,
    }
    //console.log('pathOptions', pathOptions);

    let comCount = 0
    let comCountS = 0


    for (let i = 0, l = paths.length; l && i < l; i++) {

        let pathDataPlusArr = []
        let path = paths[i];
        let { d, el } = path;
        let dN = ''
        let isPoly = false;

        // if polygon we already heave absolute coordinates
        //let isPolyPath = !mode && isPoly && Array.isArray(d)
        //let pathData = !isPolyPath ? parsePathDataNormalized(d, { quadraticToCubic, arcToCubic }) : d;
        let pathData = parsePathDataNormalized(d, { quadraticToCubic, arcToCubic });
        //console.log('!!!pathData', pathData, arcToCubic);
        //console.log(isPoly);

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
        comCount += pathData.length

        if (!isPoly && removeOrphanSubpaths) pathData = removeOrphanedM(pathData);



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
            isPoly = !(/[acqts]/gi).test(coms)
            let closed = isPoly ? true : false;

            if (isPoly && !mode) {

                poly = getPathDataVertices(pathDataSub);
                let bb = getPolyBBox(reducePoints(poly, 64))
                //console.log(poly, bb);

                // simplify polygon
                if (simplifyRD > 0) {
                    poly = simplifyPolyRD(poly, { quality: simplifyRD, width: bb.width, height: bb.height })
                }

                if (simplifyRDP > 0) {
                    poly = simplifyPolyRDP(poly, { quality: simplifyRDP, width: bb.width, height: bb.height })
                    //poly = simplifyRDP_rel(poly, simplifyRDP, bb.width, bb.height)
                }

                toPolygon = false;
                pathDataSub = pathDataFromPoly(poly, closed)
                //pathDataSub[0].bb = bb
            }


            /**
             * convert curves to polygon
             * flattening
             */
            else if (toPolygon) {
                simplifyBezier = false
                smoothPoly = false;
                harmonizeCpts = false;

                pathDataSub = getPathDataVerbose(pathDataSub);

                let polyData = pathDataToPolygonOpt(pathDataSub, {
                    precisionPoly,
                    autoAccuracy,
                    //polyFormat,
                    //decimals,
                    simplifyRD,
                    simplifyRDP
                })

                //console.log('toPolygon');
                //polys.push(polyData.poly)
                pathDataSub = polyData.pathData
                isPoly = true;

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

                    //console.log('smooth');
                    pathDataSub = simplifyPolygonToPathData(poly, optionsPoly)
                    // flag as non poly as we're smoothing to curves
                    //isPoly = false
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
            if (addExtremes) pathDataSub = addExtremePoints(pathDataSub,
                { tMin, tMax, addExtremes, angles: [30] })



            // reverse
            if (reversePath) {
                pathDataSub = reversePathData(pathDataSub)
            }

            // analyze pathdata to add info about significant properties such as extremes, corners
            let pathDataPlus = { bb: {}, dimA: 0, pathData: [] }

            if (!isPoly) {
                pathDataPlus = analyzePathData(pathDataSub);
            }
            // we skip detailed analysis for native polygons
            else {
                if (!poly.length) {
                    let pathDataCubic = convertPathData(JSON.parse(JSON.stringify(pathDataSub)), { toLonghands: true, toAbsolute: true, arcToCubic: true, testTypes: true })
                    pathDataPlus.bb = getPolyBBox(getPathDataVertices(pathDataCubic))
                }
                pathDataPlus.dimA = pathDataPlus.bb.width + pathDataPlus.bb.height;
                pathDataPlus.pathData = getPathDataVerbose(pathDataSub, {
                    addSquareLength: false,
                    addArea: false,
                    addAverageDim: false
                })
            }



            // simplify beziers
            let { pathData, bb, dimA } = pathDataPlus;

            xArr.push(bb.x, bb.x + bb.width)
            yArr.push(bb.y, bb.y + bb.height)


            if (refineClosing) pathData = refineClosingCommand(pathData, { threshold: dimA * 0.001 })

            pathData = simplifyBezier ? simplifyPathDataCubic(pathData, { simplifyBezier, keepInflections, keepExtremes, keepCorners, revertToQuadratics, tolerance }) : pathData;


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
                pathData = refineRoundedCorners(pathData, { threshold, tolerance, simplifyQuadraticCorners })
            }

            // refine round segment sequences
            if (simplifyRound) {
                pathData = refineRoundSegments(pathData);
                pathData = simplifyAdjacentRound(pathData);
            }

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


        // fix path directions - before reordering
        if (fixDirections) {
            pathDataPlusArr = fixPathDataDirections(pathDataPlusArr);
        }


        // prefer top to bottom priority for portrait aspect ratios 
        if (optimizeOrder) {
            /*
            pathDataPlusArr = isPortrait ? pathDataPlusArr.sort((a, b) => a.bb.y - b.bb.y || a.bb.x - b.bb.x) : pathDataPlusArr.sort((a, b) => a.bb.x - b.bb.x || a.bb.y - b.bb.y)
            */

            // add  missin bbox
            pathDataPlusArr.forEach(p => {
                if (p.bb.x === undefined) {
                    p.bb = getPolyBBox(getPathDataVertices(p.pathData))
                }
            })

            try {
                pathDataPlusArr = pathDataPlusArr.sort((a, b) => +a.bb.x.toFixed(2) - (+b.bb.x.toFixed(2)) || a.bb.y - b.bb.y);
                //console.log(pathDataPlusArr);

            } catch {
            }


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

        // add simplified poly - if not populated by toPoly conversion
        if (isPoly) {
            //console.log('5. isPoly', isPoly);

            pathDataPlusArr.forEach(sub => {
                let poly = getPathDataVertices(sub.pathData, false, decimals)
                if (polyFormat === 'array') {
                    poly = polyPtsToArray(poly)
                }
                polys.push(poly)
            })

        }


        // split into sub paths - returns svg with multiple paths
        if (splitCompound && !mode && pathDataPlusArr.length > 1) {
            let pathDataSplit = splitCompundGroups(pathDataPlusArr, { toRelative, toShorthands, decimals, addDimensions });
            svg = new DOMParser().parseFromString(pathDataSplit.svg, 'image/svg+xml').querySelector('svg');
            // switch output type
            mode = 1;
            inputType = 'splitPath'
        }


        // clone pathdata 
        pathData = JSON.parse(JSON.stringify(pathData));

        // optimize path data
        pathData = convertPathData(pathData, pathOptions)

        // remove zero-length segments introduced by rounding
        if (removeZeroLength) pathData = removeZeroLengthLinetos(pathData);

        // realign path to zero origin
        if (alignToOrigin) {

            pathData[0].values[0] = roundTo((pathData[0].values[0] - bb_global.x), decimals)
            pathData[0].values[1] = roundTo((pathData[0].values[1] - bb_global.y), decimals)

            bb_global.x = 0
            bb_global.y = 0
        }


        // compare command count
        comCountS += pathData.length

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

        // apply new path for svgs
        if (el) {
            el.setAttribute('d', dOpt)
        }


    } // end path array

    /**
     *  stringify new SVG
     */
    if (mode || inputType === 'symbol') {

        //console.log('process', inputType);

        // adjust viewBox and width for scale
        if (scale) {
            let { x, y, width, height, w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit } = viewBox;
            if (crop) {
                x = bb_global.x
                y = bb_global.y
                width = bb_global.width
                height = bb_global.height
                w = width;
                h = height;
            }

            if (hasViewBox) {
                svg.setAttribute('viewBox', [x, y, width, height].map(val => roundTo(val * scale, decimals)).join(' '))
            }
            if (hasWidth) {
                svg.setAttribute('width', roundTo(w * scale, decimals) + widthUnit)
            }

            if (hasHeight) {
                svg.setAttribute('height', roundTo(h * scale, decimals) + heightUnit)
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

        //console.log(svg);
        if (removeSVGAttributes.includes('xmlns')) omitNamespace = true;


        svg = stringifySVG(svg, { omitNamespace, removeComments, format: minifyD });
        //console.log('!!!svg', svg);

        //svgSizeOpt = new Blob([svg]).size
        svgSizeOpt = svg.length;
        //compression = +(100/svgSize * (svgSize-svgSizeOpt)).toFixed(2)
        compression = +(100 / svgSize * (svgSizeOpt)).toFixed(2)

        svgSize = +(svgSize / 1024).toFixed(3)
        svgSizeOpt = +(svgSizeOpt / 1024).toFixed(3)


        report = {
            original: comCount,
            new: comCountS,
            saved: comCount - comCountS,
            svgSize,
            svgSizeOpt,
            compression,
            decimals,
        }

        if (keepSmaller && svgSize < svgSizeOpt && !splitCompound) {
            //console.log('Original is smaller!');
            svg = input
            report.node = 'Original is smaller!'
        }



    } else {
        ({ d, report } = paths[0]);
    }

    if (polys.length && polys.length === 1) {
        polys = polys[0]
    }


    //console.log('---simplify', input);
    //console.log('5. svg', svg);

    if (polyFormat === 'string' && polys.length) {
        polys = polys.flat().map(pt => `${pt.x},${pt.y}`).join(' ')
    }


    return !getObject ? (d ? d : svg) : { svg, d, polys, report, pathDataPlusArr: pathDataPlusArr_global, inputType, dOriginal };

}





