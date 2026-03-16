
/*
import { getPathDataVertices, getPointOnEllipse, pointAtT, checkLineIntersection, getDistance, interpolate, getAngle } from './geometry.js';

import { splitSubpaths } from "./convert_segments";
import { getPolygonArea, getPathArea, getRelativeAreaDiff } from './geometry_area.js';
import { splitSubpaths } from './pathData_split.js';
import { getPolyBBox} from './geometry_bbox.js';
import { renderPoint, renderPath } from "./visualize";
*/


import { checkLineIntersection, getAngle, getDeltaAngle, getDistance, getDistAv, getDistManhattan, getSquareDistance, interpolate, pointAtT, rotatePoint, toParametricAngle } from './geometry';
import { getPathArea, getPolygonArea, getRelativeAreaDiff } from './geometry_area';
import { parsePathDataString } from './pathData_parse';
import { pathDataToD } from './pathData_stringify';
import { roundPathData } from './rounding';
import { renderPoint } from './visualize';


export function parsePathDataNormalized(d,
    {
        // necessary for most calculations
        toAbsolute = true,
        toLonghands = true,

        // not necessary unless you need cubics only
        quadraticToCubic = false,

        // mostly a fallback if arc calculations fail      
        arcToCubic = false,
        // arc to cubic precision - adds more segments for better precision     
        arcAccuracy = 4,
    } = {}
) {

    // is already array
    let isArray = Array.isArray(d);

    // normalize native pathData to regular array
    let hasConstructor = isArray && typeof d[0] === 'object' && typeof d[0].constructor === 'function'
    /*
    if (hasConstructor) {
        d = d.map(com => { return { type: com.type, values: com.values } })
        console.log('hasConstructor', hasConstructor, (typeof d[0].constructor), d);
    }
    */

    let pathDataObj = isArray ? d : parsePathDataString(d);

    let { hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true } = pathDataObj;
    let pathData = hasConstructor ? pathDataObj : pathDataObj.pathData;

    //console.log('???quadraticToCubic', quadraticToCubic);

    // normalize
    pathData = normalizePathData(pathData,
        {
            toAbsolute, toLonghands, quadraticToCubic, arcToCubic, arcAccuracy,
            hasRelatives, hasShorthands, hasQuadratics, hasArcs
        },
    )

    return pathData;
}


export function convertPathData(pathData, {
    toShorthands = true,
    toLonghands = false,
    toRelative = true,
    toAbsolute = false,
    decimals = 3,
    arcToCubic = false,
    quadraticToCubic = false,

    // assume we need full normalization
    hasRelatives = true,
    hasShorthands = true,
    hasQuadratics = true,
    hasArcs = true,
    optimizeArcs = true,
    testTypes = false


} = {}) {



    // pathdata properties - test= true adds a manual test 
    if (testTypes) {
        //console.log('test for conversions');
        let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
        hasRelatives = /[lcqamts]/gi.test(commands);
        hasQuadratics = /[qt]/gi.test(commands);
        hasArcs = /[a]/gi.test(commands);
        hasShorthands = /[vhst]/gi.test(commands);
        isPoly = /[mlz]/gi.test(commands);
    }


    // some params exclude each other
    toRelative = toAbsolute ? false : toRelative;
    toShorthands = toLonghands ? false : toShorthands


    if (toAbsolute) pathData = pathDataToAbsolute(pathData);
    if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData);


    // minify semicircle radii
    if (optimizeArcs) pathData = optimizeArcPathData(pathData);


    //if(decimals>-1 && decimals<2) pathData = roundPathData(pathData, decimals);
    if (toShorthands) pathData = pathDataToShorthands(pathData);

    if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData)

    //console.log(toShorthands, toRelative, decimals);
    if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);


    // pre round - before relative conversion to minimize distortions
    if (decimals > -1 && toRelative) pathData = roundPathData(pathData, decimals);


    if (toRelative) pathData = pathDataToRelative(pathData);
    if (decimals > -1) pathData = roundPathData(pathData, decimals);

    return pathData
}

/**
 * 
 * @param {*} pathData 
 * @returns 
 */

export function optimizeArcPathData(pathData = []) {
    pathData.forEach((com, i) => {
        let { type, values } = com;
        if (type === 'A') {
            let [rx, ry, largeArc, x, y] = [values[0], values[1], values[3], values[5], values[6]];
            let comPrev = pathData[i - 1]
            let [x0, y0] = [comPrev.values[comPrev.values.length - 2], comPrev.values[comPrev.values.length - 1]];
            let M = { x: x0, y: y0 };
            let p = { x, y };
            //largeArc=true
            //let pMid = {x: Math.abs(x-x0), y:Math.abs(y-y0)}

            // rx and ry are large enough
            if (rx >= 1 && (x === x0 || y === y0)) {
                let diff = Math.abs(rx - ry) / rx;

                // rx~==ry 
                if (diff < 0.01) {

                    // test radius against mid point
                    let pMid = interpolate(M, p, 0.5)                    
                    let distM = getDistance(pMid, M)
                    let rDiff = Math.abs(distM - rx) / rx

                    // half distance between mid and start point should be ~ equal
                    if(rDiff<0.01){
                        pathData[i].values[0] = 1;
                        pathData[i].values[1] = 1;
                        pathData[i].values[2] = 0;
                    }
                }
            }
        }
    })
    return pathData;
}



/**
 * parse normalized
 */

export function normalizePathData(pathData = [],
    {
        toAbsolute = true,
        toLonghands = true,
        quadraticToCubic = false,
        arcToCubic = false,
        arcAccuracy = 2,

        // assume we need full normalization
        hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true, testTypes = false

    } = {}
) {


    return convertPathData(pathData, { toAbsolute, toLonghands, quadraticToCubic, arcToCubic, arcAccuracy, hasRelatives, hasShorthands, hasQuadratics, hasArcs, testTypes, decimals: -1 })
}

/*
export function normalizePathData(pathData = [],
    {
        toAbsolute = true,
        toLonghands = true,
        quadraticToCubic = false,
        arcToCubic = false,
        arcAccuracy = 2,

        // assume we need full normalization
        hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true, testTypes = false

    } = {}
) {

    // pathdata properties - test= true adds a manual test 
    if (testTypes) {
        //console.log('test for conversions');
        let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
        hasRelatives = /[lcqamts]/gi.test(commands);
        hasQuadratics = /[qt]/gi.test(commands);
        hasArcs = /[a]/gi.test(commands);
        hasShorthands = /[vhst]/gi.test(commands);
        isPoly = /[mlz]/gi.test(commands);
    }

    if ((hasQuadratics && quadraticToCubic) || (hasArcs && arcToCubic)) {
        toLonghands = true
        toAbsolute = true
    }

    if (hasRelatives && toAbsolute) pathData = pathDataToAbsoluteOrRelative(pathData, false);
    if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData, -1, false);
    if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData, arcAccuracy);
    if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);

    return pathData;

}
*/




export function revertCubicQuadratic(p0 = {}, cp1 = {}, cp2 = {}, p = {}, tolerance = 1) {

    // test if cubic can be simplified to quadratic
    let cp1X = interpolate(p0, cp1, 1.5)
    let cp2X = interpolate(p, cp2, 1.5)

    let dist0 = getDistManhattan(p0, p)
    let threshold = dist0 * 0.01 * tolerance;
    let dist1 = getDistManhattan(cp1X, cp2X)

    let cp1_Q = null;
    let type = 'C'
    let values = [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];
    let comN = { type, values }

    if (dist1 < threshold) {
        cp1_Q = checkLineIntersection(p0, cp1, p, cp2, false, true);
        if (cp1_Q) {
            //renderPoint(markers, cp1_Q )
            comN.type = 'Q'
            comN.values = [cp1_Q.x, cp1_Q.y, p.x, p.y];
            comN.p0 = p0;
            comN.cp1 = cp1_Q;
            comN.cp2 = null;
            comN.p = p
        }
    }

    return comN

}



/**
 * convert cubic circle approximations
 * to more compact arcs
 */

export function pathDataArcsToCubics(pathData, {
    arcAccuracy = 1
} = {}) {

    let pathDataCubic = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

        //convert arcs to cubics
        if (com.type === 'A') {
            // add all C commands instead of Arc
            let cubicArcs = arcToBezier(p0, com.values, arcAccuracy);
            cubicArcs.forEach((cubicArc) => {
                pathDataCubic.push(cubicArc);
            });
        }

        else {
            // add command
            pathDataCubic.push(com)
        }
    }

    return pathDataCubic

}


export function pathDataQuadraticToCubic(pathData) {

    let pathDataQuadratic = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

        //convert quadratic to cubics
        if (com.type === 'Q') {
            pathDataQuadratic.push(quadratic2Cubic(p0, com.values))
        }

        else {
            // add command
            pathDataQuadratic.push(com)
        }
    }

    return pathDataQuadratic
}



/**
 * convert quadratic commands to cubic
 */
export function quadratic2Cubic(p0, values) {
    if (Array.isArray(p0)) {
        p0 = {
            x: p0[0],
            y: p0[1]
        }
    }
    let cp1 = {
        x: p0.x + 2 / 3 * (values[0] - p0.x),
        y: p0.y + 2 / 3 * (values[1] - p0.y)
    }
    let cp2 = {
        x: values[2] + 2 / 3 * (values[0] - values[2]),
        y: values[3] + 2 / 3 * (values[1] - values[3])
    }
    return ({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, values[2], values[3]] });
}


/**
 * convert pathData to 
 * This is just a port of Dmitry Baranovskiy's 
 * pathToRelative/Absolute methods used in snap.svg
 * https://github.com/adobe-webplatform/Snap.svg/
 */


export function pathDataToAbsoluteOrRelative(pathData, toRelative = false, decimals = -1) {
    if (decimals >= 0) {
        pathData[0].values = pathData[0].values.map(val => +val.toFixed(decimals));
    }

    let len = pathData.length;
    let M = pathData[0].values;
    let x = M[0],
        y = M[1],
        mx = x,
        my = y;

    for (let i = 1; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let vLen = values.length;
        let typeRel = type.toLowerCase();
        let typeAbs = type.toUpperCase();
        let typeNew = toRelative ? typeRel : typeAbs;

        if (type !== typeNew) {
            com.type = typeNew;

            switch (typeRel) {
                case "a":
                    values[5] = toRelative ? values[5] - x : values[5] + x;
                    values[6] = toRelative ? values[6] - y : values[6] + y;
                    break;
                case "v":
                    values[0] = toRelative ? values[0] - y : values[0] + y;
                    break;
                case "h":
                    values[0] = toRelative ? values[0] - x : values[0] + x;
                    break;
                case "m":
                    if (toRelative) {
                        values[0] -= x;
                        values[1] -= y;
                    } else {
                        values[0] += x;
                        values[1] += y;
                    }
                    mx = toRelative ? values[0] + x : values[0];
                    my = toRelative ? values[1] + y : values[1];
                    break;
                default:
                    if (values.length) {
                        for (let v = 0; v < values.length; v++) {
                            values[v] = toRelative
                                ? values[v] - (v % 2 ? y : x)
                                : values[v] + (v % 2 ? y : x);
                        }
                    }
            }
        }

        switch (typeRel) {
            case "z":
                x = mx;
                y = my;
                break;
            case "h":
                x = toRelative ? x + values[0] : values[0];
                break;
            case "v":
                y = toRelative ? y + values[0] : values[0];
                break;
            case "m":
                mx = values[vLen - 2] + (toRelative ? x : 0);
                my = values[vLen - 1] + (toRelative ? y : 0);
            default:
                x = values[vLen - 2] + (toRelative ? x : 0);
                y = values[vLen - 1] + (toRelative ? y : 0);
        }

        if (decimals >= 0) {
            com.values = com.values.map(val => +val.toFixed(decimals));
        }
    }
    return pathData;
}


export function pathDataToRelative(pathData, decimals = -1) {
    return pathDataToAbsoluteOrRelative(pathData, true, decimals)
}

export function pathDataToAbsolute(pathData, decimals = -1) {
    return pathDataToAbsoluteOrRelative(pathData, false, decimals)
}


/**
 * decompose/convert shorthands to "longhand" commands:
 * H, V, S, T => L, L, C, Q
 * reversed method: pathDataToShorthands()
 */

export function pathDataToLonghands(pathData, decimals = -1, test = true) {

    // analyze pathdata – if you're sure your data is already absolute skip it via test=false
    let hasRel = false;

    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('')
        let hasShorthands = /[hstv]/gi.test(commandTokens);
        hasRel = /[astvqmhlc]/g.test(commandTokens);
        //console.log('test', hasRel, hasShorthands);

        if (!hasShorthands) {
            return pathData;
        }
    }

    pathData = test && hasRel ? pathDataToAbsolute(pathData, decimals) : pathData;

    let pathDataLonghand = [];
    let comPrev = {
        type: "M",
        values: pathData[0].values
    };
    pathDataLonghand.push(comPrev);

    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valuesL = values.length;
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let [x, y] = [values[valuesL - 2], values[valuesL - 1]];
        let cp1X, cp1Y, cpN1X, cpN1Y, cpN2X, cpN2Y, cp2X, cp2Y;
        let [prevX, prevY] = [
            valuesPrev[valuesPrevL - 2],
            valuesPrev[valuesPrevL - 1]
        ];
        switch (type) {
            case "H":
                comPrev = {
                    type: "L",
                    values: [values[0], prevY]
                };
                break;
            case "V":
                comPrev = {
                    type: "L",
                    values: [prevX, values[0]]
                };
                break;
            case "T":
                [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                [prevX, prevY] = [
                    valuesPrev[valuesPrevL - 2],
                    valuesPrev[valuesPrevL - 1]
                ];
                // new control point
                cpN1X = prevX + (prevX - cp1X);
                cpN1Y = prevY + (prevY - cp1Y);
                comPrev = {
                    type: "Q",
                    values: [cpN1X, cpN1Y, x, y]
                };
                break;
            case "S":

                [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                [prevX, prevY] = [
                    valuesPrev[valuesPrevL - 2],
                    valuesPrev[valuesPrevL - 1]
                ];

                [cp2X, cp2Y] =
                    valuesPrevL > 2 && comPrev.type !== 'A' ?
                        [valuesPrev[2], valuesPrev[3]] :
                        [prevX, prevY];

                // new control points
                cpN1X = 2 * prevX - cp2X;
                cpN1Y = 2 * prevY - cp2Y;
                cpN2X = values[0];
                cpN2Y = values[1];
                comPrev = {
                    type: "C",
                    values: [cpN1X, cpN1Y, cpN2X, cpN2Y, x, y]
                };

                break;
            default:
                comPrev = {
                    type: type,
                    values: values
                };
        }
        // round final longhand values
        if (decimals > -1) {
            comPrev.values = comPrev.values.map(val => { return +val.toFixed(decimals) })
        }

        pathDataLonghand.push(comPrev);
    }
    return pathDataLonghand;
}

/**
 * apply shorthand commands if possible
 * L, L, C, Q => H, V, S, T
 * reversed method: pathDataToLonghands()
 */
export function pathDataToShorthands(pathData, decimals = -1, test = false) {

    //pathData = JSON.parse(JSON.stringify(pathData))
    //console.log('has dec', pathData);
    /** 
    * analyze pathdata – if you're sure your data is already absolute skip it via test=false
    */
    let hasRel
    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('')
        hasRel = /[astvqmhlc]/g.test(commandTokens);
    }

    pathData = test && hasRel ? pathDataToAbsoluteOrRelative(pathData) : pathData;

    let len = pathData.length
    let pathDataShorts = new Array(len);

    let comShort = pathData[0]
    pathDataShorts[0] = comShort;

    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p = p0;

    for (let i = 1; i < len; i++) {

        let com = pathData[i];
        comShort = com;
        let { type, values } = com;
        let valuesLen = values.length;
        let valuesLast = [values[valuesLen - 2], values[valuesLen - 1]];

        // previous command
        let comPrev = pathData[i - 1];

        //last on-path point
        p = { x: valuesLast[0], y: valuesLast[1] };

        // deltas for h or v
        let dx = Math.abs(p.x - p0.x)
        let dy = Math.abs(p.y - p0.y)
        let maxDist = getDistManhattan(p0, p) * 0.01


        // first bezier control point for S/T shorthand tests
        let isShort = false, isHorizontal = false, isVertical = false;

        if ((type === 'C' && comPrev.type === 'C') || (type === 'Q' && comPrev.type === 'Q')) {
            let cpPrev = comPrev.type === 'C' ? { x: comPrev.values[2], y: comPrev.values[3] } : { x: comPrev.values[0], y: comPrev.values[1] };
            let cpFirst = { x: values[0], y: values[1] };

            let dx1 = (p0.x - cpPrev.x)
            let dy1 = (p0.y - cpPrev.y)

            //adjust maxDist
            maxDist = getDistManhattan(cpPrev, cpFirst) * 0.01

            // reflected cp
            let cpR = { x: cpPrev.x + dx1 * 2, y: cpPrev.y + dy1 * 2 }
            let distCp = getDistManhattan(cpR, cpFirst)

            isShort = distCp < maxDist;

        }

        else if (type === 'L') {
            isHorizontal = dy === 0 || dy < maxDist;
            isVertical = dx === 0 || dx < maxDist;
            isShort = isVertical || isHorizontal;

            if (isShort) {
                //renderPoint(markers, p, 'magenta')
            }
        }


        switch (type) {
            case "L":
                if (isHorizontal) {
                    //console.log('is H');
                    comShort = {
                        type: "H",
                        values: [values[0]]
                    };
                }

                // V
                if (isVertical) {
                    //console.log('is V', w, h);
                    comShort = {
                        type: "V",
                        values: [values[1]]
                    };
                }
                break;

            case "Q":

                if (isShort) {
                    //comShort = com;
                    comShort = {
                        type: "T",
                        values: [p.x, p.y]
                    };
                }

                break;
            case "C":
                if (isShort) {
                    //console.log('is S');
                    comShort = {
                        type: "S",
                        values: [values[2], values[3], p.x, p.y]
                    };
                }
                break;
            default:
                comShort = {
                    type: type,
                    values: values
                };
        }

        p0 = p;
        pathDataShorts[i] = comShort;
    }

    //console.log('pathDataShorts', pathDataShorts);
    return pathDataShorts;
}



/**
 * based on puzrin's 
 * fontello/cubic2quad
 * https://github.com/fontello/cubic2quad/blob/master/test/cubic2quad.js
 */

export function pathDataToQuadratic(pathData, precision = 0.1) {
    pathData = pathDataToLonghands(pathData)
    let newPathData = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {
        let comPrev = pathData[i - 1];
        let com = pathData[i];
        let [type, values] = [com.type, com.values];
        let [typePrev, valuesPrev] = [comPrev.type, comPrev.values];
        let valuesPrevL = valuesPrev.length;
        let [xPrev, yPrev] = [
            valuesPrev[valuesPrevL - 2],
            valuesPrev[valuesPrevL - 1]
        ];

        // convert C to Q
        if (type == "C") {

            let quadCommands = cubicToQuad(
                xPrev,
                yPrev,
                values[0],
                values[1],
                values[2],
                values[3],
                values[4],
                values[5],
                precision
            );

            quadCommands.forEach(comQ => {
                newPathData.push(comQ)
            })


        } else {
            newPathData.push(com);
        }
    }
    return newPathData;
}


/**
 * Convert a parametrized SVG arc to cubic Beziers
 * Assumes arc parameters are already resolved
 */
export function arcToBezierResolved({

    // start / end points
    p0 = { x: 0, y: 0 },
    p = { x: 0, y: 0 },

    // center
    centroid = { x: 0, y: 0 },

    // radii
    rx = 0,
    ry = 0,

    // SVG-style rotation
    xAxisRotation = 0,
    radToDegree = false,

    // optional
    startAngle = null,
    endAngle = null,
    deltaAngle = null

} = {}) {

    if (!rx || !ry) return [];

    // new pathData
    let pathData = [];

    // maximum delta for cubic approximations: Math.PI / 2 (90deg)
    const maxSegAngle = 1.5707963267948966

    // Pomax cubic constant
    const k = 0.551785;


    // rotation
    let phi = radToDegree
        ? xAxisRotation
        : xAxisRotation * Math.PI / 180;

    let cosphi = Math.cos(phi);
    let sinphi = Math.sin(phi);

    // helper: transform point to ellipse local space
    const toLocal = ({ x, y }) => {
        const dx = x - centroid.x;
        const dy = y - centroid.y;
        return {
            x: (cosphi * dx + sinphi * dy) / rx,
            y: (-sinphi * dx + cosphi * dy) / ry
        };
    };

    // derive angles if not provided
    if (startAngle === null || endAngle === null || deltaAngle === null) {
        ({ startAngle, endAngle, deltaAngle } = getDeltaAngle(centroid, p0, p))
    }



    // parametrize for elliptic arcs
    let startAngleParam = rx !== ry ? toParametricAngle(startAngle, rx, ry) : startAngle;
    //let endAngleParam = rx !== ry ? toParametricAngle(endAngle, rx, ry) : endAngle;
    //let deltaAngleParam = endAngleParam - startAngleParam;
    let deltaAngleParam = rx !== ry ? toParametricAngle(deltaAngle, rx, ry) : deltaAngle;

    let segments = Math.max(1, Math.ceil(Math.abs(deltaAngleParam) / maxSegAngle));
    let angStep = deltaAngleParam / segments;

    for (let i = 0; i < segments; i++) {

        const a = Math.abs(angStep) === maxSegAngle ?
            Math.sign(angStep) * k :
            (4 / 3) * Math.tan(angStep / 4);

        let cos0 = Math.cos(startAngleParam);
        let sin0 = Math.sin(startAngleParam);
        let cos1 = Math.cos(startAngleParam + angStep);
        let sin1 = Math.sin(startAngleParam + angStep);

        // unit arc → cubic
        let c1 = { x: cos0 - sin0 * a, y: sin0 + cos0 * a };
        let c2 = { x: cos1 + sin1 * a, y: sin1 - cos1 * a };
        let e = { x: cos1, y: sin1 };

        let values = [];

        [c1, c2, e].forEach(pt => {
            let x = pt.x * rx;
            let y = pt.y * ry;

            values.push(
                cosphi * x - sinphi * y + centroid.x,
                sinphi * x + cosphi * y + centroid.y
            );
        });

        pathData.push({
            type: 'C',
            values,
            cp1: { x: values[0], y: values[1] },
            cp2: { x: values[2], y: values[3] },
            p: { x: values[4], y: values[5] },
        });

        startAngleParam += angStep;
    }

    return pathData;
}



/** 
 * convert arctocommands to cubic bezier
 * based on puzrin's a2c.js
 * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
 * returns pathData array
*/

export function arcToBezier(p0, values, splitSegments = 1) {
    const TAU = Math.PI * 2;
    let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

    if (rx === 0 || ry === 0) {
        return []
    }

    let phi = rotation ? rotation * TAU / 360 : 0;
    let sinphi = phi ? Math.sin(phi) : 0
    let cosphi = phi ? Math.cos(phi) : 1
    let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2
    let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2

    if (pxp === 0 && pyp === 0) {
        return []
    }
    rx = Math.abs(rx)
    ry = Math.abs(ry)
    let lambda =
        pxp * pxp / (rx * rx) +
        pyp * pyp / (ry * ry)
    if (lambda > 1) {
        let lambdaRt = Math.sqrt(lambda);
        rx *= lambdaRt
        ry *= lambdaRt
    }

    /** 
     * parametrize arc to 
     * get center point start and end angles
     */
    let rxsq = rx * rx,
        rysq = rx === ry ? rxsq : ry * ry

    let pxpsq = pxp * pxp,
        pypsq = pyp * pyp
    let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq)

    if (radicant <= 0) {
        radicant = 0
    } else {
        radicant /= (rxsq * pypsq) + (rysq * pxpsq)
        radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1)
    }

    let centerxp = radicant ? radicant * rx / ry * pyp : 0
    let centeryp = radicant ? radicant * -ry / rx * pxp : 0
    let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2
    let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2

    let vx1 = (pxp - centerxp) / rx
    let vy1 = (pyp - centeryp) / ry
    let vx2 = (-pxp - centerxp) / rx
    let vy2 = (-pyp - centeryp) / ry

    // get start and end angle
    const vectorAngle = (ux, uy, vx, vy) => {
        let dot = +(ux * vx + uy * vy).toFixed(9)
        if (dot === 1 || dot === -1) {
            return dot === 1 ? 0 : Math.PI
        }
        dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot)
        let sign = (ux * vy - uy * vx < 0) ? -1 : 1
        return sign * Math.acos(dot);
    }

    let ang1 = vectorAngle(1, 0, vx1, vy1),
        ang2 = vectorAngle(vx1, vy1, vx2, vy2)

    if (sweepFlag === 0 && ang2 > 0) {
        ang2 -= Math.PI * 2
    }
    else if (sweepFlag === 1 && ang2 < 0) {
        ang2 += Math.PI * 2
    }


    //ratio must be at least 1
    let ratio = +(Math.abs(ang2) / (TAU / 4)).toFixed(0) || 1


    // increase segments for more accureate length calculations
    let segments = ratio * splitSegments;
    ang2 /= segments
    let pathDataArc = [];


    // If 90 degree circular arc, use a constant
    // https://pomax.github.io/bezierinfo/#circles_cubic
    // k=0.551784777779014
    const angle90 = 1.5707963267948966;
    const k = 0.551785
    let a = ang2 === angle90 ? k :
        (
            ang2 === -angle90 ? -k : 4 / 3 * Math.tan(ang2 / 4)
        );

    let cos2 = ang2 ? Math.cos(ang2) : 1;
    let sin2 = ang2 ? Math.sin(ang2) : 0;
    let type = 'C'

    const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
        let x1 = ang1 != ang2 ? Math.cos(ang1) : cos2;
        let y1 = ang1 != ang2 ? Math.sin(ang1) : sin2;
        let x2 = Math.cos(ang1 + ang2);
        let y2 = Math.sin(ang1 + ang2);

        return [
            { x: x1 - y1 * a, y: y1 + x1 * a },
            { x: x2 + y2 * a, y: y2 - x2 * a },
            { x: x2, y: y2 }
        ];
    }

    for (let i = 0; i < segments; i++) {
        let com = { type: type, values: [] }
        let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

        curve.forEach((pt) => {
            let x = pt.x * rx
            let y = pt.y * ry
            com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery)
        })
        pathDataArc.push(com);
        ang1 += ang2
    }

    return pathDataArc;
}


/**
 * add readable command point data 
 * to pathData command objects
 */
export function pathDataToVerbose(pathData) {

    let pathDataOriginal = JSON.parse(JSON.stringify(pathData))

    // normalize
    pathData = pathDataToLonghands(pathDataToAbsolute(pathData));

    let pathDataVerbose = [];
    let pathDataL = pathData.length;
    let closed = pathData[pathDataL - 1].type.toLowerCase() === 'z' ? true : false;

    pathData.forEach((com, i) => {
        let {
            type,
            values
        } = com;

        let comO = pathDataOriginal[i];
        let typeO = comO.type;
        let valuesO = comO.values;

        let typeLc = typeO.toLowerCase();
        let valuesL = values.length;
        let isRel = typeO === typeO.toLowerCase();

        let comPrev = pathData[i - 1] ? pathData[i - 1] : false;
        let comPrevValues = comPrev ? comPrev.values : [];
        let comPrevValuesL = comPrevValues.length;


        let p0 = {
            x: comPrevValues[comPrevValuesL - 2],
            y: comPrevValues[comPrevValuesL - 1]
        }

        let p = valuesL ? {
            x: values[valuesL - 2],
            y: values[valuesL - 1]
        } : (i === pathData.length - 1 && closed ? pathData[0].values : false);

        let comObj = {
            type: typeO,
            values: valuesO,
            valuesAbsolute: values,
            pFinal: p,
            isRelative: isRel
        }
        if (comPrevValuesL) {
            comObj.pPrev = p0
        }
        switch (typeLc) {
            case 'q':
                comObj.cp1 = {
                    x: values[valuesL - 4],
                    y: values[valuesL - 3]
                }
                break;
            case 'c':
                comObj.cp1 = {
                    x: values[valuesL - 6],
                    y: values[valuesL - 5]
                }
                comObj.cp2 = {
                    x: values[valuesL - 4],
                    y: values[valuesL - 3]
                }
                break;
            case 'a':

                // parametrized arc rx and ry values
                let arcData = svgArcToCenterParam(p0.x, p0.y, values[0], values[1], values[2], values[3], values[4], values[5], values[6]);

                comObj.rx = arcData.rx
                comObj.ry = arcData.ry
                comObj.xAxisRotation = values[2]
                comObj.largeArcFlag = values[3]
                comObj.sweepFlag = values[4]
                comObj.startAngle = arcData.startAngle
                comObj.endAngle = arcData.endAngle
                comObj.deltaAngle = arcData.deltaAngle
                break;
        }
        pathDataVerbose.push(comObj);
    });
    return pathDataVerbose;
}

/**
* convert pathData nested array notation
* as used in snap and other libraries
*/
export function convertArrayPathData(pathDataArray) {
    let pathData = [];
    pathDataArray.forEach(com => {
        let type = com.shift();
        pathData.push({
            type: type,
            values: com
        })
    })
    return pathData;
}

