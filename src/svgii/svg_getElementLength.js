import { getElementAtts } from "../svg-getAttributes";
import { getDistance } from "./geometry";
import { getEllipseLength, getPolygonLength } from "./geometry_length";
import { parsePathDataNormalized } from "./pathData_convert";
import { getPathDataLength } from "./pathData_getLength";
import { getPathDataFromEl, rectToPathData } from "./pathData_parse_els";
import { normalizePoly } from "./poly_normalize";

export function getElementLength(el, {
    props = {},
    pathLength = 0,
} = {}) {


    let nodeName = el.nodeName;
    let len = 0;

    props = JSON.parse(JSON.stringify(props))

    for (let prop in props) {
        if (props[prop] && props[prop].length && props[prop].length === 1) {
            props[prop] = props[prop][0]
            //console.log(prop, props[prop]);
        }
    }

    //console.log(props);
    let { x = 0, y = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0, width = 0, height = 0, r = 0, rx = 0, ry = 0, cx = 0, cy = 0 } = props;

    let pts = nodeName === 'polygon' || nodeName === 'polyline' ? el.getAttribute('points') : [];
    let isPolygon = nodeName === 'polygon';
    if (pts.length) {
        pts = normalizePoly(pts);
    }

    // we need to convert rects with corner rounding
    let pathData = []
    if (nodeName === 'rect' && (rx || ry)) {
        pathData = rectToPathData(x, y, width, height, rx, ry)
        nodeName = 'path'
    }

    switch (nodeName) {
        case 'line':
            len = getDistance({ x: x1, y: y1 }, { x: x2, y: y2 });
            break;
        case 'rect':
            len = width * 2 + height * 2;
            break;
        case 'circle':
            len = 2 * Math.PI * r;
            break;
        case 'ellipse':
            len = getEllipseLength(rx, ry);
            break;
        case 'polygon':
        case 'polyline':
            len = getPolygonLength(pts, isPolygon)
            break;
        case 'path':
            pathData = pathData.length ? pathData : parsePathDataNormalized(el.getAttribute('d'));
            len = getPathDataLength(pathData);
            break;
    }

    return len
}