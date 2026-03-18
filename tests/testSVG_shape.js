
/**
 * load node polyfills for DOM parsing
 * loads linkedom npm module for DOM parsing and emulation 
 */
import 'svg-path-simplify/node';
import { svgPathSimplify } from 'svg-path-simplify';



let svgMarkup =`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-alert-circle"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`

//document = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml').querySelector('svg')

/*
let rect = dom.querySelector('rect')
let pathdata = getPathDataFromEl(rect)
let newR = document.createElementNS('http://www.w3.org/2000/svg', 'path')
newR.setAttribute('d','M414.7388 185.915' )
console.log(newR);
*/


// try to simplify
let options = {
    stylesToAttributes:true,
    mergePaths:true,
    shapesToPaths:true,
    //convertTransforms:true,
}

//console.log(svgMarkup, options)


let svgOpt = svgPathSimplify(svgMarkup, options);

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
