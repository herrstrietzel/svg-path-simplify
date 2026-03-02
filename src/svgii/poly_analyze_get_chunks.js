
// split in chunks based on significant points

import { pathDataToD } from "./pathData_stringify";
import { renderPath } from "./visualize";


export function getPolyChunks(pts,
    { closed = true,
        keepCorners = true,
        keepExtremes = true,
        keepInflections = false
    } = {}
) {
    let chunks = [[pts[0]]];
    //let chunk = [pts[0]];
    let idx = 0
    let lastChunk = chunks[idx]

    let l = pts.length

    // render
    for (let i = 1; i < l; i++) {
        let p0 = i > 0 ? pts[i] : pts[l - 1];
        let p1 = pts[i];
        let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

        // start new chunk
        // keepInflections && p1.isDirChange
        if ((keepExtremes && p1.isExtreme || keepCorners && p1.isCorner )) {
            idx++
            chunks.push([])
        }


        lastChunk = chunks[idx]
        lastChunk.push(p1)
    }

    // test render
    //renderchunks(chunks)

    return chunks;
}



function renderchunks(chunks) {

    chunks.forEach((chunk, i) => {

        let stroke = i % 2 === 0 ? 'orange' : 'blue';
        let pathData = [{ type: 'M', values: [chunk[0].x, chunk[0].y] }]
        let d = `M`

        chunk.forEach(pt => {

            pathData.push({ type: 'L', values: [pt.x, pt.y] })
            d += ` ${[pt.x, pt.y].join(' ')}`

        })

        d = pathDataToD(pathData)
        renderPath(markers, d, stroke, '2%', '0.5')
    })

}