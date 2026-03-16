# API
**svg-path-simplify** aims at a convenient usage concept applying as much reasonable 
default parameters as possible to get a good optimization – without screwing up your SVG.
It expects at least one input parameter which is the actual SVG data:

```js
let output = svgPathSimplify(input);
```

## Allowed inputs
`input` could be:  
* a path data string – as used in SVG `<path>` element's  `d` attribute 
* a pathData object array – retrieved via SVG2 `getPathData()` (natively supported by Firefox)
* a polygon string – as used in SVG `<polygon>` element's  `points` attribute
* a polygon:  
    - polygon point object array `[{x:0, y:0}]`
    - polygon point value array `[{0, 0]`
* an entire `<svg>` markup string `<svg></svg>`

 
 ## Options
 For more fine grained controls you can add options to the 2nd parameter.  

```js 
let options = {}
let output = svgPathSimplify(input, options);
```

The options divide into these categories:  

* path simplification – also applied when processing entire SVGs
* SVG document cleanup  
* polygon conversions 

All of these main categories are split into **»default«** and **»advanced«** settings. 
The advanced options should ideally only applied after testing in the [webapp](https://herrstrietzel.github.io/svg-path-simplify). These will often increase processing time significantly but may help to get a more compact output.  

![svg-path-simplify webapp](https://raw.githubusercontent.com/herrstrietzel/svg-path-simplify/main/demo/img/repository-open-graph-template.png)   

The webapp also provides a object output you can copy for customized JS usage! You can find it in the 2nd column right at the bottom  (collapsed by default)

Also, these options are disabled by default to mitigate problems in batch processing.


## Path simplifications/optimizations  

These params control which simplifications are applied. The default settings aim at a safe or balanced performance-to-minification ratio. However if your main goal is to get the most compact result you can enable additional options which also require more processing time.

| parameter | effect | type | default |
| -- | -- | -- | -- |
| simplifyBezier | main Bézier simplification. When disabled you get the common optimization similar to SVGO (rounding, to all relative and shorthand conversions)  | Boolean | true |
| tolerance | increase or decrease tolerance: higher values allow more distortions, lower ones more shape fidelity | Number | 1 |
| optimizeOrder | reorders commands to get more adjacent simplification candidates. Improves optimization efficiency | Boolean | true |
| removeColinear | removes unnecessary zero-length or colinear lineto commands | Boolean | true |
| flatBezierToLinetos | replaces flat Béziers with linetos which also can be stripped via previous colinear removal | Boolean | true |
| revertToQuadratics | replaces cubic Béziers with quadratic (more compact) ones when applicable | Boolean | true |

### Limit simplification

These params specify which geometry features should be retained – prevents undesired distortions.

| parameter | effect | type | default |
| -- | -- | -- | -- |
| keepExtremes | skips simplification across x/y extrema – improves shape fidelity | Boolean | true |
| keepCorners | skips simplification corners – improves shape fidelity | Boolean | true |
| keepInflections | retains commands introducing direction changes – adds complexity but may help for editing in a graphic application | Boolean | false |

### Advanced path simplifications
| parameter | effect | type | default |
| -- | -- | -- | -- |
| refineExtremes | tries to combine commands close to an adjacent x/y extreme segment | Boolean | false |
| addExtremes | adds commands at x/y extrema – adds complexity but may help for editing in a graphic application – when using this option enable `refineExtremes` as well to avoid tiny adjacent segments | Boolean | false |
| simplifyCorners | replaces Bézier segments enclosed by linetos with single quadratic commands – handy to reduce overly complex tiny corner roundings. See example in [webapp](https://herrstrietzel.github.io/svg-path-simplify?samples=fontawesome_gears&refineExtremes=true&simplifyCorners=true) | Boolean | false |
| cubicToArc | replaces Bézier segments by elliptic arc `A` commands where applicable – can reduce complexity for semi- or full circles | Boolean | false |
| simplifyRound | replaces small round segments encloses by linetos – helps to simplify shapes like gears/cogs | Boolean | false |


### Path direction
| parameter | effect | type | default |
| -- | -- | -- | -- |
| fixDirections | alternates sub path directions to fulfill non-zero. Makes fill-rule attribute obsolete and render correct in other environments e.g when converting to fonts | Boolean | false |
| reversePath | simply reverses drawing direction - sometimes needed for line animations | Boolean | false |



### Polygon options
| parameter | effect | type | default |
| -- | -- | -- | -- |
| smoothPoly | Curve-fitting: Converts polylines to cubic beziers | Boolean | false |



### Output options

| parameter | effect | type | default |
| -- | -- | -- | -- |
| getObject | whether to return the SVG/pathdata markup directly or a detailed object (containing more info)  | Boolean | true |


### SVG output optimizations
| parameter | effect | type | default |
| -- | -- | -- | -- |
| autoAccuracy | calculates a suitable floating point precision for coordinate rounding. Usually rather conservative – decreasing by one decimal should work without significant distortions | Boolean | true |
| decimals | manual floating point rounding precision – overriden when `autoAccuracy` is enabled | Number | 3 |
| minifyD | path data microoptimization: removes recurring command type tokens, whitespace and leading zeroes: 0: maximum optimization; 1: "verbose" dont't omit command type tokes; 2: "beautify" separate each command with new lines (e.g for educational purposes) | Number | 0 |
| toRelative | converts all commands to relative – reduces file size | Boolean | true |
| toShorthands | converts all commands to shorthand when applicable – reduces file size | Boolean | true |


### SVG scaling
Scaling only indirectly affects file size analogous to rounding. Use it only for very large or small SVGs. Finding the »sweet spot« where all coordinates can be expressed in integers can reduce file size as no decimal separators are required. 

| parameter | effect | type | default |
| -- | -- | -- | -- |
| scale | scales all pathdata, `viewBox`, `width` and `height` attributes | Boolean | true |
| scaleTo | scales to a specified max width | Boolean | false |


### SVG input normalization
| parameter | effect | type | default |
| -- | -- | -- | -- |
| quadraticToCubic | converts all quadratic Béziers to cubics – recommended for efficiency | Boolean | true |
| arcToCubic | converts elliptic arc `A` commands to cubic approximations – not recommended | Boolean | false |
| removeHidden | removes hidden elements for SVG inputs | Boolean | true |
| mergePaths | concatenates paths into single one – does not respect individual styles! | Boolean | false |
| shapesToPaths | converts shapes to paths - usually not recommended as shapes are most often more compact. But useful for path concatenation | Boolean | false |
| stylesToAttributes | consolidates styles and set them to attributes. Also removes invalid attributes (e.g `font-family` for paths) | Boolean | false |
