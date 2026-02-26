import { deg2rad, rad2Deg } from "../constants";
import { simplifyRDP } from "../simplify_poly_RDP";
import { simplifyRD } from "../simplify_poly_radial_distance";
import { getDistAv, getTatAngles, pointAtT } from "./geometry";
import { getPolyBBox } from "./geometry_bbox";
import { addDimensionData, analyzePathData } from "./pathData_analyze";
import { arcToBezier } from "./pathData_convert";
import { pathDataFromPoly } from "./pathData_fromPoly";
import { addExtremePoints } from "./pathData_split";
import { pathDataToD } from "./pathData_stringify";
import { analyzePoly } from "./poly_analyze";
import { getCurvePathData } from "./poly_to_pathdata";
import { renderPoint } from "./visualize";


export function getPathDataPolyPrecise(pathData = []) {

    let poly = [];
    for (let i = 0; i < pathData.length; i++) {
        let com = pathData[i]
        let prev = i > 0 ? pathData[i - 1] : pathData[i];
        let { type, values } = com;
        let p0 = { x: prev.values[prev.values.length - 2], y: prev.values[prev.values.length - 1] };
        let p = values.length ? { x: values[values.length - 2], y: values[values.length - 1] } : ''
        let cp1 = values.length ? { x: values[0], y: values[1] } : ''

        switch (type) {

            // convert to cubic to get polygon
            case 'A':
                if (typeof arcToBezier !== 'function') {
                    //console.log('has no arc to cubic conversion');
                    break;
                }
                let cubic = arcToBezier(p0, values)
                cubic.forEach(com => {
                    let vals = com.values
                    let cp1 = { x: vals[0], y: vals[1] }
                    let cp2 = { x: vals[2], y: vals[3] }
                    let p = { x: vals[4], y: vals[5] }
                    poly.push(cp1, cp2, p)
                })
                break;

            case 'C':
                let cp2 = { x: values[2], y: values[3] }
                poly.push(cp1, cp2)
                break;
            case 'Q':
                poly.push(cp1)
                break;
        }

        // M and L commands
        if (type.toLowerCase() !== 'z') {
            poly.push(p)
        }
    }

    return poly;
}



export function pathDataToPolygon(pathData, {
    angles = [],
    split = 0,
    getPathData = true,
    width = 0,
    height = 0
} = {}) {


    let l = pathData.length;
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] }
    let p0 = M

    let minT = 1 / split * 0.5;
    let maxT = 1 - minT


    // collect polygon vertices
    let pathDataPoly = []
    let pts = [p0]

    let ptsEnd = [0]
    let ptCount = 1

    // get max length
    let minLength = 0;


    split = !split ? 1 : split;

    if (width && height) {
        minLength = (width + height) * 0.025 / split
    } else {
        //let areas = pathData.map(com => com.cptArea || 0).filter(Boolean).sort()
        let lengths = pathData.map(com => com.dimA || 0).filter(Boolean).sort()
        minLength = lengths[0]
        //console.log('areas', areas, 'lengths', lengths);
    }

    //minLength*=0.5

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        //let comPrev = pathData[i - 1];
        let comNext = pathData[i + 1] || null;
        let { type, values } = com;
        let valuesL = values.length;
        let p = valuesL ? { x: values[valuesL - 2], y: values[valuesL - 1] } : M;

        if (type === 'C' || type === 'Q') {

            let cp1 = { x: values[0], y: values[1] }
            let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1
            let cpts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];


            // calculate split according to length
            let length = com.dimA
            let rat = Math.floor(length / (minLength))
            split = Math.ceil(length / minLength)

            let tArr = []
            for (let i = 1; i < split; i++) {
                tArr.push(1 / split * i)
            }

            tArr.forEach(t => {
                let pt = pointAtT(cpts, t)
                pts.push(pt)
                ptCount++
            })

        }

        if (type === 'M') {
            M = p
        }


        p.area = com.cptArea || 0
        p.isExtreme = com.extreme || false
        p.isCorner = com.corner || false
        p.isDirChange = com.directionChange || false;

        // segment end point
        pts.push(p)

        // exclude for polygon simplification
        if (com.extreme || com.corner || (comNext && comNext.type !== type) || type === 'L') {
            //console.log('is ext' , com);
            ptsEnd.push(ptCount)
            //renderPoint(markers, p, 'magenta', '2%', '0.5')
        }

        ptCount++

        p0 = p

    }

    // reduce poly vertices
    //pts = simplifyRD(pts, { quality: 0.5, exclude: ptsEnd, width, height })
    pts = simplifyRD(pts, { quality: 0.5, width, height })
    //pts = simplifyRDP(pts, { quality: 0.8, width, height })
    //console.log(ptsEnd);

    /*
    pts.forEach(pt => {
        //renderPoint(markers, pt, 'cyan', '1%', '0.5')
    })
    //console.log(pts);
    */


    pathDataPoly = pathDataFromPoly(pts)
    return getPathData ? pathDataPoly : pts;
}



// old function
export function pathDataToPolySingle(pathData, addExtremes = true) {


    let dimMin = Infinity;
    let dimMax = 0;


    /**
     * add extremes to beziers
     * to reproduce the shape better
     */
    if (addExtremes) {
        pathData = addExtremePoints(pathData, 0.1, 0.9)
    }

    //console.log(pathData);

    let pathDataPlus = analyzePathData(pathData);
    let { bb } = pathDataPlus;
    let thresh = (bb.width + bb.height) / 2 / 50

    pathData = pathDataPlus.pathData


    /**
     * approximate min and max segment sizes
     * for segment splitting
     */
    let dimArr = pathData.filter(com => com.dimA).sort((a, b) => a.dimA - b.DimA)
    let dimMinL = dimArr[0].dimA
    let dimMaxL = dimArr[dimArr.length - 1].dimA
    //console.log('dimArr', dimArr, dimMaxL);
    if (dimMinL && dimMinL < dimMin) dimMin = dimMinL;
    if (dimMaxL && dimMaxL > dimMax) dimMax = dimMaxL;

    //console.log(dimMin, dimMax);

    // find split point based on smallest point distance
    dimMin = (dimMin * 2 + dimMax) / 2 / 4
    //dimMin = (bb.width + bb.height) / 2 / 8

    // collect vertices
    let polyArr = [];

    let p0 = { x: pathData[0].p0.x, y: pathData[0].p0.y, extreme: pathData[0].extreme, corner: pathData[0].corner }
    let poly = [p0];

    for (let i = 1, l = pathData.length; i < l; i++) {

        let com = pathData[i];
        let { type, values, extreme = false, corner = false, dimA = null, p0, p, cp1 = null, cp2 = null } = com;

        dimA = getDistAv(p0, p);


        if (extreme) {
            //renderPoint(markers, p, 'cyan')
        }

        let split = (type === 'C' || type === 'Q') && dimA ? Math.ceil(dimA / dimMin) : 0;


        //console.log(com);
        p.extreme = extreme
        p.corner = corner

        //console.log(p);

        if ((type === 'C' || type === 'Q') && split) {
            let splitT = 1 / split;
            for (let i = 1; i < split; i++) {
                let t = splitT * i;
                let cpts = type === 'C' ? [cp1, cp2] : [cp1];
                let ptI = pointAtT([p0, ...cpts, p], t)
                poly.push(ptI)
            }
        }
        poly.push(p)

    }


    // remove short
    let remove = new Set([])
    for (let i = 1, l = poly.length; i < l; i++) {
        let p = poly[i - 1]
        let pN = poly[i]

        let dist1 = getDistAv(p, pN)
        if (dist1 < thresh && pN.extreme) {
            let pR = p.extreme ? pN : p
            let idx = p.extreme ? i : i - 1
            //console.log('remove', idx);
            remove.add(idx)
        }
    }


    remove = Array.from(remove).reverse();
    //console.log(remove);

    for (let i = 0; i < remove.length; i++) {
        let idx = remove[i];
        //console.log('idx', idx);
        poly.splice(idx, 1)
    }

    poly.splice(poly.length - 1, poly.length)


    let polyAtt = poly.map(pt => `${pt.x} ${pt.y} `).join(' ')
    //console.log('polyAtt', polyAtt);

    //markers.insertAdjacentHTML('beforeend', `<polygon points="${polyAtt}" stroke="red" fill="none"/>`)


    poly = analyzePoly(poly, false)
    let pathDataP = getCurvePathData(poly, 0.666, true)
    let d = pathDataToD(pathDataP)

    console.log(d);
    //markers.insertAdjacentHTML('beforeend', `<path d="${d}" stroke="green" fill="none" stroke-width="1%"/>`)





    return poly

}



