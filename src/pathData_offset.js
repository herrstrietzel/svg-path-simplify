import { findPathDataIntersections } from "./pathData_get_intersections";
import { getParallelPoly } from "./poly-offset";
import { checkLineIntersection, pointAtT } from "./svgii/geometry";
import { getPolygonArea } from "./svgii/geometry_area";
import { pathDataToD } from "./svgii/pathData_stringify";
import { renderPath, renderPoint, renderPoly } from "./svgii/visualize";

export function offsetPathData(pathData = [], strokeWidth = 18, side = top) {

    console.log('offsetPathData');
    //alert('off')

    let pathDataN = [];
    let l = pathData.length;
    let closed = pathData[l - 1].type.toLowerCase() === 'z'

    for (let i = 0; i < l; i++) {
        let comPrev = i > 0 ? pathData[i - 1] : null;
        let com = pathData[i];
        let { type, values, p0, cp1, cp2, p } = com;
        //let comN = com

        if (type === 'C') {

            //split path
            let segments = pointAtT([p0, cp1, cp2, p], 0.5, false, true).segments;
            //console.log(segments);

            let pts = [segments[0].p0];
            segments.forEach(com => {
                let { p0, cp1, cp2, p } = com;

                pts.push(cp1, cp2, p)

            })

            let area = getPolygonArea(pts)
            let sweep = area < 0 ? 0 : 1
            let polyOffset = getParallelPoly(pts, strokeWidth, sweep, closed)
            let { polyTop, polyBottom } = polyOffset
            //console.log(polyOffset);

            com.polyTop = polyTop
            com.polyBottom = polyBottom
            com.t = 0
            com.segs = []
            com.inter = null


            // convert pts to cpts
            let pathData2 = [
                { type: 'M', values: [polyBottom[0].x, polyBottom[0].y] }
            ]

            p0 = polyBottom[0];
            for (let j = 3; j < polyBottom.length; j += 3) {
                let [cp1, cp2, p] = [polyBottom[j - 2], polyBottom[j - 1], polyBottom[j]]
                pathData2.push(
                    { type: 'C', values: [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] }
                )
                com.segs.push({ p0, cp1, cp2, p })
                p0 = p;
            }

            let d = pathDataToD(pathData2);
            renderPath(markers, d, '#ccc')


            if (comPrev && comPrev.polyBottom) {
                let polyprev = comPrev.polyBottom
                console.log(comPrev);
                let pt1 = polyprev[polyprev.length - 1]
                let pt2 = polyprev[polyprev.length - 2]

                let pt3 = polyBottom[0]
                let pt4 = polyBottom[1]

                let ptI = checkLineIntersection(pt4, pt3, pt2, pt1)
                if (ptI) {
                    //console.log(ptI);
                    //comPrev.t = ptI.t2 * 1.2
                    comPrev.segs[comPrev.segs.length - 1].t = ptI.t2 * 1.2

                    comPrev.t = ptI.t2 * 1.2
                    com.t = 1 - ptI.t2 * 1.2
                    com.segs[0].t = 1 - ptI.t2 * 1.2

                    comPrev.inter = ptI
                    //com.inter = ptI

                    //console.log('com.t', com.t);
                }

                // adjust intersection
                // comPrev.polyBottom[polyprev.length-1] = ptI

                polyprev[polyprev.length - 1] = ptI
                polyBottom[0] = ptI


                /*
                renderPoint(markers, pt1, 'purple')
                renderPoint(markers, pt2, 'magenta')
                renderPoint(markers, pt3, 'green')
                renderPoint(markers, pt4, 'cyan')
                renderPoint(markers, ptI, 'red')
                */

            }



        }

        //pathDataN.push(comN)

    }


    //console.log(pathData);

    // convert pts to cpts
    /*
    pathDataN = [
        { type: 'M', values: [pathData[1].polyBottom[0].x, pathData[1].polyBottom[0].y] }
    ]
    */

    pathDataN = [
        { type: 'M', values: [pathData[0].p0.x, pathData[0].p0.y] }
    ]


    console.log(pathData);

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let comN = pathData[i+1] ? pathData[i+1] : null;
        let { type, values, p0 = null, cp1 = null, cp2 = null, p, polyTop = null, polyBottom = null, segs = [], inter = null, t = 0 } = com;

        // has intersection
        if (inter) {

            let s = t > 0.5 ? segs[0] : segs[1]
            let s2 = t > 0.5 ? comN.segs[1] : comN.segs[0]
            //let s2 = 

            console.log('segs', i, segs, s);

            let pd1 = [
                { type: 'M', values: [s.p0.x, s.p0.y] },
                { type: 'C', values: [s.cp1.x, s.cp1.y, s.cp2.x, s.cp2.y, s.p.x, s.p.y] }
            ]

            let pd2 = [
                { type: 'M', values: [s2.p0.x, s2.p0.y] },
                { type: 'C', values: [s2.cp1.x, s2.cp1.y, s2.cp2.x, s2.cp2.y, s2.p.x, s2.p.y] }
            ]


            let d1 = pathDataToD(pd1);
            renderPath(markers, d1, 'purple')

            let d2 = pathDataToD(pd2);
            renderPath(markers, d2, 'orange')


            // find intersections
            let intersections = findPathDataIntersections(pd1, pd2)
            console.log('inter', intersections);

            intersections.forEach(int=>{
                let ptI1=pointAtT(int.cpts1, int.t1)
                let ptI2=pointAtT(int.cpts2, int.t2)

                renderPoint(markers, ptI1, 'orange', '2%')
                renderPoint(markers, ptI2, 'red', '1%')


            })


            //renderPoint(markers, inter)

        }

        pathDataN.push(com)


    }


    //let d = pathDataToD(pathDataN);
    //renderPath(markers, d, 'red')
    //console.log(d);



    return pathDataN
}