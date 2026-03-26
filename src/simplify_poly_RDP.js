import { reducePoints } from "./svgii/geometry";
import { getPolyBBox } from "./svgii/geometry_bbox";
import { renderPoint } from "./svgii/visualize";



export function simplifyRDP_rel(pts, quality = 0.9, width = 0, height = 0) {

    /**
     * switch between absolute or 
     * quality based relative thresholds
     */
    let isAbsolute = false;

    if (typeof quality === 'string') {
        isAbsolute = true;
        quality = parseFloat(quality);
    }

    if (pts.length < 4 ) return pts;

    // convert quality to squaredistance tolerance
    let tolerance = quality;
    //console.log('simplifyRDP', tolerance);

    if (!isAbsolute) {
        
        //tolerance = 1 - quality;
        tolerance = quality;

        // adjust for higher qualities
        if (quality > 0.5) tolerance /= 2;

        /**
         * approximate dimensions
         * adjust tolerance for 
         * very small polygons e.g geodata
         */
        if (!width && !height) {
            let polyS = reducePoints(pts, 12);
            ({ width, height } = getPolyBBox(polyS));
        }

        // average side lengths
        let dimAvg = (width + height) / 2;
        let scale = dimAvg / 100;
        tolerance = (tolerance * (scale)) ** 2

        console.log('!!!tolerance', tolerance);


    }


    // Square distance from point to segment
    const segmentSquareDistance = (p, p1, p2) => {
        let x = p1.x, y = p1.y;
        let dx = p2.x - x, dy = p2.y - y;

        if (dx !== 0 || dy !== 0) {
            let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        return (p.x - x) ** 2 + (p.y - y) ** 2;
    };


    // start collecting ptsSmp polyline
    let ptsSmp = [pts[0]];

    // create processing stack
    let stack = [];
    stack.push([0, pts.length - 1]);

    while (stack.length > 0) {
        let [first, last] = stack.pop();
        let maxDist = tolerance;
        let index = -1;

        // Find point with maximum distance
        for (let i = first + 1; i < last; i++) {
            let currentDist = segmentSquareDistance(pts[i], pts[first], pts[last]);
            if (currentDist > maxDist) {
                index = i;
                maxDist = currentDist;
            }
        }

        // If max distance > tolerance, split and process
        if (maxDist > tolerance) {
            stack.push([index, last]);
            stack.push([first, index]);
        } else {
            ptsSmp.push(pts[last]);
        }

    }

    return ptsSmp;
}





export function simplifyPolyRDP(pts, {quality = 0.9, width = 0, height = 0}={}) {

    /**
     * switch between absolute or 
     * quality based relative thresholds
     */
    let isAbsolute = false;

    if (typeof quality === 'string') {
        isAbsolute = true;
        quality = parseFloat(quality);
    }

    //|| (!isAbsolute && quality) >= 1
    if (pts.length < 4 ) return pts;

    // convert quality to squaredistance tolerance
    let tolerance = quality;
    //console.log('simplifyRDP', tolerance);

    if (!isAbsolute) {
        
        tolerance = 1 - quality;

        // adjust for higher qualities
        if (quality > 0.5) tolerance /= 2;

        /**
         * approximate dimensions
         * adjust tolerance for 
         * very small polygons e.g geodata
         */
        if (!width && !height) {
            let polyS = reducePoints(pts, 12);
            ({ width, height } = getPolyBBox(polyS));
        }

        // average side lengths
        let dimAvg = (width + height) / 2;
        let scale = dimAvg / 100;
        tolerance = (tolerance * (scale)) ** 2
    }


    // Square distance from point to segment
    const segmentSquareDistance = (p, p1, p2) => {
        let x = p1.x, y = p1.y;
        let dx = p2.x - x, dy = p2.y - y;

        if (dx !== 0 || dy !== 0) {
            let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        return (p.x - x) ** 2 + (p.y - y) ** 2;
    };


    // start collecting ptsSmp polyline
    let ptsSmp = [pts[0]];

    // create processing stack
    let stack = [];
    stack.push([0, pts.length - 1]);

    while (stack.length > 0) {
        let [first, last] = stack.pop();
        let maxDist = tolerance;
        let index = -1;

        // Find point with maximum distance
        for (let i = first + 1; i < last; i++) {
            let currentDist = segmentSquareDistance(pts[i], pts[first], pts[last]);
            if (currentDist > maxDist) {
                index = i;
                maxDist = currentDist;
            }
        }

        // If max distance > tolerance, split and process
        if (maxDist > tolerance) {
            stack.push([index, last]);
            stack.push([first, index]);
        } else {
            ptsSmp.push(pts[last]);
        }

    }

    return ptsSmp;
}


export function simplifyPolyRDP__(pts, {
    quality = 0.9,
    width = 0,
    height = 0,
    absolute = false,
    // use square or manhattan distances
    manhattan = false,
    exclude = []
} = {}) {


    //console.log(exclude);

    let excludeSet = new Set(exclude);


    /**
     * switch between absolute or 
     * quality based relative thresholds
     */
    if (typeof quality === 'string') {
        absolute = true;
        quality = parseFloat(quality);
    }

    if(absolute && quality===0) return pts;

    if (pts.length < 4 || (!absolute && quality) >= 1) return pts;

    // convert quality to squaredistance or manhattan tolerance
    let tolerance = quality;

    if (!absolute) {

        tolerance = 1 - quality;

        // adjust for higher qualities
        if (quality > 0.5) tolerance /= 2;

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
            let scale = dimAvg / 100;
            tolerance = (tolerance * (scale)) ** 2
        } else {
            // use manhattan
            tolerance = (width + height) * 0.003 * (1 - quality)
        }

    }


    const segmentDistance = (p, p1, p2, manhattan = false) => {
        let x = p1.x, y = p1.y;
        let dx = p2.x - x, dy = p2.y - y;

        if (dx !== 0 || dy !== 0) {
            let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        // use manhattan or square distance
        return !manhattan ? (p.x - x) ** 2 + (p.y - y) ** 2 : Math.abs(p.x - x) + Math.abs(p.y - y);
    };


    // start collecting ptsSmp polyline
    let ptsSmp = [pts[0]];

    // create processing stack
    let stack = [];
    stack.push([0, pts.length - 1]);

    let maxDist = tolerance;
    let currentDist = 0;
    let index = -1;
    let lenExclude = exclude.length;

    while (stack.length > 0) {
        let [first, last] = stack.pop();
        maxDist = tolerance;
        index = -1;
    
        // Check if there is an excluded point inside this segment
        let forcedIndex = -1;
        for (let i = first + 1; i < last; i++) {
            if (excludeSet.has(i)) {
                forcedIndex = i;
                break;
            }
        }
    
        if (forcedIndex !== -1) {
            // Force split at excluded point
            stack.push([forcedIndex, last], [first, forcedIndex]);
            continue;
        }
    
        //  Normal RDP distance check
        for (let i = first + 1; i < last; i++) {
            currentDist = segmentDistance(
                pts[i],
                pts[first],
                pts[last],
                manhattan
            );
    
            if (currentDist > maxDist) {
                index = i;
                maxDist = currentDist;
            }
        }
    
        if (maxDist > tolerance) {
            stack.push([index, last], [first, index]);
        } else {
            ptsSmp.push(pts[last]);
        }
    }
    


    return ptsSmp;
}


