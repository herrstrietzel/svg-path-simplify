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
import { geometryEls, geometryProps, renderedEls, shapeEls, strokeAtts } from "./svg-styles-to-attributes-const";
import { addTransFormProps, filterSvgElProps, parseStylesProperties } from "./svg_el_parse_style_props";
import { autoRound, roundTo } from "./rounding";
import { getMatrixFromTransform } from "./svg-styles-getTransforms";
import { qrDecomposeMatrix } from "./transform_qr_decompose";
import { svgNs } from "../constants";
import { toCamelCase, toShortStr } from "../string_helpers";
import { getElementLength } from "./svg_getElementLength";
import { removeAtts, removeHiddenSvgEls, removeSvgAtts, removeSvgChildAtts, removeSvgEls } from "./svg_cleanup_remove_els_and_atts";
import { cleanupSVGAttributes, removeElAtts } from "./svg_cleanup_general_svg_atts";
import { convertPathLengthAtt } from "./svg_cleanup_convertPathLength";
import { removeGroupProps, ungroupElements } from "./svg_cleanup_ungroup";
import { parseSvgCss } from "../css_parse";
import { scaleProps, setNormalizedTransformsToEl } from "./svg_cleanup_normalize_transforms";


export function cleanUpSVG(svgMarkup, {
  removeHidden = true,
  //removeUnused = true,
  stylesToAttributes = true,
  attributesToGroup = false,

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
  removeNameSpacedAtts = true,

  // unit conversions
  convertPathLength = false,
  toAbsoluteUnits = false,

  // meta
  allowMeta = false,
  allowDataAtts = true,
  allowAriaAtts = true,

  //shapesToPaths = false,
  shapeConvert = false,
  convertShapes = [],

  // remove elements
  removeElements = [],

  // remove attributes
  removeSVGAttributes = [],
  removeElAttributes = [],

  convertTransforms = false,
  removeDefaults = true,
  cleanUpStrokes = true,
  decimals = -1,
  excludedEls = [],
} = {}) {



  // resolve dependencies
  if (unGroup || convertTransforms || minifyRgbColors || attributesToGroup)
    stylesToAttributes = true;

  if (stylesToAttributes) cleanUpStrokes = true;

  // replace namespaced refs 
  if (fixHref) svgMarkup = svgMarkup.replaceAll("xlink:href=", "href=");


  let svg = new DOMParser()
    .parseFromString(svgMarkup, "text/html")
    .querySelector("svg");


  let viewBox = getViewBox(svg)
  let { x, y, width, height } = viewBox;
  let remove = []



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


  /**
   * collect svg styles
   * and properties
   */
  let propOptions = {
    width,
    height,
    normalizeTransforms,
    removeDefaults: false,
    cleanUpStrokes: false,
    //cleanUpStrokes,
    allowMeta,
    allowDataAtts,
    allowAriaAtts,
    autoRoundValues,
    removeIds,
    removeClassNames,
    minifyRgbColors,
    stylesheetProps: {},
    exclude: []
  }

  // root svg inline style properties
  let stylePropsSVG = parseStylesProperties(svg, propOptions)
  //console.log('stylePropsSVG', stylePropsSVG);

  let styleEl = svg.querySelector('style')
  let cssStylePropsSVG = {}

  if (styleEl) {
    cssStylePropsSVG = parseSvgCss(styleEl, { parent: svg })

    //save stylesheet dependencies in node
    for (let selector in cssStylePropsSVG) {
      let els = svg.querySelectorAll(`${selector}`);
      els.forEach(el => {
        if (!el['cssRules']) el['cssRules'] = [];
        el['cssRules'].push(selector)

        // remove class names only used for styling
        if (stylesToAttributes) {
          let className = selector.substring(1)
          el.classList.remove(className)
        }
      })
    }

    //console.log('cssStylePropsSVG', cssStylePropsSVG);

    // remove style element from element
    if (stylesToAttributes) {
      styleEl.remove()
    }
  }
  // remove style element from root SVG
  if (stylesToAttributes) svg.removeAttribute('style')


  // add stylesheet props
  propOptions.stylesheetProps = cssStylePropsSVG;


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
    //propOptions.exclude.push('class', 'id');
    let stylePropsG = parseStylesProperties(g, propOptions)
    //console.log('stylePropsG', stylePropsG);

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


/**
     * remove els and attributes
     */

    // remove meta
    if (!allowMeta) removeElements.push('meta', 'metadata', 'desc', 'title')

    if (removeClassNames) {
      removeSVGAttributes.push('class');
      removeElAttributes.push('class');
    }

    if (removeIds) {
      removeSVGAttributes.push('id')
      removeElAttributes.push('id')
    }


    // remove hidden elements
    removeHiddenSvgEls(svg)

    // remove SVG elements
    removeSvgEls(svg, { removeElements, removeNameSpaced });

    // remove SVG attributes
    removeSvgAtts(svg, removeSVGAttributes);

    // remove SVG child element attributes
    removeSvgChildAtts(svg, removeElAttributes);


    // general cleanup
    if (cleanupSVGAtts) cleanupSVGAttributes(svg, { removeIds, removeClassNames, removeDimensions, stylesToAttributes, allowMeta, allowAriaAtts, allowDataAtts });


  // collect all elements' properties
  let svgElProps = []
  let els = svg.querySelectorAll(`${renderedEls.join(', ')}`)


  /**
   * loop all geometry elements
   */
  for (let i = 0; i < els.length; i++) {
    let el = els[i];

    let name = el.nodeName.toLowerCase();
    //console.log(name);

    /**
     * get all element style properties
     * convert relative or physical units
     * to user units
     */
    let styleProps = parseStylesProperties(el, propOptions)
    let stylePropsFiltered = {}

    // reset remove array
    remove = [];

    // convert pathLength before transforming
    if (convertTransforms || attributesToGroup) convertPathLength = true;

    if (convertPathLength) {
      styleProps = convertPathLengthAtt(el, { styleProps });
      remove = [...new Set([...remove, ...styleProps.remove])];
    }


    // get parent styles
    let { parentStyleProps = [] } = el;
    let inheritedProps = {}
    let transFormInherited = []


    /** 
     * consolidate all properties:
     * merge with inherited transforms 
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


    // merge all transforms
    transFormInherited = [...transFormInherited, ...styleProps.transformArr]
    styleProps.transformArr = transFormInherited


    // don't inherit class from SVG
    if (stylePropsSVG['class']) delete stylePropsSVG['class']
    if (stylePropsSVG['id']) delete stylePropsSVG['id']

    // add svg props
    inheritedProps = {
      ...stylePropsSVG,
      ...inheritedProps,
    };
    //console.log('inheritedProps', inheritedProps);

    // merge with svg props
    styleProps = {
      ...inheritedProps,
      ...styleProps
    }


    // add combined transforms
    addTransFormProps(styleProps, transFormInherited);
    //console.log('transFormInherited', transFormInherited);
    //console.log('styleProps', styleProps);
    remove = [...new Set([...remove, ...styleProps.remove])];

    

    // all relative units to absolute
    if (toAbsoluteUnits) {
      normalizeTransforms = true;

      /**
       * apply consolidated 
       * element attributes
       * remove non-supported element props
       */
      stylePropsFiltered = filterSvgElProps(name, styleProps,
        { removeDefaults: true, cleanUpStrokes, allowMeta, allowAriaAtts, allowDataAtts, removeIds, inheritedProps });


      for (let prop in stylePropsFiltered.propsFiltered) {
        let values = styleProps[prop]
        let val = values.length ? values.join(' ') : values[0]
        el.setAttribute(prop, val)
      }

      //console.log('inheritedProps', inheritedProps);
      //console.log('current props', stylePropsFiltered.propsFiltered);

      let removeAttsEl = [...new Set([...remove, ...stylePropsFiltered.remove])];

      // check if same value is in inherited 
      for (let prop in stylePropsFiltered.propsFiltered) {
        let valInh = inheritedProps[prop] || [];
        let val = stylePropsFiltered.propsFiltered[prop] || [];
        if (valInh.join() === val.join()) {
          removeAttsEl.push(prop)
        }
      }

      // remove obsolete/inherited
      removeAtts(el, removeAttsEl)

    }




    if (stylesToAttributes) {

      /**
       * normalize transforms
       */
      if (normalizeTransforms) {
        styleProps = setNormalizedTransformsToEl(el, { styleProps });
        //remove = styleProps.remove;
        remove = [...new Set([...remove, ...styleProps.remove])];
      }

      /**
       * apply consolidated 
       * element attributes
       * remove non-supported element props
       */
      stylePropsFiltered = filterSvgElProps(name, styleProps,
        { removeDefaults: true, cleanUpStrokes, allowMeta, allowAriaAtts, allowDataAtts, removeIds, inheritedProps });


      remove = [...new Set([...remove, ...stylePropsFiltered.remove])];

      for (let prop in stylePropsFiltered.propsFiltered) {
        let values = styleProps[prop]
        let val = values.length ? values.join(' ') : values[0]
        el.setAttribute(prop, val)
      }


      /**
       * remove obsolete 
       * attributes
       */
      removeAtts(el, remove)

    } // endof style processing



    /**
     * element conversions:
     * shapes to paths or 
     * paths to shapes
     */

    // force shape conversion when transform conversion is enabled
    if (convertTransforms) {
      shapeConvert = 'toPaths';
      convertShapes = ['path', 'rect', 'ellipse', 'circle', 'line', 'polygon', 'polyline'];
    }

    // convert shapes to paths
    if (shapeConvert === 'toPaths') {

      let { matrix = null, transComponents = null } = styleProps;

      // scale props like stroke width or dash-array before conversion
      if (matrix && transComponents) {
        ['stroke-width', 'stroke-dasharray', 'stroke-dashoffset'].forEach(att => {
          let attVal = el.getAttribute(att)
          let vals = attVal ? attVal.split(' ').filter(Boolean).map(Number).map(val => val * transComponents.scaleX) : []
          if (vals.length) el.setAttribute(att, vals.join(' '))
        })
      }

      // convert paths only if a matrix transform is required
      if (matrix ? geometryEls.includes(name) : shapeEls.includes(name)) {
        //console.log('detrans', name, el.id, matrix);
        let path = shapeElToPath(el, { width, height, convertShapes, matrix });
        el.replaceWith(path)
        name = 'path'
        el = path; // required for node

      }

    }

    /**
     * Reverse conversion:  
     * paths to shapes 
     */
    else if (shapeConvert === 'toShapes') {
      let paths = svg.querySelectorAll('path')
      paths.forEach(path => {
        let shape = pathElToShape(path, { convertShapes })
        path.replaceWith(shape)
        path = shape;
        //name = shape.nodeName.toLowerCase()
        //console.log('shape', shape);
      })
    }


    /**
     * combine styles
     * store in node property
     */
    if (mergePaths || attributesToGroup) {

      let options = { allowMeta, allowAriaAtts, removeIds, removeClassNames, allowDataAtts }

      /**
       * exclude properties for 
       * adjacent path merging 
       * e.g ignore classnames or ids
       */
      if (mergePaths) {
        options.removeIds = true;
        options.removeClassNames = true;
        options.allowAriaAtts = false;
        options.allowMeta = false;
      }

      stylePropsFiltered = filterSvgElProps(name, styleProps, options).propsFiltered

      for (let prop in stylePropsFiltered) {

        if (geometryProps.includes(prop)) continue;

        let values = stylePropsFiltered[prop]
        let val = values.length ? values.join(' ') : values[0]

        if (prop !== 'class' && prop !== 'id') {

          let propShort = toShortStr(prop)
          let valShort = toShortStr(val)
          let propStr = `${propShort}-${valShort}`;

          // store in node property
          if (!el.styleSet) el.styleSet = new Set()
          if (propStr) el.styleSet.add(propStr)
        }
      }

    }

  }//endof element loop


  /**
   * remove group styles
   * copied to children
   * or remove nesting
   */

  if (unGroup) {
    ungroupElements(groups)
  } else {

    if (stylesToAttributes) {
      groups.forEach(g => {
        removeElAtts(g, ['style', 'transform']);
      })
    }
    //removeGroupProps(groups, { remove, allowDataAtts, allowAriaAtts })
  }


  // styles to group
  if (attributesToGroup) sharedAttributesToGroup(svg);

  /** 
   * merge paths with same styles
   */
  if (mergePaths) {
    mergePathsWithSameProps(svg)
  }

  //console.log('svg', svg);

  // remove futile clip-paths
  if (cleanupClip) removeFutileClipPaths(svg, { x, y, width, height })

  // replace href attributes with namespace - required by many older applications
  if (legacyHref) hrefToXlink(svg);


  // remove empty class attributes
  removeEmptyClassAtts(svg);
  return { svg, svgElProps }

}



function removeEmptyClassAtts(svg) {
  let emptyClassEls = svg.querySelectorAll('[class=""]');
  emptyClassEls.forEach(el => {
    el.removeAttribute('class')
  })
}


/** 
* shared styles to group
*/
function sharedAttributesToGroup(svg) {

  let els = svg.querySelectorAll(renderedEls.join(', '))
  let len = els.length;
  if (len === 1) return;

  let el0 = els[0] || null
  let stylePrev = el0.styleSet !== undefined ? [...el0.styleSet].join('_') : ''


  // all props
  let allProps = {}

  // find attributes shared by all
  let globalAtts = []

  if (len) {

    let groups = [[el0]];
    let idx = 0;
    let elPrev = el0

    for (let i = 0; i < len; i++) {
      let el = els[i];
      let atts = getElementAtts(el)
      for (let att in atts) {
        let att_str = `${att}_${atts[att]}`

        if (!allProps[att_str]) {
          allProps[att_str] = []
        }
        allProps[att_str].push(el)
        //
        if (allProps[att_str].length === len) {
          globalAtts.push(att)
        }
      }
    }

    //console.log('allProps', allProps);
    //console.log('globalAtts', globalAtts);

    // apply global to parent SVG
    if (globalAtts.length) {
      let atts0 = getElementAtts(el0)
      for (let att in atts0) {
        if (globalAtts.includes(att) && att !== 'transform') {
          svg.setAttribute(att, atts0[att])
        }
      }
    }

    // detect groups
    for (let i = 1; i < len; i++) {
      let el = els[i];
      let styleArr = el.styleSet !== undefined ? [...el.styleSet] : [];
      let style = styleArr.length ? styleArr.join('_') : '';
      //console.log('style', style);
      //console.log('style === stylePrev', style, stylePrev);

      // same style add to group
      if (style === stylePrev && elPrev.nextElementSibling === el) {
        groups[idx].push(el)
      }
      // start new group
      else {
        groups.push([el])
        idx++
      }
      // update style
      stylePrev = style
      elPrev = el

    }// endof el loop

    //console.log('g', groups);

    // create groups
    for (let i = 0; i < groups.length; i++) {
      let children = groups[i];
      let child0 = children[0]
      let atts = getElementAtts(child0)
      let groupEl = child0.parentNode.closest('g')

      // only 1 child - nothing to group
      if (children.length === 1) continue


      // create new group
      if (!groupEl || groups.length > 1) {
        //console.log('new group');
        groupEl = document.createElementNS(svgNs, 'g')
        child0.parentNode.insertBefore(groupEl, child0)
        groupEl.append(...children)
      }

      // move attributes to group
      for (let att in atts) {
        let val = atts[att];
        //console.log('att', atts, val);

        //|| att === 'transform'
        let excludeAtts = ['id', 'class'];
        if (!geometryProps.includes(att) && !excludeAtts.includes(att)) {
          if (!globalAtts.includes(att) || att === 'transform') {
            groupEl.setAttribute(att, val)
          }
          children.forEach(child => {
            child.removeAttribute(att)
          })
        }
      }


    } // endof groups

  }
}


// merge adjacent paths
function mergePathsWithSameProps(svg) {
  let paths = svg.querySelectorAll('path')
  let len = paths.length;

  if (len) {
    let path0 = paths[0]
    let d0 = path0.getAttribute('d')
    let stylePrev = path0.styleSet !== undefined ? [...path0.styleSet].join(' ') : ''
    //console.log('path0', path0);

    let remove = []

    for (let i = 1; i < len; i++) {
      let path = paths[i];
      let style = path.styleSet !== undefined ? [...path.styleSet].join(' ') : ''
      let isSibling = path.previousElementSibling === path0;
      let d = path.getAttribute('d');
      let isAbs = d.startsWith('M')
      //console.log('path.previousElementSibling', path.previousElementSibling);
      //console.log(isSibling,  style, stylePrev, path.id);

      if (isSibling && style === stylePrev) {
        let dAbs = isAbs ? d : parsePathDataString(d).pathData.map(com => `${com.type} ${com.values.join(' ')}`).join(' ')
        //console.log('same style', dAbs, isAbs);
        d0 += dAbs;
        path0.setAttribute('d', d0)
        //console.log('remove', path);
        remove.push(path)
        //path.remove();

      } else {
        path0 = path
        //console.log('path0', path0, path);
        d0 = isAbs ? d : parsePathDataString(d).pathData.map(com => `${com.type} ${com.values.join(' ')}`).join(' ')

      }

      // update style
      stylePrev = style
    }


    //console.log('remove', remove);
    remove.forEach(el => {
      el.remove()
    })

  }

}




function removeOffCanvasEls(svg, { x = 0, y = 0, width = 0, height = 0 } = {}) {
  let els = [...svg.querySelectorAll('path, polygon, polyline, line, rect, circle, ellipse, text')];
  els = els.filter(el => !el.parentNode.closest('defs') && !el.parentNode.closest('symbol') && !el.parentNode.closest('clipPath') && !el.parentNode.closest('mask') && !el.parentNode.closest('pattern'))
  //console.log('removeOffCanvasEls', els, width, height);

  let bb0 = { x, y, width, height }
  bb0.right = x + width
  bb0.bottom = y + height

  els.forEach(el => {
    //console.log(el);
    let bb = getElBBox(el)
    //console.log('!!bb', bb, el);
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

export function removeEmptySVGEls(svg) {
  let els = svg.querySelectorAll('g, defs');
  els.forEach(el => {
    if (!el.children.length) el.remove()
  })
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


function hrefToXlink(svg) {
  svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink")
  let hrefs = svg.querySelectorAll('[href]')
  hrefs.forEach(el => {
    let href = el.getAttribute('href')
    el.setAttribute('xlink:href', href)
    //el.removeAttribute('href')
  })
}











