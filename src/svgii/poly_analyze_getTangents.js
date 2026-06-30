import { adjustTangentAngle } from "../poly-fit-curve-schneider_check_bulge";
import { getPolyBBox } from "./geometry_bbox";
import { renderPoint } from "./visualize";

export function getTangents(pts = [], {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    debug = false,
    closed=false,
} = {}) {

    let l = pts.length;

    // bounding box of this sub poly
    if (!width || !height) {
        ({ x, y, width, height } = getPolyBBox(pts));
    }

    //console.log(polyArea);
    let thresh = (width + height) * 0.01;

    // threshold for horizontal or vertical detection
    //let thresh2 = thresh * 0.5


    for (let i = 0; i < l; i++) {
        let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];
        let p3 = i < l - 1 ? pts[i + 2] : pts[l - 1];

        let { isHorizontal, isVertical, isCorner, isLong, isExtreme, isSemiExtreme, isDirChange } = p1



        // default
        let tangentL = { x: p1.x - p1.dx2 * 0.5, y: p1.y - p1.dy2 * 0.5 }
        let tangentR = { x: p1.x + p1.dx2 * 0.5, y: p1.y + p1.dy2 * 0.5 }


        // average first tangent
        if(i===0){
            tangentR = adjustTangentAngle(p2, p1, p2, p3)
        }


        /**
         * add left and right tangents
         * for later curve fitting
         */

        if (isHorizontal && !isCorner) {
            tangentL = { x: p1.x - p1.dx2*0.5, y: p1.y }
            tangentR = { x: p1.x + p1.dx2*0.5, y: p1.y }
        }
        else if (isVertical) {
            tangentL = { x: p1.x , y: p1.y - p1.dy2*0.5 }
            tangentR = { x: p1.x , y: p1.y + p1.dy2*0.5 }
        }


        if (!isExtreme && p1.isLong) {
            tangentL = { x: p1.x - p1.dx*0.5, y: p1.y - p1.dy*0.5 }
            tangentR = { x: p1.x + p1.dx*0.5, y: p1.y + p1.dy*0.5 }
        }


        /*
        //isDirChange && !isCorner && !isHorizontal && !isVertical
        if (isDirChange && !isCorner && !isExtreme) {
            p1.tangentL = { x: p1.x-p1.dx2*0.5, y: p1.y-p1.dy2*0.5 }
            p1.tangentR = { x: p1.x+p1.dx2*0.5, y: p1.y+p1.dy2*0.5 }
        }
        */

        if (isCorner) {

            tangentL = {x:p0.x, y:p0.y}
            tangentR = {x:p2.x, y:p2.y}

            //let p0_1 = pts[i - 2] ? pts[i - 2] : pts[l - 2]
            let p0_1 = pts[i - 2] ? pts[i - 2] : pts[l - 1]
            //let p2_1 = pts[i + 2] ? pts[i + 2] : pts[l - 2]
            let p2_1 = pts[i + 2] ? pts[i + 2] : pts[1]

            // adjust angle
            if (!p0.isCorner) {
                tangentL = adjustTangentAngle(p0, p1, p0, p0_1)
            }

            if (!p2.isCorner) {
                tangentR = adjustTangentAngle(tangentR, p1, p2, p2_1)
            }

            /*
            renderPoint(markers, p0, 'darkblue', '0.75%', '0.5')
            // renderPoint(markers, p0_1, 'blue', '0.5%')
            renderPoint(markers, tangentL, 'blue', '0.5%', '0.5')
            renderPoint(markers, tangentR, 'blue', '0.5%', '0.5')
            */

        }

        p1.tangentL = tangentL
        p1.tangentR = tangentR


        //console.log('t', p1.tangentL, p1.tangentR);

        /*
         debug = true
         if(debug){
             if (isCorner || isSemiExtreme || isDirChange || isExtreme) {
                 renderPoint(markers, p1.tangentL, 'darkred', '0.5%')
                 renderPoint(markers, p1.tangentR, 'darkblue', '0.5%')
             }
         }
        */


    }

}