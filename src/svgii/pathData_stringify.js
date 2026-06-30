
/**
* serialize pathData array to 
* d attribute string 
*/

export function pathDataToD(pathData = [], mode = 0) {

    mode = parseFloat(mode)
    /*
    0 = max minification
    0.5 = safe
    1 = verbose
    2 = beautify
    */

    let len = pathData.length;
    let d = ''

    // group same types
    let pathDataGrouped = mode >0.5 ? JSON.parse(JSON.stringify(pathData)) : [];
    let typePrev = 'M'

    if (mode < 1) {
        pathDataGrouped = [pathData[0]];
        //pathDataGrouped = [{type:pathData[0].type, values:[...pathData[0].values]}];
        let idx = 0;

        for (let i = 1; i < len; i++) {
            let com = pathData[i];
            let { type } = com;
            // decouple from object
            let values = [...com.values]

            // new type
            if (type !== typePrev) {
                pathDataGrouped.push({type, values})
                idx++
            } else {
                pathDataGrouped[idx].values.push(...values)
            }

            // update type
            typePrev = type
        }
    }

    // stringify grouped
    len = pathDataGrouped.length;
    let separator_type = mode < 1 ? '' : ' ';
    let separator_command = mode < 1 ? '' : (mode === 1 ? ' ' : `\n`);

    typePrev = 'M'

    for (let i = 0; i < len; i++) {
        let com = pathDataGrouped[i];
        let { type, values } = com;

        // we're always starting a path with absolute M!
        let omitType = mode < 1 && ((typePrev === 'M' && type === 'L') || (typePrev === 'm' && type === 'l'))

        // add type
        if (!omitType) d += type + separator_type;

        // add values
        let wasSmallFloat = false;
        let separatorVal = ' ';

        for (let v = 0, vlen = values.length; vlen && v < vlen; v++) {
            let val = values[v];
            let valAbs = Math.abs(val);
            let valStr = val.toString();
            let isNegative = val < 0;
            let sign = isNegative ? '-' : ''
            let isSmallFloat = mode > 0.5 ? false : (val && valAbs < 1);
            let idxSub = isSmallFloat ? (isNegative ? 2 : 1) : 0

            // we don't need whitespace for first value
            separatorVal = v === 0 || isNegative ? '' : ' '

            if (mode < 1) {
                // omit leading zero
                if (isSmallFloat) valStr = sign + valStr.substring(idxSub)

                // omit whitespace for subsequent small floats
                separatorVal = (v === 0 && !omitType) || (wasSmallFloat && isSmallFloat) ?
                    (!mode ? '' : (isNegative ? '' : ' '))
                    : (isNegative ? '' : ' ');

            }

            // omit separator between large Arc sweep and final x in minify mode
            if (!mode && (type === 'a' || type === 'A')) {
                let pos = (v % 7)
                if (pos > 3 && pos < 6) separatorVal = ''
            }

            d += `${separatorVal}${valStr}`
            wasSmallFloat = isSmallFloat;

        }

        // add command separator
        if (mode) d += separator_command;

        // update previous type
        typePrev = type

    }

    //console.log('d', d, mode);
    //console.log('pathDataGrouped', pathDataGrouped);
    //console.log(pathData);

    return d;
}












export function pathDataToD__(pathData, mode = 0) {

    mode = parseFloat(mode)
    /*
    0 = max minification
    0.5 = safe
    1 = verbose
    2 = beautify
    */
    let len = pathData.length;

    let valsString = pathData[0].values.join(" ");
    let separator_command = mode > 1 ? `\n` :
        ((mode < 1) ? '' : ' ');
    let separator_type = mode > 0.5 ? ' ' : '';

    // 1st command
    let d = `${pathData[0].type}${separator_type}${valsString}${separator_command}`;


    for (let i = 1; i < len; i++) {
        let com0 = pathData[i - 1];
        let com = pathData[i];
        let { type, values } = com;
        valsString = '';

        // Minify Arc commands (A/a) – actually sucks!
        if (!mode && (type === 'A' || type === 'a')) {
            values = [
                values[0], values[1], values[2],
                `${values[3]}${values[4]}${values[5]}`,
                values[6]
            ];
        }

        // Omit type for repeated commands
        type = ((mode < 1) && com0.type === com.type && com.type.toLowerCase() !== 'm')
            ? " "
            : ((mode < 1) && com0.type === "M" && com.type === "L"
                ? " "
                : com.type);


        // concatenate subsequent floating point values
        if (!mode) {

            let prevWasFloat = false;

            for (let v = 0, l = values.length; v < l; v++) {
                let val = values[v];
                let valStr = val.toString();
                let isFloat = valStr.includes('.');
                let isSmallFloat = isFloat && Math.abs(val) < 1;


                // Remove leading zero from small floats *only* if the previous was also a float
                if (isSmallFloat && prevWasFloat) {
                    valStr = valStr.replace(/^0\./, '.');
                }

                // Add space unless this is the first value OR previous was a small float
                if (v > 0 && !(prevWasFloat && isSmallFloat)) {
                    valsString += ' ';
                }

                valsString += valStr
                prevWasFloat = isSmallFloat;
            }

        }
        // regular non-minified output
        else {
            valsString = values.join(' ')
        }

        if (i === len - 1) separator_command = ''
        d += `${type}${separator_type}${valsString}${separator_command}`;
    }


    if (mode < 1) {
        d = d
            .replace(/[A-Za-z]0(?=\.)/g, m => m[0])
            //Space before small decimals
            .replace(/ 0\./g, " .")
            // Remove space before negatives
            .replace(/ -/g, "-")
            // Remove leading zero from negative decimals
            .replace(/-0\./g, "-.")
            // Convert uppercase 'Z' to lowercase
            .replace(/Z/g, "z")
    }

    //console.log(`"${d}"`);

    return d;
}
