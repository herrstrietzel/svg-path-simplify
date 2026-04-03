import { normalizeUnits } from "./svgii/convert_units";

export function getElementAtts(el, {x=0, y=0, width=0, height=0}={}){
    //let attributes = [...el.attributes];
    let attributes = [...el.attributes].map(att=>att.name);

    let atts={};
    attributes.forEach(att=>{
        //let value = normalizeUnits(att.nodeValue, {x, y, width, height});   
        let value = normalizeUnits(el.getAttribute(att), {x, y, width, height});   
        atts[att] = value
    })

    return atts
}