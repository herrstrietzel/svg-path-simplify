import { checkLineIntersection, getDistManhattan, pointAtT } from "./geometry";
import { pathDataToD } from "./pathData_stringify";
import { renderPath, renderPoint } from "./visualize";

export function redrawPathData(pathData, {
    tolerance = 1

} = {}) {

    let pathDataN = [];
    let chunks = [];
    let chunk = [];
    let idx = 0;


    let l = pathData.length;
    //return pathData

    //console.log('pathData', pathData);

    //let d0 = pathDataToD(pathData)
    //console.log(d0);

    for (let i = 1; i < l; i++) {
        let com = pathData[i];
        let { type, values, p0, cp1 = null, cp2 = null, p, extreme = null, semiExtreme = null, corner = null, directionChange } = com;

        let comN = pathData[i + 1] || null;

        /*
        if (extreme || corner || semiExtreme || directionChange) {

            if (extreme) renderPoint(markers, com.p, 'cyan', '1%', '0.5')
            //if(directionChange) renderPoint(markers, com.p, 'blue', '1.75%', '0.5')
            if (semiExtreme) renderPoint(markers, com.p, 'orange', '1%', '0.5')
            if (corner) renderPoint(markers, com.p, 'magenta', '1.75%', '0.5')
        }
        */


        //start new chunk
        if (extreme || corner || (comN && comN.type !== type)) {
            chunk.push(com)
            chunks.push(chunk)
            chunk = []
            continue
        }

        chunk.push(com)

    }

    console.log('!!!chunks', chunks);

    renderChunks(chunks)



    // cleanup chunks
    //let chunksClean = [];

    let chunksLen = chunks.length;

    


    for (let c = 0; c < chunksLen; c++) {
        let chunk = chunks[c];
        let chunkN = chunks[c + 1] || null;

        let chunkLen = chunk.length;

        if(c===chunksLen-1){
           // renderPoint(markers, chunk[chunkLen-1].p, 'magenta', '0.5%', '0.5')
        }

        if (chunkLen === 1 && chunkN && chunkN[0].type === 'C') {
            //renderPoint(markers, chunk[0].p, 'red', '0.5%', '0.5')
            //renderPoint(markers, chunkN[0].cp1, 'magenta', '0.5%', '0.5')
            //chunkN[0].p0 = chunk[0].p0
            //chunks[c] = null
        }

        //chunksClean.push(chunk)
    }

    chunks = chunks.filter(Boolean)

    // test render
    //renderChunks(chunks)




    let pathDataC = [pathData[0]];
    let stroke = 'green';


    /**
     * combine chunk based
     */
    for (let c = 0; c < chunks.length; c++) {
        let chunk = chunks[c]
        let chunkLen = chunk.length;

        stroke = c % 2 === 0 ? 'orange' : 'green';
        let comChunk0 = chunk[0]
        let comChunk1 = chunk[chunkLen - 1]
        let thresh = getDistManhattan(comChunk0.p0, comChunk1.p) * 0.05


        // commands in chunk
        for (let i = 0, l = chunkLen; i < l; i++) {
            let com = chunk[i];
            let comN = chunk[i + 1];
            let comL = chunk[l - 1];

            let isBezier = comChunk0.type === 'C' && comChunk1.type === 'C'

            //console.log(com);
            let { type, values, p0, cp1 = null, cp2 = null, p = null, extreme, semiExtreme = null, corner = null } = com;

            let pI1 = null, pI2 = null;
            let cp1_S = null, cp2_S = null;
            let cp2_M = null;
            let cp1_M = null;
            let pathDataS = [];
            let tSplit = 0.666
            let comMid = null;

            // 0. adjust Extreme cpts
            if (isBezier) {
                let dx1 = Math.abs(comChunk0.p0.x - comChunk0.cp1.x)
                let dy1 = Math.abs(comChunk0.p0.y - comChunk0.cp1.y)
                let dx2 = Math.abs(comChunk1.p.x - comChunk1.cp2.x)
                let dy2 = Math.abs(comChunk1.p.y - comChunk1.cp2.y)


                let vertical1 = dx1 < thresh && dx1 < dy1;
                let horizontal1 = dy1 < thresh && dx1 > dy1;

                let vertical2 = dx2 < thresh && dx2 < dy2;
                let horizontal2 = dy2 < thresh && dx2 > dy2;

                if (horizontal1) comChunk0.cp1.y = comChunk0.p0.y
                if (horizontal2) comChunk1.cp2.y = comChunk1.p.y
                if (vertical1) comChunk0.cp1.x = comChunk0.p0.x
                if (vertical2) comChunk1.cp2.x = comChunk1.p.x
            }


            // test render - original pathdata
            let pathDataChunk = [
                { type: 'M', values: [com.p0.x, com.p0.y] },
                { type, values },
            ];


            let d = pathDataToD(pathDataChunk);
            // renderPath(markers, d, stroke, '1%', '0.5')
            //  continue
            /*

            */


            // 1. only one command in chunk - nothing to simplify
            if (chunkLen === 1 || type !== 'C') {
                stroke = 'red'
                pathDataC.push(com)
            }



            // 2. could be simplified
            else {
                // 2.1 has semi extreme - extrapolate
                // 2.2 has sdirection change
                let semiExtremes = chunk.filter(ch => ch.semiExtreme);
                let comsDirectionChange = chunk.filter(ch => ch.directionChange)


                if (semiExtremes.length || comsDirectionChange.length) {
                    stroke = c % 2 === 0 ? 'purple' : 'magenta';

                    // semiExtreme command
                    comMid = semiExtremes.length ? semiExtremes[0] : comsDirectionChange[0];

                    // zero length cpt vectors
                    if (comChunk0.p0.x === comChunk0.cp1.x && comChunk0.p0.y === comChunk0.cp1.y) {
                        comChunk0.cp1 = pointAtT([comChunk0.p0, comChunk0.cp1, comChunk0.cp2, comChunk0.p], 0.5)
                    }
                    else if (comChunk1.p.x === comChunk1.cp2.x && comChunk1.p.y === comChunk1.cp2.y) {
                        comChunk1.cp2 = pointAtT([comChunk1.p0, comChunk1.cp1, comChunk1.cp2, comChunk1.p], 0.5)
                    }


                    pI1 = checkLineIntersection(comMid.p, comMid.cp2, comChunk0.p0, comChunk0.cp1, false)
                    pI2 = checkLineIntersection(comMid.p, comMid.cp2, comChunk1.p, comChunk1.cp2, false)


                    // intersections try to extrapolate cpts
                    if (pI1 && pI2) {

                        cp1_S = pointAtT([comChunk0.p0, pI1], tSplit)
                        cp2_S = pointAtT([comChunk1.p, pI2], tSplit)

                        cp2_M = pointAtT([comMid.p, pI1], tSplit)
                        cp1_M = pointAtT([comMid.p, pI2], tSplit)

                        /*
                        renderPoint(markers, cp1_S, 'magenta', '1%', '1' )
                        */

                        pathDataS = [
                            { type: 'M', values: [comChunk0.p0.x, comChunk0.p0.y] },
                            {
                                type: 'C', values: [
                                    cp1_S.x, cp1_S.y,
                                    cp2_M.x, cp2_M.y,
                                    comMid.p.x,
                                    comMid.p.y
                                ]
                            },
                            {
                                type: 'C', values: [
                                    cp1_M.x, cp1_M.y,
                                    cp2_S.x, cp2_S.y,
                                    comChunk1.p.x,
                                    comChunk1.p.y,
                                ]
                            },
                        ];

                        stroke = c % 2 === 0 ? 'green' : 'gold'
                        d = pathDataToD(pathDataS)

                        //renderPath(markers, d, 'green', '1%', '0.5')


                        pathDataC.push(
                            {
                                type: 'C', values: [
                                    cp1_S.x, cp1_S.y,
                                    cp2_M.x, cp2_M.y,
                                    comMid.p.x,
                                    comMid.p.y
                                ],
                                p0: comChunk0.p0,
                                cp1: cp1_S,
                                cp2: cp2_M,
                                p: comMid.p,
                                dimA: getDistManhattan(comChunk0.p0, comMid.p)
                            },

                            {
                                type: 'C', values: [
                                    cp1_M.x, cp1_M.y,
                                    cp2_S.x, cp2_S.y,
                                    comChunk1.p.x,
                                    comChunk1.p.y,
                                ],
                                p0: comMid.p,
                                cp1: cp1_M,
                                cp2: cp2_S,
                                p: comChunk1.p,
                                extreme: true,
                                dimA: getDistManhattan(comMid.p, comChunk1.p)

                            }
                        )
                        break

                    }
                } else {
                    pathDataC.push(com)
                }

            }

        }

    }

    /*
    // render
    let d = pathDataToD(pathDataC)
    console.log(d);
    renderPath(markers, d, 'red', '1%', '0.5')
    */


    return pathDataC

}



function renderChunks(chunks) {

    console.log('chunks', chunks);

    let stroke = 'green';

    /**
     * combine chunk based
     */
    for (let c = 0; c < chunks.length; c++) {
        let chunk = chunks[c]
        let chunkLen = chunk.length;

        stroke = c % 2 === 0 ? 'orange' : 'green';
        let comChunk0 = chunk[0]
        let comChunk1 = chunk[chunkLen - 1]

        let pathDataChunk = [
            { type: 'M', values: [comChunk0.p0.x, comChunk0.p0.y] }
        ]

        // commands in chunk
        for (let i = 0, l = chunkLen; i < l; i++) {
            let com = chunk[i];
            let comN = chunk[i + 1];
            let comL = chunk[l - 1];
            let isBezier = comChunk0.type === 'C' && comChunk1.type === 'C'

            //console.log(com);
            let { type, values, p0, cp1 = null, cp2 = null, p = null, extreme, semiExtreme = null, corner = null } = com;


            // test render - original pathdata
            pathDataChunk.push(
                { type, values },
            );

        }

        let d = pathDataToD(pathDataChunk);
        renderPath(markers, d, stroke, '1%', '0.5')


    }
}
