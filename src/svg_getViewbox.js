/**
 * get viewBox 
 * either from explicit attribute or
 * width and height attributes
 */

export function getViewBox(svg = null, decimals = -1) {

    const getUnit=(val)=>{
        return val && isNaN(val) ? val.match(/[^\d|.]+/g)[0] : '';
    }

    // browser default
    if (!svg) return false


    let hasWidth = svg.hasAttribute('width')
    let hasHeight = svg.hasAttribute('height')
    let hasViewBox = svg.hasAttribute('viewBox')


    let widthAtt = hasWidth ? svg.getAttribute('width') : 0;
    let heightAtt = hasHeight ? svg.getAttribute('height') : 0;



    let widthUnit = hasWidth ? getUnit(widthAtt) : false;
    let heightUnit = hasHeight ? getUnit(widthAtt) : false

    let w = widthAtt ? (!widthAtt.includes('%') ? parseFloat(widthAtt) : 0 ) : 300
    let h = heightAtt ? (!heightAtt.includes('%') ? parseFloat(heightAtt) : 0 ) : 150


    let viewBoxVals =  hasViewBox ? svg.getAttribute('viewBox').split(/,| /).filter(Boolean).map(Number) : [0, 0, w, h];

    // round
    if (decimals>-1) {
        [w, h] = [w, h].map(val=>+val.toFixed(decimals))
        viewBoxVals = viewBoxVals.map(val=>+val.toFixed(decimals))
    }

    let viewBox = { x:viewBoxVals[0] , y:viewBoxVals[1], width:viewBoxVals[2], height:viewBoxVals[3], w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit };

    return viewBox
}