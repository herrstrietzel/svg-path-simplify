export function detectInputType(input) {
    let type = 'string';
    /*
    if (input instanceof HTMLImageElement) return "img";
    if (input instanceof SVGElement) return "svg";
    if (input instanceof HTMLCanvasElement) return "canvas";
    if (input instanceof File) return "file";
    if (input instanceof ArrayBuffer) return "buffer";
    if (input instanceof Blob) return "blob";
    */
    if (Array.isArray(input)) {

        // nested array
        if (Array.isArray(input[0])) {
            //console.log('is array', input[0], input[0][0])

            if (input[0].length === 2) {
                //console.log('is single poly value array')
                return 'polyArray'
            }

            else if (Array.isArray(input[0][0]) && input[0][0].length === 2) {
                //console.log('is complex poly point value array', input[0][0])
                return 'polyComplexArray'
            }
            else if (input[0][0].x !== undefined && input[0][0].y !== undefined) {
                //console.log('is nested point object array')
                return 'polyComplexObjectArray'
            }
        }

        // is point array
        else if (input[0].x !== undefined && input[0].y !== undefined) {
            //console.log('is nested point object array')
            return 'polyObjectArray'
        }

        // path data array
        else if (input[0]?.type && input[0]?.values
        ) {
            return "pathData"

        }
        //console.log(input[0], typeof input[0]);
        return "array";
    }

    if (typeof input === "string") {
        input = input.trim();
        let isSVG = input.includes('<svg') && input.includes('</svg');
        let isSymbol = input.startsWith('<symbol') && input.includes('</symbol');
        let isPathData = input.startsWith('M') || input.startsWith('m');
        let isPolyString = !isNaN(input.substring(0, 1)) && !isNaN(input.substring(input.length - 1, input.length))
        let isJson = isNumberJson(input)
        //console.log('isNumberJson', isJson);

        if (isSVG) {
            type = 'svgMarkup'
        }

        else if (isJson) {
            type = 'json'
        }

        else if (isSymbol) {
            type = 'symbol'
        }
        else if (isPathData) {
            type = 'pathDataString'
        }
        else if (isPolyString) {
            type = 'polyString'
        }

        else {
            let url = /^(file:|https?:\/\/|\/|\.\/|\.\.\/)/.test(input);
            let dataUrl = input.startsWith('data:image');
            type = url || dataUrl ? "url" : "string";
        }


        return type
    }

    type = typeof input
    let constructor = input.constructor.name



    return (constructor || type).toLowerCase();
}


function isNumberJson(str) {

    str = str.trim();

    let hasNumber = /\d/.test(str)
    let hasInvalid = /[abcdfghijklmnopqrstuvwz]/gi.test(str)
    if (!hasNumber || hasInvalid) return false


    // is JSON like
    let isJson = str.startsWith('[') && str.endsWith(']');

    return isJson
    
}