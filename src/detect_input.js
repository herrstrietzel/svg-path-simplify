import { dummySVG, svgNs } from "./constants";
import { validateSVG } from "./svgii/svg_validate";

export function detectInputType(input) {
    let type = 'string';
    let log = '';
    let isValid = true;

    let result = {
        inputType:'',
        isValid:true,
        fileReport:{},
    }


    if (Array.isArray(input)) {

        result.inputType = "array";


        // nested array
        if (Array.isArray(input[0])) {
            //console.log('is array', input[0], input[0][0])

            if (input[0].length === 2) {
                //console.log('is single poly value array')
                result.inputType = 'polyArray'
            }

            else if (Array.isArray(input[0][0]) && input[0][0].length === 2) {
                //console.log('is complex poly point value array', input[0][0])
                result.inputType = 'polyComplexArray'
            }
            else if (input[0][0].x !== undefined && input[0][0].y !== undefined) {
                //console.log('is nested point object array')
                result.inputType = 'polyComplexObjectArray'
            }
            //return result
        }

        // is point array
        else if (input[0].x !== undefined && input[0].y !== undefined) {
            //console.log('is nested point object array')
            result.inputType = 'polyObjectArray'
        }

        // path data array
        else if (input[0]?.type && input[0]?.values
        ) {
            result.inputType = "pathData"
        }


        return result;
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
            let validate = validateSVG(input);
            ({isValid, log} = validate) ;
            if(!isValid){
                //input = dummySVG
                result.inputType = 'invalid'
                result.isValid=false,
                //result.log = JSON.stringify(log, null, ' ')
                result.log = log
            }else{
                result.inputType = 'svgMarkup'
            }

            result.fileReport = validate.fileReport

        }

        else if (isJson) {
            result.inputType = 'json'
        }

        else if (isSymbol) {
            result.inputType = 'symbol'
        }
        else if (isPathData) {
            result.inputType = 'pathDataString'
        }
        else if (isPolyString) {
            result.inputType = 'polyString'
        }

        else {
            let url = /^(file:|https?:\/\/|\/|\.\/|\.\.\/)/.test(input);
            let dataUrl = input.startsWith('data:image');
            result.inputType = url || dataUrl ? "url" : "string";
        }

        return result
    }

    result.inputType = (input.constructor.name || typeof input ).toLowerCase()

    return result;
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