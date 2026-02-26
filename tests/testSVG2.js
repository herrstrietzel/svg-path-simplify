
/**
 * load node polyfills for DOM parsing
 * loads linkedom npm module for DOM parsing and emulation 
 */
import 'svg-path-simplify/node';
import { svgPathSimplify } from 'svg-path-simplify';



let svgMarkup =`<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 210 210"><g transform="translate(-210)"><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="6.5252" d="M403.6556 126.8938H226.3444"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="6.608" d="M218.304 101.7193h193.392"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="6.5248" d="M403.6556 76.545H226.3444"/><rect width="122.6239" height="115.3804" x="253.688" y="46.3265" fill="#fff" stroke="#000" stroke-linecap="round" stroke-width="6.5252" ry="16.3026"/><path d="M278.0097 57.7418c-7.1917 0-12.9815 5.7892-12.9815 12.981v65.9129c0 7.1917 5.7898 12.9815 12.9815 12.9815h72.7384c7.1917 0 12.9815-5.7898 12.9815-12.9815v-65.913c0-7.1917-5.7898-12.981-12.9815-12.981zm19.3197 17.3554h13.427l19.7544 54.3635h-11.266l-4.8227-13.8896h-20.7194l-4.8233 13.8896h-11.3819zm40.5508 0h11.3824v54.3635h-11.3824zm-33.8373 8.3726-7.7936 23.5355h15.6261z"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="6.5252" d="M340.1744 17.9869v28.3396"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="6.608" d="m314.856 9.7382.288 36.5883"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="6.5252" d="M289.8257 17.5703v28.7562"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="M226.75 194.8457q1.8299 0 3.5484-.5847 1.7185-.6025 2.6574-1.5239v-3.4553h-5.4739v-3.863h9.7702v9.1789q-1.7822 2.0377-4.6464 3.1895-2.8483 1.1518-5.983 1.1518-5.474 0-8.4177-3.3668-2.9438-3.3844-2.9438-9.5863 0-6.1664 2.9597-9.4445 2.9597-3.2959 8.5131-3.2959 7.8926 0 10.0407 6.5031l-4.3281 1.453q-.7002-1.896-2.196-2.8706-1.4957-.9745-3.5166-.9745-3.3098 0-5.0283 2.2326t-1.7185 6.3968q0 4.235 1.7662 6.5563 1.7822 2.3035 4.9965 2.3035z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="M241.453 198.5846v-24.967h17.6309v4.04H246.147v6.2728h11.9661v4.0401h-11.966v6.574h13.5891v4.04z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="m276.8421 198.5846-9.7702-19.2258q.2864 2.7997.2864 4.5008v14.725h-4.169v-24.967h5.3625l9.9134 19.3853q-.2865-2.6757-.2865-4.873v-14.5123h4.169v24.967z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="M286.7237 198.5846v-24.967h17.631v4.04h-12.9368v6.2728h11.966v4.0401h-11.966v6.574h13.5891v4.04z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="m323.8632 198.5846-5.2033-9.48h-5.5057v9.48H308.46v-24.967h11.2023q4.01 0 6.19 1.9314 2.18 1.9138 2.18 5.5108 0 2.6226-1.3367 4.5363-1.3366 1.896-3.6121 2.4984l6.0626 10.49zm-.557-17.3121q0-3.597-4.1372-3.597h-6.0148v7.3713h6.1421q1.9732 0 2.9916-.9923t1.0184-2.782z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4644" d="m347.8432 198.5846-1.989-6.379h-8.545l-1.989 6.379h-4.6942l8.179-24.967h5.5374l8.1472 24.967zm-6.2695-21.1218-3.2144 10.809h6.4446z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="M363.2304 177.6577v20.9269h-4.6941v-20.927h-7.2402v-4.04h19.1904v4.04z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="M373.0165 198.5846v-24.967h17.631v4.04h-12.9368v6.2728h11.9661v4.0401h-11.9661v6.574h13.5892v4.04z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/><path stroke="#000" stroke-linecap="round" stroke-width=".4646" d="M414.7388 185.915q0 3.863-1.3685 6.7512-1.3525 2.8706-3.8507 4.3945-2.4824 1.5239-5.6967 1.5239h-9.07v-24.967h8.1153q5.6648 0 8.7677 3.1895 3.103 3.1719 3.103 9.108zm-4.726 0q0-4.0223-1.8776-6.131-1.8777-2.1263-5.3625-2.1263h-3.3257v16.8868h3.9781q3.0234 0 4.8055-2.3213t1.7822-6.3082z" font-family="Liberation Sans" font-size="21.0811" font-weight="700" style="line-height:1.25;-inkscape-font-specification:&quot;Liberation Sans Bold&quot;"/></g></svg>`

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
    shapesToPaths:true
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
