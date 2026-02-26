







export async function checkSVGFilesize(files) {
    let fileStack = [];
    let totalSize = 0;

    for (let file of files) {

        let { size, name } = file;

        fileStack.push({
            name,
            size,
            svg:'',
            simplified: {}
        });

        totalSize += size
    }

    fileStack[0].totalO = totalSize
    fileStack[0].totalS = 0
    return fileStack
}


export async function loadSVGFiles(files=[], fileStack=[]) {

    for (let i=0; i<fileStack.length; i++) {

        let file=files[i];

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


export function simplifyStack(fileStack = [], settings) {
    let l = fileStack.length;
    //let totalO = 0;
    let totalS = 0;

    for (let i = 0; i < l; i++) {
        let item = fileStack[i];
        let { svg, size } = item

        // use original as fallback
        let simplifiedObj = { svg }
        let error=false;

        try {
            simplifiedObj = svgPathSimplify(svg, settings)

        } catch {
            console.warn('couldn not be processed');
            error=false;
        }

        //totalO += size
        totalS += simplifiedObj.svg.length
        fileStack[i].simplified = simplifiedObj;
        fileStack[i].error = error;
        
    }

    // add new file size
    fileStack[0].totalS= totalS;
    return fileStack;
}



export function getSVGPreviews(fileStack = []) {
    let previews = [];
    for (let item of fileStack) {
        let { name, simplified, error=false } = item;
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



export async function generateSVGZip(fileStack = []) {

    let zipObj = {}

    for (let item of fileStack) {
        let { name, simplified } = item;

        // add to zip
        zipObj[`${name}`] = simplified.svg;

    }

    let url = await getZipObjectUrl(zipObj);
    return url;

}


// create zip
export async function getZipObjectUrl(files = {}) {

    const fetchBinary = async (url) => {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn("could't fetch resource");
            return null;
        }
        return new Uint8Array(await res.arrayBuffer());
    };

    const encoder = new TextEncoder();

    for (let name in files) {
        let val = files[name];

        let isString = typeof val === 'string';
        let ext = isString && !val.includes('<') && !val.includes('>') ? val.split('.').slice(-1)[0].toLowerCase() : '';
        let isUrl = isString && (val.startsWith('http') || val.startsWith('.') || (ext && ext.length < 5));

        if (isString) {
            if (isUrl) {
                let binary = await fetchBinary(val);
                if (binary) {
                    files[name] = binary;
                } else {
                    delete files[name];
                }
            }
            else {
                files[name] = encoder.encode(val);
            }
        }
    }

    let zip = UZIP.encode(files);
    let blob = new Blob([zip]);
    let url = URL.createObjectURL(blob);
    return url
}

/*
    function getParamNames(func) {

        const STRIP_COMMENTS = /((\/\/.*$)|(\/\*.*\*\/))/mg;
        const STRIP_KEYWORDS = /(\s*async\s*|\s*function\s*)+/;
        const ARGUMENT_NAMES = /\(([^)]+)\)\s*=>|([a-zA-Z_$]+)\s*=>|[a-zA-Z_$]+\(([^)]+)\)|\(([^)]+)\)/;
        const ARGUMENT_SPLIT = /[ ,\n\r\t]+/;
    

        const fnStr = func.toString()
            .replace(STRIP_COMMENTS, "")
            .replace(STRIP_KEYWORDS, "")
            .replaceAll('\r', '\n')
            .replaceAll('\n\n', '\n')
            .trim();
        const matches = ARGUMENT_NAMES.exec(fnStr);
        var match;
        if (matches) {
            for (var i = 1; i < matches.length; i++) {
                if (matches[i]) {
                    match = matches[i];
                    break;
                } 
            }
        }
        if (match === undefined) {
            return [];
        }
        let res = match.split(ARGUMENT_SPLIT).filter(part => part !== "").filter(val=>val!=='{' && val!=='}' && val!=='{}');

        let props={}
        for (let i=2; i<res.length; i+=3){

            let [prop, del, val] = [res[i-2], res[i-1], res[i]]
            console.log(prop, del, val);
            props[prop]=val
        }

        //res=res.join('')
console.log(props);
        return res
        return props 
    }
    


    let args = getParamNames(svgPathSimplify)


    console.log( args);

    */