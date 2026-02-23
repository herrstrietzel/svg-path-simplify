import { splitSubpaths, addExtemesToCommand } from './pathData_split.js';
import { getComThresh, getPathDataVertices, getSquareDistance } from './geometry.js';
import { getPolyBBox } from './geometry_bbox.js';


import { renderPoint, renderPath } from './visualize.js';
import { getPolygonArea } from './geometry_area.js';
import { checkBezierFlatness, commandIsFlat } from "./geometry_flatness.js";



export function pathDataToTopLeft(pathData) {

    let len = pathData.length;
    let isClosed = pathData[len - 1].type.toLowerCase() === 'z'

    //return pathData;

    // we can't change starting point for non closed paths
    if (!isClosed) {
        return pathData
    }

    let newIndex = 0;

    //get top most index
    let indices = [];
    for (let i = 0; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valsLen = values.length
        if (valsLen) {
            let p = { type: type, x: values[valsLen-2], y: values[valsLen-1], index: 0}
            p.index = i
            indices.push(p)
        }
    }

    // reorder  to top left most
    //|| a.x - b.x
    indices = indices.sort((a, b) => +a.y.toFixed(8) - +b.y.toFixed(8) || a.x-b.x );
    newIndex = indices[0].index

    return  newIndex ? shiftSvgStartingPoint(pathData, newIndex) : pathData;
}




export function optimizeClosePath(pathData, {removeFinalLineto = true, autoClose = true}={}) {

    let pathDataNew = [];
    let l = pathData.length;
    let M = { x: +pathData[0].values[0].toFixed(8), y: +pathData[0].values[1].toFixed(8) }
    let isClosed = pathData[l - 1].type.toLowerCase() === 'z'

    let linetos = pathData.filter(com => com.type === 'L')


    // check if order is ideal
    let idxPenultimate = isClosed ? l-2 : l-1

    let penultimateCom = pathData[idxPenultimate];
    let penultimateType = penultimateCom.type;
    let penultimateComCoords = penultimateCom.values.slice(-2).map(val => +val.toFixed(8))

    // last L command ends at M 
    let isClosingCommand = penultimateComCoords[0] === M.x && penultimateComCoords[1] === M.y

    // add closepath Z to enable order optimizations
    if(!isClosed && autoClose && isClosingCommand){

        /*
        // adjust final coords
        let valsLast = pathData[idxPenultimate].values
        let valsLastLen = valsLast.length;
        pathData[idxPenultimate].values[valsLastLen-2] = M.x
        pathData[idxPenultimate].values[valsLastLen-1] = M.y
        */
        
        pathData.push({type:'Z', values:[]})
        isClosed = true;
        l++
    }

    // if last segment is not closing or a lineto
    let skipReorder = pathData[1].type !== 'L' && (!isClosingCommand || penultimateCom.type === 'L')
    skipReorder = false


    // we can't change starting point for non closed paths
    if (!isClosed) {
        return pathData
    }

    let newIndex = 0;

    if (!skipReorder) {
        //get top most index
        let indices = [];
        for (let i = 0; i < l; i++) {
            let com = pathData[i];
            let { type, values } = com;
            if (values.length) {
                let valsL = values.slice(-2)
                let prevL = pathData[i - 1] && pathData[i - 1].type === 'L';
                let nextL = pathData[i + 1] && pathData[i + 1].type === 'L';
                let prevCom = pathData[i - 1] ? pathData[i - 1].type.toUpperCase() : null;
                let nextCom = pathData[i + 1] ? pathData[i + 1].type.toUpperCase() : null;
                let p = { type: type, x: valsL[0], y: valsL[1], dist: 0, index: 0, prevL, nextL, prevCom, nextCom }
                p.index = i
                indices.push(p)
            }
        }

        //console.log('indices', indices);


        // find top most lineto

        if (linetos.length) {
            let curveAfterLine = indices.filter(com => (com.type !== 'L' && com.type !== 'M') && com.prevCom &&
                com.prevCom === 'L' || com.prevCom === 'M' && penultimateType === 'L').sort((a, b) => a.y - b.y || a.x - b.x)[0]

            newIndex = curveAfterLine ? curveAfterLine.index - 1 : 0

        }
        // use top most command
        else {
            indices = indices.sort((a, b) => +a.y.toFixed(8) - +b.y.toFixed(8) || a.x - b.x);
            newIndex = indices[0].index
        }

        // reorder 
        pathData = newIndex ? shiftSvgStartingPoint(pathData, newIndex) : pathData
    }


    M = { x: +pathData[0].values[0].toFixed(8), y: +pathData[0].values[1].toFixed(8) }

    l = pathData.length

    // remove last lineto
    penultimateCom = pathData[l - 2];
    penultimateType = penultimateCom.type;
    penultimateComCoords = penultimateCom.values.slice(-2).map(val=>+val.toFixed(8))

    isClosingCommand = penultimateType === 'L' && penultimateComCoords[0] === M.x && penultimateComCoords[1] === M.y

    //console.log('penultimateCom', isClosingCommand, penultimateCom.values, M);

    if (removeFinalLineto && isClosingCommand) {
        pathData.splice(l - 2, 1)
    }

    pathDataNew.push(...pathData);

    return pathDataNew
}



/**
 * shift starting point
 */
export function shiftSvgStartingPoint(pathData, offset) {
    let pathDataL = pathData.length;
    let newStartIndex = 0;
    let lastCommand = pathData[pathDataL - 1]["type"];
    let isClosed = lastCommand.toLowerCase() === "z";

    if (!isClosed || offset < 1 || pathData.length < 3) {
        return pathData;
    }

    //exclude Z/z (closepath) command if present
    let trimRight = isClosed ? 1 : 0;


    // add explicit lineto
    addClosePathLineto(pathData)


    // M start offset
    newStartIndex =
        offset + 1 < pathData.length - 1
            ? offset + 1
            : pathData.length - 1 - trimRight;

    // slice array to reorder
    let pathDataStart = pathData.slice(newStartIndex);
    let pathDataEnd = pathData.slice(0, newStartIndex);

    // remove original M
    pathDataEnd.shift();
    let pathDataEndL = pathDataEnd.length;

    let pathDataEndLastValues, pathDataEndLastXY;
    pathDataEndLastValues = pathDataEnd[pathDataEndL - 1].values || [];
    pathDataEndLastXY = [
        pathDataEndLastValues[pathDataEndLastValues.length - 2],
        pathDataEndLastValues[pathDataEndLastValues.length - 1]
    ];


    //remove z(close path) from original pathdata array
    if (trimRight) {
        pathDataStart.pop();
        pathDataEnd.push({
            type: "Z",
            values: []
        });
    }
    // prepend new M command and concatenate array chunks
    pathData = [
        {
            type: "M",
            values: pathDataEndLastXY
        },
        ...pathDataStart,
        ...pathDataEnd,
    ]


    return pathData;
}



/**
 * Add closing lineto:
 * needed for path reversing or adding points
 */

export function addClosePathLineto(pathData) {

    let pathDataL = pathData.length;
    let closed = pathData[pathDataL - 1].type.toLowerCase() === "z" ? true : false;

    let M = pathData[0];
    let [x0, y0] = [M.values[0], M.values[1]].map(val => { return +val.toFixed(8) });
    let comLast = closed ? pathData[pathDataL - 2] : pathData[pathDataL - 1];
    let comLastL = comLast.values.length;

    // last explicit on-path coordinates
    let [xL, yL] = [comLast.values[comLastL - 2], comLast.values[comLastL - 1]].map(val => { return +val.toFixed(8) });

    if (closed && (x0 != xL || y0 != yL)) {

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


