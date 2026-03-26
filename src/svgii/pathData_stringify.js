
/**
* serialize pathData array to 
* d attribute string 
*/

export function pathDataToD(pathData, mode = 0) {

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

        if(i===len-1) separator_command=''
        d += `${type}${separator_type}${valsString}${separator_command}`;
    }


    if (mode < 1) {
        d = d
            .replace(/[A-Za-z]0(?=\.)/g, m => m[0])
            .replace(/ 0\./g, " .") // Space before small decimals
            .replace(/ -/g, "-")     // Remove space before negatives
            .replace(/-0\./g, "-.")  // Remove leading zero from negative decimals
            .replace(/Z/g, "z")    // Convert uppercase 'Z' to lowercase
    }

    //console.log(`"${d}"`);

    return d;
}
