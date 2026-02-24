import { revertCubicQuadratic } from "./svgii/pathData_convert";

export function pathDataRevertCubicToQuadratic(pathData, tolerance=1) {

    for (let c = 1, l = pathData.length; c < l; c++) {
        let com = pathData[c]
        let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;
        if (type === 'C') {
            //console.log(com);
            let comQ = revertCubicQuadratic(p0, cp1, cp2, p, tolerance)
            if (comQ.type === 'Q') {
                comQ.extreme = com.extreme
                comQ.corner = com.corner
                comQ.dimA = com.dimA
                comQ.squareDist = com.squareDist
                pathData[c] = comQ
            }
        }
    }
    return pathData
}
