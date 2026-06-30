# Changelog

## [0.4.7] - 2026-06-30
### Fixed
- arc parsing for negative radii – force positive values


## [0.4.6] - 2026-04-03
### Fixed
- better cubic to arc radii simplification
- autoAccuracy evaluation for arcs – it's always a pain-in-the-arc
- SVG attribute removal/inheritance
### Added  
- prototype methods for svg, polygon or d retrieval
- verbose and beautified pathdata output return true arc radii instead of minified

## [0.4.5] - 2026-04-02
### Fixed
- stroke-dash conversion must disable reordering of commands
- stroke-dashoffset missing in attribute scaling
- removeOffCanvas - fixed bbox calculation
- rounding bug in command reordering
### Added  
- better auto accuracy approximation


## [0.4.4] - 2026-04-01
### Fixed
- shape attribute retrieval in node.js
### Added  
- convert relative dash lengths relying on `pathLength` attribute
- quantized rounding allowing for half decimal steps
- improved arc segment detection and simplification
- security warnings/sanitization e.g for billion laugh exploits
- webapp: recommendations for additional optimizations

## [0.4.3] - 2026-03-26
### Added  
- presets: apply options from existing presets (allows custom overriding) 
- addititional input formats: `<symbol>` (handy for sprite editing), stringified (polygon) point arrays
- compound path splitting: creates separate `<path>` elements from overlapping sub paths
- custom element and attribute removal
- "safe" mode for path data stringification – for better legacy application support 
- webapp responds to keyboard shortcuts for saving, copying and pasting
- "keepSmaller" option: takes the original input if simplification failed – useful for batch processing


## [0.4.2] - 2026-03-18
### Fixed
- attribute retrieval and conversion in node
- transform conversions
### Added  
- mixed SVG path data: chooses between most compact commands – relative or absolute
- web UI features (e.g marker resizing, toggle original and optimized)


## [0.4.1] - 2026-03-16
### Fixed
- null transform removal matrix(1 0 0 1 0 0)


## [0.4.0] - 2026-03-16
### Added
- convert transforms to hard coded geometry 
- new style-to-attribute conversion
- options to specify which shapes should be converted to paths
- path to shape conversion
- ungroup paths
- webapp refined option grouping
- arc radii minification
- minify RGB color values
- move defs to top of markup
- remove futile clip-paths
- remove SVG comments

### Changed
- improved extreme detection for simplification
- stricter shorthand thresholds