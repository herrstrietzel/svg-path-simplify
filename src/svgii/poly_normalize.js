export function normalizePoly(pts, {
    toObject = true,
    toArray = false,
    flatten = false
} = {}) {


    // is stringified flat point attribute
    if (typeof pts === 'string' && !isNaN(pts[0])) {
        pts = toPointArray(pts.split(/,| /).filter(Boolean).map(Number));
        return pts
    }

    if (pts.length && typeof pts[0] === 'string') {
        pts = pts.map(pt => {
            return toPointArray(pt.split(/,| /).filter(Boolean).map(Number))
        });
        pts = pts.flat(2)
        //console.log(pts);
    }


    if (flatten) pts = pts.flat(2);


    let poly = toArray ? polyPtsToArray(pts) : polyArrayToObject(pts)
    return poly
}


export function polyArrayToObject(pts = []) {
    //console.log(pts);
    if (!pts.length) return [];
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

    else if (pts.length > 3) {
        pts = toPointArray(pts)
        return pts
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

// convert flat point value array to point object array
export function toPointArray(pts) {
    let ptArr = [];

    if (pts[0].length === 2) {
        for (let i = 0, l = pts.length; i < l; i++) {
            let pt = pts[i]
            ptArr.push({ x: pt[0], y: pt[1] });
        }

    } else {
        for (let i = 1, l = pts.length; i < l; i += 2) {
            ptArr.push({ x: pts[i - 1], y: pts[i] });
        }
    }
    return ptArr;
};