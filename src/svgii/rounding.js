
/**
 * detect suitable floating point accuracy
 * for further rounding/optimizations
 */

import { getDistAv, getDistManhattan } from "./geometry";



/**
 * round path data
 * either by explicit decimal value or
 * based on suggested accuracy in path data
 */
export function roundPathData(pathData, decimalsGlobal = -1) {

    if (decimalsGlobal < 0) return pathData;

    let len = pathData.length;
    let decimals = decimalsGlobal
    let decimalsArc = decimals < 3 ? decimals + 2 : decimals
    //decimalsArc = decimals
    //console.log(decimalsArc);

    for (let c = 0; c < len; c++) {
        let com = pathData[c];
        let { type, values } = com
        let valLen = values.length;
        if (!valLen) continue

        let isArc = type.toLowerCase() === 'a'

        for (let v = 0; v < valLen; v++) {
            // allow higher accuracy for arc radii (... it's always arcs)
            pathData[c].values[v] = isArc && v < 2 ? roundTo(values[v], decimalsArc) : roundTo(values[v], decimals);
        }
    };

    //console.log(pathData);
    return pathData;
}




export function detectAccuracyPoly(pts) {

    let minDim = Infinity
    let dims = [];
    //console.log(pathData);

    // add average distances
    for (let i = 1, len = pts.length; i < len; i++) {
        let pt = pts[i];
        let { p0 = null, p = null, dimA = 0 } = pt;

        // use existing averave dimension value or calculate
        if (p && p0) {
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

            if (dimA) dims.push(+dimA.toFixed(8));
            //if (dimA) dims.push(dimA);
            if (dimA && dimA < minDim) minDim = dimA;
            //if (dimA && dimA > maxDim) maxDim = dimA;
        }

    }


   dims = dims.sort()
   let len = dims.length;
   let dim_mid = dims[Math.floor(len*0.5)]

   // smallest 25% of values
   let idx_q = Math.ceil(len*0.25);
   let dims_min = dims.slice(0, idx_q);

   // average smallest values with mid value
   let dim_min = ((dims_min.reduce((a, b) => a + b, 0) / idx_q)  + dim_mid) * 0.5;


   let threshold = 75
   let decimalsAuto = dim_min > threshold * 1.5 ? 0 : Math.floor(threshold / dim_min).toString().length

   // clamp
   return Math.min(Math.max(0, decimalsAuto), 8)



    /*
    let dim_min = dims.sort()
    //console.log('dim_min', dim_min);

    let dim_mid = dim_min[Math.floor(dim_min.length*0.5)]

    let sliceIdx = Math.ceil(dim_min.length / 4);
    dim_min = dim_min.slice(0, sliceIdx);
    let minVal = dim_min.reduce((a, b) => a + b, 0) / sliceIdx;

    // average with mid value
    minVal = (minVal+dim_mid)*0.5
    //console.log('minVal', minVal, dim_mid);


    let threshold = 75
    let decimalsAuto = minVal > threshold * 1.5 ? 0 : Math.floor(threshold / minVal).toString().length

    // clamp
    return Math.min(Math.max(0, decimalsAuto), 8)
    */

}

/**
 * rounding helper
 * allows for quantized rounding
 * e.g 0.5 decimals s
 */
export function roundTo(num = 0, decimals = 3) {
    if (decimals < 0) return num;
    // Normal integer rounding
    if (!decimals) return Math.round(num);

    // stepped rounding
    let intPart = Math.floor(decimals);
    //let fracPart = decimals.toString().split('.');
    //fracPart = fracPart[1] ? +fracPart[1] : 0

    if (intPart !== decimals) {
        let f = +(decimals - intPart).toFixed(2)
        f = f > 0.5 ? (Math.floor((f) / 0.5) * 0.5) : f;
        //console.log('fracPart', f);
        let step = 10 ** -intPart * f;
        return +(Math.round(num / step) * step).toFixed(8);
    }

    let factor = 10 ** decimals;
    return Math.round(num * factor) / factor;
}



export function roundTo__(num = 0, decimals = 3) {
    if (decimals <= -1) return num;
    if (!decimals) return Math.round(num);
    let factor = 10 ** decimals;
    return Math.round(num * factor) / factor;
}

/**
 * round to reasonable 
 * floating point accuracy 
 * based on numeric value
 */
export function autoRound(val, integerThresh = 50) {
    let decimals = 8;

    if (val > integerThresh * 2) {
        decimals = 0
    }
    else if (val > integerThresh) {
        decimals = 1
    } else {
        decimals = Math.ceil(500 / val).toString().length
        //console.log('decimals small', val, decimals);
    }

    //console.log(val, decimals);
    let factor = 10 ** decimals;
    return Math.round(val * factor) / factor;
}




