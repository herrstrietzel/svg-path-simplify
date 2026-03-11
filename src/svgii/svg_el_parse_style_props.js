/**
 * parse svg presentational attributes
 * or CSS styles
 */

import { rad2Deg } from "../constants";
import { getUnit, isNumericValue, normalizeUnits } from "./convert_units";
import { autoRound } from "./rounding";
import { attLookup, horizontalProps, strokeAtts, verticalProps } from "./svg-styles-to-attributes-const";

export function parseStylesProperties(el, {
    removeNameSpaced = true,
    autoRoundValues = true,
    removeInvalid = true,
    removeDefaults = true,
    cleanUpStrokes = true,
    exclude = [],
    width = 0,
    height = 0,
} = {}) {

    let nodeName = el.nodeName.toLowerCase();
    let attProps = getSvgPresentationAtts(el)
    let cssProps = getSvgCssProps(el)

    console.log('cssProps', cssProps);

    /**
     * merge props
     * CSS has higher specificity
     */
    let props = {
        ...attProps,
        ...cssProps,
    }

    delete props['style'];
    exclude.push('style')

    let remove = ['style']

    let transformsStandalone = ['scale', 'translate', 'rotate'];

    //let testProp = normalizeUnits(0.5, {unit:'turn'})
    //console.log('testProp', testProp);


    /**
     * remove invalid properties 
     * e.g font-family for <path>
     */

    if (removeInvalid || removeDefaults || removeNameSpaced) {
        let propsFilteredObj = filterSvgElProps(nodeName, props, { removeDefaults, removeNameSpaced, exclude, cleanUpStrokes, include: transformsStandalone })
        props = propsFilteredObj.propsFiltered
        remove.push(...propsFilteredObj.remove)
    }

    //console.log('!!!props', props, remove);

    // sanitized prop array
    let propArr = []

    for (let prop in props) {

        let valueStr = props[prop];

        // we parse the path data separately
        if (prop === 'd') continue;

        let item = { prop, values: [] }

        if (prop === 'transform') {
            //let regex = /(\w+)\(([^)]+)\)/g;
            //let match;
            let transArr = []

            //split transform functions
            let transFormFunctions = valueStr.split(/(\w+)\(([^)]+)\)/).map(val => val.trim()).filter(Boolean)
            //console.log(transFormFunctions);

            for (let i = 1; i < transFormFunctions.length; i += 2) {
                let fn = transFormFunctions[i - 1];
                let values = transFormFunctions[i].split(/,| /).filter(Boolean)
                let transItem = { fn, values: [] }

                for (let v = 0; v < values.length; v++) {
                    //let { value, unit } = parseValue(values[v])
                    let transValues = parseValue(values[v])
                    //console.log('!!!transValues', transValues);
                    transItem.values.push(...transValues)
                    //transItem.units.push(unit)
                }
                transArr.push(transItem)
            }

            //item.transforms = transArr;
            if (transArr.length) {
                propArr.push({ prop: 'transforms', values: transArr })
            }
            //console.log('transArr', transArr); 
        }
        // other propa
        else {
            item.values = parseValue(valueStr);
            //item[prop] = (valueStr);
        }

        if (item.values.length) {
            propArr.push(item)
        }

    }

    /**
     * normalize values to 
     * user units
     */

    console.log('!!!propArr', propArr);

    let propsNorm = {}
    let transFormOrigin = []

    for (let i = 0; i < propArr.length; i++) {
        let item = propArr[i];
        let { prop, values } = item;
        //let itemN = {prop}
        let valsNew = [], valX = 0, valY = 0, unitX = '', unitY = '';

        if (prop !== 'transforms') {
            //console.log('---prop', prop, values, width, height);

            if (prop === 'transform-origin') {

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
                valX = normalizeUnits(valX, { unit: unitX, width, height, isHorizontal: true, autoRoundValues })
                valY = normalizeUnits(valY, { unit: unitY, width, height, isVertical: true, autoRoundValues })

                transFormOrigin.push(valX, valY)


            } else {

                for (let v = 0; v < values.length; v++) {
                    let val = values[v];

                    let unit = val.unit[v];
                    let valAbs = val.value;

                    let isHorizontal = horizontalProps.includes(prop)
                    let isVertical = verticalProps.includes(prop)

                    if (unit) {
                        valAbs = normalizeUnits(val.value, { unit, width, height, isHorizontal, isVertical, autoRoundValues })
                        //if (autoRoundValues) valAbs = autoRound(valAbs)
                    }

                    valsNew.push(valAbs)
                }

            }

            //propsNorm[prop] = valsNew.length === 1 ? valsNew[0] : valsNew;
            if (valsNew.length) propsNorm[prop] = valsNew;

        } else {

            let transforms = values || []
            //console.log('transforms', transforms, prop, item);

            let len = transforms.length
            let transFormAll = []
            for (let t = 0; len && t < len; t++) {
                let { fn, values } = transforms[t];
                let valsN = [], valX = 0, valY = 0, unitX = '', unitY = '', transformFunction = [];

                // console.log('!!!values', values);
                if (fn === 'scale' || fn === 'translate') {
                    valX = values[0].value;
                    valY = values[1] ? values[1].value : valX;
                    unitX = values[0].unit;
                    unitY = values[1] ? values[1].unit : unitX;

                    if (fn === 'scale') {
                        valX = unitX = '%' ? valX / 100 : valX
                        valY = unitY = '%' ? valY / 100 : valY

                    } else {
                        valX = normalizeUnits(valX, { unit: unitX, width, height, isHorizontal: true, autoRoundValues })
                        valY = normalizeUnits(valY, { unit: unitY, width, height, isVertical: true, autoRoundValues })

                    }
                    valsN.push(valX, valY)

                    transformFunction.push(`${fn}(${valsN.join(' ')})`)

                }

                // SVG rotations may contain a transform origin
                if (fn === 'rotate') {

                    let angle = values[0].value;
                    let unit = values[0].unit;
                    angle = normalizeUnits(angle, { unit, autoRoundValues })
                    //if(unit==='rad') angle = angle*rad2Deg;
                    let rot = [`${fn}(${angle})`]

                    if (values.length === 3) {
                        //console.log('has pivot point');
                        let cx = values[1].value
                        let cy = values[2].value
                        rot = [`translate(${cx} ${cy})`, rot[0], `translate(${-cx} ${-cy})`]
                    }
                    //transFormAll.push(...rot)
                    transformFunction = rot

                }

                //transFormAll.push(`${fn}(${valsN.join(' ')})`)
                transFormAll.push(...transformFunction)
                //console.log('transFormAll', transFormAll);

            }

            propsNorm['transform'] = transFormAll

        }


        //console.log('transFormOrigin', transFormOrigin);

    }


    // append standalone transforms
    let translate = propsNorm['translate'] !== undefined ? `translate(${propsNorm['translate'].join(' ')})` : null;
    let scale = propsNorm['scale'] !== undefined ? `scale(${propsNorm['scale'].join(' ')})` : null;
    let rotate = propsNorm['rotate'] !== undefined ? `rotate(${propsNorm['rotate'].join(' ')})` : null;

    let standaloneTransforms = [translate, rotate, scale].filter(Boolean)
    if (standaloneTransforms.length) {
        remove.push('translate', 'scale', 'rotate')
        propsNorm['transform'] = [...propsNorm['transform'], ...standaloneTransforms ]
    }

    console.log('standaloneTransforms', standaloneTransforms);
    //if()


    // replace transform-origin with translates
    if (transFormOrigin.length && propsNorm['transform'] !== undefined) {
        //console.log('transFormOrigin', transFormOrigin);
        propsNorm['transform'] = [`translate(${transFormOrigin[0]} ${transFormOrigin[1]})`, ...propsNorm['transform'], `translate(${-transFormOrigin[0]} ${-transFormOrigin[1]})`]
    }





    console.log('!!!propsNorm', propsNorm);

    //console.log('parseStylesProperties', props);




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


    let noStrokeColor = cleanUpStrokes ? (props['stroke'] === undefined) : false;

    for (let prop in props) {
        let value = props[prop];
        //console.log(prop);

        // filter out useless
        let isValid = removeInvalid ?
            (attLookup.atts[prop] ? attLookup.atts[prop].includes(elNodename) : false) :
            false;

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
