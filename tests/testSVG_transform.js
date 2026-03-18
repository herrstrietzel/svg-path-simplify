
/**
 * load node polyfills for DOM parsing
 * loads linkedom npm module for DOM parsing and emulation 
 */
import 'svg-path-simplify/node';
import { svgPathSimplify } from 'svg-path-simplify';



let svgMarkup =`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" font-size="24px" font-family="Arial" style="fill:red">
  <g style="transform:translate(-25%, 10px); stroke:#000000; stroke-width:2px">
    <g transform="translate(25.0 0)" style="transform:translate(49.765%, 1em) scale(50%);  transform-origin:center 10px">
      <ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="orange" fill-opacity="0.5" style="transform:rotate(-0.785398rad) 
matrix(1.2, 0 ,0,1.2,0,0 ) translateX(-1mm) translateY(-1mm) skewX(10rad) skewY(10rad) scaleX(0.8) scaleY(75%); transform-origin:10mm 5mm; rotate:25deg; scale:50% 1.25; translate:-3mm -0.1in;"></ellipse>
      <circle cx="50%" cy="50%" r="50%" fill="blue" fill-opacity="0.5" font-family="Arial" font-size="12px" transform="translate(-1 2) translate(-50 0)"></circle>
      <rect x="0" y="0" width="49.999%" height="50.0001%" stroke-dasharray="0 10" stroke-linecap="round" transform="rotate(3 120 60) translate(-3,-5) rotate(-15) scale(0.75)" transform-origin="center"></rect>
      
      <rect x="0" y="0" width="49.999%" height="60.0001%" stroke-dasharray="0 10" rx="5%" ry="20%" stroke-linecap="round" transform="translate(-80,-50) scale(0.75)" transform-origin="center" style="fill:green; fill-opacity:0.5"></rect>
      
      <text x="50%" y="50%" stroke="none" fill="#000000" transform="rotate(-15) translate(-200 0)">Text</text>

    </g>
  </g>
</svg>`


// try to simplify
let options = {
    stylesToAttributes:true,
    //mergePaths:true,
    //shapesToPaths:true,
    convertTransforms:true,
}


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
