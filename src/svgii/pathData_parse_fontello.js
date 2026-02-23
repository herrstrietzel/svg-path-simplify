
const paramCounts = { a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0 };

// report errors for debugging
const addError = (state, errorCode) => {
    let value = state.path[state.index]
    let com = errorCode !== 6 ? state.path[state.segmentStart] : value;
    let typeInfo = errorCode != 0 ? `type: »${com}«` : ``

    console.log(state);

    if (state.debug) {

        state.log.push(`Command #${state.lastIndex} | ${state.index}) ${typeInfo} value: »${value}«: ${errors[errorCode]}`);

        if (errorCode === 0) {
            state.path = 'M' + state.path
            state.max++
            state.index--
        }

        else if (errorCode === 5) {
            /*
            let idx = state.index;
            state.path = state.path.slice(0, idx + 2) + state.path.slice(idx + 3)
            state.max--
            console.log(state.path);
            //state.index-=1
            //state.index+=1

            //state.index++;
            //finalizeSegment(state)
            */

            // skip to next segment
            state.index = getNextCommandIndex(state)
            //state.lastIndex++
            state.skipped++

            return

        }

        // missing param
        else if (errorCode === 2) {

            // skip to next segment
            state.index = getNextCommandIndex(state)
            state.lastIndex++
            //state.skipped++
            return

        }

        state.index++;

    } else {
        state.err.push(`Command #${state.result.length} | ${state.index}) ${typeInfo} value: »${value}«: ${errors[errorCode]}`);
    }

}

const errors = [
    'Paths must start with `M` or `m` command',
    'Arc largeArc or sweep flag can only be 1 or 0',
    'Missing param',
    'Not a number – param should start with 0..9 or `.`',
    'Trailing zeroes are not permitted',
    'Invalid float exponent',
    'Invalid command'
];

const SPECIAL_SPACES = [
    0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
    0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
];


function isSpaceOrComma(ch) {
    return (ch === 0x20) || (ch === 0x002C) || // White spaces or comma
        (ch === 0x0A) || (ch === 0x0D) ||   // nl cr
        (ch === 0x2028) || (ch === 0x2029) || // Line terminators
        (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
        (ch > 5759 && SPECIAL_SPACES.indexOf(ch) >= 0);
    //(ch >= 0x1680 && SPECIAL_SPACES.indexOf(ch) >= 0);
}


const COMMAND_LOOKUP = new Uint8Array(128);
'achlmqstvz'.split('').forEach(ch => {
    const code = ch.charCodeAt(0);
    COMMAND_LOOKUP[code] = 1;
    COMMAND_LOOKUP[code - 32] = 1; // uppercase
});


function isCommand(code) {
    //return code < 128 && COMMAND_LOOKUP[code] === 1;
    return code > 64 && COMMAND_LOOKUP[code];
}

function isDigit(code) {
    // 0..9
    return (code > 47 && code < 58);
}

function isDigitStart(code) {
    return (code > 47 && code < 58) ||  /* 0..9 */
        code === 0x2E || /* . */
        code === 0x2D || /* - */
        code === 0x2B /* + */
}


function skipSpaces(state) {
    while (state.index < state.max && isSpaceOrComma(state.path.charCodeAt(state.index))) {
        state.index++;
    }
}


function scanArcFlag(state) {
    let ch = state.path.charCodeAt(state.index);

    // zero
    if (ch === 0x30) {
        state.param = 0;
        state.index++;
        return;
    }

    // one
    if (ch === 0x31) {
        state.param = 1;
        state.index++;
        return;
    }

    addError(state, 1)
    //state.err.push(`${state.index}: ${errors[1]}`);
}

// collect command data
function State(path, debug = true) {
    this.index = 0;
    this.path = path;
    this.max = path.length;
    this.result = [];
    this.param = 0;
    this.err = [];
    this.log = [];
    this.segmentStart = 0;
    this.data = [];
    this.lastType = '';
    this.allTypes = new Set([])
    this.debug = debug
    this.skipped=0
    this.lastIndex=0
}


/**
 * Scan command
 */
function scanSegment(state) {
    let max = state.max;
    let cmdCode = state.path.charCodeAt(state.index);
    let is_arc = (cmdCode === 0x61 || cmdCode === 0x41);

    // Error 6:not valid command
    if (!isCommand(cmdCode)) {
        addError(state, 6)
        return;
    }

    let cmd = state.path[state.index];
    let cmdLC = cmd.toLowerCase();
    let needParams = paramCounts[cmdLC];

    state.segmentStart = state.index;
    state.data = [];

    state.index++;
    skipSpaces(state);

    // Z : close path
    if (!needParams) {
        finalizeSegment(state);
        return;
    }


    while (state.index < max) {

        for (let i = 0; i < needParams; i++) {

            // Error 2: missing param
            if (state.index < max && isCommand(state.path.charCodeAt(state.index))) {
                addError(state, 2)
                return;
            }

            // is Arc command
            if (is_arc && (i === 3 || i === 4)) scanArcFlag(state);
            else scanParam(state);

            if (state.err.length) {
                //state.index++
                //continue
                return;
            }

            state.data.push(state.param);
            skipSpaces(state);

        }

        if (state.index >= max) break;

        // If next is not number start → segment done
        if (!isDigitStart(state.path.charCodeAt(state.index))) break;
    }

    finalizeSegment(state);
}



/**
 * Scan parameters in command
 */


function scanParam(state) {
    let start = state.index,
        index = start,
        max = state.max,
        hasCeiling = false,
        hasDecimal = false,
        hasDot = false

    let ch = state.path.charCodeAt(index);

    // Error 2: Missing param
    if (state.index >= max) {
        addError(state, 2)
        return;
    }

    // Plus/Minus
    if (ch === 0x2B || ch === 0x2D) {
        index++;
        ch = (index < max) ? state.path.charCodeAt(index) : 0;
    }


    // not number or '.' dot separator: 3. Not a number – param should start with 0..9 or `.`
    if (!isDigit(ch) && ch !== 0x2E) {
        addError(state, 3)
        return;
    }

    // not '.' floating point separator
    if (ch !== 0x2E) {

        // is zero 
        let zeroFirst = (ch === 0x30);
        index++;

        ch = (index < max) ? state.path.charCodeAt(index) : 0;

        if (zeroFirst && index < max) {
            // decimal number starts with '0' such as '09' is illegal.
            if (ch && isDigit(ch)) {
                addError(state, 4)
                return;
            }
        }

        while (index < max && isDigit(state.path.charCodeAt(index))) {
            index++;
            hasCeiling = true;
        }
        ch = (index < max) ? state.path.charCodeAt(index) : 0;
    }

    // '.' separator
    if (ch === 0x2E) {
        hasDot = true;
        index++;
        while (isDigit(state.path.charCodeAt(index))) {
            index++;
            hasDecimal = true;
        }
        ch = (index < max) ? state.path.charCodeAt(index) : 0;
    }

    // scientific notation 'e/E'
    if (ch === 0x65 || ch === 0x45) {

        // 5. Invalid float exponent
        if (hasDot && !hasCeiling && !hasDecimal) {
            addError(state, 5)

            //finalizeSegment(state)
            // skip to next segment
            //state.index = getNextCommandIndex(state)-1

            return
            //if(!debug) return
        }

        index++;

        ch = (index < max) ? state.path.charCodeAt(index) : 0;
        // plus or minus
        if (ch === 0x2B || ch === 0x2D) {
            index++;
        }
        if (index < max && isDigit(state.path.charCodeAt(index))) {
            while (index < max && isDigit(state.path.charCodeAt(index))) {
                index++;
            }
        } else {
            // 5. Invalid float exponent
            addError(state, 5)
            return;
        }
    }

    state.index = index;
    state.param = +state.path.slice(start, index);
}




/**
 * Process duplicated commands (without comand name)
 * This logic is shamelessly borrowed from Raphael
 * https://github.com/DmitryBaranovskiy/raphael/
 * 
 * !!! removed ROM Catmull command
 */
function finalizeSegment(state) {

    let cmd = state.path[state.segmentStart];
    let cmdLC = cmd.toLowerCase();
    let params = state.data;
    let lastType = state.lastType
    state.allTypes.add(cmd)

    // Z close path
    if (cmdLC === 'z') {
        //console.log('!!!is Z');
        state.result.push({ type: 'Z', values: [] });
        state.lastType = 'z'
        state.lastIndex++
        return
    }

    // implicit linetos introduced by M/m commands
    if (cmdLC === 'm' && params.length > 2) {
        state.result.push({ type: cmd, values: [params[0], params[1]] });
        state.lastIndex++
        params = params.slice(2);
        cmdLC = 'l';
        cmd = (cmd === 'm') ? 'l' : 'L';
    }

    let maxParams = paramCounts[cmdLC]

    // prepend implicit m after Z for better subpath detection
    if (lastType === 'z' && cmdLC !== 'z') {
        state.result.push({ type: 'm', values: [0, 0] });
        state.lastIndex++
    }

    state.lastType = cmdLC

    // create new commands of same type
    while (params.length >= maxParams) {
        state.result.push({ type: cmd, values: params.splice(0, maxParams) });
        state.lastIndex++

        if (!maxParams) {
            break;
        }
    }

}

function getNextCommandIndex(state) {
    let i = state.index;
    while (i < state.max) {
        let ch = state.path.charCodeAt(i);
        if (isCommand(ch)) break
        i++
    }
    return i
}


export function parsePathDataFontello(pathDataString, debug = true) {

    pathDataString = pathDataString.trim()
    let state = new State(pathDataString, debug);
    let max = state.max;


    // Error 0: missing M command: 0. Paths must start with `M` or `m` command
    if (pathDataString[0] !== 'M' && pathDataString[0] !== 'm') {
        addError(state, 0)
    }

    while (state.index < max && (debug || !state.err.length)) {
        scanSegment(state);
    }

    // force absolute M for 1st sub path - facilitates concatenation
    if (state.result.length) {
        state.result[0].type = 'M';
    }

    /**
     * check if absolute/relative or 
     * shorthands are present
     * to specify if normalization is required
     */
    //check types relative arcs or quadratics
    let allTypestypes = Array.from(state.allTypes).join('');

    let pathDataObj = {
        errors: state.err,
        log: state.log,
        pathData: state.result,
        hasRelatives: /[lcqamts]/g.test(allTypestypes),
        hasShorthands: /[vhst]/gi.test(allTypestypes),
        hasArcs: /[a]/gi.test(allTypestypes),
        hasQuadratics: /[qt]/gi.test(allTypestypes),
        isPolygon: /[cqats]/gi.test(allTypestypes) ? false : true,
    }


    console.log(pathDataObj.log);
    console.log(pathDataObj.errors);
    console.log(pathDataObj.pathData);
    return pathDataObj
};
