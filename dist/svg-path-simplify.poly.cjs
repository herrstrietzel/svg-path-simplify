'use strict';

var linkedom = require('linkedom');

// src/node-dom.js

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
