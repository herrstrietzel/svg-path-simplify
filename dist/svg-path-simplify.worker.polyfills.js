
// load linkedom for SVG document processing
import { DOMParser, parseHTML } from 'https://cdn.jsdelivr.net/npm/linkedom@0.18.12/worker.min.js';

let svgDoc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>`
export const document = (new DOMParser).parseFromString(svgDoc, 'image/svg+xml');

if (!globalThis.document) {
  globalThis.document = document;
}


// install globals BEFORE anything else loads
if (!globalThis.DOMParser) {
  globalThis.DOMParser = DOMParser;
}

if (!globalThis.parseHTML) {
  globalThis.parseHTML = parseHTML;
}


// polyfill browsers XMLSerializer
export class XMLSerializerPoly {
    serializeToString(document) {
        return document.toString();
    }
}

if (!globalThis.XMLSerializer) {
    globalThis.XMLSerializer = XMLSerializerPoly;
}
