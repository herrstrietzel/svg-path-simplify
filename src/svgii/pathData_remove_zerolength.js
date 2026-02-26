
/*
// remove zero-length segments introduced by rounding
export function removeZeroLengthLinetos_post(pathData) {
    let pathDataOpt = []
    pathData.forEach((com, i) => {
        let { type, values } = com;
        if (type === 'l' || type === 'v' || type === 'h') {
            let hasLength = type === 'l' ? (values.join('') !== '00') : values[0] !== 0
            if (hasLength) pathDataOpt.push(com)
        } else {
            pathDataOpt.push(com)
        }
    })
    return pathDataOpt
}
*/

export function removeZeroLengthLinetos(pathData) {

    let M = { x: pathData[0].values[0], y: pathData[0].values[1] }
    let p0 = M
    let p = p0

    let pathDataN = [pathData[0]]

    for (let c = 1, l = pathData.length; c < l; c++) {
        let com = pathData[c];
        let comPrev = pathData[c-1] 
        let comNext = pathData[c+1] || null
        let { type, values } = com;

        // zero length segments are simetimes used in icons for dots
        let isDot = comPrev.type.toLowerCase() ==='m' && !comNext;

        let valsLen = values.length;
        p = { x: values[valsLen-2], y: values[valsLen-1] };

        // skip lineto
        if (!isDot && type === 'L' && p.x === p0.x && p.y === p0.y) {
            continue
        }

        // skip minified zero length
        if (!isDot && (type === 'l' || type === 'v' || type === 'h')) {
            let noLength = type === 'l' ? (values.join('') === '00') : values[0] === 0;
            if(noLength) continue
        } 

        pathDataN.push(com)
        p0 = p;
    }


    return pathDataN

}