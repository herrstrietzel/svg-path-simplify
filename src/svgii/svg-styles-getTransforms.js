/**
 * parse CSS string to
 * transform property object
 */

export function parseCSSTransform(transformString, transformOrigin={x:0, y:0}) {
    let transformOptions = {
        transforms: [],
        transformOrigin,
    };

    let regex = /(\w+)\(([^)]+)\)/g;
    let match;

    function convertToDegrees(value) {
        if (typeof value === 'string') {
            if (value.includes('rad')) {
                return parseFloat(value) * (180 / Math.PI);
            } else if (value.includes('turn')) {
                return parseFloat(value) * 360;
            }
        }
        return parseFloat(value);
    }

    while ((match = regex.exec(transformString)) !== null) {
        let name = match[1];
        let values = match[2].split(/,\s*/).map(v => convertToDegrees(v));

        switch (name) {

            case 'translate':
                transformOptions.transforms.push({ translate: [values[0] || 0, values[1] || 0] });
                break;
            case 'translateX':
                transformOptions.transforms.push({ translate: [values[0] || 0, 0, 0] });
                break;

            case 'translateY':
                transformOptions.transforms.push({ translate: [0, values[0] || 0, 0] });
                break;
            case 'scale':
                transformOptions.transforms.push({ scale: [values[0] || 0, values[1] || 0] });
                break;
            case 'skew':
                transformOptions.transforms.push({ skew: [values[0] || 0, values[1] || 0] });
                break;

            case 'skewX':
                transformOptions.transforms.push({ skew: [values[0] || 0, 0] });
                break;

            case 'skewY':
                transformOptions.transforms.push({ skew: [0, values[0] || 0] });
                break;
            case 'rotate':
                transformOptions.transforms.push({ rotate: [0, 0, values[0] || 0] });
                break;
            case 'matrix':
                transformOptions.transforms.push({ matrix: values });
                break;
        }
    }

    // Extract transform-origin, perspective-origin, and perspective if included as separate properties
    let styleProperties = transformString.split(/;\s*/);
    styleProperties.forEach(prop => {
        let [key, value] = prop.split(':').map(s => s.trim());
        if (key === 'transform-origin' || key === 'perspective-origin') {
            let [x, y] = value.split(/\s+/).map(parseFloat);
            if (key === 'transform-origin') {
                transformOptions.transformOrigin = { x: x || 0, y: y || 0 };
            } else {
                //transformOptions.perspectiveOrigin = { x: x || 0, y: y || 0 };
            }
        } else if (key === 'perspective') {
            //transformOptions.perspective = parseFloat(value) || 0;
        }
    });

    return transformOptions;
}



/**
 * wrapper function to switch between
 * 2D or 3D matrix
 */
export function getMatrix({
    transforms = [],
    transformOrigin = { x: 0, y: 0 },
} = {}) {

    //console.log('getMatrix', transformOrigin, transforms);
    let matrix = getMatrix2D(transforms, transformOrigin);

    //console.log('is3d', is3d,force3D , matrix);
    return matrix
}



export function getMatrix2D(transformations = [], origin = { x: 0, y: 0 }) {

    //console.log('getMatrix2D', transformations, origin);

    // Helper function to multiply two 2D matrices
    const multiply = (m1, m2) => ({
        a: m1.a * m2.a + m1.c * m2.b,
        b: m1.b * m2.a + m1.d * m2.b,
        c: m1.a * m2.c + m1.c * m2.d,
        d: m1.b * m2.c + m1.d * m2.d,
        e: m1.a * m2.e + m1.c * m2.f + m1.e,
        f: m1.b * m2.e + m1.d * m2.f + m1.f
    });

    // Helper function to create a translation matrix
    const translationMatrix = (x, y) => ({
        a: 1, b: 0, c: 0, d: 1, e: x, f: y
    });

    // Helper function to create a scaling matrix
    const scalingMatrix = (x, y) => ({
        a: x, b: 0, c: 0, d: y, e: 0, f: 0
    });


    // get skew or rotation axis matrix
    const angleMatrix = (angles, type) => {
        const toRad = (angle) => angle * Math.PI / 180;
        let [angleX, angleY] = angles.map(ang => { return toRad(ang) })
        let m = {}

        if (type === 'rot') {
            let cos = Math.cos(angleX), sin = Math.sin(angleX);
            m = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
        } else if (type === 'skew') {
            let tanX = Math.tan(angleX), tanY = Math.tan(angleY);
            m = {
                a: 1, b: tanY, c: tanX, d: 1, e: 0, f: 0
            };
        }
        return m
    };


    // Start with an identity matrix
    let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };


    // Apply transform origin: translate to origin, apply transformations, translate back
    if (origin.x !== 0 || origin.y !== 0) {
        matrix = multiply(matrix, translationMatrix(origin.x, origin.y));
    }

    // Default values for transformations
    const defaults = {
        translate: [0, 0],
        scale: [1, 1],
        skew: [0, 0],
        rotate: [0],
        matrix: [1, 0, 0, 1, 0, 0]
    };


    // Process transformations in the provided order (right-to-left)
    for (const transform of transformations) {
        const type = Object.keys(transform)[0]; // Get the transformation type (e.g., "translate")
        const values = transform[type] || defaults[type]; // Use default values if none provided

        // Destructure values with fallbacks
        let [x, y = defaults[type][1]] = values

        // Z-rotate as  2d rotation
        if (type === 'rotate' && values.length === 3) {
            x = values[2]
        }

        switch (type) {
            case "matrix":
                let keys = ['a', 'b', 'c', 'd', 'e', 'f'];
                let obj = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
                matrix = multiply(matrix, obj);
                break;
            case "translate":
                if (x || y) matrix = multiply(matrix, translationMatrix(x, y));
                break;
            case "skew":
                if (x || y) matrix = multiply(matrix, angleMatrix([x, y], 'skew'));
                break;
            case "rotate":
                if (x) matrix = multiply(matrix, angleMatrix([x], 'rot'));
                break;
            case "scale":
                if (x !== 1 || y !== 1) matrix = multiply(matrix, scalingMatrix(x, y));
                break;

            default:
                throw new Error(`Unknown transformation type: ${type}`);
        }
    }

    // Revert transform origin
    if (origin.x !== 0 || origin.y !== 0) {
        matrix = multiply(matrix, translationMatrix(-origin.x, -origin.y));
    }

    //console.log('matrix2D', matrix);
    return matrix;
}






export function getCSSTransform({
    transforms = [],
    transFormOrigin = { x: 0, y: 0 },
    perspectiveOrigin = { x: 0, y: 0 },
    perspective = 100
} = {}) {
    let css = [];

    //check if 3d or 2D
    let is3d = transforms.filter(trans => {
        let key = Object.keys(trans)[0];
        let vals = Object.values(trans)[0];
        return (key !== 'matrix' && vals.length > 2) || (key === 'matrix' && vals.length === 16)
    }).length > 0;


    let unit = 'px';
    transforms.forEach(t => {
        let prop = Object.keys(t)[0]
        let vals = Object.values(t)[0]

        //add units
        unit = prop === 'rotate' || prop === 'skew' ? 'deg' : (prop === 'scale' || prop === 'matrix' ? '' : 'px');
        let valsN = vals.map((val, v) => {
            return val !== '' ? `${val}${unit}` : ''
        })

        if (is3d) {
            let x, y, z;
            if (prop === 'translate') {
                [x, y = '0px', z = '0px'] = valsN
            } else {
                [x, y = '0deg', z = '0deg'] = valsN
            }

            if (prop === 'matrix') {
                css.push(`${prop}3d(${valsN.join(',')})`)
            }
            else if (prop === 'skew') {
                css.push(`${prop}X(${x}) ${prop}Y(${y})`)
            } else {
                css.push(`${prop}X(${x}) ${prop}Y(${y}) ${prop}Z(${z})`)
            }
        }
        else {
            css.push(`${prop}(${valsN.join(', ')})`)
        }

    })

    let cssParent = `perspective-origin:${perspectiveOrigin.x}px ${perspectiveOrigin.y}px; perspective:${perspective}px;`;

    css = `transform:${css.join(' ')};transform-origin:${transFormOrigin.x}px ${transFormOrigin.y}px;`;
    return {el:css, parent:cssParent}

}