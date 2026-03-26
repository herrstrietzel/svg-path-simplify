
/**
 * get all SVG elements and
 * attributes to render 
 * inputs for selective removal
 */
export function renderSvgExcludeFields(svg, settings = {}) {

  let svgEls = getElementTypes(svg, ['g', 'stop']);
  //console.log(svgEls);
  if(!svg) return;
  //console.log(svg);

  let svgAtts = [...svg.attributes].map(att => att.name);
  let svgElAtts = [];
  let geometryProps = ['d', 'points', 'cx', 'cy', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'r', 'rx', 'ry', 'x', 'y'];

  let svgElsAll = svg.querySelectorAll('*');
  svgElsAll.forEach(el => {
    let atts = [...el.attributes].map(att => att.name);
    atts.forEach(att => {
      if (!geometryProps.includes(att)) svgElAtts.push(att)
    })
  });
  svgElAtts = [...new Set(svgElAtts)];


  let removalArr = [
    { el: 'removeSvgElsWrp', items: svgEls, prop: 'removeElements' },
    { el: 'removeSVGAttsWrp', items: svgAtts, prop: 'removeSVGAttributes' },
    { el: 'removeElAttsWrp', items: svgElAtts, prop: 'removeElAttributes' },
  ];


  for (let i = 0; i < removalArr.length; i++) {
    let item = removalArr[i];
    let { el, items, prop } = item;
    let htmlEl = document.getElementById(el);
    if (htmlEl) {
      htmlEl.innerHTML = '';
      let inputMarkup = getRemovalInputs(items, prop, htmlEl, settings)
      if (inputMarkup) htmlEl.insertAdjacentHTML('beforeend', inputMarkup)
    }
  }

  // bind updates
  enhanceNewFields({ settings })

}


// render exclude fields
export function getRemovalInputs(items = [], prop = '', target = null, settings = {}) {
  let inputMarkup = '';
  let len = items.length;

  for (let i = 0; len && i < len; i++) {
    let value = items[i];
    let selector = `input[value="${value}"]`.replaceAll(':', '\\:');
    let inputN = target.querySelector(selector)
    let isChecked = settings[prop] ? settings[prop].includes(value) : false;
    let checkedAtt = isChecked ? 'checked' : ''

    //console.log(prop, value, settings.removeNameSpaced);

    if (prop === 'removeSVGAttributes') {
      if(value==='viewBox') continue;
      if(settings.removeNameSpaced && value.includes(':')) continue;
    }
    else if (prop === 'removeElAttributes') {
      if(settings.removeNameSpaced && value.includes(':')) continue;
    }


    if (!inputN) {
      inputMarkup +=
        `<label class="label-remove label-${prop}">
        <input type="checkbox" name="${prop}[]" data-type="checkbox-btn"  value="${value}"  ${checkedAtt}>${value}</label>`
    }
  }
  return inputMarkup;
}


export function getElementTypes(el, exclude = ['g']) {
  if(!el) return [];
  let types = new Set();
  let walker = document.createTreeWalker(
    el,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );

  while (walker.nextNode()) {
    if (!exclude.includes(walker.currentNode.tagName)) {
      types.add(walker.currentNode.tagName);
    }
  }
  return Array.from(types);
}