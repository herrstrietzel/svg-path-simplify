import { getDistance, getDistManhattan } from "./geometry";

// Legendre Gauss weight and abscissa values
export const waArr_global = [];



export function getLength(pts, {
    t = 1,
    waArr = []
} = {}) {


    const cubicBezierLength = (p0, cp1, cp2, p, t = 0, wa = []) => {
        if (t === 0) {
            return 0;
        }

        t = t > 1 ? 1 : t < 0 ? 0 : t;
        let t2 = t / 2;

        /**
         * set higher legendre gauss weight abscissae values 
         * by more accurate weight/abscissae lookups 
         * https://pomax.github.io/bezierinfo/legendre-gauss.html
         */


        let sum = 0;

        let x0 = p0.x, y0 = p0.y, cp1x = cp1.x, cp1y = cp1.y, cp2x = cp2.x, cp2y = cp2.y, px = p.x, py = p.y;


        for (let i = 0, len = wa.length; i < len; i++) {
            // weight and abscissae 
            let [w, a] = [wa[i][0], wa[i][1]];
            let ct1_t = t2 * a;
            let ct0 = -ct1_t + t2;

            let xbase0 = base3(ct0, x0, cp1x, cp2x, px)
            let ybase0 = base3(ct0, y0, cp1y, cp2y, py)

            let comb0 = xbase0 * xbase0 + ybase0 * ybase0;

            sum += w * Math.sqrt(comb0)

        }
        return t2 * sum;
    }


    const quadraticBezierLength = (p0, cp1, p, t, checkFlat = false) => {
        if (t === 0) {
            return 0;
        }
        // is flat/linear – treat as line
        if (checkFlat) {
            let l1 = getDistance(p0, cp1) + getDistance(cp1, p);
            let l2 = getDistance(p0, p);
            if (l1 === l2) {
                return l2;
            }
        }

        let a, b, c, d, e, e1, d1, v1x, v1y;
        v1x = cp1.x * 2;
        v1y = cp1.y * 2;
        d = p0.x - v1x + p.x;
        d1 = p0.y - v1y + p.y;
        e = v1x - 2 * p0.x;
        e1 = v1y - 2 * p0.y;
        a = 4 * (d * d + d1 * d1);
        b = 4 * (d * e + d1 * e1);
        c = e * e + e1 * e1;

        const bt = b / (2 * a),
            ct = c / a,
            ut = t + bt,
            //k = ct - bt ** 2;
            k = ct - bt * bt;

        return (
            (Math.sqrt(a) / 2) *
            (ut * Math.sqrt(ut * ut + k) -
                bt * Math.sqrt(bt * bt + k) +
                k *
                Math.log((ut + Math.sqrt(ut * ut + k)) / (bt + Math.sqrt(bt * bt + k))))
        );
    }


    let length
    if (pts.length === 4) {
        length = cubicBezierLength(pts[0], pts[1], pts[2], pts[3], t, waArr)

    }
    else if (pts.length === 3) {
        length = quadraticBezierLength(pts[0], pts[1], pts[2], t)
    }
    else {
        length = getDistance(pts[0], pts[1])
    }

    return length;
}






// LG weight/abscissae generator
export function getLegendreGaussValues(n, x1 = -1, x2 = 1) {
    console.log('add new LG', n);

    let waArr = []
    let z1, z, xm, xl, pp, p3, p2, p1;
    const m = (n + 1) >> 1;
    xm = 0.5 * (x2 + x1);
    xl = 0.5 * (x2 - x1);

    for (let i = m - 1; i >= 0; i--) {
        z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
        do {
            p1 = 1;
            p2 = 0;
            for (let j = 0; j < n; j++) {
                //Loop up the recurrence relation to get the Legendre polynomial evaluated at z.
                p3 = p2;
                p2 = p1;
                p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
            }

            pp = (n * (z * p1 - p2)) / (z * z - 1);
            z1 = z;
            z = z1 - p1 / pp; //Newton’s method

        } while (Math.abs(z - z1) > 1.0e-14);

        let weight = (2 * xl) / ((1 - z * z) * pp * pp);
        let abscissa = xm + xl * z;

        waArr.push(
            [weight, -abscissa],
            [weight, abscissa],
        )
    }

    return waArr;
}





export function base3(t, p1, p2, p3, p4) {
    let t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
        t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
    return t * t2 - 3 * p1 + 3 * p2;
};


export function getPolygonLength(pts=[], isPoly=false){

    let len = 0;
    let l=pts.length;

    for(let i=1; i<l; i++){
        let p1 = pts[i-1]
        let p2 = pts[i]
        len += getDistance(p1, p2)
    }
    if(isPoly){
        len += getDistance(pts[l-1], pts[0])
    }
    return len
}

export function getPolygonLengthManhattan(pts=[], isPoly=false){

    let len = 0;
    let l=pts.length;

    for(let i=1; i<l; i++){
        let p1 = pts[i-1]
        let p2 = pts[i]
        len += getDistManhattan(p1, p2)
    }
    if(isPoly){
        len += getDistManhattan(pts[l-1], pts[0])
    }
    return len
}


/**
 * Ramanujan approximation
 * based on: https://www.mathsisfun.com/geometry/ellipse-perimeter.html#tool
 */
export function getEllipseLength(rx=0, ry=0) {
    // is circle
    if (rx === ry) {
        //console.log('is circle')
        return 2 * Math.PI * rx;
    }

    let c=rx+ry
    let d = (rx - ry) / c;
    let h = d*d

    let totalLength = Math.PI * c  * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h) ));
    return totalLength;
};



/**
 * ellipse helpers
 * approximate ellipse length 
 * by Legendre-Gauss
 */

export function getCircleArcLength(r = 0, deltaAngle = 0) {
    if(r===0) {
        console.warn('Radius must be positive');
        return 0;
    }
    let len = 2 * Math.PI * r * (1 / 360 * Math.abs(deltaAngle * 180 / Math.PI))
    return len
}

export function getEllipseLengthLG(rx, ry, startAngle, endAngle, wa = []) {

    // Transform [-1, 1] interval to [startAngle, endAngle]
    let halfInterval = (endAngle - startAngle) * 0.5;
    let midpoint = (endAngle + startAngle) * 0.5;

    // Arc length integral approximation
    let arcLength = 0;
    for (let i = 0; i < wa.length; i++) {
        let [weight, abscissae] = wa[i];
        let theta = midpoint + halfInterval * abscissae;

        let a = rx * Math.sin(theta);
        let b = ry * Math.cos(theta);
        let integrand = Math.sqrt(
            a * a + b * b
        );
        arcLength += weight * integrand;
    }

    return Math.abs(halfInterval * arcLength)
}
