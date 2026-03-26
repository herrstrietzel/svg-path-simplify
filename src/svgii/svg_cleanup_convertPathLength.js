export function convertPathLengthAtt(el, {
    styleProps = {}
}={}) {

    let pathLength = el.getAttribute('pathLength') ? +el.getAttribute('pathLength') : 0;
    //let strokeDasharray 
    if (pathLength && (styleProps['stroke-dasharray'] || styleProps['stroke-dashoffset'])) {
        let elLength = getElementLength(el, {
            pathLength,
            props: styleProps
        })

        let scale = elLength / pathLength
        //scale = 1/scale

        styleProps = scaleProps(styleProps, { props: ['stroke-dasharray', 'stroke-dashoffset'], scale })
        let [strokeDasharrayN = [], strokeDashoffsetN = []] = [styleProps['stroke-dasharray'], styleProps['stroke-dashoffset']]
        //if(strokeDasharrayN.length) el.setAttribute('stroke-dasharray', strokeDasharrayN.map(val=>roundTo(val, 3)).join(' '))
        //if(strokeDashoffsetN.length) el.setAttribute('stroke-dashoffset', strokeDashoffsetN.map(val=>roundTo(val, 3)).join(' '))

        // tag for removal
        delete styleProps['pathLength'];
        styleProps.remove.push('pathLength')
        el.removeAttribute('pathLength')

        //console.log(name, styleProps, 'pathLength', pathLength, elLength, scale, 'strokeDasharrayN', strokeDasharrayN);
    }

    return styleProps;


}