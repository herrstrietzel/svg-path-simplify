import { deg2rad, rad2Deg } from "../constants";
import { simplifyPolyRDP } from "../simplify_poly_RDP";
import { simplifyPolyRD } from "../simplify_poly_radial_distance";
import { getDistAv, getDistManhattan, getSquareDistance, getTatAngles, interpolate, pointAtT } from "./geometry";
import { getBezierArea, getPolygonArea } from "./geometry_area";
import { getPolyBBox } from "./geometry_bbox";
import { addDimensionData, analyzePathData } from "./pathData_analyze";
import { arcToBezier } from "./pathData_convert";
import { pathDataFromPoly } from "./pathData_fromPoly";
import { addExtremePoints } from "./pathData_split";
import { pathDataToD } from "./pathData_stringify";
import { analyzePoly } from "./poly_analyze";
import { getCurvePathData } from "./poly_to_pathdata";
import { detectAccuracyPoly, roundTo } from "./rounding";
import { renderPoint } from "./visualize";




/**
 * creates precise polygon approximation from pathdata
 * converts arc to cubis
 */
export function pathDataToPolygon(pathData, {
    precisionPoly = 1,
    autoAccuracy=false,
    polyFormat='points',
    decimals=-1,
    simplifyRD=1,
simplifyRDP=1,
} = {}) {

    //console.log(pathData);

    let l = pathData.length;
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] }
    let p0 = M
    let p = M


    // collect polygon vertices
    let pathDataPoly = []

    // end point vertices
    let pts = [p0]


    let dims = []
    let areas = []

    // minimum dimension
    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type, values, p0, p, dimA = 0 } = com;

        dims.push(+dimA.toFixed(8))

        // segment end point
        pts.push(p)
    }


    let pts2 = [pts[0]]

    // adjustments for very small or large paths
    dims = dims.filter(Boolean).sort()
    let dimMax = dims[dims.length - 1]

    let scale = dimMax > 2 && dimMax < 25 ? 1 : (20 / dimMax);
    precisionPoly = precisionPoly * scale

    // check how much segments contribute to total area
    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type, values, p0, p, cp1 = null, cp2 = null, dimA } = com;

        let distAv = (dimA)

        let cpts = cp1 && cp2 ? [p0, cp1, cp2, p] : (cp1 ? [p0, cp1, p] : []);

        if (cpts.length) {
            let ptM = cp2 ? interpolate(cp1, cp2, 0.5) : cp1
            let distCpt1 = getDistManhattan(p0, ptM)
            let distCpt2 = getDistManhattan(p, ptM)
            let dist4 = (distCpt1 + distCpt2) * 0.2
            distAv = (dist4 + dimA)
        }

        // calculate split value according to manhattan distance of segment
        let rat = Math.ceil(distAv * 0.2 * precisionPoly)
        let split = Math.ceil(rat)


        if (split && cpts.length) {
            let step = split ? 1 / (split + 1) : 0
            for (let j = 1; j <= split; j++) {
                let t = step * j
                let pt = pointAtT(cpts, t)
                pts2.push(pt)
            }
        }
        pts2.push(p)
    }


    // simplify polygon
    if(simplifyRD>0){
        pts2 = simplifyPolyRD(pts2, {quality:simplifyRD+'px'})
    }


    if(simplifyRDP>0){
        pts2 = simplifyPolyRDP(pts2, {quality:simplifyRDP+'px'})
    }



    pathDataPoly = pathDataFromPoly(pts2)
    pathData = pathDataPoly
    
    if(autoAccuracy){
        decimals = detectAccuracyPoly(pts)
        //console.log('decimals', decimals);
    }

    let poly = decimals>-1 ? pts2.map(pt => { return { x: roundTo(pt.x, decimals), y: roundTo(pt.y, decimals) } }) : pts2.map(pt => { return { x: pt.x, y: pt.y } })

    if(polyFormat==='array'){
        poly = poly.map(pt => { return [pt.x, pt.y] })
    }
    else if(polyFormat==='string'){
        poly = poly.map(pt => { return [pt.x, pt.y].join(',') }).flat().join(' ')
    }

    //console.log(pathData);

    return { pathData, poly }

}




/**
 * creates precise polygon 
 * from command end points
 * converts arc to cubis
 */
export function getPathDataPolyPrecise(pathData = [], {
    precision = 1
} = {}) {

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
















