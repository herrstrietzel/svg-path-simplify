

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
} = {}) {

  svgMarkup = cleanSvgPrologue(svgMarkup);

  // replace namespaced refs 
  svgMarkup = svgMarkup.replaceAll("xlink:href=", "href=");
  //console.log('!!!svgMarkup', svgMarkup);


  let svg = new DOMParser()
  //.parseFromString(svgMarkup, "image/svg+xml")
  .parseFromString(svgMarkup, "text/html")
  .querySelector("svg");
  //console.log(svg);


  let allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
  removeExcludedAttribues(svg, allowed)

  let removeEls = ['metadata', 'script']

  let els = svg.querySelectorAll('*')

  let textEls = svg.querySelectorAll('text')
  let remove = !textEls.length ? ['font-family', 'font-weight', 'font-style', 'font-size'] : [];
  
  els.forEach(el => {
    let name = el.nodeName;
    // remove hidden elements
    let style = el.getAttribute('style') || ''
    let isHiddenByStyle = style ? style.trim().includes('display:none') : false;
    let isHidden = (el.getAttribute('display') && el.getAttribute('display') === 'none') || isHiddenByStyle;
    if (name.includes(':') || removeEls.includes(name) || (removeHidden && isHidden)) {
      el.remove();
    } else {
      // remove BS elements
      removeNameSpaceAtts(el)
      removeAtts(el,remove)
    }
  })

  //console.log('svg', svg);
  //return

  if (returnDom) return svg

  let markup = stringifySVG(svg)
  //console.log('!!!markup', markup);

  //return


  return markup;
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


function removeAtts(el, remove=[]) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (remove.includes(att)) {
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

export function stringifySVG(svg) {
  let markup = new XMLSerializer().serializeToString(svg);
  markup = markup
    .replace(/\t/g, "")
    .replace(/[\n\r|]/g, "\n")
    .replace(/\n\s*\n/g, '\n')
    .replace(/ +/g, ' ')

  return markup
}