/**
 * get viewBox 
 * either from explicit attribute or
 * width and height attributes
 */

import { normalizeUnits } from "./svgii/convert_units";
import { autoRound } from "./svgii/rounding";

export function getViewBox(svg = null, {
    autoRoundValues=true,
    decimals = -1
}={}) {

    // browser default
    if (!svg) return false


    let hasWidth = svg.hasAttribute('width')
    let hasHeight = svg.hasAttribute('height')
    let hasViewBox = svg.hasAttribute('viewBox')


    let widthAtt = hasWidth ? svg.getAttribute('width') : 0;
    let heightAtt = hasHeight ? svg.getAttribute('height') : 0;


    let w = widthAtt ? (!widthAtt.includes('%') ? normalizeUnits(widthAtt, {isHorizontal:true}) : 0 ) : 300
    let h = heightAtt ? (!heightAtt.includes('%') ? normalizeUnits(heightAtt, {isVertical:true}) : 0 ) : 150

    let widthUnit = hasWidth ? '' : '';
    let heightUnit = hasHeight ? '' : ''


    let viewBoxVals =  hasViewBox ? svg.getAttribute('viewBox').split(/,| /).filter(Boolean).map(Number) : [0, 0, w, h];

    // round
    if (autoRoundValues ) {
        [w, h] = [w, h].map(val=>autoRound(val))
        viewBoxVals = viewBoxVals.map(val=>autoRound(val))
    }
    else if (!autoRoundValues && decimals>-1) {
        [w, h] = [w, h].map(val=>+val.toFixed(decimals))
        viewBoxVals = viewBoxVals.map(val=>+val.toFixed(decimals))
    }


    let [x=0, y=0, width=0, height=0] = viewBoxVals;
    if(hasViewBox) {
        w=width;
        h=height
    }

    let viewBox = { x , y, width, height, w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit };

    return viewBox
}