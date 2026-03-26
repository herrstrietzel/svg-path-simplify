/**
 * fix sub path directions
 * pathdata must be be normalized to
 * absolute and longhand commands
 * toClockwise = force default direction
 */

import { isPointInPolygon } from "./geometry";
import { getPolygonArea } from "./geometry_area";
import { getPolyBBox } from "./geometry_bbox";
import { reversePathData } from "./pathData_reverse";
import { getPathDataPolyPrecise } from "./pathData_toPolygon";
import { renderPoint, renderPoly } from "./visualize";

export function fixPathDataDirections(pathDataArr = [], toClockwise = false) {

    let polys = []

    pathDataArr.forEach((sub, i) => {
        let pathData = sub.pathData
        //console.log('sub', pathData);
        let vertices = getPathDataPolyPrecise(pathData)
        let area = getPolygonArea(vertices)
        let isClockwise = area >= 0
        polys.push({ pts: vertices, bb: getPolyBBox(vertices), cw: isClockwise, index: i, inter: 0, includes: [], includedIn: [] })
    })

    // check poly intersections
    let l = polys.length;
    for (let i = 0; i < l; i++) {
        let prev = polys[i]
        let bb0 = prev.bb

        for (let j = 0; j < l; j++) {

            let poly = polys[j]
            let bb = poly.bb

            // skip if the same poly or parent
            if (i === j || poly.includes.includes(i)) continue

            // if mid point is in previous polygon
            let ptMid = { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }
            let inPoly = isPointInPolygon(ptMid, prev.pts, bb0)


            if (inPoly) {
                polys[j].inter += 1
                poly.includedIn.push(i)
                prev.includes.push(j)
            }
        }
    }


    // reverse paths
    for (let i = 0; i < l; i++) {

        let poly = polys[i]
        let { cw, includedIn, includes } = poly

        // outer path direction to counter clockwise
        if (!includedIn.length && cw && !toClockwise
            || !includedIn.length && !cw && toClockwise
        ) {
            //console.log('reverse outer');

            pathDataArr[i].pathData = reversePathData(pathDataArr[i].pathData);
            polys[i].cw = polys[i].cw ? false : true
            cw = polys[i].cw

        }

        // reverse inner sub paths
        for (let j = 0; j < includes.length; j++) {
            let ind = includes[j];
            let child = polys[ind];

            if (child.cw === cw) {
                //console.log('reverse', child.cw, cw);
                pathDataArr[ind].pathData = reversePathData(pathDataArr[ind].pathData);
                polys[ind].cw = polys[ind].cw ? false : true
            }
        }
    }

    return pathDataArr

}