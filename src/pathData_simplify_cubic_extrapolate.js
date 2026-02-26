import { checkLineIntersection, getAngle, getDistAv, getSquareDistance, interpolate, pointAtT, rotatePoint } from "./svgii/geometry";
import { getPathArea } from "./svgii/geometry_area";
import { pathDataToD } from "./svgii/pathData_stringify";
import { renderPath, renderPoint } from "./svgii/visualize";

export function getCombinedByDominant(com1, com2, maxDist = 0, tolerance = 1, debug = false) {

    // cubic Bézier derivative
    const cubicDerivative = (p0, p1, p2, p3, t) => {
        let mt = 1 - t;

        return {
            x:
                3 * mt * mt * (p1.x - p0.x) +
                6 * mt * t * (p2.x - p1.x) +
                3 * t * t * (p3.x - p2.x),
            y:
                3 * mt * mt * (p1.y - p0.y) +
                6 * mt * t * (p2.y - p1.y) +
                3 * t * t * (p3.y - p2.y)
        };
    }

    // if combining fails return original commands
    let commands = [com1, com2]

    // detect dominant 
    let dist1 = getDistAv(com1.p0, com1.p)
    let dist2 = getDistAv(com2.p0, com2.p)

    let reverse = dist1 > dist2;

    // backup original commands
    let com1_o = JSON.parse(JSON.stringify(com1))
    let com2_o = JSON.parse(JSON.stringify(com2))

    let ptI = checkLineIntersection(com1_o.p0, com1_o.cp1, com2_o.p, com2_o.cp2, false)

    if (!ptI) {
        //renderPoint(markers, com1.p, 'purple')
        //console.log('nope');
        return commands
    }


    if (reverse) {
        let com2_R = {
            p0: { x: com1.p.x, y: com1.p.y },
            cp1: { x: com1.cp2.x, y: com1.cp2.y },
            cp2: { x: com1.cp1.x, y: com1.cp1.y },
            p: { x: com1.p0.x, y: com1.p0.y },
        }

        let com1_R = {
            p0: { x: com2.p.x, y: com2.p.y },
            cp1: { x: com2.cp2.x, y: com2.cp2.y },
            cp2: { x: com2.cp1.x, y: com2.cp1.y },
            p: { x: com2.p0.x, y: com2.p0.y },
        }

        com1 = com1_R;
        com2 = com2_R;
    }


    let add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
    let sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    let mul = (a, s) => ({ x: a.x * s, y: a.y * s });
    let dot = (a, b) => a.x * b.x + a.y * b.y;


    // estimate extrapolation parameter t0

    let B0 = com2.p0;
    let D0 = cubicDerivative(
        com2.p0,
        com2.cp1,
        com2.cp2,
        com2.p,
        0
    );

    let v = sub(com1.p0, B0);

    // first-order projection onto tangent
    let t0 = dot(v, D0) / dot(D0, D0);


    // refine with one Newton iteration (optional but cheap)
    let P = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], t0);
    let dP = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, t0);
    let r = sub(P, com1.p0);

    //let t0_2 = t0 - dot(r, dP) / dot(dP, dP);

    t0 -= dot(r, dP) / dot(dP, dP);

    // construct merged cubic over [t0, 1]
    let Q0 = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], t0);
    let Q3 = com2.p;

    let d0 = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, t0);
    let d1 = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, 1);

    let scale = 1 - t0;

    let Q1 = add(Q0, mul(d0, scale / 3));
    let Q2 = sub(Q3, mul(d1, scale / 3));

    let result = {
        p0: Q0,
        cp1: Q1,
        cp2: Q2,
        p: Q3,
        t0
    };


    if (reverse) {
        result = {
            p0: Q3,
            cp1: Q2,
            cp2: Q1,
            p: Q0,
            t0
        }
    }


    let tMid = (1 - t0) * 0.5;
    //tMid = (1 +t0) * 0.5;
    let tSplit = t0 - 1;
    //tMid = 0.5;

    //console.log(1 - t0);


    let ptM = pointAtT([result.p0, result.cp1, result.cp2, result.p], tMid, false, true)
    let seg1_cp2 = ptM.cpts[2]
    //let seg2_cp1 = ptM.cpts[3]

    let ptI_1 = checkLineIntersection(ptM, seg1_cp2, result.p0, ptI, false)
    let ptI_2 = checkLineIntersection(ptM, seg1_cp2, result.p, ptI, false)


    //let tscale =(1 + t0)
    //console.log('tscale', tscale);
    let cp1_2 = interpolate(result.p0, ptI_1, 1.333  )
    let cp2_2 = interpolate(result.p, ptI_2, 1.333  )

    // test self intersections and exit 
    let cp_intersection = checkLineIntersection(com1_o.p0, cp1_2, com2_o.p, cp2_2, true)
    if (cp_intersection) {
        //renderPoint(markers, cp_intersection )
        return commands;
    }

    //if (debug) renderPoint(markers, ptM, 'purple')

    result.cp1 = cp1_2
    result.cp2 = cp2_2


    // check distances between original starting point and extrapolated
    let dist3 = getDistAv(com1_o.p0, result.p0)
    let dist4 = getDistAv(com2_o.p, result.p)
    let dist5 = (dist3 + dist4)

    // use original points
    result.p0 = com1_o.p0
    result.p = com2_o.p
    result.extreme = com2_o.extreme
    result.corner = com2_o.corner
    result.dimA = com2_o.dimA
    result.directionChange = com2_o.directionChange
    result.type = 'C'
    result.values = [result.cp1.x, result.cp1.y, result.cp2.x, result.cp2.y, result.p.x, result.p.y]


    // extrapolated starting point is not completely off
    if (dist5 < maxDist) {

        /*
        let tTotal = 1 + Math.abs(t0);
        let tSplit = reverse ? 1 + t0 : Math.abs(t0);
        //tSplit = reverse ? 1 + t0 : Math.abs(t0) / tTotal;
        //console.log('t0', t0, tMid, 'tSplit', tSplit);

        let pO = pointAtT([com2_o.p0, com2_o.cp1, com2_o.cp2, com2_o.p], t0);
*/

        // split t to meet original mid segment start point
        let tSplit = reverse ? 1 + t0 : Math.abs(t0);

        let tTotal = 1 + Math.abs(t0);
        tSplit = reverse ? 1 + t0 : Math.abs(t0) / tTotal;


        //console.log('t0', t0, tMid, 'tSplit', tSplit);

        let ptSplit = pointAtT([result.p0, result.cp1, result.cp2, result.p], tSplit);
        let distSplit = getDistAv(ptSplit, com1.p)
        //console.log('distS', distS, maxDist );

        // not close enough - exit
        if (distSplit > maxDist * tolerance ) {
            //renderPoint(markers, ptSplit, 'cyan', '1%')
            //renderPoint(markers, com1.p, 'red', '0.5%')
            return commands;
        }


        // compare combined with original area
        let pathData0 = [
            { type: 'M', values: [com1_o.p0.x, com1_o.p0.y] },
            { type: 'C', values: [com1_o.cp1.x, com1_o.cp1.y, com1_o.cp2.x, com1_o.cp2.y, com1_o.p.x, com1_o.p.y] },
            { type: 'C', values: [com2_o.cp1.x, com2_o.cp1.y, com2_o.cp2.x, com2_o.cp2.y, com2_o.p.x, com2_o.p.y] },
        ];

        let area0 = getPathArea(pathData0)
        let pathDataN = [
            { type: 'M', values: [result.p0.x, result.p0.y] },
            { type: 'C', values: [result.cp1.x, result.cp1.y, result.cp2.x, result.cp2.y, result.p.x, result.p.y] },
        ]

        let areaN = getPathArea(pathDataN)
        let areaDiff = Math.abs(areaN / area0 - 1)

        result.error = areaDiff * 5 * tolerance;
        //result.error = areaDiff + dist5;

        //debug=true;


        if (debug) {
            let d = pathDataToD(pathDataN)
            //renderPath(markers, d, 'orange')
        }

        // success!!!
        if (areaDiff < 0.05 * tolerance) {
            commands = [result];
            //console.log('areaDiff', areaDiff);
        } 
    }


    //console.log(commands);

    return commands

}

