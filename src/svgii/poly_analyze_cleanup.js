import { rad2Deg } from "../constants";
import { checkLineIntersection, getAngleFromDelta, getDistManhattan, interpolate } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { getPolyBBox } from "./geometry_bbox";
import { renderPoint, renderPoly } from "./visualize";

export function refineAdjacentPolyExtremes(pts = []) {

    let l = pts.length;

    let { x, y, width, height, top, bottom, left, right } = getPolyBBox(pts);
    let threshShort = (width + height) * 0.05;
    let thresh = (width + height) * 0.001;

    let pt0 = pts[0];
    let ptLast = pts[l - 1];


    /**
     * cleanup close path - almost vertical or horizontal
     * average  start and end extremes
     */
    let dx = Math.abs(ptLast.x - pt0.x)
    let dy = Math.abs(ptLast.y - pt0.y)

    if (dy < threshShort || dx < threshShort) {

        if (pt0.isExtreme && !pt0.isCorner) {

            let xAv = (pt0.x + ptLast.x) * 0.5
            let yAv = (pt0.y + ptLast.y) * 0.5

            pt0.x = xAv
            pt0.y = yAv

            ptLast.x = xAv
            ptLast.y = yAv
            ptLast.isExtreme = true;


            if (dy < thresh) {
                ptLast.tangentR.y = pt0.y
                ptLast.tangentL.y = pt0.y

            }
            if (dx < thresh) {
                ptLast.tangentR.x = pt0.x
                ptLast.tangentL.x = pt0.x
            }
        }
    }


    for (let i = 1; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];
        let dist = getDistManhattan(p1, p2)


        let { isHorizontal, isVertical, isCorner, isLong, isExtreme, isSemiExtreme, isDirChange } = p1
        let offset = 0;

        let extremes = []

        /*
        if(isExtreme && p0.isCorner && !isLong && !isCorner){
            isExtreme= false
            p1.isExtreme = false
            p1.isHorizontal = false
            p1.isVertical = false

            continue;
        }
        */


        /*
        if(isExtreme && p2.isCorner && !isLong && !isCorner && dist<threshShort*0.5){
            isExtreme= false
            p1.isExtreme = false
            p1.isHorizontal = false
            p1.isVertical = false

            if(isVertical){
                p2.tangentL.x = p2.x
            }
            if(isHorizontal){
                p2.tangentL.y = p2.y
            }
            continue;
        }
        */


        if (isExtreme && !isCorner && p2.isExtreme) {
            extremes.push(p1);

            for (let j = i + 1; j < l; j++) {
                let p2 = pts[j]
                dist = getDistManhattan(p1, p2)

                if (dist * 0.75 >= threshShort || p2.isCorner || p2.isDirChange) {
                    break
                }
                if (p2.isExtreme && !p2.isDirChange && !p2.isCorner) {
                    extremes.push(p2);
                }
            }

            //extremes = []
            if (extremes.length > 1) {

                //let ptPrev = pts[i - 2]
                //let ptNext = pts[i + extremes.length]

                //renderPoint(markers, ptPrev, 'orange', '2%')
                //renderPoint(markers, ptNext, 'orange', '2%')

                //let lenEx = extremes.length
                //let idxM = Math.ceil(lenEx * 0.5)
                //let extremeMid = extremes[idxM]

                // find best extreme according to angle
                let angleDiffMin = Infinity;
                //let bestMatch = extremes[Math.floor(extremes.length*0.5)];
                let bestMatch = extremes[0];

                
                extremes.forEach(pt => {
                    //renderPoint(markers, pt, 'red', '3%')
                    let angle = Math.abs(getAngleFromDelta(pt.dx2, pt.dy2, false)) * rad2Deg
                    let angleDiff = angle > 160 ? Math.abs(180 - angle) : (angle > 60 ? Math.abs(90 - angle) : angle)
                    pt.angle = angle;
                    pt.angleDiff = angleDiff;

                    if (angleDiff < angleDiffMin) {
                        bestMatch = pt;
                        angleDiffMin = angleDiff
                        //if(!angleDiff) matches.push(pt)

                    }
                })

                //renderPoint(markers, bestMatch, 'red', '4.5%', '0.5')
                //renderPoint(markers, bestMatch, 'blue', '4.5%', '0.5')


                //console.log('matches', bestMatch, extremes);

                let extremes2 = []

                extremes.forEach((pt, i) => {

                    //let isBestMatch = pt.x === bestMatch.x && pt.y === bestMatch.y;
                    let isBestMatch = pt === bestMatch;
                    //renderPoint(markers, bestMatch, 'blue', '4.5%', '0.5')

                    if (isBestMatch) {
                        //extremes2.push(pt)
                        //renderPoint(markers, pt, 'red', '4.5%', '0.5')

                        if (pt.isHorizontal) {
                            pt.tangentL.y = pt.y
                            pt.tangentR.y = pt.y
                        }
                        if (pt.isVertical) {
                            pt.tangentL.x = pt.x
                            pt.tangentR.x = pt.x
                        }
                        //renderPoint(markers, extremes[0], 'brown', '2.5%', '0.5')
                        //renderPoint(markers, extremes[extremes.length - 1], 'magenta', '2.5%', '0.5')
                        // renderPoint(markers, pt, 'green', '3%', '0.5')

                    }
                    else {


                        //console.log('bestMatch', bestMatch);
                        //renderPoint(markers, pt, 'blue', '4.5%', '0.5')


                        if (bestMatch) {

                            if (!isBestMatch && (pt.x === bestMatch.x || pt.y === bestMatch.y)) {
                                extremes2.push(pt)
                            }
                            pt.isExtreme = false
                            pt.isHorizontal = false
                            pt.isVertical = false
                        }


                    }

                })

                // average coordinates
                if (extremes2.length) {
                    bestMatch.x = (extremes2[0].x + bestMatch.x) * 0.5
                    bestMatch.y = (extremes2[0].y + bestMatch.y) * 0.5
                    //pts.splice(extremes2[0].idx, 1)
                }

                //console.log('extremes2', extremes2);
                i += extremes.length
                continue;
            }
        }

    }

}

export function cleanupPolyKeypoints(pts = []) {

    let l = pts.length;

    let { x, y, width, height, top, bottom, left, right } = getPolyBBox(pts);
    //let thresh0 = (width + height) * 0.025;
    let thresh = (width + height) * 0.001;

    let pt0 = pts[0];
    //let ptLast = pts[l - 1];
    let ptsClean = [pt0];

    //renderPoint(markers, ptLast)

    for (let i = 1; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        let { isHorizontal, isVertical, isCorner, isLong, isExtreme, isSemiExtreme, isDirChange } = p1
        let offset = 0;

        if (!isSemiExtreme){
            //ptsClean.push(p1, p2)
            continue
        }

        if (isSemiExtreme || isExtreme) {
            let semiExtremes = isSemiExtreme ? [p1] : [];
            let extremes = isExtreme ? [p1] : [];

            for (let j = i + 1; j < l; j++) {
                let p2 = pts[j]

                if (!p2.isSemiExtreme || p2.isExtreme || p2.isCorner){
                    break
                }
                semiExtremes.push(p2)
            }

            if (semiExtremes.length > 1) {

                //interpolate
                let semiExtremeMid = semiExtremes[Math.floor(semiExtremes.length*0.5)]
                let p1_1 = semiExtremes[0]
                let p2_1 = semiExtremes[semiExtremes.length - 1]
                let ptI = checkLineIntersection(p1_1, p1_1.tangentR, p2_1, p2_1.tangentL, false, true)
                //console.log(ptI);
                //console.log('tangents', p1_1, p1_1.tangentR,  p2_1, p2_1.tangentL);

                //renderPoly(markers, [p1_1, p1_1.tangentR], 'red', '2%')
                semiExtremes.forEach(pt=>{
                    pt.isSemiExtreme=false
                })
                semiExtremeMid.isSemiExtreme=true;

                // interpolate mid point
                if (ptI) {
                    let pI_1 = interpolate(p1_1, ptI, 0.5)
                    let pI_2 = interpolate(p2_1, ptI, 0.5)
                    let pI_3 = interpolate(pI_2, pI_1, 0.5)
                    //renderPoint(markers, pI_3, 'red', '2%')

                    semiExtremeMid.x = pI_3.x
                    semiExtremeMid.y = pI_3.y
                    semiExtremeMid.tangentL = pI_1
                    semiExtremeMid.tangentR = pI_2
                    //p1.idx=i
                    //offset += semiExtremes.length - 1
                    //ptsClean.push(p1)

                    i += offset
                    continue
                } 

                //console.log('semiExtremes', semiExtremes);
            }
        } 

        //p1.idx=i
        ptsClean.push(p1)
        // find significant of same type

    }


    /*
    // update index
    ptsClean.forEach((pt, i) => {
        pt.idx = i
    })
    */
    //console.log('ptsClean', ptsClean);
    //renderPoint(markers, ptsClean[0], 'green', '4%')
    return pts;
    //return ptsClean;
}