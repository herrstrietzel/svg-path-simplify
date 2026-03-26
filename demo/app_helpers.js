

// avoid conflicts with symbol ids in UI
export function prefixIds(svg, { prefix = '__' } = {}) {
    return svg
        .replaceAll('id="', `id="${prefix}`)
        .replaceAll('url(#', `url(#${prefix}`)
        .replaceAll('href="#', `href="#${prefix}`);
}

export function svg2Symbol(svg) {
    return svg.replaceAll('<svg ', '<symbol ').replaceAll('</svg', '</symbol').replaceAll(' xmlns="http://www.w3.org/2000/svg"', '');
}

export function symbol2Svg(svg) {
    return svg.replaceAll('<symbol ', '<svg ').replaceAll('</symbol', '</svg');
}


export function togglePreview(target, settings = {}) {

    //console.log('showOriginal', settings.showOriginal, settings);

    if (settings.showOriginal === 'show') {
        //console.log('show');
        target.classList.add('showOriginal')
        target.classList.remove('showMarkers')

    } else {
        //console.log('hide');
        target.classList.remove('showOriginal')
    }
}



export function showMarkersInPreview(target, settings = {}) {
    //console.log('showMarkersInPreview', settings.showMarkers);
    if (settings.showMarkers) {
        target.classList.add('showMarkers')

    } else {
        target.classList.remove('showMarkers')
    }
}



export function adjustViewBox(svg) {
    let bb = svg.getBBox();
    let [x, y, width, height] = [bb.x, bb.y, bb.width, bb.height];
    svg.setAttribute("viewBox", [x, y, width, height].join(" "));
}






/** prevent focus in extension */
export function isBody(e) {
    if (!e.target) return false;
    let nodeName = e.target.nodeName.toLowerCase()
    let isBody = nodeName === 'body'
    return isBody
}


// Check if focus is in a form field
// Function to check if there's any text selection in the document
export function hasTextSelection() {
    let selection = window.getSelection();

    // Check if there's a selection and it's not empty
    if (selection && selection.toString().trim().length > 0) {
        return true;
    }

    // Check if there's a selection in input/textarea elements
    let activeElement = document.activeElement;
    if (activeElement) {
        if (activeElement.tagName.toLowerCase() === 'input' ||
            activeElement.tagName.toLowerCase() === 'textarea') {

            // Check if text is selected in the input
            if (activeElement.selectionStart !== activeElement.selectionEnd) {
                return true;
            }
        }
    }

    return false;
}


// Check if focus is in a form field
export function isInFormField() {
    let activeElement = document.activeElement;
    if (!activeElement) return false;
    let tagName = activeElement.tagName.toLowerCase();
    let isFormField = tagName === 'input';
    return isFormField
}


export function validateInput(str) {
    if (!str) return false;
    str = str.trim();
    let isSVG = str.startsWith('<svg') && str.includes('</svg')
    let isSymbol = str.startsWith('<symbol') && str.includes('</symbol')
    let isPathData = str.startsWith('M') || str.startsWith('m');
    let hasScript = str.includes('<script')
    let isValid = false

    if ((isSVG || isSymbol || isPathData) && !hasScript) isValid = true;
    return isValid
}




export async function checkSVGFilesize(files) {
    let fileStack = [];
    let totalSize = 0;

    for (let file of files) {

        let { size, name } = file;

        fileStack.push({
            name,
            size,
            svg: '',
            simplified: {}
        });

        totalSize += size
    }

    if (fileStack[0]) {
        fileStack[0].totalO = totalSize
        fileStack[0].totalS = 0
    }

    //console.log(fileStack);
    return fileStack
}


export async function loadSVGFiles(files = [], fileStack = []) {

    for (let i = 0; i < fileStack.length; i++) {

        let file = files[i];

        // Load file
        //let svg = await file.text();
        fileStack[i].svg = await file.text();
        /*
        fileStack.push({
            name: name,
            size: size,
            svg,
            simplified: ''
        });
        */

    }


    return fileStack
}






export async function loadSVGFiles__(files) {
    let fileStack = [];
    let totalSize = 0;

    for (let file of files) {

        let { size, name } = file;

        if (totalSize + size > maxSize) {
            alert('Max filesize exceeded');
            break;
        }

        // Load file
        let svg = await file.text();
        fileStack.push({
            name: name,
            size: size,
            svg,
            simplified: ''
        });

        totalSize += size
    }

    fileStack[0].totalO = totalSize
    fileStack[0].totalS = 0
    fileStack[0].tooLarge = totalSize > maxSize

    return fileStack
}



export function getSVGPreviews(fileStack = []) {
    let previews = [];
    for (let item of fileStack) {
        let { name, simplified, error = false } = item;
        let svg = simplified.svg

        // add namespace for preview
        let ns = "http://www.w3.org/2000/svg";
        if (!svg.includes(ns)) {
            svg = svg.replace(/<svg/, `<svg xmlns="${ns}" `)
        }

        let errorClass = error ? 'errorSimplify' : ''

        // create previews
        previews.push(
            `<figure class="col col-preview ${errorClass}">
                <img class="img-preview-multi" src="data:image/svg+xml,${encodeURIComponent(svg)}">
                <figcaption class="p-caption">${name}</figcaption>
            </figure>`)
    }
    return previews.join('')
}


export function updateConfig(settings = {}) {

    let { omitDefaults } = settings || false

    let excludeProps = ['dInput', 'dOutput', 'storageName', 'defaults', 'config', 'showNav', 'showMarkers', 'data', 'getObject', 'samples', 'omitDefaults', 'detailsOpen', 'showNav0', 'showOriginal', 'preset', 'markerSize', 'showTransparency', 'toAbsolute', 'toLonghands']

    let configs = {}
    let defaults = settings.defaults;
    //console.log(defaults);

    for (let prop in settings) {
        if (!excludeProps.includes(prop)) {
            let value = settings[prop];
            if (!omitDefaults || ( defaults[prop]!==undefined && value !== defaults[prop]) ) {
                //console.log('add', prop, value, defaults[prop], 'defaults', defaults);
                configs[prop] = settings[prop]
            }
        }
    }
    let configJson = 'const options=' + JSON.stringify(configs, null, ' ').replaceAll('"', '')
    textConfig.value = configJson
    return configs;

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