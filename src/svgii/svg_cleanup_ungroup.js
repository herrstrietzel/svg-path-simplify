import { getElementAtts } from "../svg-getAttributes";

export function ungroupElements(groups) {
  groups.forEach((g, i) => {
    let children = [...g.children];

    children.forEach(child => {
      g.parentNode.insertBefore(child, g)
    })
    g.remove()
  })
}


export function removeGroupProps(groups, {
  remove = [],
  allowDataAtts = true,
  allowAriaAtts = true
} = {}) {

  groups.forEach((g, i) => {
    let atts = Object.keys(getElementAtts(g));

    atts.forEach(att => {
      //console.log('remove', remove);
      let isData = !allowDataAtts && att.startsWith('data-')
      let isAria = !allowAriaAtts && att.startsWith('aria-')
      //console.log(isData, att);
      //styleProps.remove.push('transform', 'style')
      if (remove.includes(att) || isData || isAria) {
        g.removeAttribute(att)
      }
    })
  })

}