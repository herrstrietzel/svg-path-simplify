import { getAngle, getBezierExtremeT, pointAtT, rotatePoint } from "./svgii/geometry";
import { getPolygonArea } from "./svgii/geometry_area";
import { pathDataToD } from "./svgii/pathData_stringify";
import { renderPath, renderPoint, renderPoly } from "./svgii/visualize";


export function checkExtremesInCurve(pts = [], bezCurve) {

    let split = 4;
    let l = pts.length

    // create polygon from curve candidate
    let pt;
    let ptsN = pts;
    let bezierNew = bezCurve

    /**
     * check extremes
     */
    let [p0, cp1, cp2, p] = bezCurve;
    let tEx = getBezierExtremeT([p0, cp1, cp2, p])
    if (tEx.length) {
        //console.log('bezCurve', 'isBulged', isBulged, bezCurve, 'tEx', tEx);

        tEx = tEx.filter(t => t !== 0 && t !== 1)[0]
        if (tEx) {

            let pEx = pointAtT(bezCurve, tEx, false, true)
            let { x, y } = pEx
            //console.log('pEx', pEx, pts);

            let seg1_p0 = p0;
            let seg1_cpt1 = pEx.cpts[0];
            let seg1_cpt2 = pEx.cpts[2];
            let seg1_p = { x, y };


            let seg2_p0 = p0;
            let seg2_cpt1 = pEx.cpts[3];
            let seg2_cpt2 = pEx.cpts[1];
            let seg2_p = p;

            let pathD = [
                { type: 'M', values: [seg1_p0.x, seg1_p0.y] },
                { type: 'C', values: [seg1_cpt1.x, seg1_cpt1.y, seg1_cpt2.x, seg1_cpt2.y, seg1_p.x, seg1_p.y] },
                { type: 'C', values: [seg2_cpt1.x, seg2_cpt1.y, seg2_cpt2.x, seg2_cpt2.y, seg2_p.x, seg2_p.y] },
            ];

   

            bezierNew = [seg1_p0, seg1_cpt1, seg1_cpt2, seg1_p];
            //isBulged = true

        }
    }


    return { isBulged, bezierNew, ptsN };
}



export function areaDeviationTooLarge(pts = [], bezCurve) {

    let split = 4;
    let step = 1 / split;
    let l = pts.length

    // create polygon from curve candidate
    let poly = [bezCurve[0]];
    let pt;
    let ptsN = pts;

    for (let i = 1; i < split; i++) {
        let t = step * i
        pt = pointAtT(bezCurve, t)
        //renderPoint(markers, pt, 'red')
        poly.push(pt);
    }

    poly.push(bezCurve[bezCurve.length - 1]);

    // Original area
    let polyArea = getPolygonArea(pts, true)

    // flat line

    if (!polyArea && pts.length === 2) {
        polyArea = 0.0000001
    }

    //renderPoint(markers, pts[0], 'green')
    //renderPoint(markers, pts[1], 'cyan')

    let curveArea = getPolygonArea(poly, true);
    //let rat = curveArea / polyArea;
    let areaDiff = Math.abs(polyArea - curveArea)

    let rat = areaDiff / polyArea;
    //console.log('rat', rat, curveArea, polyArea);

    let isBulged = rat > 1
    let bezierNew = bezCurve



    if (isBulged) {
        //renderPoint(markers, pts[0], 'green')
        renderPoint(markers, pts[1], 'magenta')
        bezierNew = [pts[0], pts[0], pts[1], pts[1]]
        //return { isBulged, bezierNew };
    } 

    return { isBulged, bezierNew, ptsN };
}



export function adjustTangentAngle(cp, p0, p1, p2) {
    let ang1 = getAngle(p0, p1)
    let ang2 = getAngle(p0, p2)
    let angDiff = (ang2 - ang1)
    //let ang3 = 
    let f = 0.666
    f = 1
    //f=0
    //f=0.75
    //console.log(angDiff);
    cp = rotatePoint(cp, p0.x, p0.y, -angDiff * f)
    return cp
}
