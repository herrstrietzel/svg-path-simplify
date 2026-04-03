import { roundTo } from "./rounding";

export function setNormalizedTransformsToEl(el, {
  styleProps = {},
} = {}) {
  let { remove, matrix, transComponents } = styleProps;
  let name = el.nodeName.toLowerCase()

  if(!matrix) return styleProps;

  let { rotate, scaleX, scaleY, skewX, translateX, translateY } = transComponents;
  //console.log(rotate, scaleX, scaleY, skewX, skewY, translateX, translateY);

  // scale attributes instead of transform
  let hasRot = rotate !== 0 || skewX !== 0;
  let unProportional = scaleX !== scaleY;
  let scalableByAtt = ['circle', 'ellipse', 'rect']
  //let needsTrans = (name === 'g') || (hasRot) || unProportional
  let needsTrans = (hasRot) || unProportional
  needsTrans = true

  if (!needsTrans && scalableByAtt.includes(name)) {

    if (name === 'circle' || name === 'ellipse') {
      styleProps.cx[0] = [styleProps.cx[0] * scaleX + translateX]
      styleProps.cy[0] = [styleProps.cy[0] * scaleX + translateY]

      if (styleProps.r) styleProps.r[0] = [styleProps.r[0] * scaleX]
      if (styleProps.rx) styleProps.rx[0] = [styleProps.rx[0] * scaleX]
      if (styleProps.ry) styleProps.ry[0] = [styleProps.ry[0] * scaleX]

    }
    else if (name === 'rect') {
      let x = styleProps.x ? styleProps.x[0] + translateX : translateX;
      let y = styleProps.y ? styleProps.y[0] + translateY : translateY;

      let rx = styleProps.rx ? styleProps.rx[0] * scaleX : 0;
      let ry = styleProps.ry ? styleProps.ry[0] * scaleY : 0;

      styleProps.x = [x]
      styleProps.y = [y]

      styleProps.rx = [rx]
      styleProps.ry = [ry]

      styleProps.width = [styleProps.width[0] * scaleX]
      styleProps.height = [styleProps.height[0] * scaleX]
    }

    // remove now obsolete transform properties
    delete styleProps.matrix
    delete styleProps.transformArr
    delete styleProps.transComponents

    // mark transform attribute for removal
    styleProps.remove.push('transform')

    // scale props like stroke width or dash-array
    styleProps = scaleProps(styleProps, { props: ['stroke-width', 'stroke-dasharray'], scale: scaleX })

  } else {
    el.setAttribute('transform', transComponents.matrixAtt)

  }

  return styleProps

}



export function scaleProps(styleProps = {}, { props = [], scale = 1 } = {}, round = true) {
  if (scale === 1 || !props.length) return props;

  for (let i = 0; i < props.length; i++) {
    let prop = props[i];

    if (styleProps[prop] !== undefined) {
      styleProps[prop] = styleProps[prop].map(val => round ? roundTo(val * scale, 3) : val * scale)
    }
  }
  return styleProps
}