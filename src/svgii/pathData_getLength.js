import { deg2rad } from "../constants";
import { svgArcToCenterParam, toParametricAngle } from "./geometry";
import { getCircleArcLength, getEllipseLengthLG, getLegendreGaussValues, getLength, waArr_global } from "./geometry_length";
import { getPathDataVerbose } from "./pathData_analyze";
import { splitSubpaths } from "./pathData_split";


export function getPathDataLength(pathData = []) {
    let len = 0
    let pathDataArr = splitSubpaths(pathData);

    for (let i = 0; i < pathDataArr.length; i++) {
        let pathData = pathDataArr[i]

        // add verbose point data if not present
        if (pathData[0].p === undefined) pathData = getPathDataVerbose(pathData);

        // Calculate Legendre Gauss weight and abscissa values
        if (!waArr_global.length) {
            //console.log('no LG');
            let waArr = getLegendreGaussValues(48)
            waArr.forEach(wa => {
                waArr_global.push(wa)
            })
        }

        let waArr = waArr_global;

        pathData.forEach(com => {
            let { type, values, p0, p, cp1 = null, cp2 = null } = com;
            let pts = [p0]
            if (type === 'C' || type === 'Q') pts.push(cp1)
            if (type === 'C') pts.push(cp2)
            pts.push(p)
            let comLen = 0

            if (type === 'A') {

                // get parametrized arc properties
                let [largeArc, sweep] = [com.values[3], com.values[4]];
                let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], largeArc, sweep, p.x, p.y, false)
                let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle, xAxisRotation } = arcData

                //is circle 
                if (rx === ry) {
                    comLen = getCircleArcLength(rx, Math.abs(deltaAngle))
                }

                // is ellipse
                else {
                    xAxisRotation = xAxisRotation * deg2rad;
                    startAngle = toParametricAngle((startAngle - xAxisRotation), rx, ry)
                    endAngle = toParametricAngle((endAngle - xAxisRotation), rx, ry)

                    // recalculate parametrized delta
                    let deltaAngle_param = endAngle - startAngle;

                    let signChange = deltaAngle > 0 && deltaAngle_param < 0 || deltaAngle < 0 && deltaAngle_param > 0;

                    //deltaAngle = xAxisRotation>0 ? endAngle- startAngle: deltaAngle;
                    deltaAngle = signChange ? deltaAngle : deltaAngle_param;

                    // adjust end angle
                    if (sweep && startAngle > endAngle) {
                        endAngle += Math.PI * 2
                    }

                    if (!sweep && startAngle < endAngle) {
                        endAngle -= Math.PI * 2
                    }
                    comLen = getEllipseLengthLG(rx, ry, startAngle, endAngle, waArr)
                }
            }

            else {
                comLen = getLength(pts, {
                    t: 1,
                    waArr
                })
            }
            len += comLen;
        })
    }

    return len;
}
