/**
 * all SVG attributes
 * mapped to elements
 * used to remove unnecessary attribution
 */

export const shapeEls = [
    "polygon",
    "polyline",
    "line",
    "rect",
    "circle",
    "ellipse",
]

export const horizontalProps = ['x', 'cx', 'rx', 'dx', 'width', 'translateX'];
export const verticalProps = ['y', 'cy', 'ry', 'dy', 'height', 'translateY'];
export const transHorizontal = ['scaleX', 'translateX', 'skewX'];
export const transVertical = ['scaleY', 'translateY', 'skewY'];

export const colorProps = ['fill', 'stroke', 'stop-color'];


export const geometryEls = [
    "path",
    ...shapeEls
];

export const renderedEls = [
    "text",
    "textPath",
    "tspan",
    ...geometryEls
];

export const textEls = [
    "textPath",
    "text",
    "tspan",
];



export const strokeAtts = ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin','stroke-linecap', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit', 'stroke-opacity' ];


export const attLookup = {

    atts: {

        // wildcard
        id:'*',
        class:'*',

        // svg
        viewBox: ["symbol", "svg"],
        preserveAspectRatio: ["symbol", "svg"],
        width: ["svg", "rect", "use", "image"],
        height: ["svg", "rect", "use", "image"],



        // geometry
        d: ["path"],
        points: ["polygon", "polyline"],

        x: ["image", "rect", "text", "textPath", "tspan", "use", "mask"],
        y: ["image", "rect", "text", "textPath", "tspan", "use", "mask"],
        x1: ["line", "linearGradient"],
        x2: ["line", "linearGradient"],
        y1: ["line", "linearGradient"],
        y2: ["line", "linearGradient"],

        r: ["circle", "radialGradient"],
        rx: ["rect", "ellipse"],
        ry: ["rect", "ellipse"],

        cx: ["circle", "ellipse", "radialGradient"],
        cy: ["circle", "ellipse", "radialGradient"],

        refX: ["symbol", "markers"],
        refY: ["symbol", "markers"],


        // transforms
        transform: [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
        ],

        "transform-origin": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
        ],

        fill: [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "animate",
            "animateMotion"
        ],

        "fill-opacity": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
        ],

        "fill-rule": ["svg", "g", "path", "polygon",  "text", "textPath"],

        opacity: [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
        ],

        stroke: [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
        ],

        "stroke-width": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "mask",
        ],


        "stroke-opacity": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "mask",
        ],


        "stroke-miterlimit": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "mask",
        ],

        "stroke-linejoin": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "mask",
        ],

        "stroke-linecap": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "mask",
        ],

        "stroke-dashoffset": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "mask",
        ],

        "stroke-dasharray": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
            "mask",
        ],

        "clip-path": [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
        ],

        "clip-rule": [
            "path",
            "polygon",
        ],


        clipPathUnits: ["clipPath"],

        mask: [
            "svg",
            "g",
            "use",
            ...geometryEls,
            ...textEls,
        ],
        maskContentUnits: ["mask"],
        maskUnits: ["mask"],



        // text els
        "font-family": ["svg", "g", ...textEls],
        "font-size": ["svg", "g", ...textEls],
        "font-style": ["svg", "g", ...textEls],
        "font-weight": ["svg", "g", ...textEls],
        "font-stretch": ["svg", "g", ...textEls],
        "dominant-baseline": [...textEls],
        lengthAdjust: [...textEls],
        "text-anchor": ["text"],
        textLength: ["text", "textPath", "tspan"],
        dx: ["text", "tspan"],
        dy: ["text", "tspan"],
        method: ["textPath"],
        //path: ["textPath", "animateMotion"],
        spacing: ["textPath"],
        startOffset: ["textPath"],
        rotate: ["text", "tspan", "animateMotion"],
        side: ["textPath"],
        "white-space": ["svg", "g", ...textEls],

        // actually nonsense but might be used for currentColor
        "color": ["svg", "g", ...textEls],

        // animate
        playbackorder: ["svg"],
        timelinebegin: ["svg"],

        dur: ["animate", "animateTransform", "animateMotion"],
        end: ["animate", "animateTransform", "animateMotion"],
        from: ["animate", "animateTransform", "animateMotion"],
        to: ["animate", "animateTransform", "animateMotion"],
        type: ["animateTransform"],
        values: ["animate", "animateTransform", "animateMotion"],
        accumulate: ["animate", "animateTransform", "animateMotion"],
        additive: ["animate", "animateTransform", "animateMotion"],
        attributeName: ["animate", "animateTransform"],
        begin: ["animate", "animateTransform", "animateMotion"],
        by: ["animate", "animateTransform", "animateMotion"],
        calcMode: ["animate", "animateTransform", "animateMotion"],
        keyPoints: ["animateMotion"],
        keySplines: ["animate", "animateTransform", "animateMotion"],
        keyTimes: ["animate", "animateTransform", "animateMotion"],
        max: ["animate", "animateTransform", "animateMotion"],
        min: ["animate", "animateTransform", "animateMotion"],
        origin: ["animateMotion"],
        repeatCount: ["animate", "animateTransform", "animateMotion"],
        repeatDur: ["animate", "animateTransform", "animateMotion"],
        restart: ["animate", "animateTransform", "animateMotion"],

        // gradients
        gradientUnits: ["linearGradient", "radialGradient"],
        gradientTransform: ["linearGradient", "radialGradient"],
        fr: ["radialGradient"],
        fx: ["radialGradient"],
        fy: ["radialGradient"],
        offset: ["stop"],
        "stop-color": ["stop"],
        "stop-opacity": ["stop"],
        spreadMethod: ["linearGradient", "radialGradient"],


        // object references
        href: [
            "pattern",
            "textPath",
            "linearGradient",
            "radialGradient",
            "use",
            "animate",
            "animateTransform",
            "animateMotion",
            "image"
        ],

        pathLength: [
            ...geometryEls
        ],

    },

    defaults: {

        transform: ["none", "matrix(1, 0, 0, 1, 0, 0)"],
        "transform-origin": ["0px, 0px", "0 0"],
        rx: ["0", "0px"],
        ry: ["0", "0px"],
        x: ["0", "0px"],
        y: ["0", "0px"],

        fill: ["black", "rgb(0, 0, 0)", "rgba(0, 0, 0, 0)", "#000", "#000000"],
        "color": ["black", "rgb(0, 0, 0)", "rgba(0, 0, 0, 0)", "#000", "#000000"],

        stroke: ["none"],
        opacity: ["1"],
        "fill-opacity": ["1"],
        "stroke-width": ["1", "1px"],
        "stroke-opacity": ["1"],
        "stroke-linecap": ["butt"],
        "stroke-miterlimit": ["4"],
        "stroke-linejoin": ["miter"],
        "stroke-dasharray": ["none"],
        "stroke-dashoffset": ["0", "0px", "none"],
        "pathLength": ["none"],

        // text
        "font-family": ["serif"],
        "font-weight": ["normal", "400"],
        "font-stretch": ["normal"],
        "font-width": ["normal"],
        "letter-spacing": ["auto", "normal", "0"],
        "lengthAdjust": ["spacing"],
        "text-anchor": ["start"],
        "dominant-baseline": ["auto"],
        spacing: ["auto"],
        "white-space": ["normal"],

        // gradients
        "stop-opacity": ["1"],
        //"offset": ["none 0px auto 0deg"],
        gradientUnits: ["objectBoundingBox"],
        patternUnits: ["objectBoundingBox"],

        // clips and masks
        "clip-path": ["none"],
        "clip-rule": ["nonzero"],
        "fill-rule": ["nonzero"],
        clipPathUnits: ["userSpaceOnUse"],

        mask: ["none"],
        maskUnits: ["objectBoundingBox"],

    }
};
