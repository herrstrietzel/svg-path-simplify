import { normalizeUnits } from "./svgii/convert_units";

export function getElementAtts(el, {x=0, y=0, width=0, height=0}={}){
    let attributes = [...el.attributes];

    let atts={};
    attributes.forEach(att=>{
        let value = normalizeUnits(att.nodeValue, {x, y, width, height});   
        atts[att.name] = value
    })

    return atts
}