import { getElementAtts } from "../svg-getAttributes";
import { flattenTransforms } from "../svg_flatten_transforms";
import { getViewBox } from "../svg_getViewbox";
import { normalizeUnits } from "./convert_units";
import { getPathDataVertices } from "./geometry";
import { checkBBoxIntersections, getPathDataBBox, getPolyBBox } from "./geometry_bbox";
import { getElBBox } from "./geometry_bbox_element";
import { parsePathDataString } from "./pathData_parse";
import { parsePathDataNormalized } from "./pathData_convert";
import { pathElToShape, shapeElToPath } from "./pathData_parse_els";
import { svgStylesToAttributes } from "./svg-styles-to-attributes";
import { strokeAtts } from "./svg-styles-to-attributes-const";
import { parseStylesProperties } from "./svg_el_parse_style_props";


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
  convert_lines=false,

  convertTransforms = false,
  cleanUpStrokes = true,
  decimals = -1,
  excludedEls = [],
} = {}) {

  attributesToGroup = cleanupSVGAtts ? true : false;


  // replace namespaced refs 
  if (fixHref) svgMarkup = svgMarkup.replaceAll("xlink:href=", "href=");

  let svg = new DOMParser()
    .parseFromString(svgMarkup, "text/html")
    .querySelector("svg");

  let viewBox = getViewBox(svg)
  let { x, y, width, height } = viewBox;


  if (cleanupSVGAtts) {
    //console.log('cleanupSVGAtts');
    let allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
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

  let els = svg.querySelectorAll('*')

  // an array of all elements' properties
  let svgElProps = []

  let geometryElements = ['polygon', 'polyline', 'line', 'rect', 'circle', 'ellipse']

    //console.log('shapeConvert', shapeConvert);


  /** convert paths to shapes */
  if(shapeConvert === 'toShapes'){
    let paths = svg.querySelectorAll('path')
    paths.forEach(path=>{
      let shape = pathElToShape(path, {convert_rects, convert_ellipses, convert_poly, convert_lines})
      path.replaceWith(shape)
      path = shape;
      //console.log('path', path);
    })

  }


  for (let i = 0; i < els.length; i++) {
    let el = els[i];

    let name = el.nodeName.toLowerCase();

    // convert shapes
    if (shapeConvert === 'toPaths' && name !== 'path' && geometryElements.includes(name)) {
      let path = shapeElToPath(el, { width, height, convert_rects, convert_ellipses, convert_poly, convert_lines });
      el.replaceWith(path)
      name = 'path'
      el = path;
      //console.log('shapesToPaths', el.outerHTML);
    }

    // remove hidden elements
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


    /*
    let styleProps = parseStylesProperties(el, {
      width:viewBox.width,
      height:viewBox.height
    })
      */


    /*
    let propTest = normalizeUnits('50%',{width:200, height:100, isHorizontal:true})
    console.log('propTest', propTest);
    */


    // styles to attributes
    if (stylesToAttributes || attributesToGroup || mergePaths || cleanUpStrokes) {
      let propsFiltered = svgStylesToAttributes(el, { removeNameSpaced, decimals })
      //if (name === 'path') {}
      svgElProps.push({ el, name, idx: i, propsFiltered })
    }

  }



  // remove stroke properties if no stroke color applied - common inkscape issue
  if (cleanUpStrokes) {

    for (let item of svgElProps) {

      let { el, propsFiltered } = item;
      let strokeProps = Object.keys(propsFiltered)

      if (!strokeProps.includes('stroke')) {
        strokeAtts.forEach(att => {
          el.removeAttribute(att)

          // delete in property object
          if (item['propsFiltered'][att] !== undefined) delete item['propsFiltered'][att]
        })
      }
    }
  }

  // group styles
  if (attributesToGroup || mergePaths) {
    moveAttributesToGroup(svgElProps, mergePaths)
  }

  if (removeDimensions) {
    svg.removeAttribute('width')
    svg.removeAttribute('height')
  }

  if (removeClassNames || removeIds) {
    let att = removeClassNames ? 'class' : 'id';
    let selector = `[${att}]`
    let els = svg.querySelectorAll(selector)
    svg.removeAttribute(att)
    els.forEach(el => {
      el.removeAttribute(att)
    })
  }

  //console.log('!!!svgMarkup', svgMarkup);



  /**
   * refine properties 
   * such as transforms or properties including units
   */

  /*
  for(let i=0; i<svgElProps.length; i++){
    let item = svgElProps[i];
    let {propsFiltered} = item;

    for(let prop in propsFiltered){

      let propOb = parseStyleProperty(prop, propsFiltered[prop])

    }

  }
  */

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
        g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
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


function removeNameSpaceAtts(el) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (att.includes(":")) {
      el.removeAttribute(att);
    }
  });
}

export function stringifySVG(svg, omitNamespace = false) {
  let markup = new XMLSerializer().serializeToString(svg);

  if (omitNamespace) {
    markup = markup.replaceAll('xmlns="http://www.w3.org/2000/svg"', '')
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