import { parseCSSTransform, parseTransform } from "./svgii/svg-styles-getTransforms";
import { getElAttributes, getElementProps, getElStyleProps } from "./svgii/svg-styles-to-attributes";

export function flattenTransforms(svg) {

    let els = svg.querySelectorAll('*');
    let transformsGlobal = []

    els.forEach(el => {

        let props = getElementProps(el)

        /*
        let attProps = getElAttributes(el)
        let cssProps = getElStyleProps(el)

        // merge properties
        let props = {
            ...attProps,
            //...cssProps
        }

        console.log('props', props);
        */

        /*
        let transformAtt = el.getAttribute('transform')
        let transCSS = el.getAttribute('style')
        //parseCSSTransform()
        if(transformAtt){
            let mtx = parseTransform(transformAtt)
            //console.log(mtx, transformAtt);

        }
        */


    })




}