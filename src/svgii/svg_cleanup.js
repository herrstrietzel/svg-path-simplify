import { getElementAtts } from "../svg-getAttributes";
import { flattenTransforms } from "../svg_flatten_transforms";
import { getViewBox } from "../svg_getViewbox";
import { isNumericValue, normalizeUnits } from "./convert_units";
import { getPathDataVertices } from "./geometry";
import { checkBBoxIntersections, getPathDataBBox, getPolyBBox } from "./geometry_bbox";
import { getElBBox } from "./geometry_bbox_element";
import { parsePathDataString } from "./pathData_parse";
import { parsePathDataNormalized } from "./pathData_convert";
import { pathElToShape, shapeElToPath } from "./pathData_parse_els";
//import { scaleProps } from "./svg-styles-to-attributes";
import { geometryEls, renderedEls, shapeEls, strokeAtts } from "./svg-styles-to-attributes-const";
import { addTransFormProps, filterSvgElProps, parseStylesProperties } from "./svg_el_parse_style_props";
import { autoRound } from "./rounding";
import { getMatrixFromTransform } from "./svg-styles-getTransforms";
import { qrDecomposeMatrix } from "./transform_qr_decompose";
import { svgNs } from "../constants";


export function removeEmptySVGEls(svg) {
  let els = svg.querySelectorAll('g, defs');
  els.forEach(el => {
    if (!el.children.length) el.remove()
  })
}

//const DOMParserPoly = globalThis.DOMParser;


export function cleanUpSVG(svgMarkup, {
  removeHidden = true,
  //removeUnused = true,
  stylesToAttributes = true,
  removePrologue = true,
  removeIds = false,
  removeClassNames = false,
  removeDimensions = false,
  fixHref = false,
  legacyHref = false,
  cleanupDefs = true,
  cleanupClip = true,
  addViewBox = false,
  addDimensions = false,
  minifyRgbColors = false,

  normalizeTransforms = true,
  autoRoundValues = true,

  unGroup = false,

  mergePaths = false,
  removeOffCanvas = true,
  cleanupSVGAtts = true,
  removeNameSpaced = true,
  attributesToGroup = true,
  //shapesToPaths = false,
  shapeConvert = false,
  convert_rects = false,
  convert_ellipses = false,
  convert_poly = false,
  convert_lines = false,

  convertTransforms = false,
  removeDefaults = true,
  cleanUpStrokes = true,
  decimals = -1,
  excludedEls = [],
} = {}) {

  //attributesToGroup = cleanupSVGAtts ? true : false;


  // replace namespaced refs 
  if (fixHref) svgMarkup = svgMarkup.replaceAll("xlink:href=", "href=");


  let svg = new DOMParser()
    .parseFromString(svgMarkup, "text/html")
    .querySelector("svg");

  let viewBox = getViewBox(svg)
  let { x, y, width, height } = viewBox;


  // get svg styles
  let propOptions = {
    width: width,
    height: height,
    normalizeTransforms,
    removeDefaults: false,
    cleanUpStrokes: false,
    autoRoundValues,
    minifyRgbColors,
  }
  let stylePropsSVG = parseStylesProperties(svg, propOptions)

  // add svg font size for scaling relative
  propOptions.fontSize = stylePropsSVG['font-size'] ? stylePropsSVG['font-size'][0] : 16;


  /**
   * get group styles
   * especially transformations to
   * be inherited by children
   */
  let groups = svg.querySelectorAll('g')
  let groupProps = [];

  groups.forEach(g => {
    let stylePropsG = parseStylesProperties(g, propOptions)
    groupProps.push(stylePropsG);
    let children = g.querySelectorAll(`${renderedEls.join(', ')}`)

    // store parent styles to child property
    children.forEach(child => {
      if (child.parentStyleProps === undefined) {
        child.parentStyleProps = []
      }
      child.parentStyleProps.push(stylePropsG)
    })
  })



  if (cleanupSVGAtts) {
    //console.log('cleanupSVGAtts');
    let allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class'];
    if (!stylesToAttributes) {
      allowed.push('fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'font-family', 'font-style', 'style');
    }

    removeExcludedAttribues(svg, allowed)
  }

  // add viewBox
  if (addViewBox) addSvgViewBox(svg, { x, y, width, height })
  if (addDimensions) {
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
  }


  // remove unused defs or optimize order
  if (cleanupDefs) cleanupSvgDefs(svg, { x, y, width, height, cleanupClip });


  // remove off canvas
  if (removeOffCanvas) removeOffCanvasEls(svg, { x, y, width, height });


  // always remove scripts
  let removeEls = ['metadata', 'script', ...excludedEls]

  removeSVGEls(svg, { removeEls, removeNameSpaced });

  // an array of all elements' properties
  let svgElProps = []
  let els = svg.querySelectorAll(`${renderedEls.join(', ')}`)


  for (let i = 0; i < els.length; i++) {
    let el = els[i];

    let name = el.nodeName.toLowerCase();
    //console.log(name);

    // 1. remove hidden elements
    let style = el.getAttribute('style') || ''
    let isHiddenByStyle = style ? style.trim().includes('display:none') : false;
    let isHidden = (el.getAttribute('display') && el.getAttribute('display') === 'none') || isHiddenByStyle;
    if (name.includes(':') || removeEls.includes(name) || (removeHidden && isHidden)) {
      el.remove();
      continue;
    }


    /**
     * get all style properties
     * convert relative or physical units
     * to user units
     */
    let styleProps = parseStylesProperties(el, propOptions)

    // get parent styles
    let { parentStyleProps = [] } = el;
    let inheritedProps = {}
    let transFormInherited = []


    /** inherit transforms 
     * and styles from group 
     */
    parentStyleProps.forEach(props => {
      // transforms from groups are applied cumulatively
      let { transformArr = [] } = props
      transFormInherited.push(...transformArr)

      // merge
      inheritedProps = {
        ...inheritedProps,
        ...props
      };
    })


    //merge transforms
    transFormInherited = [...transFormInherited, ...styleProps.transformArr]
    styleProps.transformArr = transFormInherited


    // merge with svg props
    styleProps = {
      ...stylePropsSVG,
      ...inheritedProps,
      ...styleProps
    }

    //console.log('inheritedProps', inheritedProps, name);


    // add combined transforms
    addTransFormProps(styleProps, transFormInherited);


    let { remove, matrix, transComponents } = styleProps;

    // mark attributes for removal
    if (removeClassNames) styleProps.remove.push('class')
    if (removeIds) styleProps.remove.push('id')
    if (removeDimensions) {
      styleProps.remove.push('width')
      styleProps.remove.push('height')
    }


    // styles to atts
    if (unGroup || convertTransforms || minifyRgbColors ) stylesToAttributes = true;


    if (stylesToAttributes) {

      /**
       * normalize transforms
       */
      if (normalizeTransforms && matrix) {
        let { rotate, scaleX, scaleY, skewX, translateX, translateY } = transComponents;
        //console.log(rotate, scaleX, scaleY, skewX, skewY, translateX, translateY);

        // scale attributes instead of transform
        let hasRot = rotate !== 0 || skewX !== 0;
        let unProportional = scaleX !== scaleY;
        let scalableByAtt = ['circle', 'ellipse', 'rect']
        let needsTrans = convertTransforms || (name === 'g') || (hasRot) || unProportional
        //needsTrans = true

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

          remove.push('transform')

          // scale props like stroke width or dash-array
          styleProps = scaleProps(styleProps, { props: ['stroke-width', 'stroke-dasharray'], scale: scaleX })

        } else {
          el.setAttribute('transform', transComponents.matrixAtt)

        }
      }


      /**
       * apply consolidated 
       * element attributes
       */

      let stylePropsFiltered = filterSvgElProps(name, styleProps,
        { removeDefaults: true, cleanUpStrokes });

      remove = [...remove, ...stylePropsFiltered.remove];

      for (let prop in stylePropsFiltered.propsFiltered) {
        let values = styleProps[prop]
        //console.log('add', prop);
        let val = values.length ? values.join(' ') : values[0]
        el.setAttribute(prop, val)
      }

      // remove obsolete attributes
      for (let i = 0; i < remove.length; i++) {
        let att = remove[i];
        if (!stylesToAttributes && att === 'style') continue

        //console.log('remove att', att, name);
        el.removeAttribute(att)
      }



      /**
       * remove group styles
       * copied to children
       * or remove nesting
       */

      if (unGroup) {
        groups.forEach((g, i) => {
          let children = [...g.children];

          children.forEach(child => {
            g.parentNode.insertBefore(child, g)
          })
          g.remove()
        })
      } else {
        groups.forEach((g, i) => {
          let atts = [...Object.keys(groupProps[i]), 'style', 'transform'];
          atts.forEach(att => {
            g.removeAttribute(att)
          })
        })

      }


    } // endof style processing


    /**
     * element conversions:
     * shapes to paths or 
     * paths to shapes
     */


    // force shape conversion when transform conversion is enabled
    if (convertTransforms) {
      shapeConvert = 'toPaths';
      convert_rects = true;
      convert_ellipses = true;
      convert_poly = true;
      convert_lines = true;
    }

    // convert shapes to paths
    if (shapeConvert === 'toPaths') {

      let { matrix = null, transComponents = null } = styleProps;

      if (matrix && transComponents) {
        // scale props like stroke width or dash-array before conversion
        ['stroke-width', 'stroke-dasharray'].forEach(att => {
          let attVal = el.getAttribute(att)
          let vals = attVal ? attVal.split(' ').filter(Boolean).map(Number).map(val => val * transComponents.scaleX) : []
          if (vals.length) el.setAttribute(att, vals.join(' '))
        })
      }

      // convert paths only if a matrix transform is required
      if (matrix ? geometryEls.includes(name) : shapeEls.includes(name)) {

        let path = shapeElToPath(el, { width, height, convert_rects, convert_ellipses, convert_poly, convert_lines, matrix });
        el.replaceWith(path)

        name = 'path'
        el = path;


      }

    }

    // convert paths to shapes 
    else if (shapeConvert === 'toShapes') {
      let paths = svg.querySelectorAll('path')
      paths.forEach(path => {
        let shape = pathElToShape(path, { convert_rects, convert_ellipses, convert_poly, convert_lines })
        path.replaceWith(shape)
        path = shape;
      })

    }



  }//endof element loop





  // remove futile clip-paths
  if (cleanupClip) removeFutileClipPaths(svg, { x, y, width, height })


  // replace href attributes with namespace - required by many older applications
  if (legacyHref) {
    svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink")
    let hrefs = svg.querySelectorAll('[href]')
    hrefs.forEach(el => {
      let href = el.getAttribute('href')
      el.setAttribute('xlink:href', href)
      el.removeAttribute('href')
    })
  }



  return { svg, svgElProps }

}


function removeOffCanvasEls(svg, { x = 0, y = 0, width = 0, height = 0 } = {}) {
  let els = [...svg.querySelectorAll('path, polygon, polyline, line, rect, circle, ellipse, text')];
  els = els.filter(el => !el.parentNode.closest('defs') && !el.parentNode.closest('symbol') && !el.parentNode.closest('clipPath') && !el.parentNode.closest('mask') && !el.parentNode.closest('pattern'))
  //console.log('removeOffCanvasEls', els, width, height);

  let bb0 = { x, y, width, height }
  bb0.right = x + width
  bb0.bottom = y + height

  els.forEach(el => {
    let bb = getElBBox(el)
    let outside = bb.right < bb0.x || bb.bottom < bb0.y || bb.x > bb0.right || bb.y > bb.bottom
    if (outside) el.remove();
  })

}

function addSvgViewBox(svg, { x = 0, y = 0, width = 0, height = 0 } = {}) {
  if (svg.hasAttribute('viewBox')) return;
  if (!width || !height) {
    ({ x, y, width, height } = getViewBox(svg));
  }
  svg.setAttribute('viewBox', [x, y, width, height].join(' '))
}


function cleanupSvgDefs(svg, { x = 0, y = 0, width = 0, height = 0, cleanupClip = true } = {}) {
  let defs = svg.querySelectorAll('defs')
  let defEls = svg.querySelectorAll('symbol, pattern, linearGradient, radialGradient, clipPath, mask, marker, filter')

  // no defs to remove/optimize
  if (!defs.length && !defEls.length) return;

  defs.forEach(def => {
    // remove empty defs
    let children = [...def.children]
    if (!children.length) {
      def.remove()
    }
    // move defs to top
    else {
      svg.insertBefore(def, svg.children[0])
    }
  })

  //clean up unused defs
  let refIds = new Set([])
  defEls.forEach(def => {
    refIds.add(def.id)
  })

  Array.from(refIds).forEach(id => {
    let els = svg.querySelectorAll(`[href="#${id}"], [xlink\\:href="#${id}"], [clip-path="url(#${id})"], [mask="url(#${id})"],  [fill="url(#${id})"], [stroke="url(#${id})"]`);

    //definition is unused – remove
    if (!els.length) {
      //console.log('remove', id);
      svg.getElementById(id).remove()
    }
  })

  // remove futile clip-paths
  //if (cleanupClip) removeFutileClipPaths(svg, {x, y, width, height})

}


function removeFutileClipPaths(svg, { x = 0, y = 0, width = 0, height = 0 } = {}) {
  let clipPaths = svg.querySelectorAll('clipPath');

  if (!clipPaths.length) return

  if (!width || !height) {
    ({ x, y, width, height } = getViewBox(svg));
  }

  clipPaths.forEach(clip => {
    let children = [...clip.children];
    if (children.length > 1) return;

    let clipEl = children[0]
    let type = clipEl.nodeName.toLowerCase();

    if (type === 'path' || type === 'rect') {
      let bb = { x: 0, y: 0, width: 0, height: 0 }

      if (type === 'path') {
        let pathData = parsePathDataNormalized(clipEl.getAttribute('d'));
        let coms = Array.from(new Set(pathData.map(com => com.type.toLowerCase()))).join('');
        let isPolygon = !(/[acqts]/gi).test(coms);

        // path is too complex - unlikely to be a rectangle
        if (!isPolygon || pathData.length > 5) return

        let vertices = getPathDataVertices(pathData)
        bb = getPolyBBox(vertices)
      }

      else if (type === 'rect') {
        bb = { x: +clipEl.getAttribute('x'), y: +clipEl.getAttribute('y'), width: +clipEl.getAttribute('width'), height: +clipEl.getAttribute('height') }
      }

      // is futile if clip path's bbox equals the SVG's viewBox
      if (bb.x === x && bb.y === y && bb.width === width && bb.height === height) {
        clip.remove();
        let clippedEls = svg.querySelectorAll(`[clip-path="url(#${clip.id})"]`);
        //console.log('clippedEls', clippedEls);
        clippedEls.forEach(clipped => {
          clipped.removeAttribute('clip-path')
        })
      }
    }
  })

}



function moveAttributesToGroup(svgElProps = [], mergePaths = true) {

  let combine = [[svgElProps[0]]]
  let idx = 0;
  let lastProps = '';
  let l = svgElProps.length;
  let itemsWithProps = svgElProps.filter(item => item.propstr)
  let path0;


  // merge paths without properties
  let dCombined = ''
  if (!itemsWithProps.length && mergePaths) {
    let path0 = null;

    for (let i = 0; i < l; i++) {
      let item = svgElProps[i]
      if (item.name !== 'path') continue;
      let remove = true;


      let path = item.el;

      // set 1st path
      if (!path0) {
        path0 = path;
        remove = false;
      }

      let d = item.propsFiltered.d
      let isAbs = d.startsWith('M')
      let dAbs = isAbs ? d : parsePathDataString(d).pathData.map(com => `${com.type} ${com.values.join(' ')}`).join(' ')

      dCombined += dAbs;

      // delete path el
      if (remove) path.remove();
    }

    //console.log('dCombined', dCombined);
    if (path0) path0.setAttribute('d', dCombined)
    return
  }


  // add to combine chunks
  for (let i = 0; i < l; i++) {
    let item = svgElProps[i];
    let props = item.propsFiltered;
    let propstr = [];
    for (let prop in props) {
      if (prop !== 'd' && prop !== 'id') {
        propstr.push(`${prop}:${props[prop]}`)
      }
    }
    propstr = propstr.join('_')
    item.propstr = propstr;

    if (l > 1 && propstr === lastProps) {
      combine[idx].push(item)
    } else {
      if (l > 1 && combine[idx].length) {
        combine.push([])
        idx++
      }
    }
    lastProps = propstr;
  }


  // add att groups
  for (let i = 0; i < combine.length; i++) {
    let group = combine[i]

    if (group.length > 1) {
      // 1st el
      let el0 = group[0].el;
      let props = group[0].propsFiltered;
      let g = el0.parentNode.closest('g') ? el0.parentNode.closest('g') : null;

      // wrap in group if not existent
      if (!g) {
        g = document.createElementNS(svgNs, 'g');
        el0.parentNode.insertBefore(g, el0)
        group.forEach(item => {
          g.append(item.el)
        })
      }

      let children = [...g.children]
      for (let prop in props) {
        if (prop !== 'd' && prop !== 'id') {
          let value = props[prop]
          // apply to parent group
          g.setAttribute(prop, value)

          // remove from children
          children.forEach(el => {
            if (el.getAttribute(prop) === value) {
              el.removeAttribute(prop)
            }
          })
        }


        if (mergePaths) {
          group = group.filter(Boolean)
          let l = group.length
          // nothing to merge
          if (l === 1) return group[0].el;

          path0 = group[0].el;
          let dCombined = group[0].propsFiltered.d;

          for (let i = 1; i < l; i++) {
            let item = group[i]
            let path = item.el;
            let d = item.propsFiltered.d
            let isAbs = d.startsWith('M')

            let dAbs = isAbs ? d : parsePathDataString(d).pathData.map(com => `${com.type} ${com.values.join(' ')}`).join(' ')

            console.log('dAbs', dAbs);

            //console.log(isAbs, dAbs);
            // concat pathdata string
            dCombined += dAbs;

            // delete path el
            path.remove();
          }

          path0.setAttribute('d', dCombined)

        }

      }
    }
  }

}


export function scaleProps(styleProps = {}, { props = [], scale = 1 } = {}) {
  if (scale === 1 || !props.length) return props;

  for (let i = 0; i < props.length; i++) {
    let prop = props[i];

    if (styleProps[prop] !== undefined) {
      styleProps[prop] = styleProps[prop].map(val => val * scale)
    }
  }
  return styleProps
}

export function removeSVGEls(svg, {
  remove = ['metadata', 'script'],
  removeNameSpaced = true,
} = {}) {
  let els = svg.querySelectorAll('*')
  els.forEach(el => {
    let nodeName = el.nodeName;
    if ((removeNameSpaced && nodeName.includes(':')) ||
      remove.includes(nodeName)
    ) {
      el.remove()
    }
  })
}


function cleanSvgPrologue(svgString) {
  return (
    svgString
      // Remove XML prologues like <?xml ... ?>
      .replace(/<\?xml[\s\S]*?\?>/gi, "")
      // Remove DOCTYPE declarations
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
      // Remove comments <!-- ... -->
      .replace(/<!--[\s\S]*?-->/g, "")
      // Trim extra whitespace
      .trim()
  );
}

function removeExcludedAttribues(el, allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class']) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (!allowed.includes(att)) {
      el.removeAttribute(att);
    }
  });
}


function removeAtts(el, exclude = [], include = []) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (exclude.includes(att) && !include.includes(att)) {
      el.removeAttribute(att);
    }
  });
}


function removeNameSpaceAtts(el, {
  include = ['xlink:href']
} = {}) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (att.includes(":") && !include.includes(att)) {
      el.removeAttribute(att);
    }
  });
}

export function stringifySVG(svg, {
  omitNamespace = false,
  removeComments = true,
} = {}) {
  let markup = new XMLSerializer().serializeToString(svg);

  if (omitNamespace) {
    markup = markup.replaceAll('xmlns="http://www.w3.org/2000/svg"', '')
  }

  if (removeComments) {
    markup = markup
      .replace(/(<!--.*?-->)|(<!--[\S\s]+?-->)|(<!--[\S\s]*?$)/g, '')
  }

  markup = markup
    .replace(/\t/g, "")
    .replace(/[\n\r|]/g, "\n")
    .replace(/\n\s*\n/g, '\n')
    .replace(/ +/g, ' ')
    //.replace(/  +/g, ' ')
    .replace(/> </g, '><')
    .trim()
    // sanitize linebreaks within pathdata
    .replaceAll('&#10;', '\n');





  return markup
}