(function (exports) {
  'use strict';

  function renderPoint(
      svg,
      coords,
      fill = "red",
      r = "1%",
      opacity = "1",
      title = '',
      render = true,
      id = "",
      className = ""
  ) {
      if (Array.isArray(coords)) {
          coords = {
              x: coords[0],
              y: coords[1]
          };
      }
      let marker = `<circle class="${className}" opacity="${opacity}" id="${id}" cx="${coords.x}" cy="${coords.y}" r="${r}" fill="${fill}">
  <title>${title}</title></circle>`;

      if (render) {
          svg.insertAdjacentHTML("beforeend", marker);
      } else {
          return marker;
      }
  }

  function renderPath(svg, d = '', stroke = 'green', strokeWidth = '1%', opacity="1", render = true) {

      let path = `<path d="${d}" fill="none" stroke="${stroke}"  stroke-width="${strokeWidth}" stroke-opacity="${opacity}" /> `;

      if (render) {
          svg.insertAdjacentHTML("beforeend", path);
      } else {
          return path;
      }

  }

  function detectInputType(input) {
      let type = 'string';
      /*
      if (input instanceof HTMLImageElement) return "img";
      if (input instanceof SVGElement) return "svg";
      if (input instanceof HTMLCanvasElement) return "canvas";
      if (input instanceof File) return "file";
      if (input instanceof ArrayBuffer) return "buffer";
      if (input instanceof Blob) return "blob";
      */
      if (Array.isArray(input)) {

          // nested array
          if (Array.isArray(input[0])) {

              if (input[0].length === 2) {

                  return 'polyArray'
              }

              else if (Array.isArray(input[0][0]) && input[0][0].length === 2) {

                  return 'polyComplexArray'
              }
              else if (input[0][0].x !== undefined && input[0][0].y !== undefined) {

                  return 'polyComplexObjectArray'
              }
          }

          // is point array
          else if (input[0].x !== undefined && input[0].y !== undefined) {

              return 'polyObjectArray'
          }

          // path data array
          else if (input[0]?.type && input[0]?.values
          ) {
              return "pathData"

          }

          return "array";
      }

      if (typeof input === "string") {
          input = input.trim();
          let isSVG = input.includes('<svg') && input.includes('</svg');
          let isSymbol = input.startsWith('<symbol') && input.includes('</symbol');
          let isPathData = input.startsWith('M') || input.startsWith('m');
          let isPolyString = !isNaN(input.substring(0, 1)) && !isNaN(input.substring(input.length - 1, input.length));
          let isJson = isNumberJson(input);

          if (isSVG) {
              type = 'svgMarkup';
          }

          else if (isJson) {
              type = 'json';
          }

          else if (isSymbol) {
              type = 'symbol';
          }
          else if (isPathData) {
              type = 'pathDataString';
          }
          else if (isPolyString) {
              type = 'polyString';
          }

          else {
              let url = /^(file:|https?:\/\/|\/|\.\/|\.\.\/)/.test(input);
              let dataUrl = input.startsWith('data:image');
              type = url || dataUrl ? "url" : "string";
          }

          return type
      }

      type = typeof input;
      let constructor = input.constructor.name;

      return (constructor || type).toLowerCase();
  }

  function isNumberJson(str) {

      str = str.trim();

      let hasNumber = /\d/.test(str);
      let hasInvalid = /[abcdfghijklmnopqrstuvwz]/gi.test(str);
      if (!hasNumber || hasInvalid) return false

      // is JSON like
      let isJson = str.startsWith('[') && str.endsWith(']');

      return isJson
      
  }

  const {
      abs: abs$1, acos: acos$1, asin: asin$1, atan: atan$1, atan2: atan2$1, ceil: ceil$1, cos: cos$1, exp: exp$1, floor: floor$1,
      log: log$1, hypot, max: max$1, min: min$1, pow: pow$1, random: random$1, round: round$1, sin: sin$1, sqrt: sqrt$1, tan: tan$1, PI: PI$1
  } = Math;

  const rad2Deg = 180/Math.PI;  
  const deg2rad = Math.PI/180;
  const root2 = 1.4142135623730951;
  const svgNs = 'http://www.w3.org/2000/svg';

  // 1/2.54
  const inch2cm =  0.39370078;

  // 1/72
  const inch2pt =  0.01388889;

  /*
  import {abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
      log, max, min, pow, random, round, sin, sqrt, tan, PI} from '/.constants.js';
      */

  const {
      abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
      log, max, min, pow, random, round, sin, sqrt, tan, PI
  } = Math;

  // get angle helper
  function getAngle(p1, p2, normalize = false) {
      let angle = atan2(p2.y - p1.y, p2.x - p1.x);
      // normalize negative angles
      if (normalize && angle < 0) angle += Math.PI * 2;
      return angle
  }

  function getDeltaAngle(centerPoint, startPoint, endPoint, largeArc = false) {

      const normalizeAngle = (angle) => {
          let normalized = angle % (2 * Math.PI);

          if (normalized > Math.PI) {
              normalized -= 2 * Math.PI;
          } else if (normalized <= -Math.PI) {
              normalized += 2 * Math.PI;
          }
          return normalized;
      };

      let startAngle = Math.atan2(
          startPoint.y - centerPoint.y,
          startPoint.x - centerPoint.x
      );

      let endAngle = Math.atan2(
          endPoint.y - centerPoint.y,
          endPoint.x - centerPoint.x
      );

      // Calculate raw delta angle (difference)
      let deltaAngle = endAngle - startAngle;

      // Normalize the delta angle to range (-π, π]
      deltaAngle = normalizeAngle(deltaAngle);

      if (largeArc) deltaAngle = Math.PI * 2 - Math.abs(deltaAngle);

      let phi = 180 / Math.PI;
      let startAngleDeg = startAngle * phi;
      let endAngleDeg = endAngle * phi;
      let deltaAngleDeg = deltaAngle * phi;

      return {
          startAngle, endAngle, deltaAngle, startAngleDeg,
          endAngleDeg,
          deltaAngleDeg
      };

  }

  /**
   * based on:  Justin C. Round's 
   * http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
   */

  function checkLineIntersection(p1 = null, p2 = null, p3 = null, p4 = null, exact = true, respectDirection = false, debug = false) {
      // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
      let denominator, a, b, numerator1, numerator2;
      let intersectionPoint = {};

      if (!p1 || !p2 || !p3 || !p4) {
          if (debug) console.warn('points missing');
          return false
      }

      // coinciding line points
      if (
          (p1.x === p2.x && p1.y === p2.y) ||
          (p3.x === p4.x && p3.y === p4.y)
      ) {
          return false
      }

      try {
          denominator = ((p4.y - p3.y) * (p2.x - p1.x)) - ((p4.x - p3.x) * (p2.y - p1.y));

          // parallel or colinear
          if (denominator === 0) {
              return false;
          }
      } catch {
          if (debug) console.warn('!catch', p1, p2, 'p3:', p3, 'p4:', p4);
          return false
      }

      a = p1.y - p3.y;
      b = p1.x - p3.x;
      numerator1 = ((p4.x - p3.x) * a) - ((p4.y - p3.y) * b);
      numerator2 = ((p2.x - p1.x) * a) - ((p2.y - p1.y) * b);

      a = numerator1 / denominator;
      b = numerator2 / denominator;

      // if we cast these lines infinitely in both directions, they intersect here:
      intersectionPoint = {
          x: p1.x + (a * (p2.x - p1.x)),
          y: p1.y + (a * (p2.y - p1.y))
      };

      let intersection = false;
      // if line1 is a segment and line2 is infinite, they intersect if:
      if ((a > 0 && a < 1) && (b > 0 && b < 1)) {
          intersection = true;

      }

      // direction
      if (!exact && respectDirection && ((a > 0 && b < 0) || (a < 0 && b > 0))) {
          intersection = false;
          return false
      }

      if (exact && !intersection) {
          return false;
      }

      // if line1 and line2 are segments, they intersect if both of the above are true

      return intersectionPoint;
  }

  /** Get relationship between a point and a polygon using ray-casting algorithm
  * based on timepp's answer
  * https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon#63436180
  */
  function isPointInPolygon(pt, polygon, bb, skipBB = false) {
      const between = (p, a, b) => (p >= a && p <= b) || (p <= a && p >= b);
      let inside = false;

      // not in bbox - quit || no bbox defined
      if (!skipBB || !bb.bottom) {
          if (bb.left > pt.x || bb.top > pt.y || bb.bottom < pt.y || bb.right < pt.x) {
              return false;
          }
      }

      let l = polygon.length;
      for (let i = l - 1, j = 0; j < l; i = j, j++) {
          const A = polygon[i];
          const B = polygon[j];
          // corner cases
          if ((pt.x == A.x && pt.y == A.y) || (pt.x == B.x && pt.y == B.y))
              return true;
          if (A.y == B.y && pt.y == A.y && between(pt.x, A.x, B.x)) return true;
          if (between(pt.y, A.y, B.y)) {
              /** 
               * if pt inside the vertical range filter out "ray pass vertex" problem 
               * by treating the line a little lower
               */
              if ((pt.y == A.y && B.y >= A.y) || (pt.y == B.y && A.y >= B.y)) continue;
              // calc cross product `ptA X ptB`, pt lays on left side of AB if c > 0
              const c = (A.x - pt.x) * (B.y - pt.y) - (B.x - pt.x) * (A.y - pt.y);
              if (c == 0) return true;
              if (A.y < B.y == c > 0) inside = !inside;
          }
      }
      return inside ? true : false;
  }

  /**
  * Linear  interpolation (LERP) helper
  */
  function interpolate(p1, p2, t, getTangent = false) {

      let pt = {
          x: (p2.x - p1.x) * t + p1.x,
          y: (p2.y - p1.y) * t + p1.y,
      };

      if (getTangent) {
          pt.angle = getAngle(p1, p2);

          // normalize negative angles
          if (pt.angle < 0) pt.angle += PI * 2;
      }

      return pt
  }

  function pointAtT(pts, t = 0.5, getTangent = false, getCpts = false, returnArray = false) {

      const getPointAtBezierT = (pts, t, getTangent = false) => {

          let isCubic = pts.length === 4;
          let p0 = pts[0];
          let cp1 = pts[1];
          let cp2 = isCubic ? pts[2] : pts[1];
          let p = pts[pts.length - 1];
          let pt = { x: 0, y: 0 };

          if (getTangent || getCpts) {
              let m0, m1, m2, m3, m4;
              let shortCp1 = p0.x === cp1.x && p0.y === cp1.y;
              let shortCp2 = p.x === cp2.x && p.y === cp2.y;

              if (t === 0 && !shortCp1) {
                  pt.x = p0.x;
                  pt.y = p0.y;
                  pt.angle = getAngle(p0, cp1);
              }

              else if (t === 1 && !shortCp2) {
                  pt.x = p.x;
                  pt.y = p.y;
                  pt.angle = getAngle(cp2, p);
              }

              else {
                  // adjust if cps are on start or end point
                  if (shortCp1) t += 0.0000001;
                  if (shortCp2) t -= 0.0000001;

                  m0 = interpolate(p0, cp1, t);
                  if (isCubic) {
                      m1 = interpolate(cp1, cp2, t);
                      m2 = interpolate(cp2, p, t);
                      m3 = interpolate(m0, m1, t);
                      m4 = interpolate(m1, m2, t);
                      pt = interpolate(m3, m4, t);

                      // add angles
                      pt.angle = getAngle(m3, m4);

                      // add control points
                      if (getCpts) pt.cpts = [m1, m2, m3, m4];
                  } else {
                      m1 = interpolate(p0, cp1, t);
                      m2 = interpolate(cp1, p, t);
                      pt = interpolate(m1, m2, t);
                      pt.angle = getAngle(m1, m2);

                      // add control points
                      if (getCpts) pt.cpts = [m1, m2];
                  }
              }

          }
          // take simplified calculations without tangent angles
          else {
              let t1 = 1 - t;

              // cubic beziers
              if (isCubic) {
                  pt = {
                      x:
                          t1 ** 3 * p0.x +
                          3 * t1 ** 2 * t * cp1.x +
                          3 * t1 * t ** 2 * cp2.x +
                          t ** 3 * p.x,
                      y:
                          t1 ** 3 * p0.y +
                          3 * t1 ** 2 * t * cp1.y +
                          3 * t1 * t ** 2 * cp2.y +
                          t ** 3 * p.y,
                  };

              }
              // quadratic beziers
              else {
                  pt = {
                      x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
                      y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y,
                  };
              }

          }

          return pt

      };

      // normalize if input was array not pt object
      if (Array.isArray(pts[0])) {
          pts = pts.map(pt => { return { x: pt[0], y: pt[1] } });
          // also output array if not explicitely defined
          returnArray = true;
      }

      let pt;
      if (pts.length > 2) {
          pt = getPointAtBezierT(pts, t, getTangent);
      }

      else {
          pt = interpolate(pts[0], pts[1], t, getTangent);
      }

      // normalize negative angles
      if (getTangent && pt.angle < 0) pt.angle += PI * 2;

      return returnArray ? [pt.x, pt.y] : pt
  }

  /**
   * get vertices from path command final on-path points
   */

  function getPathDataVertices(pathData=[], includeCpts = false, decimals = -1) {
      let polyPoints = [];

      pathData.forEach((com) => {
          let { type, values } = com;

          // get final on path point from last 2 values
          if (values.length) {

              // round
              if (decimals > -1) values = values.map(val => +val.toFixed(decimals));

              if (includeCpts) {

                  for (let i = 1; i < values.length; i += 2) {
                      polyPoints.push({ x: values[i - 1], y: values[i] });
                  }

              } else {
                  polyPoints.push({ x: values[values.length - 2], y: values[values.length - 1] });
              }

          }
      });
      return polyPoints;
  }

  /*
  export function getPathDataVertices(pathData) {
      let polyPoints = [];
      let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };

      pathData.forEach((com) => {
          let { type, values } = com;
          // get final on path point from last 2 values
          if (values.length) {
              let pt = values.length > 1 ? { x: values[values.length - 2], y: values[values.length - 1] }
                  : (type === 'V' ? { x: p0.x, y: values[0] } : { x: values[0], y: p0.y });
              polyPoints.push(pt);
              p0 = pt;
          }
      });
      return polyPoints;
  };
  */

  /**
   *  based on @cuixiping;
   *  https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
   */

  function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2, normalize = true
  ) {

      // helper for angle calculation
      const getAngle = (cx, cy, x, y, normalize = true) => {
          let angle = Math.atan2(y - cy, x - cx);
          if (normalize && angle < 0) angle += Math.PI * 2;
          return angle
      };

      // make sure rx, ry are positive
      rx = Math.abs(rx);
      ry = Math.abs(ry);

      // normalize xAxis rotation
      xAxisRotation = rx === ry ? 0 : (xAxisRotation < 0 && normalize ? xAxisRotation + 360 : xAxisRotation);

      // create data object
      let arcData = {
          cx: 0,
          cy: 0,
          // rx/ry values may be deceptive in arc commands
          rx: rx,
          ry: ry,
          startAngle: 0,
          endAngle: 0,
          deltaAngle: 0,
          clockwise: sweep,
          // copy explicit arc properties
          xAxisRotation,
          largeArc,
          sweep
      };

      if (rx == 0 || ry == 0) {
          // invalid arguments
          throw Error("rx and ry can not be 0");
      }

      /**
       * if rx===ry x-axis rotation is ignored
       * otherwise convert degrees to radians
       */
      let phi = rx === ry ? 0 : xAxisRotation * deg2rad;
      let cx, cy;

      let s_phi = !phi ? 0 : Math.sin(phi);
      let c_phi = !phi ? 1 : Math.cos(phi);

      let hd_x = (x1 - x2) / 2;
      let hd_y = (y1 - y2) / 2;
      let hs_x = (x1 + x2) / 2;
      let hs_y = (y1 + y2) / 2;

      // F6.5.1
      let x1_ = !phi ? hd_x : c_phi * hd_x + s_phi * hd_y;
      let y1_ = !phi ? hd_y : c_phi * hd_y - s_phi * hd_x;

      // F.6.6 Correction of out-of-range radii
      //   Step 3: Ensure radii are large enough
      let lambda = (x1_ * x1_) / (rx * rx) + (y1_ * y1_) / (ry * ry);
      if (lambda > 1) {
          let lambdaRoot = Math.sqrt(lambda);
          rx = rx * lambdaRoot;
          ry = ry * lambdaRoot;

          // save real rx/ry
          arcData.rx = rx;
          arcData.ry = ry;
      }

      let rxry = rx * ry;
      let rxy1_ = rx * y1_;
      let ryx1_ = ry * x1_;
      let sum_of_sq = rxy1_ ** 2 + ryx1_ ** 2; // sum of square
      if (!sum_of_sq) {

          throw Error("start point can not be same as end point");
      }
      let coe = Math.sqrt(Math.abs((rxry * rxry - sum_of_sq) / sum_of_sq));
      if (largeArc === sweep) {
          coe = -coe;
      }

      // F6.5.2
      let cx_ = (coe * rxy1_) / ry;
      let cy_ = (-coe * ryx1_) / rx;

      /** F6.5.3
       * center point of ellipse
       */
      cx = !phi ? hs_x + cx_ : c_phi * cx_ - s_phi * cy_ + hs_x;
      cy = !phi ? hs_y + cy_ : s_phi * cx_ + c_phi * cy_ + hs_y;
      arcData.cy = cy;
      arcData.cx = cx;

      /** F6.5.5
       * calculate angles between center point and
       * commands starting and final on path point
       */
      let startAngle = getAngle(cx, cy, x1, y1, normalize);
      let endAngle = getAngle(cx, cy, x2, y2, normalize);

      // adjust end angle

      // Adjust angles based on sweep direction
      if (sweep) {
          // Clockwise
          if (endAngle < startAngle) {
              endAngle += Math.PI * 2;
          }
      } else {
          // Counterclockwise
          if (endAngle > startAngle) {
              endAngle -= Math.PI * 2;
          }
      }

      let deltaAngle = endAngle - startAngle;

      // The rest of your code remains the same
      arcData.startAngle = startAngle;
      arcData.startAngle_deg = startAngle * rad2Deg;
      arcData.endAngle = endAngle;
      arcData.endAngle_deg = endAngle * rad2Deg;
      arcData.deltaAngle = deltaAngle;
      arcData.deltaAngle_deg = deltaAngle * rad2Deg;

      return arcData;
  }

  function rotatePoint(pt, cx, cy, rotation = 0, convertToRadians = false) {
      if (!rotation) return pt;

      rotation = convertToRadians ? (rotation / 180) * Math.PI : rotation;

      return {
          x: cx + (pt.x - cx) * Math.cos(rotation) - (pt.y - cy) * Math.sin(rotation),
          y: cy + (pt.x - cx) * Math.sin(rotation) + (pt.y - cy) * Math.cos(rotation)
      };
  }

  function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = false) {

      // Convert degrees to radians
      angle = degrees ? (angle * PI) / 180 : angle;
      ellipseRotation = degrees ? (ellipseRotation * PI) / 180 : ellipseRotation;
      // reset rotation for circles or 360 degree 
      ellipseRotation = rx !== ry ? (ellipseRotation !== PI * 2 ? ellipseRotation : 0) : 0;

      // is ellipse
      if (parametricAngle && rx !== ry) {
          // adjust angle for ellipse rotation
          angle = ellipseRotation ? angle - ellipseRotation : angle;
          // Get the parametric angle for the ellipse
          let angleParametric = atan(tan(angle) * (rx / ry));
          // Ensure the parametric angle is in the correct quadrant
          angle = cos(angle) < 0 ? angleParametric + PI : angleParametric;
      }

      // Calculate the point on the ellipse without rotation
      let x = cx + rx * cos(angle),
          y = cy + ry * sin(angle);
      let pt = {
          x: x,
          y: y
      };

      if (ellipseRotation) {
          pt.x = cx + (x - cx) * cos(ellipseRotation) - (y - cy) * sin(ellipseRotation);
          pt.y = cy + (x - cx) * sin(ellipseRotation) + (y - cy) * cos(ellipseRotation);
      }
      return pt
  }

  // to parametric angle helper
  function toParametricAngle(angle, rx, ry) {

      if (rx === ry || (angle % PI * 0.5 === 0)) return angle;
      let angleP = atan(tan(angle) * (rx / ry));

      // Ensure the parametric angle is in the correct quadrant
      angleP = cos(angle) < 0 ? angleP + PI : angleP;

      return angleP
  }

  function bezierhasExtreme(p0 = null, cpts = []) {

      if (!p0) {
          p0 = cpts[0];
          cpts = cpts.slice(1, cpts.length);
      }

      let l = cpts.length;
      let p = cpts[l - 1];
      let cp1 = cpts[0];
      let cp2 = l === 3 ? cpts[1] : cp1;

      // get bounding box
      /**
       * if control points are within 
       * bounding box of start and end point 
       * we cant't have extremes
       */
      let top = Math.min(p0.y, p.y);
      let left = Math.min(p0.x, p.x);
      let right = Math.max(p0.x, p.x);
      let bottom = Math.max(p0.y, p.y);

      // within bbox - can't have extremes
      if (
          cp1.y >= top && cp1.y <= bottom &&
          cp2.y >= top && cp2.y <= bottom &&
          cp1.x >= left && cp1.x <= right &&
          cp2.x >= left && cp2.x <= right
      ) {
          return false
      }

      return true

  }

  function getBezierExtremeT(pts, { addExtremes = true, addSemiExtremes = false } = {}) {
      let tArr = pts.length === 4 ? cubicBezierExtremeT(pts[0], pts[1], pts[2], pts[3], { addExtremes, addSemiExtremes }) : quadraticBezierExtremeT(pts[0], pts[1], pts[2], { addExtremes, addSemiExtremes });
      return tArr;
  }

  /**
   * based on Nikos M.'s answer
   * how-do-you-calculate-the-axis-aligned-bounding-box-of-an-ellipse
   * https://stackoverflow.com/questions/87734/#75031511
   * See also: https://github.com/foo123/Geometrize
   */
  function getArcExtemes(p0, values) {
      // compute point on ellipse from angle around ellipse (theta)
      const arc = (theta, cx, cy, rx, ry, alpha) => {
          // theta is angle in radians around arc
          // alpha is angle of rotation of ellipse in radians
          var cos = Math.cos(alpha),
              sin = Math.sin(alpha),
              x = rx * Math.cos(theta),
              y = ry * Math.sin(theta);

          return {
              x: cx + cos * x - sin * y,
              y: cy + sin * x + cos * y
          };
      };

      let arcData = svgArcToCenterParam(p0.x, p0.y, values[0], values[1], values[2], values[3], values[4], values[5], values[6]);
      let { rx, ry, cx, cy, endAngle, deltaAngle } = arcData;

      // arc rotation
      let deg = values[2];

      // final on path point
      let p = { x: values[5], y: values[6] };

      // collect extreme points – add end point
      let extremes = [p];

      // rotation to radians
      let alpha = deg * Math.PI / 180;
      let tan = Math.tan(alpha),
          p1, p2, p3, p4, theta;

      /**
      * find min/max from zeroes of directional derivative along x and y
      * along x axis
      */
      theta = Math.atan2(-ry * tan, rx);

      let angle1 = theta;
      let angle2 = theta + Math.PI;
      let angle3 = Math.atan2(ry, rx * tan);
      let angle4 = angle3 + Math.PI;

      // inner bounding box
      let xArr = [p0.x, p.x];
      let yArr = [p0.y, p.y];
      let xMin = Math.min(...xArr);
      let xMax = Math.max(...xArr);
      let yMin = Math.min(...yArr);
      let yMax = Math.max(...yArr);

      // on path point close after start
      let angleAfterStart = endAngle - deltaAngle * 0.001;
      let pP2 = arc(angleAfterStart, cx, cy, rx, ry, alpha);

      // on path point close before end
      let angleBeforeEnd = endAngle - deltaAngle * 0.999;
      let pP3 = arc(angleBeforeEnd, cx, cy, rx, ry, alpha);

      /**
       * expected extremes
       * if leaving inner bounding box
       * (between segment start and end point)
       * otherwise exclude elliptic extreme points
      */

      // right
      if (pP2.x > xMax || pP3.x > xMax) {
          // get point for this theta
          p1 = arc(angle1, cx, cy, rx, ry, alpha);
          extremes.push(p1);
      }

      // left
      if (pP2.x < xMin || pP3.x < xMin) {
          // get anti-symmetric point
          p2 = arc(angle2, cx, cy, rx, ry, alpha);
          extremes.push(p2);
      }

      // top
      if (pP2.y < yMin || pP3.y < yMin) {
          // get anti-symmetric point
          p4 = arc(angle4, cx, cy, rx, ry, alpha);
          extremes.push(p4);
      }

      // bottom
      if (pP2.y > yMax || pP3.y > yMax) {
          // get point for this theta
          p3 = arc(angle3, cx, cy, rx, ry, alpha);
          extremes.push(p3);
      }

      return extremes;
  }

  function getTatAngles(cpts = [], angles = []) {

      let l = cpts.length;
      let isCubic = l === 4;

      if (!angles.length) angles = [0];

      let anglesL = angles.length;
      let tArr = [];

      for (let i = 0; i < anglesL; i++) {

          let ang = angles[i];
          let cptsN = ang ? [] : cpts.slice(0);

          // rotate cpts
          if (ang) {
              for (let j = 0; j < l; j++) {
                  let pt = cpts[j];
                  cptsN.push(rotatePoint(pt, 0, 0, ang));
              }
          }

          // get t arr
          let tVals = isCubic ? getTatCubicExtreme(...cptsN) : getTatQuadraticExtreme(...cptsN);
          tArr.push(...tVals);

      }

      // deduplicate and sort
      tArr = [... new Set(tArr)].sort();

      return tArr;

  }

  // t at cubic bezier extreme
  function getTatCubicExtreme(p0, cp1, cp2, p) {

      /**
       * if control points are within 
       * bounding box of start and end point 
       * we cant't have extremes
       */
      if (!bezierhasExtreme(p0, [cp1, cp2, p])) {

          return []
      }

      let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];
      let tArr = [], a, b, c, t, t1, t2, b2ac, sqrt_b2ac;
      let e = 1e-8;

      for (let i = 0; i < 2; ++i) {

          if (i == 0) {
              b = 6 * x0 - 12 * x1 + 6 * x2;
              a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
              c = 3 * x1 - 3 * x0;
          } else {
              b = 6 * y0 - 12 * y1 + 6 * y2;
              a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
              c = 3 * y1 - 3 * y0;
          }
          if (Math.abs(a) < e) {
              if (Math.abs(b) < e) {
                  continue;
              }
              t = -c / b;
              if (t > 0 && t < 1) {
                  tArr.push(t);
              }
              continue;
          }
          b2ac = b * b - 4 * c * a;
          if (b2ac < 0) {
              if (Math.abs(b2ac) < e) {
                  t = -b / (2 * a);
                  if (t > 0 && t < 1) {
                      tArr.push(t);
                  }
              }
              continue;
          }
          sqrt_b2ac = Math.sqrt(b2ac);
          t1 = (-b + sqrt_b2ac) / (2 * a);
          if (t1 > 0 && t1 < 1) {
              tArr.push(t1);
          }
          t2 = (-b - sqrt_b2ac) / (2 * a);
          if (t2 > 0 && t2 < 1) {
              tArr.push(t2);
          }
      }

      let j = tArr.length;
      while (j--) {
          t = tArr[j];
      }

      return [...new Set(tArr)].sort();
  }

  function getTatQuadraticExtreme(p0, cp1, p) {

      /**
       * if control points are within 
       * bounding box of start and end point 
       * we cant't have extremes
       */
      if (!bezierhasExtreme(p0, [cp1, p])) {

          return []
      }

      let a, b, t;
      let [x0, y0, x1, y1, x2, y2] = [p0.x, p0.y, cp1.x, cp1.y, p.x, p.y];
      let tArr = [];

      for (let i = 0; i < 2; ++i) {
          a = i == 0 ? x0 - 2 * x1 + x2 : y0 - 2 * y1 + y2;
          b = i == 0 ? -2 * x0 + 2 * x1 : -2 * y0 + 2 * y1;
          if (Math.abs(a) > 1e-12) {
              t = -b / (2 * a);
              if (t > 0 && t < 1) {
                  tArr.push(t);
              }
          }
      }

      return [...new Set(tArr)].sort();
  }

  // cubic bezier.
  function cubicBezierExtremeT(p0, cp1, cp2, p,
      { addExtremes = true, addSemiExtremes = false } = {}) {

      // rotate cpts for semi extremes
      const rotatePoint = (pt) => {

          const angleRad = Math.PI / 4;
          const cos = Math.cos(angleRad);
          const sin = Math.sin(angleRad);

          return {
              x: pt.x * cos - pt.y * sin,
              y: pt.x * sin + pt.y * cos
          }
      };

      if (addSemiExtremes) {
          p0 = rotatePoint(p0);
          cp1 = rotatePoint(cp1);
          cp2 = rotatePoint(cp2);
          p = rotatePoint(p);
      }

      let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];

      /**
       * if control points are within 
       * bounding box of start and end point 
       * we cant't have extremes
       */
      let top = Math.min(p0.y, p.y);
      let left = Math.min(p0.x, p.x);
      let right = Math.max(p0.x, p.x);
      let bottom = Math.max(p0.y, p.y);

      if (
          cp1.y >= top && cp1.y <= bottom &&
          cp2.y >= top && cp2.y <= bottom &&
          cp1.x >= left && cp1.x <= right &&
          cp2.x >= left && cp2.x <= right
      ) {
          return []
      }

      let tArr = [], a, b, c, t, t1, t2, b2ac, sqrt_b2ac;

      for (let i = 0; i < 2; ++i) {
          if (i == 0) {
              b = 6 * x0 - 12 * x1 + 6 * x2;
              a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
              c = 3 * x1 - 3 * x0;
          } else {
              b = 6 * y0 - 12 * y1 + 6 * y2;
              a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
              c = 3 * y1 - 3 * y0;
          }
          if (Math.abs(a) < 1e-8) {
              if (Math.abs(b) < 1e-8) {
                  continue;
              }
              t = -c / b;
              if (0 < t && t < 1) {
                  tArr.push(t);
              }
              continue;
          }
          b2ac = b * b - 4 * c * a;
          if (b2ac < 0) {
              if (Math.abs(b2ac) < 1e-8) {
                  t = -b / (2 * a);
                  if (0 < t && t < 1) {
                      tArr.push(t);
                  }
              }
              continue;
          }
          sqrt_b2ac = Math.sqrt(b2ac);
          t1 = (-b + sqrt_b2ac) / (2 * a);
          if (0 < t1 && t1 < 1) {
              tArr.push(t1);
          }
          t2 = (-b - sqrt_b2ac) / (2 * a);
          if (0 < t2 && t2 < 1) {
              tArr.push(t2);
          }
      }

      let j = tArr.length;
      while (j--) {
          t = tArr[j];
      }

      return tArr;
  }

  function isMultipleOf45(angleRad, epsilon = 0.001) {
      let rad90 = Math.PI / 2;
      let rad45 = rad90 / 2;
      let isRightAngle = Math.abs(angleRad / rad90 - Math.round(angleRad / rad90)) < epsilon;
      return !isRightAngle ? Math.abs(angleRad / rad45 - Math.round(angleRad / rad45)) < epsilon : false;
  }

  function quadraticBezierExtremeT(p0, cp1, p, { addExtremes = true, addSemiExtremes = false } = {}) {

      // rotate cpts for semi extremes
      const rotatePoint = (pt) => {
          const angleRad = -Math.PI / 4;
          const cos = Math.cos(angleRad);
          const sin = Math.sin(angleRad);

          return {
              x: pt.x * cos - pt.y * sin,
              y: pt.x * sin + pt.y * cos
          }
      };

      if (addSemiExtremes) {
          p0 = rotatePoint(p0);
          cp1 = rotatePoint(cp1);
          p = rotatePoint(p);
      }

      /**
       * if control points are within 
       * bounding box of start and end point 
       * we cant't have extremes
       */
      let top = Math.min(p0.y, p.y);
      let left = Math.min(p0.x, p.x);
      let right = Math.max(p0.x, p.x);
      let bottom = Math.max(p0.y, p.y);
      let a, b, t;

      if (
          cp1.y >= top && cp1.y <= bottom &&
          cp1.x >= left && cp1.x <= right
      ) {
          return []
      }

      let [x0, y0, x1, y1, x2, y2] = [p0.x, p0.y, cp1.x, cp1.y, p.x, p.y];
      let extemeT = [];

      for (let i = 0; i < 2; ++i) {
          a = i == 0 ? x0 - 2 * x1 + x2 : y0 - 2 * y1 + y2;
          b = i == 0 ? -2 * x0 + 2 * x1 : -2 * y0 + 2 * y1;
          if (Math.abs(a) > 1e-12) {
              t = -b / (2 * a);
              if (t > 0 && t < 1) {
                  extemeT.push(t);
              }
          }
      }
      return extemeT
  }

  /**
   * get distance between 2 points
   * pythagorean theorem
   */
  function getDistance(p1, p2, isArray = false) {

      let dx = isArray ? p2[0] - p1[0] : (p2.x - p1.x);
      let dy = isArray ? p2[1] - p1[1] : (p2.y - p1.y);

      return Math.sqrt(dx * dx + dy * dy);
  }

  function getSquareDistance(p1, p2) {
      let dx = (p2.x - p1.x);
      let dy = (p2.y - p1.y);
      return dx * dx + dy * dy
  }

  /**
   * get Manhattan/Cab distance 
   * based on x/y deltas
   * sloppy but fast
   */
  function getDistManhattan(pt1, pt2) {
      let dx = Math.abs(pt2.x - pt1.x);
      let dy = Math.abs(pt2.y - pt1.y);
      return dx + dy;
  }

  /**
   * sloppy distance calculation
   * based on "half Manhattan/Cab" distance
   */

  function getDistAv(pt1, pt2) {
      let dx = Math.abs(pt2.x - pt1.x);
      let dy = Math.abs(pt2.y - pt1.y);
      return (dx + dy) * 0.5;
  }

  /**
   * reduce polypoints
   * for sloppy dimension approximations
   */
  function reducePoints(points, maxPoints = 48) {
      if (!Array.isArray(points) || points.length <= maxPoints) return points;

      // Calculate how many points to skip between kept points
      let len = points.length;
      let step = len / maxPoints;
      let reduced = [];

      for (let i = 0; i < maxPoints; i++) {
          reduced.push(points[Math.floor(i * step)]);
      }

      let lenR = reduced.length;
      // Always include the last point to maintain path integrity
      if (reduced[lenR - 1] !== points[len - 1]) {
          reduced[lenR - 1] = points[len - 1];
      }

      return reduced;
  }

  function getElementTransform(parent, el) {
      if (!parent || !el) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
      let matrix = parent.getScreenCTM().inverse().multiply(el.getScreenCTM());
      return matrix
  }

  /**
   * split compound paths into 
   * sub path data array
   */

  function splitSubpaths(pathData) {
      let subPathArr = [];
      let current = [pathData[0]];
      let l = pathData.length;

      for (let i = 1; i < l; i++) {
          let com = pathData[i];

          if (com.type === 'M' || com.type === 'm') {
              subPathArr.push(current);
              current = [];
          }
          current.push(com);
      }

      if (current.length) subPathArr.push(current);

      return subPathArr;
  }

  /**
   * calculate split command points
   * for single t value 
   */
  function splitCommand(points, t) {

      let seg1 = [];
      let seg2 = [];

      let p0 = points[0];
      let cp1 = points[1];
      let cp2 = points[points.length - 2];
      let p = points[points.length - 1];
      let m0, m1, m2, m3, m4, p2;

      // cubic
      if (points.length === 4) {
          m0 = pointAtT([p0, cp1], t);
          m1 = pointAtT([cp1, cp2], t);
          m2 = pointAtT([cp2, p], t);
          m3 = pointAtT([m0, m1], t);
          m4 = pointAtT([m1, m2], t);

          // split end point
          p2 = pointAtT([m3, m4], t);

          // 1. segment
          seg1.push(
              { x: p0.x, y: p0.y },
              { x: m0.x, y: m0.y },
              { x: m3.x, y: m3.y },
              { x: p2.x, y: p2.y },
          );
          // 2. segment
          seg2.push(
              { x: p2.x, y: p2.y },
              { x: m4.x, y: m4.y },
              { x: m2.x, y: m2.y },
              { x: p.x, y: p.y },
          );
      }

      // quadratic
      else if (points.length === 3) {
          m1 = pointAtT([p0, cp1], t);
          m2 = pointAtT([cp1, p], t);
          p2 = pointAtT([m1, m2], t);

          // 1. segment
          seg1.push(
              { x: p0.x, y: p0.y },
              { x: m1.x, y: m1.y },
              { x: p2.x, y: p2.y },
          );

          // 1. segment
          seg2.push(
              { x: p2.x, y: p2.y },
              { x: m2.x, y: m2.y },
              { x: p.x, y: p.y },
          );
      }

      // lineto
      else if (points.length === 2) {
          m1 = pointAtT([p0, p], t);

          // 1. segment
          seg1.push(
              { x: p0.x, y: p0.y },
              { x: m1.x, y: m1.y },
          );

          // 1. segment
          seg2.push(
              { x: m1.x, y: m1.y },
              { x: p.x, y: p.y },
          );
      }
      return [seg1, seg2];
  }

  /**
   * calculate command extremes
   */

  function addExtemesToCommand(p0, values,
      { tMin = 0, tMax = 1, addExtremes = true, addSemiExtremes = false } = {}) {

      let pathDataNew = [];

      let type = values.length === 6 ? 'C' : 'Q';
      let cp1 = { x: values[0], y: values[1] };
      let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
      let p = { x: values[4], y: values[5] };

      /*
      // get inner bbox
      let xMax = Math.max(p.x, p0.x)
      let xMin = Math.min(p.x, p0.x)
      let yMax = Math.max(p.y, p0.y)
      let yMin = Math.min(p.y, p0.y)
      */

      let extremeCount = 0;

      tMin = 0;
      tMax = 1;

      let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];
      let tArrEx = addExtremes ? getBezierExtremeT(pts, { addExtremes, addSemiExtremes: false }) : [];
      let tArrSemi = addSemiExtremes ? getBezierExtremeT(pts, { addExtremes, addSemiExtremes }) : [];
      let tArr = Array.from(new Set([...tArrEx, ...tArrSemi])).sort();

      // avoid t split too close to start or end
      tArr = tArr.filter(t => t > tMin && t < tMax);

      if (tArr.length) {
          let commandsSplit = splitCommandAtTValues(p0, values, tArr);

          pathDataNew.push(...commandsSplit);
          extremeCount += commandsSplit.length;
      } else {

          pathDataNew.push({ type: type, values: values });
      }

      return { pathData: pathDataNew, count: extremeCount };

  }

  function addExtremePoints(pathData, {
      tMin = 0,
      tMax = 1,
      addExtremes = true,
      addSemiExtremes = false,
  } = {}) {
      let pathDataNew = [pathData[0]];
      // previous on path point
      let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let len = pathData.length;

      for (let c = 1; len && c < len; c++) {
          let com = pathData[c];

          let { type, values } = com;
          let valsL = values.slice(-2);
          ({ x: valsL[0], y: valsL[1] });

          if (type !== 'C' && type !== 'Q') {
              pathDataNew.push(com);
          }

          else {
              // add extremes
              if ((addExtremes || addSemiExtremes) && (type === 'C' || type === 'Q')) {
                  let comExt = addExtemesToCommand(p0, values, { tMin, tMax, addExtremes, addSemiExtremes }).pathData;

                  pathDataNew.push(...comExt);
              }
          }

          p0 = { x: valsL[0], y: valsL[1] };

          if (type.toLowerCase() === "z") {
              p0 = M;
          } else if (type === "M") {
              M = { x: valsL[0], y: valsL[1] };
          }
      }

      return pathDataNew;
  }

  /**
   * split commands multiple times
   * based on command points
   * and t array
   */
  function splitCommandAtTValues(p0, values, tArr, returnCommand = true) {
      let segmentPoints = [];

      if (!tArr.length) {
          return false
      }

      let valuesL = values.length;
      let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
      let cp1, cp2, points;

      if (values.length === 2) {
          points = [p0, p];
      }
      else if (values.length === 4) {
          cp1 = { x: values[0], y: values[1] };
          points = [p0, cp1, p];
      }
      else if (values.length === 6) {
          cp1 = { x: values[0], y: values[1] };
          cp2 = { x: values[2], y: values[3] };
          points = [p0, cp1, cp2, p];
      }

      if (tArr.length) {
          // single t
          if (tArr.length === 1) {
              let segs = splitCommand(points, tArr[0]);
              let points1 = segs[0];
              let points2 = segs[1];
              segmentPoints.push(points1, points2);

          } else {

              // 1st segment
              let t1 = tArr[0];
              let seg0 = splitCommand(points, t1);
              let points0 = seg0[0];
              segmentPoints.push(points0);
              points = seg0[1];

              for (let i = 1; i < tArr.length; i++) {
                  t1 = tArr[i - 1];
                  let t2 = tArr[i];

                  // new t value for 2nd segment
                  let t2_1 = (t2 - t1) / (1 - t1);
                  let segs2 = splitCommand(points, t2_1);
                  segmentPoints.push(segs2[0]);

                  if (i === tArr.length - 1) {
                      segmentPoints.push(segs2[segs2.length - 1]);
                  }
                  // take 2nd segment for next splitting
                  points = segs2[1];
              }
          }
      }

      if (returnCommand) {

          let pathData = [];
          let com, values;

          segmentPoints.forEach(seg => {
              com = { type: '', values: [] };
              seg.shift();
              values = seg.map(val => { return Object.values(val) }).flat();
              com.values = values;

              // cubic
              if (seg.length === 3) {
                  com.type = 'C';
              }

              // quadratic
              else if (seg.length === 2) {
                  com.type = 'Q';
              }

              // lineto
              else if (seg.length === 1) {
                  com.type = 'L';
              }
              pathData.push(com);
          });
          return pathData;
      }

      return segmentPoints;
  }

  function parseColor(str) {
      let type = str.startsWith('#') ? 'rgbHex' : (str.includes('(') ? 'fn' : typeof str);
      let col = {};
      let mode = null;
      let colObj = { mode: null, values: [] };
      if (type === 'rgbHex') {
          col = hex2Rgb(str);
          mode = 'rgba';
      }
      else if (type === 'fn') {
          let colVals = str.split(/\(|\)/).filter(Boolean);
          if (colVals.length < 2) return str;

          mode = colVals[0];
          let colorComponents = colVals[1].split(/,| /).filter(Boolean).map(Number);

          let keys = mode.split('');
          keys.forEach((k, i) => {
              let val = colorComponents[i];
              if (mode === 'rgba' && k === 'a') {
                  val = Math.floor(val * 255);
              }
              col[k] = val;
          });
      }
      else if (type === 'string') {
          colObj.mode = 'keyword';
          colObj.values = [str];
          return colObj
      }

      if (mode === 'rgba' || mode === 'rgb') {
          col.a = !col.a ? 255 : col.a;
      }

      colObj.mode = mode;
      colObj.values = Object.values(col);

      return colObj;
  }

  function hex2Rgb(hex = '') {
      // Remove # if present
      if (hex.startsWith('#')) hex = hex.substring(1);

      // normalize short notation (e.g., 'fff' or 'ffff')
      if (hex.length === 3) {
          hex = hex.split('').map(char => char + char).join('');
      } else if (hex.length === 4) {
          // Handle short notation with alpha (e.g., 'ffff')
          hex = hex.split('').map(char => char + char).join('');
      }

      let r = 0, g = 0, b = 0, a = 0;

      // invalid
      if (hex.length < 6 || hex.length > 8) {
          console.warn('Invalid hex format');
          return { r, g, b, a };
      }

      let isRgba = hex.length === 8;

      let numericValue = parseInt(hex, 16);
      r = isRgba ? parseInt(hex.substring(0, 2), 16) : numericValue >> 16 & 0xFF;
      g = isRgba ? parseInt(hex.substring(2, 4), 16) : numericValue >> 8 & 0xFF;
      b = isRgba ? parseInt(hex.substring(4, 6), 16) : numericValue & 0xFF;
      a = isRgba ? parseInt(hex.substring(6, 8), 16) : 255;

      return { r, g, b, a };

  }

  function rgba2Hex({ r = 0, g = 0, b = 0, a = 255, values = [] }) {
      // Helper function to convert number to 2-digit hex
      const toHex = (num) => {
          const hex = Math.min(255, Math.max(0, Math.round(num))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
      };

      // convert from number array input
      if (!r && !g && !b && values.length) {
          [r, g, b, a = 255] = values;
      }

      // Get hex values
      let rHex = toHex(r);
      let gHex = toHex(g);
      let bHex = toHex(b);
      let aHex = a < 255 ? toHex(a) : 0;

      let allowsShort = rHex[0] === rHex[1] && gHex[0] === gHex[1] && bHex[0] === bHex[1];

      // Check for 3-character RGB short notation (e.g., #fff)
      if (!aHex && allowsShort) {
          return `#${rHex[0]}${gHex[0]}${bHex[0]}`;
      }

      // Check for 4-character RGBA short notation (e.g., #ffff)
      if (aHex && allowsShort) {
          return `#${rHex[0]}${gHex[0]}${bHex[0]}${aHex[0]}`;
      }

      // Return 6-character RGB if no alpha
      if (!aHex) {
          return `#${rHex}${gHex}${bHex}`;
      }

      // Return 8-character RGBA
      return `#${rHex}${gHex}${bHex}${aHex}`;
  }

  function detectAccuracyPoly(pts) {
      let dims = [];

      // add average distances
      for (let i = 1, len = pts.length; i < len; i++) {
          let pt = pts[i];
          let { p0 = null, p = null, dimA = 0 } = pt;

          // use existing averave dimension value or calculate
          if ( p && p0) {
              dimA = dimA ? dimA : getDistManhattan(p0, p);

              if (dimA) dims.push(dimA);
          }
      }

      let dim_min = dims.sort();
      let sliceIdx = Math.ceil(dim_min.length / 8);
      dim_min = dim_min.slice(0, sliceIdx);
      let minVal = dim_min.reduce((a, b) => a + b, 0) / sliceIdx;

      let threshold = 75;
      let decimalsAuto = minVal > threshold * 1.5 ? 0 : Math.floor(threshold / minVal).toString().length;
      // clamp
      return Math.min(Math.max(0, decimalsAuto), 8)

  }

  function detectAccuracy(pathData) {
      let dims = [];

      // add average distances
      for (let i = 1, len = pathData.length; i < len; i++) {
          let com = pathData[i];
          let { type, values, p0 = null, p = null, dimA = 0 } = com;

          // use existing averave dimension value or calculate
          if (values.length && p && p0) {

              dimA = dimA ? dimA : getDistManhattan(p0, p);

              if (dimA) dims.push(dimA);

          }

      }

      let dim_min = dims.sort();

      let sliceIdx = Math.ceil(dim_min.length / 6);
      dim_min = dim_min.slice(0, sliceIdx);
      let minVal = dim_min.reduce((a, b) => a + b, 0) / sliceIdx;

      let threshold = 75;
      let decimalsAuto = minVal > threshold * 1.5 ? 0 : Math.floor(threshold / minVal).toString().length;

      // clamp
      return Math.min(Math.max(0, decimalsAuto), 8)

  }

  function roundTo(num = 0, decimals = 3) {
      if(decimals<=-1) return num;
      if (!decimals) return Math.round(num);
      let factor = 10 ** decimals;
      return Math.round(num * factor) / factor;
  }

  /**
   * round to reasonable 
   * floating point accuracy 
   * based on numeric value
   */
  function autoRound(val, integerThresh = 50){
    let decimals=8;  
    
    if(val>integerThresh*2){
      decimals=0;
    }
    else if(val>integerThresh){
      decimals=1;
    }else {
       decimals=Math.ceil(500/val).toString().length;

    }
        

    let factor = 10 ** decimals;
    return Math.round(val * factor) / factor;
  }

  /**
   * round path data
   * either by explicit decimal value or
   * based on suggested accuracy in path data
   */
  function roundPathData(pathData, decimalsGlobal = -1) {

      if (decimalsGlobal < 0) return pathData;

      let len = pathData.length;

      let decimals = decimalsGlobal;

      for (let c = 0; c < len; c++) {
          let com = pathData[c];
          let {values} = com;

          let valLen = values.length;
          if (!valLen) continue

          for (let v = 0; v < valLen; v++) {
              pathData[c].values[v] = roundTo(values[v], decimals);
          }
      }

      return pathData;
  }

  /**
   * all SVG attributes
   * mapped to elements
   * used to remove unnecessary attribution
   */

  const shapeEls = [
      "polygon",
      "polyline",
      "line",
      "rect",
      "circle",
      "ellipse",
  ];

  const horizontalProps = ['x', 'cx', 'rx', 'dx', 'width', 'translateX'];
  const verticalProps = ['y', 'cy', 'ry', 'dy', 'height', 'translateY'];
  const transHorizontal = ['scaleX', 'translateX', 'skewX'];
  const transVertical = ['scaleY', 'translateY', 'skewY'];

  const colorProps = ['fill', 'stroke', 'stop-color'];
  const geometryProps = ['d', 'points', 'cx', 'cy', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'r', 'rx', 'ry', 'x', 'y'];

  const geometryEls = [
      "path",
      ...shapeEls
  ];

  const renderedEls = [
      "text",
      "textPath",
      "tspan",
      ...geometryEls
  ];

  const textEls = [
      "textPath",
      "text",
      "tspan",
  ];

  const strokeAtts = ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin','stroke-linecap', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit', 'stroke-opacity' ];

  const attLookup = {

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

          transform: ["none", "matrix(1, 0, 0, 1, 0, 0)", "matrix(1 0 0 1 0 0)"],
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

  function svgElUnitsToPixel(el, {
      width = 0,
      height = 0,
      fontSize = 16,
      dpi = 96,
      autoRoundValues = false,
      decimals = -1,
  } = {}) {

      let attributes = [...el.attributes];
      let attNames = attributes.map(att => att.name);

      // doesn't work in node!

      
      let attValues = [];
      attNames.forEach(att=>{
          attValues.push(el.getAttribute(att));
      });

      let isSquare = width === height;

      let atts = {};
      attNames.forEach((att, i) => {
          let isHorizontal = horizontalProps.includes(att);
          let isVertical = verticalProps.includes(att);
          let normalizedDiagonal = !isSquare && att === 'r' ? true : false;
          let attValue = attValues[i];

          let val = normalizeUnits(attValue, { isHorizontal, isVertical, width, height, normalizedDiagonal, autoRoundValues });
          atts[att] = val;

          // apply
          el.setAttribute(att, val);
      });

      return atts;
  }

  // convert real life units to pixels
  function normalizeUnits(value = null, {
      unit = null,
      width = 0,
      height = 0,
      decimals = -1,
      isHorizontal = false,
      isVertical = false,
      autoRoundValues = false,
      dpi = 96,
      fontSize = 16,
      normalizedDiagonal = false,
  } = {}) {

      // only required for circle r normalization when height!=width
      normalizedDiagonal = width === height ? false : normalizedDiagonal;

      let type = typeof value;
      if (!value) return value;

      // check if value is string
      let isNum = type === 'number' ? true : isNumericValue(value);
      let isArray = type === 'string' ? value.split(/,| /).length > 1 : false;
      let isFunction = type === 'string' ? value.includes('(') : false;

      if (!isNum || isArray || isFunction) return value

      // check unit if not specified
      unit = !unit ? getUnit(value) : unit;

      let val = parseFloat(value);
      let scale = 1;
      let scaleRoot = Math.sqrt(width * width + height * height) / root2;

      // no unit - already pixes/user unit
      if (!unit) {
          return val;
      }

      switch (unit) {
          case "%":
              if (width && isHorizontal) {
                  scale = width / 100;
              }
              else if (height && isVertical) {
                  scale = height / 100;
              }
              else {
                  scale = normalizedDiagonal ? scaleRoot / 100 : 1;
              }
              break;

          case "rad":
              scale = rad2Deg;
              break;
          case "turn":
              scale = 360;
              break;

          case "in":
              scale = dpi;
              break;

          case "pt":
              // 1/72
              scale = dpi * inch2pt;
              break;

          case "pc":
              // 1/6
              scale = dpi * 0.16666667;
              break;

          case "cm":
              // 1/2.54
              scale = inch2cm * dpi;
              break;
          case "mm":

              scale = inch2cm * dpi * 0.1;
              break;

          // has anyone ever used it?
          case "Q":
              scale = inch2cm * dpi * 0.025;
              break;

          // just a default approximation
          case "em":
          case "rem":
              scale = fontSize;
              break;
          default:
              scale = 1;
      }
      let valuePx = val * scale;
      if (autoRoundValues) valuePx = autoRound(valuePx);
      else if (decimals > -1) valuePx = +valuePx.toFixed(decimals);

      return valuePx;
  }

  function getUnit(val) {
      if (!val || !isNaN(val)) return '';
      val = val.replace(/\+|\-/g, '');
      let unit = val.match(/[^\d|.]+/g)[0];
      return unit;
  }

  function isNumericValue(val = '') {
      // is number
      if (!isNaN(val)) return true;
      // parse with unit
      return !isNaN(parseFloat(val))
  }

  function getElementAtts(el, {x=0, y=0, width=0, height=0}={}){
      let attributes = [...el.attributes];

      let atts={};
      attributes.forEach(att=>{
          let value = normalizeUnits(att.nodeValue, {x, y, width, height});   
          atts[att.name] = value;
      });

      return atts
  }

  /**
   * calculate polygon bbox
   */
  function getPolyBBox(vertices, decimals = -1) {
      let xArr = vertices.map(pt => pt.x);
      let yArr = vertices.map(pt => pt.y);
      let left = Math.min(...xArr);
      let right = Math.max(...xArr);
      let top = Math.min(...yArr);
      let bottom = Math.max(...yArr);
      let bb = {
          x: left,
          left: left,
          right: right,
          y: top,
          top: top,
          bottom: bottom,
          width: right - left,
          height: bottom - top
      };

      // round

      if (decimals > -1) {
          for (let prop in bb) {
              bb[prop] = +bb[prop].toFixed(decimals);
          }
      }

      return bb;
  }

  function getSubPathBBoxes(subPaths) {
      let bboxArr = [];
      subPaths.forEach((pathData) => {

          let bb = getPathDataBBox_sloppy(pathData);
          bboxArr.push(bb);
      });

      return bboxArr;
  }

  function checkBBoxIntersections(bb, bb1) {
      let [x, y, width, height, right, bottom] = [
          bb.x,
          bb.y,
          bb.width,
          bb.height,
          bb.x + bb.width,
          bb.y + bb.height
      ];
      let [x1, y1, width1, height1, right1, bottom1] = [
          bb1.x,
          bb1.y,
          bb1.width,
          bb1.height,
          bb1.x + bb1.width,
          bb1.y + bb1.height
      ];
      let intersects = false;
      if (width * height != width1 * height1) {
          if (width * height > width1 * height1) {
              if (x < x1 && right > right1 && y < y1 && bottom > bottom1) {
                  intersects = true;
              }
          }
      }
      return intersects;
  }

  /**
   * sloppy path bbox aaproximation
   */

  function getPathDataBBox_sloppy(pathData) {
      let pts = getPathDataPoly(pathData);
      let bb = getPolyBBox(pts);
      return bb;
  }

  /**
   * get path data poly
   * including command points
   * handy for faster/sloppy bbox approximations
   */

  function getPathDataPoly(pathData) {

      let poly = [];
      for (let i = 0; i < pathData.length; i++) {
          let com = pathData[i];
          let prev = i > 0 ? pathData[i - 1] : pathData[i];
          let { type, values } = com;
          let p0 = { x: prev.values[prev.values.length - 2], y: prev.values[prev.values.length - 1] };
          let p = values.length ? { x: values[values.length - 2], y: values[values.length - 1] } : '';
          let cp1 = values.length ? { x: values[0], y: values[1] } : '';

          switch (type) {

              // convert to cubic to get polygon
              case 'A':

                  if (typeof arcToBezier !== 'function') {

                      // get real radii
                      let rx = getDistance(p0, p) / 2;
                      let ptMid = interpolate(p0, p, 0.5);

                      let pt1 = getPointOnEllipse(ptMid.x, ptMid.y, rx, rx, 0);
                      let pt2 = getPointOnEllipse(ptMid.x, ptMid.y, rx, rx, Math.PI);
                      poly.push(pt1, pt2, p);

                      break;
                  }
                  let cubic = arcToBezier(p0, values);
                  cubic.forEach(com => {
                      let vals = com.values;
                      let cp1 = { x: vals[0], y: vals[1] };
                      let cp2 = { x: vals[2], y: vals[3] };
                      let p = { x: vals[4], y: vals[5] };
                      poly.push(cp1, cp2, p);
                  });
                  break;

              case 'C':
                  let cp2 = { x: values[2], y: values[3] };
                  poly.push(cp1, cp2);
                  break;
              case 'Q':
                  poly.push(cp1);
                  break;
          }

          // M and L commands
          if (type.toLowerCase() !== 'z') {
              poly.push(p);
          }
      }

      return poly;
  }

  /**
   * get exact path BBox
   * calculating extremes for all command types
   */

  function getPathDataBBox(pathData) {

      // save extreme values
      let xMin = Infinity;
      let xMax = -Infinity;
      let yMin = Infinity;
      let yMax = -Infinity;

      const setXYmaxMin = (pt) => {
          if (pt.x < xMin) {
              xMin = pt.x;
          }
          if (pt.x > xMax) {
              xMax = pt.x;
          }
          if (pt.y < yMin) {
              yMin = pt.y;
          }
          if (pt.y > yMax) {
              yMax = pt.y;
          }
      };

      for (let i = 0; i < pathData.length; i++) {
          let com = pathData[i];
          let { type, values } = com;
          let valuesL = values.length;
          let comPrev = pathData[i - 1] ? pathData[i - 1] : pathData[i];
          let valuesPrev = comPrev.values;
          let valuesPrevL = valuesPrev.length;

          if (valuesL) {
              let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };
              let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
              // add final on path point
              setXYmaxMin(p);

              if (type === 'C' || type === 'Q') {
                  let cp1 = { x: values[0], y: values[1] };
                  let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                  let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];

                  let bezierExtremesT = getBezierExtremeT(pts);
                  bezierExtremesT.forEach(t => {
                      let pt = pointAtT(pts, t);
                      setXYmaxMin(pt);
                  });
              }

              else if (type === 'A') {
                  let arcExtremes = getArcExtemes(p0, values);
                  arcExtremes.forEach(pt => {
                      setXYmaxMin(pt);
                  });
              }
          }
      }

      let bbox = { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
      return bbox
  }

  /**
   * get pathdata area
   */

  function getPathArea(pathData, decimals = 9) {
      let totalArea = 0;
      let polyPoints = [];

      let subPathsData = splitSubpaths(pathData);
      let isCompoundPath = subPathsData.length > 1 ? true : false;
      let counterShapes = [];

      // check intersections for compund paths
      if (isCompoundPath) {
          let bboxArr = getSubPathBBoxes(subPathsData);

          bboxArr.forEach(function (bb, b) {

              for (let i = 0; i < bboxArr.length; i++) {
                  let bb2 = bboxArr[i];
                  if (bb != bb2) {
                      let intersects = checkBBoxIntersections(bb, bb2);
                      if (intersects) {
                          counterShapes.push(i);
                      }
                  }
              }
          });
      }

      subPathsData.forEach((pathData, d) => {

          polyPoints = [];
          let comArea = 0;
          let pathArea = 0;
          let multiplier = 1;
          let pts = [];

          pathData.forEach(function (com, i) {
              let [type, values] = [com.type, com.values];
              let valuesL = values.length;

              if (values.length) {
                  let prevC = i > 0 ? pathData[i - 1] : pathData[0];
                  let prevCVals = prevC.values;
                  let prevCValsL = prevCVals.length;
                  let p0 = { x: prevCVals[prevCValsL - 2], y: prevCVals[prevCValsL - 1] };
                  let p = { x: values[valuesL - 2], y: values[valuesL - 1] };

                  // C commands
                  if (type === 'C' || type === 'Q') {
                      let cp1 = { x: values[0], y: values[1] };
                      pts = type === 'C' ? [p0, cp1, { x: values[2], y: values[3] }, p] : [p0, cp1, p];
                      let areaBez = Math.abs(getBezierArea(pts));
                      comArea += areaBez;

                      polyPoints.push(p0, p);
                  }

                  // A commands
                  else if (type === 'A') {
                      let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], com.values[3], com.values[4], p.x, p.y);
                      let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle } = arcData;

                      let arcArea = Math.abs(getEllipseArea(rx, ry, startAngle, endAngle));

                      // subtract remaining polygon between p0, center and p
                      let polyArea = Math.abs(getPolygonArea([p0, { x: cx, y: cy }, p]));
                      arcArea -= polyArea;

                      polyPoints.push(p0, p);
                      comArea += arcArea;
                  }

                  // L commands
                  else {
                      polyPoints.push(p0, p);
                  }
              }
          });

          let areaPoly = getPolygonArea(polyPoints);

          if (counterShapes.indexOf(d) !== -1) {
              multiplier = -1;
          }

          if (
              (areaPoly < 0 && comArea < 0)
          ) {
              // are negative
              pathArea = (Math.abs(comArea) - Math.abs(areaPoly)) * multiplier;

          } else {
              pathArea = (Math.abs(comArea) + Math.abs(areaPoly)) * multiplier;
          }

          totalArea += pathArea;
      });

      return totalArea;
  }

  /**
   * get ellipse area
   * skips to circle calculation if rx===ry
   */

  function getEllipseArea(rx, ry, startAngle, endAngle) {
      const totalArea = Math.PI * rx * ry;
      let angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
      // If circle, use simple circular formula
      if (rx === ry) return totalArea * (angleDiff / (2 * Math.PI));

      // Convert absolute angles to parametric angles
      const absoluteToParametric = (phi)=>{
        return Math.atan2(rx * Math.sin(phi), ry * Math.cos(phi));
      };
      startAngle = absoluteToParametric(startAngle);
      endAngle = absoluteToParametric(endAngle);
      angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
      return totalArea * (angleDiff / (2 * Math.PI));
  }

  /**
   * compare areas 
   * for thresholds
   * returns a percentage value
   */

  function getRelativeAreaDiff(area0, area1) {
      let diff = Math.abs(area0 - area1);
      return Math.abs(100 - (100 / area0 * (area0 + diff)))
  }

  /**
   * get bezier area
   */
  function getBezierArea(pts, absolute=false) {

      let [p0, cp1, cp2, p] = [pts[0], pts[1], pts[2], pts[pts.length - 1]];
      let area;

      if (pts.length < 3) return 0;

      // quadratic beziers
      if (pts.length === 3) {
          cp1 = {
              x: pts[0].x * 1 / 3 + pts[1].x * 2 / 3,
              y: pts[0].y * 1 / 3 + pts[1].y * 2 / 3
          };

          cp2 = {
              x: pts[2].x * 1 / 3 + pts[1].x * 2 / 3,
              y: pts[2].y * 1 / 3 + pts[1].y * 2 / 3
          };
      }

      area = ((p0.x * (-2 * cp1.y - cp2.y + 3 * p.y) +
          cp1.x * (2 * p0.y - cp2.y - p.y) +
          cp2.x * (p0.y + cp1.y - 2 * p.y) +
          p.x * (-3 * p0.y + cp1.y + 2 * cp2.y)) *
          3) / 20;
          
      return absolute ? Math.abs(area) : area;
  }

  function getPolygonArea(points, absolute=false) {
      let area = 0;
      let l = points.length;
      for (let i = 0; l && i < l; i++) {
          let addX = points[i].x;
          let addY = points[i === points.length - 1 ? 0 : i + 1].y;
          let subX = points[i === points.length - 1 ? 0 : i + 1].x;
          let subY = points[i].y;
          area += addX * addY * 0.5 - subX * subY * 0.5;
      }
      if(absolute) area=Math.abs(area);
      return area;
  }

  /**
  * serialize pathData array to 
  * d attribute string 
  */

  function pathDataToD(pathData, mode = 0) {

      mode = parseFloat(mode);
      /*
      0 = max minification
      0.5 = safe
      1 = verbose
      2 = beautify
      */
      let len = pathData.length;

      let valsString = pathData[0].values.join(" ");
      let separator_command = mode > 1 ? `\n` :
          ((mode < 1) ? '' : ' ');
      let separator_type = mode > 0.5 ? ' ' : '';

      // 1st command
      let d = `${pathData[0].type}${separator_type}${valsString}${separator_command}`;

      for (let i = 1; i < len; i++) {
          let com0 = pathData[i - 1];
          let com = pathData[i];
          let { type, values } = com;
          valsString = '';

          // Minify Arc commands (A/a) – actually sucks!
          if (!mode && (type === 'A' || type === 'a')) {
              values = [
                  values[0], values[1], values[2],
                  `${values[3]}${values[4]}${values[5]}`,
                  values[6]
              ];
          }

          // Omit type for repeated commands
          type = ((mode < 1) && com0.type === com.type && com.type.toLowerCase() !== 'm')
              ? " "
              : ((mode < 1) && com0.type === "M" && com.type === "L"
                  ? " "
                  : com.type);

          // concatenate subsequent floating point values
          if (!mode) {

              let prevWasFloat = false;

              for (let v = 0, l = values.length; v < l; v++) {
                  let val = values[v];
                  let valStr = val.toString();
                  let isFloat = valStr.includes('.');
                  let isSmallFloat = isFloat && Math.abs(val) < 1;

                  // Remove leading zero from small floats *only* if the previous was also a float
                  if (isSmallFloat && prevWasFloat) {
                      valStr = valStr.replace(/^0\./, '.');
                  }

                  // Add space unless this is the first value OR previous was a small float
                  if (v > 0 && !(prevWasFloat && isSmallFloat)) {
                      valsString += ' ';
                  }

                  valsString += valStr;
                  prevWasFloat = isSmallFloat;
              }

          }
          // regular non-minified output
          else {
              valsString = values.join(' ');
          }

          if(i===len-1) separator_command='';
          d += `${type}${separator_type}${valsString}${separator_command}`;
      }

      if (mode < 1) {
          d = d
              .replace(/[A-Za-z]0(?=\.)/g, m => m[0])
              .replace(/ 0\./g, " .") // Space before small decimals
              .replace(/ -/g, "-")     // Remove space before negatives
              .replace(/-0\./g, "-.")  // Remove leading zero from negative decimals
              .replace(/Z/g, "z");    // Convert uppercase 'Z' to lowercase
      }

      return d;
  }

  function getCombinedByDominant(com1, com2, maxDist = 0, tolerance = 1, debug = false) {

      // cubic Bézier derivative
      const cubicDerivative = (p0, p1, p2, p3, t) => {
          let mt = 1 - t;

          return {
              x:
                  3 * mt * mt * (p1.x - p0.x) +
                  6 * mt * t * (p2.x - p1.x) +
                  3 * t * t * (p3.x - p2.x),
              y:
                  3 * mt * mt * (p1.y - p0.y) +
                  6 * mt * t * (p2.y - p1.y) +
                  3 * t * t * (p3.y - p2.y)
          };
      };

      // if combining fails return original commands
      let commands = [com1, com2];

      // detect dominant 
      let dist1 = getDistAv(com1.p0, com1.p);
      let dist2 = getDistAv(com2.p0, com2.p);

      let reverse = dist1 > dist2;

      // backup original commands
      let com1_o = JSON.parse(JSON.stringify(com1));
      let com2_o = JSON.parse(JSON.stringify(com2));

      let ptI = checkLineIntersection(com1_o.p0, com1_o.cp1, com2_o.p, com2_o.cp2, false);

      if (!ptI) {

          return commands
      }

      if (reverse) {
          let com2_R = {
              p0: { x: com1.p.x, y: com1.p.y },
              cp1: { x: com1.cp2.x, y: com1.cp2.y },
              cp2: { x: com1.cp1.x, y: com1.cp1.y },
              p: { x: com1.p0.x, y: com1.p0.y },
          };

          let com1_R = {
              p0: { x: com2.p.x, y: com2.p.y },
              cp1: { x: com2.cp2.x, y: com2.cp2.y },
              cp2: { x: com2.cp1.x, y: com2.cp1.y },
              p: { x: com2.p0.x, y: com2.p0.y },
          };

          com1 = com1_R;
          com2 = com2_R;
      }

      let add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
      let sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
      let mul = (a, s) => ({ x: a.x * s, y: a.y * s });
      let dot = (a, b) => a.x * b.x + a.y * b.y;

      // estimate extrapolation parameter t0

      let B0 = com2.p0;
      let D0 = cubicDerivative(
          com2.p0,
          com2.cp1,
          com2.cp2,
          com2.p,
          0
      );

      let v = sub(com1.p0, B0);

      // first-order projection onto tangent
      let t0 = dot(v, D0) / dot(D0, D0);

      // refine with one Newton iteration (optional but cheap)
      let P = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], t0);
      let dP = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, t0);
      let r = sub(P, com1.p0);

      t0 -= dot(r, dP) / dot(dP, dP);

      // construct merged cubic over [t0, 1]
      let Q0 = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], t0);
      let Q3 = com2.p;

      let d0 = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, t0);
      let d1 = cubicDerivative(com2.p0, com2.cp1, com2.cp2, com2.p, 1);

      let scale = 1 - t0;

      let Q1 = add(Q0, mul(d0, scale / 3));
      let Q2 = sub(Q3, mul(d1, scale / 3));

      let result = {
          p0: Q0,
          cp1: Q1,
          cp2: Q2,
          p: Q3,
          t0
      };

      if (reverse) {
          result = {
              p0: Q3,
              cp1: Q2,
              cp2: Q1,
              p: Q0,
              t0
          };
      }

      let tMid = (1 - t0) * 0.5;

      let ptM = pointAtT([result.p0, result.cp1, result.cp2, result.p], tMid, false, true);
      let seg1_cp2 = ptM.cpts[2];

      let ptI_1 = checkLineIntersection(ptM, seg1_cp2, result.p0, ptI, false);
      let ptI_2 = checkLineIntersection(ptM, seg1_cp2, result.p, ptI, false);

      let cp1_2 = interpolate(result.p0, ptI_1, 1.333  );
      let cp2_2 = interpolate(result.p, ptI_2, 1.333  );

      // test self intersections and exit 
      let cp_intersection = checkLineIntersection(com1_o.p0, cp1_2, com2_o.p, cp2_2, true);
      if (cp_intersection) {

          return commands;
      }

      result.cp1 = cp1_2;
      result.cp2 = cp2_2;

      // check distances between original starting point and extrapolated
      let dist3 = getDistAv(com1_o.p0, result.p0);
      let dist4 = getDistAv(com2_o.p, result.p);
      let dist5 = (dist3 + dist4);

      // use original points
      result.p0 = com1_o.p0;
      result.p = com2_o.p;
      result.extreme = com2_o.extreme;
      result.corner = com2_o.corner;
      result.dimA = com2_o.dimA;
      result.directionChange = com2_o.directionChange;
      result.type = 'C';
      result.values = [result.cp1.x, result.cp1.y, result.cp2.x, result.cp2.y, result.p.x, result.p.y];

      // extrapolated starting point is not completely off
      if (dist5 < maxDist) {

          /*
          let tTotal = 1 + Math.abs(t0);
          let tSplit = reverse ? 1 + t0 : Math.abs(t0);

          let pO = pointAtT([com2_o.p0, com2_o.cp1, com2_o.cp2, com2_o.p], t0);
  */

          // split t to meet original mid segment start point
          let tSplit = reverse ? 1 + t0 : Math.abs(t0);

          let tTotal = 1 + Math.abs(t0);
          tSplit = reverse ? 1 + t0 : Math.abs(t0) / tTotal;

          let ptSplit = pointAtT([result.p0, result.cp1, result.cp2, result.p], tSplit);
          let distSplit = getDistAv(ptSplit, com1.p);

          // not close enough - exit
          if (distSplit > maxDist * tolerance ) {

              return commands;
          }

          // compare combined with original area
          let pathData0 = [
              { type: 'M', values: [com1_o.p0.x, com1_o.p0.y] },
              { type: 'C', values: [com1_o.cp1.x, com1_o.cp1.y, com1_o.cp2.x, com1_o.cp2.y, com1_o.p.x, com1_o.p.y] },
              { type: 'C', values: [com2_o.cp1.x, com2_o.cp1.y, com2_o.cp2.x, com2_o.cp2.y, com2_o.p.x, com2_o.p.y] },
          ];

          let area0 = getPathArea(pathData0);
          let pathDataN = [
              { type: 'M', values: [result.p0.x, result.p0.y] },
              { type: 'C', values: [result.cp1.x, result.cp1.y, result.cp2.x, result.cp2.y, result.p.x, result.p.y] },
          ];

          let areaN = getPathArea(pathDataN);
          let areaDiff = Math.abs(areaN / area0 - 1);

          result.error = areaDiff * 5 * tolerance;

          if (debug) {
              pathDataToD(pathDataN);

          }

          // success!!!
          if (areaDiff < 0.05 * tolerance) {
              commands = [result];

          } 
      }

      return commands

  }

  function simplifyPathDataCubic(pathData, {
      keepExtremes = true,
      keepInflections = true,
      keepCorners = true,
      extrapolateDominant = true,
      tolerance = 1,
  } = {}) {

      let pathDataN = [pathData[0]];
      let l = pathData.length;

      for (let i = 2; l && i <= l; i++) {
          let com = pathData[i - 1];
          let comN = i < l ? pathData[i] : null;
          let typeN = comN?.type || null;

          let { type, values, p0, p, cp1 = null, cp2 = null, extreme = false, directionChange = false, corner = false, dimA = 0 } = com;

          // next is also cubic
          if (type === 'C' && typeN === 'C') {

              // cannot be combined as crossing extremes or corners
              if (
                  (keepCorners && corner) ||
                  (keepExtremes && extreme)
              ) {

                  pathDataN.push(com);
              }

              // try simplification
              else {

                  let combined = combineCubicPairs(com, comN, { tolerance });
                  let error = 0;

                  // combining successful! try next segment
                  if (combined.length === 1) {
                      com = combined[0];
                      let offset = 1;

                      // add cumulative error to prevent distortions
                      error += com.error;

                      // find next candidates
                      for (let n = i + 1; error < tolerance && n < l; n++) {
                          let comN = pathData[n];

                          if (comN.type !== 'C' ||
                              (
                                  (keepInflections && com.directionChange) ||
                                  (keepCorners && com.corner) ||
                                  (keepExtremes && com.extreme)
                              )
                          ) {
                              break
                          }

                          let combined = combineCubicPairs(com, comN, { tolerance });

                          // failure - could not be combined - exit loop
                          if (combined.length > 1) {
                              break
                          }

                          /**
                           * success
                           * add cumulative error to prevent distortions
                           */

                          error += combined[0].error * 0.5;
                          offset++;

                          // return combined
                          com = combined[0];
                      }

                      pathDataN.push(com);

                      // skip to next candidates
                      if (i < l) {
                          i += offset;
                      }

                  } else {
                      pathDataN.push(com);
                  }
              }

          } // end of bezier command

          // other commands
          else {
              pathDataN.push(com);
          }

      } // end command loop

      return pathDataN
  }

  function combineCubicPairs(com1, com2, {
      tolerance = 1
  } = {}) {

      let commands = [com1, com2];

      // assume 2 segments are result of a segment split
      let t = findSplitT(com1, com2);

      // quit if t is start
      if (!t) return commands;

      let distAv1 = getDistManhattan(com1.p0, com1.p);
      let distAv2 = getDistManhattan(com2.p0, com2.p);
      let distMin = Math.max(0, Math.min(distAv1, distAv2));

      let distScale = 0.08;
      let maxDist = distMin * distScale * tolerance;

      // get hypothetical combined command
      let comS = getExtrapolatedCommand(com1, com2, t);

      // test new point-at-t against original mid segment starting point
      let pt = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t);

      let dist0 = getDistManhattan(com1.p, pt);
      let dist1 = 0, dist2 = 0;
      let close = dist0 < maxDist;
      let success = false;

      // collect error data
      let error = dist0;

      if (close) {

          /**
           * check additional points
           * to prevent distortions
           */

          // 2nd segment mid
          let pt_2 = pointAtT([com2.p0, com2.cp1, com2.cp2, com2.p], 0.5);

          // simplified path
          let t3 = (1 + t) * 0.5;
          let ptS_2 = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t3);
          dist1 = getDistManhattan(pt_2, ptS_2);

          error += dist1;

          if (dist1 < maxDist) {

              // 1st segment mid
              let pt_1 = pointAtT([com1.p0, com1.cp1, com1.cp2, com1.p], 0.5);

              let t2 = t * 0.5;
              let ptS_1 = pointAtT([comS.p0, comS.cp1, comS.cp2, comS.p], t2);
              dist2 = getDistManhattan(pt_1, ptS_1);

              error += dist2;

              if (error < maxDist) success = true;

          }

      } // end 1st try

      // add meta
      if (success) {

          // correct to exact start and end points
          comS.p0 = com1.p0;
          comS.p = com2.p;

          comS.dimA = getDistManhattan(comS.p0, comS.p);
          comS.type = 'C';
          comS.extreme = com2.extreme;
          comS.directionChange = com2.directionChange;

          comS.corner = com2.corner;

          comS.values = [comS.cp1.x, comS.cp1.y, comS.cp2.x, comS.cp2.y, comS.p.x, comS.p.y];

          // relative error
          comS.error = error / maxDist;

          commands = [comS];

      }

      return commands;
  }

  function getExtrapolatedCommand(com1, com2, t = 0) {

      let { p0, cp1 } = com1;
      let { p, cp2 } = com2;

      // extrapolate control points
      cp1 = {
          x: (cp1.x - (1 - t) * p0.x) / t,
          y: (cp1.y - (1 - t) * p0.y) / t
      };

      cp2 = {
          x: (cp2.x - t * p.x) / (1 - t),
          y: (cp2.y - t * p.y) / (1 - t)
      };

      return { p0, cp1, cp2, p };
  }

  function findSplitT(com1, com2) {
      // distances between 1st and 2nd segment cpt to mid point
      let l1 = getDistManhattan(com1.cp2, com1.p);

      // exit for zero length control point vectors
      if (l1 === 0) {

          return 0;
      }

      let l2 = getDistManhattan(com1.p, com2.cp1);
      if (l2 === 0) {

          return 0;
      }

      // dist between both segments' control points
      let l3 = getDistManhattan(com1.cp2, com2.cp1);

      /*
      // exit for zero length control point vectors
      if(l1===0 || l2===0 || l1===l3 || l2===l3) {
          console.log('!quit');
          return 0;
      }
      */

      return l1 / l3
  }

  function commandIsFlat(points, {
      tolerance = 1,
      debug=false
  } = {}) {

      let isFlat=false;
      let report = {
          flat:true,
          steepness:0
      };

      let p0 = points[0];
      let p = points[points.length - 1];

      let xSet = new Set([...points.map(pt => +pt.x.toFixed(8))]);
      let ySet = new Set([...points.map(pt => +pt.y.toFixed(8))]);

      // must be flat
      if(xSet.size===1 || ySet.size===1) return !debug ? true : report;

      let squareDist = getSquareDistance(p0, p);
      let threshold = squareDist / 1000 * tolerance;
      let area = getPolygonArea(points, true);

      // flat enough
      if(area < threshold) isFlat = true;

      if(debug){
          report.flat = isFlat;

          report.steepness = area/squareDist*10;
      }

      return !debug ? isFlat : report;
  }

  /**
   * create pathdata super set 
   * including geometrical properties such as:
   * segment introduces x/y extreme
   * corner
   * inflection/direction change
   */

  function analyzePathData(pathData = [], {
      detectExtremes = true,
      detectCorners = true,
      detectDirection = true,
      detectSemiExtremes = false,
      debug = false,
      addSquareLength = true,
      addArea = true,

  } = {}) {

      // get verbose control point data
      pathData = getPathDataVerbose(pathData, { addSquareLength, addArea });

      // new pathdata adding properties
      let pathDataPlus = [];

      let pathPoly = getPathDataVertices(pathData);
      let bb = getPolyBBox(pathPoly);
      let { left, right, top, bottom, width, height } = bb;

      // init starting point data
      pathData[0].corner = false;
      pathData[0].extreme = false;
      pathData[0].semiExtreme = false;
      pathData[0].directionChange = false;
      pathData[0].closePath = false;

      // add first M command
      let pathDataProps = [pathData[0]];
      let len = pathData.length;

      // threshold for corner angles: 10 deg

      // define angle threshold for semi extremes

      for (let c = 2; len && c <= len; c++) {

          let com = pathData[c - 1];
          let { type, values, p0, p, cp1 = null, cp2 = null, squareDist = 0, cptArea = 0, dimA = 0 } = com;

          let comN = pathData[c] || null;

          // init properties
          com.corner = false;
          com.extreme = false;
          com.semiExtreme = false;
          com.directionChange = false;
          com.closePath = false;

          // get command points  
          let commandPts = (type === 'C' || type === 'Q') ?
              (type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p]) :
              ([p0, p]);
          let thresholdLength = dimA * 0.1;
          let threshold = thresholdLength * 0.01;

          // bezier types
          let isBezier = type === 'Q' || type === 'C';
          let isBezierN = comN && (comN.type === 'Q' || comN.type === 'C');

          /**
           * detect extremes
           * local or absolute 
           */
          let hasExtremes = false;

          if (isBezier) {

              let dx = type === 'C' ? Math.abs(com.cp2.x - com.p.x) : Math.abs(com.cp1.x - com.p.x);
              let dy = type === 'C' ? Math.abs(com.cp2.y - com.p.y) : Math.abs(com.cp1.y - com.p.y);

              let horizontal = (dy === 0 || dy <= threshold) && dx > 0;
              let vertical = (dx === 0 || dx <= threshold) && dy > 0;

              if (horizontal || vertical) {
                  hasExtremes = true;
              }

              // is extreme relative to bounding box 

              // (cp1.x===p0.x && cp1.y!==p0.y  ) ||
              if ((cp1.x === p0.x && cp1.y !== p0.y) || (cp1.y === p0.y && cp1.x !== p0.x)) {

                  pathDataProps[pathDataProps.length - 1].extreme = true;

              }

              if ((p.x === left || p.y === top || p.x === right || p.y === bottom)) {
                  hasExtremes = true;
              }

              // interpret segment as extreme if it has an implicit extreme
              if (!hasExtremes) {
                  let couldHaveExtremes = bezierhasExtreme(null, commandPts);
                  if (couldHaveExtremes) {
                      let tArr = getTatAngles(commandPts);

                      if (tArr.length && (tArr[0] > 0.2)) {
                          hasExtremes = true;
                      }
                  }
              }
          }

          if (hasExtremes) com.extreme = true;

          // Corners and semi extremes 
          if (isBezier && isBezierN) {

              // semi extremes
              if (detectSemiExtremes && !com.extreme) {

                  let dx1 = Math.abs(p.x - cp2.x);
                  let dy1 = Math.abs(p.y - cp2.y);
                  let hasSemiExtreme = false;

                  // exclude extremes or small deltas
                  if (dx1 && dy1 && dx1 > thresholdLength || dy1 > thresholdLength) {
                      let ang1 = getAngle(cp2, p);
                      let ang2 = getAngle(p, comN.cp1);

                      let ang3 = Math.abs(ang1 + ang2) / 2;
                      hasSemiExtreme = isMultipleOf45(ang3);
                  }

                  if (hasSemiExtreme) {
                      com.semiExtreme = true;
                  }
              }

              /**
               * Detect direction change points
               * this will prevent distortions when simplifying
               * e.g in the "spine" of an "S" glyph
               */
              let signChange = (com.cptArea < 0 && comN.cptArea > 0) || (com.cptArea > 0 && comN.cptArea < 0) ? true : false;

              if (signChange) com.directionChange = true;

              // check corners
              if (!com.extreme) {

                  let cp_0 = cp2 ? cp2 : cp1;
                  let cp_1 = comN.cp1;

                  let areaCpt = getPolygonArea([cp_0, p, cp_1], false);
                  let threshArea = getSquareDistance(cp_0, cp_1) * 0.01;
                  let isFlat = Math.abs(areaCpt) < threshArea;

                  let signChange2 = (areaCpt < 0 && com.cptArea > 0) || (areaCpt > 0 && com.cptArea < 0) ? true : false;

                  let isCorner = !isFlat && signChange2;
                  if (isCorner) com.corner = true;
              }
          }

          pathDataProps.push(com);

      }

      
      if (debug) {
          pathDataProps.forEach(com=>{

              if (com.directionChange) renderPoint(markers, com.p, 'orange', '1.5%', '0.5');
              if (com.corner) renderPoint(markers, com.p, 'magenta', '1.5%', '0.5');
              if (com.extreme) renderPoint(markers, com.p, 'cyan', '1%', '0.5');
          });
      }

      let dimA = (width + height) / 2;

      pathDataPlus = { pathData: pathDataProps, bb: bb, dimA: dimA };

      return pathDataPlus

  }

  /**
   * create pathdata super set 
   * including geometrical properties such as:
   * start and end points
   * segment square distances and areas
   * elliptic arc parameters
   */
  function getPathDataVerbose(pathData, {
      addSquareLength = true,
      addArea = false,
      addArcParams = false,
      addAverageDim = true
  } = {}) {

      // initial starting point coordinates
      let com0 = pathData[0];
      let M = { x: com0.values[0], y: com0.values[1] };
      let p0 = M;
      let p = M;

      com0.p0 = p0;
      com0.p = p;
      com0.idx = 0;
      com0.dimA = 0;

      let len = pathData.length;
      let pathDataVerbose = [com0];

      for (let i = 1; i < len; i++) {
          let com = pathData[i];
          let { type, values } = com;
          let valuesLen = values.length;

          p = valuesLen ? { x: values[valuesLen - 2], y: values[valuesLen - 1] } : M;
          let cp1, cp2;

          // add on-path points
          com.p0 = p0;
          com.p = p;
          com.dimA = getDistManhattan(p0, p);

          // update M for Z starting points
          if (type === 'M') {
              M = p;
          }

          // add bezier control point properties
          if (type === 'Q' || type === 'C') {
              cp1 = { x: values[0], y: values[1] };
              cp2 = type === 'C' ? { x: values[2], y: values[3] } : null;
              com.cp1 = cp1;
              if (cp2) {
                  com.cp2 = cp2;
              }
          }

          else if (type === 'A' && addArcParams) {
              let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle } = svgArcToCenterParam(p0.x, p0.y, ...values);
              com.cx = cx;
              com.cy = cy;
              com.rx = rx;
              com.ry = ry;
              com.xAxisRotation = values[2] / 180 * Math.PI;
              com.largeArc = values[3];
              com.sweep = values[4];
              com.startAngle = startAngle;
              com.endAngle = endAngle;
              com.deltaAngle = deltaAngle;
          }

          /**
           * explicit and implicit linetos 
           * - introduced by Z
           */
          if (type === 'Z') {
              // if Z introduces an implicit lineto with a length
              if (M.x !== p.x && M.y !== p.y) {
                  com.closePath = true;
              }
          }

          if (addSquareLength) {
              com.squareDist = getSquareDistance(p0, p);
          }

          if (addArea) {
              let cptArea = 0;
              if (type === 'C') cptArea = getPolygonArea([p0, cp1, cp2, p], false);
              if (type === 'Q') cptArea = getPolygonArea([p0, cp1, p], false);
              com.cptArea = cptArea;
          }

          com.idx = i;

          // update previous point
          p0 = p;
          pathDataVerbose.push(com);
      }

      return pathDataVerbose;
  }

  const commandSet = new Set([
      0x4D, 0x6D, 0x41, 0x61, 0x43, 0x63,
      0x4C, 0x6C, 0x51, 0x71, 0x53, 0x73,
      0x54, 0x74, 0x48, 0x68, 0x56, 0x76,
      0x5A, 0x7A
  ]);

  const paramCountsArr = new Uint8Array(128);
  // M starting point
  paramCountsArr[0x4D] = 2;
  paramCountsArr[0x6D] = 2;

  // A Arc
  paramCountsArr[0x41] = 7;
  paramCountsArr[0x61] = 7;

  // C Cubic Bézier
  paramCountsArr[0x43] = 6;
  paramCountsArr[0x63] = 6;

  // L Line To
  paramCountsArr[0x4C] = 2;
  paramCountsArr[0x6C] = 2;

  // Q Quadratic Bézier
  paramCountsArr[0x51] = 4;
  paramCountsArr[0x71] = 4;

  // S Smooth Cubic Bézier
  paramCountsArr[0x53] = 4;
  paramCountsArr[0x73] = 4;

  // T Smooth Quadratic Bézier
  paramCountsArr[0x54] = 2;
  paramCountsArr[0x74] = 2;

  // H Horizontal Line
  paramCountsArr[0x48] = 1;
  paramCountsArr[0x68] = 1;

  // V Vertical Line
  paramCountsArr[0x56] = 1;
  paramCountsArr[0x76] = 1;

  // Z Close Path
  paramCountsArr[0x5A] = 0;
  paramCountsArr[0x7A] = 0;

  const SPECIAL_SPACES = new Set([
      0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
      0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
  ]);

  const isSpace = (ch) => {
      return (ch === 0x20) || (ch === 0x002C) || // White spaces or comma
          (ch === 0x0A) || (ch === 0x0D) ||   // nl cr
          (ch === 0x2028) || (ch === 0x2029) || // Line terminators
          (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
          (ch >= 0x1680 && SPECIAL_SPACES.has(ch));
  };

  const sanitizeArc = (val='', valueIndex=0) => {
      let valLen = val.length;

      // large arc and sweep
      if (valueIndex === 3 && valLen === 2) {

          val = [+val[0], +val[1]];
          valueIndex++;
      }

      // sweep and final
      else if (valueIndex === 4 && valLen > 1) {

          val = [+val[0], +val.substring(1)];
          valueIndex++;
      }

      // large arc, sweep and final pt combined
      else if (valueIndex === 3 && valLen >= 3) {

          val = [+val[0], +val[1], +val.substring(2)];
          valueIndex += 2;
      }
      else {
          val = [+val];
      }

      return {val,valueIndex} ;

  };

  function parsePathDataString(d, debug = true, limit=0) {
      if(!d) return []
      d = d.trim();

      if(limit) console.log('!!!limit', limit);

      let pathDataObj = {
          pathData: [],
          hasRelatives: false,
          hasShorthands: false,
          hasArcs: false,
          hasQuadratics: false,
          isPolygon: false,
          log:[]
      };

      if (d === '') {
          return pathDataObj
      }

      let i = 0, len = d.length;
      let lastCommand = "";

      let itemCount = -1;
      let val = '';
      let wasE = false;
      let floatCount = 0;
      let valueIndex = 0;
      let maxParams = 0;
      let needsNewSegment = false;
      let foundCommands = new Set([]);

      // collect errors 

      let feedback;

      const addSeg = () => {
          // Create new segment if needed before adding the minus sign
          if (needsNewSegment) {

              // sanitize implicit linetos
              if (lastCommand === 'M') lastCommand = 'L';
              else if (lastCommand === 'm') lastCommand = 'l';

              pathDataObj.pathData.push({ type: lastCommand, values: [] });

              itemCount++;
              valueIndex = 0;
              needsNewSegment = false;
          }
      };

      const pushVal = (checkFloats = false) => {

          // regular value or float
          if (!checkFloats ? val !== '' : floatCount > 0) {

              // error: no first command
              if (debug && itemCount === -1) {

                  feedback = 'Pathdata must start with M command';
                  pathDataObj.log.push(feedback);

                  // add M command to collect subsequent errors
                  lastCommand = 'M';
                  pathDataObj.pathData.push({ type: lastCommand, values: [] });
                  maxParams = 2;
                  valueIndex = 0;
                  itemCount++;

              }

              if (lastCommand === 'A' || lastCommand === 'a') {
                  ({val,valueIndex}  = sanitizeArc(val, valueIndex));

                  pathDataObj.pathData[itemCount].values.push(...val);

              } else {
                  // error: leading zeroes
                  if (debug && val[1] && val[1] !== '.' && val[0] === '0') {
                      feedback = `${itemCount}. command: Leading zeros not valid: ${val}`;
                      pathDataObj.log.push(feedback);
                  }
                  pathDataObj.pathData[itemCount].values.push(+val);
              }

              valueIndex++;
              val = '';
              floatCount = 0;

              // Mark that a new segment is needed if maxParams is reached
              needsNewSegment = valueIndex >= maxParams;

          }
      };

      const validateCommand = () => {

          if (itemCount > 0) {
              let lastCom = pathDataObj.pathData[itemCount];
              let valLen = lastCom.values.length;

              if ((valLen && valLen < maxParams) || (valLen && valLen > maxParams) || ((lastCommand === 'z' || lastCommand === 'Z') && valLen > 0)) {
                  let diff = maxParams - valLen;
                  feedback = `${itemCount}. command of type "${lastCommand}": ${diff} values too few - ${maxParams} expected`;

                  let prevFeedback = pathDataObj.log[pathDataObj.log.length - 1];

                  if (prevFeedback !== feedback) {
                      pathDataObj.log.push(feedback);
                  }
              }
          }
      };

      let isE = false;
      let isMinusorPlus = false;
      let isDot = false;
      let charCode='';

      while (i < len) {

          charCode = d.charCodeAt(i);

          let isDigit = (charCode > 47 && charCode < 58);
          if (!isDigit) {
              isE = (charCode === 101 || charCode === 69);
              isMinusorPlus = (charCode === 45 || charCode === 43);
              isDot = charCode === 46;
          }

          /**
           * number related:
           * digit, e-notation, dot or -/+ operator
           */

          if (
              isDigit ||
              isMinusorPlus ||
              isDot ||
              isE
          ) {

              // minus or float/dot separated: 0x2D=hyphen; 0x2E=dot
              if (!wasE && (charCode === 0x2D || charCode === 0x2E)) {

                  // checkFloats changes condition for value adding
                  let checkFloats = charCode === 0x2E;

                  // new val
                  pushVal(checkFloats);

                  // new segment
                  addSeg();

                  // concatenated floats
                  if (checkFloats) {
                      floatCount++;
                  }
              }

              // regular splitting
              else {

                  addSeg();
              }

              val += d[i];

              // e/scientific notation in value
              wasE = isE;
              i++;
              continue;
          }

          /**
           * Separated by white space 
           */
          if ((charCode < 48 || charCode > 5759) && isSpace(charCode)) {

              // push value
              pushVal();

              i++;
              continue;
          }

          /**
           * New command introduced by
           * alphabetic A-Z character
           */
          if (charCode > 64) {

              // is valid command
              let isValid = commandSet.has(charCode);

              if (!isValid) {
                  feedback = `${itemCount}. command "${d[i]}" is not a valid type`;
                  pathDataObj.log.push(feedback);
                  i++;
                  continue
              }

              // command is concatenated without whitespace
              if (val !== '') {
                  pathDataObj.pathData[itemCount].values.push(+val);
                  valueIndex++;
                  val = '';
              }

              // check if previous command was correctly closed
              if (debug) validateCommand();

              lastCommand = d[i];
              maxParams = paramCountsArr[charCode];
              let isM = lastCommand === 'M' || lastCommand === 'm';
              let wasClosePath = itemCount > 0 && (pathDataObj.pathData[itemCount].type === 'z' || pathDataObj.pathData[itemCount].type === 'Z');

              foundCommands.add(lastCommand);

              // add omitted M command after Z
              if (wasClosePath && !isM) {
                  pathDataObj.pathData.push({ type: 'm', values: [0, 0] });
                  itemCount++;
              }

              // init new command
              pathDataObj.pathData.push({ type: lastCommand, values: [] });
              itemCount++;

              // reset counters
              floatCount = 0;
              valueIndex = 0;
              needsNewSegment = false;

              i++;
              continue;
          }

          // exceptions - prevent infinite loop
          if (!isDigit) {
              feedback = `${itemCount}. ${d[i]} is not a valid separarator or token`;
              pathDataObj.log.push(feedback);
              val = '';
          }

          i++;

      }

      // final value
      pushVal();
      if (debug) validateCommand();

      // return error log
      if (debug && pathDataObj.log.length) {
          feedback = 'Invalid path data:\n' + pathDataObj.log.join('\n');
          if (debug === 'log') {
              console.log(feedback);
          } else {

              console.warn(feedback);
          }
      }

      pathDataObj.pathData[0].type = 'M';

      /**
       * check if absolute/relative or 
       * shorthands are present
       * to specify if normalization is required
       */

      let commands = Array.from(foundCommands).join('');

      pathDataObj.hasRelatives = /[lcqamtsvh]/g.test(commands);
      pathDataObj.hasShorthands = /[vhst]/gi.test(commands);
      pathDataObj.hasArcs = /[a]/gi.test(commands);
      pathDataObj.hasQuadratics = /[qt]/gi.test(commands);
      pathDataObj.isPolygon = /[cqats]/gi.test(commands) ? false : true;

      return pathDataObj

  }

  function stringifyPathData(pathData) {
      return pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
  }

  function parsePathDataNormalized(d,
      {
          // necessary for most calculations
          toAbsolute = true,
          toLonghands = true,

          // not necessary unless you need cubics only
          quadraticToCubic = false,

          // mostly a fallback if arc calculations fail      
          arcToCubic = false,
          // arc to cubic precision - adds more segments for better precision     
          arcAccuracy = 4,
      } = {}
  ) {

      // is already array
      let isArray = Array.isArray(d);

      // normalize native pathData to regular array
      let hasConstructor = isArray && typeof d[0] === 'object' && typeof d[0].constructor === 'function';
      /*
      if (hasConstructor) {
          d = d.map(com => { return { type: com.type, values: com.values } })
          console.log('hasConstructor', hasConstructor, (typeof d[0].constructor), d);
      }
      */

      let pathDataObj = isArray ? d : parsePathDataString(d);

      let { hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true } = pathDataObj;
      let pathData = hasConstructor ? pathDataObj : pathDataObj.pathData;

      // normalize
      pathData = normalizePathData(pathData,
          {
              toAbsolute, toLonghands, quadraticToCubic, arcToCubic, arcAccuracy,
              hasRelatives, hasShorthands, hasQuadratics, hasArcs
          },
      );

      return pathData;
  }

  function convertPathData(pathData, {
      toShorthands = true,
      toLonghands = false,
      toRelative = true,
      toMixed = false,
      toAbsolute = false,
      decimals = 3,
      arcToCubic = false,
      quadraticToCubic = false,

      // assume we need full normalization
      hasRelatives = true,
      hasShorthands = true,
      hasQuadratics = true,
      hasArcs = true,
      isPoly = false,
      optimizeArcs = true,
      testTypes = false

  } = {}) {

      let pathDataAbs = [];

      // pathdata properties - test= true adds a manual test 
      if (testTypes) {

          let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
          hasRelatives = /[lcqamts]/gi.test(commands);
          hasQuadratics = /[qt]/gi.test(commands);
          hasArcs = /[a]/gi.test(commands);
          hasShorthands = /[vhst]/gi.test(commands);
          isPoly = /[mlz]/gi.test(commands);
      }

      // some params exclude each other
      toRelative = toAbsolute ? false : toRelative;

      toShorthands = toLonghands ? false : toShorthands;

      if (toAbsolute) pathData = pathDataToAbsolute(pathData);
      if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData);

      // minify semicircle radii
      if (optimizeArcs) pathData = optimizeArcPathData(pathData);

      if (toShorthands) pathData = pathDataToShorthands(pathData);

      if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData);

      if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);

      if(toMixed) toRelative = true;

      // pre round - before relative conversion to minimize distortions
      if (decimals > -1 && toRelative) pathData = roundPathData(pathData, decimals);

      // clone absolute pathdata
      if(toMixed){
          pathDataAbs = JSON.parse(JSON.stringify(pathData));
      }

      if (toRelative) pathData = pathDataToRelative(pathData);
      if (decimals > -1) pathData = roundPathData(pathData, decimals);

      // choose most compact commands: relative or absolute
      if(toMixed){
          for(let i=0; i<pathData.length; i++){
              let com = pathData[i];
              let comA = pathDataAbs[i];
              // compare Lengths
              let comStr = [com.type, com.values.join(' ')].join('').replaceAll(' -', '-').replaceAll(' 0.', ' .');
              let comStrA = [comA.type, comA.values.join(' ')].join('').replaceAll(' -', '-').replaceAll(' 0.', ' .');

              let lenR = comStr.length;
              let lenA = comStrA.length;

              if(lenA<lenR){

                  pathData[i] = pathDataAbs[i];
              }
          }
      }

      return pathData
  }

  /**
   * 
   * @param {*} pathData 
   * @returns 
   */

  function optimizeArcPathData(pathData = []) {

      let remove =[];

      pathData.forEach((com, i) => {
          let { type, values } = com;
          if (type === 'A') {
              let [rx, ry, largeArc, x, y] = [values[0], values[1], values[3], values[5], values[6]];
              let comPrev = pathData[i - 1];
              let [x0, y0] = [comPrev.values[comPrev.values.length - 2], comPrev.values[comPrev.values.length - 1]];
              let M = { x: x0, y: y0 };
              let p = { x, y };

              if(rx===0 || ry===0){
                  pathData[i]= null;
                  remove.push(i);

              }

              // rx and ry are large enough
              if (rx >= 1 && (x === x0 || y === y0)) {
                  let diff = Math.abs(rx - ry) / rx;

                  // rx~==ry 
                  if (diff < 0.01) {

                      // test radius against mid point
                      let pMid = interpolate(M, p, 0.5);                    
                      let distM = getDistance(pMid, M);
                      let rDiff = Math.abs(distM - rx) / rx;

                      // half distance between mid and start point should be ~ equal
                      if(rDiff<0.01){
                          pathData[i].values[0] = 1;
                          pathData[i].values[1] = 1;
                          pathData[i].values[2] = 0;
                      }
                  }
              }
          }
      });

      if(remove.length) pathData = pathData.filter(Boolean);
      return pathData;
  }

  /**
   * parse normalized
   */

  function normalizePathData(pathData = [],
      {
          toAbsolute = true,
          toLonghands = true,
          quadraticToCubic = false,
          arcToCubic = false,
          arcAccuracy = 2,

          // assume we need full normalization
          hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true, testTypes = false

      } = {}
  ) {

      return convertPathData(pathData, { toAbsolute, toLonghands, quadraticToCubic, arcToCubic, arcAccuracy, hasRelatives, hasShorthands, hasQuadratics, hasArcs, testTypes, decimals: -1 })
  }

  /*
  export function normalizePathData(pathData = [],
      {
          toAbsolute = true,
          toLonghands = true,
          quadraticToCubic = false,
          arcToCubic = false,
          arcAccuracy = 2,

          // assume we need full normalization
          hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true, testTypes = false

      } = {}
  ) {

      // pathdata properties - test= true adds a manual test 
      if (testTypes) {

          let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
          hasRelatives = /[lcqamts]/gi.test(commands);
          hasQuadratics = /[qt]/gi.test(commands);
          hasArcs = /[a]/gi.test(commands);
          hasShorthands = /[vhst]/gi.test(commands);
          isPoly = /[mlz]/gi.test(commands);
      }

      if ((hasQuadratics && quadraticToCubic) || (hasArcs && arcToCubic)) {
          toLonghands = true
          toAbsolute = true
      }

      if (hasRelatives && toAbsolute) pathData = pathDataToAbsoluteOrRelative(pathData, false);
      if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData, -1, false);
      if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData, arcAccuracy);
      if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);

      return pathData;

  }
  */

  function revertCubicQuadratic(p0 = {}, cp1 = {}, cp2 = {}, p = {}, tolerance = 1) {

      // test if cubic can be simplified to quadratic
      let cp1X = interpolate(p0, cp1, 1.5);
      let cp2X = interpolate(p, cp2, 1.5);

      let dist0 = getDistManhattan(p0, p);
      let threshold = dist0 * 0.01 * tolerance;
      let dist1 = getDistManhattan(cp1X, cp2X);

      let cp1_Q = null;
      let type = 'C';
      let values = [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];
      let comN = { type, values };

      if (dist1 < threshold) {
          cp1_Q = checkLineIntersection(p0, cp1, p, cp2, false, true);
          if (cp1_Q) {

              comN.type = 'Q';
              comN.values = [cp1_Q.x, cp1_Q.y, p.x, p.y];
              comN.p0 = p0;
              comN.cp1 = cp1_Q;
              comN.cp2 = null;
              comN.p = p;
          }
      }

      return comN

  }

  /**
   * convert cubic circle approximations
   * to more compact arcs
   */

  function pathDataArcsToCubics(pathData, {
      arcAccuracy = 1
  } = {}) {

      let pathDataCubic = [pathData[0]];
      for (let i = 1, len = pathData.length; i < len; i++) {

          let com = pathData[i];
          let comPrev = pathData[i - 1];
          let valuesPrev = comPrev.values;
          let valuesPrevL = valuesPrev.length;
          let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

          if (com.type === 'A') {
              // add all C commands instead of Arc
              let cubicArcs = arcToBezier$1(p0, com.values, arcAccuracy);
              cubicArcs.forEach((cubicArc) => {
                  pathDataCubic.push(cubicArc);
              });
          }

          else {
              // add command
              pathDataCubic.push(com);
          }
      }

      return pathDataCubic

  }

  function pathDataQuadraticToCubic(pathData) {

      let pathDataQuadratic = [pathData[0]];
      for (let i = 1, len = pathData.length; i < len; i++) {

          let com = pathData[i];
          let comPrev = pathData[i - 1];
          let valuesPrev = comPrev.values;
          let valuesPrevL = valuesPrev.length;
          let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

          if (com.type === 'Q') {
              pathDataQuadratic.push(quadratic2Cubic(p0, com.values));
          }

          else {
              // add command
              pathDataQuadratic.push(com);
          }
      }

      return pathDataQuadratic
  }

  /**
   * convert quadratic commands to cubic
   */
  function quadratic2Cubic(p0, values) {
      if (Array.isArray(p0)) {
          p0 = {
              x: p0[0],
              y: p0[1]
          };
      }
      let cp1 = {
          x: p0.x + 2 / 3 * (values[0] - p0.x),
          y: p0.y + 2 / 3 * (values[1] - p0.y)
      };
      let cp2 = {
          x: values[2] + 2 / 3 * (values[0] - values[2]),
          y: values[3] + 2 / 3 * (values[1] - values[3])
      };
      return ({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, values[2], values[3]] });
  }

  /**
   * convert pathData to 
   * This is just a port of Dmitry Baranovskiy's 
   * pathToRelative/Absolute methods used in snap.svg
   * https://github.com/adobe-webplatform/Snap.svg/
   */

  function pathDataToAbsoluteOrRelative(pathData, toRelative = false, decimals = -1) {
      if (decimals >= 0) {
          pathData[0].values = pathData[0].values.map(val => +val.toFixed(decimals));
      }

      let len = pathData.length;
      let M = pathData[0].values;
      let x = M[0],
          y = M[1],
          mx = x,
          my = y;

      for (let i = 1; i < len; i++) {
          let com = pathData[i];
          let { type, values } = com;
          let vLen = values.length;
          let typeRel = type.toLowerCase();
          let typeAbs = type.toUpperCase();
          let typeNew = toRelative ? typeRel : typeAbs;

          if (type !== typeNew) {
              com.type = typeNew;

              switch (typeRel) {
                  case "a":
                      values[5] = toRelative ? values[5] - x : values[5] + x;
                      values[6] = toRelative ? values[6] - y : values[6] + y;
                      break;
                  case "v":
                      values[0] = toRelative ? values[0] - y : values[0] + y;
                      break;
                  case "h":
                      values[0] = toRelative ? values[0] - x : values[0] + x;
                      break;
                  case "m":
                      if (toRelative) {
                          values[0] -= x;
                          values[1] -= y;
                      } else {
                          values[0] += x;
                          values[1] += y;
                      }
                      mx = toRelative ? values[0] + x : values[0];
                      my = toRelative ? values[1] + y : values[1];
                      break;
                  default:
                      if (values.length) {
                          for (let v = 0; v < values.length; v++) {
                              values[v] = toRelative
                                  ? values[v] - (v % 2 ? y : x)
                                  : values[v] + (v % 2 ? y : x);
                          }
                      }
              }
          }

          switch (typeRel) {
              case "z":
                  x = mx;
                  y = my;
                  break;
              case "h":
                  x = toRelative ? x + values[0] : values[0];
                  break;
              case "v":
                  y = toRelative ? y + values[0] : values[0];
                  break;
              case "m":
                  mx = values[vLen - 2] + (toRelative ? x : 0);
                  my = values[vLen - 1] + (toRelative ? y : 0);
              default:
                  x = values[vLen - 2] + (toRelative ? x : 0);
                  y = values[vLen - 1] + (toRelative ? y : 0);
          }

          if (decimals >= 0) {
              com.values = com.values.map(val => +val.toFixed(decimals));
          }
      }
      return pathData;
  }

  function pathDataToRelative(pathData, decimals = -1) {
      return pathDataToAbsoluteOrRelative(pathData, true, decimals)
  }

  function pathDataToAbsolute(pathData, decimals = -1) {
      return pathDataToAbsoluteOrRelative(pathData, false, decimals)
  }

  /**
   * decompose/convert shorthands to "longhand" commands:
   * H, V, S, T => L, L, C, Q
   * reversed method: pathDataToShorthands()
   */

  function pathDataToLonghands(pathData, decimals = -1, test = true) {

      // analyze pathdata – if you're sure your data is already absolute skip it via test=false
      let hasRel = false;

      if (test) {
          let commandTokens = pathData.map(com => { return com.type }).join('');
          let hasShorthands = /[hstv]/gi.test(commandTokens);
          hasRel = /[astvqmhlc]/g.test(commandTokens);

          if (!hasShorthands) {
              return pathData;
          }
      }

      pathData = test && hasRel ? pathDataToAbsolute(pathData, decimals) : pathData;

      let pathDataLonghand = [];
      let comPrev = {
          type: "M",
          values: pathData[0].values
      };
      pathDataLonghand.push(comPrev);

      for (let i = 1, len = pathData.length; i < len; i++) {
          let com = pathData[i];
          let { type, values } = com;
          let valuesL = values.length;
          let valuesPrev = comPrev.values;
          let valuesPrevL = valuesPrev.length;
          let [x, y] = [values[valuesL - 2], values[valuesL - 1]];
          let cp1X, cp1Y, cpN1X, cpN1Y, cpN2X, cpN2Y, cp2X, cp2Y;
          let [prevX, prevY] = [
              valuesPrev[valuesPrevL - 2],
              valuesPrev[valuesPrevL - 1]
          ];
          switch (type) {
              case "H":
                  comPrev = {
                      type: "L",
                      values: [values[0], prevY]
                  };
                  break;
              case "V":
                  comPrev = {
                      type: "L",
                      values: [prevX, values[0]]
                  };
                  break;
              case "T":
                  [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                  [prevX, prevY] = [
                      valuesPrev[valuesPrevL - 2],
                      valuesPrev[valuesPrevL - 1]
                  ];
                  // new control point
                  cpN1X = prevX + (prevX - cp1X);
                  cpN1Y = prevY + (prevY - cp1Y);
                  comPrev = {
                      type: "Q",
                      values: [cpN1X, cpN1Y, x, y]
                  };
                  break;
              case "S":

                  [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                  [prevX, prevY] = [
                      valuesPrev[valuesPrevL - 2],
                      valuesPrev[valuesPrevL - 1]
                  ];

                  [cp2X, cp2Y] =
                      valuesPrevL > 2 && comPrev.type !== 'A' ?
                          [valuesPrev[2], valuesPrev[3]] :
                          [prevX, prevY];

                  // new control points
                  cpN1X = 2 * prevX - cp2X;
                  cpN1Y = 2 * prevY - cp2Y;
                  cpN2X = values[0];
                  cpN2Y = values[1];
                  comPrev = {
                      type: "C",
                      values: [cpN1X, cpN1Y, cpN2X, cpN2Y, x, y]
                  };

                  break;
              default:
                  comPrev = {
                      type: type,
                      values: values
                  };
          }
          // round final longhand values
          if (decimals > -1) {
              comPrev.values = comPrev.values.map(val => { return +val.toFixed(decimals) });
          }

          pathDataLonghand.push(comPrev);
      }
      return pathDataLonghand;
  }

  /**
   * apply shorthand commands if possible
   * L, L, C, Q => H, V, S, T
   * reversed method: pathDataToLonghands()
   */
  function pathDataToShorthands(pathData, decimals = -1, test = false) {

      /** 
      * analyze pathdata – if you're sure your data is already absolute skip it via test=false
      */
      let hasRel;
      if (test) {
          let commandTokens = pathData.map(com => { return com.type }).join('');
          hasRel = /[astvqmhlc]/g.test(commandTokens);
      }

      pathData = test && hasRel ? pathDataToAbsoluteOrRelative(pathData) : pathData;

      let len = pathData.length;
      let pathDataShorts = new Array(len);

      let comShort = pathData[0];
      pathDataShorts[0] = comShort;

      let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let p = p0;

      for (let i = 1; i < len; i++) {

          let com = pathData[i];
          comShort = com;
          let { type, values } = com;
          let valuesLen = values.length;
          let valuesLast = [values[valuesLen - 2], values[valuesLen - 1]];

          // previous command
          let comPrev = pathData[i - 1];

          p = { x: valuesLast[0], y: valuesLast[1] };

          // deltas for h or v
          let dx = Math.abs(p.x - p0.x);
          let dy = Math.abs(p.y - p0.y);
          let maxDist = getDistManhattan(p0, p) * 0.01;

          // first bezier control point for S/T shorthand tests
          let isShort = false, isHorizontal = false, isVertical = false;

          if ((type === 'C' && comPrev.type === 'C') || (type === 'Q' && comPrev.type === 'Q')) {
              let cpPrev = comPrev.type === 'C' ? { x: comPrev.values[2], y: comPrev.values[3] } : { x: comPrev.values[0], y: comPrev.values[1] };
              let cpFirst = { x: values[0], y: values[1] };

              let dx1 = (p0.x - cpPrev.x);
              let dy1 = (p0.y - cpPrev.y);

              maxDist = getDistManhattan(cpPrev, cpFirst) * 0.01;

              // reflected cp
              let cpR = { x: cpPrev.x + dx1 * 2, y: cpPrev.y + dy1 * 2 };
              let distCp = getDistManhattan(cpR, cpFirst);

              isShort = distCp < maxDist;

          }

          else if (type === 'L') {
              isHorizontal = dy === 0 || dy < maxDist;
              isVertical = dx === 0 || dx < maxDist;
              isShort = isVertical || isHorizontal;
          }

          switch (type) {
              case "L":
                  if (isHorizontal) {

                      comShort = {
                          type: "H",
                          values: [values[0]]
                      };
                  }

                  // V
                  if (isVertical) {

                      comShort = {
                          type: "V",
                          values: [values[1]]
                      };
                  }
                  break;

              case "Q":

                  if (isShort) {

                      comShort = {
                          type: "T",
                          values: [p.x, p.y]
                      };
                  }

                  break;
              case "C":
                  if (isShort) {

                      comShort = {
                          type: "S",
                          values: [values[2], values[3], p.x, p.y]
                      };
                  }
                  break;
              default:
                  comShort = {
                      type: type,
                      values: values
                  };
          }

          p0 = p;
          pathDataShorts[i] = comShort;
      }

      return pathDataShorts;
  }

  /**
   * Convert a parametrized SVG arc to cubic Beziers
   * Assumes arc parameters are already resolved
   */
  function arcToBezierResolved({

      // start / end points
      p0 = { x: 0, y: 0 },
      p = { x: 0, y: 0 },

      // center
      centroid = { x: 0, y: 0 },

      // radii
      rx = 0,
      ry = 0,

      // SVG-style rotation
      xAxisRotation = 0,
      radToDegree = false,

      // optional
      startAngle = null,
      endAngle = null,
      deltaAngle = null

  } = {}) {

      if (!rx || !ry) return [];

      // new pathData
      let pathData = [];

      // maximum delta for cubic approximations: Math.PI / 2 (90deg)
      const maxSegAngle = 1.5707963267948966;

      // Pomax cubic constant
      const k = 0.551785;

      // rotation
      let phi = radToDegree
          ? xAxisRotation
          : xAxisRotation * Math.PI / 180;

      let cosphi = Math.cos(phi);
      let sinphi = Math.sin(phi);

      // derive angles if not provided
      if (startAngle === null || endAngle === null || deltaAngle === null) {
          ({ startAngle, endAngle, deltaAngle } = getDeltaAngle(centroid, p0, p));
      }

      // parametrize for elliptic arcs
      let startAngleParam = rx !== ry ? toParametricAngle(startAngle, rx, ry) : startAngle;

      let deltaAngleParam = rx !== ry ? toParametricAngle(deltaAngle, rx, ry) : deltaAngle;

      let segments = Math.max(1, Math.ceil(Math.abs(deltaAngleParam) / maxSegAngle));
      let angStep = deltaAngleParam / segments;

      for (let i = 0; i < segments; i++) {

          const a = Math.abs(angStep) === maxSegAngle ?
              Math.sign(angStep) * k :
              (4 / 3) * Math.tan(angStep / 4);

          let cos0 = Math.cos(startAngleParam);
          let sin0 = Math.sin(startAngleParam);
          let cos1 = Math.cos(startAngleParam + angStep);
          let sin1 = Math.sin(startAngleParam + angStep);

          // unit arc → cubic
          let c1 = { x: cos0 - sin0 * a, y: sin0 + cos0 * a };
          let c2 = { x: cos1 + sin1 * a, y: sin1 - cos1 * a };
          let e = { x: cos1, y: sin1 };

          let values = [];

          [c1, c2, e].forEach(pt => {
              let x = pt.x * rx;
              let y = pt.y * ry;

              values.push(
                  cosphi * x - sinphi * y + centroid.x,
                  sinphi * x + cosphi * y + centroid.y
              );
          });

          pathData.push({
              type: 'C',
              values,
              cp1: { x: values[0], y: values[1] },
              cp2: { x: values[2], y: values[3] },
              p: { x: values[4], y: values[5] },
          });

          startAngleParam += angStep;
      }

      return pathData;
  }

  /** 
   * convert arctocommands to cubic bezier
   * based on puzrin's a2c.js
   * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
   * returns pathData array
  */

  function arcToBezier$1(p0, values, splitSegments = 1) {
      const TAU = Math.PI * 2;
      let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

      if (rx === 0 || ry === 0) {
          return []
      }

      let phi = rotation ? rotation * TAU / 360 : 0;
      let sinphi = phi ? Math.sin(phi) : 0;
      let cosphi = phi ? Math.cos(phi) : 1;
      let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2;
      let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2;

      if (pxp === 0 && pyp === 0) {
          return []
      }
      rx = Math.abs(rx);
      ry = Math.abs(ry);
      let lambda =
          pxp * pxp / (rx * rx) +
          pyp * pyp / (ry * ry);
      if (lambda > 1) {
          let lambdaRt = Math.sqrt(lambda);
          rx *= lambdaRt;
          ry *= lambdaRt;
      }

      /** 
       * parametrize arc to 
       * get center point start and end angles
       */
      let rxsq = rx * rx,
          rysq = rx === ry ? rxsq : ry * ry;

      let pxpsq = pxp * pxp,
          pypsq = pyp * pyp;
      let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq);

      if (radicant <= 0) {
          radicant = 0;
      } else {
          radicant /= (rxsq * pypsq) + (rysq * pxpsq);
          radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);
      }

      let centerxp = radicant ? radicant * rx / ry * pyp : 0;
      let centeryp = radicant ? radicant * -ry / rx * pxp : 0;
      let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2;
      let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2;

      let vx1 = (pxp - centerxp) / rx;
      let vy1 = (pyp - centeryp) / ry;
      let vx2 = (-pxp - centerxp) / rx;
      let vy2 = (-pyp - centeryp) / ry;

      // get start and end angle
      const vectorAngle = (ux, uy, vx, vy) => {
          let dot = +(ux * vx + uy * vy).toFixed(9);
          if (dot === 1 || dot === -1) {
              return dot === 1 ? 0 : Math.PI
          }
          dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot);
          let sign = (ux * vy - uy * vx < 0) ? -1 : 1;
          return sign * Math.acos(dot);
      };

      let ang1 = vectorAngle(1, 0, vx1, vy1),
          ang2 = vectorAngle(vx1, vy1, vx2, vy2);

      if (sweepFlag === 0 && ang2 > 0) {
          ang2 -= Math.PI * 2;
      }
      else if (sweepFlag === 1 && ang2 < 0) {
          ang2 += Math.PI * 2;
      }

      let ratio = +(Math.abs(ang2) / (TAU / 4)).toFixed(0) || 1;

      // increase segments for more accureate length calculations
      let segments = ratio * splitSegments;
      ang2 /= segments;
      let pathDataArc = [];

      // If 90 degree circular arc, use a constant
      // https://pomax.github.io/bezierinfo/#circles_cubic
      // k=0.551784777779014
      const angle90 = 1.5707963267948966;
      const k = 0.551785;
      let a = ang2 === angle90 ? k :
          (
              ang2 === -angle90 ? -k : 4 / 3 * Math.tan(ang2 / 4)
          );

      let cos2 = ang2 ? Math.cos(ang2) : 1;
      let sin2 = ang2 ? Math.sin(ang2) : 0;
      let type = 'C';

      const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
          let x1 = ang1 != ang2 ? Math.cos(ang1) : cos2;
          let y1 = ang1 != ang2 ? Math.sin(ang1) : sin2;
          let x2 = Math.cos(ang1 + ang2);
          let y2 = Math.sin(ang1 + ang2);

          return [
              { x: x1 - y1 * a, y: y1 + x1 * a },
              { x: x2 + y2 * a, y: y2 - x2 * a },
              { x: x2, y: y2 }
          ];
      };

      for (let i = 0; i < segments; i++) {
          let com = { type: type, values: [] };
          let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

          curve.forEach((pt) => {
              let x = pt.x * rx;
              let y = pt.y * ry;
              com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery);
          });
          pathDataArc.push(com);
          ang1 += ang2;
      }

      return pathDataArc;
  }

  function pathDataCubicsToArc(pathData, { areaThreshold = 2.5 } = {}) {

      for (let c = 0, l = pathData.length; c < l; c++) {
          let com = pathData[c];
          let comN = pathData[c + 1] || null;
          let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;

          if (type === 'C' && comN && comN.type === 'C') {
              let comA = cubicCommandToArc(p0, cp1, cp2, p, areaThreshold);
              let comAN = cubicCommandToArc(comN.p0, comN.cp1, comN.cp2, comN.p, areaThreshold);

              if (comA.isArc  && comAN.isArc) {

                  let dist = getDistManhattan(p0, comN.p);
                  let maxDist = dist * 0.01;
                  let dx = Math.abs(comN.p.x - p0.x);
                  let dy = Math.abs(comN.p.y - p0.y);

                  let horizontal = dy < maxDist && dx > maxDist;
                  let vertical = dx < maxDist && dy > maxDist;

                  let { rx, ry } = comA;
                  let area = getPolygonArea([p0, p, comN.p]);
                  let sweep = area < 0 ? 0 : 1;

                  if (vertical || horizontal) {
                      rx = Math.min(rx, comAN.rx);
                      ry = Math.min(ry, comAN.ry);
                      pathData[c] = null;
                      pathData[c + 1].type = 'A';
                      pathData[c + 1].values = [rx, ry, 0, 0, sweep, comN.p.x, comN.p.y];
                      continue
                  }
              }
          }
      }

      pathData = pathData.filter(Boolean);

      return pathData

  }

  function cubicCommandToArc(p0, cp1, cp2, p, tolerance = 7.5) {

      let com = { type: 'C', values: [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] };

      let arcSegArea = 0, isArc = false;

      // check angles
      let angle1 = getAngle(p0, cp1, true);
      let angle2 = getAngle(p, cp2, true);
      let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;

      let angleDiff = Math.abs((deltaAngle % 180) - 90);
      let isRightAngle = angleDiff < 3;

      let rx = 0;
      let ry = 0;
      let ptC;

      if (isRightAngle) {
          // point between cps

          // center point
          let cp1_r = rotatePoint(cp1, p0.x, p0.y, (Math.PI * -0.5));
          let cp2_r = rotatePoint(cp2, p.x, p.y, (Math.PI * 0.5));

          // assumed centroid
          ptC = checkLineIntersection(p0, cp1_r, p, cp2_r, false);

          let pI = checkLineIntersection(p0, cp1, p, cp2, false);

          if (pI) {

              let r1 = getDistance(p0, pI);
              let r2 = getDistance(p, pI);

              let rMax = +Math.max(r1, r2).toFixed(8);
              let rMin = +Math.min(r1, r2).toFixed(8);

              rx = rMin;
              ry = rMax;

              let arcArea = getPolygonArea([p0, cp1, cp2, p]);
              let sweep = arcArea < 0 ? 0 : 1;

              let w = Math.abs(p.x - p0.x);
              let h = Math.abs(p.y - p0.y);
              let landscape = w > h;

              let circular = (100 / rx * Math.abs(rx - ry)) < 5;

              if (circular) {

                  rx = rMax;
                  ry = rx;
              }

              if (landscape) {

                  rx = rMax;
                  ry = rMin;
              }

              // get original cubic area 
              let comO = [
                  { type: 'M', values: [p0.x, p0.y] },
                  { type: 'C', values: [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] }
              ];

              let comArea = getPathArea(comO);

              // new arc command
              let comArc = { type: 'A', values: [rx, ry, 0, 0, sweep, p.x, p.y] };

              // calculate arc seg area
              arcSegArea = (Math.PI * (rx * ry)) / 4;

              // subtract polygon between start, end and center point
              arcSegArea -= Math.abs(getPolygonArea([p0, p, pI]));

              let areaDiff = getRelativeAreaDiff(comArea, arcSegArea);

              if (areaDiff < tolerance) {
                  isArc = true;
                  com = comArc;
              }

          }
      }

      return { com: com, isArc, area: arcSegArea, rx, ry, centroid: ptC }

  }

  /*

  // combine adjacent arcs

  export function combineArcs(pathData) {

      let arcSeq = [[]]
      let ind = 0
      let arcIndices = [[]];
      let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] }, p;

      for (let i = 0, len = pathData.length; i < len; i++) {
          let com = pathData[i];
          let { type, values } = com;

          if (type === 'A') {

              let comPrev = pathData[i - 1];

              // previous p0 values might not be correct anymore due to cubic simplification
              let valsL = comPrev.values.slice(-2);
              p0 = { x: valsL[0], y: valsL[1] };

              let [rx, ry, xAxisRotation, largeArc, sweep, x, y] = values;

              // check if arc is circular
              let circular = (100 / rx * Math.abs(rx - ry)) < 5;

              p = { x: values[5], y: values[6] }
              com.p0 = p0;
              com.p = p;
              com.circular = circular;

              let comNext = pathData[i + 1];

              if (!arcSeq[ind].length && comNext && comNext.type === 'A') {
                  arcSeq[ind].push(com)
                  arcIndices[ind].push(i)
              }

              if (comNext && comNext.type === 'A') {
                  let [rx1, ry1, xAxisRotation0, largeArc, sweep, x, y] = comNext.values;
                  let diffRx = rx != rx1 ? 100 / rx * Math.abs(rx - rx1) : 0
                  let diffRy = ry != ry1 ? 100 / ry * Math.abs(ry - ry1) : 0

                  p = { x: comNext.values[5], y: comNext.values[6] }
                  comNext.p0 = p0;
                  comNext.p = p;

                  // add if radii are almost same
                  if (diffRx < 5 && diffRy < 5) {

                      arcSeq[ind].push(comNext)
                      arcIndices[ind].push(i + 1)
                  } else {

                      // start new segment
                      arcSeq.push([])
                      arcIndices.push([])
                      ind++

                  }
              }

              else {

                  arcSeq.push([])
                  arcIndices.push([])
                  ind++
              }
          }
      }

      if (!arcIndices.length) return pathData;

      arcSeq = arcSeq.filter(item => item.length)
      arcIndices = arcIndices.filter(item => item.length)

      // Process in reverse to avoid index shifting
      for (let i = arcSeq.length - 1; i >= 0; i--) {
          const seq = arcSeq[i];
          const start = arcIndices[i][0];
          const len = seq.length;

          // Average radii to prevent distortions
          let rxA = 0, ryA = 0;
          seq.forEach(({ values }) => {
              const [rx, ry] = values;
              rxA += rx;
              ryA += ry;
          });
          rxA /= len;
          ryA /= len;

          // Correct near-circular arcs

          // check if arc is circular
          let circular = (100 / rxA * Math.abs(rxA - ryA)) < 5;

          if (circular) {
              // average radii
              rxA = (rxA + ryA) / 2;
              ryA = rxA;
          }

          let comPrev = pathData[start - 1]
          let comPrevVals = comPrev.values.slice(-2)
          let M = { type: 'M', values: [comPrevVals[0], comPrevVals[1]] }

          if (len === 4) {

              let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[1].values;
              let [, , , , , x2, y2] = seq[3].values;

              let xDiff = Math.abs(x2 - x1);
              let yDiff = Math.abs(y2 - y1);
              let horizontal = xDiff > yDiff;

              if (circular) {
                  let adjustY = !horizontal ? rxA * 2 : 0;

                  // simplify radii
                  rxA = 1;
                  ryA = 1;
              }

              let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x1, y1] };
              let com2 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

              // This now correctly replaces the original 4 arc commands with 2
              pathData.splice(start, len, com1, com2);

          }

          else if (len === 3) {

              let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[0].values;
              let [rx2, ry2, , , , x2, y2] = seq[2].values;

              // must be large arc
              largeArc = 1;
              let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

              // replace
              pathData.splice(start, len, com1);

          }

          else if (len === 2) {

              let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = seq[0].values;
              let [rx2, ry2, , , , x2, y2] = seq[1].values;

              // if circular or non-elliptic xAxisRotation has no effect
              if (circular) {
                  rxA = 1;
                  ryA = 1;
                  xAxisRotation = 0;
              }

              // check if arc is already ideal
              let { p0, p } = seq[0];
              let [p0_1, p_1] = [seq[1].p0, seq[1].p];

              if (p0.x !== p_1.x || p0.y !== p_1.y) {

                  let com1 = { type: 'A', values: [rxA, ryA, xAxisRotation, largeArc, sweep, x2, y2] };

                  // replace
                  pathData.splice(start, len, com1);
              }
          }

          else {

          }
      }

      return pathData
  }

  export function combineCubicsToArcs(pathData = [], {
      threshold = 0,
  } = {}) {

      let l = pathData.length;
      let pathDataN = [pathData[0]];

      for (let i = 1; i < l; i++) {
          let com = pathData[i];
          let { type, cp1 = null, cp2 = null, p0, p } = com;
          let comP = pathData[i - 1];
          let comN = pathData[i + 1] ? pathData[i + 1] : null;
          let comN2 = pathData[i + 2] ? pathData[i + 2] : null;

          if (type === 'C' && comN && comN.type === 'C') {

              let thresh = getDistAv(p0, p) * 0.02;

              let dx1 = Math.abs(p0.x - cp1.x)
              let dy1 = Math.abs(p0.y - cp1.y)

              let isHorizontal1 = dy1 < thresh;
              let isVertical1 = dx1 < thresh;

              let dx2 = Math.abs(comN.p0.x - comN.cp1.x)
              let dy2 = Math.abs(comN.p0.y - comN.cp1.y)

              let isHorizontal2 = dy2 < thresh;
              let isVertical2 = dx2 < thresh;

              // check angles
              let angleDiff1 = (isHorizontal1 || isVertical1) ? 0 : Infinity;
              let angleDiff2 = (isHorizontal2 || isVertical2) ? 0 : Infinity;

              if (!isHorizontal1 && !isVertical1) {

                  let angle1 = getAngle(p0, cp1, true);
                  let angle2 = getAngle(p, cp2, true);
                  let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;
                  angleDiff1 = Math.abs((deltaAngle % 180) - 90);
              }

              if (!isHorizontal2 && !isVertical2) {

                  let angle1 = getAngle(p0, cp1, true);
                  let angle2 = getAngle(p, cp2, true);
                  let deltaAngle = Math.abs(angle1 - angle2) * 180 / Math.PI;
                  angleDiff2 = Math.abs((deltaAngle % 180) - 90);
              }

              let isRightAngle1 = angleDiff1 < 3;
              let isRightAngle2 = angleDiff2 < 3;

              let centroids = [];
              let poly = [];
              let rArr = []
              let largeArc = 0;

              // final on path point
              let p_a = p

              // 2  possible candidates - test radius
              if (isRightAngle1 && isRightAngle2) {

                  let pI = checkLineIntersection(p0, cp1, p, cp2, false);
                  let r1 = getDistance(p0, pI);
                  let r2 = getDistance(p, pI);
                  let rDiff1 = Math.abs(r1 - r2)

                  rArr.push(r1, r2)

                  poly.push(p0, p)
                  p_a = p

                  // 2 commands can be combined – similar radii  
                  if (rDiff1 < thresh) {

                      // add to polygon for sweep
                      poly.push(comN.p)

                      // update final point
                      p_a = comN.p

                      // approximate/average final center point for final radius
                      let cp1_r = rotatePoint(cp1, p0.x, p0.y, (Math.PI * -0.5))
                      let cp2_r = rotatePoint(cp2, p.x, p.y, (Math.PI * 0.5))

                      let cp1_r2 = rotatePoint(comN.cp1, comN.p0.x, comN.p0.y, (Math.PI * -0.5))
                      let cp2_r2 = rotatePoint(comN.cp2, comN.p.x, comN.p.y, (Math.PI * 0.5))

                      // assumed centroid
                      let ptC = checkLineIntersection(p0, cp1_r, p, cp2_r, false)
                      let ptC2 = checkLineIntersection(comN.p0, cp1_r2, comN.p, cp2_r2, false)
                      let distC = ptC && ptC2 ? getDistAv(ptC, ptC2) : Infinity

                      // 2 commands can definitely be combined 
                      if (distC < thresh) {

                          // add to centroid array
                          centroids.push(ptC, ptC2)

                      }

                      if (comN2 && comN2.type === 'C') {

                          let cp1_r3 = rotatePoint(comN2.cp1, comN2.p0.x, comN2.p0.y, (Math.PI * -0.5))
                          let cp2_r3 = rotatePoint(comN2.cp2, comN2.p.x, comN2.p.y, (Math.PI * 0.5))
                          let ptC3 = checkLineIntersection(comN2.p0, cp1_r3, comN2.p, cp2_r3, false)

                          let distC2 = ptC && ptC3 ? getDistAv(ptC, ptC3) : Infinity

                          // can be combined with 3rd command
                          if (distC2 < thresh) {

                              let r3 = getDistance(ptC3, comN2.p)
                              rArr.push(r3)

                              // update final point
                              p_a = comN2.p
                              poly.push(p, comN2.p)

                              largeArc = 1;

                          }
                      }

                  } else {
                      pathDataN.push(com)
                      continue
                  }

              }

              // create new arc command
              if (poly.length > 1) {

                  // get average radius

                  let rA = Math.max(...rArr)
                  rA = rArr[0]

                  let centroidA;
                  let xArr = centroids.map(pt => pt.x)
                  let yArr = centroids.map(pt => pt.y)

                  centroidA = {
                      x: (xArr.reduce((a, b) => a + b, 0)) / centroids.length,
                      y: (yArr.reduce((a, b) => a + b, 0)) / centroids.length
                  }

                  rA = getDistance(p0, centroidA)
                  let rA2 = getDistance(p, centroidA)

                  // rA = ((Math.min(...rArr) * 2 + Math.max(...rArr)) ) / 3

                  let area = getPolygonArea(poly, false)
                  let sweep = area < 0 ? 0 : 1;

                  let comA = { type: 'A', values: [rA, rA, 0, largeArc, sweep, p_a.x, p_a.y], p0, p: p_a }

                  console.log('comA', comA);

                  pathDataN.push(comA)

                  i += rArr.length - 1;

                  continue

              }

              // test angles
          }

          pathDataN.push(com)
      }

      let d = pathDataToD(pathDataN)
      console.log(d);

      console.log('pathDataN', pathDataN);
      return pathDataN

  }
  */

  /**
   * get viewBox 
   * either from explicit attribute or
   * width and height attributes
   */

  function getViewBox(svg = null, {
      autoRoundValues=true,
      decimals = -1
  }={}) {

      // browser default
      if (!svg) return false

      let hasWidth = svg.hasAttribute('width');
      let hasHeight = svg.hasAttribute('height');
      let hasViewBox = svg.hasAttribute('viewBox');

      let widthAtt = hasWidth ? svg.getAttribute('width') : 0;
      let heightAtt = hasHeight ? svg.getAttribute('height') : 0;

      let w = widthAtt ? (!widthAtt.includes('%') ? normalizeUnits(widthAtt, {isHorizontal:true}) : 0 ) : 300;
      let h = heightAtt ? (!heightAtt.includes('%') ? normalizeUnits(heightAtt, {isVertical:true}) : 0 ) : 150;

      let widthUnit = hasWidth ? '' : '';
      let heightUnit = hasHeight ? '' : '';

      let viewBoxVals =  hasViewBox ? svg.getAttribute('viewBox').split(/,| /).filter(Boolean).map(Number) : [0, 0, w, h];

      // round
      if (autoRoundValues ) {
          [w, h] = [w, h].map(val=>autoRound(val));
          viewBoxVals = viewBoxVals.map(val=>autoRound(val));
      }
      else if (!autoRoundValues && decimals>-1) {
          [w, h] = [w, h].map(val=>+val.toFixed(decimals));
          viewBoxVals = viewBoxVals.map(val=>+val.toFixed(decimals));
      }

      let [x=0, y=0, width=0, height=0] = viewBoxVals;
      if(hasViewBox) {
          w=width;
          h=height;
      }

      let viewBox = { x , y, width, height, w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit };

      return viewBox
  }

  function getRootSvg(el) {
    let svg = el.parentNode.closest('svg');
    while (svg && svg.parentNode && svg.parentNode.closest) {
      let parentSvg = svg.parentNode.closest('svg');
      if (!parentSvg) break;
      svg = parentSvg;
    }
    return svg;
  }

  /**
   * scale pathData
   */
  function transformPathData(pathData, matrix) {

      // new pathdata
      let pathDataTrans = [];

      // transform point by 2d matrix
      const transformPoint = (pt, matrix) => {
          let { a, b, c, d, e, f } = matrix;
          let { x, y } = pt;
          return { x: a * x + c * y + e, y: b * x + d * y + f };
      };

      const normalizeMatrix = (matrix) => {
          matrix =
              typeof matrix === "string"
                  ? (matrix = matrix
                      .replace(/^matrix\(|\)$/g, "")
                      .split(",")
                      .map(Number))
                  : matrix;
          matrix = !Array.isArray(matrix)
              ? {
                  a: matrix.a,
                  b: matrix.b,
                  c: matrix.c,
                  d: matrix.d,
                  e: matrix.e,
                  f: matrix.f
              }
              : {
                  a: matrix[0],
                  b: matrix[1],
                  c: matrix[2],
                  d: matrix[3],
                  e: matrix[4],
                  f: matrix[5]
              };
          return matrix;
      };

      const transformArc = (p0, values, matrix) => {
          let [rx, ry, angle, largeArc, sweep, x, y] = values;

          /**
          * parametrize arc command 
          * to get the actual arc params
          */
          let arcData = svgArcToCenterParam(
              p0.x,
              p0.y,
              values[0],
              values[1],
              angle,
              largeArc,
              sweep,
              x,
              y
          );
          ({ rx, ry } = arcData);
          let { a, b, c, d, e, f } = matrix;

          let ellipsetr = transformEllipse(rx, ry, angle, matrix);
          let p = transformPoint({ x: x, y: y }, matrix);

          // adjust sweep if flipped
          let denom = a * a + b * b;
          let scaleX = Math.sqrt(denom);
          let scaleY = (a * d - c * b) / scaleX;

          let flipX = scaleX < 0 ? true : false;
          let flipY = scaleY < 0 ? true : false;

          // adjust sweep
          if (flipX || flipY) {
              sweep = sweep === 0 ? 1 : 0;
          }

          return {
              type: 'A',
              values: [
                  ellipsetr.rx,
                  ellipsetr.ry,
                  ellipsetr.ax,
                  largeArc,
                  sweep,
                  p.x,
                  p.y]
          };
      };

      // normalize matrix input
      matrix = normalizeMatrix(matrix);

      let matrixStr = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
          .map((val) => {
              return +val.toFixed(1);
          })
          .join("");

      // no transform: quit
      if (matrixStr === "100100") {

          return pathData;
      }

      pathData.forEach((com, i) => {
          let { type, values } = com;
          let typeRel = type.toLowerCase();
          let comPrev = i > 0 ? pathData[i - 1] : pathData[i];
          let comPrevValues = comPrev.values;
          let comPrevValuesL = comPrevValues.length;
          let p0 = {
              x: comPrevValues[comPrevValuesL - 2],
              y: comPrevValues[comPrevValuesL - 1]
          };
          ({ x: values[values.length - 2], y: values[values.length - 1] });
          let comT = { type: type, values: [] };

          switch (typeRel) {
              case "a":
                  comT = transformArc(p0, values, matrix);
                  break;

              default:
                  // all other point based commands
                  if (values.length) {
                      for (let i = 0; i < values.length; i += 2) {
                          let ptTrans = transformPoint(
                              { x: com.values[i], y: com.values[i + 1] },
                              matrix
                          );

                          comT.values[i] = ptTrans.x;
                          comT.values[i + 1] = ptTrans.y;
                      }
                  }
          }

          pathDataTrans.push(comT);
      });

      return pathDataTrans;
  }

  /**
   * Based on: https://github.com/fontello/svgpath/blob/master/lib/ellipse.js
   * and fork: https://github.com/kpym/SVGPathy/blob/master/lib/ellipse.js
   */

  function transformEllipse(rx, ry, ax, matrix) {
      const torad = Math.PI / 180;
      const epsilon = 1e-7;

      matrix = !Array.isArray(matrix)
          ? matrix
          : {
              a: matrix[0],
              b: matrix[1],
              c: matrix[2],
              d: matrix[3],
              e: matrix[4],
              f: matrix[5]
          };

      // We consider the current ellipse as image of the unit circle
      // by first scale(rx,ry) and then rotate(ax) ...
      // So we apply ma =  m x rotate(ax) x scale(rx,ry) to the unit circle.
      let  c = Math.cos(ax * torad),
          s = Math.sin(ax * torad);
      let  ma = [
          rx * (matrix.a * c + matrix.c * s),
          rx * (matrix.b * c + matrix.d * s),
          ry * (-matrix.a * s + matrix.c * c),
          ry * (-matrix.b * s + matrix.d * c)
      ];

      // ma * transpose(ma) = [ J L ]
      //                      [ L K ]
      // L is calculated later (if the image is not a circle)
      let  J = ma[0] * ma[0] + ma[2] * ma[2],
          K = ma[1] * ma[1] + ma[3] * ma[3];

      // the sqrt of the discriminant of the characteristic polynomial of ma * transpose(ma)
      // this is also the geometric mean of the eigenvalues
      let  D = Math.sqrt(
          ((ma[0] - ma[3]) * (ma[0] - ma[3]) + (ma[2] + ma[1]) * (ma[2] + ma[1])) *
          ((ma[0] + ma[3]) * (ma[0] + ma[3]) + (ma[2] - ma[1]) * (ma[2] - ma[1]))
      );

      // the arithmetic mean of the eigenvalues
      let  JK = (J + K) / 2;

      // check if the image is (almost) a circle
      if (D <= epsilon) {
          rx = ry = Math.sqrt(JK);
          ax = 0;
          return { rx: rx, ry: ry, ax: ax };
      }

      // check if ma * transpose(ma) is (almost) diagonal
      if (Math.abs(D - Math.abs(J - K)) <= epsilon) {
          rx = Math.sqrt(J);
          ry = Math.sqrt(K);
          ax = 0;
          return { rx: rx, ry: ry, ax: ax };
      }

      // if it is not a circle, nor diagonal
      let  L = ma[0] * ma[1] + ma[2] * ma[3];

      // {l1,l2} = the two eigen values of ma * transpose(ma)
      let  l1 = JK + D / 2,
          l2 = JK - D / 2;

      // the x - axis - rotation angle is the argument of the l1 - eigenvector
      if (Math.abs(L) <= epsilon && Math.abs(l1 - K) <= epsilon) {
          // if (ax == 90) => ax = 0 and exchange axes
          ax = 0;
          rx = Math.sqrt(l2);
          ry = Math.sqrt(l1);
          return { rx: rx, ry: ry, ax: ax };
      }

      ax =
          Math.atan(Math.abs(L) > Math.abs(l1 - K) ? (l1 - J) / L : L / (l1 - K)) /
          torad; // the angle in degree

      // if ax > 0 => rx = sqrt(l1), ry = sqrt(l2), else exchange axes and ax += 90
      if (ax >= 0) {
          // if ax in [0,90]
          rx = Math.sqrt(l1);
          ry = Math.sqrt(l2);
      } else {
          // if ax in ]-90,0[ => exchange axes
          ax += 90;
          rx = Math.sqrt(l2);
          ry = Math.sqrt(l1);
      }

      return { rx: rx, ry: ry, ax: ax };
  }

  /**
   *  Decompose matrix to readable transform properties 
   *  translate() rotate() scale() etc.
   *  based on @AndreaBogazzi's answer
   *  https://stackoverflow.com/questions/5107134/find-the-rotation-and-skew-of-a-matrix-transformation#32125700
   *  return object with seperate transform properties 
   *  and ready to use css or svg attribute strings
   */
  function qrDecomposeMatrix(matrix, precision = 4) {
      let { a, b, c, d, e, f } = matrix;
      // matrix is array
      if (Array.isArray(matrix)) {
          [a, b, c, d, e, f] = matrix;
      }
      let angle = Math.atan2(b, a),
          denom = Math.pow(a, 2) + Math.pow(b, 2),
          scaleX = Math.sqrt(denom),
          scaleY = (a * d - c * b) / scaleX,
          skewX = Math.atan2(a * c + b * d, denom) / (Math.PI / 180),
          translateX = e ? e : 0,
          translateY = f ? f : 0,
          rotate = angle ? angle / (Math.PI / 180) : 0;
      let transObj = {
          translateX: translateX,
          translateY: translateY,
          rotate: rotate,
          scaleX: scaleX,
          scaleY: scaleY,
          skewX: skewX,
          skewY: 0
      };
      let cssTransforms = [];
      let svgTransforms = [];
      for (let prop in transObj) {
          transObj[prop] = +parseFloat(transObj[prop]).toFixed(precision);
          let val = transObj[prop];
          let unit = "";
          if (prop == "rotate" || prop == "skewX") {
              unit = "deg";
          }
          if (prop.indexOf("translate") != -1) {
              unit = "px";
          }
          // combine these properties
          let convert = ["scaleX", "scaleY", "translateX", "translateY"];
          if (val !== 0) {
              cssTransforms.push(`${prop}(${val}${unit})`);
          }
          if (convert.indexOf(prop) == -1 && val !== 0) {
              svgTransforms.push(`${prop}(${val})`);
          } else if (prop == "scaleX") {
              svgTransforms.push(
                  `scale(${+scaleX.toFixed(precision)} ${+scaleY.toFixed(precision)})`
              );
          } else if (prop == "translateX") {
              svgTransforms.push(
                  `translate(${transObj.translateX} ${transObj.translateY})`
              );
          }

      }
      // append css style string to object
      transObj.cssTransform = cssTransforms.join(" ");
      transObj.svgTransform = svgTransforms.join(" ");

      transObj.matrix = [a, b, c, d, e, f ].map(val=>roundTo(val, precision));
      transObj.matrixAtt = `matrix(${transObj.matrix.join(' ')})`;

   

      return transObj;
  }

  /**
   * Convert shapes to paths
   * converts also transforms
   */
  function shapeElToPath(el, { width = 0,
      height = 0,
      convertShapes = [],
      matrix = null

  } = {}) {

      let nodeName = el.nodeName.toLowerCase();

      if (!convertShapes.includes(nodeName)) return el;

      let pathData = getPathDataFromEl(el, { width, height });

      // shape attributes – obsolete for path els
      let exclude = ['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'dx', 'dy', 'r', 'rx', 'ry', 'width', 'height', 'points'];

      // transform pathData
      if (matrix && Object.values(matrix).join('') !== '100100') {
          pathData = transformPathData(pathData, matrix);

          exclude.push('transform', 'transform-origin');
      }

      let d = pathData.map(com => { return `${com.type} ${com.values} ` }).join(' ');
      let attributes = [...el.attributes].map(att => att.name);

      let pathN = document.createElementNS(svgNs, 'path');
      pathN.setAttribute('d', d);

      // copy attributes
      attributes.forEach(att => {
          if (!exclude.includes(att)) {
              let val = el.getAttribute(att);
              pathN.setAttribute(att, val);
          }
      });

      return pathN

  }

  // retrieve pathdata from svg geometry elements
  function getPathDataFromEl(el, {
      stringify = false,
      width = 0,
      height = 0
  } = {}) {

      let pathData = [];
      let type = el.nodeName.toLowerCase();
      let d, x, y, r, rx, ry, cx, cy, x1, x2, y1, y2;

      if (!width || !height) {
          let svg = getRootSvg(el);
          let viewBox = getViewBox(svg);
          width = viewBox.width;
          height = viewBox.height;
      }

      // convert relative and physical units to user-units
      let atts = svgElUnitsToPixel(el, { width, height });

      switch (type) {
          case 'path':
              d = el.getAttribute("d");
              pathData = parsePathDataNormalized(d);
              break;

          case 'rect':
              ({ x=0, y=0, width=0, height=0, rx=0, ry=0 } = atts);
              pathData = rectToPathData(x, y, width, height, rx, ry);
              break;

          case 'circle':
          case 'ellipse':
              ({ cx=0, cy=0, r, rx, ry } = atts);

              let isCircle = type === 'circle';

              if (isCircle) {
                  r = r;
                  rx = r;
                  ry = r;
              } else {
                  rx = rx ? rx : r;
                  ry = ry ? ry : r;
              }

              // simplified radii for circles
              let rxS = isCircle && r >= 1 ? 1 : rx;
              let ryS = isCircle && r >= 1 ? 1 : ry;

              pathData = [
                  { type: "M", values: [cx + rx, cy] },
                  { type: "A", values: [rxS, ryS, 0, 1, 1, cx - rx, cy] },
                  { type: "A", values: [rxS, ryS, 0, 1, 1, cx + rx, cy] },
              ];

              break;
          case 'line':
              ({ x1, y1, x2, y2 } = atts);
              pathData = [
                  { type: "M", values: [x1, y1] },
                  { type: "L", values: [x2, y2] }
              ];
              break;
          case 'polygon':
          case 'polyline':

              let points = el.getAttribute('points').split(/,| /).filter(Boolean).map(Number);

              for (let i = 0; i < points.length; i += 2) {
                  pathData.push({
                      type: (i === 0 ? "M" : "L"),
                      values: [points[i], points[i + 1]]
                  });
              }
              if (type === 'polygon') {
                  pathData.push({
                      type: "Z",
                      values: []
                  });
              }
              break;
      }

      return stringify ? stringifyPathData(pathData) : pathData;

  }

  function rectToPathData(x = 0, y = 0, width = 0, height = 0, rx = 0, ry = 0) {
      let pathData = [];

      if (!rx && !ry) {
          pathData = [
              { type: "M", values: [x, y] },
              { type: "L", values: [x + width, y] },
              { type: "L", values: [x + width, y + height] },
              { type: "L", values: [x, y + height] },
              { type: "Z", values: [] }
          ];
      } else {

          rx = rx ? rx : ry;
          ry = ry ? ry : rx;

          if (rx > width / 2) {
              rx = width / 2;
          }
          if (ry > height / 2) {
              ry = height / 2;
          }
          pathData = [
              { type: "M", values: [x + rx, y] },
              { type: "L", values: [x + width - rx, y] },
              { type: "A", values: [rx, ry, 0, 0, 1, x + width, y + ry] },
              { type: "L", values: [x + width, y + height - ry] },
              { type: "A", values: [rx, ry, 0, 0, 1, x + width - rx, y + height] },
              { type: "L", values: [x + rx, y + height] },
              { type: "A", values: [rx, ry, 0, 0, 1, x, y + height - ry] },
              { type: "L", values: [x, y + ry] },
              { type: "A", values: [rx, ry, 0, 0, 1, x + rx, y] },
              { type: "Z", values: [] }
          ];
      }

      return pathData
  }

  function pathElToShape(el, {
      convertShapes = [],
  } = {}) {

      let pathData = parsePathDataNormalized(el.getAttribute('d'));
      let coms = Array.from(new Set(pathData.map(com => com.type))).join('');

      let hasArcs = (/[a]/gi).test(coms);
      let hasBeziers = (/[csqt]/gi).test(coms);
      let hasLines = (/[l]/gi).test(coms);
      let isPoly = !(/[acqts]/gi).test(coms);
      let closed = (/[z]/gi).test(coms);
      let shape = null;
      let type = null;

      let attributes = getElementAtts(el);
      let attsNew = {};
      let decimals = 7;

      if (isPoly) {

          // is line
          if (pathData.length === 2 && convertShapes.includes('line')) {
              type = 'line';
              shape = document.createElementNS(svgNs, type);
              let [x1, y1, x2, y2] = [...pathData[0].values, ...pathData[1].values].map(val => roundTo(val, decimals));
              attsNew = { x1, y1, x2, y2 };
          }
          // polygon, polyline or rect
          else {

              let vertices = getPathDataVertices(pathData);
              let bb = getPolyBBox(vertices);
              let areaPoly = getPolygonArea(vertices, true);
              let areaRect = bb.width * bb.height;
              let areaDiff = Math.abs(1 - areaRect / areaPoly);

              // is rect
              if (convertShapes.includes('rect') && areaDiff < 0.01) {
                  type = 'rect';
                  shape = document.createElementNS(svgNs, type);
                  let { x, y, width, height } = bb;
                  attsNew = { x, y, width, height };

              }
              // polyline or polygon
              else if (convertShapes.includes('polygon') || convertShapes.includes('polyline')) {
                  type = closed ? 'polygon' : 'polyline';
                  shape = document.createElementNS(svgNs, type);
                  let points = vertices.map(pt => { return [pt.x, pt.y] }).flat().map(val => roundTo(val, decimals)).join(' ');
                  attsNew = { points };
              }
          }
      }
      // circles or ellipses
      else if (!hasLines && (convertShapes.includes('circle') || convertShapes.includes('ellipse'))) {

          // try to convert cubics to arcs
          if (!hasArcs && hasBeziers) {
              pathData = pathDataCubicsToArc(pathData, { areaThreshold: 2.5 });
              hasArcs = pathData.filter(com => com.type === 'A').length;
          }

          if (hasArcs) {
              let pathData2 = getPathDataVerbose(pathData, { addArcParams: true });
              let arcComs = pathData2.filter(com => com.type === 'A');

              let cxVals = new Set();
              let cyVals = new Set();
              let rxVals = new Set();
              let ryVals = new Set();

              if (arcComs.length > 1) {

                  pathData2.forEach(com => {
                      if (com.type === 'A') {

                          cxVals.add(roundTo(com.cx, decimals));
                          cyVals.add(roundTo(com.cy, decimals));
                          rxVals.add(roundTo(com.rx, decimals));
                          ryVals.add(roundTo(com.ry, decimals));
                      }
                  });
              }

              cxVals = Array.from(cxVals);
              cyVals = Array.from(cyVals);
              rxVals = Array.from(rxVals);
              ryVals = Array.from(ryVals);

              if (cxVals.length === 1 && cyVals.length === 1 && rxVals.length === 1 && ryVals.length === 1) {
                  let [rx, ry, cx, cy] = [rxVals[0], ryVals[0], cxVals[0], cyVals[0]];
                  type = rx === ry ? 'circle' : 'ellipse';
                  shape = document.createElementNS(svgNs, type);
                  attsNew = type === 'circle' ? { r: rx, cx, cy } : { rx, ry, cx, cy };
              }
          }
      }

      // if el could be replaced
      if (shape) {
          let ignore = ['id', 'class'];

          // set  shape attributes
          for (let att in attsNew) {
              shape.setAttribute(att, attsNew[att]);
          }

          // copy old attributes
          for (let att in attributes) {

              if (attLookup.atts[att].includes(type) || ignore.includes(att) || att.startsWith('data-')) {
                  shape.setAttribute(att, attributes[att]);
              }
          }
          // replace
          el = shape;
      }

      return el;

  }

  function pathDataRemoveColinear(pathData, {
      tolerance = 1,

      flatBezierToLinetos = true
  } = {}) {

      let pathDataN = [pathData[0]];

      let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let p0 = M;
      let p = M;
      pathData[pathData.length - 1].type.toLowerCase() === 'z';

      for (let c = 1, l = pathData.length; c < l; c++) {

          let com = pathData[c];
          let comN = pathData[c + 1] || pathData[l - 1];

          let p1 = comN.type.toLowerCase() === 'z' ? M : { x: comN.values[comN.values.length - 2], y: comN.values[comN.values.length - 1] };

          let { type, values } = com;
          let valsL = values.slice(-2);
          p = type !== 'Z' ? { x: valsL[0], y: valsL[1] } : M;

          let area = p1 ? getPolygonArea([p0, p, p1], true) : Infinity;
          let distSquare = getSquareDistance(p0, p1);
          let distMax = distSquare ? distSquare / 333 * tolerance : 0;

          let isFlat = area < distMax;

          let isFlatBez = false;

          /*
          // flatness by cross product 
          let dx0 = Math.abs(p1.x - p0.x)
          let dy0 = Math.abs(p1.y - p0.y)

          let dx1 = Math.abs(p.x - p0.x)
          let dy1 = Math.abs(p.y - p0.y)

          let dx2 = Math.abs(p1.x - p.x)
          let dy2 = Math.abs(p1.y - p.y)

          // zero length segments are flat
          let isZeroLength = (!dy1 && !dx1) || (!dy2 && !dx2)
          if (isZeroLength) isFlat = true;

          // check cross products for colinearity
          if (!isFlat) {

              let cross0 = Math.abs(dx0 * dy1 - dy0 * dx1);

              let thresh = (dx0 + dy0) * 0.1

              if ( cross0 < thresh) {

                  isFlat = true
              }
          }
          */

          if (!flatBezierToLinetos && type === 'C') isFlat = false;

          // convert flat beziers to linetos
          if (flatBezierToLinetos && (type === 'C' || type === 'Q')) {

              let cpts = type === 'C' ?
                  [{ x: values[0], y: values[1] }, { x: values[2], y: values[3] }] :
                  (type === 'Q' ? [{ x: values[0], y: values[1] }] : []);

              isFlatBez = commandIsFlat([p0, ...cpts, p], { tolerance });

              if (isFlatBez && c < l - 1) {
                  type = "L";
                  com.type = "L";
                  com.values = valsL;

              }
          }

          // colinear – exclude arcs (as always =) as semicircles won't have an area

          if (isFlat && c < l - 1 && comN.type !== 'A' && (type === 'L' || (flatBezierToLinetos && isFlatBez))) {

              continue;
          }

          // update end point
          p0 = p;

          if (type === 'M') {
              M = p;
          }

          // proceed and add command
          pathDataN.push(com);

      }

      return pathDataN;

  }

  function removeOrphanedM(pathData) {

      let pathDataN = [];
      for (let i = 0, l = pathData.length; i < l; i++) {
          let com = pathData[i];
          if (!com) continue;
          let { type = null, values = [] } = com;
          let comN = pathData[i + 1] ? pathData[i + 1] : null;
          if ((type === 'M' || type === 'm')) {

              if (!comN || (comN && (comN.type === 'Z' || comN.type === 'z'))) {
                  if(comN) i++;
                  continue
              }
          }
          pathDataN.push(com);
      }

      return pathDataN;

  }

  /*
  // remove zero-length segments introduced by rounding
  export function removeZeroLengthLinetos_post(pathData) {
      let pathDataOpt = []
      pathData.forEach((com, i) => {
          let { type, values } = com;
          if (type === 'l' || type === 'v' || type === 'h') {
              let hasLength = type === 'l' ? (values.join('') !== '00') : values[0] !== 0
              if (hasLength) pathDataOpt.push(com)
          } else {
              pathDataOpt.push(com)
          }
      })
      return pathDataOpt
  }
  */

  function removeZeroLengthLinetos(pathData) {

      let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let p0 = M;
      let p = p0;

      let pathDataN = [pathData[0]];

      for (let c = 1, l = pathData.length; c < l; c++) {
          let com = pathData[c];
          let comPrev = pathData[c-1]; 
          let comNext = pathData[c+1] || null;
          let { type, values } = com;

          // zero length segments are simetimes used in icons for dots
          let isDot = comPrev.type.toLowerCase() ==='m' && !comNext;

          let valsLen = values.length;
          p = { x: values[valsLen-2], y: values[valsLen-1] };

          // skip lineto
          if (!isDot && type === 'L' && p.x === p0.x && p.y === p0.y) {
              continue
          }

          // skip minified zero length
          if (!isDot && (type === 'l' || type === 'v' || type === 'h')) {
              let noLength = type === 'l' ? (values.join('') === '00') : values[0] === 0;
              if(noLength) continue
          } 

          pathDataN.push(com);
          p0 = p;
      }

      return pathDataN

  }

  function pathDataToTopLeft(pathData) {

      let len = pathData.length;
      let isClosed = pathData[len - 1].type.toLowerCase() === 'z';

      // we can't change starting point for non closed paths
      if (!isClosed) {
          return pathData
      }

      let newIndex = 0;

      let indices = [];
      for (let i = 0; i < len; i++) {
          let com = pathData[i];
          let { type, values } = com;
          let valsLen = values.length;
          if (valsLen) {
              let p = { type: type, x: values[valsLen-2], y: values[valsLen-1], index: 0};
              p.index = i;
              indices.push(p);
          }
      }

      // reorder  to top left most

      indices = indices.sort((a, b) => +a.y.toFixed(8) - +b.y.toFixed(8) || a.x-b.x );
      newIndex = indices[0].index;

      return  newIndex ? shiftSvgStartingPoint(pathData, newIndex) : pathData;
  }

  function optimizeClosePath(pathData, {removeFinalLineto = true, autoClose = true}={}) {

      let pathDataNew = [];
      let l = pathData.length;
      let M = { x: +pathData[0].values[0].toFixed(8), y: +pathData[0].values[1].toFixed(8) };
      let isClosed = pathData[l - 1].type.toLowerCase() === 'z';

      let linetos = pathData.filter(com => com.type === 'L');

      // check if order is ideal
      let idxPenultimate = isClosed ? l-2 : l-1;

      let penultimateCom = pathData[idxPenultimate];
      let penultimateType = penultimateCom.type;
      let penultimateComCoords = penultimateCom.values.slice(-2).map(val => +val.toFixed(8));

      // last L command ends at M 
      let isClosingCommand = penultimateComCoords[0] === M.x && penultimateComCoords[1] === M.y;

      // add closepath Z to enable order optimizations
      if(!isClosed && autoClose && isClosingCommand){

          /*
          // adjust final coords
          let valsLast = pathData[idxPenultimate].values
          let valsLastLen = valsLast.length;
          pathData[idxPenultimate].values[valsLastLen-2] = M.x
          pathData[idxPenultimate].values[valsLastLen-1] = M.y
          */
          
          pathData.push({type:'Z', values:[]});
          isClosed = true;
          l++;
      }

      // if last segment is not closing or a lineto
      let skipReorder = pathData[1].type !== 'L' && (!isClosingCommand || penultimateCom.type === 'L');
      skipReorder = false;

      // we can't change starting point for non closed paths
      if (!isClosed) {
          return pathData
      }

      let newIndex = 0;

      if (!skipReorder) {

          let indices = [];
          for (let i = 0; i < l; i++) {
              let com = pathData[i];
              let { type, values } = com;
              if (values.length) {
                  let valsL = values.slice(-2);
                  let prevL = pathData[i - 1] && pathData[i - 1].type === 'L';
                  let nextL = pathData[i + 1] && pathData[i + 1].type === 'L';
                  let prevCom = pathData[i - 1] ? pathData[i - 1].type.toUpperCase() : null;
                  let nextCom = pathData[i + 1] ? pathData[i + 1].type.toUpperCase() : null;
                  let p = { type: type, x: valsL[0], y: valsL[1], dist: 0, index: 0, prevL, nextL, prevCom, nextCom };
                  p.index = i;
                  indices.push(p);
              }
          }

          // find top most lineto

          if (linetos.length) {
              let curveAfterLine = indices.filter(com => (com.type !== 'L' && com.type !== 'M') && com.prevCom &&
                  com.prevCom === 'L' || com.prevCom === 'M' && penultimateType === 'L').sort((a, b) => a.y - b.y || a.x - b.x)[0];

              newIndex = curveAfterLine ? curveAfterLine.index - 1 : 0;

          }
          // use top most command
          else {
              indices = indices.sort((a, b) => +a.y.toFixed(8) - +b.y.toFixed(8) || a.x - b.x);
              newIndex = indices[0].index;
          }

          // reorder 
          pathData = newIndex ? shiftSvgStartingPoint(pathData, newIndex) : pathData;
      }

      M = { x: +pathData[0].values[0].toFixed(8), y: +pathData[0].values[1].toFixed(8) };

      l = pathData.length;

      // remove last lineto
      penultimateCom = pathData[l - 2];
      penultimateType = penultimateCom.type;
      penultimateComCoords = penultimateCom.values.slice(-2).map(val=>+val.toFixed(8));

      isClosingCommand = penultimateType === 'L' && penultimateComCoords[0] === M.x && penultimateComCoords[1] === M.y;

      if (removeFinalLineto && isClosingCommand) {
          pathData.splice(l - 2, 1);
      }

      pathDataNew.push(...pathData);

      return pathDataNew
  }

  /**
   * shift starting point
   */
  function shiftSvgStartingPoint(pathData, offset) {
      let pathDataL = pathData.length;
      let newStartIndex = 0;
      let lastCommand = pathData[pathDataL - 1]["type"];
      let isClosed = lastCommand.toLowerCase() === "z";

      if (!isClosed || offset < 1 || pathData.length < 3) {
          return pathData;
      }

      let trimRight = isClosed ? 1 : 0;

      // add explicit lineto
      addClosePathLineto(pathData);

      // M start offset
      newStartIndex =
          offset + 1 < pathData.length - 1
              ? offset + 1
              : pathData.length - 1 - trimRight;

      // slice array to reorder
      let pathDataStart = pathData.slice(newStartIndex);
      let pathDataEnd = pathData.slice(0, newStartIndex);

      // remove original M
      pathDataEnd.shift();
      let pathDataEndL = pathDataEnd.length;

      let pathDataEndLastValues, pathDataEndLastXY;
      pathDataEndLastValues = pathDataEnd[pathDataEndL - 1].values || [];
      pathDataEndLastXY = [
          pathDataEndLastValues[pathDataEndLastValues.length - 2],
          pathDataEndLastValues[pathDataEndLastValues.length - 1]
      ];

      if (trimRight) {
          pathDataStart.pop();
          pathDataEnd.push({
              type: "Z",
              values: []
          });
      }
      // prepend new M command and concatenate array chunks
      pathData = [
          {
              type: "M",
              values: pathDataEndLastXY
          },
          ...pathDataStart,
          ...pathDataEnd,
      ];

      return pathData;
  }

  /**
   * Add closing lineto:
   * needed for path reversing or adding points
   */

  function addClosePathLineto(pathData) {

      let pathDataL = pathData.length;
      let closed = pathData[pathDataL - 1].type.toLowerCase() === "z" ? true : false;

      let M = pathData[0];
      let [x0, y0] = [M.values[0], M.values[1]].map(val => { return +val.toFixed(8) });
      let comLast = closed ? pathData[pathDataL - 2] : pathData[pathDataL - 1];
      let comLastL = comLast.values.length;

      // last explicit on-path coordinates
      let [xL, yL] = [comLast.values[comLastL - 2], comLast.values[comLastL - 1]].map(val => { return +val.toFixed(8) });

      if (closed && (x0 != xL || y0 != yL)) {

          pathData.pop();
          pathData.push(
              {
                  type: "L",
                  values: [x0, y0]
              },
              {
                  type: "Z",
                  values: []
              }
          );
      }

      return pathData;
  }

  /**
   * reverse pathdata
   * make sure all command coordinates are absolute and
   * shorthands are converted to long notation
   */
  function reversePathData(pathData, {
      arcToCubic = false,
      quadraticToCubic = false,
      toClockwise = false,
      returnD = false
  } = {}) {

      /**
       * Add closing lineto:
       * needed for path reversing or adding points
       */
      const addClosePathLineto = (pathData) => {
          let closed = pathData[pathData.length - 1].type.toLowerCase() === "z";
          let M = pathData[0];
          let [x0, y0] = [M.values[0], M.values[1]];
          let lastCom = closed ? pathData[pathData.length - 2] : pathData[pathData.length - 1];
          let [xE, yE] = [lastCom.values[lastCom.values.length - 2], lastCom.values[lastCom.values.length - 1]];

          if (closed && (x0 != xE || y0 != yE)) {

              pathData.pop();
              pathData.push(
                  {
                      type: "L",
                      values: [x0, y0]
                  },
                  {
                      type: "Z",
                      values: []
                  }
              );
          }
          return pathData;
      };

      // helper to rearrange control points for all command types
      const reverseControlPoints = (type, values) => {
          let controlPoints = [];
          let endPoints = [];
          if (type !== "A") {
              for (let p = 0; p < values.length; p += 2) {
                  controlPoints.push([values[p], values[p + 1]]);
              }
              endPoints = controlPoints.pop();
              controlPoints.reverse();
          }
          // is arc
          else {

              let sweep = values[4] == 0 ? 1 : 0;
              controlPoints = [values[0], values[1], values[2], values[3], sweep];
              endPoints = [values[5], values[6]];
          }
          return { controlPoints, endPoints };
      };

      // start compiling new path data
      let pathDataNew = [];

      let closed =
          pathData[pathData.length - 1].type.toLowerCase() === "z" ? true : false;
      if (closed) {
          // add lineto closing space between Z and M
          pathData = addClosePathLineto(pathData);
          // remove Z closepath
          pathData.pop();
      }

      // define last point as new M if path isn't closed
      let valuesLast = pathData[pathData.length - 1].values;
      let valuesLastL = valuesLast.length;
      let M = closed
          ? pathData[0]
          : {
              type: "M",
              values: [valuesLast[valuesLastL - 2], valuesLast[valuesLastL - 1]]
          };
      // starting M stays the same – unless the path is not closed
      pathDataNew.push(M);

      // reverse path data command order for processing
      pathData.reverse();
      for (let i = 1; i < pathData.length; i++) {
          let com = pathData[i];
          let type = com.type;
          let values = com.values;
          let comPrev = pathData[i - 1];
          let typePrev = comPrev.type;
          let valuesPrev = comPrev.values;

          // get reversed control points and new end coordinates
          let controlPointsPrev = reverseControlPoints(typePrev, valuesPrev).controlPoints;
          let endPoints = reverseControlPoints(type, values).endPoints;

          // create new path data
          let newValues = [];
          newValues = [controlPointsPrev, endPoints].flat();
          pathDataNew.push({
              type: typePrev,
              values: newValues.flat()
          });
      }

      // add previously removed Z close path
      if (closed) {
          pathDataNew.push({
              type: "z",
              values: []
          });
      }

      return pathDataNew;
  }

  function refineAdjacentExtremes(pathData, {
      threshold = null, tolerance = 1
  } = {}) {

      if (!threshold) {
          let bb = getPathDataBBox(pathData);

          threshold = (bb.width + bb.height) * 0.05;

      }

      let l = pathData.length;

      for (let i = 0; i < l; i++) {
          let com = pathData[i];
          let { type, values, extreme, corner = false, dimA, p0, p } = com;
          let comN = pathData[i + 1] ? pathData[i + 1] : null;
          let comN2 = pathData[i + 2] ? pathData[i + 2] : null;

          // check dist

          let diff = comN ? getDistManhattan(p, comN.p) : Infinity;
          let isCose = diff < threshold;

          let diff2 = comN2 ? getDistManhattan(comN2.p, comN.p) : Infinity;
          let isCose2 = diff2 < threshold*1;

          // next is extreme
          if (comN && comN2 && type === 'C' && comN.type === 'C' && extreme && comN2.extreme) {

              if (isCose2 || isCose) {

                  // extrapolate
                  let comEx = getCombinedByDominant(comN, comN2, threshold, tolerance, false);

                  if (comEx.length === 1) {

                      comEx = comEx[0];

                      pathData[i + 1] = null;

                      pathData[i + 2].values = [comEx.cp1.x, comEx.cp1.y, comEx.cp2.x, comEx.cp2.y, comEx.p.x, comEx.p.y];
                      pathData[i + 2].cp1 = comEx.cp1;
                      pathData[i + 2].cp2 = comEx.cp2;
                      pathData[i + 2].p0 = comEx.p0;
                      pathData[i + 2].p = comEx.p;
                      pathData[i + 2].extreme = comEx.extreme;

                      i++;
                      continue
                  }
              }

          }

          // short after extreme
          if (comN && type === 'C' && comN.type === 'C' && extreme) {

              if (isCose) {

                  let area0 = getPolygonArea([com.p0, com.p, comN.p]);
                  // cpts area
                  let area1 = getPolygonArea([com.p0, com.cp1, com.cp2, com.p]);

                  // sign change: is corner => skip
                  if ((area0 < 0 && area1 > 0) || (area0 > 0 && area1 < 0)) {

                      continue;
                  }
              }
          }

      }

      // remove commands
      pathData = pathData.filter(Boolean);
      l = pathData.length;

      /**
       * refine closing commands
       */

      let closed = pathData[l - 1].type.toLowerCase() === 'z';
      let lastIdx = closed ? l - 2 : l - 1;
      let lastCom = pathData[lastIdx];
      let penultimateCom = pathData[lastIdx - 1] || null;
      let M = { x: pathData[0].values[0], y: pathData[0].values[1] };

      let dec = 8;
      let lastVals = lastCom.values.slice(-2);
      let isClosingTo = +lastVals[0].toFixed(dec) === +M.x.toFixed(dec) && +lastVals[1].toFixed(dec) === +M.y.toFixed(dec);
      let fistExt = pathData[1].type === 'C' && pathData[1].extreme ? pathData[1] : null;

      let diff = getDistManhattan(lastCom.p0, lastCom.p);
      let isCose = diff < threshold;

      if (penultimateCom && penultimateCom.type === 'C' && isCose && isClosingTo && fistExt) {

          let comEx = getCombinedByDominant(penultimateCom, lastCom, threshold, tolerance, false);

          if (comEx.length === 1) {
              pathData[lastIdx - 1] = comEx[0];
              pathData[lastIdx] = null;
              pathData = pathData.filter(Boolean);
          }

      }

      return pathData

  }

  /**
   * parse CSS string to
   * transform property object
   */

  function getMatrixFromTransform(transformations = []) {

      // Helper function to multiply two 2D matrices

      const multiply = (m1, m2) => {
          let mtxN = {
              a: m1.a * m2.a + m1.c * m2.b,
              b: m1.b * m2.a + m1.d * m2.b,
              c: m1.a * m2.c + m1.c * m2.d,
              d: m1.b * m2.c + m1.d * m2.d,
              e: m1.a * m2.e + m1.c * m2.f + m1.e,
              f: m1.b * m2.e + m1.d * m2.f + m1.f
          };

          return mtxN;
      };

      // Helper function to create a translation matrix
      const translationMatrix = (x, y) => {
          let mtx ={a: 1, b: 0, c: 0, d: 1, e: x, f: y};
          return mtx
      };

      // Helper function to create a scaling matrix
      const scalingMatrix = (x, y) => ({
          a: x, b: 0, c: 0, d: y, e: 0, f: 0
      });

      // get skew or rotation axis matrix
      const angleMatrix = (angles, type) => {

          let [angleX, angleY=0] = angles.map(ang => ang*deg2rad);
          let m = {};

          if (type === 'rot') {
              let cosX = Math.cos(angleX), sinX = Math.sin(angleX);
              m = { a: cosX, b: sinX, c: -sinX, d: cosX, e: 0, f: 0 };
          } else if (type === 'skew') {
              let tanX = Math.tan(angleX), tanY = Math.tan(angleY);
              m = {
                  a: 1, b: tanY, c: tanX, d: 1, e: 0, f: 0
              };
          }
          return m
      };

      // Start with an identity matrix
      let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

      // Process transformations in the provided order (right-to-left)
      for (let i = 0; i < transformations.length; i++) {

          let transform = transformations[i];

          // Get the transformation type (e.g., "translate")
          let type = Object.keys(transform)[0];

          let values = transform[type];

          let [x, y] = values;

          switch (type) {
              case "matrix":
                  let keys = ['a', 'b', 'c', 'd', 'e', 'f'];
                  let obj = Object.fromEntries(keys.map((key, i) => [key, values[i]]));

                  matrix = multiply(matrix, obj);
                  break;
              case "translate":
                  matrix = multiply(matrix, translationMatrix(x, y));
                  break;
              case "skew":
                  matrix = multiply(matrix, angleMatrix([x, y], 'skew'));
                  break;
              case "rotate":
                  matrix = multiply(matrix, angleMatrix([x], 'rot'));

                  break;
              case "scale":
                  matrix = multiply(matrix, scalingMatrix(x, y));
                  break;

              default:
                  throw new Error(`Unknown transformation type: ${type}`);
          }

      }

      return matrix;
  }

  function normalizePoly(pts, {
      toObject = true,
      toArray = false,
      flatten = false
  } = {}) {

      // is stringified flat point attribute
      if(typeof pts === 'string' && !isNaN(pts[0])){
          pts = toPointArray(pts.split(/,| /).filter(Boolean).map(Number));
          return pts
      }

      if (flatten) pts = pts.flat(2);
      let poly = toArray ? polyPtsToArray(pts) : polyArrayToObject(pts);
      return poly
  }

  function polyArrayToObject(pts) {

      // is point object array
      if (pts[0].x !== undefined && pts[0].y !== undefined) return pts

      let poly = [];

      // complex poly object array
      if (Array.isArray(pts[0]) && pts[0][0].x !== undefined && pts[0][0].y !== undefined) {
          return pts
      }
      // complex poly value array
      else if (Array.isArray(pts[0][0]) && pts[0][0].length === 2) {
          pts.forEach(sub => {
              poly.push(sub.map(pt => { return { x: pt[0], y: pt[1] } }));
          });
          return poly
      }

      else if(pts.length>3){
          pts = toPointArray(pts);
          return pts
      }

      return pts.map(pt => { return { x: pt[0], y: pt[1] } })
  }

  function polyPtsToArray(pts) {

      // is already coordinate array
      if (!Array.isArray(pts[0][0]) && pts[0].length === 2) return pts

      let poly = [];
      if (Array.isArray(pts[0][0]) && pts[0][0].length === 2) {
          pts.forEach(sub => {
              poly.push(sub.map(pt => [pt.x, pt.y]));
          });
          return poly
      }

      poly = Array.from(pts).map(pt => [pt.x, pt.y]);
      return poly
  }

  // convert flat point value array to point object array
  function toPointArray(pts) {
      let ptArr = [];

      if(pts[0].length===2){
          for (let i = 0, l = pts.length; i < l; i ++) {
              let pt = pts[i];
              ptArr.push({ x: pt[0], y:pt[1] });
          }

      }else {
          for (let i = 1, l = pts.length; i < l; i += 2) {
              ptArr.push({ x: pts[i - 1], y: pts[i] });
          }
      }
      return ptArr;
  }

  function getElBBox(el){

      let type=el.nodeName.toLowerCase();
      let atts = getElementAtts(el);
      let bb = {x:0, y:0, width:0, height:0};
      let pts = [];

      switch(type){
          case 'path':
              let pathData = parsePathDataNormalized(atts.d);
              bb=getPolyBBox(getPathDataPoly(pathData));

          break;
          case 'rect':
              bb = {x:atts.x||0, y:atts.y||0, width:atts.width, height:atts.height};
          break;
          case 'circle':
              let diameter = atts.r*2;
              bb = {x:atts.cx-atts.r, y:atts.cy-atts.r, width:diameter, height:diameter};
          break;
          case 'ellipse':
              bb = {x:atts.cx-atts.rx, y:atts.cy-atts.ry, width:atts.rx*2, height:atts.ry*2};
          break;

          case 'line':
              pts = [{x:atts.x1, y:atts.y1}, {x:atts.x2, y:atts.y2}];
              bb = getPolyBBox(pts);
          break;

          case 'polyline':
          case 'polygon':
              pts = normalizePoly(atts.points);
              bb = getPolyBBox(pts);
          break;

      }

      return bb;
  }

  /**
   * parse svg presentational attributes
   * or CSS styles
   */

  function parseStylesProperties(el, {
      fontSize = 16,
      removeNameSpaced = true,
      autoRoundValues = false,
      minifyRgbColors = false,
      removeInvalid = true,
      allowDataAtts=true,
      allowAriaAtts=true,
      removeDefaults = true,
      cleanUpStrokes = true,
      normalizeTransforms = true,
      removeIds = false,
      removeClassNames = false,

      include = [],
      exclude = [],
      width = 0,
      height = 0,
      stylesheetProps = {}
  } = {}) {

      let nodeName = el.nodeName.toLowerCase();
      let attProps = getSvgPresentationAtts(el);
      let inlineCssProps = getSvgCssProps(el);

      // get CSS properties from SVG style element
      let cssRuleSelectors = el.cssRules || [];
      let cssProps = {};

      cssRuleSelectors.forEach(selector => {
          for (let prop in stylesheetProps[selector]) {
              let val = stylesheetProps[selector][prop];

              // check CSS vars
              if (val.startsWith('var(')) {
                  let varName = val.replace(/[var\(|\)]/g, '').trim();

                  if (stylesheetProps[':root']) {
                      val = `var(${varName}, ${stylesheetProps[':root'][varName]})`;
                  }
              }
              cssProps[prop] = val;
          }
      });

      /**
       * merge props by specificity
       * 1. attributes
       * 2. CSS rules
       * 3. inline CSS
       */
      let props = {
          ...attProps,
          ...cssProps,
          ...inlineCssProps,
      };

      // obsolete/not style relevant anymore
      delete props['style'];
      delete props['class'];
      delete props['id'];

      exclude.push('style', 'class', 'id');

      let remove = ['style'];
      let transformsStandalone = ['scale', 'translate', 'rotate'];

      /**
       * remove invalid properties 
       * e.g font-family for <path>
       */

      if (removeInvalid || removeDefaults || removeNameSpaced) {
          let propsFilteredObj = filterSvgElProps(nodeName, props, {allowDataAtts, allowAriaAtts, removeIds, removeClassNames, removeDefaults, removeNameSpaced, exclude, cleanUpStrokes, include: [...transformsStandalone, ...include], cleanUpStrokes: false });
          props = propsFilteredObj.propsFiltered;
          remove.push(...propsFilteredObj.remove);

      }

      // sanitized prop array
      let propArr = [];

      for (let prop in props) {

          let valueStr = props[prop];

          // we parse the path data separately
          if (prop === 'd' || prop.startsWith('data-')) {
              continue;
          }

          let item = { prop, values: [] };

          // minify rgb values
          if (minifyRgbColors && colorProps.includes(prop)) {

              let color = parseColor(valueStr);

              if (color.mode === 'rgba' || color.mode === 'rgb') {
                  let hex = rgba2Hex(color);
                  valueStr = hex;
              }

          }

          if (prop === 'transform') {
              let transArr = [];

              let transFormFunctions = valueStr.split(/(\w+)\(([^)]+)\)/).map(val => val.trim()).filter(Boolean);

              for (let i = 1; i < transFormFunctions.length; i += 2) {
                  let fn = transFormFunctions[i - 1];
                  let isHorizontal = transHorizontal.includes(fn);
                  let isVertical = transVertical.includes(fn);
                  if (isHorizontal) fn = fn.replace('X', '');
                  if (isVertical) fn = fn.replace('Y', '');
                  let values = transFormFunctions[i].split(/,| /).filter(Boolean);
                  let transItem = { fn, values: [] };

                  for (let v = 0; v < values.length; v++) {
                      let transValues = parseValue(values[v]);
                      transItem.values.push(...transValues);
                  }

                  let defaultX = fn.startsWith('scale') ? 1 : 0;
                  let defaultY = fn.startsWith('scale') ? 1 : 0;

                  if (isHorizontal) transItem.values = [transItem.values[0], { value: defaultX, unit: '', numeric: true }];
                  if (isVertical) transItem.values = [{ value: defaultY, unit: '', numeric: true }, transItem.values[0]];

                  transArr.push(transItem);
              }

              if (transArr.length) {
                  propArr.push({ prop: 'transforms', values: transArr });
              }
          }

          // other props
          else {

              item.values = parseValue(valueStr);
          }

          if (item.values.length) {
              propArr.push(item);
          }

      }

      /**
       * normalize values to 
       * user units
       */

      let propsNorm = { transformArr: [], matrix: null, transComponents: null };
      let transFormOrigin = [];
      let normalizedDiagonal = false;

      for (let i = 0; i < propArr.length; i++) {
          let item = propArr[i];
          let { prop, values } = item;
          let valsNew = [], valX = 0, valY = 0, unitX = '', unitY = '';

          if (prop !== 'transforms') {

              if (cleanUpStrokes && (prop === 'stroke-dasharray' || prop === 'stroke-dashoffset')) {
                  normalizedDiagonal = true;
                  for (let i = 0; i < values.length; i++) {
                      let val = normalizeUnits(values[i].value, { unit: values[i].unit, width, height, normalizedDiagonal, fontSize });
                      valsNew.push(val);
                  }
              }

              else if (prop === 'transform-origin') {

                  values.forEach((item, i) => {
                      let val = item.value;
                      if (val === 'left') values[i].value = 0;
                      else if (val === 'right') values[i].value = width;
                      else if (val === 'top') values[i].value = 0;
                      else if (val === 'bottom') values[i].value = height;
                      else if (val === 'center') values[i].value = '50%';
                  });

                  valX = values[0].value;
                  valY = values[1] ? values[1].value : valX;
                  unitX = values[0].unit;
                  unitY = values[1] ? values[1].unit : unitX;

                  // normalize units for matrix calculation
                  valX = normalizeUnits(valX, { unit: unitX, width, height, isHorizontal: true, fontSize });
                  valY = normalizeUnits(valY, { unit: unitY, width, height, isVertical: true, fontSize });
                  transFormOrigin.push(valX, valY);

              } else {

                  for (let v = 0; v < values.length; v++) {
                      let val = values[v];

                      let unit = val.unit;
                      let valAbs = val.value;
                      let isNumeric = val.numeric;

                      let isHorizontal = horizontalProps.includes(prop);
                      let isVertical = verticalProps.includes(prop);

                      if (unit) {
                          if (prop === 'scale' && unit === '%') {
                              valAbs = valAbs * 0.01;
                          } else {
                              if (prop === 'r') normalizedDiagonal = true;
                              valAbs = normalizeUnits(val.value, { unit, width, height, isHorizontal, isVertical, normalizedDiagonal, fontSize });

                              if (autoRoundValues && isNumeric) {
                                  valAbs = autoRound(valAbs);

                              }

                          }
                      }
                      valsNew.push(valAbs);
                  }
              }

              if (valsNew.length) propsNorm[prop] = valsNew;

          }

          // is transform properties and functions
          else {

              let transforms = values || [];

              let len = transforms.length;
              let transFormAllObj = [];

              for (let t = 0; len && t < len; t++) {
                  let { fn, values } = transforms[t];
                  let valsN = [], unitX = '', unitY = '', transformFunctionArr = [];

                  // defaults
                  let valX = 0;
                  let valY = 0;
                  let transObj = {};

                  // console.log('!!!values', values);
                  if (fn === 'scale' || fn === 'translate') {
                      valX = values[0].value;
                      valY = values[1] ? values[1].value : valX;
                      unitX = values[0].unit;
                      unitY = values[1] ? values[1].unit : unitX;

                      if (fn === 'scale') {
                          valX = unitX === '%' ? valX * 0.01 : valX;
                          valY = unitY === '%' ? valY * 0.01 : valY;
                      } else {
                          valX = normalizeUnits(valX, { unit: unitX, width, height, isHorizontal: true, fontSize });
                          valY = normalizeUnits(valY, { unit: unitY, width, height, isVertical: true, fontSize });

                      }
                      valsN.push(valX, valY);

                      transObj[fn] = valsN;
                      transformFunctionArr.push(transObj);

                  }

                  if (fn === 'matrix') {
                      valsN = values.map(val => val.value);
                      transObj[fn] = valsN;
                      transformFunctionArr.push(transObj);
                  }

                  if (fn === 'skew') {

                      valX = values[0].value;
                      unitX = values[0].unit;
                      valY = values[1].value;
                      unitY = values[1].unit;

                      valX = normalizeUnits(valX, { unit: unitX, isHorizontal: true, fontSize });
                      valY = normalizeUnits(valY, { unit: unitY, isVertical: true, fontSize });

                      // normalize large angles
                      valX = valX > 360 ? (valX % 360) : valX;
                      valY = valY > 360 ? (valY % 360) : valY;

                      valsN = [valX, valY];
                      transObj[fn] = valsN;
                      transformFunctionArr.push(transObj);

                  }

                  // SVG rotations may contain a transform origin
                  if (fn === 'rotate') {

                      let angle = values[0].value;
                      let unit = values[0].unit;
                      angle = normalizeUnits(angle, { unit });

                      let hasPivot = values.length === 3;
                      let transOrigin = [];

                      if (hasPivot) {

                          let cx = values[1].value;
                          let cy = values[2].value;
                          transOrigin.push({ translate: [cx, cy] }, { translate: [-cx, -cy] });

                      }

                      transObj[fn] = [angle];

                      if (transOrigin.length) {
                          transformFunctionArr.push(transOrigin[0], transObj, transOrigin[1]);
                      } else {
                          transformFunctionArr.push(transObj);
                      }
                  }

                  transFormAllObj.push(...transformFunctionArr);

              }

              propsNorm['transformArr'] = transFormAllObj;

          }

      }

      // prepend standalone transforms before standards
      let translate = propsNorm['translate'] !== undefined ? { translate: propsNorm['translate'] } : null;
      let scale = propsNorm['scale'] !== undefined ? { scale: propsNorm['scale'] } : null;
      let rotate = propsNorm['rotate'] !== undefined ? { rotate: propsNorm['rotate'] } : null;
      let standaloneTransforms = [translate, rotate, scale].filter(Boolean);

      if (standaloneTransforms.length) {
          if (normalizeTransforms) remove.push('translate', 'scale', 'rotate');
          propsNorm['transformArr'] = [...standaloneTransforms, ...propsNorm['transformArr']];
      }

      // replace transform-origin with translates

      if (transFormOrigin.length && propsNorm['transformArr'] !== undefined) {
          propsNorm['transformArr'] = [
              { translate: [transFormOrigin[0], transFormOrigin[1]] },
              ...propsNorm['transformArr'],
              { translate: [-transFormOrigin[0], -transFormOrigin[1]] },
          ];
          if (normalizeTransforms) remove.push('transform-origin');
      }

      /**
       * test run 
       * apply parsed transforms
       */
      let { transformArr = [] } = propsNorm;

      let transAtt = [];
      let l = transformArr.length;
      if (l) {
          for (let i = 0; l && i < l; i++) {
              let prop = transformArr[i];
              let values = Object.values(prop).flat();
              let name = Object.keys(prop)[0];
              if (name === 'skew') {
                  if (values[0]) transAtt.push(`skewX(${values[0]})`);
                  if (values[1]) transAtt.push(`skewY(${values[1]})`);
              } else {
                  transAtt.push(`${name}(${values.join(' ')})`);
              }
          }
          // consolidate transforms to matrix

      }

      propsNorm.remove = remove;
      propsNorm.type = nodeName;

      return propsNorm

  }

  /**
  * consolidate transforms to matrix
  */
  function addTransFormProps(propsObj = {}, transformArr = []) {
      if (propsObj.transformArr === undefined || !transformArr.length) return;

      // take existing array or custom
      transformArr = transformArr.length ? transformArr : propsObj.transformArr;
      let matrix = getMatrixFromTransform(transformArr);
      propsObj['matrix'] = matrix;

      let transComponents = qrDecomposeMatrix(matrix, 3);
      propsObj.transComponents = transComponents;

      return propsObj
  }

  /**
   * filter out nonsense 
   * presentation attributes or
   * style properties not valid
   * for element type
   */
  function filterSvgElProps(elNodename = '', props = {}, {
      removeInvalid = true,
      removeDefaults = true,
      allowDataAtts = true,
      allowMeta = false,
      allowAriaAtts = false,
      cleanUpStrokes = true,

      include = [],
      removeIds = false,
      removeClassNames = false,
      exclude = [],
  } = {}) {
      let propsFiltered = {};
      let remove = [];

      if (!removeIds) include.push('id');
      if (!removeClassNames) include.push('class');

      // allow defaults for nested

      let noStrokeColor = cleanUpStrokes ? (props['stroke'] === undefined || props['stroke'][0] === 'none') : false;

      for (let prop in props) {
          let values = props[prop];
          let value = Array.isArray(values) ? values[0] : values;

          // filter out useless
          let isValid = removeInvalid ?
              (attLookup.atts[prop] ? attLookup.atts[prop].includes(elNodename) : false) :
              false;

          // remove null transforms
          if (prop === 'transform' && value === 'matrix(1 0 0 1 0 0)') isValid = false;

          // allow data attributes
          let isDataAtt = prop.startsWith('data-') ? true : false;
          let isMeta = prop === 'title';
          let isAria = prop.startsWith('aria-');

          if( (allowDataAtts && isDataAtt) || (allowAriaAtts && isAria) || (allowMeta && isMeta ) ) continue

          // filter out defaults
          let isDefault = removeDefaults ?
              (attLookup.defaults[prop] ? attLookup.defaults[prop] !== undefined && attLookup.defaults[prop].includes(value) : false) :
              false;

          let isFutileStroke = noStrokeColor && strokeAtts.includes(prop);

          if (isDefault || isDataAtt || isMeta || isAria || isFutileStroke) isValid = false;
          if (include.includes(prop)) isValid = true;

          if (isValid) {
              propsFiltered[prop] = props[prop];
          }
          else {

              remove.push(prop);
          }
      }

      return { propsFiltered, remove }
  }

  function parseValue(valStr = '') {

      valStr = valStr.replace('!important', '');
      let valArr = (valStr.includes("'") || valStr.includes('(') || valStr.includes(')')) ? [valStr] : valStr.split(/,| /).filter(Boolean);

      for (let i = 0; i < valArr.length; i++) {

          let valStr = valArr[i];
          let val = { value: null, unit: '', numeric: false };
          let isNumeric = isNumericValue(valStr);
          if (!isNumeric) {
              val.value = valStr;
          }
          else if (isNumeric) {
              let unit = getUnit(valStr);
              let valNum = parseFloat(valStr);
              val.value = valNum;
              val.unit = unit;
              val.numeric = true;
          }
          valArr[i] = val;
      }

      return valArr;
  }

  function getSvgCssProps(el) {
      let styleAtt = el.getAttribute('style');
      let props = styleAtt ? parseInlineCss(styleAtt) : {};
      return props
  }

  function getSvgPresentationAtts(el) {
      let props = {};
      let atts = [...el.attributes].map((att) => att.name);
      let l = atts.length;
      if (!l) return props;

      for (let i = 0; i < l; i++) {
          let att = atts[i];
          let value = el.getAttribute(att);

          // test invalid transform functions
          if (att === 'transform') {
              let transformSan = [];
              let transFormFunctions = value.split(/(\w+)\(([^)]+)\)/).map(val => val.trim()).filter(Boolean);

              for (let i = 1; i < transFormFunctions.length; i += 2) {
                  let prop = transFormFunctions[i - 1];
                  let val = transFormFunctions[i];
                  let units = val.split(/,| /).map(val => getUnit(val.trim())).filter(Boolean);

                  // remove invalid transform function
                  if (!units.length) {
                      transformSan.push(`${prop}(${val})`);
                  }
              }
              value = transformSan.join(' ');
          }

          props[att] = value.trim();
      }

      return props;
  }

  function parseInlineCss(styleAtt = '') {

      let props = {};
      if (!styleAtt) return props;

      let styleArr = styleAtt.split(';').filter(Boolean).map(prop => prop.trim());
      let l = styleArr.length;
      if (!l) return props;

      for (let i = 0; l && i < l; i++) {
          let style = styleArr[i];
          let [prop, value] = style.split(':').filter(Boolean);
          props[prop] = value;
      }

      return props
  }

  function toCamelCase(str) {
    return str
      .split(/[-| ]/)
      .map((e, i) => i
        ? e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()
        : e.toLowerCase()
      )
      .join('')
  }

  function toShortStr(str) {
    if (isNumericValue(str)) return str
    let strShort = str.split('-').map(str => { return str.replace(/a|e|i|o|u/g, '') }).join('-');
    strShort = toCamelCase(strShort);
    return strShort
  }

  function stringifySVG(svg, {
    omitNamespace = false,
    removeComments = true,
    format = 0,
  } = {}) {

    let markup = '';

    if (format < 2) {
      markup = new XMLSerializer().serializeToString(svg);

      markup = minifySVGMarkup(markup, { removeComments });
      
    } else {
      markup = serializeSVGPretty(svg);
    }

    if (omitNamespace) {
      markup = markup.replaceAll('xmlns="http://www.w3.org/2000/svg"', '');
    }

    if (removeComments) {
      markup = markup
        .replace(/(<!--.*?-->)|(<!--[\S\s]+?-->)|(<!--[\S\s]*?$)/g, '');
    }

    /*
    markup = markup
      .replace(/\t/g, "")
      .replace(/[\n\r|]/g, "\n")
      .replace(/\n\s*\n/g, '\n')
      .replace(/ +/g, ' ')

      .replace(/> </g, '><')
      .trim()
      // sanitize linebreaks within pathdata
      .replaceAll('&#10;', '\n');
    */

    return markup
  }

  function minifySVGMarkup(svg, {
    removeComments = true,
  } = {}) {

    if (removeComments) {
      svg = svg.replace(/<!--[\s\S]*?-->/g, '');
    }

    // Remove whitespace between tags
    svg = svg.replace(/>\s+</g, '><')
      // Trim leading/trailing whitespace
      .trim()
      // Remove extra whitespace within tags (attributes)
      .replace(/\s+([=])\s+/g, '$1')
      .replace(/\s+(?=[^<]*>)/g, ' ')
      // Collapse multiple spaces to single space
      .replace(/\s{2,}/g, ' ')
      // Remove spaces around = signs in attributes
      .replace(/\s*=\s*/g, '=');

    return svg
  }

  function serializeSVGPretty(xmlDoc, {
    indentSize = 2 } = {}) {
    if (typeof xmlDoc === 'string') {
      xmlDoc = new DOMParser().parseFromString(xmlDoc, 'image/svg+xml').querySelector('svg');
    }
    return formatXMLNode(xmlDoc, 0, indentSize);
  }

  function formatXMLNode(node, level, indentSize) {
    let indent = " ".repeat(level * indentSize);

    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent.trim();
      return text ? text : "";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      let hasChildren = node.children.length > 0;
      let hasTextContent = node.textContent.trim().length > 0 && node.children.length === 0;

      let result = `${indent}<${node.nodeName}`;

      // Add attributes
      for (let i = 0; i < node.attributes.length; i++) {
        let att = node.attributes[i];
        result += ` ${att.name}="${att.value}"`;
      }

      if (!hasChildren && !hasTextContent) {
        return result + " />\n";
      }

      result += ">";

      if (hasChildren) {
        result += "\n";
        for (let child of node.children) {
          result += formatXMLNode(child, level + 1, indentSize);
        }
        result += `${indent}</${node.nodeName}>\n`;
      } else if (hasTextContent) {
        result += node.textContent.trim();
        result += `</${node.nodeName}>\n`;
      } else {
        result += `</${node.nodeName}>\n`;
      }

      return result;
    }

    return "";
  }

  function removeHiddenSvgEls(svg) {
    let els = svg.querySelectorAll('*');
    els.forEach(el => {
      el.nodeName.toLowerCase();
      let style = el.getAttribute('style') || '';
      let isHiddenByStyle = style ? style.trim().includes('display:none') : false;
      let isHidden = (el.getAttribute('display') && el.getAttribute('display') === 'none') || isHiddenByStyle;
      if (isHidden) el.remove();
    });

  }

  function removeSvgEls(svg, {
    removeElements = [],
    removeNameSpaced = true,
  } = {}) {

    // always remove scripts
    removeElements.push('script');

    let els = svg.querySelectorAll('*');
    let allowMeta = !removeElements.includes('metadata');

    els.forEach(el => {
      let nodeName = el.nodeName;
      let isMeta = allowMeta && el.closest('metadata');
      if (
        !isMeta &&
        ((removeNameSpaced && nodeName.includes(':')) ||
          removeElements.includes(nodeName))
      ) {
        el.remove();
      }
    });
  }

  /*export function removeSvgEls(svg, remove = []) {
    // remove elements
    if (remove.length) {
      let selector = remove.join(', ').replaceAll(':', '\\:');
      svg.querySelectorAll(selector).forEach(el => {
        el.remove()
      })
    }
  }
  */

  function removeSvgAtts(svg, remove = []) {
    remove.forEach(att => {
      svg.removeAttribute(att);
    });
  }

  function removeSvgChildAtts(svg, remove = []) {
    if (remove.length) {
      let selector = remove.map(att => { return `[${att}]` }).join(', ')
        // escape name spaced
        .replaceAll(':', '\\:');

      svg.querySelectorAll(selector).forEach(el => {
        remove.forEach(att => {
          el.removeAttribute(att);
        });
      });
    }
  }

  /**
   * general clean up to remove bullshit like
   * version or enable background
   */

  function cleanupSVGAttributes(svg, {
    removeIds = false,
    removeClassNames = false,
    removeDimensions = false,
    stylesToAttributes = false,
    allowMeta = false,
    allowAriaAtts = false,
    allowDataAtts = false,
  } = {}) {

    let allowed = new Set(['viewBox', 'xmlns', 'width', 'height']);

    if (!removeIds) allowed.add('id');
    if (!removeClassNames) allowed.add('class');
    if (removeDimensions) {
      allowed.delete('width');
      allowed.delete('height');
    }

    allowed = Array.from(allowed);
    if (!stylesToAttributes) {
      allowed.push('fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'font-family', 'font-style', 'style');
    }

    removeExcludedAttribues(svg, { allowed, allowMeta, allowAriaAtts, allowDataAtts });
  }

  function removeExcludedAttribues(el, {
    allowed = ['viewBox', 'xmlns', 'width', 'height', 'id', 'class'],
    allowAriaAtts = true,
    allowDataAtts = true,
    allowMeta = false
  } = {}) {
    let atts = [...el.attributes].map((att) => att.name);
    atts.forEach((att) => {

      let isMeta = allowMeta && (att === 'title');
      let isAria = allowAriaAtts && att.startsWith('aria-');
      let isData = allowDataAtts && att.startsWith('data-');

      if (
        !allowed.includes(att) &&
        !isAria && !isData && !isMeta
      ) {
        el.removeAttribute(att);
      }
    });
  }

  function removeElAtts(el, exclude = [], include = []) {
    let atts = [...el.attributes].map((att) => att.name);
    atts.forEach((att) => {
      if (exclude.includes(att) && !include.includes(att)) {
        el.removeAttribute(att);
      }
    });
  }

  /*

  function cleanSvgPrologue(svgString) {
    return (
      svgString
        // Remove XML prologues like <?xml ... ?>
        .replace(/<\?xml[\s\S]*?\?>/gi, "")
        // Remove DOCTYPE declarations
        .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
        // Remove comments <!-- ... -->
        .replace(/<!--[\s\S]*?-->/g, "")
        // Trim extra whitespace
        .trim()
    );
  }
  */

  function convertPathLengthAtt(el, {
      styleProps = {}
  }={}) {

      let pathLength = el.getAttribute('pathLength') ? +el.getAttribute('pathLength') : 0;

      if (pathLength && (styleProps['stroke-dasharray'] || styleProps['stroke-dashoffset'])) {
          let elLength = getElementLength(el, {
              pathLength,
              props: styleProps
          });

          let scale = elLength / pathLength;

          styleProps = scaleProps(styleProps, { props: ['stroke-dasharray', 'stroke-dashoffset'], scale });
          [styleProps['stroke-dasharray'], styleProps['stroke-dashoffset']];

          // tag for removal
          delete styleProps['pathLength'];
          styleProps.remove.push('pathLength');
          el.removeAttribute('pathLength');

      }

      return styleProps;

  }

  function ungroupElements(groups) {
    groups.forEach((g, i) => {
      let children = [...g.children];

      children.forEach(child => {
        g.parentNode.insertBefore(child, g);
      });
      g.remove();
    });
  }

  /**
   * Parse nested CSS text into a flat object structure
   * Supports arbitrary nesting depth and & parent selector reference
   * Respects !important modifiers and handles data URLs
   */
  function parseSvgCss(css, {
    parent=null,
    removeUnused=true,
    flatten = true
  }={}) {
    
    let type = typeof css;
    if(type==='string') removeUnused = false;
    
    // get style element text content
    if(type!=='string' ){
      if(css.nodeName==='style'){
        css = css.innerHTML;
      }
      else if(css.nodeName==='svg'){
        let styleEl = css.querySelector('style');
        if(!styleEl) return {}
        parent = css;
        css = styleEl.innerHTML;
      }

      else {
       console.warn('invalid CSS input');
       return {}
      }
    }
    
    css = css.trim();
    if (!css) return {};

    // Remove comments
    css = css.replace(/\/\*[\s\S]*?\*\//g, "");

    function parseBlock(text, parentSelector = "") {
      let i = 0;
      let rules = {};
      let l = text.length;

      while (i < l) {
        // Skip whitespace
        while (/\s/.test(text[i])) i++;
        if (i >= l) break;

        // Peek ahead to check if this is a selector or a declaration
        let peekIdx = i;
        let isSelector = false;

        // Look for '{' before ';' to determine if it's a selector
        while (peekIdx < l && text[peekIdx] !== ";") {
          if (text[peekIdx] === "{") {
            isSelector = true;
            break;
          }
          peekIdx++;
        }

        if (!isSelector) {
          // It's a declaration, skip it (will be handled below)
          i = peekIdx + 1;
          continue;
        }

        // Read selector (up to '{')
        let selector = "";
        while (i < l && text[i] !== "{") {
          selector += text[i];
          i++;
        }

        selector = selector.trim();
        if (!selector || text[i] !== "{") continue;

        i++; // skip '{'

        // Find matching closing brace
        let blockContent = "";
        let depth = 1;

        while (i < l && depth > 0) {
          if (text[i] === "{") depth++;
          else if (text[i] === "}") depth--;

          if (depth > 0) blockContent += text[i];
          i++;
        }

        // Compose full selector
        let fullSelector = selector;
        if (parentSelector) {
          if (selector.includes("&")) {
            fullSelector = selector.replace(/&/g, parentSelector);
          } else {
            fullSelector = parentSelector + " " + selector;
          }
        }
        fullSelector = fullSelector.replace(/\s+/g, " ").trim();

        // Separate declarations from nested rules
        let { declarations, hasNested } = extractDeclarations(blockContent);

        // Add declarations for this selector (respect !important)
        if (Object.keys(declarations).length) {
          if (!rules[fullSelector]) {
            rules[fullSelector] = declarations;
          } else {
            // Merge declarations, preserving !important
            for (let prop in declarations) {
              let existingValue = rules[fullSelector][prop];
              let newValue = declarations[prop];

              // Only override if existing doesn't have !important, or new has !important
              let existingHasImportant =
                existingValue && existingValue.includes("!important");
              let newHasImportant = newValue.includes("!important");

              if (!existingHasImportant || newHasImportant) {
                rules[fullSelector][prop] = newValue;
              }
            }
          }
        }

        // If block contains nested rules, parse them recursively
        if (hasNested) {
          parseBlock(blockContent, fullSelector);
        }
      }
      
      return rules
      
    }

    function extractDeclarations(content) {
      let declarations = {};
      let i = 0;
      let l= content.length;
      let hasNested = false;

      while (i < l) {
        // Skip whitespace
        while (i < l && /\s/.test(content[i])) i++;
        if (i >= l) break;

        // Check if next thing is a nested selector or a declaration
        let checkIdx = i;
        let isNested = false;

        // Scan until we hit ':' or '{' or ';'
        while (checkIdx < l) {
          if (content[checkIdx] === "{") {
            isNested = true;
            break;
          }
          if (content[checkIdx] === ":") {
            // It's a declaration
            break;
          }
          if (content[checkIdx] === ";") {
            // Empty or malformed
            break;
          }
          checkIdx++;
        }

        if (isNested) {
          // Skip nested rule (will be handled by recursive call)
          hasNested = true;
          // Skip to closing brace of this nested rule
          let depth = 0;
          while (i < l) {
            if (content[i] === "{") depth++;
            if (content[i] === "}") depth--;
            i++;
            if (depth === 0) break;
          }
        } else {
          // It's a declaration, read until ';' (but respect url() and quotes)
          let decl = "";
          let inUrl = false;
          let inQuotes = false;
          let quoteChar = "";

          while (i < l) {
            let char = content[i];
            let nextChar = content[i + 1];

            // Track if we're inside url()
            if (
              char === "u" &&
              nextChar === "r" &&
              content.slice(i, i + 4) === "url("
            ) {
              inUrl = true;
            }

            // Track quotes
            if (
              (char === '"' || char === "'") &&
              (i === 0 || content[i - 1] !== "\\")
            ) {
              if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
              } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = "";
              }
            }

            // Check for end of url()
            if (inUrl && char === ")" && !inQuotes) {
              inUrl = false;
            }

            // Only break on semicolon if we're not inside url() or quotes
            if (char === ";" && !inUrl && !inQuotes) {
              i++; // skip ';'
              break;
            }

            decl += char;
            i++;
          }

          decl = decl.trim();
          if (decl) {
            let colonIdx = decl.indexOf(":");
            if (colonIdx > -1) {
              let prop = decl.substring(0, colonIdx).trim();
              let value = decl.substring(colonIdx + 1).trim();
              if (prop && value) {

                declarations[prop] = value;
              }
            }
          }
        }
      }

      return { declarations, hasNested };
    }

    let rules = parseBlock(css);
    if(parent && removeUnused) rules = removeUnusedSelectors(parent, rules);
    if(flatten) rules = flattenCssProps(rules);

    // emulate specificity: prioritize ids and important
    let rulesID = {};
    let rulesImportant = {};
    for(let rule in rules){
      if(rule.startsWith('#')){
        rulesID[rule] = rules[rule];
        delete rules[rule];
      }

      for(let prop in rules[rule]){
        let val = rules[rule][prop];
        if(val.includes('!important')){
          if(!rulesImportant[rule]) rulesImportant[rule]={};
          rulesImportant[rule][prop] = val;
        }
      }
    }

    rules= {
      ...rules,
      ...rulesID,
      ...rulesImportant
    };

    return rules;
  }

  function flattenCssProps(rules) {
    for (let selector in rules) {
      let targets = selector.split(/,/).map((sel) => sel.trim());
      rules[selector];
      if (targets.length > 1) {
        targets.forEach((target) => {
          let props = rules[target];
          for (let prop in props) {
            let value = props[prop];
            if (!value.includes("!important")) {
              rules[target][prop] = value;
            }
          }
        });
        delete rules[selector];
      }
    }
    return rules;
  }

  function removeUnusedSelectors(parent=null, props={}){
    let selectors = Object.keys(props);  
    selectors.forEach(selector=>{
      let el = parent.querySelector(selector);
      // remove
      if(!el && selector!==':root') {

        delete props[selector];
      }
    });
    return props
  }

  function setNormalizedTransformsToEl(el, {
    styleProps = {},
  } = {}) {
    let { remove, matrix, transComponents } = styleProps;
    let name = el.nodeName.toLowerCase();

    if(!matrix) return styleProps;

    let { rotate, scaleX, scaleY, skewX, translateX, translateY } = transComponents;

    // scale attributes instead of transform
    let hasRot = rotate !== 0 || skewX !== 0;
    let unProportional = scaleX !== scaleY;
    let scalableByAtt = ['circle', 'ellipse', 'rect'];

    let needsTrans = (hasRot) || unProportional;
    needsTrans = true;

    if (!needsTrans && scalableByAtt.includes(name)) {

      if (name === 'circle' || name === 'ellipse') {
        styleProps.cx[0] = [styleProps.cx[0] * scaleX + translateX];
        styleProps.cy[0] = [styleProps.cy[0] * scaleX + translateY];

        if (styleProps.r) styleProps.r[0] = [styleProps.r[0] * scaleX];
        if (styleProps.rx) styleProps.rx[0] = [styleProps.rx[0] * scaleX];
        if (styleProps.ry) styleProps.ry[0] = [styleProps.ry[0] * scaleX];

      }
      else if (name === 'rect') {
        let x = styleProps.x ? styleProps.x[0] + translateX : translateX;
        let y = styleProps.y ? styleProps.y[0] + translateY : translateY;

        let rx = styleProps.rx ? styleProps.rx[0] * scaleX : 0;
        let ry = styleProps.ry ? styleProps.ry[0] * scaleY : 0;

        styleProps.x = [x];
        styleProps.y = [y];

        styleProps.rx = [rx];
        styleProps.ry = [ry];

        styleProps.width = [styleProps.width[0] * scaleX];
        styleProps.height = [styleProps.height[0] * scaleX];
      }

      // remove now obsolete transform properties
      delete styleProps.matrix;
      delete styleProps.transformArr;
      delete styleProps.transComponents;

      // mark transform attribute for removal
      styleProps.remove.push('transform');

      // scale props like stroke width or dash-array
      styleProps = scaleProps$1(styleProps, { props: ['stroke-width', 'stroke-dasharray'], scale: scaleX });

    } else {
      el.setAttribute('transform', transComponents.matrixAtt);

    }

    return styleProps

  }

  function scaleProps$1(styleProps = {}, { props = [], scale = 1 } = {}, round = true) {
    if (scale === 1 || !props.length) return props;

    for (let i = 0; i < props.length; i++) {
      let prop = props[i];

      if (styleProps[prop] !== undefined) {
        styleProps[prop] = styleProps[prop].map(val => round ? roundTo(val * scale, 2) : val * scale);
      }
    }
    return styleProps
  }

  function cleanUpSVG(svgMarkup, {
    removeHidden = true,

    stylesToAttributes = true,
    attributesToGroup = false,

    removePrologue = true,
    removeIds = false,
    removeClassNames = false,
    removeDimensions = false,
    fixHref = false,
    legacyHref = false,
    cleanupDefs = true,
    cleanupClip = true,
    addViewBox = false,
    addDimensions = false,
    minifyRgbColors = false,

    normalizeTransforms = true,
    autoRoundValues = true,

    unGroup = false,

    mergePaths = false,
    removeOffCanvas = true,

    cleanupSVGAtts = true,
    removeNameSpaced = true,
    removeNameSpacedAtts = true,
    convertPathLength = false,

    // meta
    allowMeta = false,
    allowDataAtts = true,
    allowAriaAtts = true,

    shapeConvert = false,
    convertShapes = [],

    // remove elements
    removeElements = [],

    // remove attributes
    removeSVGAttributes = [],
    removeElAttributes = [],

    convertTransforms = false,
    removeDefaults = true,
    cleanUpStrokes = true,
    decimals = -1,
    excludedEls = [],
  } = {}) {

    // resolve dependencies
    if (unGroup || convertTransforms || minifyRgbColors || attributesToGroup) 
    stylesToAttributes = true;

    if(stylesToAttributes) cleanUpStrokes = true;

    // replace namespaced refs 
    if (fixHref) svgMarkup = svgMarkup.replaceAll("xlink:href=", "href=");

    let svg = new DOMParser()
      .parseFromString(svgMarkup, "text/html")
      .querySelector("svg");

    let viewBox = getViewBox(svg);
    let { x, y, width, height } = viewBox;
    let remove = [];

    // add viewBox
    if (addViewBox) addSvgViewBox(svg, { x, y, width, height });
    if (addDimensions) {
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
    }

    // remove unused defs or optimize order
    if (cleanupDefs) cleanupSvgDefs(svg, { x, y, width, height, cleanupClip });

    // remove off canvas
    if (removeOffCanvas) removeOffCanvasEls(svg, { x, y, width, height });

    /**
     * collect svg styles
     * and properties
     */
    let propOptions = {
      width,
      height,
      normalizeTransforms,
      removeDefaults: false,
      cleanUpStrokes: false,

      allowMeta,
      allowDataAtts,
      allowAriaAtts,
      autoRoundValues,
      removeIds,
      removeClassNames,
      minifyRgbColors,
      stylesheetProps: {},
      exclude:[]
    };

    // root svg inline style properties
    let stylePropsSVG = parseStylesProperties(svg, propOptions);

    let styleEl = svg.querySelector('style');
    let cssStylePropsSVG = {};

    if (styleEl) {
      cssStylePropsSVG = parseSvgCss(styleEl, { parent: svg });

      for (let selector in cssStylePropsSVG) {
        let els = svg.querySelectorAll(`${selector}`);
        els.forEach(el => {
          if (!el['cssRules']) el['cssRules'] = [];
          el['cssRules'].push(selector);

          // remove class names only used for styling
          if (stylesToAttributes) {
            let className = selector.substring(1);
            el.classList.remove(className);
          }
        });
      }

      // remove style element from element
      if (stylesToAttributes) {
        styleEl.remove();
      }
    }
    // remove style element from root SVG
    if (stylesToAttributes) svg.removeAttribute('style');

    // add stylesheet props
    propOptions.stylesheetProps = cssStylePropsSVG;

    // add svg font size for scaling relative
    propOptions.fontSize = stylePropsSVG['font-size'] ? stylePropsSVG['font-size'][0] : 16;

    /**
     * get group styles
     * especially transformations to
     * be inherited by children
     */
    let groups = svg.querySelectorAll('g');

    groups.forEach(g => {

      let stylePropsG = parseStylesProperties(g, propOptions);
      let children = g.querySelectorAll(`${renderedEls.join(', ')}`);

      // store parent styles to child property
      children.forEach(child => {
        if (child.parentStyleProps === undefined) {
          child.parentStyleProps = [];
        }
        child.parentStyleProps.push(stylePropsG);
      });
    });

    // collect all elements' properties
    let svgElProps = [];
    let els = svg.querySelectorAll(`${renderedEls.join(', ')}`);

    /**
     * loop all geometry elements
     */
    for (let i = 0; i < els.length; i++) {
      let el = els[i];

      let name = el.nodeName.toLowerCase();

      /**
       * get all element style properties
       * convert relative or physical units
       * to user units
       */
      let styleProps = parseStylesProperties(el, propOptions);
      let stylePropsFiltered = {};

      // convert pathLength before transforming
      if (convertPathLength) {
        styleProps = convertPathLengthAtt(el, { styleProps });
        remove = [...new Set([...remove, ...styleProps.remove])];
      }

      // get parent styles
      let { parentStyleProps = [] } = el;
      let inheritedProps = {};
      let transFormInherited = [];

      /** 
       * consolidate all properties:
       * merge with inherited transforms 
       * and styles from group 
       */
      parentStyleProps.forEach(props => {
        // transforms from groups are applied cumulatively
        let { transformArr = [] } = props;
        transFormInherited.push(...transformArr);

        // merge
        inheritedProps = {
          ...inheritedProps,
          ...props
        };
      });

      // merge all transforms
      transFormInherited = [...transFormInherited, ...styleProps.transformArr];
      styleProps.transformArr = transFormInherited;

      // don't inherit class from SVG
      if (stylePropsSVG['class']) delete stylePropsSVG['class'];
      if (stylePropsSVG['id']) delete stylePropsSVG['id'];

      // merge with svg props
      styleProps = {
        ...stylePropsSVG,
        ...inheritedProps,
        ...styleProps
      };

      // add combined transforms
      addTransFormProps(styleProps, transFormInherited);

      remove = [...new Set([...remove, ...styleProps.remove])];

      /**
       * remove els and attributes
       */

      // remove meta
      if (!allowMeta) removeElements.push('meta', 'metadata', 'desc', 'title');

      if (removeClassNames) {
        removeSVGAttributes.push('class');
        removeElAttributes.push('class');
      }

      if (removeIds) {
        removeSVGAttributes.push('id');
        removeElAttributes.push('id');
      }

      // remove hidden elements
      removeHiddenSvgEls(svg);

      // remove SVG elements
      removeSvgEls(svg, { removeElements, removeNameSpaced });

      // remove SVG attributes
      removeSvgAtts(svg, removeSVGAttributes);

      // remove SVG child element attributes
      removeSvgChildAtts(svg, removeElAttributes);

      // general cleanup
      if (cleanupSVGAtts) cleanupSVGAttributes(svg, { removeIds, removeClassNames, removeDimensions, stylesToAttributes, allowMeta, allowAriaAtts, allowDataAtts });

      if (stylesToAttributes) {

        /**
         * normalize transforms
         */
        if (normalizeTransforms) {
          styleProps = setNormalizedTransformsToEl(el, { styleProps });

          remove = [...new Set([...remove, ...styleProps.remove])];

        }

        /**
         * apply consolidated 
         * element attributes
         * remove non-supported element props
         */
        stylePropsFiltered = filterSvgElProps(name, styleProps,
          { removeDefaults: true, cleanUpStrokes, allowMeta, allowAriaAtts, allowDataAtts, removeIds });

        remove = [...new Set([...remove, ...stylePropsFiltered.remove])];

        for (let prop in stylePropsFiltered.propsFiltered) {
          let values = styleProps[prop];
          let val = values.length ? values.join(' ') : values[0];
          el.setAttribute(prop, val);
        }

        /**
         * remove obsolete 
         * attributes
         */

        for (let i = 0; i < remove.length; i++) {
          let att = remove[i];

          el.removeAttribute(att);
        }

      } // endof style processing

      /**
       * element conversions:
       * shapes to paths or 
       * paths to shapes
       */

      // force shape conversion when transform conversion is enabled
      if (convertTransforms) {
        shapeConvert = 'toPaths';
        convertShapes = ['path', 'rect', 'ellipse', 'circle', 'line', 'polygon', 'polyline'];
      }

      // convert shapes to paths
      if (shapeConvert === 'toPaths') {

        let { matrix = null, transComponents = null } = styleProps;

        // scale props like stroke width or dash-array before conversion
        if (matrix && transComponents) {
          ['stroke-width', 'stroke-dasharray'].forEach(att => {
            let attVal = el.getAttribute(att);
            let vals = attVal ? attVal.split(' ').filter(Boolean).map(Number).map(val => val * transComponents.scaleX) : [];
            if (vals.length) el.setAttribute(att, vals.join(' '));
          });
        }

        // convert paths only if a matrix transform is required
        if (matrix ? geometryEls.includes(name) : shapeEls.includes(name)) {

          let path = shapeElToPath(el, { width, height, convertShapes, matrix });
          el.replaceWith(path);
          name = 'path';
          el = path; // required for node

        }

      }

      /**
       * Reverse conversion:  
       * paths to shapes 
       */
      else if (shapeConvert === 'toShapes') {
        let paths = svg.querySelectorAll('path');
        paths.forEach(path => {
          let shape = pathElToShape(path, { convertShapes });
          path.replaceWith(shape);
          path = shape;

        });
      }

      /**
       * combine styles
       * store in node property
       */
      if (mergePaths || attributesToGroup) {

        let options = { allowMeta, allowAriaAtts, removeIds, removeClassNames, allowDataAtts };

        /**
         * exclude properties for 
         * adjacent path merging 
         * e.g ignore classnames or ids
         */
        if (mergePaths) {
          options.removeIds = true;
          options.removeClassNames = true;
          options.allowAriaAtts = false;
          options.allowMeta = false;
        }

        stylePropsFiltered = filterSvgElProps(name, styleProps, options).propsFiltered;

        for (let prop in stylePropsFiltered) {

          if (geometryProps.includes(prop)) continue;

          let values = stylePropsFiltered[prop];
          let val = values.length ? values.join(' ') : values[0];

          if(prop!=='class' && prop!=='id'){

            let propShort = toShortStr(prop);
            let valShort = toShortStr(val);
            let propStr = `${propShort}-${valShort}`;
    
            // store in node property
            if (!el.styleSet) el.styleSet = new Set();
            if(propStr) el.styleSet.add(propStr);
          }
        }

      }

    }//endof element loop

    /**
     * remove group styles
     * copied to children
     * or remove nesting
     */

    if (unGroup) {
      ungroupElements(groups);
    } else {

      if (stylesToAttributes) {
        groups.forEach(g => {
          removeElAtts(g, ['style', 'transform']);
        });
      }

    }

    // styles to group
    if (attributesToGroup) sharedAttributesToGroup(svg);

    /** 
     * merge paths with same styles
     */
    if (mergePaths) {
      mergePathsWithSameProps(svg);
    }

    // remove futile clip-paths
    if (cleanupClip) removeFutileClipPaths(svg, { x, y, width, height });

    // replace href attributes with namespace - required by many older applications
    if (legacyHref) hrefToXlink(svg);

    // remove empty class attributes
    removeEmptyClassAtts(svg);
    return { svg, svgElProps }

  }

  function removeEmptyClassAtts(svg) {
    let emptyClassEls = svg.querySelectorAll('[class=""');
    emptyClassEls.forEach(el => {
      el.removeAttribute('class');
    });
  }

  /** 
  * shared styles to group
  */
  function sharedAttributesToGroup(svg) {

    let els = svg.querySelectorAll(renderedEls.join(', '));
    let len = els.length;
    if(len===1) return;

    let el0 = els[0] || null;
    let stylePrev = el0.styleSet !== undefined ? [...el0.styleSet].join('_') : '';

    // all props
    let allProps = {};

    // find attributes shared by all
    let globalAtts = [];

    if (len) {

      let groups = [[el0]];
      let idx = 0;
      let elPrev = el0;

      for (let i = 0; i < len; i++) {
        let el = els[i];
        let atts = getElementAtts(el);
        for (let att in atts) {
          let att_str = `${att}_${atts[att]}`;

          if (!allProps[att_str]) {
            allProps[att_str] = [];
          }
          allProps[att_str].push(el);
          //
          if (allProps[att_str].length === len) {
            globalAtts.push(att);
          }
        }
      }

      // apply global to parent SVG
      if (globalAtts.length) {
        let atts0 = getElementAtts(el0);
        for (let att in atts0) {
          if (globalAtts.includes(att) && att !== 'transform') {
            svg.setAttribute(att, atts0[att]);
          }
        }
      }

      // detect groups
      for (let i = 1; i < len; i++) {
        let el = els[i];
        let styleArr = el.styleSet !== undefined ? [...el.styleSet] : [];
        let style = styleArr.length ? styleArr.join('_') : '';

        // same style add to group
        if (style === stylePrev && elPrev.nextElementSibling === el) {
          groups[idx].push(el);
        }
        // start new group
        else {
          groups.push([el]);
          idx++;
        }
        // update style
        stylePrev = style;
        elPrev = el;

      }// endof el loop

      // create groups
      for (let i = 0; i < groups.length; i++) {
        let children = groups[i];
        let child0 = children[0];
        let atts = getElementAtts(child0);
        let groupEl = child0.parentNode.closest('g');

        // only 1 child - nothing to group
        if (children.length === 1) continue

        // create new group
        if (!groupEl || groups.length>1) {

          groupEl = document.createElementNS(svgNs, 'g');
          child0.parentNode.insertBefore(groupEl, child0);
          groupEl.append(...children);
        }

        // move attributes to group
        for (let att in atts) {
          let val = atts[att];

          let excludeAtts = ['id', 'class'];
          if (!geometryProps.includes(att) && !excludeAtts.includes(att)) {
            if (!globalAtts.includes(att) || att === 'transform') {
              groupEl.setAttribute(att, val);
            }
            children.forEach(child => {
              child.removeAttribute(att);
            });
          }
        }

      } // endof groups

    }
  }

  // merge adjacent paths
  function mergePathsWithSameProps(svg) {
    let paths = svg.querySelectorAll('path');
    let len = paths.length;

    if (len) {
      let path0 = paths[0];
      let d0 = path0.getAttribute('d');
      let stylePrev = path0.styleSet !== undefined ? [...path0.styleSet].join(' ') : '';

      let remove = [];

      for (let i = 1; i < len; i++) {
        let path = paths[i];
        let style = path.styleSet !== undefined ? [...path.styleSet].join(' ') : '';
        let isSibling = path.previousElementSibling === path0;
        let d = path.getAttribute('d');
        let isAbs = d.startsWith('M');

        if (isSibling && style === stylePrev) {
          let dAbs = isAbs ? d : parsePathDataString(d).pathData.map(com => `${com.type} ${com.values.join(' ')}`).join(' ');

          d0 += dAbs;
          path0.setAttribute('d', d0);

          remove.push(path);

        } else {
          path0 = path;

          d0 = isAbs ? d : parsePathDataString(d).pathData.map(com => `${com.type} ${com.values.join(' ')}`).join(' ');

        }

        // update style
        stylePrev = style;
      }

      remove.forEach(el => {
        el.remove();
      });

    }

  }

  function removeOffCanvasEls(svg, { x = 0, y = 0, width = 0, height = 0 } = {}) {
    let els = [...svg.querySelectorAll('path, polygon, polyline, line, rect, circle, ellipse, text')];
    els = els.filter(el => !el.parentNode.closest('defs') && !el.parentNode.closest('symbol') && !el.parentNode.closest('clipPath') && !el.parentNode.closest('mask') && !el.parentNode.closest('pattern'));

    let bb0 = { x, y, width, height };
    bb0.right = x + width;
    bb0.bottom = y + height;

    els.forEach(el => {
      let bb = getElBBox(el);
      let outside = bb.right < bb0.x || bb.bottom < bb0.y || bb.x > bb0.right || bb.y > bb.bottom;
      if (outside) el.remove();
    });

  }

  function addSvgViewBox(svg, { x = 0, y = 0, width = 0, height = 0 } = {}) {
    if (svg.hasAttribute('viewBox')) return;
    if (!width || !height) {
      ({ x, y, width, height } = getViewBox(svg));
    }
    svg.setAttribute('viewBox', [x, y, width, height].join(' '));
  }

  function cleanupSvgDefs(svg, { x = 0, y = 0, width = 0, height = 0, cleanupClip = true } = {}) {
    let defs = svg.querySelectorAll('defs');
    let defEls = svg.querySelectorAll('symbol, pattern, linearGradient, radialGradient, clipPath, mask, marker, filter');

    // no defs to remove/optimize
    if (!defs.length && !defEls.length) return;

    defs.forEach(def => {
      // remove empty defs
      let children = [...def.children];
      if (!children.length) {
        def.remove();
      }
      // move defs to top
      else {
        svg.insertBefore(def, svg.children[0]);
      }
    });

    let refIds = new Set([]);
    defEls.forEach(def => {
      refIds.add(def.id);
    });

    Array.from(refIds).forEach(id => {
      let els = svg.querySelectorAll(`[href="#${id}"], [xlink\\:href="#${id}"], [clip-path="url(#${id})"], [mask="url(#${id})"],  [fill="url(#${id})"], [stroke="url(#${id})"]`);

      if (!els.length) {

        svg.getElementById(id).remove();
      }
    });

  }

  function removeFutileClipPaths(svg, { x = 0, y = 0, width = 0, height = 0 } = {}) {
    let clipPaths = svg.querySelectorAll('clipPath');

    if (!clipPaths.length) return

    if (!width || !height) {
      ({ x, y, width, height } = getViewBox(svg));
    }

    clipPaths.forEach(clip => {
      let children = [...clip.children];
      if (children.length > 1) return;

      let clipEl = children[0];
      let type = clipEl.nodeName.toLowerCase();

      if (type === 'path' || type === 'rect') {
        let bb = { x: 0, y: 0, width: 0, height: 0 };

        if (type === 'path') {
          let pathData = parsePathDataNormalized(clipEl.getAttribute('d'));
          let coms = Array.from(new Set(pathData.map(com => com.type.toLowerCase()))).join('');
          let isPolygon = !(/[acqts]/gi).test(coms);

          // path is too complex - unlikely to be a rectangle
          if (!isPolygon || pathData.length > 5) return

          let vertices = getPathDataVertices(pathData);
          bb = getPolyBBox(vertices);
        }

        else if (type === 'rect') {
          bb = { x: +clipEl.getAttribute('x'), y: +clipEl.getAttribute('y'), width: +clipEl.getAttribute('width'), height: +clipEl.getAttribute('height') };
        }

        // is futile if clip path's bbox equals the SVG's viewBox
        if (bb.x === x && bb.y === y && bb.width === width && bb.height === height) {
          clip.remove();
          let clippedEls = svg.querySelectorAll(`[clip-path="url(#${clip.id})"]`);

          clippedEls.forEach(clipped => {
            clipped.removeAttribute('clip-path');
          });
        }
      }
    });

  }

  function hrefToXlink(svg) {
    svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
    let hrefs = svg.querySelectorAll('[href]');
    hrefs.forEach(el => {
      let href = el.getAttribute('href');
      el.setAttribute('xlink:href', href);

    });
  }

  function refineRoundedCorners(pathData, {
      threshold = 0,
      tolerance = 1
  } = {}) {

      // min size threshold for corners
      threshold *= tolerance;

      let l = pathData.length;

      // add fist command
      let pathDataN = [pathData[0]];

      let isClosed = pathData[l - 1].type.toLowerCase() === 'z';
      let zIsLineto = isClosed ?
          (pathData[l - 1].p.x === pathData[0].p0.x && pathData[l - 1].p.y === pathData[0].p0.y)
          : false;

      let lastOff = isClosed ? 2 : 1;

      let comLast = pathData[l - lastOff];
      let lastIsLine = comLast.type === 'L';
      let lastIsBez = comLast.type === 'C';
      let firstIsLine = pathData[1].type === 'L';
      let firstIsBez = pathData[1].type === 'C';

      let normalizeClose = isClosed && firstIsBez && (lastIsLine || zIsLineto);

      // normalize closepath to lineto
      if (normalizeClose) {
          pathData[l - 1].values = pathData[0].values;
          pathData[l - 1].type = 'L';
          lastIsLine = true;
      }

      for (let i = 1; i < l; i++) {
          let com = pathData[i];
          let { type } = com;
          let comN = pathData[i + 1] ? pathData[i + 1] : null;

          // search small cubic segments enclosed by linetos
          if ((type === 'L' && comN && comN.type === 'C') ||
              (type === 'C' && comN && comN.type === 'L')
          ) {
              let comL0 = type === 'L' ? com : null;
              let comL1 = null;
              let comBez = [];
              let offset = 0;

              // start to end
              if (i === 1 && firstIsBez && lastIsLine) {
                  comBez = [pathData[1]];
                  comL0 = pathData[l - 1];
                  comL1 = comN;

              }

              if (!comL0) {
                  pathDataN.push(com);
                  continue
              }

              // closing corner to start
              if (isClosed && lastIsBez && firstIsLine && i === l - lastOff - 1) {
                  comL1 = pathData[1];
                  comBez = [pathData[l - lastOff]];

              }

              for (let j = i + 1; j < l; j++) {
                  let comN = pathData[j] ? pathData[j] : null;
                  let comPrev = pathData[j - 1];

                  if (comPrev.type === 'C') {
                      comBez.push(comPrev);
                  }

                  if (comN.type === 'L' && comPrev.type === 'C') {
                      comL1 = comN;
                      break;
                  }
                  offset++;
              }

              if (comL1) {

                  // linetos
                  let len1 = getDistManhattan(comL0.p0, comL0.p);
                  let len2 = getDistManhattan(comL1.p0, comL1.p);

                  // bezier

                  let len3 = getDistManhattan(comL0.p, comL1.p0);

                  // check concaveness by area sign change
                  let area1 = getPolygonArea([comL0.p0, comL0.p, comL1.p0, comL1.p], false);
                  let area2 = getPolygonArea([comBez[0].p0, comBez[0].cp1, comBez[0].cp2, comBez[0].p], false);

                  let signChange = (area1 < 0 && area2 > 0) || (area1 > 0 && area2 < 0);

                  // exclude mid bezier segments that are larger than surrounding linetos
                  let bezThresh = len3 * 0.5 * tolerance;
                  let isSmall = bezThresh < len1 && bezThresh < len2;

                  if (comBez.length && !signChange && isSmall) {

                      let isFlatBezier = Math.abs(area2) < getSquareDistance(comBez[0].p0, comBez[0].p) * 0.005;
                      let ptQ = !isFlatBezier ? checkLineIntersection(comL0.p0, comL0.p, comL1.p, comL1.p0, false, true) : null;

                      if (!ptQ) {
                          pathDataN.push(com);
                          continue
                      }

                      // check sign change
                      if (ptQ) {
                          let area0 = getPolygonArea([comL0.p0, comL0.p, comL1.p0, comL1.p], false);
                          let area0_abs = Math.abs(area0);
                          let area1 = getPolygonArea([comL0.p0, comL0.p, ptQ, comL1.p0, comL1.p], false);
                          let area1_abs = Math.abs(area1);
                          let areaDiff = Math.abs(area0_abs - area1_abs) / area0_abs;

                          /*
                          renderPoint(markers, comL0.p0, 'green', '0.5%', '0.5')
                          renderPoint(markers, comL0.p, 'red', '1.5%', '0.5')
                          renderPoint(markers, comL1.p0, 'blue', '0.5%', '0.5')
                          renderPoint(markers, comL1.p, 'orange', '0.5%', '0.5')
                          if(!area0) {
                              pathDataN.push(com);
                              continue
                          }
                          */

                          let signChange = area0 < 0 && area1 > 0 || area0 > 0 && area1 < 0;

                          if (!ptQ || signChange || areaDiff > 0.5) {

                              pathDataN.push(com);
                              continue
                          }

                      }

                      // final check: mid point proximity
                      let ptM = pointAtT([comL0.p, ptQ, comL1.p0], 0.5);
                      let ptM_bez = comBez.length === 1 ? pointAtT([comBez[0].p0, comBez[0].cp1, comBez[0].cp2, comBez[0].p], 0.5) : comBez[0].p;

                      let dist1 = getDistManhattan(ptM, ptM_bez) * 0.75;

                      // not in tolerance – return original command
                      if (bezThresh && dist1 > bezThresh && dist1 > len3 * 0.3) {

                          pathDataN.push(com);
                          continue;

                      } else {

                          let comQ = { type: 'Q', values: [ptQ.x, ptQ.y, comL1.p0.x, comL1.p0.y] };
                          comQ.p0 = comL0.p;
                          comQ.cp1 = ptQ;
                          comQ.p = comL1.p0;

                          // add quadratic command
                          pathDataN.push(comL0, comQ);
                          i += offset;

                          continue;
                      }

                  }
              }
          }

          // skip last lineto
          if (normalizeClose && i === l - 1 && type === 'L') {
              continue
          }

          pathDataN.push(com);

      }

      // revert close path normalization
      if (normalizeClose || (isClosed && pathDataN[pathDataN.length - 1].type !== 'Z')) {
          pathDataN.push({ type: 'Z', values: [] });
      }

      return pathDataN;

  }

  function getArcFromPoly(pts) {
      if (pts.length < 3) return false

      // Pick 3 well-spaced points
      let  p1 = pts[0];
      let  p2 = pts[Math.floor(pts.length / 2)];
      let  p3 = pts[pts.length - 1];

      let  x1 = p1.x, y1 = p1.y;
      let  x2 = p2.x, y2 = p2.y;
      let  x3 = p3.x, y3 = p3.y;

      let  a = x1 - x2;
      let  b = y1 - y2;
      let  c = x1 - x3;
      let  d = y1 - y3;

      let  e = ((x1 * x1 - x2 * x2) + (y1 * y1 - y2 * y2)) / 2;
      let  f = ((x1 * x1 - x3 * x3) + (y1 * y1 - y3 * y3)) / 2;

      let  det = a * d - b * c;

      if (Math.abs(det) < 1e-10) {
          console.warn("Points are collinear or numerically unstable");
          return false;
      }

      // find center of arc
      let  cx = (d * e - b * f) / det;
      let  cy = (-c * e + a * f) / det;
      let  centroid = { x: cx, y: cy };

      // Radius (use start point)
      let  r = getDistance(centroid, p1);

      let angleData = getDeltaAngle(centroid, p1, p3);
      let {deltaAngle, startAngle, endAngle} = angleData;

      return {
          centroid,
          r,
          startAngle,
          endAngle,
          deltaAngle
      };
  }

  function refineRoundSegments(pathData, {
      threshold = 0,
      tolerance = 1,
      // take arcs or cubic beziers
      toCubic = false,
      debug = false
  } = {}) {

      // min size threshold for corners
      threshold *= tolerance;

      let l = pathData.length;

      // add fist command
      let pathDataN = [pathData[0]];

      // just for debugging
      let pathDataTest = [];

      for (let i = 1; i < l; i++) {
          let com = pathData[i];
          let { type } = com;
          let comP = pathData[i - 1];
          let comN = pathData[i + 1] ? pathData[i + 1] : null;
          let comN2 = pathData[i + 2] ? pathData[i + 2] : null;
          let comN3 = pathData[i + 3] ? pathData[i + 3] : null;
          let comBez = null;

          if ((com.type === 'C' || com.type === 'Q')) comBez = com;
          else if (comN && (comN.type === 'C' || comN.type === 'Q')) comBez = comN;

          let cpts = comBez ? (comBez.type === 'C' ? [comBez.p0, comBez.cp1, comBez.cp2, comBez.p] : [comBez.p0, comBez.cp1, comBez.p]) : [];

          let areaBez = 0;
          let areaLines = 0;
          let signChange = false;
          let L1, L2;
          let combine = false;

          let p0_S, p_S;
          let poly = [];
          let pMid;

          // 2. line-line-bezier-line-line
          if (
              comP.type === 'L' &&
              type === 'L' &&
              comBez &&
              comN2.type === 'L' &&
              comN3 && (comN3.type === 'L' || comN3.type === 'Z')
          ) {

              L1 = [com.p0, com.p];
              L2 = [comN2.p0, comN2.p];
              p0_S = com.p0;
              p_S = comN2.p;

              // don't allow sign changes
              areaBez = getPolygonArea(cpts, false);
              areaLines = getPolygonArea([...L1, ...L2], false);
              signChange = (areaBez < 0 && areaLines > 0) || (areaBez > 0 && areaLines < 0);

              if (!signChange) {

                  // mid point of mid bezier
                  pMid = pointAtT(cpts, 0.5);

                  // add to poly
                  poly = [p0_S, pMid, p_S];

                  combine = true;
              }

          }

          // 1. line-bezier-bezier-line
          else if ((type === 'C' || type === 'Q') && comP.type === 'L') {

              // 1.2 next is cubic next is lineto
              if ((comN.type === 'C' || comN.type === 'Q') && comN2.type === 'L') {

                  combine = true;

                  L1 = [comP.p0, comP.p];
                  L2 = [comN2.p0, comN2.p];
                  p0_S = comP.p;
                  p_S = comN2.p0;

                  // mid point of mid bezier
                  pMid = comBez.p;

                  // add to poly
                  poly = [p0_S, comBez.p, p_S];

              }
          }

          /**
           * calculate either combined
           * cubic or arc commands
           */
          if (combine) {

              // try to find center of arc
              let arcProps = getArcFromPoly(poly);
              if (arcProps) {

                  let { centroid, r, deltaAngle, startAngle, endAngle } = arcProps;

                  let xAxisRotation = 0;
                  let sweep = deltaAngle > 0 ? 1 : 0;
                  let largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0;

                  let pCM = rotatePoint(p0_S, centroid.x, centroid.y, deltaAngle * 0.5);

                  let dist2 = getDistAv(pCM, pMid);
                  let thresh = getDistAv(p0_S, p_S) * 0.05;
                  let bezierCommands;

                  // point is close enough
                  if (dist2 < thresh) {

                      bezierCommands = arcToBezierResolved(
                          {
                              p0: p0_S,
                              p: p_S,
                              centroid,
                              rx: r,
                              ry: r,
                              xAxisRotation,
                              sweep,
                              largeArc,
                              deltaAngle,
                              startAngle,
                              endAngle
                          }
                      );

                      if(bezierCommands.length === 1){

                          // prefer more compact quadratic - otherwise arcs
                          let comBezier = revertCubicQuadratic(p0_S, bezierCommands[0].cp1, bezierCommands[0].cp2, p_S);

                          if (comBezier.type === 'Q') {
                              toCubic = true;
                          }

                          com = comBezier;
                      }

                      // prefer arcs if 2 cubics are required
                      if (bezierCommands.length > 1) toCubic = false;

                      // return elliptic arc commands
                      if (!toCubic) {
                          // rewrite simplified command
                          com.type = 'A';
                          com.values = [r, r, xAxisRotation, largeArc, sweep, p_S.x, p_S.y];
                      }

                      com.p0 = p0_S;
                      com.p = p_S;
                      com.extreme = false;
                      com.corner = false;

                      // test rendering

                      if (debug) {
                          // arcs
                          if (!toCubic) {
                              pathDataTest = [
                                  { type: 'M', values: [p0_S.x, p0_S.y] },
                                  { type: 'A', values: [r, r, xAxisRotation, largeArc, sweep, p_S.x, p_S.y] },
                              ];
                          }
                          // cubics
                          else {
                              pathDataTest = [
                                  { type: 'M', values: [p0_S.x, p0_S.y] },
                                  ...bezierCommands
                              ];
                          }

                          let d = pathDataToD(pathDataTest);
                          renderPath(markers, d, 'orange', '0.5%', '0.5');
                      }

                      pathDataN.push(com);
                      i++;
                      continue

                  }
              }
          }

          // pass through
          pathDataN.push(com);
      }

      return pathDataN;
  }

  function refineClosingCommand(pathData = [], {
      threshold = 0,
  } = {}) {

      let l = pathData.length;
      let comLast = pathData[l - 1];
      let isClosed = comLast.type.toLowerCase() === 'z';
      let idxPenultimate = isClosed ? l - 2 : l - 1;
      let comPenultimate = isClosed ? pathData[idxPenultimate] : pathData[idxPenultimate];
      let valsPen = comPenultimate.values.slice(-2);

      let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let pPen = { x: valsPen[0], y: valsPen[1] };
      let dist = getDistAv(M, pPen);

      // adjust last coordinates for better reordering
      if (dist && dist < threshold) {

          let valsLast = pathData[idxPenultimate].values;
          let valsLastLen = valsLast.length;
          pathData[idxPenultimate].values[valsLastLen - 2] = M.x;
          pathData[idxPenultimate].values[valsLastLen - 1] = M.y;

          // adjust cpts
          let comFirst = pathData[1];

          if (comFirst.type === 'C' && comPenultimate.type === 'C') {
              let dx1 = Math.abs(comFirst.values[0] - comPenultimate.values[2]);
              let dy1 = Math.abs(comFirst.values[1] - comPenultimate.values[3]);

              let dx2 = Math.abs(pathData[1].values[0] - comFirst.values[0]);
              let dy2 = Math.abs(pathData[1].values[1] - comFirst.values[1]);

              let dx3 = Math.abs(pathData[1].values[0] - comPenultimate.values[2]);
              let dy3 = Math.abs(pathData[1].values[1] - comPenultimate.values[3]);

              let ver = dx2 < threshold && dx3 < threshold && dy1;
              let hor = (dy2 < threshold && dy3 < threshold) && dx1;

              if (dx1 && dx1 < threshold && ver) {

                  pathData[1].values[0] = M.x;
                  pathData[idxPenultimate].values[2] = M.x;
              }

              if (dy1 && dy1 < threshold && hor) {

                  pathData[1].values[1] = M.y;
                  pathData[idxPenultimate].values[3] = M.y;
              }

          }
      }

      return pathData;

  }

  /**
  * scale path data proportionaly
  */
  function scalePathData(pathData, scale = 1) {
    let pathDataScaled = [];

    for (let i = 0, l = pathData.length; i < l; i++) {
      let com = pathData[i];
      let { type, values } = com;
      let comT = {
        type: type,
        values: []
      };

      switch (type.toLowerCase()) {
        // lineto shorthands
        case "h":
          comT.values = [values[0] * scale]; 
          break;
        case "v":
          comT.values = [values[0] * scale];
          break;

        // arcto
        case "a":
          comT.values = [
            values[0] * scale, // rx: scale
            values[1] * scale, // ry: scale
            values[2], // x-axis-rotation: keep it 
            values[3], // largeArc: dito
            values[4], // sweep: dito
            values[5] * scale, // final x: scale
            values[6] * scale // final y: scale
          ];
          break;

        /**
        * Other point based commands: L, C, S, Q, T
        * scale all values
        */
        default:
          if (values.length) {
            comT.values = values.map((val, i) => {
              return val * scale;
            });
          }
      }
      pathDataScaled.push(comT);
    }  return pathDataScaled;
  }

  function pathDataRevertCubicToQuadratic(pathData, tolerance=1) {

      for (let c = 1, l = pathData.length; c < l; c++) {
          let com = pathData[c];
          let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;
          if (type === 'C') {

              let comQ = revertCubicQuadratic(p0, cp1, cp2, p, tolerance);
              if (comQ.type === 'Q') {
                  comQ.extreme = com.extreme;
                  comQ.corner = com.corner;
                  comQ.dimA = com.dimA;
                  comQ.squareDist = com.squareDist;
                  pathData[c] = comQ;
              }
          }
      }
      return pathData
  }

  function fixIntersectingCpts(pathData = []) {

      let l = pathData.length;
      let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let p = p0;

      for (let i = 1; i < l; i++) {
          let com = pathData[i];
          let comPrev = pathData[i - 1] || null;
          let { type, values } = com;
          pathData[i + 1] ? pathData[i + 1] : null;

          if (type === 'C') {
              let tx = 1.2;
              let cp1 = { x: values[0], y: values[1] };
              p = { x: values[4], y: values[5] };
              let cp2 = { x: values[2], y: values[3] };

              interpolate(p0, cp1,   tx );
              let cp2_ex = interpolate( p, cp2,   tx);

              comPrev.values.slice(-2);

              // extend tangents

              let ptI = checkLineIntersection(p0, cp1, p, cp2_ex, true, true);

              
              /*
              renderPoly(markers, [p0, cp1], 'orange',  '0.75')
              renderPoly(markers, [p, cp2], 'blue',  '0.75')
              renderPoly(markers, [p, cp2_ex], 'magenta',  '0.75')

              renderPoint(markers, p0, 'orange',  '0.75')
              renderPoint(markers, cp1, 'magenta', '0.75')
              renderPoint(markers, cp1_ex, 'blue', '0.5')
   
              renderPoint(markers, cp2, 'cyan', '0.75')
              */

              

              /*
              renderPoint(markers, p0, 'orange')
              renderPoint(markers, p, 'magenta', '0.5')
              */

              if (ptI) {
                  let t = 0.666;
                  cp1 = interpolate(p0, ptI, t);
                  cp2 = interpolate(p, ptI, t);
                  com.values = [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];

              }

          }

          if (values.length) {
              p0 = p;
          }
      }

      return pathData;
  }

  function simplifyPolyRDP(pts, {quality = 0.9, width = 0, height = 0}={}) {

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
          tolerance = (tolerance * (scale)) ** 2;
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

  /**
   * radialDistance simplification
   * sloppy but fast
   */

  function simplifyPolyRD(pts, {quality = 0.9, width = 0, height = 0}={}) {

      /**
       * switch between absolute or 
       * quality based relative thresholds
       */
      let isAbsolute = false;

      if (typeof quality === 'string') {
          let value = parseFloat(quality);
          isAbsolute = true;
          quality = value;
      }

      // nothing to do - exit

      if (pts.length < 4 ) return pts;

      let p0 = pts[0];
      let pt;
      let ptsSmp = [p0];

      // convert quality to squaredistance tolerance
      let tolerance = quality;

      if (!isAbsolute) {

          // quality to tolerance
          tolerance = quality;

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
          let scale = dimAvg / 25;
          tolerance = (tolerance * (scale)) ** 2;

          if (quality > 0.5) tolerance /= 10;

      }

      for (let i = 1, l = pts.length; i < l; i++) {
          pt = pts[i];
          let dist = getSquareDistance(p0, pt);

          if (dist > tolerance) {
              ptsSmp.push(pt);
              p0 = pt;
          }
      }

      // add last point - if not coinciding with first point
      if (p0.x !== pt.x && p0.y !== pt.y) {
          ptsSmp.push(pt);
      }

      return ptsSmp;

  }

  function pathDataFromPoly(pts, closed = true) {

      let pathData = [];
      let subPath = [];

      // complex polygon
      if (Array.isArray(pts[0])) {
          pts.forEach(sub => {
              subPath = [
                  { type: 'M', values: [sub[0].x, sub[0].y] },
                  ...sub.slice(1).map(pt => { return { type: 'L', values: [pt.x, pt.y] } })
              ];
              if (closed) subPath.push({ type: 'Z', values: [] });
              pathData.push(...subPath);
          });
      } else {
          pathData = [
              { type: 'M', values: [pts[0].x, pts[0].y] },
              ...pts.slice(1).map(pt => { return { type: 'L', values: [pt.x, pt.y] } })
          ];
      }

      if (closed) pathData.push({ type: 'Z', values: [] });
      return pathData

  }

  function getPolyCentroid(pts) {

      let l = pts.length;
      let x = 0, y = 0;
      for (let i = 0; l && i < l; i++) {
          let pt = pts[i];
          x += pt.x;
          y += pt.y;
      }

      let centroid = {x: x/l, y:y/l};
      return centroid

  }

  function detectRegularPolygon(pts, centroid={x:0, y:0}) {
      let rSq = getSquareDistance(pts[0], centroid);
      let isRegular = true;

      for (let i = 1, l = pts.length; i < l; i++) {
          let pt1 = pts[i];
          let dist = getSquareDistance(pt1, centroid);

          let diff = Math.abs(rSq-dist);
          let diffRel = diff/rSq;

          if (diffRel > 0.05) {
              return false;
          }

      }
      return isRegular;
  }

  function analyzePoly(pts, {
      x = 0,
      y = 0,
      width = 0,
      height = 0,
      debug = false
  } = {}) {

      let l = pts.length;

      // bounding box of this sub poly
      let bb0 = getPolyBBox(pts);

      if (!width || !height) {
          ({ x, y, width, height } = bb0);
      }

      let thresh = (width + height) * 0.01;

      // get areas an distances
      for (let i = 0; i < l; i++) {
          let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
          let p1 = pts[i];
          let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

          let area = getPolygonArea([p0, p1, p2], false);
          p1.area = area;
          p1.dist = getDistManhattan(p0, p1);
          p1.idx = i;

      }

      for (let i = 0; i < l; i++) {
          i > 1 ? pts[i - 2] : pts[l - 1];
          let p0 = i > 0 ? pts[i - 1] : pts[l - 1];
          let p1 = pts[i];
          let p2 = i < l - 1 ? pts[i + 1] : pts[l - 1];

          getSquareDistance(p0, p2) * 0.01;

          Math.abs(p0.area);
          let area1 = Math.abs(p1.area);
          Math.abs(p2.area);
          let isCorner = false;

          let flat = !p1.area || area1 < thresh;

          getDistManhattan(p1, p0);

          /**
           * check extremes
           */

          let isExtreme = false;

          // 1. total extreme
          if ((p1.x === bb0.left || p1.x === bb0.right || p1.y === bb0.top || p1.y === bb0.bottom)) {
              isExtreme = true;
          }

          // 1.2 horizontal or vertical
          let isHorizontal = p1.y === p0.y && p1.x !== p0.x;
          let isVertical = p1.x === p0.x && p1.y !== p0.y;

          if ((isHorizontal || isVertical)) {
              p0.isExtreme = true;
              isExtreme = true;
          }

          // 1.3 is local or absolute extreme
          let bb = getPolyBBox([p0, p2]); // local bb
          let { left, right, top, bottom } = bb;

          let extremeLocal = (p1.x < left || p1.x > right || p1.y < top || p1.y > bottom);
          if (!isExtreme && extremeLocal) {
              isExtreme = true;

          }

          /**
           * 2. sign changes
           */
          let signChange = (p0.area < 0 && p1.area > 0) || (p0.area > 0 && p1.area < 0);
          let isDirChange = signChange && !flat && !p0.isDirChange;

          /**
           * 3. corners
           */

          if (isExtreme) {

              let delta = getDeltaAngle(p1, p2, p0);
              let { deltaAngleDeg } = delta;
              deltaAngleDeg = Math.abs(deltaAngleDeg);

              let isCornerDelta = deltaAngleDeg > 10 && deltaAngleDeg < 160;
              if (isCornerDelta) {

                  isCorner = true;
              }

          }

          /*
          let debug = true
          if (debug) {

              if ((isHorizontal || isVertical)) {
                  renderPoint(markers, p1, 'blue', '2%', '0.5')
                  renderPoint(markers, p0, 'blue', '2%', '0.5')
              }

              if (isExtreme) {
                  renderPoint(markers, p1, 'cyan', '1.5%', '0.5')
              }

              if (isDirChange) {
                  renderPoint(markers, p1, 'orange', '0.75%', '0.5')
              }

              if (isCorner) {
                  renderPoint(markers, p1, 'magenta', '2.75%', '0.5')
              }
          }
          */

          p1.isCorner = isCorner;
          p1.isExtreme = isExtreme;
          p1.isHorizontal = isHorizontal;
          p1.isVertical = isVertical;
          p1.isDirChange = isDirChange;

      }

      // filter adjacent extremes
      let pts1 = [];
      let exclude = [];

      {
          for (let i = 0; i < pts.length; i++) {
              let p = pts[i];
              let p1 = pts[i + 1] || null;
              let p2 = pts[i + 2] || null;

              let extremes = [];

              if (p1 && p1.isExtreme && p.isExtreme && !p.isCorner) {
                  let has2nd = p1.dist < thresh * 2 && !p1.isCorner;
                  let has3rd = p2 && p2.isExtreme && p2.dist < thresh * 2 && !p2.isCorner;

                  if (has2nd && !has3rd) {
                      extremes.push(p, p1);

                  } else if (has3rd) {
                      extremes.push(p, p1, p2);
                      /*
                      renderPoint(markers, p, 'green', '1%', '0.5')
                      renderPoint(markers, p1, 'red', '1%', '0.5')
                      renderPoint(markers, p2, 'blue', '1%', '0.5')
                      */
                  }

                  if (extremes.length) {
                      // average extreme

                      let x = extremes.reduce((a, b) => a + b.x, 0) / extremes.length;
                      let y = extremes.reduce((a, b) => a + b.y, 0) / extremes.length;

                      p.x = x;
                      p.y = y;

                      i += extremes.length - 1;
                  }
              }

              if (p.isExtreme || p.isCorner || p.isDirChange) {
                  exclude.push(pts1.length);
              }

              pts1.push(p);

              // remove last nearby extreme
              let l2 = pts1.length;
              let p0 = pts1[0];
              let pL = pts1[l2 - 1];
              let near0 = getDistManhattan(p0, pL) < thresh * 2;
              if (p0.isExtreme && pL.isExtreme && near0) {
                  pL.x = p0.x;
                  pL.y = p0.y;
              }
          }

          pts = pts1;
      }

      return pts
  }

  function getPolyChunks(pts,
      { closed = true,
          keepCorners = true,
          keepExtremes = true,
          keepInflections = false
      } = {}
  ) {
      let chunks = [[pts[0]]];

      let idx = 0;
      let lastChunk = chunks[idx];

      let l = pts.length;

      // render
      for (let i = 1; i < l; i++) {
          i > 0 ? pts[i] : pts[l - 1];
          let p1 = pts[i];
          i < l - 1 ? pts[i + 1] : pts[l - 1];

          // start new chunk
          // keepInflections && p1.isDirChange
          if ((keepExtremes && p1.isExtreme || keepCorners && p1.isCorner )) {
              idx++;
              chunks.push([]);
          }

          lastChunk = chunks[idx];
          lastChunk.push(p1);
      }

      // test render

      return chunks;
  }

  /**
   * Fit one or more Bezier curves to a set of pts.
   *
   */
  function fitCurveSchneider(pts, {
      maxError = 0,
      adjustCpts = true,
      harmonize = true,
      keepCorners = true
  } = {}) {

      if (pts.length === 1) {
          return [];
      }

      // single lineto
      if (pts.length === 2) {
          return [
              { type: 'L', values: [pts[0].x, pts[0].y] },
              { type: 'L', values: [pts[1].x, pts[1].y] }
          ]
      }

      // prevent bulging

      let len = pts.length;
      let leftTangent = createTangent(pts[1], pts[0]);
      let rightTangent = createTangent(pts[len - 2], pts[len - 1]);
      let beziers = fitCubic(pts, leftTangent, rightTangent, maxError, keepCorners);

      // create pathdata
      let pathData = bezierPtsToPathData(beziers);
      let cp1, cp2;

      adjustCpts = false;

      adjustCpts = true;

      if (adjustCpts) {

          let len2 = pathData.length;
          let com1 = pathData[0];

          // last cubic segment
          let com2 = pathData[len2 - 1];

          let p0 = { x: pts[0].x, y: pts[0].y };
          let p1 = { x: pts[1].x, y: pts[1].y };
          let p2 = pts[2] ? { x: pts[2].x, y: pts[2].y } : null;

          if (p2) {
              cp1 = { x: com1.values[0], y: com1.values[1] };
              cp1 = adjustTangentAngle(cp1, p0, p1, p2);
              com1.values[0] = cp1.x;
              com1.values[1] = cp1.y;
          }

          let pL = { x: pts[len - 1].x, y: pts[len - 1].y };
          let pL1 = { x: pts[len - 2].x, y: pts[len - 2].y };
          let pL2 = pts[len - 3] ? { x: pts[len - 3][0], y: pts[len - 3][1] } : null;

          if (pL2) {
              cp2 = { x: com2.values[2], y: com2.values[3] };
              cp2 = adjustTangentAngle(cp2, pL, pL1, pL2);
              com2.values[2] = cp2.x;
              com2.values[3] = cp2.y;
          }

          /*
          // harmonize too tight tangents
          let harmonize = true;
           harmonize = false;
          if (harmonize) {
              pathData = harmonizeCubicCptsThird([{ type: 'M', values: [pts[0].x, pts[0].y] },
              ...pathData])
              pathData.shift()
          }
          */

      }

      return pathData
  }

  /**
   * Fit a Bezier curve to a (sub)set of digitized pts.
   * Your code should not call this function directly. Use fitCurve instead.
   *control-point-1, control-point-2, second-point] and pts are [x, y]
   */
  function fitCubic(pts, leftTangent, rightTangent, error, keepCorners = false) {

      let MaxIterations = 20;
      let bezCurve;

      /*

      if (pts.length === 2) {
          let dist = getDistance(pts[0], pts[1], false) * 0.333;
          bezCurve = [pts[0], addArrays(pts[0], mulItems(leftTangent, dist)), addArrays(pts[1], mulItems(rightTangent, dist)), pts[1]];
          return [bezCurve];
      }
      */

      let u = chordLengthParameterize(pts);
      let _generateAndReport = generateAndReport(pts, u, u, leftTangent, rightTangent);

      bezCurve = _generateAndReport[0];

      let maxError = _generateAndReport[1];
      let splitPoint = _generateAndReport[2];

      // check if curve is bulged
      if (keepCorners) {
          let checkBulge = areaDeviationTooLarge(pts, bezCurve);
          let { isBulged, bezierNew } = checkBulge;
          if (isBulged) {
              // return cubic corner segment
              bezCurve = bezierNew;
          }
      }

      if (maxError === 0 || maxError < error) {
          return [bezCurve];
      }

      if (maxError < error * error) {

          let uPrime = u;
          let prevErr = maxError;
          let prevSplit = splitPoint;

          for (let i = 0; i < MaxIterations; i++) {

              uPrime = reparameterize(bezCurve, pts, uPrime);

              let _generateAndReport2 = generateAndReport(pts, u, uPrime, leftTangent, rightTangent);

              bezCurve = _generateAndReport2[0];
              maxError = _generateAndReport2[1];
              splitPoint = _generateAndReport2[2];

              if (maxError < error) {
                  return [bezCurve];
              }

              else if (splitPoint === prevSplit) {
                  let errChange = maxError / prevErr;
                  if (errChange > .9999 && errChange < 1.0001) {
                      break;
                  }
              }

              prevErr = maxError;
              prevSplit = splitPoint;
          }
      }

      let beziers = [];
      let centerVector = subtract(pts[splitPoint - 1], pts[splitPoint + 1]);

      if (centerVector.x === 0 && centerVector.y === 0) {
          centerVector = subtract(pts[splitPoint - 1], pts[splitPoint]);
          let _ref = { x: -centerVector.y, y: centerVector.x };
          centerVector.x = _ref.x;
          centerVector.y = _ref.y;
      }

      let toCenterTangent = normalize(centerVector);

      let fromCenterTangent = mulItems(toCenterTangent, -1);

      if (pts.length === 3) ;

      beziers.push(
          ...fitCubic(pts.slice(0, splitPoint + 1), leftTangent, toCenterTangent, error, keepCorners),
          ...fitCubic(pts.slice(splitPoint), fromCenterTangent, rightTangent, error, keepCorners)
      );

      return beziers;
  }

  /**
   * Use least-squares method to find Bezier control pts for region.
  */
  function generateBezier(pts, parameters, leftTangent, rightTangent) {

      let a, tmp, u, ux, firstPoint = pts[0], lastPoint = pts[pts.length - 1];

      let bezCurve = [firstPoint, null, null, lastPoint];
      let A = zeros_Xx2x2(parameters.length);
      let len = parameters.length;

      for (let i = 0; i < len; i++) {
          u = parameters[i];
          ux = 1 - u;
          a = A[i];

          a[0] = mulItems(leftTangent, 3 * u * (ux * ux));
          a[1] = mulItems(rightTangent, 3 * ux * (u * u));
      }

      let C = [[0, 0], [0, 0]];
      let X = [0, 0];
      let l = pts.length;

      for (let i = 0; i < l; i++) {
          u = parameters[i];
          a = A[i];

          C[0][0] += dot(a[0], a[0]);
          C[0][1] += dot(a[0], a[1]);
          C[1][0] += dot(a[0], a[1]);
          C[1][1] += dot(a[1], a[1]);

          tmp = subtract(pts[i], pointAtT([firstPoint, firstPoint, lastPoint, lastPoint], u));

          X[0] += dot(a[0], tmp);
          X[1] += dot(a[1], tmp);
      }

      let det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
      let det_C0_X = C[0][0] * X[1] - C[1][0] * X[0];
      let det_X_C1 = X[0] * C[1][1] - X[1] * C[0][1];

      let alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
      let alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;
      let segLength = getDistance(firstPoint, lastPoint, false);
      let epsilon = 1.0e-6 * segLength;

      if (alpha_l < epsilon || alpha_r < epsilon) {

          bezCurve[1] = addArrays(firstPoint, mulItems(leftTangent, segLength * 0.333));
          bezCurve[2] = addArrays(lastPoint, mulItems(rightTangent, segLength * 0.333));
      } else {
          // First and last control pts of the Bezier curve 
          bezCurve[1] = addArrays(firstPoint, mulItems(leftTangent, alpha_l));
          bezCurve[2] = addArrays(lastPoint, mulItems(rightTangent, alpha_r));
      }

      return bezCurve;
  }

  function generateAndReport(pts, paramsOrig, paramsPrime, leftTangent, rightTangent) {
      let bezCurve, maxError, splitPoint;

      bezCurve = generateBezier(pts, paramsPrime, leftTangent, rightTangent);
      let _computeMaxError = computeMaxError(pts, bezCurve, paramsOrig);

      maxError = _computeMaxError[0];
      splitPoint = _computeMaxError[1];

      return [bezCurve, maxError, splitPoint];
  }

  /**
   * Given set of pts and their parameterization, try to find a better parameterization.
   */
  function reparameterize(bezier, pts, parameters) {
      return parameters.map((p, i) => {
          return newtonRaphsonRootFind(bezier, pts[i], p);
      });
  }
  /**
   * Use Newton-Raphson iteration to find better root.
   */

  function newtonRaphsonRootFind(bez, point, u) {
      // bez is [p0, cp1, cp2, p1] where each is [x, y]
      // point is the target point [x, y] we're trying to get close to
      // u is our current parameter value (0-1)

      // Calculate q(u) - point (the vector from target to curve point)

      let q = pointAtT(bez, u);

      let dx = q.x - point.x;
      let dy = q.y - point.y;

      // First derivative (tangent vector at u)
      let qp = bezierQprime(bez, u);

      // Numerator: dot product of (q(u) - point) and q'(u)
      // This represents how much the error aligns with the tangent
      let numerator = dx * qp[0] + dy * qp[1];

      // Denominator: |q'(u)|² + 2 * (q(u)-point) · q''(u)
      // First part: squared length of tangent vector
      let qpLenSq = qp[0] * qp[0] + qp[1] * qp[1];

      // Second derivative
      let qpp = bezierQprime(bez, u, true);

      // Second part: 2 * (q(u)-point) · q''(u)
      let secondPart = 2 * (dx * qpp[0] + dy * qpp[1]);

      let denominator = qpLenSq + secondPart;

      if (Math.abs(denominator) < 1e-10) { // Avoid division by zero
          return u;
      }

      // Newton-Raphson step: u_new = u - f(u)/f'(u)
      return u - numerator / denominator;
  }

  /**
   * Assign parameter values to digitized pts using relative distances between pts.
   */
  function chordLengthParameterize(pts) {
      let u = [];
      let l = pts.length;
      let p0 = pts[0];
      let p = pts[1];
      let currU = 0;
      let prevU = 0;

      for (let i = 0; i < l; i++) {
          p = pts[i];

          currU = prevU + getDistance(p, p0, false);
          u.push(currU);
          prevU = currU;

          p0 = p;
      }

      u = u.map(function (x) {
          return x / prevU;
      });

      return u;
  }
  /**
   * Find the maximum squared distance of digitized pts to fitted curve.
   */
  function computeMaxError(pts, bez, parameters) {
      let dist,
          maxDist,
          splitPoint,
          i, point, t;

      maxDist = 0;
      splitPoint = Math.floor(pts.length * 0.5);

      let t_distMap = mapTtoRelativeDistances(bez, 10);
      let l = pts.length;
      let ptOnPath = null;

      for (i = 0; i < l; i++) {
          point = pts[i];

          t = find_t(parameters[i], t_distMap, 10);

          ptOnPath = pointAtT(bez, t);
          dist = getSquareDistance(ptOnPath, point);

          /*
          console.log('v', v);
          v = subtract(pointAtT(bez, t), point);
          dist = v.x * v.x + v.y * v.y;
          */

          if (dist > maxDist) {

              maxDist = dist;
              splitPoint = i;
          }
      }

      return [maxDist, splitPoint];
  }

  function mapTtoRelativeDistances(bez, B_parts) {
      let B_t_curr;
      let B_t_dist = [0];
      let B_t_prev = bez[0];
      let sumLen = 0;

      for (let i = 1; i <= B_parts; i++) {
          B_t_curr = pointAtT(bez, i / B_parts);
          sumLen += getDistance(B_t_curr, B_t_prev);
          B_t_dist.push(sumLen);
          B_t_prev = B_t_curr;
      }

      B_t_dist = B_t_dist.map((x) => {
          return x / sumLen;
      });
      return B_t_dist;
  }
  function find_t(param, t_distMap, B_parts) {

      if (param < 0) {
          return 0;
      }
      if (param > 1) {
          return 1;
      }

      let lenMax, lenMin, tMax, tMin, t;

      for (let i = 1; i <= B_parts; i++) {

          if (param <= t_distMap[i]) {
              tMin = (i - 1) / B_parts;
              tMax = i / B_parts;
              lenMin = t_distMap[i - 1];
              lenMax = t_distMap[i];
              t = (param - lenMin) / (lenMax - lenMin) * (tMax - tMin) + tMin;
              break;
          }
      }
      return t;
  }

  function areaDeviationTooLarge(pts, bezCurve) {

      let split = 4;
      let step = 1 / split;
      let l = pts.length;

      // create polygon from curve candidate
      let poly = [bezCurve[0]];
      let pt;

      for (let i = 1; i < split; i++) {
          let t = step * i;
          pt = pointAtT(bezCurve, t);
          poly.push(pt);
      }

      poly.push(bezCurve[bezCurve.length - 1]);

      // Original area
      let polyArea = getPolygonArea(pts, false);

      // flat line
      if (!polyArea && pts.length === 2) {
          polyArea = getSquareDistance(pts[0], pts[1]) * 0.01;
      }

      let curveArea = getPolygonArea(poly, false);
      let rat = curveArea / polyArea;

      let isBulged = rat > 1.1;

      // isBulged = rat > 2
      let bezierNew = bezCurve;
      if (isBulged) {
          let ptMid = pts[Math.floor(l * 0.5)];
          let p = pts[l - 1];
          /*
          let cp1 = pointAtT([pts[0], ptMid], 0.666);
          let cp2 = pointAtT([p, ptMid], 0.666);

          bezierNew = [pts[0], cp1, cp2, p]

   

   
          cp1 = pointAtT([bezCurve[0], bezCurve[3]], 0.333);
          cp2 = pointAtT([bezCurve[0], bezCurve[3]], 0.666);
          bezCurve = [bezCurve[0], cp1, cp2, bezCurve[3]]
          */

          bezCurve = [pts[0], ptMid, ptMid, p];
          bezierNew = bezCurve;
      }

      return { isBulged, bezierNew };
  }

  /**
   * Creates a vector of length 1 which shows the direction from B to A
   */
  function createTangent(p1, p2) {
      // Returns unit vector pointing from B to A
      let dx = p1.x - p2.x;
      let dy = p1.y - p2.y;
      let length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) return { x: 0, y: 0 };
      return { x: dx / length, y: dy / length };
  }

  /**
   * Math helpers
   */

  // Basic vector utilities (only what's absolutely necessary)
  function subtract(a, b) {
      return { x: a.x - b.x, y: a.y - b.y };
  }

  function addArrays(a, b) {
      return { x: a.x + b.x, y: a.y + b.y };
  }

  function mulItems(v, s) {
      return { x: v.x * s, y: v.y * s };
  }

  function normalize(v) {
      let len = Math.sqrt(v.x * v.x + v.y * v.y);
      return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
  }

  function dot(a, b) {
      return a.x * b.x + a.y * b.y;
  }

  function zeros_Xx2x2(x) {
      let zs = [];
      while (x--) {
          zs.push([0, 0]);
      }
      return zs;
  }

  // First derivative (tangent vector)
  function bezierQprime(bez, u, second = false) {
      let p0 = bez[0], cp1 = bez[1], cp2 = bez[2], p1 = bez[3];
      let t = u;
      let mt = 1 - t;
      let mt2 = mt * mt;
      let t2 = t * t;
      let dx, dy;

      if (second) {
          dx = 6 * mt * (cp2.x - 2 * cp1.x + p0.x) +
              6 * t * (p1.x - 2 * cp2.x + cp1.x);

          dy = 6 * mt * (cp2.y - 2 * cp1.y + p0.y) +
              6 * t * (p1.y - 2 * cp2.y + cp1.y);

      } else {
          dx = 3 * mt2 * (cp1.x - p0.x) +
              6 * mt * t * (cp2.x - cp1.x) +
              3 * t2 * (p1.x - cp2.x);

          dy = 3 * mt2 * (cp1.y - p0.y) +
              6 * mt * t * (cp2.y - cp1.y) +
              3 * t2 * (p1.y - cp2.y);
      }

      return [dx, dy];
  }

  function adjustTangentAngle(cp, p0, p1, p2) {
      let ang1 = getAngle(p0, p1);
      let ang2 = getAngle(p0, p2);
      let angDiff = (ang2 - ang1);
      cp = rotatePoint(cp, p0.x, p0.y, -angDiff);
      return cp
  }

  // convert to pathdata
  function bezierPtsToPathData(beziers = []) {
      let pathData = [];
      beziers.forEach(bez => {

          let type = bez.length === 4 ? 'C' : (bez.length === 3 ? 'Q' : 'L');

          let cp1 = type === 'C' || type === 'Q' ? bez[1] : null;
          let cp2 = type === 'C' ? bez[2] : null;
          let p = bez[bez.length - 1];

          let values = type === 'C' ?
              [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y] :
              (type === 'Q' ?
                  [cp1.x, cp1.y, p.x, p.y] :
                  [p.x, p.y]
              );

          let com = { type, values };
          pathData.push(com);
      });

      return pathData
  }

  function simplifyRC(pts, quality = 1, shiftStart = true) {

      if (pts.length < 4) return pts;

      let l = pts.length;

      // starting point
      let M = pts[0];

      // last point
      let Z = pts[l - 1];

      // remove unnecessary closing point
      if (M.x === Z.x && M.y === Z.y) {
          pts.pop();
          l--;
          Z = pts[l - 1];
      }

      // init new point array
      let ptsSmp = [M];
      let pt0 = M;
      let pt1, pt2;

      // loop through vertices by triangles
      for (let i = 2; i < l; i++) {
          pt1 = pts[i - 1];
          pt2 = pts[i];
          let isLast = i === l - 1;

          /**
           * 1. Skip zero-length segments
           */
          if ((pt1.x === pt0.x && pt1.y === pt0.y) || (pt1.x === pt2.x && pt1.y === pt2.y)) {
              continue;
          }

          /**
           * 2. Check for perfectly flat
           * vertical/horizontal segments
           */
          let isVertical = (pt0.x === pt1.x);
          let isHorizontal = (pt0.y === pt1.y);

          if (isVertical || isHorizontal) {

              let isVertical2 = (pt1.x === pt2.x);
              let isHorizontal2 = (pt1.y === pt2.y);

              if (((isVertical && isVertical2) || (isHorizontal && isHorizontal2))) {

                  // perfectly flat segment - skip
                  if (!isLast) continue;

                  // flat but last – add last and skip colinearity check
                  if (isLast && M.x !== pt2.x && M.y !== pt2.y) {

                      ptsSmp.push(pt2);
                      continue
                  }

              }
          }

          // check area
          let area = getPolygonArea([pt0, pt1, pt2], true);
          let thresh = getSquareDistance(pt0, pt2) * 0.005;

          // flat
          if ( area <= thresh && i<l-1) {

              pt0 = pt1;
              continue
          }

          // no simplification - add mid pt 
          ptsSmp.push(pt1);

          // add last point if not first
          if (isLast && M.x !== pt2.x && M.y !== pt2.y) {
              // console.log('add last', M, pt2);
              ptsSmp.push(pt2);
          }

          // update previous point
          pt0 = pt1;

      }

      // 1st and last are colinear
      let area0 = getPolygonArea([ptsSmp[1], M, ptsSmp[ptsSmp.length-1]], true);
      let thresh0 = getSquareDistance (ptsSmp[1], ptsSmp[ptsSmp.length-1]) * 0.005;
      // remove first point
      if(area0 < thresh0) ptsSmp.shift();

      return ptsSmp;
  }

  function simplifyPolygonToPathData(pts, {
      debug = false,
      width = 0,
      height = 0,
      denoise = 0.9,
      keepCorners = true,
      keepExtremes = true,
      keepInflections = false,
      manhattan = false,
      absolute = false,
      closed = true,
      tolerance = 1,
      simplifyRD = 1,
      simplifyRDP = 1,
  } = {}) {

      let polyPath = [];
      let l = pts.length;
      let M = pts[0];
      let Z = pts[l - 1];

      // triangle
      if (pts.length === 3) {

          let pM1 = interpolate(M, pts[1], 0.5);
          let pM2 = interpolate(pts[1], Z, 0.5);
          let pM3 = interpolate(Z, pts[0], 0.5);

          /*
          console.log('triangle');
          renderPoint(markers, M)
          renderPoint(markers, pM1)
          renderPoint(markers, pM2)
          renderPoint(markers, pM3)
          */

          if (closed) {
              let t = 0.6666;
              let cp1_1 = interpolate(pM1, pts[1], t);
              let cp2_1 = interpolate(pM2, pts[1], t);
              let cp1_2 = interpolate(pM2, Z, t);
              let cp2_2 = interpolate(pM3, Z, t);
              let cp1_3 = interpolate(pM3, M, t);
              let cp2_3 = interpolate(pM1, M, t);

              polyPath = [
                  { type: 'M', values: [pM1.x, pM1.y] },
                  { type: 'C', values: [cp1_1.x, cp1_1.y, cp2_1.x, cp2_1.y, pM2.x, pM2.y] },
                  { type: 'C', values: [cp1_2.x, cp1_2.y, cp2_2.x, cp2_2.y, pM3.x, pM3.y] },
                  { type: 'C', values: [cp1_3.x, cp1_3.y, cp2_3.x, cp2_3.y, pM1.x, pM1.y] },
                  { type: 'Z', values: [] },
              ];

          } else {
              polyPath = [

                  { type: 'M', values: [M.x, M.y] },
                  { type: 'C', values: [pts[1].x, pts[1].y, pts[1].x, pts[1].y, Z.x, Z.y] },
              ];
          }
          return polyPath;
      }

      // remove colinear

      /**
       * detect regular polygon
       * curved path is a circle
       */
      let centroid = getPolyCentroid(simplifyRC(pts));
      let isRegularPolygon = detectRegularPolygon(pts, centroid);

      if (isRegularPolygon) {

          let ptAd = rotatePoint(pts[0], centroid.x, centroid.y, Math.PI);
          let sweep = getPolygonArea(pts) > 0 ? 1 : 0;

          polyPath = [
              { type: 'M', values: [pts[0].x, pts[0].y] },
              { type: 'A', values: [1, 1, 0, 0, sweep, ptAd.x, ptAd.y] },
              { type: 'A', values: [1, 1, 0, 0, sweep, pts[0].x, pts[0].y] }
          ];

          if (closed) {
              polyPath.push({ type: 'Z', values: [] });
          }
          return polyPath;
      }

      // remove colinear

      // get topology of poly
      let polyAnalyzed = !keepExtremes && !keepCorners ? pts : analyzePoly(pts, {
          debug: false

      });

      // split into segment chunks
      let chunks = !keepExtremes && !keepCorners ? [polyAnalyzed] : getPolyChunks(polyAnalyzed, { keepCorners, keepExtremes, keepInflections });

      // Schneider curve fit
      let threshold = width && height ? (width + height) / 2 * 0.004 * tolerance : 2.5;

      polyPath = simplifyPolyChunks(chunks, {
          closed,
          tolerance: threshold,
          keepCorners,
          keepExtremes: true,
      });

      polyPath = fixIntersectingCpts(polyPath);

      return polyPath;
  }

  /**
   * convert polygon chunks
   * to cubic beziers 
   */

  function simplifyPolyChunks(chunks = [], {
      closed = true,
      keepCorners = true,
      tolerance = 1,
  } = {}) {

      let l = chunks.length;

      // new pathData
      let pathData = [{ type: 'M', values: [chunks[0][0].x, chunks[0][0].y] }];

      for (let i = 0; i < l; i++) {

          let chunk = chunks[i];
          let chunkN = chunks[i + 1] ? chunks[i + 1] : null;
          let segments = [];
          let chunklen = chunk.length;
          chunk[chunk.length - 1];

          // add from next command
          if (chunkN) {
              chunk.push(chunkN[0]);
          }

          // nothing to simplify
          if (chunklen < 2 || (chunklen === 2 && chunk[1].isExtreme)) {
              chunk[chunk.length - 1];
              segments = chunk.map(com => { return { type: 'L', values: [com.x, com.y] } });

          } else {
              segments = fitCurveSchneider(chunk, {
                  maxError: tolerance, keepCorners
              });
          }

          // remove first segment to connect to last segment
          pathData.push(...segments);

      }

      if (closed) pathData.push({ type: 'Z', values: [] });
      return pathData

  }

  /**
   * creates precise polygon approximation from pathdata
   * converts arc to cubis
   */
  function pathDataToPolygonOpt(pathData, {
      precisionPoly = 1,
      autoAccuracy=false,
      polyFormat='points',
      decimals=-1,
      simplifyRD=1,
  simplifyRDP=1,
  } = {}) {

      let l = pathData.length;
      let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
      let p0 = M;

      // collect polygon vertices
      let pathDataPoly = [];

      // end point vertices
      let pts = [p0];

      let dims = [];

      // minimum dimension
      for (let i = 1; i < l; i++) {
          let com = pathData[i];
          let { type, values, p0, p, dimA = 0 } = com;

          dims.push(+dimA.toFixed(8));

          // segment end point
          pts.push(p);
      }

      let pts2 = [pts[0]];

      // adjustments for very small or large paths
      dims = dims.filter(Boolean).sort();
      let dimMax = dims[dims.length - 1];

      let scale = dimMax > 2 && dimMax < 25 ? 1 : (20 / dimMax);
      precisionPoly = precisionPoly * scale;

      // check how much segments contribute to total area
      for (let i = 1; i < l; i++) {
          let com = pathData[i];
          let { type, values, p0, p, cp1 = null, cp2 = null, dimA } = com;

          let distAv = (dimA);

          let cpts = cp1 && cp2 ? [p0, cp1, cp2, p] : (cp1 ? [p0, cp1, p] : []);

          if (cpts.length) {
              let ptM = cp2 ? interpolate(cp1, cp2, 0.5) : cp1;
              let distCpt1 = getDistManhattan(p0, ptM);
              let distCpt2 = getDistManhattan(p, ptM);
              let dist4 = (distCpt1 + distCpt2) * 0.2;
              distAv = (dist4 + dimA);
          }

          // calculate split value according to manhattan distance of segment
          let rat = Math.ceil(distAv * 0.2 * precisionPoly);
          let split = Math.ceil(rat);

          if (split && cpts.length) {
              let step = split ? 1 / (split + 1) : 0;
              for (let j = 1; j <= split; j++) {
                  let t = step * j;
                  let pt = pointAtT(cpts, t);
                  pts2.push(pt);
              }
          }
          pts2.push(p);
      }

      // simplify polygon
      if(simplifyRD>0){
          pts2 = simplifyPolyRD(pts2, {quality:simplifyRD});
      }

      if(simplifyRDP>0){
          pts2 = simplifyPolyRDP(pts2, {quality:simplifyRDP});
      }

      pathDataPoly = pathDataFromPoly(pts2);
      pathData = pathDataPoly;
      
      if(autoAccuracy){
          decimals = detectAccuracyPoly(pts);
      }

      let poly = decimals>-1 ? pts2.map(pt => { return { x: roundTo(pt.x, decimals), y: roundTo(pt.y, decimals) } }) : pts2.map(pt => { return { x: pt.x, y: pt.y } });

      if(polyFormat==='array'){
          poly = poly.map(pt => { return [pt.x, pt.y] });
      }
      else if(polyFormat==='string'){
          poly = poly.map(pt => { return [pt.x, pt.y].join(',') }).flat().join(' ');
      }

      return { pathData, poly }

  }

  /**
   * creates precise polygon 
   * from command end points
   * converts arc to cubis
   */
  function getPathDataPolyPrecise(pathData = [], {
      precision = 1
  } = {}) {

      let poly = [];
      for (let i = 0; i < pathData.length; i++) {
          let com = pathData[i];
          let prev = i > 0 ? pathData[i - 1] : pathData[i];
          let { type, values } = com;
          let p0 = { x: prev.values[prev.values.length - 2], y: prev.values[prev.values.length - 1] };
          let p = values.length ? { x: values[values.length - 2], y: values[values.length - 1] } : '';
          let cp1 = values.length ? { x: values[0], y: values[1] } : '';

          switch (type) {

              // convert to cubic to get polygon
              case 'A':
                  if (typeof arcToBezier$1 !== 'function') {

                      break;
                  }
                  let cubic = arcToBezier$1(p0, values);
                  cubic.forEach(com => {
                      let vals = com.values;
                      let cp1 = { x: vals[0], y: vals[1] };
                      let cp2 = { x: vals[2], y: vals[3] };
                      let p = { x: vals[4], y: vals[5] };
                      poly.push(cp1, cp2, p);
                  });
                  break;

              case 'C':
                  let cp2 = { x: values[2], y: values[3] };
                  poly.push(cp1, cp2);
                  break;
              case 'Q':
                  poly.push(cp1);
                  break;
          }

          // M and L commands
          if (type.toLowerCase() !== 'z') {
              poly.push(p);
          }
      }

      return poly;
  }

  function pathDataLineToCubic(pathData) {

      for (let c = 1, l = pathData.length; c < l; c++) {
          let com = pathData[c];
          let { type, values, p0, cp1 = null, cp2 = null, p = null } = com;
          if (type === 'L') {

              let cp1 = interpolate(p0, p, 0.333);
              let cp2 = interpolate(p, p0, 0.333);

              pathData[c].type = 'C';
              pathData[c].values = [cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];
              pathData[c].cp1 = cp1;
              pathData[c].cp2 = cp2;

          }
      }
      return pathData
  }

  /**
   * fix sub path directions
   * pathdata must be be normalized to
   * absolute and longhand commands
   * toClockwise = force default direction
   */

  function fixPathDataDirections(pathDataArr = [], toClockwise = false) {

      let polys = [];

      pathDataArr.forEach((sub, i) => {
          let pathData = sub.pathData;

          let vertices = getPathDataPolyPrecise(pathData);
          let area = getPolygonArea(vertices);
          let isClockwise = area >= 0;
          polys.push({ pts: vertices, bb: getPolyBBox(vertices), cw: isClockwise, index: i, inter: 0, includes: [], includedIn: [] });
      });

      // check poly intersections
      let l = polys.length;
      for (let i = 0; i < l; i++) {
          let prev = polys[i];
          let bb0 = prev.bb;

          for (let j = 0; j < l; j++) {

              let poly = polys[j];
              let bb = poly.bb;

              // skip if the same poly or parent
              if (i === j || poly.includes.includes(i)) continue

              // if mid point is in previous polygon
              let ptMid = { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 };
              let inPoly = isPointInPolygon(ptMid, prev.pts, bb0);

              if (inPoly) {
                  polys[j].inter += 1;
                  poly.includedIn.push(i);
                  prev.includes.push(j);
              }
          }
      }

      // reverse paths
      for (let i = 0; i < l; i++) {

          let poly = polys[i];
          let { cw, includedIn, includes } = poly;

          // outer path direction to counter clockwise
          if (!includedIn.length && cw && !toClockwise
              || !includedIn.length && !cw && toClockwise
          ) {

              pathDataArr[i].pathData = reversePathData(pathDataArr[i].pathData);
              polys[i].cw = polys[i].cw ? false : true;
              cw = polys[i].cw;

          }

          // reverse inner sub paths
          for (let j = 0; j < includes.length; j++) {
              let ind = includes[j];
              let child = polys[ind];

              if (child.cw === cw) {

                  pathDataArr[ind].pathData = reversePathData(pathDataArr[ind].pathData);
                  polys[ind].cw = polys[ind].cw ? false : true;
              }
          }
      }

      return pathDataArr

  }

  let settingsDefaults = {

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

      convertPathLength: false,

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
      polyFormat: 'object',
      precisionPoly: 1,
      simplifyRD: 0,
      simplifyRDP: 0,
      harmonizeCpts: false,
      removeOrphanSubpaths: false,
      simplifyRound: false,

      scale: 1,
      scaleTo: 0,
      crop: false,
      alignToOrigin: false,

      // flatten transforms
      convertTransforms: false,

  };

  const settingsNull = {};

  for (let prop in settingsDefaults) {
      let val = settingsDefaults[prop];
      let isBoolean = val === false || val === true;
      let isNum = !isNaN(val);
      let isArray = Array.isArray(val);

      if (isBoolean) val = false;
      else if (!isArray && isNum) val = val===1 ? 1 : (prop==='decimals'? -1 : 0);
      else if (isArray) val = [];
      settingsNull[prop] = val;
  }

  const presetSettings = {
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
              toRelative: true,
              toMixed: true,
              toShorthands: true,

              legacyHref: true,
              addViewBox: true,
              addDimensions: true,
              removeComments: true,
              autoAccuracy: true,

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
              tolerance: 1.2,
              toMixed: true,
              refineExtremes: true,
              simplifyCorners: true,
              simplifyRound: true,
              removeClassNames: true,
              cubicToArc: true,
              removeComments: true,
              removeHidden: true,
              removeOffCanvas: true,
              addViewBox: true,
              removeDimensions: true,
              minifyD: 0
          }
      }

  };

  function splitCompundGroups(pathDataPlusArr = [], {
      toRelative = true,
      toShorthands = true,
      minifyD = 0,
      decimals = 3,
      addDimensions = false
  } = {}) {
      pathDataPlusArr = JSON.parse(JSON.stringify(pathDataPlusArr));
      let len = pathDataPlusArr.length;

      let xArr = [];
      let yArr = [];

      // refine bbox and add cpt polygon
      for (let i = 0; i < len; i++) {
          let sub = pathDataPlusArr[i];
          let { pathData, bb } = sub;

          // console.log(bb);
          // include control points for better overlapping approximation

          if (bb.width && bb.height) ; else {
              let poly = getPathDataVertices(pathData, true);
              bb = getPolyBBox(poly);
              pathDataPlusArr[i].bb = bb;

          }

          xArr.push(bb.left, bb.right);
          yArr.push(bb.top, bb.bottom);
          sub.includes = [];
      }

      /**
       * check overlapping 
       * sub paths
       */
      for (let i = 0, l = pathDataPlusArr.length; i < l; i++) {
          let sub1 = pathDataPlusArr[i];
          let { bb, poly } = sub1;

          for (let j = 0; j < l; j++) {

              let sub1 = pathDataPlusArr[j];
              if (i === j) continue;

              let bb1 = sub1.bb;

              // test sample on-path points
              let ptM = { x: bb1.x + bb1.width * 0.5, y: bb1.y + bb1.height * 0.5 };
              if (ptM.x >= bb.x && ptM.y >= bb.y && ptM.x <= bb.right && ptM.y <= bb.bottom) {
                  pathDataPlusArr[i].includes.push(j);
              }

          }
      }

      /**
       * combine overlapping 
       * compound paths
       */
      for (let i = 0, l = pathDataPlusArr.length; i < l; i++) {
          let sub = pathDataPlusArr[i];
          let { includes } = sub;

          includes.forEach(s => {
              let pathData = pathDataPlusArr[s].pathData;
              if (pathData.length) {
                  pathDataPlusArr[i].pathData.push(...pathData);
                  pathDataPlusArr[s].pathData = [];
              }
          });
      }

      // remove empty els due to grouping
      pathDataPlusArr = pathDataPlusArr.filter(sub => sub.pathData.length);

      // try to find row left to right order

      pathDataPlusArr = pathDataPlusArr.sort((a, b) => ((a.bb.x ) - (b.bb.x)));

      // create SVG
      let x = Math.min(...xArr);
      let y = Math.min(...yArr);
      let right = Math.max(...xArr);
      let bottom = Math.max(...yArr);
      let width = right - x;
      let height = bottom - y;

      [x, y, width, height] = [x, y, width, height].map(val => roundTo(val, decimals));

      let dimensionAtts = addDimensions ? `width="${width}" height="${height}"` : '';
      let svgSplit = `<svg ${dimensionAtts} viewBox="${x} ${y} ${width} ${height}" xmlns="${svgNs}">`;

      pathDataPlusArr.forEach(sub => {
          let { pathData } = sub;

          pathData = convertPathData(pathData, { toRelative, toShorthands, decimals });
          let d = pathDataToD(pathData, minifyD);
          svgSplit += `<path d="${d}"/>`;

      });

      svgSplit += '</svg>';

      let splitObj = { pathData: pathDataPlusArr, svg: svgSplit };

      return splitObj

  }

  /*
  function checkBBoxIntersections2(bb, bb1) {
      let [x, y, width, height, right, bottom] = [
          bb.x,
          bb.y,
          bb.width,
          bb.height,
          bb.x + bb.width,
          bb.y + bb.height
      ];
      let [x1, y1, width1, height1, right1, bottom1] = [
          bb1.x,
          bb1.y,
          bb1.width,
          bb1.height,
          bb1.x + bb1.width,
          bb1.y + bb1.height
      ];
      let intersects = false;

      if (x < x1 && right > right1 && y < y1 && bottom > bottom1) {
          intersects = true;
      }

      console.log('???', intersects, 'dims', width, height, '2', width1, height1);

      return intersects;
  }
  */

  function svgPathSimplify(input = '', settings = {}) {

      let preset = settings['preset'] !== undefined && settings['preset'] ? settings['preset'] : null;
      let defaults = preset && presetSettings[preset] !== undefined ? presetSettings[preset] : presetSettings['default'];

      // merge settings
      settings = {
          ...defaults,
          ...settings
      };

      let { getObject = false, removeComments, removeOffCanvas, unGroup, mergePaths, removeElements, removeDimensions, removeIds, removeClassNames, omitNamespace, cleanUpStrokes, addViewBox, addDimensions, removePrologue, removeHidden, removeUnused, cleanupDefs, cleanupClip, cleanupSVGAtts, removeNameSpaced, removeNameSpacedAtts, attributesToGroup, minifyRgbColors, stylesToAttributes, fixHref, legacyHref, allowMeta, allowDataAtts, allowAriaAtts, convertPathLength, removeSVGAttributes, removeElAttributes, shapesToPaths, shapeConvert, convertShapes, simplifyBezier, optimizeOrder, autoClose, removeZeroLength, refineClosing, removeColinear, flatBezierToLinetos, revertToQuadratics, refineExtremes, simplifyCorners, fixDirections, keepExtremes, keepCorners, keepInflections, addExtremes, reversePath, toAbsolute, toRelative, toMixed, toShorthands, toLonghands, quadraticToCubic, arcToCubic, cubicToArc, lineToCubic, decimals, autoAccuracy, minifyD, tolerance, toPolygon, smoothPoly, polyFormat, precisionPoly, simplifyRD, simplifyRDP, harmonizeCpts, removeOrphanSubpaths, simplifyRound, scale, scaleTo, crop, alignToOrigin, convertTransforms, keepSmaller, splitCompound } = settings;

      // clamp tolerance and scale
      tolerance = Math.max(0.1, tolerance);
      scale = Math.max(0.001, scale);
      if(fixDirections) keepSmaller = false;
      if (scale !== 1 || scaleTo || crop || alignToOrigin) {
          convertTransforms = true;
          settings.convertTransforms = true;
      }

      let inputType = detectInputType(input);
      let svg = '';
      let svgSize = 0;
      let svgSizeOpt = 0;
      let compression = 0;
      let report = {};
      let d = '';
      let mode = inputType === 'svgMarkup' ? 1 : 0;

      // pathdata superset array - containing additional data
      let pathDataPlusArr_global = [];
      let paths = [];
      let polys = [];
      let poly = [];
      let dStr = '';
      let dOriginal = '';

      /**
       * normalize input
       * switch mode
       */

      // original size
      svgSize = input.length;

      /**
       * global bbox and viewBox for 
       * path scaling
       * sorting and cropping
      */
      let viewBox = { x: 0, y: 0, width: 0, height: 0 };
      let bb_global = { x: 0, y: 0, width: 0, height: 0 };
      let xArr = [];
      let yArr = [];

      arcToCubic = toPolygon ? true : arcToCubic;
      autoClose = false;
      let accuracyArr = [];

      // validate point JSON
      if (inputType === 'json') {
          let pts = [];
          let needsQuotes = /([{,]\s*)(x|y)(\s*:)/.test(input);
          if (needsQuotes) input = input.replaceAll('x:', '"x":').replaceAll('y:', '"y":');

          try {
              pts = JSON.parse(input);
          } catch {
              console.warn('No valid JSON');
          }
          if (pts.length) {
              inputType = 'polyArray';
              input = normalizePoly(pts);
          }
      }

      // single path or polys
      if (inputType !== 'svgMarkup' && inputType !== 'symbol') {
          if (inputType === 'pathDataString') {
              d = input;
          } else if (inputType === 'polyString') {
              splitCompound = false;
              poly = normalizePoly(input);
              d = pathDataFromPoly(poly, closed);

          }

          else if (inputType === 'polyArray' || inputType === 'polyObjectArray' || inputType === 'polyComplexArray' || inputType === 'polyComplexObjectArray') {
              splitCompound = false;

              // normalize poly input to object array
              poly = normalizePoly(input);

              // convert to pathdata
              let closed = true;

              // calculate size
              d = pathDataFromPoly(poly, closed);
              dStr = d.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
              dOriginal = dStr;
              svgSize = dStr.length;

              /*
              d=''
              dOriginal = '';
              svgSize = input.length;
              */

          }

          else if (inputType === 'pathData') {
              d = input;

              // stringify to compare lengths
              dStr = Array.from(d).map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
              svgSize = dStr.length;

          }
          // not valid - set dummy path data
          else {
              d = 'M0 0 h0';
          }

          paths.push({ d, el: null });
      }

      // mode:1 – process complete svg DOM
      else {

          // convert symbol temporarily to SVG
          if (inputType === 'symbol') {
              input = input.replaceAll('<symbol', '<svg').replaceAll('</symbol', '</svg');
              // ids are mandatory for symbols
              removeIds = false;
              removeDimensions = true;
          }

          // convert all shapes to paths
          if (shapesToPaths) {
              shapeConvert = 'toPaths';
              convert_rects = true;
              convert_ellipses = true;
              convert_poly = true;
              convert_lines = true;
          }

          // sanitize SVG - clone/decouple settings
          let svgPropObject = cleanUpSVG(input, JSON.parse(JSON.stringify(settings)));
          svg = svgPropObject.svg;

          // collect paths
          let pathEls = svg.querySelectorAll('path');

          pathEls.forEach((path, i) => {
              let d = path.getAttribute('d');

              paths.push({ d, el: path, idx: i });
          });

          // get viewBox/dimensions
          viewBox = getViewBox(svg, decimals);

      }

      /**
       * process all paths
       * try simplifications and removals
       */

      // SVG optimization options
      let pathOptions = {
          toRelative,
          toMixed,
          toShorthands,
          decimals,
      };

      for (let i = 0, l = paths.length; l && i < l; i++) {

          let pathDataPlusArr = [];
          let path = paths[i];
          let { d, el } = path;
          let isPoly = false;

          // if polygon we already heave absolute coordinates

          let pathData = parsePathDataNormalized(d, { quadraticToCubic, arcToCubic });

          // get polygon bbox
          let bb_poly = smoothPoly || toPolygon ? getPolyBBox(getPathDataVertices(pathData)) : null;

          // scale pathdata and viewBox
          if (scale !== 1 || scaleTo) {

              // get bbox of viewBox for scaling
              if (scaleTo) {

                  if (viewBox.width && !crop) {
                      scale = scaleTo / viewBox.width;

                  } else {

                      // convert arcs to cubics, add extreme to get precise bounding box
                      let pathDataExtr = pathData.map(com => { return { type: com.type, values: com.values } });
                      pathDataExtr = convertPathData(pathDataExtr, { arcToCubic: true });
                      pathDataExtr = addExtremePoints(pathDataExtr);

                      let poly = getPathDataVertices(pathDataExtr);
                      let bb = getPolyBBox(poly);
                      xArr.push(bb.x, bb.x + bb.width);
                      yArr.push(bb.y, bb.y + bb.height);

                      let scaleW = scaleTo / bb.width;
                      scale = scaleW;
                  }
              }

              pathData = scalePathData(pathData, scale);
          }

          // count commands for evaluation
          let comCount = pathData.length;

          if (!isPoly && removeOrphanSubpaths) pathData = removeOrphanedM(pathData);

          /**
           * get sub paths
           */
          let subPathArr = splitSubpaths(pathData);
          let lenSub = subPathArr.length;

          // loop sub paths
          for (let i = 0; i < lenSub; i++) {

              let pathDataSub = subPathArr[i];
              let poly = [];
              let coms = Array.from(new Set(pathDataSub.map(com => com.type))).join('');
              isPoly = !(/[acqts]/gi).test(coms);
              let closed = isPoly ? true : false;

              if (isPoly && !mode) {

                  poly = getPathDataVertices(pathDataSub);
                  let bb = getPolyBBox(reducePoints(poly, 64));

                  // simplify polygon
                  if (simplifyRD > 0) {
                      poly = simplifyPolyRD(poly, { quality: simplifyRD, width: bb.width, height: bb.height });
                  }

                  if (simplifyRDP > 0) {
                      poly = simplifyPolyRDP(poly, { quality: simplifyRDP, width: bb.width, height: bb.height });

                  }

                  toPolygon = false;
                  pathDataSub = pathDataFromPoly(poly, closed);

              }

              /**
               * convert curves to polygon
               * flattening
               */
              else if (toPolygon) {
                  simplifyBezier = false;
                  smoothPoly = false;
                  harmonizeCpts = false;

                  pathDataSub = getPathDataVerbose(pathDataSub);

                  let polyData = pathDataToPolygonOpt(pathDataSub, {
                      precisionPoly,
                      autoAccuracy,

                      simplifyRD,
                      simplifyRDP
                  });

                  pathDataSub = polyData.pathData;
                  isPoly = true;

              }

              /**
               * poly to beziers via
               * Philip J. Schneider's 
               * "Algorithm for Automatically Fitting Digitized Curves"
               */
              if (smoothPoly) {

                  if (isPoly) {
                      pathDataSub = removeZeroLengthLinetos(pathDataSub);
                      let poly = getPathDataVertices(pathDataSub);

                      // options for poly simplification
                      let optionsPoly = {
                          denoise: 0.8,
                          tolerance,
                          width: bb_poly.width,
                          height: bb_poly.height,
                          manhattan: false,
                          absolute: false,
                          keepCorners,
                          keepExtremes,
                          keepInflections,
                          closed,
                          simplifyRD,
                          simplifyRDP,
                      };

                      pathDataSub = simplifyPolygonToPathData(poly, optionsPoly);
                      // flag as non poly as we're smoothing to curves

                  }
              }

              // harmonize cpts
              // if (harmonizeCpts) pathDataSub = harmonizeCubicCpts(pathDataSub)

              // remove zero length linetos
              if (removeColinear || removeZeroLength) pathDataSub = removeZeroLengthLinetos(pathDataSub);

              // sort to top left
              if (optimizeOrder) pathDataSub = pathDataToTopLeft(pathDataSub);

              // Preprocessing: remove colinear - ignore flat beziers (removed later)
              if (removeColinear) pathDataSub = pathDataRemoveColinear(pathDataSub, { tolerance, flatBezierToLinetos: false });

              let tMin = 0, tMax = 1;
              if (addExtremes) pathDataSub = addExtremePoints(pathDataSub,
                  { tMin, tMax, addExtremes, angles: [30] });

              // reverse
              if (reversePath) {
                  pathDataSub = reversePathData(pathDataSub);
              }

              // analyze pathdata to add info about significant properties such as extremes, corners
              let pathDataPlus = { bb: {}, dimA: 0, pathData: [] };

              if (!isPoly) {
                  pathDataPlus = analyzePathData(pathDataSub);
              }
              // we skip detailed analysis for native polygons
              else {
                  if (!poly.length) {
                      let pathDataCubic = convertPathData(JSON.parse(JSON.stringify(pathDataSub)), { toLonghands: true, toAbsolute: true, arcToCubic: true, testTypes: true });
                      pathDataPlus.bb = getPolyBBox(getPathDataVertices(pathDataCubic));
                  }
                  pathDataPlus.dimA = pathDataPlus.bb.width + pathDataPlus.bb.height;
                  pathDataPlus.pathData = getPathDataVerbose(pathDataSub, {
                      addSquareLength: false,
                      addArea: false,
                      addAverageDim: false
                  });
              }

              // simplify beziers
              let { pathData, bb, dimA } = pathDataPlus;

              xArr.push(bb.x, bb.x + bb.width);
              yArr.push(bb.y, bb.y + bb.height);

              if (refineClosing) pathData = refineClosingCommand(pathData, { threshold: dimA * 0.001 });

              pathData = simplifyBezier ? simplifyPathDataCubic(pathData, { simplifyBezier, keepInflections, keepExtremes, keepCorners, revertToQuadratics, tolerance }) : pathData;

              // refine extremes
              if (refineExtremes) {
                  let thresholdEx = (bb.width + bb.height) * 0.05;
                  pathData = refineAdjacentExtremes(pathData, { threshold: thresholdEx, tolerance });
              }

              // cubic to arcs
              if (!arcToCubic && cubicToArc) pathData = pathDataCubicsToArc(pathData, { areaThreshold: 2.5 });

              // post processing: remove flat beziers
              if (removeColinear && flatBezierToLinetos) {
                  pathData = pathDataRemoveColinear(pathData, { tolerance, flatBezierToLinetos });
              }

              // refine corners
              if (simplifyCorners) {

                  let threshold = (bb.width + bb.height) * 0.1;
                  pathData = refineRoundedCorners(pathData, { threshold, tolerance });
              }

              // refine round segment sequences
              if (simplifyRound) pathData = refineRoundSegments(pathData);

              // simplify to quadratics
              if (revertToQuadratics) pathData = pathDataRevertCubicToQuadratic(pathData, tolerance);

              if (lineToCubic) pathData = pathDataLineToCubic(pathData);

              // optimize close path
              if (optimizeOrder) pathData = optimizeClosePath(pathData, { autoClose });

              // sub path rounding
              if (autoAccuracy) {

                  let decimalsSub = detectAccuracy(pathData);
                  accuracyArr.push(decimalsSub);

              }

              // update
              pathDataPlusArr.push({ pathData, bb });

          } // end sup paths

          // sort subpaths to top left
          let xMin = Math.min(...xArr);
          let yMin = Math.min(...yArr);
          let xMax = Math.max(...xArr);
          let yMax = Math.max(...yArr);

          bb_global = { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
          let isPortrait = bb_global.height > bb_global.width;

          // fix path directions - before reordering
          if (fixDirections) {
              pathDataPlusArr = fixPathDataDirections(pathDataPlusArr);
          }

          // prefer top to bottom priority for portrait aspect ratios 
          if (optimizeOrder) {
              pathDataPlusArr = isPortrait ? pathDataPlusArr.sort((a, b) => a.bb.y - b.bb.y || a.bb.x - b.bb.x) : pathDataPlusArr.sort((a, b) => a.bb.x - b.bb.x || a.bb.y - b.bb.y);
          }

          // flatten compound paths 
          pathData = [];

          // add to global array - including multiple path elements
          pathDataPlusArr_global.push(pathDataPlusArr);

          pathDataPlusArr.forEach(sub => {
              pathData.push(...sub.pathData);
          });

          if (autoAccuracy) {
              accuracyArr = accuracyArr.sort().reverse();
              let decimalsMid = accuracyArr[Math.floor(accuracyArr.length * 0.5)];
              decimals = Math.floor((accuracyArr[0] + decimalsMid) * 0.5);

              pathOptions.decimals = decimals;
          }

          // add simplified poly - if not populated by toPoly conversion
          if (isPoly) {

              pathDataPlusArr.forEach(sub => {
                  let poly = getPathDataVertices(sub.pathData, false, decimals);
                  if (polyFormat === 'array') {
                      poly = polyPtsToArray(poly);
                  }
                  polys.push(poly);
              });

          }

          // split into sub paths - returns svg with multiple paths
          if (splitCompound && !mode && pathDataPlusArr.length > 1) {
              let pathDataSplit = splitCompundGroups(pathDataPlusArr, { toRelative, toShorthands, decimals, addDimensions });
              svg = new DOMParser().parseFromString(pathDataSplit.svg, 'image/svg+xml').querySelector('svg');
              // switch output type
              mode = 1;
              inputType = 'splitPath';
          }

          // clone pathdata 
          pathData = JSON.parse(JSON.stringify(pathData));

          // optimize path data
          pathData = convertPathData(pathData, pathOptions);

          // remove zero-length segments introduced by rounding
          if (removeZeroLength) pathData = removeZeroLengthLinetos(pathData);

          // realign path to zero origin
          if (alignToOrigin) {

              pathData[0].values[0] = roundTo((pathData[0].values[0] - bb_global.x), decimals);
              pathData[0].values[1] = roundTo((pathData[0].values[1] - bb_global.y), decimals);

              bb_global.x = 0;
              bb_global.y = 0;
          }

          // compare command count
          let comCountS = pathData.length;

          let dOpt = pathDataToD(pathData, minifyD);

          svgSizeOpt = dOpt.length;

          compression = +(100 / svgSize * (svgSizeOpt)).toFixed(2);

          path.d = dOpt;
          path.report = {
              original: comCount,
              new: comCountS,
              saved: comCount - comCountS,
              compression,
              decimals,

          };

          // apply new path for svgs
          if (el) {
              el.setAttribute('d', dOpt);
          }

      } // end path array

      /**
       *  stringify new SVG
       */
      if (mode || inputType === 'symbol') {

          // adjust viewBox and width for scale
          if (scale) {
              let { x, y, width, height, w, h, hasViewBox, hasWidth, hasHeight, widthUnit, heightUnit } = viewBox;
              if (crop) {
                  x = bb_global.x;
                  y = bb_global.y;
                  width = bb_global.width;
                  height = bb_global.height;
                  w = width;
                  h = height;
              }

              if (hasViewBox) {
                  svg.setAttribute('viewBox', [x, y, width, height].map(val => roundTo(val * scale, decimals)).join(' '));
              }
              if (hasWidth) {
                  svg.setAttribute('width', roundTo(w * scale, decimals) + widthUnit);
              }

              if (hasHeight) {
                  svg.setAttribute('height', roundTo(h * scale, decimals) + heightUnit);
              }
          }

          // remove fill rules
          if (fixDirections) {
              let elsFill = svg.querySelectorAll('path[fill-rule], path[clip-rule]');
              elsFill.forEach(el => {
                  el.removeAttribute('fill-rule');
                  el.removeAttribute('clip-rule');
              });
          }

          if (removeSVGAttributes.includes('xmlns')) omitNamespace = true;

          svg = stringifySVG(svg, { omitNamespace, removeComments, format: minifyD });

          svgSizeOpt = svg.length;

          compression = +(100 / svgSize * (svgSizeOpt)).toFixed(2);

          svgSize = +(svgSize / 1024).toFixed(3);
          svgSizeOpt = +(svgSizeOpt / 1024).toFixed(3);

          report = {
              svgSize,
              svgSizeOpt,
              compression,
              decimals,
          };

          if (keepSmaller && svgSize < svgSizeOpt && !splitCompound) {

              svg = input;
              report.node = 'Original is smaller!';
          }

      } else {
          ({ d, report } = paths[0]);
      }

      if (polys.length && polys.length === 1) {
          polys = polys[0];
      }

      if (polyFormat === 'string' && polys.length) {
          polys = polys.flat().map(pt => `${pt.x},${pt.y}`).join(' ');
      }

      return !getObject ? (d ? d : svg) : { svg, d, polys, report, pathDataPlusArr: pathDataPlusArr_global, inputType, dOriginal };

  }

  // just for visual debugging

  // IIFE 
  if (typeof window !== 'undefined') {
      window.svgPathSimplify = svgPathSimplify;
      window.getElementTransform = getElementTransform;

      window.getViewBox = getViewBox;

  }

  exports.PI = PI$1;
  exports.abs = abs$1;
  exports.acos = acos$1;
  exports.asin = asin$1;
  exports.atan = atan$1;
  exports.atan2 = atan2$1;
  exports.ceil = ceil$1;
  exports.cos = cos$1;
  exports.exp = exp$1;
  exports.floor = floor$1;
  exports.getElementTransform = getElementTransform;
  exports.getViewBox = getViewBox;
  exports.hypot = hypot;
  exports.log = log$1;
  exports.max = max$1;
  exports.min = min$1;
  exports.pow = pow$1;
  exports.random = random$1;
  exports.round = round$1;
  exports.sin = sin$1;
  exports.sqrt = sqrt$1;
  exports.svgPathSimplify = svgPathSimplify;
  exports.tan = tan$1;

})(this["svg-path-simplify"] = this["svg-path-simplify"] || {});
