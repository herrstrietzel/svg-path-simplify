/**
 * parse svg presentational attributes
 * or CSS styles
 */

import { rad2Deg } from "../constants";
import { parseColor, rgba2Hex } from "./convert_colors";
import { getUnit, isNumericValue, normalizeUnits } from "./convert_units";
import { autoRound, roundTo } from "./rounding";
import { getMatrixFromTransform } from "./svg-styles-getTransforms";
import { attLookup, colorProps, horizontalProps, strokeAtts, transHorizontal, transVertical, verticalProps } from "./svg-styles-to-attributes-const";
import { qrDecomposeMatrix } from "./transform_qr_decompose";


export function parseStylesProperties(el, {
    fontSize = 16,
    removeNameSpaced = true,
    autoRoundValues = false,
    minifyRgbColors = false,
    removeInvalid = true,
    removeDefaults = true,
    cleanUpStrokes = true,
    normalizeTransforms = true,
    exclude = [],
    width = 0,
    height = 0,
} = {}) {

    //autoRoundValues = false;


    let nodeName = el.nodeName.toLowerCase();
    let attProps = getSvgPresentationAtts(el)
    let cssProps = getSvgCssProps(el)

    /**
     * merge props
     * CSS has higher specificity
     */
    let props = {
        ...attProps,
        ...cssProps,
    }

    //console.log('!props combined', props);


    delete props['style'];
    exclude.push('style')

    let remove = ['style']
    let transformsStandalone = ['scale', 'translate', 'rotate'];

    /**
     * remove invalid properties 
     * e.g font-family for <path>
     */

    if (removeInvalid || removeDefaults || removeNameSpaced) {
        let propsFilteredObj = filterSvgElProps(nodeName, props, { removeDefaults, removeNameSpaced, exclude, cleanUpStrokes, include: transformsStandalone, cleanUpStrokes: false })
        props = propsFilteredObj.propsFiltered
        remove.push(...propsFilteredObj.remove)
    }

    //console.log('???props', nodeName,  props, remove);

    // sanitized prop array
    let propArr = []

    for (let prop in props) {

        let valueStr = props[prop];

        // we parse the path data separately
        if (prop === 'd' || prop.startsWith('data-')) {
            continue;
        }

        let item = { prop, values: [] }

        // minify rgb values
        if (minifyRgbColors && colorProps.includes(prop)) {
            let color = parseColor(valueStr)
            if (color.mode === 'rgba' || color.mode === 'rgb') {
                let hex = rgba2Hex(color)
                valueStr = hex;
            }
        }


        if (prop === 'transform') {
            let transArr = []

            //split transform functions
            let transFormFunctions = valueStr.split(/(\w+)\(([^)]+)\)/).map(val => val.trim()).filter(Boolean)

            for (let i = 1; i < transFormFunctions.length; i += 2) {
                let fn = transFormFunctions[i - 1];
                let isHorizontal = transHorizontal.includes(fn);
                let isVertical = transVertical.includes(fn);
                if (isHorizontal) fn = fn.replace('X', '')
                if (isVertical) fn = fn.replace('Y', '')
                let values = transFormFunctions[i].split(/,| /).filter(Boolean)
                let transItem = { fn, values: [] }

                for (let v = 0; v < values.length; v++) {
                    let transValues = parseValue(values[v])
                    transItem.values.push(...transValues)
                }

                let defaultX = fn.startsWith('scale') ? 1 : 0;
                let defaultY = fn.startsWith('scale') ? 1 : 0;

                if (isHorizontal) transItem.values = [transItem.values[0], { value: defaultX, unit: '', numeric: true }]
                if (isVertical) transItem.values = [{ value: defaultY, unit: '', numeric: true }, transItem.values[0]]

                transArr.push(transItem)
            }

            //item.transforms = transArr;
            if (transArr.length) {
                propArr.push({ prop: 'transforms', values: transArr })
            }
        }

        // other props
        else {
            //console.log('other', prop);
            item.values = parseValue(valueStr);

        }

        if (item.values.length) {
            propArr.push(item)
        }

    }

    /**
     * normalize values to 
     * user units
     */

    //console.log('!!!propArr', propArr);

    let propsNorm = { transformArr: [], matrix: null, transComponents: null }
    let transFormOrigin = []
    let normalizedDiagonal = false;

    for (let i = 0; i < propArr.length; i++) {
        let item = propArr[i];
        let { prop, values } = item;
        let valsNew = [], valX = 0, valY = 0, unitX = '', unitY = '';

        if (prop !== 'transforms') {

            if (cleanUpStrokes && (prop === 'stroke-dasharray' || prop === 'stroke-dashoffset')) {
                normalizedDiagonal = true
                for (let i = 0; i < values.length; i++) {
                    let val = normalizeUnits(values[i].value, { unit: values[i].unit, width, height, normalizedDiagonal, fontSize })
                    valsNew.push(val)
                }
            }

            else if (prop === 'transform-origin') {

                values.forEach((item, i) => {
                    let val = item.value
                    if (val === 'left') values[i].value = 0;
                    else if (val === 'right') values[i].value = width;
                    else if (val === 'top') values[i].value = 0;
                    else if (val === 'bottom') values[i].value = height;
                    else if (val === 'center') values[i].value = '50%';
                })

                valX = values[0].value;
                valY = values[1] ? values[1].value : valX;
                unitX = values[0].unit;
                unitY = values[1] ? values[1].unit : unitX;

                // normalize units for matrix calculation
                valX = normalizeUnits(valX, { unit: unitX, width, height, isHorizontal: true, fontSize })
                valY = normalizeUnits(valY, { unit: unitY, width, height, isVertical: true, fontSize })
                transFormOrigin.push(valX, valY)


            } else {

                for (let v = 0; v < values.length; v++) {
                    let val = values[v];

                    //let unit = val.unit[v];
                    let unit = val.unit;
                    let valAbs = val.value;
                    let isNumeric = val.numeric

                    let isHorizontal = horizontalProps.includes(prop)
                    let isVertical = verticalProps.includes(prop)


                    if (unit) {
                        if (prop === 'scale' && unit === '%') {
                            valAbs = valAbs * 0.01;
                        } else {
                            if (prop === 'r') normalizedDiagonal = true;
                            valAbs = normalizeUnits(val.value, { unit, width, height, isHorizontal, isVertical, normalizedDiagonal, fontSize })

                            if (autoRoundValues && isNumeric) {
                                valAbs = autoRound(valAbs)
                            }

                            //console.log('norm', prop, valAbs, 'val', val, unit, isHorizontal, isVertical, width, height, 'isNumeric', isNumeric);
                        }
                    }
                    valsNew.push(valAbs)
                }
            }

            if (valsNew.length) propsNorm[prop] = valsNew;

        }

        // is transform properties and functions
        else {

            let transforms = values || []

            let len = transforms.length
            let transFormAllObj = [];

            for (let t = 0; len && t < len; t++) {
                let { fn, values } = transforms[t];
                let valsN = [], unitX = '', unitY = '', transformFunctionArr = [];

                // defaults
                let valX = 0;
                let valY = 0;
                let transObj = {}

                // console.log('!!!values', values);
                if (fn === 'scale' || fn === 'translate') {
                    valX = values[0].value;
                    valY = values[1] ? values[1].value : valX;
                    unitX = values[0].unit;
                    unitY = values[1] ? values[1].unit : unitX;

                    if (fn === 'scale') {
                        valX = unitX === '%' ? valX * 0.01 : valX
                        valY = unitY === '%' ? valY * 0.01 : valY
                    } else {
                        valX = normalizeUnits(valX, { unit: unitX, width, height, isHorizontal: true, fontSize })
                        valY = normalizeUnits(valY, { unit: unitY, width, height, isVertical: true, fontSize })

                    }
                    valsN.push(valX, valY)

                    transObj[fn] = valsN;
                    transformFunctionArr.push(transObj)

                }

                if (fn === 'matrix') {
                    valsN = values.map(val => val.value)
                    transObj[fn] = valsN;
                    transformFunctionArr.push(transObj)
                }

                if (fn === 'skew') {
                    //valsN = values.map(val => val.value)
                    valX = values[0].value
                    unitX = values[0].unit
                    valY = values[1].value
                    unitY = values[1].unit
                    //console.log(unitX, unitY);

                    valX = normalizeUnits(valX, { unit: unitX, isHorizontal: true, fontSize })
                    valY = normalizeUnits(valY, { unit: unitY, isVertical: true, fontSize })

                    // normalize large angles
                    valX = valX > 360 ? (valX % 360) : valX
                    valY = valY > 360 ? (valY % 360) : valY

                    //console.log('skew', valX);

                    valsN = [valX, valY]
                    transObj[fn] = valsN;
                    transformFunctionArr.push(transObj)

                }

                // SVG rotations may contain a transform origin
                if (fn === 'rotate') {

                    let angle = values[0].value;
                    let unit = values[0].unit;
                    angle = normalizeUnits(angle, { unit })
                    //let rot = [`${fn}(${angle})`]
                    let hasPivot = values.length === 3;
                    let transOrigin = [];

                    //console.log('values', values);
                    if (hasPivot) {
                        //console.log('has pivot point');
                        let cx = values[1].value
                        let cy = values[2].value
                        transOrigin.push({ translate: [cx, cy] }, { translate: [-cx, -cy] })

                    }

                    transObj[fn] = [angle];

                    if (transOrigin.length) {
                        transformFunctionArr.push(transOrigin[0], transObj, transOrigin[1])
                    } else {
                        transformFunctionArr.push(transObj)
                    }
                }

                transFormAllObj.push(...transformFunctionArr)

            }

            //propsNorm['transform'] = transFormAll
            propsNorm['transformArr'] = transFormAllObj

        }

        //console.log('transFormOrigin', transFormOrigin);

    }


    // prepend standalone transforms before standards
    let translate = propsNorm['translate'] !== undefined ? { translate: propsNorm['translate'] } : null;
    let scale = propsNorm['scale'] !== undefined ? { scale: propsNorm['scale'] } : null;
    let rotate = propsNorm['rotate'] !== undefined ? { rotate: propsNorm['rotate'] } : null;
    let standaloneTransforms = [translate, rotate, scale].filter(Boolean)

    if (standaloneTransforms.length) {
        if (normalizeTransforms) remove.push('translate', 'scale', 'rotate')
        propsNorm['transformArr'] = [...standaloneTransforms, ...propsNorm['transformArr']]
    }


    // replace transform-origin with translates
    //console.log('transFormOrigin', transFormOrigin);
    if (transFormOrigin.length && propsNorm['transformArr'] !== undefined) {
        propsNorm['transformArr'] = [
            { translate: [transFormOrigin[0], transFormOrigin[1]] },
            ...propsNorm['transformArr'],
            { translate: [-transFormOrigin[0], -transFormOrigin[1]] },
        ]
        if (normalizeTransforms) remove.push('transform-origin')
    }


    /**
     * test run 
     * apply parsed transforms
     */
    let { transformArr = [] } = propsNorm


    let transAtt = []
    let l = transformArr.length
    if (l) {
        for (let i = 0; l && i < l; i++) {
            let prop = transformArr[i]
            let values = Object.values(prop).flat();
            let name = Object.keys(prop)[0]
            if (name === 'skew') {
                if (values[0]) transAtt.push(`skewX(${values[0]})`)
                if (values[1]) transAtt.push(`skewY(${values[1]})`)
            } else {
                transAtt.push(`${name}(${values.join(' ')})`)
            }
        }
        // consolidate transforms to matrix
        //addTransFormProps(propsNorm);
    }

    //console.log('parseStylesProperties', props);
    propsNorm.remove = remove
    propsNorm.type = nodeName

    //console.log('!!!propsNorm', nodeName, JSON.parse(JSON.stringify(propsNorm)));
    return propsNorm

}

/**
* consolidate transforms to matrix
*/
export function addTransFormProps(propsObj = {}, transformArr = []) {
    if (propsObj.transformArr === undefined || !transformArr.length) return;

    // take existing array or custom
    transformArr = transformArr.length ? transformArr : propsObj.transformArr;
    let matrix = getMatrixFromTransform(transformArr);
    propsObj['matrix'] = matrix;

    let transComponents = qrDecomposeMatrix(matrix, 3)
    propsObj.transComponents = transComponents;

    return propsObj
}

/**
 * filter out nonsense 
 * presentation attributes or
 * style properties not valid
 * for element type
 */
export function filterSvgElProps(elNodename = '', props = {}, {
    removeInvalid = true,
    removeDefaults = true,
    allowDataAtts = true,
    cleanUpStrokes = true,
    include = ['id', 'class'],
    exclude = [],
} = {}) {
    let propsFiltered = {}
    let remove = [];

    // allow defaults for nested
    //removeDefaults = false;

    let noStrokeColor = cleanUpStrokes ? (props['stroke'] === undefined) : false;
    //console.log('noStrokeColor', elNodename, 'cleanUpStrokes', cleanUpStrokes);

    for (let prop in props) {
        let values = props[prop]
        let value = Array.isArray(values) ? values[0] : values;
        //console.log(prop, Array.isArray(values));

        // filter out useless
        let isValid = removeInvalid ?
            (attLookup.atts[prop] ? attLookup.atts[prop].includes(elNodename) : false) :
            false;

        // remove null transforms
        if(prop==='transform' && value==='matrix(1 0 0 1 0 0)') isValid = false;

        // allow data attributes
        let isDataAtt = allowDataAtts ? prop.startsWith('data-') : false;

        // filter out defaults
        let isDefault = removeDefaults ?
            (attLookup.defaults[prop] ? attLookup.defaults[prop] !== undefined && attLookup.defaults[prop].includes(value) : false) :
            false;


        if (isDataAtt || include.includes(prop)) isValid = true;
        if (isDefault) isValid = false
        if (exclude.length && exclude.includes(prop)) isValid = false;
        if (noStrokeColor && strokeAtts.includes(prop)) isValid = false

        if (isValid) {
            propsFiltered[prop] = props[prop]
        }
        else {
            remove.push(prop)
        }
    }

    /*
    // set explicit stroke width when disabled by stroke color
    if (propsFiltered['stroke'] && propsFiltered['stroke'][0] === 'none') {
        propsFiltered['stroke-width'] = [1]
        remove.push('stroke', 'stroke-width')
        console.log('remove', remove);
    }
    */


    //remove=[]
    return { propsFiltered, remove }
}


export function parseValue(valStr = '') {
    let valArr = valStr.split(/,| /);

    for (let i = 0; i < valArr.length; i++) {

        let valStr = valArr[i];
        let val = { value: null, unit: '', numeric: false }
        let isNumeric = isNumericValue(valStr);
        if (!isNumeric) {
            val.value = valStr
        }
        else if (isNumeric) {
            let unit = getUnit(valStr)
            let valNum = parseFloat(valStr)
            val.value = valNum;
            val.unit = unit;
            val.numeric = true
        }
        valArr[i] = val;
    }

    return valArr;
}



export function getSvgCssProps(el) {
    let styleAtt = el.getAttribute('style')
    let props = styleAtt ? parseInlineCss(styleAtt) : {}
    return props
}

export function getSvgPresentationAtts(el) {
    let props = {}
    let atts = [...el.attributes].map((att) => att.name);
    let l = atts.length;
    if (!l) return props;

    for (let i = 0; i < l; i++) {
        let att = atts[i];
        let value = el.getAttribute(att);

        // test invalid transform functions
        if (att === 'transform') {
            let transformSan = [];
            let transFormFunctions = value.split(/(\w+)\(([^)]+)\)/).map(val => val.trim()).filter(Boolean)
            //console.log('!!transFormFunctions', el.nodeName, transFormFunctions);
            for (let i = 1; i < transFormFunctions.length; i += 2) {
                let prop = transFormFunctions[i - 1];
                let val = transFormFunctions[i];
                let units = val.split(/,| /).map(val => getUnit(val.trim())).filter(Boolean)

                // remove invalid transform function
                if (!units.length) {
                    transformSan.push(`${prop}(${val})`)
                }
            }
            value = transformSan.join(' ');
        }

        props[att] = value.trim()
    }

    //console.log('!!!svg props', props, 'remove', remove);
    return props;
}


function parseInlineCss(styleAtt = '') {

    let props = {}
    if (!styleAtt) return props;

    let styleArr = styleAtt.split(';').filter(Boolean).map(prop => prop.trim());
    let l = styleArr.length
    if (!l) return props;

    for (let i = 0; l && i < l; i++) {
        let style = styleArr[i]
        let [prop, value] = style.split(':').filter(Boolean)
        props[prop] = value;
    }

    return props
}
