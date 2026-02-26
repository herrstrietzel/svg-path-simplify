// just for visual debugging
import { renderPoint } from './svgii/visualize';

import {svgPathSimplify} from './pathSimplify-main';
//import { parsePathDataNormalized } from './svgii/pathData_parse';
//import {getViewBox} from './svg_getViewbox';

export {svgPathSimplify as svgPathSimplify};
//export {getViewBox as getViewBox};

export {
    abs, acos, asin, atan, atan2, ceil, cos, exp, floor, hypot,
    log, max, min, pow, random, round, sin, sqrt, tan, PI
} from './constants';

/*
import {simplifyPolySchneider} from './svgii/poly_smooth_schneider';
export {simplifyPolySchneider as simplifyPolySchneider }
*/


/*
import {parsePathDataFontello} from './svgii/pathData_parse_fontello';
export {parsePathDataFontello as parsePathDataFontello};
import {parsePathDataString} from './svgii/pathData_parse';
export {parsePathDataString as parsePathDataString}
import { fitCurveN } from './poly-fit-curve-schneider';
export {fitCurveN as fitCurveN}
*/


/*
//export {parsePathDataString} from './svgii/pathData_parse';
import {parsePathDataString_plus} from './svgii/pathData_parse2';
export {parsePathDataString_plus as parsePathDataString_plus}

import {getPathDataFromEl} from './svgii/pathData_parse_els';
export{getPathDataFromEl as getPathDataFromEl};
*/



// IIFE 
if (typeof window !== 'undefined') {
    window.svgPathSimplify = svgPathSimplify;
    //window.simplifyPolySchneider = simplifyPolySchneider;
    //window.getPathDataFromEl = getPathDataFromEl;
    //window.parsePathDataString = parsePathDataString;
    //window.svgPathSimplify = svgPathSimplify;
    //window.svgPathSimplify = parsePathDataNormalized;
    //window.getViewBox = getViewBox;
    //window.renderPoint = renderPoint;
}





