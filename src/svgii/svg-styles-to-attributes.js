import { getMatrix, parseCSSTransform, parseTransform } from './svg-styles-getTransforms';
import { attLookup } from './svg-styles-to-attributes-const';

/*
export function parseStyleProperty(propName='', value=''){

    let propObj = {}
    //console.log(propName, value);

    // check for numbers or units
    if(propName==='transform'){

        //let trans = parseCSSTransform()

    }
    else if(propName==='d'){
        propObj = {name:propName, value}
    }

    return propObj

}
*/


export function getElementProps(el, {
    removeNameSpaced = true,
    decimals = -1
} = {}) {

    let nodeName = el.nodeName.toLowerCase();
    let attProps = getElAttributes(el)
    let cssProps = getElStyleProps(el)


    // normalize transform attributes
    if (attProps['transform']) {

        let transAtt = attProps['transform']
        let transArr = transAtt.match(/[a-z]+\([^)]*\)/gi);


        //console.log(`attProps['transform']`, transAtt);


        let transforms = [];
        transArr.forEach(trans => {
            let [prop, vals] = trans.split(/\(|\)/).filter(Boolean)
            //let prop = vals[0];
            vals = vals.split(/,| /).filter(Boolean).map(Number)
            console.log('trans', prop, vals);

            let cssTrans = '';

            // rotate has origin
            if (prop === 'rotate' && vals.length === 3) {

                cssTrans = `
                translate(${vals[1]}px, ${vals[2]}px)
                rotate(${vals[0]}deg)
                translate(${-vals[1]}px, ${-vals[2]}px)
                `
                /*
                transforms.push({ prop: 'translate', values: [vals[1], vals[2]] })
                transforms.push({ prop: 'rotate', values: [vals[0]] })
                transforms.push({ prop: 'translate', values: [-vals[1], -vals[2]] })
                */
            } else {
                cssTrans = `
                ${prop}(${vals[1]}px, ${vals[2]}px)
                rotate(${vals[0]}deg)
                translate(${-vals[1]}px, ${-vals[2]}px)
                `


                //transforms.push({ prop, values: [vals[0]] })
            }
        })

        console.log('transforms', transforms);




    }

    // merge properties
    let props = {
        ...attProps,
        ...cssProps
    }


}


export function svgStylesToAttributes(el, {
    removeNameSpaced = true,
    decimals = -1
} = {}) {

    let nodeName = el.nodeName.toLowerCase();
    let attProps = getElAttributes(el)
    let cssProps = getElStyleProps(el)

    // normalize transform attributes
    /*
    if (attProps['transform']) {
        console.log(`attProps['transform']`, attProps['transform']);
    }
    */

    // merge properties
    let props = {
        ...attProps,
        ...cssProps
    }

    // filter out obsolete properties
    let propsFiltered = {}

    // parse CSS transforms
    let cssTrans = cssProps['transform']

    if (cssTrans) {
        let transStr = `${cssTrans}`
        let transformObj = parseCSSTransform(transStr)
        let matrix = getMatrix(transformObj)

        // apply as SVG matrix transform
        props['transform'] = `matrix(${Object.values(matrix).join(',')})`
    }


    // can't be replaced with attributes
    let cssOnlyProps = ['inline-size']
    let styleProps = [];

    for (let prop in props) {

        let value = props[prop];

        // CSS variable
        if (value && prop.startsWith('--') || cssOnlyProps.includes(prop) ||
            (!removeNameSpaced && prop.startsWith('-'))) {
            styleProps.push(`${prop}:${value}`)
            continue
        }

        // check if property is valid
        if (value && attLookup.atts[prop] &&
            (attLookup.atts[prop] === '*' ||
                attLookup.atts[prop].includes(nodeName) ||
                !removeNameSpaced && (prop.includes(':'))
            )
        ) {
            propsFiltered[prop] = value
        }

        // remove property
        el.removeAttribute(prop)

    }

    // apply filtered attributes
    for (let prop in propsFiltered) {
        let value = propsFiltered[prop]
        el.setAttribute(prop, value)
    }

    if (styleProps.length) {
        el.setAttribute('style', styleProps.join(';'));
    }

    //console.log('propsFiltered', propsFiltered);

    return propsFiltered;

}


function parseInlineStyle(styleAtt = '') {

    let props = {}
    if (!styleAtt) return props;

    let styleArr = styleAtt.split(';').filter(Boolean).map(prop => prop.trim());
    let l = styleArr.length
    if (!l) return props;

    for (let i = 0; l && i < l; i++) {
        let style = styleArr[i]
        let [prop, value] = style.split(':').filter(Boolean)
        props[prop] = value;
        //props.push(`${prop}:${value}`)
    }

    return props
}

export function getElStyleProps(el) {
    let styleAtt = el.getAttribute('style')
    let props = styleAtt ? parseInlineStyle(styleAtt) : {}
    return props
}

export function getElAttributes(el) {
    let props = {}
    let atts = [...el.attributes].map((att) => att.name);
    let l = atts.length;
    if (!l) return props;

    for (let i = 0; i < l; i++) {
        let att = atts[i];
        let value = el.getAttribute(att);
        props[att] = value
    }

    return props;
}


/*
function roundValue(value = '', decimals = -1) {
    if (decimals < 0) return value;
    value = value.replace(/["]/g, '').trim()
    let valueNum = parseFloat(value);
    let valueHasNumber = !isNaN(valueNum);
    if (!valueHasNumber) return value;

    let unit = valueHasNumber ? getUnit(value) : '';
    if (valueHasNumber) value = `${valueNum.toFixed(decimals)}${unit}`;
    //console.log('rounded', value)
    return value;
}
*/
