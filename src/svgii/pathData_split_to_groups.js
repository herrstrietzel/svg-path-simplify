import { svgNs } from "../constants";
import { getPathDataVertices, isPointInPolygon } from "./geometry";
import { checkBBoxIntersections, getPolyBBox } from "./geometry_bbox";
import { convertPathData } from "./pathData_convert";
import { pathDataToD } from "./pathData_stringify";
import { roundTo } from "./rounding";
import { renderPoint } from "./visualize";

export function splitCompundGroups(pathDataPlusArr = [], {
    toRelative = true,
    toShorthands = true,
    minifyD = 0,
    decimals = 3,
    addDimensions = false
} = {}) {

    //console.log('???pathDataPlusArr', pathDataPlusArr);
    let pathDataSplit = [];
    pathDataPlusArr = JSON.parse(JSON.stringify(pathDataPlusArr))
    let len = pathDataPlusArr.length;

    //let bb0 = 
    let xArr = [];
    let yArr = []

    // refine bbox and add cpt polygon
    for (let i = 0; i < len; i++) {
        let sub = pathDataPlusArr[i]
        let { pathData, bb } = sub

        // console.log(bb);
        // include control points for better overlapping approximation
        //let poly = getPathDataVertices(pathData, true);
        //let bb2 = getPolyBBox(poly);

        if (bb.width && bb.height) {
        } else {
            let poly = getPathDataVertices(pathData, true);
            bb = getPolyBBox(poly);
            pathDataPlusArr[i].bb = bb;
            //console.log(bb, sub);
        }

        xArr.push(bb.left, bb.right)
        yArr.push(bb.top, bb.bottom)
        sub.includes = []
    }


    /**
     * check overlapping 
     * sub paths
     */
    for (let i = 0, l = pathDataPlusArr.length; i < l; i++) {
        let sub1 = pathDataPlusArr[i];
        let { bb, poly } = sub1;

        for (let j = 0; j < l; j++) {

            let sub1 = pathDataPlusArr[j];
            if (i === j) continue;

            //let [bb1, poly1] = [sub1.bb, sub1.poly];
            let bb1 = sub1.bb;
            //let poly1 = sub1.poly

            // test sample on-path points
            let ptM = { x: bb1.x + bb1.width * 0.5, y: bb1.y + bb1.height * 0.5 };


            let inPoly = false;
            if (ptM.x >= bb.x && ptM.y >= bb.y && ptM.x <= bb.right && ptM.y <= bb.bottom) {
                inPoly = true;
                pathDataPlusArr[i].includes.push(j);
            }

        }
    }


    /**
     * combine overlapping 
     * compound paths
     */
    for (let i = 0, l = pathDataPlusArr.length; i < l; i++) {
        let sub = pathDataPlusArr[i];
        let { includes } = sub;

        includes.forEach(s => {
            let pathData = pathDataPlusArr[s].pathData;
            if (pathData.length) {
                pathDataPlusArr[i].pathData.push(...pathData);
                pathDataPlusArr[s].pathData = [];
            }
        });
    }

    // remove empty els due to grouping
    pathDataPlusArr = pathDataPlusArr.filter(sub => sub.pathData.length);

    // try to find row left to right order
    //pathDataPlusArr = pathDataPlusArr.sort((a, b) => ((a.bb.x + a.bb.y * 3) - (b.bb.x + b.bb.y * 3)))
    //pathDataPlusArr = pathDataPlusArr.sort((a, b) => ((a.bb.x + a.bb.y * 2) - (b.bb.x + b.bb.y * 2)))
    pathDataPlusArr = pathDataPlusArr.sort((a, b) => ((a.bb.x ) - (b.bb.x)))

    // create SVG
    let x = Math.min(...xArr);
    let y = Math.min(...yArr);
    let right = Math.max(...xArr);
    let bottom = Math.max(...yArr);
    let width = right - x;
    let height = bottom - y;

    [x, y, width, height] = [x, y, width, height].map(val => roundTo(val, decimals));

    let dimensionAtts = addDimensions ? `width="${width}" height="${height}"` : ''
    let svgSplit = `<svg ${dimensionAtts} viewBox="${x} ${y} ${width} ${height}" xmlns="${svgNs}">`;

    pathDataPlusArr.forEach(sub => {
        let { pathData } = sub;

        pathData = convertPathData(pathData, { toRelative, toShorthands, decimals });
        let d = pathDataToD(pathData, minifyD);
        svgSplit += `<path d="${d}"/>`;

    });

    svgSplit += '</svg>';

    let splitObj = { pathData: pathDataPlusArr, svg: svgSplit }
    //console.log('splitObj', splitObj);
    return splitObj

}


/*
function checkBBoxIntersections2(bb, bb1) {
    let [x, y, width, height, right, bottom] = [
        bb.x,
        bb.y,
        bb.width,
        bb.height,
        bb.x + bb.width,
        bb.y + bb.height
    ];
    let [x1, y1, width1, height1, right1, bottom1] = [
        bb1.x,
        bb1.y,
        bb1.width,
        bb1.height,
        bb1.x + bb1.width,
        bb1.y + bb1.height
    ];
    let intersects = false;
    //console.log('bb', bb, bb1);
    //console.log();

    if (x < x1 && right > right1 && y < y1 && bottom > bottom1) {
        intersects = true;
    }

    console.log('???', intersects, 'dims', width, height, '2', width1, height1);


    return intersects;
}
*/
