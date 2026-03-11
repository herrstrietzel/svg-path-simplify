export  function getRootSvg(el) {
  let svg = el.parentNode.closest('svg');
  while (svg && svg.parentNode && svg.parentNode.closest) {
    let parentSvg = svg.parentNode.closest('svg');
    if (!parentSvg) break;
    svg = parentSvg;
  }
  return svg;
}