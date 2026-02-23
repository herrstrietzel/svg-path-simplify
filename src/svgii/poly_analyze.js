import { rad2Deg } from "../constants";
import { simplifyRDP } from "../simplify_poly_RDP";
import { simplifyRD } from "../simplify_poly_radial_distance";
import { checkLineIntersection, getAngle, getDeltaAngle, getDeltaAngle2, getDistManhattan, getPointOnEllipse, getSquareDistance, pointAtT, reducePoints, rotatePoint } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { getPolyBBox } from "./geometry_bbox";
import { pathDataFromPoly } from "./pathData_fromPoly";
import { pathDataToD } from "./pathData_stringify";
import { renderPath, renderPoint, renderPoly } from "./visualize";


export function analyzePoly(pts, {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    debug = false
} = {}) {

    let l = pts.length;
    //let polyArea = getPolygonArea(pts, true)

    //let bb0 = {x:0, y:0,  width:0, height:0}

    // bounding box of this sub poly
    let bb0 = getPolyBBox(pts);


    if (!width || !height) {
        ({ x, y, width, height } = bb0);
    }

    //console.log(polyArea);
    let thresh = (width + height) * 0.01

    //console.log(thresh);

    // get areas
    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        let area = getPolygonArea([p0, p1, p2], false);
        p1.area = area;
        p1.dist = getDistManhattan(p0, p1)
        //pts[i] = p1
    }

    // pts= pts.reverse();

    let remove = []

    for (let i = 0; i < l; i++) {
        let p02 = i > 1 ? pts[i - 2] : pts[l - 1];
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];


        let bb = getPolyBBox([p0, p2]);
        let max = getSquareDistance(p0, p2) * 0.01

        let area0 = Math.abs(p0.area)
        let area1 = Math.abs(p1.area)
        let area2 = Math.abs(p2.area)
        let isCloseExtreme = false
        let isCorner = false;


        let flat = !p1.area || area1 < thresh


        //console.log(bb);
        let { left, right, top, bottom } = bb;

        // is local or absolute extreme
        let extremeLocal = (p1.x <= left || p1.x >= right || p1.y <= top || p1.y >= bottom)


        let isExtreme = (
            // extremeLocal ||
            (p1.x === bb0.left || p1.x === bb0.right || p1.y === bb0.top || p1.y === bb0.bottom)
        );


        let dist = getDistManhattan(p1, p0)
        let isNear = dist < thresh * 5



        //let isHorizontal = !pt0.isHorizontal ? pt1.y === pt0.y && pt1.x!== pt0.x : false;
        let isHorizontal = p1.y === p0.y && p1.x !== p0.x;
        let isVertical = p1.x === p0.x && p1.y !== p0.y


        //!isCloseExtreme &&
        if ((isHorizontal || isVertical)) {
            isExtreme = true
        }

        //let area0 = p02.area + p0.area
        //let area1 = p1.area + p2.area

        let signChange = (p0.area < 0 && p1.area > 0) || (p0.area > 0 && p1.area < 0)
        let isDirChange = signChange && !flat
        isCorner = isDirChange

        // isDirChange = signChange && signChange3

        if (extremeLocal && !p0.isDirChange) {
            //renderPoint(markers, p0, 'red', '0.75%', '1')
            //renderPoint(markers, p1, 'blue', '0.75%', '1')
            //p1.isDirChange=false
            isExtreme = true;
        }



        //|| (p0.isVertical || p1.isHorizontal )
        //|| (p0.isVertical || isHorizontal ) 
        if ((isVertical && p0.isHorizontal)) {
            //renderPoint(markers, p0, 'red', '2%', '1')
            p0.isCorner = true
            p0.isExtreme = false
            isExtreme = false
        }


        /*
        if (isExtreme && p0.isExtreme && signChange && isNear) {
            //console.log(p0);
            //renderPoint(markers, p1, 'red', '2%', '1')
            isCorner = true
        }
        */

        /*
        //nearby extremes
        if (isExtreme && p0.isExtreme) {
            let dist = getDistManhattan(p1, p0)
            if (dist < thresh * 5) {
                //p0.isExtreme = true
                p1.isExtreme = false
                isExtreme=false
                isCloseExtreme = true
                remove.push(i)
            }

        }
        */


        // reset if 2 in sequence
        if (isDirChange && (p0.isDirChange || p0.isExtreme)) {
            isDirChange = false
            p1.isDirChange = false
        }




        /*
        let areaChange = area2*1.5<area1 && area0*1.5<area1;
        if(areaChange){
            //renderPoint(markers, p1, 'red', '1.75%', '1')
        }
        */



        /*
        let thresh2 = (width + height) * 0.01
        let isLong = p1.dist > thresh2
        console.log('thresh2', p1.dist, thresh2, thresh);

        if( isLong && isDirChange){
            renderPoint(markers, p0, 'red', '1.75%', '1')
            renderPoint(markers, p1, 'green', '1.75%', '1')
        }
        */

        // corner after extreme
        if (p0.isExtreme && area1 > area2 && !isDirChange && !p1.isHorizontal) {
        }


        // refine corner check
        /*
        if (isCorner) {
            let delta = getDeltaAngle(p1, p0, p2)
            delta = Math.abs(delta.deltaAngleDeg)
            if (delta > 160) {
                //renderPoint(markers, p1, 'blue', '2.75%', '1')
                isCorner = false;
            } else {
                isCorner = true;
            }
            console.log(delta);
        }
        */


        if ((isExtreme || signChange || area1 > area0)) {

            let delta = getDeltaAngle(p1, p2, p0)
            let { deltaAngleDeg } = delta
            deltaAngleDeg = Math.abs(deltaAngleDeg)


            // not a corner
            if (deltaAngleDeg < 3 || deltaAngleDeg > 160) {
                //renderPoint(markers, p1, 'blue', '2.75%', '1')
                isCorner = false;
            }
            else {
                //console.log(deltaAngleDeg, delta);
                isCorner = true;
            }
        }

        if (isHorizontal) {
            //renderPoint(markers, p1, 'blue', '2.75%', '1')

        }


        p1.isCorner = isCorner;
        p1.isExtreme = isExtreme;
        p1.isHorizontal = isHorizontal;
        p1.isVertical = isVertical;
        p1.isDirChange = isDirChange;

    }



    // filter adjacent extremes
    let pts1 = []
    let exclude = []

    for (let i = 0; i < pts.length; i++) {
        let p = pts[i]
        let p1 = pts[i + 1] || null
        let p2 = pts[i + 2] || null

        let extremes = []


        if (p1 && p1.isExtreme && p.isExtreme && !p.isCorner) {
            let has2nd = p1.dist < thresh * 2 && !p1.isCorner
            let has3rd = p2 && p2.isExtreme && p2.dist < thresh * 2 && !p2.isCorner
            let lastExt = p1

            if (has2nd && !has3rd) {
                extremes.push(p, p1)
                //renderPoint(markers, p1, 'magenta', '1%', '0.5')
            } else if (has3rd) {
                extremes.push(p, p1, p2)
                /*
                renderPoint(markers, p, 'green', '1%', '0.5')
                renderPoint(markers, p1, 'red', '1%', '0.5')
                renderPoint(markers, p2, 'blue', '1%', '0.5')
                */
            }

            if (extremes.length) {
                // average extreme
                //console.log(extremes);
                let x = extremes.reduce((a, b) => a + b.x, 0) / extremes.length
                let y = extremes.reduce((a, b) => a + b.y, 0) / extremes.length

                ///extremes.length
                p.x = x
                p.y = y
                //console.log(x);
                i += extremes.length - 1
            }
        }

        if (p.isExtreme || p.isCorner || p.isDirChange) {
            exclude.push(pts1.length)
        }


        pts1.push(p)
    }

    // remove last nearby extreme
    let l2 = pts1.length;
    let p0 = pts1[0]
    let pL = pts1[l2 - 1]
    let near0 = getDistManhattan(p0, pL) < thresh * 2
    if (p0.isExtreme && pL.isExtreme && near0) {
        pL.x = p0.x
        pL.y = p0.y
    }


    //console.log(exclude);
    //pts1 = simplifyRD(pts1, {quality:0.7, exclude})

    // simplify via RDP - exclude extremes
    //pts1 = simplifyRDP(pts1, {quality:0.85, exclude})

    /*
    pts1.forEach(pt=>{
        renderPoint(markers, pt, 'green', '1%', '0.5')
    })
    */

    pts = pts1
    //console.log(pts1);

    // test render
    //renderPolyTopology(pts)
    //return pathDataFromPoly(pts)

    return pts
}


// split in chunks based on significant points

export function getPolyChunks(pts,
    { closed = true,
        keepCorners = true,
        keepExtremes = true,
        keepInflections = false
    } = {}
) {
    let chunks = [];
    let chunk = [pts[0]];

    let l = pts.length

    // render
    for (let i = 1; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        chunk.push(p1)

        // start new chunk
        if (i > 0 && 
            (keepExtremes && p2.isExtreme || keepCorners && p2.isCorner)
            ) {
            chunks.push(chunk)
            chunk = []
        }

        //else if(!keepExtremes && !keepExtremes){}
    }

    // chunk is empty - extremes or corners
    if(!chunks.length && pts.length>1){
        chunks = [pts]
    }

    //console.log(keepExtremes, keepCorners, chunks, pts);

    // test render
    //renderchunks(chunks)

    return chunks;
}

function renderchunks(chunks) {

    //console.log('renderchunks', chunks);

    chunks.forEach((chunk, i) => {

        let stroke = i % 2 === 0 ? 'orange' : 'blue';
        let pathData = [{ type: 'M', values: [chunk[0].x, chunk[0].y] }]
        let d = `M`

        chunk.forEach(pt => {

            pathData.push({ type: 'L', values: [pt.x, pt.y] })
            d += ` ${[pt.x, pt.y].join(' ')}`

        })

        d = pathDataToD(pathData)
        //console.log(d);

        renderPath(markers, d, stroke, '2%', '0.5')
    })

}

// just for visualization
function renderPolyTopology(pts) {

    let l = pts.length
    // render
    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];


        renderPoly(markers, [p0, p1, p2], '0.5%', 'none', (p1.area > 0 ? 'green' : 'blue'), true)


        if (p1.isDirChange) {
            renderPoint(markers, p1, 'orange', '1%', '0.75')
        }


        if (p1.isExtreme) {
            renderPoint(markers, p1, 'cyan', '1%', '0.5')
        }

        if (p1.isHorizontal) {
            //renderPoint(markers, p1, 'blue', '0.5%', '0.75')
        }

        if (p1.isVertical) {
            //renderPoint(markers, p1, 'purple', '0.5%', '0.5')
        }



        if (p1.isCorner) {
            renderPoint(markers, p1, 'magenta', '1%', '1')
        }

        //pts[i] = p1
    }

}

export function analyzePoly2(pts, debug = false) {

    let l = pts.length;
    let polyArea = getPolygonArea(pts, true)
    let bb0 = getPolyBBox(pts)
    //console.log(polyArea);


    // get areas 
    for (let i = 0; i < l; i++) {
        let pt0 = i > 0 ? pts[i - 1] : null;
        let pt1 = pts[i];
        let pt2 = i < l - 1 ? pts[i + 1] : null;

        if (!pt0 || !pt2) continue

        let area = getPolygonArea([pt0, pt1, pt2], false);
        let ang1 = getAngle(pt1, pt0, true);
        let ang2 = getAngle(pt1, pt2, true);
        let delta = Math.abs(ang1 - ang2);
        let deltaDeg = delta * 180 / Math.PI;

        //console.log(bb0);

        /**
         * get local extremes
         * my coincide with corners or
         * direction changes
         */
        let { left, right, top, bottom } = getPolyBBox([pt0, pt2]);
        let isExtreme = ((pt1.x < left || pt1.x > right || pt1.y < top || pt1.y > bottom) ||
            (pt1.x === bb0.left || pt1.x === bb0.right || pt1.y === bb0.top || pt1.y === bb0.bottom)
        );
        //let isHorizontal = !pt0.isHorizontal ? pt1.y === pt0.y && pt1.x!== pt0.x : false;
        let isHorizontal = pt1.y === pt0.y && pt1.x !== pt0.x;
        let isVertical = pt1.x === pt0.x && pt1.y !== pt0.y

        if (pt0.isHorizontal) {
            //isHorizontal=false
            //renderPoint(markers, pt0)
        }


        /**
         * check corners by  
         * adjacent angle differences
         */
        let isCorner = deltaDeg < 120 || deltaDeg > 270;


        /**
         * get direction changes
         * e.g the spine of a "S" shape
         */
        let directionChange = pt0.isCorner === false && ((pt0.area < 0 && area > 0) || (pt0.area > 0 && area < 0));



        if (pt0.isExtreme &&
            (pt1.y === pt0.y || pt1.x === pt0.x)
        ) {
            isExtreme = true;
        }


        if (directionChange && isExtreme) {
            isCorner = true;
        }

        // if segment is too large relative to total area - don't interpret as corner
        let areaRat = Math.abs(area / polyArea);

        if (areaRat > 0.2) {
            isCorner = false;
        }


        /**
         * visualize significant points for 
         * debugging
         */

        /*
        */

        if (debug) {

            if ((isExtreme && isCorner)) {
                //isExtreme = false;
                directionChange = false;
                //isCorner = false;
            }

            if (isHorizontal) {
                renderPoint(markers, pt0, 'blue', '1%', '0.5');
                renderPoint(markers, pt1, 'red', '1%', '0.5');
            }


            if (isVertical) {
                //renderPoint(markers, pt1, 'blue', '2%', '0.5');
            }


            if (isExtreme) {
                renderPoint(markers, pt1, 'cyan', '2%');
            }

            if (isCorner) {
                renderPoint(markers, pt1, 'purple', '0.5%');
            }

            if (directionChange) {
                //renderPoint(markers, pt1, 'orange', '1.5%', '0.5');
            }

        }


        /**
         * save point analysis properties 
         * to point objects
         */
        pt1.isHorizontal = isHorizontal;
        pt1.isVertical = isVertical;
        pt1.isExtreme = isExtreme;
        pt1.isCorner = isCorner;
        pt1.directionChange = directionChange;

        pt1.area = area;
        pt1.delta = delta;
        pt1.deltaDeg = deltaDeg;

    }


    //getControlPoints(pts)


    return pts
}








export function getPathDataChunks(pathData) {

    let chunks = [[]];
    let lastType = 'M'
    let ind = 0;
    let wasExtreme, wasCorner, wasDirectionchange;

    pathData.forEach(com => {

        let { isCorner, isExtreme, directionChange, type } = com;

        if (type !== lastType || wasExtreme || wasCorner || directionChange || wasDirectionchange) {
            chunks.push([])
            ind++
        }
        chunks[ind].push(com)

        wasExtreme = isExtreme
        wasCorner = isCorner
        wasDirectionchange = directionChange;
        lastType = type
    })


    return chunks;

}




/**
 * check whether a polygon is likely 
 * to be closed 
 * or an open polyline 
 */
export function isClosedPolygon(pts, reduce = 24) {

    let ptsR = reducePoints(pts, reduce);
    let { width, height } = getPolyBBox(ptsR);
    //let dimAvg = Math.max(width, height);
    let dimAvg = (width + height) / 2;
    //let closingThresh = (dimAvg / pts.length) ** 2
    let closingThresh = (dimAvg) ** 2
    let closingDist = getSquareDistance(pts[0], pts[pts.length - 1]);

    return closingDist < closingThresh;
}