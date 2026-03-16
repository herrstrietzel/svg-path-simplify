import { autoRound, roundTo } from "./rounding";

/**
 *  Decompose matrix to readable transform properties 
 *  translate() rotate() scale() etc.
 *  based on @AndreaBogazzi's answer
 *  https://stackoverflow.com/questions/5107134/find-the-rotation-and-skew-of-a-matrix-transformation#32125700
 *  return object with seperate transform properties 
 *  and ready to use css or svg attribute strings
 */
export function qrDecomposeMatrix(matrix, precision = 4) {
    let { a, b, c, d, e, f } = matrix;
    // matrix is array
    if (Array.isArray(matrix)) {
        [a, b, c, d, e, f] = matrix;
    }
    let angle = Math.atan2(b, a),
        denom = Math.pow(a, 2) + Math.pow(b, 2),
        scaleX = Math.sqrt(denom),
        scaleY = (a * d - c * b) / scaleX,
        skewX = Math.atan2(a * c + b * d, denom) / (Math.PI / 180),
        translateX = e ? e : 0,
        translateY = f ? f : 0,
        rotate = angle ? angle / (Math.PI / 180) : 0;
    let transObj = {
        translateX: translateX,
        translateY: translateY,
        rotate: rotate,
        scaleX: scaleX,
        scaleY: scaleY,
        skewX: skewX,
        skewY: 0
    };
    let cssTransforms = [];
    let svgTransforms = [];
    for (let prop in transObj) {
        transObj[prop] = +parseFloat(transObj[prop]).toFixed(precision);
        let val = transObj[prop];
        let unit = "";
        if (prop == "rotate" || prop == "skewX") {
            unit = "deg";
        }
        if (prop.indexOf("translate") != -1) {
            unit = "px";
        }
        // combine these properties
        let convert = ["scaleX", "scaleY", "translateX", "translateY"];
        if (val !== 0) {
            cssTransforms.push(`${prop}(${val}${unit})`);
        }
        if (convert.indexOf(prop) == -1 && val !== 0) {
            svgTransforms.push(`${prop}(${val})`);
        } else if (prop == "scaleX") {
            svgTransforms.push(
                `scale(${+scaleX.toFixed(precision)} ${+scaleY.toFixed(precision)})`
            );
        } else if (prop == "translateX") {
            svgTransforms.push(
                `translate(${transObj.translateX} ${transObj.translateY})`
            );
        }

    }
    // append css style string to object
    transObj.cssTransform = cssTransforms.join(" ");
    transObj.svgTransform = svgTransforms.join(" ");
    //transObj.matrix = [a, b, c, d, e, f ].map(val=>autoRound(val))
    transObj.matrix = [a, b, c, d, e, f ].map(val=>roundTo(val, precision))
    transObj.matrixAtt = `matrix(${transObj.matrix.join(' ')})`

 

    return transObj;
}
