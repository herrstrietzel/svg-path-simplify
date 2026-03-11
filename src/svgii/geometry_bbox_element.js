import { getElementAtts } from "../svg-getAttributes";
import { getPathDataPoly, getPolyBBox } from "./geometry_bbox";
import { parsePathDataNormalized } from "./pathData_convert";
import { normalizePoly } from "./poly_normalize";

export function getElBBox(el){

    let type=el.nodeName.toLowerCase()
    let atts = getElementAtts(el);
    let bb = {x:0, y:0, width:0, height:0}
    let pts = [];

    switch(type){
        case 'path':
            let pathData = parsePathDataNormalized(atts.d)
            bb=getPolyBBox(getPathDataPoly(pathData))

        break;
        case 'rect':
            bb = {x:atts.x||0, y:atts.y||0, width:atts.width, height:atts.height}
        break;
        case 'circle':
            let diameter = atts.r*2
            bb = {x:atts.cx-atts.r, y:atts.cy-atts.r, width:diameter, height:diameter}
        break;
        case 'ellipse':
            bb = {x:atts.cx-atts.rx, y:atts.cy-atts.ry, width:atts.rx*2, height:atts.ry*2}
        break;

        case 'line':
            pts = [{x:atts.x1, y:atts.y1}, {x:atts.x2, y:atts.y2}]
            bb = getPolyBBox(pts)
        break;

        case 'polyline':
        case 'polygon':
            pts = normalizePoly(atts.points);
            bb = getPolyBBox(pts)
        break;

    }
    //console.log('bb', bb, type, el);

    return bb;
}

