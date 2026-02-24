
/**
 * load node polyfills for DOM parsing
 * loads linkedom npm module for DOM parsing and emulation 
 */
import 'svg-path-simplify/node';
import { svgPathSimplify } from 'svg-path-simplify';



let svgMarkup =
	`<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Super Adobe Illustrator 33.0.0 Turbo, SVG Export Plug-In . SVG Version: 123.00 Build 0)  -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="5.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="47px"
	 height="120px" viewBox="0 0 47 120" enable-background="new 0 0 47 120" xml:space="preserve">
<g id="garamond">
	<path id="path1" d="M23.6 39.6 Q34.7 39.6 40.9 47 Q47 54.4 47 67.1 L47 67.1 Q47 75.3 44.2 81.5 Q41.4 87.8 36.1 91.3 Q30.8 94.7 23.5 94.7 L23.5 94.7 Q12.4 94.7 6.2 87.3 Q0 79.9 0 67.2 L0 67.2 Q0 59 2.8 52.8 Q5.6 46.5 10.9 43 Q16.2 39.6 23.6 39.6 L23.6 39.6 ZM23.6 47 Q9.9 47 9.9 67.2 L9.9 67.2 Q9.9 87.3 23.5 87.3 L23.5 87.3 Q37.1 87.3 37.1 67.1 L37.1 67.1 Q37.1 47 23.6 47 L23.6 47 Z "/>
</g>
</svg>`

// try to simplify
let svgOpt = svgPathSimplify(svgMarkup, {scaleTo:24});

// simplified pathData
console.log(svgOpt)



/*
let document = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
let svg = document.querySelector('svg');
let path = svg.querySelector('path');
let els = svg.querySelectorAll('path')
let d = path.getAttribute('d').substring(0, 10)
//console.log(els);


//let markup = document.toString()
let markup = new XMLSerializer().serializeToString(svg)
*/
//console.log(markup);



/*
*/
