export function pathDataFromPoly(pts, closed=true){

    let pathData = [
        { type: 'M', values: [pts[0].x, pts[0].y] },
        ...pts.slice(1).map(pt => { return { type: 'L', values: [pt.x, pt.y] } })
    ];

    if(closed) pathData.push({type:'Z', values:[]})

    return pathData

}