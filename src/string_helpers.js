import { isNumericValue } from "./svgii/convert_units"

export function toCamelCase(str) {
  return str
    .split(/[-| ]/)
    .map((e,i) => i
      ? e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()
      : e.toLowerCase()
    )
    .join('')
}

export  function toShortStr(str){
  if(isNumericValue(str)) return str
  let strShort = str.split('-').map(str=>{return str.replace(/a|e|i|o|u/g,'') }).join('-')
  strShort = toCamelCase(strShort)
  return strShort
}
