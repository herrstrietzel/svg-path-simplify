
/**
* serialize pathData array to 
* d attribute string 
*/

export function pathDataToD(pathData, optimize = 0) {

    optimize = parseFloat(optimize)


    let len = pathData.length;
    let beautify = optimize > 1;
    let minify = beautify || optimize ? false : true;


    let d = '';
    let valsString = pathData[0].values.join(" ");
    let separator_command = beautify ? `\n` : (minify ? '' : ' ');
    let separator_type = !minify ? ' ' : '';

    d = `${pathData[0].type}${separator_type}${valsString}${separator_command}`;


    for (let i = 1; i < len; i++) {
        let com0 = pathData[i - 1];
        let com = pathData[i];
        let { type, values } = com;
        valsString = '';

        // Minify Arc commands (A/a) – actually sucks!
        if (minify && (type === 'A' || type === 'a')) {
            values = [
                values[0], values[1], values[2],
                `${values[3]}${values[4]}${values[5]}`,
                values[6]
            ];
        }

        // Omit type for repeated commands
        type = (minify && com0.type === com.type && com.type.toLowerCase() !== 'm')
            ? " "
            : (minify && com0.type === "M" && com.type === "L"
                ? " "
                : com.type);


        // concatenate subsequent floating point values
        if (minify) {


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
                //console.log(isSmallFloat, prevWasFloat, valStr);

                valsString += valStr
                prevWasFloat = isSmallFloat;
            }

            //console.log('minify', valsString);
            d += `${type}${separator_type}${valsString}${separator_command}`;

        }
        // regular non-minified output
        else {
            d += `${type}${separator_type}${values.join(' ')}${separator_command}`;
        }
    }

    if (minify) {
        d = d
            .replace(/[A-Za-z]0(?=\.)/g, m => m[0])
            .replace(/ 0\./g, " .") // Space before small decimals
            .replace(/ -/g, "-")     // Remove space before negatives
            .replace(/-0\./g, "-.")  // Remove leading zero from negative decimals
            .replace(/Z/g, "z");     // Convert uppercase 'Z' to lowercase
    }

    return d;
}


export function pathDataToD_0(pathData, decimals = -1, minify = false) {
    // implicit l command
    if (pathData[1].type === "l" && minify) {
        pathData[0].type = "m";
    }
    let d = `${pathData[0].type}${pathData[0].values.join(" ")}`;

    for (let i = 1; i < pathData.length; i++) {
        let com0 = pathData[i - 1];
        let com = pathData[i];

        let type = (com0.type === com.type && minify) ?
            " " : (
                (com0.type === "m" && com.type === "l") ||
                (com0.type === "M" && com.type === "l") ||
                (com0.type === "M" && com.type === "L")
            ) && minify ?
                " " : com.type;

        // round
        if (com.values.length && decimals > -1) {
            com.values = com.values.map(val => { return +val.toFixed(decimals) })
        }
        d += `${type}${com.values.join(" ")}`;
    }


    if (minify) {
        d = d
            .replaceAll(" 0.", " .")
            .replaceAll(" -", "-")
            .replaceAll("-0.", "-.")
            .replace(/\s+([mlcsqtahvz])/gi, "$1")
            .replaceAll("Z", "z");
    }

    return d;
}

