export function removeHiddenSvgEls(svg) {
  let els = svg.querySelectorAll('*')
  els.forEach(el => {
    let name = el.nodeName.toLowerCase()
    let style = el.getAttribute('style') || ''
    let isHiddenByStyle = style ? style.trim().includes('display:none') : false;
    let isHidden = (el.getAttribute('display') && el.getAttribute('display') === 'none') || isHiddenByStyle;
    if (isHidden) el.remove();
  })

}




export function removeSvgEls(svg, {
  removeElements = [],
  removeNameSpaced = true,
} = {}) {

  // always remove scripts
  removeElements.push('script');

  let els = svg.querySelectorAll('*')
  let allowMeta = !removeElements.includes('metadata');

  els.forEach(el => {
    let nodeName = el.nodeName;
    let isMeta = allowMeta && el.closest('metadata')
    if (
      !isMeta &&
      ((removeNameSpaced && nodeName.includes(':')) ||
        removeElements.includes(nodeName))
    ) {
      el.remove()
    }
  })
}



/*export function removeSvgEls(svg, remove = []) {
  // remove elements
  if (remove.length) {
    let selector = remove.join(', ').replaceAll(':', '\\:');
    svg.querySelectorAll(selector).forEach(el => {
      el.remove()
    })
  }
}
*/

export function removeSvgAtts(svg, remove = []) {
  remove.forEach(att => {
    svg.removeAttribute(att);
  })
}

export function removeSvgChildAtts(svg, remove = []) {
  if (remove.length) {
    let selector = remove.map(att => { return `[${att}]` }).join(', ')
      // escape name spaced
      .replaceAll(':', '\\:')

    svg.querySelectorAll(selector).forEach(el => {
      remove.forEach(att => {
        el.removeAttribute(att);
      })
    })
  }
};

