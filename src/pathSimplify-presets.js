export let settingsDefaults = {

    // SVG elements
    removeComments: true,
    removeOffCanvas: false,

    // attributes
    removeDimensions: false,
    removeIds: false,
    removeClassNames: false,
    omitNamespace: false,
    cleanUpStrokes: true,
    addViewBox: true,
    addDimensions: false,
    removePrologue: true,
    removeHidden: true,
    removeUnused: true,
    cleanupDefs: true,
    cleanupClip: true,
    cleanupSVGAtts: true,
    removeNameSpaced: true,
    removeNameSpacedAtts: true,
    attributesToGroup: false,
    minifyRgbColors: true,
    stylesToAttributes: false,
    fixHref: false,
    legacyHref: false,
    allowMeta: false,
    allowDataAtts: true,
    allowAriaAtts: true,
    //pathlength conversion
    convertPathLength: false,
    toAbsoluteUnits: false,

    // custom removal
    removeElements: [],
    removeSVGAttributes: [],
    removeElAttributes: [],

    // merging/splitting
    unGroup: false,
    mergePaths: false,
    splitCompound: false,



    // shape conversions
    shapesToPaths: false,
    shapeConvert: 0,
    convertShapes: ['rect', 'ellipse', 'circle', 'line', 'polygon', 'polyline'],


    // simplify
    keepSmaller: true,
    simplifyBezier: true,
    optimizeOrder: true,
    autoClose: false,
    removeZeroLength: true,
    refineClosing: true,
    removeColinear: true,
    flatBezierToLinetos: true,
    revertToQuadratics: true,
    refineExtremes: false,
    simplifyCorners: false,
    simplifyQuadraticCorners: false,
    keepExtremes: true,
    keepCorners: true,
    keepInflections: false,
    addExtremes: false,

    // draw direction 
    fixDirections: false,
    reversePath: false,


    // pathdata
    toAbsolute: false,
    toRelative: true,
    toMixed: false,
    toShorthands: true,
    toLonghands: false,
    quadraticToCubic: true,
    arcToCubic: false,
    cubicToArc: false,
    lineToCubic: false,

    // minification
    decimals: 3,
    autoAccuracy: true,
    minifyD: 0,
    tolerance: 1,


    // polygon
    toPolygon: false,
    smoothPoly: false,
    isClosed:true,
    polyFormat: 'object',
    precisionPoly: 1,
    simplifyRD: 0,
    simplifyRDP: 0,
    harmonizeCpts: false,
    removeOrphanSubpaths: false,
    simplifyRound: false,

    //svg scaling
    scale: 1,
    scaleTo: 0,
    crop: false,
    alignToOrigin: false,

    // flatten transforms
    convertTransforms: false,


}

const settingsNull = {}

for (let prop in settingsDefaults) {
    let val = settingsDefaults[prop];
    let isBoolean = val === false || val === true;
    let isNum = !isNaN(val)
    let isArray = Array.isArray(val)

    if (isBoolean) val = false
    else if (!isArray && isNum) val = val === 1 ? 1 : (prop === 'decimals' ? -1 : 0);
    else if (isArray) val = []
    settingsNull[prop] = val;
}


export const presetSettings = {
    default: settingsDefaults,

    education: {
        ...settingsDefaults,
        ...{
            keepSmaller: false,
            toRelative: false,
            toMixed: false,
            toShorthands: false,
            fixHref: true,
            legacyHref: false,
            addViewBox: true,
            addDimensions: true,
            removeComments: false,
            decimals: 3,
            minifyD: 2
        }
    },

    null: settingsNull,

    editor: {
        ...settingsDefaults,
        ...{
            keepSmaller: false,
            convertPathLength:true,
            toRelative: true,
            toMixed: true,
            toShorthands: true,
            //fixHref: true,
            allowMeta:true,
            allowDataAtts:true,
            allowAriaAtts:true,
            legacyHref: true,
            addViewBox: true,
            addDimensions: true,
            removeComments: true,
            autoAccuracy: true,
            //decimals:5,
            minifyD: 0.5
        }
    },

    noSimplification: {
        ...settingsDefaults,
        ...{
            simplifyBezier: false,
            quadraticToCubic: false,
            toRelative: true,
            toShorthands: true,
            fixHref: true,
            optimizeOrder: false,
            removeZeroLength: false,
            refineExtremes: false,
            refineClosing: false,
            removeColinear: false,
            flatBezierToLinetos: false,
            //addViewBox: false,
            addDimensions: false,
            removeComments: true,
            minifyD: 0
        }

    },
    path: {
        ...settingsDefaults,
        ...{
            shapeConvert: 'toPaths',
            convertShapes: ['rect', 'ellipse', 'circle', 'line', 'polygon', 'polyline'],
            addViewBox: true,
            minifyD: 0.5
        }
    },

    poly: {
        ...settingsDefaults,
        ...{
            toPolygon: true,
        }
    },

    curvefit: {
        ...settingsDefaults,
        ...{
            smoothPoly: true,
        }
    },

    detransform: {
        ...settingsDefaults,
        ...{
            convertTransforms: true,
            addViewBox: true,
            minifyD: 0.5
        }
    },

    high: {
        ...settingsDefaults,
        ...{
            tolerance: 1.1,
            toMixed: true,
            refineExtremes: true,
            simplifyCorners: true,
            simplifyQuadraticCorners: true,
            removeOrphanSubpaths: true,
            simplifyRound: true,
            removeClassNames: true,
            cubicToArc: true,
            minifyD: 0,
            removeComments: true,
            removeHidden: true,
            addViewBox: true,
            removeDimensions: true,
            removeOffCanvas: true,
            /*
            */
        }
    }

}