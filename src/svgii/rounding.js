
/**
 * detect suitable floating point accuracy
 * for further rounding/optimizations
 */

import { getDistAv, getDistManhattan } from "./geometry";



export function detectAccuracyPoly(pts) {

    let minDim = Infinity
    let dims = [];
    //console.log(pathData);

    // add average distances
    for (let i = 1, len = pts.length; i < len; i++) {
        let pt = pts[i];
        let { p0 = null, p = null, dimA = 0 } = pt;

        // use existing averave dimension value or calculate
        if ( p && p0) {
            dimA = dimA ? dimA : getDistManhattan(p0, p);

            if (dimA) dims.push(dimA);
            if (dimA && dimA < minDim) minDim = dimA;
        }
    }

    let dim_min = dims.sort()
    let sliceIdx = Math.ceil(dim_min.length / 8);
    dim_min = dim_min.slice(0, sliceIdx);
    let minVal = dim_min.reduce((a, b) => a + b, 0) / sliceIdx;

    let threshold = 75
    let decimalsAuto = minVal > threshold * 1.5 ? 0 : Math.floor(threshold / minVal).toString().length
    // clamp
    return Math.min(Math.max(0, decimalsAuto), 8)

}




export function detectAccuracy(pathData) {

    let minDim = Infinity
    let dims = [];
    //console.log(pathData);

    // add average distances
    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values, p0 = null, p = null, dimA = 0 } = com;

        // use existing averave dimension value or calculate
        if (values.length && p && p0) {
            //console.log(com);
            dimA = dimA ? dimA : getDistManhattan(p0, p);

            //let dimA = +getDistAv(p0, p).toFixed(8)
            //console.log('dimA', dimA, com.dimA, type);

            if (dimA) dims.push(dimA);
            if (dimA && dimA < minDim) minDim = dimA;
            //if (dimA && dimA > maxDim) maxDim = dimA;
        }

    }

    let dim_min = dims.sort()
    //console.log('dim_min', dim_min);

    let sliceIdx = Math.ceil(dim_min.length / 8);
    dim_min = dim_min.slice(0, sliceIdx);
    let minVal = dim_min.reduce((a, b) => a + b, 0) / sliceIdx;

    let threshold = 75
    let decimalsAuto = minVal > threshold * 1.5 ? 0 : Math.floor(threshold / minVal).toString().length

    // clamp
    return Math.min(Math.max(0, decimalsAuto), 8)

}


export function roundTo(num = 0, decimals = 3) {
    if (!decimals) return Math.round(num);
    let factor = 10 ** decimals;
    return Math.round(num * factor) / factor;
}


/**
 * round path data
 * either by explicit decimal value or
 * based on suggested accuracy in path data
 */
export function roundPathData(pathData, decimals = -1) {

    if (decimals < 0) return pathData;

    let len = pathData.length;

    for (let c = 0; c < len; c++) {
        //let com = pathData[c];
        let values = pathData[c].values
        let valLen = values.length;
        if (!valLen) continue

        for (let v = 0; v < valLen; v++) {
            //pathData[c].values[v] =  +values[v].toFixed(decimals);
            pathData[c].values[v] = roundTo(values[v], decimals);
        }
    };

    //console.log(pathData);
    return pathData;
}


export function roundPathData_(pathData, decimals = -1) {

    if (decimals < 0) return pathData;

    let len = pathData.length;
    let c = 0;
    while (c < len) {

        //let com = pathData[c];
        let values = pathData[c].values
        let valLen = values.length;

        // Z commands have no values
        if (!valLen) {
            c++; continue
        }

        let v = 0;
        while (v < valLen) {
            pathData[c].values[v] = roundTo(values[v], decimals);
            v++
        }
        c++

    };

    //console.log(pathData);
    return pathData;
}
