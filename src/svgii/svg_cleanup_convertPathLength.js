import { scaleProps } from "./svg_cleanup_normalize_transforms";
import { getElementLength } from "./svg_getElementLength";

export function convertPathLengthAtt(el, {
    styleProps = {}
} = {}) {

    let pathLength = styleProps['pathLength'];

    if (pathLength) {

        //let strokeDasharray 
        if ((styleProps['stroke-dasharray'] || styleProps['stroke-dashoffset'])) {
            let elLength = getElementLength(el, {
                pathLength,
                props: styleProps
            })

            let scale = elLength / pathLength
            styleProps = scaleProps(styleProps, { props: ['stroke-dasharray', 'stroke-dashoffset'], scale })

            // set absolute
            if (styleProps['stroke-dasharray']) el.setAttribute('stroke-dasharray', styleProps['stroke-dasharray'].join(' '))
            if (styleProps['stroke-dashoffset']) el.setAttribute('stroke-dashoffset', styleProps['stroke-dashoffset'][0])

        }

        // tag for removal
        delete styleProps['pathLength'];
        styleProps.remove.push('pathLength')
        el.removeAttribute('pathLength')


    }

    return styleProps;


}