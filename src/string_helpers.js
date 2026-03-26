import { isNumericValue } from "./svgii/convert_units"

export function toCamelCase(str) {
  return str
    .split(/[-| ]/)
    .map((e, i) => i
      ? e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()
      : e.toLowerCase()
    )
    .join('')
}

export function toShortStr(str) {
  if (isNumericValue(str)) return str
  let strShort = str.split('-').map(str => { return str.replace(/a|e|i|o|u/g, '') }).join('-')
  strShort = toCamelCase(strShort)
  return strShort
}


export function stringifySVG(svg, {
  omitNamespace = false,
  removeComments = true,
  format = 0,
} = {}) {


  let markup = '';

  if (format < 2) {
    markup = new XMLSerializer().serializeToString(svg);
    //if (format === 0) markup = minifySVGMarkup(markup, { removeComments })
    markup = minifySVGMarkup(markup, { removeComments })
    
  } else {
    markup = serializeSVGPretty(svg)
  }


  if (omitNamespace) {
    markup = markup.replaceAll('xmlns="http://www.w3.org/2000/svg"', '')
  }

  if (removeComments) {
    markup = markup
      .replace(/(<!--.*?-->)|(<!--[\S\s]+?-->)|(<!--[\S\s]*?$)/g, '')
  }

  /*
  markup = markup
    .replace(/\t/g, "")
    .replace(/[\n\r|]/g, "\n")
    .replace(/\n\s*\n/g, '\n')
    .replace(/ +/g, ' ')
    //.replace(/  +/g, ' ')
    .replace(/> </g, '><')
    .trim()
    // sanitize linebreaks within pathdata
    .replaceAll('&#10;', '\n');
  */

  //console.log(markup);

  return markup
}



export function minifySVGMarkup(svg, {
  removeComments = true,
} = {}) {

  if (removeComments) {
    svg = svg.replace(/<!--[\s\S]*?-->/g, '')
  }

  // Remove whitespace between tags
  svg = svg.replace(/>\s+</g, '><')
    // Trim leading/trailing whitespace
    .trim()
    // Remove extra whitespace within tags (attributes)
    .replace(/\s+([=])\s+/g, '$1')
    .replace(/\s+(?=[^<]*>)/g, ' ')
    // Collapse multiple spaces to single space
    .replace(/\s{2,}/g, ' ')
    // Remove spaces around = signs in attributes
    .replace(/\s*=\s*/g, '=');

  return svg
}

export function serializeSVGPretty(xmlDoc, {
  indentSize = 2 } = {}) {
  if (typeof xmlDoc === 'string') {
    xmlDoc = new DOMParser().parseFromString(xmlDoc, 'image/svg+xml').querySelector('svg')
  }
  return formatXMLNode(xmlDoc, 0, indentSize);
}


function formatXMLNode(node, level, indentSize) {
  let indent = " ".repeat(level * indentSize);

  if (node.nodeType === Node.TEXT_NODE) {
    let text = node.textContent.trim();
    return text ? text : "";
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    let hasChildren = node.children.length > 0;
    let hasTextContent = node.textContent.trim().length > 0 && node.children.length === 0;

    let result = `${indent}<${node.nodeName}`;

    // Add attributes
    for (let i = 0; i < node.attributes.length; i++) {
      let att = node.attributes[i];
      result += ` ${att.name}="${att.value}"`;
    }

    if (!hasChildren && !hasTextContent) {
      return result + " />\n";
    }

    result += ">";

    if (hasChildren) {
      result += "\n";
      for (let child of node.children) {
        result += formatXMLNode(child, level + 1, indentSize);
      }
      result += `${indent}</${node.nodeName}>\n`;
    } else if (hasTextContent) {
      result += node.textContent.trim();
      result += `</${node.nodeName}>\n`;
    } else {
      result += `</${node.nodeName}>\n`;
    }

    return result;
  }

  return "";
}