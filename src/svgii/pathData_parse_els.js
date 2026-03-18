//import { pathDataToAbsoluteOrRelative, pathDataToLonghands, cubicToArc } from './pathData_convert.js';
import { svgNs } from '../constants.js';
import { pathDataCubicsToArc } from '../pathData_simplify_cubicsToArcs.js';
import { getElementAtts } from '../svg-getAttributes.js';
import { getViewBox } from '../svg_getViewbox.js';
import { getRootSvg } from '../svg_rootSVG.js';
import { svgElUnitsToPixel } from './convert_units.js';
import { getPathDataVertices } from './geometry.js';
import { getPolygonArea } from './geometry_area.js';
import { getPolyBBox } from './geometry_bbox.js';
import { getPathDataVerbose } from './pathData_analyze.js';
import { parsePathDataNormalized } from './pathData_convert.js';
import { parsePathDataString, stringifyPathData } from './pathData_parse.js';
import { transformPathData } from './pathData_transform.js';
import { autoRound, roundTo } from './rounding.js';
import { attLookup } from './svg-styles-to-attributes-const.js';
import { qrDecomposeMatrix } from './transform_qr_decompose.js';


export function shapeElToPath(el, { width = 0,
    height = 0,
    convert_rects = false,
    convert_ellipses = false,
    convert_poly = false,
    convert_lines = false,
    //matrix={a:1, b:0, c:0, d:1, e:0, f:0},
    matrix=null

} = {}) {

    let nodeName = el.nodeName.toLowerCase();
    //console.log('shapeElToPath', nodeName);


    if (
        nodeName === 'path' && !matrix ||
        nodeName === 'rect' && !convert_rects ||
        (nodeName === 'circle' || nodeName === 'ellipse') && !convert_ellipses ||
        (nodeName === 'polygon' || nodeName === 'polyline') && !convert_poly ||
        (nodeName === 'line') && !convert_lines
    ) return el;


    let pathData = getPathDataFromEl(el, { width, height });

    // shape attributes – obsolete for path els
    let exclude = ['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'dx', 'dy', 'r', 'rx', 'ry', 'width', 'height', 'points'];

    // transform pathData
    if(matrix && Object.values(matrix).join('')!=='100100'){
        pathData = transformPathData(pathData, matrix)
        exclude.push('transform', 'transform-origin')
    }

    let d = pathData.map(com => { return `${com.type} ${com.values} ` }).join(' ')
    let attributes = [...el.attributes].map(att => att.name);

    let pathN = document.createElementNS(svgNs, 'path');
    pathN.setAttribute('d', d);


    // copy attributes
    attributes.forEach(att => {
        if (!exclude.includes(att)) {
            let val = el.getAttribute(att);
            pathN.setAttribute(att, val)
        }
    })

    //el.replaceWith(pathN)
    //console.log(pathN.outerHTML, d);
    return pathN

}
/*
export function copyAttributes(newEl, oldEl){

    let attributes = [...oldEl.attributes].map(att => att.name);


}
*/


// retrieve pathdata from svg geometry elements
export function getPathDataFromEl(el, {
    stringify = false,
    width = 0,
    height = 0
} = {}) {

    let pathData = [];
    let type = el.nodeName.toLowerCase();
    let attNames, d, x, y, r, rx, ry, cx, cy, x1, x2, y1, y2;

    if (!width || !height) {
        let svg = getRootSvg(el);
        let viewBox = getViewBox(svg)
        width = viewBox.width;
        height = viewBox.height;
    }

    // convert relative and physical units to user-units
    let atts = svgElUnitsToPixel(el, { width, height })

    switch (type) {
        case 'path':
            d = el.getAttribute("d");
            pathData = parsePathDataNormalized(d);
            break;

        case 'rect':
            attNames = ['x', 'y', 'width', 'height', 'rx', 'ry'];
            ({ x=0, y=0, width=0, height=0, rx=0, ry=0 } = atts);

            if (!rx && !ry) {
                pathData = [
                    { type: "M", values: [x, y] },
                    { type: "L", values: [x + width, y] },
                    { type: "L", values: [x + width, y + height] },
                    { type: "L", values: [x, y + height] },
                    { type: "Z", values: [] }
                ];
            } else {

                rx = rx ? rx : ry;
                ry = ry ? ry : rx;

                if (rx > width / 2) {
                    rx = width / 2;
                }
                if (ry > height / 2) {
                    ry = height / 2;
                }
                pathData = [
                    { type: "M", values: [x + rx, y] },
                    { type: "L", values: [x + width - rx, y] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + width, y + ry] },
                    { type: "L", values: [x + width, y + height - ry] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + width - rx, y + height] },
                    { type: "L", values: [x + rx, y + height] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x, y + height - ry] },
                    { type: "L", values: [x, y + ry] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + rx, y] },
                    { type: "Z", values: [] }
                ];
            }
            break;

        case 'circle':
        case 'ellipse':

            attNames = ['cx', 'cy', 'rx', 'ry', 'r'];
            ({ cx=0, cy=0, r, rx, ry } = atts);

            let isCircle = type === 'circle';

            if (isCircle) {
                r = r;
                rx = r
                ry = r
            } else {
                rx = rx ? rx : r;
                ry = ry ? ry : r;
            }


            // simplified radii for circles
            let rxS = isCircle && r >= 1 ? 1 : rx;
            let ryS = isCircle && r >= 1 ? 1 : ry;


            pathData = [
                { type: "M", values: [cx + rx, cy] },
                { type: "A", values: [rxS, ryS, 0, 1, 1, cx - rx, cy] },
                { type: "A", values: [rxS, ryS, 0, 1, 1, cx + rx, cy] },
            ];

            break;
        case 'line':
            attNames = ['x1', 'y1', 'x2', 'y2'];
            ({ x1, y1, x2, y2 } = atts);
            pathData = [
                { type: "M", values: [x1, y1] },
                { type: "L", values: [x2, y2] }
            ];
            break;
        case 'polygon':
        case 'polyline':

            let points = el.getAttribute('points').split(/,| /).filter(Boolean).map(Number)

            for (let i = 0; i < points.length; i += 2) {
                pathData.push({
                    type: (i === 0 ? "M" : "L"),
                    values: [points[i], points[i + 1]]
                });
            }
            if (type === 'polygon') {
                pathData.push({
                    type: "Z",
                    values: []
                });
            }
            break;
    }

    return stringify ? stringifyPathData(pathData) : pathData;

};




export function pathElToShape(el, {
    convert_rects = false,
    convert_ellipses = false,
    convert_poly = false,
    convert_lines = false
} = {}) {

    //console.log('pathElToShape', convert_rects, convert_ellipses, convert_lines );

    let pathData = parsePathDataNormalized(el.getAttribute('d'));
    let coms = Array.from(new Set(pathData.map(com => com.type))).join('')

    let hasArcs = (/[a]/gi).test(coms)
    let hasBeziers = (/[csqt]/gi).test(coms)
    let hasLines = (/[l]/gi).test(coms)
    let isPoly = !(/[acqts]/gi).test(coms)
    let closed = (/[z]/gi).test(coms)
    let shape = null;
    let type = null

    let attributes = getElementAtts(el)
    let attsNew = {}
    let decimals = 7;

    if (isPoly) {

        // is line
        if (pathData.length === 2 && convert_lines) {
            type = 'line'
            shape = document.createElementNS(svgNs, type)
            let [x1, y1, x2, y2] = [...pathData[0].values, ...pathData[1].values].map(val => roundTo(val, decimals))
            attsNew = { x1, y1, x2, y2 }
        }
        // polygon, polyline or rect
        else {

            let vertices = getPathDataVertices(pathData);
            let bb = getPolyBBox(vertices)
            let areaPoly = getPolygonArea(vertices, true)
            let areaRect = bb.width * bb.height;
            let areaDiff = Math.abs(1 - areaRect / areaPoly);

            // is rect
            if (convert_rects && areaDiff < 0.01) {
                type = 'rect'
                shape = document.createElementNS(svgNs, type)
                let { x, y, width, height } = bb
                attsNew = { x, y, width, height }

            }
            // polyline or polygon
            else if(convert_poly) {
                type = closed ? 'polygon' : 'polyline';
                shape = document.createElementNS(svgNs, type)
                let points = vertices.map(pt => { return [pt.x, pt.y] }).flat().map(val => roundTo(val, decimals)).join(' ')
                attsNew = { points }
            }
        }
    }
    // circles or ellipses
    else if (!hasLines && convert_ellipses) {

        // try to convert cubics to arcs
        if (!hasArcs && hasBeziers) {
            pathData = pathDataCubicsToArc(pathData, { areaThreshold: 2.5 })
            hasArcs = pathData.filter(com => com.type === 'A').length;
        }


        if (hasArcs) {
            let pathData2 = getPathDataVerbose(pathData, { addArcParams: true })
            let arcComs = pathData2.filter(com => com.type === 'A')

            let cxVals = new Set();
            let cyVals = new Set();
            let rxVals = new Set();
            let ryVals = new Set();

            if (arcComs.length > 1) {
                //console.log('!!!arcComs', arcComs);
                pathData2.forEach(com => {
                    if (com.type === 'A') {
                        //console.log('params', com, com.cx, com.cy, com.rx, com.ry);
                        cxVals.add(roundTo(com.cx, decimals))
                        cyVals.add(roundTo(com.cy, decimals))
                        rxVals.add(roundTo(com.rx, decimals))
                        ryVals.add(roundTo(com.ry, decimals))
                    }
                })
            }

            cxVals = Array.from(cxVals)
            cyVals = Array.from(cyVals)
            rxVals = Array.from(rxVals)
            ryVals = Array.from(ryVals)

            if(cxVals.length===1 && cyVals.length===1 && rxVals.length===1 && ryVals.length===1){
                let [rx, ry, cx, cy] = [rxVals[0], ryVals[0], cxVals[0], cyVals[0]]
                type = rx===ry ? 'circle' : 'ellipse';
                shape = document.createElementNS(svgNs, type)
                attsNew = type==='circle' ? { r:rx, cx, cy } : {rx, ry, cx, cy}
            }
        }
    }


    // if el could be replaced
    if (shape) {
        let ignore = ['id', 'class']

        // set  shape attributes
        for (let att in attsNew) {
            shape.setAttribute(att, attsNew[att])
        }

        // copy old attributes
        for (let att in attributes) {
            //console.log(attributes);
            if (attLookup.atts[att].includes(type) || ignore.includes(att) || att.startsWith('data-')) {
                shape.setAttribute(att, attributes[att])
            }
        }

        // replace
        el = shape;
    }

    return el;

}