import { deg2rad, inch2cm, inch2pt, rad2Deg, root2 } from "../constants";
import { hex2Rgb, hsl2Rgb, rgba2Hex } from "./convert_colors";
import { autoRound } from "./rounding";
import { horizontalProps, verticalProps } from "./svg-styles-to-attributes-const";


export function svgElUnitsToPixel(el, {
    width = 0,
    height = 0,
    fontSize = 16,
    dpi = 96,
    autoRoundValues = false,
    decimals = -1,
} = {}) {


    let attributes = [...el.attributes];
    let attNames = attributes.map(att => att.name)

    // doesn't work in node!
    //let attValues = attributes.map(att => att.nodeValue)
    
    let attValues = []
    attNames.forEach(att=>{
        attValues.push(el.getAttribute(att))
    })

    let isSquare = width === height;

    let atts = {}
    attNames.forEach((att, i) => {
        let isHorizontal = horizontalProps.includes(att)
        let isVertical = verticalProps.includes(att)
        let normalizedDiagonal = !isSquare && att === 'r' ? true : false
        let attValue = attValues[i];
        //console.log(att, isHorizontal, isVertical, autoRoundValues);
        let val = normalizeUnits(attValue, { isHorizontal, isVertical, width, height, normalizedDiagonal, autoRoundValues })
        atts[att] = val;

        // apply
        el.setAttribute(att, val)
    })

    return atts;
}


// convert real life units to pixels
export function normalizeUnits(value = null, {
    unit = null,
    width = 0,
    height = 0,
    decimals = -1,
    isHorizontal = false,
    isVertical = false,
    autoRoundValues = false,
    dpi = 96,
    fontSize = 16,
    normalizedDiagonal = false,
} = {}) {

    // only required for circle r normalization when height!=width
    normalizedDiagonal = width === height ? false : normalizedDiagonal;

    let type = typeof value;
    if (!value) return value;

    // check if value is string
    let isNum = type === 'number' ? true : isNumericValue(value)
    let isArray = type === 'string' ? value.split(/,| /).length > 1 : false;
    let isFunction = type === 'string' ? value.includes('(') : false;
    //console.log(isArray);
    if (!isNum || isArray || isFunction) return value

    // check unit if not specified
    unit = !unit ? getUnit(value) : unit;

    let val = parseFloat(value);
    let scale = 1;
    let scaleRoot = Math.sqrt(width * width + height * height) / root2


    // no unit - already pixes/user unit
    if (!unit) {
        return val;
    }

    switch (unit) {
        case "%":
            if (width && isHorizontal) {
                scale = width / 100;
            }
            else if (height && isVertical) {
                scale = height / 100;
            }
            else {
                scale = normalizedDiagonal ? scaleRoot / 100 : 1;
            }
            break;

        case "rad":
            scale = rad2Deg;
            break;
        case "turn":
            scale = 360;
            break;

        case "in":
            scale = dpi;
            break;

        case "pt":
            // 1/72
            scale = dpi * inch2pt;
            break;

        case "pc":
            // 1/6
            scale = dpi * 0.16666667;
            break;

        case "cm":
            // 1/2.54
            scale = inch2cm * dpi;
            break;
        case "mm":
            //scale = ((1 / 2.54) * dpi) * 0.1;
            scale = inch2cm * dpi * 0.1
            break;

        // has anyone ever used it?
        case "Q":
            scale = inch2cm * dpi * 0.025;
            break;

        // just a default approximation
        case "em":
        case "rem":
            scale = fontSize;
            break;
        default:
            scale = 1;
    }
    let valuePx = val * scale;
    if (autoRoundValues) valuePx = autoRound(valuePx);
    else if (decimals > -1) valuePx = +valuePx.toFixed(decimals);

    //console.log('valuePx', valuePx);
    return valuePx;
};


export function getUnit(val) {
    if (!val || !isNaN(val)) return '';
    val = val.replace(/\+|\-/g, '');
    let unit = val.match(/[^\d|.]+/g)[0];
    return unit;
}

export function isNumericValue(val = '') {
    // is number
    if (!isNaN(val)) return true;
    // parse with unit
    return !isNaN(parseFloat(val))
}