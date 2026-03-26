/**
 * general clean up to remove bullshit like
 * version or enable background
 */

export function cleanupSVGAttributes(svg, {
  removeIds = false,
  removeClassNames = false,
  removeDimensions = false,
  stylesToAttributes = false,
  allowMeta = false,
  allowAriaAtts = false,
  allowDataAtts = false,
} = {}) {

  //console.log('cleanupSVGAtts');
  let allowed = new Set(['viewBox', 'xmlns', 'width', 'height']);

  if (!removeIds) allowed.add('id')
  if (!removeClassNames) allowed.add('class')
  if (removeDimensions) {
    allowed.delete('width')
    allowed.delete('height')
  }

  allowed = Array.from(allowed)
  if (!stylesToAttributes) {
    allowed.push('fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'font-family', 'font-style', 'style');
  }

  removeExcludedAttribues(svg, { allowed, allowMeta, allowAriaAtts, allowDataAtts })
}

function removeExcludedAttribues(el, {
  allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class'],
  allowAriaAtts = true,
  allowDataAtts = true,
  allowMeta = false
} = {}) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {

    let isMeta = allowMeta && (att === 'title')
    let isAria = allowAriaAtts && att.startsWith('aria-')
    let isData = allowDataAtts && att.startsWith('data-')
    //console.log(att, isData, 'allowDataAtts', allowDataAtts);

    if (
      !allowed.includes(att) &&
      !isAria && !isData && !isMeta
    ) {
      el.removeAttribute(att);
    }
  });
}



export function removeNameSpaceAtts(el, {
  include = ['xlink:href']
} = {}) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (att.includes(":") && !include.includes(att)) {
      el.removeAttribute(att);
    }
  });
}


export function removeElAtts(el, exclude = [], include = []) {
  let atts = [...el.attributes].map((att) => att.name);
  atts.forEach((att) => {
    if (exclude.includes(att) && !include.includes(att)) {
      el.removeAttribute(att);
    }
  });
}


/*

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
*/

