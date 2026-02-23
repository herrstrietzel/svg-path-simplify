
/**
 * radialDistance simplification
 * sloppy but fast
 */

import { getDistManhattan, getSquareDistance, reducePoints } from "./svgii/geometry";
import { getPolyBBox } from "./svgii/geometry_bbox";
import { renderPoint } from "./svgii/visualize";

export function simplifyRD(pts, {
    quality = 0.9,
    width = 0,
    height = 0,
    absolute = false,
    // use square or manhattan distances
    manhattan = false,
    exclude = []
} = {}) {

    /**
     * switch between absolute or 
     * quality based relative thresholds
     */

    if (typeof quality === 'string') {
        let value = parseFloat(quality);
        absolute = true;
        quality = value;
    }

    // nothing to do - exit
    if (pts.length < 4 || (!absolute && quality) >= 1) return pts;


    // convert quality to squaredistance tolerance
    let tolerance = quality;

    if (!absolute) {

        // quality to tolerance
        tolerance = 1 - quality;

        /**
         * approximate dimensions
         * adjust tolerance for 
         * very small polygons e.g geodata
         */

        if (!width && !height) {
            let polyS = reducePoints(pts, 12);
            ({ width, height } = getPolyBBox(polyS));
        }

        if (!manhattan) {
            // average side lengths
            let dimAvg = (width + height) / 2;
            let scale = dimAvg / 25;
            tolerance = (tolerance * (scale)) ** 2
        } else {
            // use manhattan
            tolerance = (width + height) * 0.05 * (1 - quality)
        }

    }

    let p0 = pts[0];
    let pt;

    // new simplified point array
    let ptsSmp = [p0];
    let l = pts.length
    let lenExclude = exclude.length;
    let dist = 0

    for (let i = 1; i < l; i++) {
        pt = pts[i];

        // skip
        dist = manhattan ? getDistManhattan(p0, pt) : getSquareDistance(p0, pt);

        if ( dist < tolerance && (!lenExclude || !exclude.includes(i)) ) {
            p0 = pt;
            continue
        }

        ptsSmp.push(pt);
        p0 = pt;

    }

    // add last point - if not coinciding with first point
    if (p0.x !== pt.x && p0.y !== pt.y) {
        ptsSmp.push(pt);
    }

    //console.log('ptsSmp', ptsSmp, l);
    return ptsSmp;

}