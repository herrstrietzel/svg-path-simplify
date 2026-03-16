import { svgArcToCenterParam } from "./geometry";

/**
 * scale pathData
 */
export function transformPathData(pathData, matrix) {

    // new pathdata
    let pathDataTrans = [];

    // transform point by 2d matrix
    const transformPoint = (pt, matrix) => {
        let { a, b, c, d, e, f } = matrix;
        let { x, y } = pt;
        return { x: a * x + c * y + e, y: b * x + d * y + f };
    }

    //normalize matrix notations object, array or css matrix string
    const normalizeMatrix = (matrix) => {
        matrix =
            typeof matrix === "string"
                ? (matrix = matrix
                    .replace(/^matrix\(|\)$/g, "")
                    .split(",")
                    .map(Number))
                : matrix;
        matrix = !Array.isArray(matrix)
            ? {
                a: matrix.a,
                b: matrix.b,
                c: matrix.c,
                d: matrix.d,
                e: matrix.e,
                f: matrix.f
            }
            : {
                a: matrix[0],
                b: matrix[1],
                c: matrix[2],
                d: matrix[3],
                e: matrix[4],
                f: matrix[5]
            };
        return matrix;
    }


    const transformArc = (p0, values, matrix) => {
        let [rx, ry, angle, largeArc, sweep, x, y] = values;

        /**
        * parametrize arc command 
        * to get the actual arc params
        */
        let arcData = svgArcToCenterParam(
            p0.x,
            p0.y,
            values[0],
            values[1],
            angle,
            largeArc,
            sweep,
            x,
            y
        );
        ({ rx, ry } = arcData);
        let { a, b, c, d, e, f } = matrix;

        let ellipsetr = transformEllipse(rx, ry, angle, matrix);
        let p = transformPoint({ x: x, y: y }, matrix);


        // adjust sweep if flipped
        let denom = a * a + b * b;
        let scaleX = Math.sqrt(denom)
        let scaleY = (a * d - c * b) / scaleX

        let flipX = scaleX < 0 ? true : false;
        let flipY = scaleY < 0 ? true : false;


        // adjust sweep
        if (flipX || flipY) {
            sweep = sweep === 0 ? 1 : 0;
        }

        return {
            type: 'A',
            values: [
                ellipsetr.rx,
                ellipsetr.ry,
                ellipsetr.ax,
                largeArc,
                sweep,
                p.x,
                p.y]
        };
    }

    // normalize matrix input
    matrix = normalizeMatrix(matrix);

    let matrixStr = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
        .map((val) => {
            return +val.toFixed(1);
        })
        .join("");

    // no transform: quit
    if (matrixStr === "100100") {
        //console.log("no transform");
        return pathData;
    }


    pathData.forEach((com, i) => {
        let { type, values } = com;
        let typeRel = type.toLowerCase();
        let comPrev = i > 0 ? pathData[i - 1] : pathData[i];
        let comPrevValues = comPrev.values;
        let comPrevValuesL = comPrevValues.length;
        let p0 = {
            x: comPrevValues[comPrevValuesL - 2],
            y: comPrevValues[comPrevValuesL - 1]
        };
        let p = { x: values[values.length - 2], y: values[values.length - 1] };
        let comT = { type: type, values: [] };

        switch (typeRel) {
            case "a":
                comT = transformArc(p0, values, matrix)
                break;

            default:
                // all other point based commands
                if (values.length) {
                    for (let i = 0; i < values.length; i += 2) {
                        let ptTrans = transformPoint(
                            { x: com.values[i], y: com.values[i + 1] },
                            matrix
                        );

                        comT.values[i] = ptTrans.x;
                        comT.values[i + 1] = ptTrans.y;
                    }
                }
        }

        pathDataTrans.push(comT);
    });


    //console.log('pathDataTrans', pathDataTrans);

    return pathDataTrans;
}






/**
 * Based on: https://github.com/fontello/svgpath/blob/master/lib/ellipse.js
 * and fork: https://github.com/kpym/SVGPathy/blob/master/lib/ellipse.js
 */

function transformEllipse(rx, ry, ax, matrix) {
    const torad = Math.PI / 180;
    const epsilon = 1e-7;

    //normalize matrix object or array notations
    matrix = !Array.isArray(matrix)
        ? matrix
        : {
            a: matrix[0],
            b: matrix[1],
            c: matrix[2],
            d: matrix[3],
            e: matrix[4],
            f: matrix[5]
        };

    // We consider the current ellipse as image of the unit circle
    // by first scale(rx,ry) and then rotate(ax) ...
    // So we apply ma =  m x rotate(ax) x scale(rx,ry) to the unit circle.
    let  c = Math.cos(ax * torad),
        s = Math.sin(ax * torad);
    let  ma = [
        rx * (matrix.a * c + matrix.c * s),
        rx * (matrix.b * c + matrix.d * s),
        ry * (-matrix.a * s + matrix.c * c),
        ry * (-matrix.b * s + matrix.d * c)
    ];

    // ma * transpose(ma) = [ J L ]
    //                      [ L K ]
    // L is calculated later (if the image is not a circle)
    let  J = ma[0] * ma[0] + ma[2] * ma[2],
        K = ma[1] * ma[1] + ma[3] * ma[3];

    // the sqrt of the discriminant of the characteristic polynomial of ma * transpose(ma)
    // this is also the geometric mean of the eigenvalues
    let  D = Math.sqrt(
        ((ma[0] - ma[3]) * (ma[0] - ma[3]) + (ma[2] + ma[1]) * (ma[2] + ma[1])) *
        ((ma[0] + ma[3]) * (ma[0] + ma[3]) + (ma[2] - ma[1]) * (ma[2] - ma[1]))
    );

    // the arithmetic mean of the eigenvalues
    let  JK = (J + K) / 2;

    // check if the image is (almost) a circle
    if (D <= epsilon) {
        rx = ry = Math.sqrt(JK);
        ax = 0;
        return { rx: rx, ry: ry, ax: ax };
    }

    // check if ma * transpose(ma) is (almost) diagonal
    if (Math.abs(D - Math.abs(J - K)) <= epsilon) {
        rx = Math.sqrt(J);
        ry = Math.sqrt(K);
        ax = 0;
        return { rx: rx, ry: ry, ax: ax };
    }

    // if it is not a circle, nor diagonal
    let  L = ma[0] * ma[1] + ma[2] * ma[3];

    // {l1,l2} = the two eigen values of ma * transpose(ma)
    let  l1 = JK + D / 2,
        l2 = JK - D / 2;

    // the x - axis - rotation angle is the argument of the l1 - eigenvector
    if (Math.abs(L) <= epsilon && Math.abs(l1 - K) <= epsilon) {
        // if (ax == 90) => ax = 0 and exchange axes
        ax = 0;
        rx = Math.sqrt(l2);
        ry = Math.sqrt(l1);
        return { rx: rx, ry: ry, ax: ax };
    }

    ax =
        Math.atan(Math.abs(L) > Math.abs(l1 - K) ? (l1 - J) / L : L / (l1 - K)) /
        torad; // the angle in degree

    // if ax > 0 => rx = sqrt(l1), ry = sqrt(l2), else exchange axes and ax += 90
    if (ax >= 0) {
        // if ax in [0,90]
        rx = Math.sqrt(l1);
        ry = Math.sqrt(l2);
    } else {
        // if ax in ]-90,0[ => exchange axes
        ax += 90;
        rx = Math.sqrt(l2);
        ry = Math.sqrt(l1);
    }

    return { rx: rx, ry: ry, ax: ax };
}





/**
 * scale pathData
 */

export function scalePathData(pathData, scaleX, scaleY) {
    pathData.forEach((com, i) => {
        let { type, values } = com;
        let typeRel = type.toLowerCase();

        switch (typeRel) {
            case "a":
                com.values = [
                    values[0] * scaleX,
                    values[1] * scaleY,
                    values[2],
                    values[3],
                    values[4],
                    values[5] * scaleX,
                    values[6] * scaleY
                ];
                break;

            case "h":
                com.values = [values[0] * scaleX];
                break;

            case "v":
                com.values = [values[0] * scaleY];
                break;

            default:
                if (values.length) {
                    for (let i = 0; i < values.length; i += 2) {
                        com.values[i] *=  scaleX;
                        com.values[i + 1] *= scaleY;
                    }
                }
        }

    });
    return pathData;
}