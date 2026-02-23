import { checkLineIntersection, getDistManhattan, interpolate, pointAtT } from "./svgii/geometry";
import { renderPoint } from "./svgii/visualize";



export function harmonizeCubicCptsThird(pathData = [], t = 0.666) {

    let l = pathData.length;
    for (let i = 0; i < l; i++) {
        let com = pathData[i]
        let comPrev = pathData[i - 1] || null
        let { type, values } = com
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        let adjust = false;

        //comN && comN.type==='C' &&
        if (type === 'C') {
            let cp1 = { x: values[0], y: values[1] }
            let cp2 = { x: values[2], y: values[3] }
            let valuesL = comPrev.values.slice(-2)
            let p0 = { x: valuesL[0], y: valuesL[1] }
            let p = { x: values[4], y: values[5] }

            let dist0 = getDistManhattan(p0, p)
            let dist1 = getDistManhattan(p0, cp1)
            let dist2 = getDistManhattan(p, cp2)
            let dist3 = getDistManhattan(cp1, cp2)

            let ptIV = checkLineIntersection(p0, cp1, p, cp2, false)


            if (ptIV) {

                // very uneven lengths
                let diff1 = dist1 / dist0
                let diff2 = dist2 / dist0
                let diff3 = diff1 + diff2

                // exact intersection
                let ptI = ptIV ? checkLineIntersection(p0, cp1, p, cp2, true) : null


                // cpts are intersection
                if (ptI) {
                    adjust = true;
                }
                //cpts are very close
                else if (dist3 < dist0 / 5) {
                    adjust = true;
                }
            }


            if (adjust) {
                cp1 = pointAtT([p0, ptIV], t)
                cp2 = pointAtT([p, ptIV], t)
                //renderPoint(markers, ptIV)
                pathData[i].values[0] = cp1.x
                pathData[i].values[1] = cp1.y
                pathData[i].values[2] = cp2.x
                pathData[i].values[3] = cp2.y
            }

        }

    }

    return pathData

}



export function harmonizeCubicCpts(pathData = [], t = 0.666) {


    let l = pathData.length;
    for (let i = 1; i < l; i++) {
        let com = pathData[i]
        let comPrev = pathData[i - 1]
        let { type, values } = com
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        let adjust = false;


        //comN && comN.type==='C' &&
        if (type === 'C') {
            let cp1 = { x: values[0], y: values[1] }
            let cp2 = { x: values[2], y: values[3] }
            let valuesL = comPrev.values.slice(-2)
            let p0 = { x: valuesL[0], y: valuesL[1] }
            let p = { x: values[4], y: values[5] }

            let dist0 = getDistManhattan(p0, p)
            let dist1 = getDistManhattan(p0, cp1)
            let dist2 = getDistManhattan(p, cp2)
            let dist3 = getDistManhattan(cp1, cp2)

            let ptIV = checkLineIntersection(p0, cp1, p, cp2, false)
            let ptI = ptIV ? checkLineIntersection(p0, cp1, p, cp2, true) : null

            // intersection is on tangent vector
            if (ptIV && !ptI) {
                let ptIV2 = interpolate(p, cp2, 3)
                let pI2 = checkLineIntersection(p, ptIV2, p0, cp1, true)

                if (pI2) {
                    adjust = true;
                }
            }



            // very uneven lengths
            let diff1 = dist1 / dist0
            let diff2 = dist2 / dist0
            let diff3 = diff1 + diff2


            if (diff1 < 0.3 && diff2 > 0.4) {
                //console.log(diff1, diff2);

                cp1 = pointAtT([p0, cp1], 1 + t / 2)
                cp2 = pointAtT([p, cp2], t)
                //renderPoint(markers, cp1)
                //renderPoint(markers, cp2, 'magenta')

                //adjust = true;
                pathData[i].values[0] = cp1.x
                pathData[i].values[1] = cp1.y
                pathData[i].values[2] = cp2.x
                pathData[i].values[3] = cp2.y

            }



            // cpts are intersection
            if (ptI) {
                adjust = true;
            }

            //cpts are very close
            else {
                if (ptIV) {
                    if (dist3 < dist0 / 5) {
                        adjust = true;
                    }
                }

            }

            if (adjust) {
                cp1 = pointAtT([p0, ptIV], t)
                cp2 = pointAtT([p, ptIV], t)
                //renderPoint(markers, ptIV)
                pathData[i].values[0] = cp1.x
                pathData[i].values[1] = cp1.y
                pathData[i].values[2] = cp2.x
                pathData[i].values[3] = cp2.y

            }

        }

    }

    return pathData

}