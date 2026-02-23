import { checkLineIntersection, getAngle, getDistManhattan, getDistance, rotatePoint } from "./svgii/geometry";
import { getPathArea, getPolygonArea, getRelativeAreaDiff } from "./svgii/geometry_area";
//import { cubicCommandToArc } from "./svgii/pathData_convert";

export function pathDataCubicsToArc(pathData, { areaThreshold = 2.5 } = {}) {

    for (let c = 0, l = pathData.length; c < l; c++) {
        let com = pathData[c]
        let comN = pathData[c + 1] || null
        let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;

        if (type === 'C' && comN && comN.type === 'C') {
            let comA = cubicCommandToArc(p0, cp1, cp2, p, areaThreshold)
            let comAN = cubicCommandToArc(comN.p0, comN.cp1, comN.cp2, comN.p, areaThreshold)


            if (comA.isArc  && comAN.isArc) {

                let dist = getDistManhattan(p0, comN.p);
                let maxDist = dist * 0.01;
                let dx = Math.abs(comN.p.x - p0.x)
                let dy = Math.abs(comN.p.y - p0.y)

                let horizontal = dy < maxDist && dx > maxDist;
                let vertical = dx < maxDist && dy > maxDist;
                //console.log(comA, comAN, horizontal, vertical);

                let { rx, ry } = comA;
                let area = getPolygonArea([p0, p, comN.p])
                let sweep = area < 0 ? 0 : 1;

                if (vertical || horizontal) {
                    rx = Math.min(rx, comAN.rx)
                    ry = Math.min(ry, comAN.ry)
                    pathData[c] = null;
                    pathData[c + 1].type = 'A';
                    pathData[c + 1].values = [rx, ry, 0, 0, sweep, comN.p.x, comN.p.y];
                    continue
                }
            }
        }
    }

    pathData = pathData.filter(Boolean)

    return pathData

}



export function cubicCommandToArc(p0, cp1, cp2, p, tolerance = 7.5) {

    //console.log(p0, cp1, cp2, p, segArea );
    let com = { type: 'C', values: [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] };
    //let pathDataChunk = [{ type: 'M', values: [p0.x, p0.y] }, com];

    let arcSegArea = 0, isArc = false

    // check angles
    let angle1 = getAngle(p0, cp1, true);
    let angle2 = getAngle(p, cp2, true);
    let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;


    let angleDiff = Math.abs((deltaAngle % 180) - 90);
    let isRightAngle = angleDiff < 3;


    let rx = 0
    let ry = 0
    let ptC;

    if (isRightAngle) {
        // point between cps


        // center point
        let cp1_r = rotatePoint(cp1, p0.x, p0.y, (Math.PI * -0.5))
        let cp2_r = rotatePoint(cp2, p.x, p.y, (Math.PI * 0.5))

        // assumed centroid
        ptC = checkLineIntersection(p0, cp1_r, p, cp2_r, false)
        //renderPoint(markers, ptC, 'red', '1%', '0.5' )




        let pI = checkLineIntersection(p0, cp1, p, cp2, false);

        if (pI) {

            let r1 = getDistance(p0, pI);
            let r2 = getDistance(p, pI);

            let rMax = +Math.max(r1, r2).toFixed(8);
            let rMin = +Math.min(r1, r2).toFixed(8);

            rx = rMin
            ry = rMax

            let arcArea = getPolygonArea([p0, cp1, cp2, p])
            let sweep = arcArea < 0 ? 0 : 1;

            let w = Math.abs(p.x - p0.x);
            let h = Math.abs(p.y - p0.y);
            let landscape = w > h;

            let circular = (100 / rx * Math.abs(rx - ry)) < 5;

            if (circular) {
                //rx = (rx+ry)/2
                rx = rMax
                ry = rx;
            }

            if (landscape) {
                //console.log('landscape', w, h);
                rx = rMax
                ry = rMin
            }


            // get original cubic area 
            let comO = [
                { type: 'M', values: [p0.x, p0.y] },
                { type: 'C', values: [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] }
            ];

            let comArea = getPathArea(comO);

            // new arc command
            let comArc = { type: 'A', values: [rx, ry, 0, 0, sweep, p.x, p.y] };

            // calculate arc seg area
            arcSegArea = (Math.PI * (rx * ry)) / 4

            // subtract polygon between start, end and center point
            arcSegArea -= Math.abs(getPolygonArea([p0, p, pI]))

            let areaDiff = getRelativeAreaDiff(comArea, arcSegArea);

            if (areaDiff < tolerance) {
                isArc = true;
                com = comArc;
            }

        }
    }

    return { com: com, isArc, area: arcSegArea, rx, ry, centroid: ptC }

}



/*


// combine adjacent arcs

export function combineArcs(pathData) {

    let arcSeq = [[]]
    let ind = 0
    let arcIndices = [[]];
    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] }, p;

    for (let i = 0, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;

        if (type === 'A') {

            let comPrev = pathData[i - 1];

            // previous p0 values might not be correct anymore due to cubic simplification
            let valsL = comPrev.values.slice(-2);
            p0 = { x: valsL[0], y: valsL[1] };

            let [rx, ry, xAxisRotation, largeArc, sweep, x, y] = values;

            // check if arc is circular
            let circular = (100 / rx * Math.abs(rx - ry)) < 5;


            //add p0
            p = { x: values[5], y: values[6] }
            com.p0 = p0;
            com.p = p;
            com.circular = circular;

            let comNext = pathData[i + 1];

            //add first
            if (!arcSeq[ind].length && comNext && comNext.type === 'A') {
                arcSeq[ind].push(com)
                arcIndices[ind].push(i)
            }

            if (comNext && comNext.type === 'A') {
                let [rx1, ry1, xAxisRotation0, largeArc, sweep, x, y] = comNext.values;
                let diffRx = rx != rx1 ? 100 / rx * Math.abs(rx - rx1) : 0
                let diffRy = ry != ry1 ? 100 / ry * Math.abs(ry - ry1) : 0
                //let diff = (diffRx + diffRy) / 2
                //let circular2 = (100 / rx1 * Math.abs(rx1 - ry1)) < 5;

                p = { x: comNext.values[5], y: comNext.values[6] }
                comNext.p0 = p0;
                comNext.p = p;

                // add if radii are almost same
                if (diffRx < 5 && diffRy < 5) {
                    //console.log(rx, rx1, ry, ry1, 'diff:',diff, 'circular', circular, circular2);
                    arcSeq[ind].push(comNext)
                    arcIndices[ind].push(i + 1)
                } else {

                    // start new segment
                    arcSeq.push([])
                    arcIndices.push([])
                    ind++

                }
            }

            else {
                //arcSeq[ind].push(com)
                //arcIndices[ind].push(i - 1)
                arcSeq.push([])
                arcIndices.push([])
                ind++
            }
        }
    }

    if (!arcIndices.length) return pathData;

    arcSeq = arcSeq.filter(item => item.length)
    arcIndices = arcIndices.filter(item => item.length)
    //console.log('combine arcs:', arcSeq, arcIndices);


    // Process in reverse to avoid index shifting
    for (let i = arcSeq.length - 1; i >= 0; i--) {
        const seq = arcSeq[i];
        const start = arcIndices[i][0];
        const len = seq.length;

        // Average radii to prevent distortions
        let rxA = 0, ryA = 0;
        seq.forEach(({ values }) => {
            const [rx, ry] = values;
            rxA += rx;
            ryA += ry;
        });
        rxA /= len;
        ryA /= len;

        // Correct near-circular arcs
        //console.log('seq', seq);

        //let rDiff = 100 / rxA * Math.abs(rxA - ryA);
        //let circular = rDiff < 5;

        // check if arc is circular
        let circular = (100 / rxA * Math.abs(rxA - ryA)) < 5;


        if (circular) {
            // average radii
            rxA = (rxA + ryA) / 2;
            ryA = rxA;
        }

        let comPrev = pathData[start - 1]
        let comPrevVals = comPrev.values.slice(-2)
        let M = { type: 'M', values: [comPrevVals[0], comPrevVals[1]] }


        if (len === 4) {
            //console.log('4 arcs');

            let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[1].values;
            let [, , , , , x2, y2] = seq[3].values;

            let xDiff = Math.abs(x2 - x1);
            let yDiff = Math.abs(y2 - y1);
            let horizontal = xDiff > yDiff;

            if (circular) {
                let adjustY = !horizontal ? rxA * 2 : 0;

                // simplify radii
                rxA = 1;
                ryA = 1;
            }

            let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x1, y1] };
            let com2 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

            // This now correctly replaces the original 4 arc commands with 2
            pathData.splice(start, len, com1, com2);
            //console.log(com1, com2);
        }

        else if (len === 3) {
            //console.log('3 arcs');
            let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[0].values;
            let [rx2, ry2, , , , x2, y2] = seq[2].values;

            // must be large arc
            largeArc = 1;
            let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

            // replace
            pathData.splice(start, len, com1);

        }


        else if (len === 2) {
            //console.log('2 arcs');
            let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[0].values;
            let [rx2, ry2, , , , x2, y2] = seq[1].values;

            // if circular or non-elliptic xAxisRotation has no effect
            if (circular) {
                rxA = 1;
                ryA = 1;
                xAxisRotation = 0;
            }

            // check if arc is already ideal
            let { p0, p } = seq[0];
            let [p0_1, p_1] = [seq[1].p0, seq[1].p];

            if (p0.x !== p_1.x || p0.y !== p_1.y) {

                let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

                // replace
                pathData.splice(start, len, com1);
            }
        }

        else {
            //console.log('single arc');
        }
    }

    return pathData
}



//cubics to arcs old

export function combineCubicsToArcs(pathData = [], {
    threshold = 0,
} = {}) {

    let l = pathData.length;
    let pathDataN = [pathData[0]];

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type, cp1 = null, cp2 = null, p0, p } = com;
        let comP = pathData[i - 1];
        let comN = pathData[i + 1] ? pathData[i + 1] : null;
        let comN2 = pathData[i + 2] ? pathData[i + 2] : null;

        if (type === 'C' && comN && comN.type === 'C') {

            let thresh = getDistAv(p0, p) * 0.02;
            //thresh = getDistAv(p0, p) * 10000;

            let dx1 = Math.abs(p0.x - cp1.x)
            let dy1 = Math.abs(p0.y - cp1.y)

            let isHorizontal1 = dy1 < thresh;
            let isVertical1 = dx1 < thresh;


            let dx2 = Math.abs(comN.p0.x - comN.cp1.x)
            let dy2 = Math.abs(comN.p0.y - comN.cp1.y)

            let isHorizontal2 = dy2 < thresh;
            let isVertical2 = dx2 < thresh;

            //console.log(isHorizontal1, isVertical1);

            // check angles
            let angleDiff1 = (isHorizontal1 || isVertical1) ? 0 : Infinity;
            let angleDiff2 = (isHorizontal2 || isVertical2) ? 0 : Infinity;

            if (!isHorizontal1 && !isVertical1) {
                //console.log('get angles', isHorizontal1, isVertical1);
                let angle1 = getAngle(p0, cp1, true);
                let angle2 = getAngle(p, cp2, true);
                let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;
                angleDiff1 = Math.abs((deltaAngle % 180) - 90);
            }

            if (!isHorizontal2 && !isVertical2) {
                //console.log('get angles', isHorizontal1, isVertical1);
                let angle1 = getAngle(p0, cp1, true);
                let angle2 = getAngle(p, cp2, true);
                let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;
                angleDiff2 = Math.abs((deltaAngle % 180) - 90);
            }


            let isRightAngle1 = angleDiff1 < 3;
            let isRightAngle2 = angleDiff2 < 3;

            let centroids = [];
            let poly = [];
            let rArr = []
            let largeArc = 0;

            // final on path point
            let p_a = p

            // 2  possible candidates - test radius
            if (isRightAngle1 && isRightAngle2) {
                //renderPoint(markers, com.p)

                let pI = checkLineIntersection(p0, cp1, p, cp2, false);
                let r1 = getDistance(p0, pI);
                let r2 = getDistance(p, pI);
                let rDiff1 = Math.abs(r1 - r2)
                //let r = r1

                rArr.push(r1, r2)

                poly.push(p0, p)
                p_a = p


                // 2 commands can be combined – similar radii  
                if (rDiff1 < thresh) {

                    //renderPoint(markers, com.p)

                    // add to polygon for sweep
                    poly.push(comN.p)

                    // update final point
                    p_a = comN.p

                    // approximate/average final center point for final radius
                    let cp1_r = rotatePoint(cp1, p0.x, p0.y, (Math.PI * -0.5))
                    let cp2_r = rotatePoint(cp2, p.x, p.y, (Math.PI * 0.5))

                    let cp1_r2 = rotatePoint(comN.cp1, comN.p0.x, comN.p0.y, (Math.PI * -0.5))
                    let cp2_r2 = rotatePoint(comN.cp2, comN.p.x, comN.p.y, (Math.PI * 0.5))

                    // assumed centroid
                    let ptC = checkLineIntersection(p0, cp1_r, p, cp2_r, false)
                    let ptC2 = checkLineIntersection(comN.p0, cp1_r2, comN.p, cp2_r2, false)
                    let distC = ptC && ptC2 ? getDistAv(ptC, ptC2) : Infinity


                    // 2 commands can definitely be combined 
                    if (distC < thresh) {
                        //renderPoint(markers, ptC, 'cyan', '1.2%', '0.5')
                        //renderPoint(markers, ptC2, 'magenta', '0.5%', '0.5')

                        // add to centroid array
                        centroids.push(ptC, ptC2)

                    }


                    if (comN2 && comN2.type === 'C') {

                        let cp1_r3 = rotatePoint(comN2.cp1, comN2.p0.x, comN2.p0.y, (Math.PI * -0.5))
                        let cp2_r3 = rotatePoint(comN2.cp2, comN2.p.x, comN2.p.y, (Math.PI * 0.5))
                        let ptC3 = checkLineIntersection(comN2.p0, cp1_r3, comN2.p, cp2_r3, false)

                        let distC2 = ptC && ptC3 ? getDistAv(ptC, ptC3) : Infinity

                        // can be combined with 3rd command
                        if (distC2 < thresh) {
                            //renderPoint(markers, ptC3, 'green', '2%', '0.3')

                            let r3 = getDistance(ptC3, comN2.p)
                            rArr.push(r3)

                            // update final point
                            p_a = comN2.p
                            poly.push(p, comN2.p)

                            largeArc = 1;

                        }
                    }
                    //console.log(rDiff1, r, r1, r2);

                } else {
                    pathDataN.push(com)
                    continue
                }

            }


            // create new arc command
            if (poly.length > 1) {

                // get average radius
                //rArr = rArr.sort()
                let rA = Math.max(...rArr)
                rA = rArr[0]

                let centroidA;
                let xArr = centroids.map(pt => pt.x)
                let yArr = centroids.map(pt => pt.y)

                centroidA = {
                    x: (xArr.reduce((a, b) => a + b, 0)) / centroids.length,
                    y: (yArr.reduce((a, b) => a + b, 0)) / centroids.length
                }

                //console.log(xArr, centroidA);

                //rA = getDistance(p0, centroids[0])

                rA = getDistance(p0, centroidA)
                let rA2 = getDistance(p, centroidA)
                //rA = (rA+rA2) /2
                //rA = Math.min(rA,rA2)

                // rA = ((Math.min(...rArr) * 2 + Math.max(...rArr)) ) / 3
                //console.log(rArr, rA);

                let area = getPolygonArea(poly, false)
                let sweep = area < 0 ? 0 : 1;

                let comA = { type: 'A', values: [rA, rA, 0, largeArc, sweep, p_a.x, p_a.y], p0, p: p_a }

                console.log('comA', comA);

                pathDataN.push(comA)

                i += rArr.length - 1;
                //i++
                continue

            }

            // test angles
        }

        pathDataN.push(com)
    }

    let d = pathDataToD(pathDataN)
    console.log(d);

    console.log('pathDataN', pathDataN);
    return pathDataN

}
*/