export function pathDataFromPoly(pts, closed = true) {

    let pathData = []
    let subPath = []


    // complex polygon
    if (Array.isArray(pts[0])) {
        pts.forEach(sub => {            
            subPath = [
                { type: 'M', values: [sub[0].x, sub[0].y] },
                ...sub.slice(1).map(pt => { return { type: 'L', values: [pt.x, pt.y] } })
            ];
            pathData.push(...subPath)
        })
    }else{
        pathData = [
            { type: 'M', values: [pts[0].x, pts[0].y] },
            ...pts.slice(1).map(pt => { return { type: 'L', values: [pt.x, pt.y] } })
        ];
    }

    if (closed) pathData.push({ type: 'Z', values: [] })
    return pathData

}

