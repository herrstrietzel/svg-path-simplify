'use strict';

var linkedom = require('linkedom');

// src/node-dom.js


let svgDoc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>`;
const document = (new linkedom.DOMParser).parseFromString(svgDoc, 'image/svg+xml');

if (!globalThis.document) {
  globalThis.document = document;
}


// install globals BEFORE anything else loads
if (!globalThis.DOMParser) {
  globalThis.DOMParser = linkedom.DOMParser;
}

if (!globalThis.parseHTML) {
  globalThis.parseHTML = linkedom.parseHTML;
}

// polyfill browsers XMLSerializer
class XMLSerializerPoly {
    serializeToString(document) {
        return document.toString();
    }
}

if (!globalThis.XMLSerializer) {
    globalThis.XMLSerializer = XMLSerializerPoly;
}

exports.XMLSerializerPoly = XMLSerializerPoly;
exports.document = document;
