# Changelog

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