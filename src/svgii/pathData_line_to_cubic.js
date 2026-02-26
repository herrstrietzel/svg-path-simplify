import { interpolate } from "./geometry";

export function pathDataLineToCubic(pathData) {

    for (let c = 1, l = pathData.length; c < l; c++) {
        let com = pathData[c]
        let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;
        if (type === 'L') {

            let cp1 = interpolate(p0, p, 0.333)
            let cp2 = interpolate(p, p0, 0.333)

            pathData[c].type = 'C'
            pathData[c].values = [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y]
            pathData[c].cp1 = cp1
            pathData[c].cp2 = cp2

        }
    }
    return pathData
}
