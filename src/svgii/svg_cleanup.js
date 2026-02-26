import { parsePathDataString } from "./pathData_parse";
import { shapeElToPath } from "./pathData_parse_els";
import { svgStylesToAttributes } from "./svg-styles-to-attributes";


export function removeEmptySVGEls(svg) {
  let els = svg.querySelectorAll('g, defs');
  els.forEach(el => {
    if (!el.children.length) el.remove()
  })
}

//const DOMParserPoly = globalThis.DOMParser;

export function cleanUpSVG(svgMarkup, {
  returnDom = false,
  removeHidden = true,
  removeUnused = true,
  stylesToAttributes = true,
  removePrologue = true,
  removeIds = false,
  removeClassNames = false,
  removeDimensions = false,
  fixHref = true,
  mergePaths = false,
  cleanupSVGAtts = true,
  removeNameSpaced = true,
  attributesToGroup = true,
  shapesToPaths = false,
  decimals = -1,
  excludedEls = [],
} = {}) {

  attributesToGroup = cleanupSVGAtts ? true : false;

  // replace namespaced refs 
  if (fixHref) svgMarkup = svgMarkup.replaceAll("xlink:href=", "href=");

  let svg = new DOMParser()
    .parseFromString(svgMarkup, "text/html")
    .querySelector("svg");


  if (cleanupSVGAtts) {
    //console.log('cleanupSVGAtts');
    let allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
    removeExcludedAttribues(svg, allowed)

  }

  // always remove scripts
  let removeEls = ['metadata', 'script', ...excludedEls]

  let els = svg.querySelectorAll('*')
  let elProps = []

  let geometryElements = ['polygon', 'polyline', 'line', 'rect', 'circle', 'ellipse']


  for (let i = 0; i < els.length; i++) {
    let el = els[i];

    let name = el.nodeName.toLowerCase();

    // convert shapes
    if (shapesToPaths && name !== 'path' && geometryElements.includes(name)) {
      let path = shapeElToPath(el);
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

    // styles to attributes
    if (stylesToAttributes || attributesToGroup || mergePaths) {
      let propsFiltered = svgStylesToAttributes(el, { removeNameSpaced, decimals })
      if (name === 'path') {
        elProps.push({ el, name, idx: i, propsFiltered })
      }
    }
  }


  // group styles
  if (attributesToGroup || mergePaths) {
    moveAttributesToGroup(elProps, mergePaths)
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


  if (returnDom) return svg
  let markup = stringifySVG(svg)

  //console.log(svg.outerHTML);


  return markup;
}


function moveAttributesToGroup(elProps = [], mergePaths = true) {

  let combine = [[elProps[0]]]
  let idx = 0;
  let lastProps = '';
  let l = elProps.length;
  let itemsWithProps = elProps.filter(item => item.propstr)
  let path0;


  // merge paths without properties
  if (!itemsWithProps.length && mergePaths) {
    let item0 = elProps[0]
    path0 = item0.el
    let dCombined = item0.propsFiltered.d

    for (let i = 1; i < l; i++) {
      let item = elProps[i]
      let path = item.el;

      let d = item.propsFiltered.d
      let isAbs = d.startsWith('M')
      let dAbs = isAbs ? d : parsePathDataString(d).pathData.map(com => `${com.type} ${com.values.join(' ')}`).join(' ')

      dCombined += dAbs;

      // delete path el
      path.remove();
    }

    path0.setAttribute('d', dCombined)
    return
  }


  // add to combine chunks
  for (let i = 0; i < l; i++) {
    let item = elProps[i];
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
    

  return markup
}