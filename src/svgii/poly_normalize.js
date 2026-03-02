export function normalizePoly(pts, {
    toObject = true,
    toArray = false,
    flatten = false
} = {}) {

    if (flatten) pts = pts.flat(2);
    let poly = toArray ? polyPtsToArray(pts) : polyArrayToObject(pts)
    return poly
}


export function polyArrayToObject(pts) {

    // is point object array
    if (pts[0].x !== undefined && pts[0].y !== undefined) return pts

    let poly = [];

    // complex poly object array
    if (Array.isArray(pts[0]) && pts[0][0].x !== undefined && pts[0][0].y !== undefined) {
        return pts
    }
    // complex poly value array
    else if (Array.isArray(pts[0][0]) && pts[0][0].length === 2) {
        pts.forEach(sub => {
            poly.push(sub.map(pt => { return { x: pt[0], y: pt[1] } }))
        })
        return poly
    }

    return pts.map(pt => { return { x: pt[0], y: pt[1] } })
}


export function polyPtsToArray(pts) {

    // is already coordinate array
    if (!Array.isArray(pts[0][0]) && pts[0].length === 2) return pts

    let poly = [];
    if (Array.isArray(pts[0][0]) && pts[0][0].length === 2) {
        pts.forEach(sub => {
            poly.push(sub.map(pt => [pt.x, pt.y]))
        })
        return poly
    }

    poly = Array.from(pts).map(pt => [pt.x, pt.y])
    return poly
}