import { addClosePathLineto } from "./pathData_reorder";

/**
 * reverse pathdata
 * make sure all command coordinates are absolute and
 * shorthands are converted to long notation
 */
export function reversePathData(pathData, {
    arcToCubic = false,
    quadraticToCubic = false,
    toClockwise = false,
    returnD = false
} = {}) {


    /**
     * Add closing lineto:
     * needed for path reversing or adding points
     */
    const addClosePathLineto = (pathData) => {
        let closed = pathData[pathData.length - 1].type.toLowerCase() === "z";
        let M = pathData[0];
        let [x0, y0] = [M.values[0], M.values[1]];
        let lastCom = closed ? pathData[pathData.length - 2] : pathData[pathData.length - 1];
        let [xE, yE] = [lastCom.values[lastCom.values.length - 2], lastCom.values[lastCom.values.length - 1]];

        if (closed && (x0 != xE || y0 != yE)) {

            pathData.pop();
            pathData.push(
                {
                    type: "L",
                    values: [x0, y0]
                },
                {
                    type: "Z",
                    values: []
                }
            );
        }
        return pathData;
    }

    // helper to rearrange control points for all command types
    const reverseControlPoints = (type, values) => {
        let controlPoints = [];
        let endPoints = [];
        if (type !== "A") {
            for (let p = 0; p < values.length; p += 2) {
                controlPoints.push([values[p], values[p + 1]]);
            }
            endPoints = controlPoints.pop();
            controlPoints.reverse();
        }
        // is arc
        else {
            //reverse sweep;
            let sweep = values[4] == 0 ? 1 : 0;
            controlPoints = [values[0], values[1], values[2], values[3], sweep];
            endPoints = [values[5], values[6]];
        }
        return { controlPoints, endPoints };
    };


    // start compiling new path data
    let pathDataNew = [];

    let closed =
        pathData[pathData.length - 1].type.toLowerCase() === "z" ? true : false;
    if (closed) {
        // add lineto closing space between Z and M
        pathData = addClosePathLineto(pathData);
        // remove Z closepath
        pathData.pop();
    }

    // define last point as new M if path isn't closed
    let valuesLast = pathData[pathData.length - 1].values;
    let valuesLastL = valuesLast.length;
    let M = closed
        ? pathData[0]
        : {
            type: "M",
            values: [valuesLast[valuesLastL - 2], valuesLast[valuesLastL - 1]]
        };
    // starting M stays the same – unless the path is not closed
    pathDataNew.push(M);

    // reverse path data command order for processing
    pathData.reverse();
    for (let i = 1; i < pathData.length; i++) {
        let com = pathData[i];
        let type = com.type;
        let values = com.values;
        let comPrev = pathData[i - 1];
        let typePrev = comPrev.type;
        let valuesPrev = comPrev.values;

        // get reversed control points and new end coordinates
        let controlPointsPrev = reverseControlPoints(typePrev, valuesPrev).controlPoints;
        let endPoints = reverseControlPoints(type, values).endPoints;

        // create new path data
        let newValues = [];
        newValues = [controlPointsPrev, endPoints].flat();
        pathDataNew.push({
            type: typePrev,
            values: newValues.flat()
        });
    }

    // add previously removed Z close path
    if (closed) {
        pathDataNew.push({
            type: "z",
            values: []
        });
    }


    return pathDataNew;
}