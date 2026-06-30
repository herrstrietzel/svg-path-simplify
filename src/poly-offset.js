import { checkLineIntersection } from "./svgii/geometry";

export function getParallelPoly(pts=[], strokeWidth = 1, sweep = 1, closed=false) {
  let l = pts.length;

  let polyTop_lines = [];
  let polyBottom_lines = [];
  let polyTop = [];
  let polyBottom = [];

  for (let i = 1; i < l; i++) {
    let p1 = pts[i - 1];
    let p2 = pts[i];
    let parralels = getParallels(p1, p2, strokeWidth);
    let { top, bottom } = parralels;
    polyTop_lines.push(top);
    polyBottom_lines.push(bottom);
  }

  // find line intersections
  l = polyTop_lines.length;

  // add 1st points
  polyTop.push(polyTop_lines[0][0]);
  polyBottom.push(polyBottom_lines[0][0]);

  for (let i = 1; i < l; i++) {
    let l1_t = polyTop_lines[i - 1];
    let l2_t = polyTop_lines[i];
    let ptI_t = checkLineIntersection(
      l1_t[0],
      l1_t[1],
      l2_t[1],
      l2_t[0],
      false,
      true
    );
    let ptN_t = ptI_t ? ptI_t : l1_t[1];

    let l1_b = polyBottom_lines[i - 1];
    let l2_b = polyBottom_lines[i];
    let ptI_b = checkLineIntersection(
      l1_b[0],
      l1_b[1],
      l2_b[1],
      l2_b[0],
      false,
      true
    );
    let ptN_b = ptI_b ? ptI_b : l1_t[1];

    polyTop.push(ptN_t);
    polyBottom.push(ptN_b);
  }

  // add last pts
  polyTop.push(polyTop_lines[l - 1][1]);
  polyBottom.push(polyBottom_lines[l - 1][1]);
  
  if(closed){
    let l=polyTop.length;
    let ptI_1 =checkLineIntersection(polyTop[1],polyTop[0], polyTop[l-2],polyTop[l-1], false, true )
    if(ptI_1){
      //renderPoint(svg, ptI_1)
      polyTop[0] = ptI_1
      polyTop[l-1] = ptI_1
    }
    let ptI_2 =checkLineIntersection(polyBottom[1],polyBottom[0], polyBottom[l-2],polyBottom[l-1], false, true )
    
    if(ptI_2){
      //renderPoint(svg, ptI_2, 'green')
      polyBottom[0] = ptI_2
      polyBottom[l-1] = ptI_2
    }

    
    
  }

  return sweep
    ? { polyTop: polyBottom, polyBottom: polyTop }
    : { polyTop, polyBottom };
}

export function getParallels(p1, p2, strokeWidth = 1) {
  let distance = strokeWidth * 0.5;
  // Get direction vector
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;

  // Calculate normalized perpendicular vector (rotated 90°)
  let length = Math.hypot(dx, dy);
  let perpX = -dy / length; // Left/up perpendicular
  let perpY = dx / length;

  // Scale by distance once
  let offsetX = perpX * distance;
  let offsetY = perpY * distance;

  // Return both parallels in one go

  let bottom = [
    { x: p1.x - offsetX, y: p1.y - offsetY },
    { x: p2.x - offsetX, y: p2.y - offsetY }
  ];

  let top = [
    { x: p1.x + offsetX, y: p1.y + offsetY },
    { x: p2.x + offsetX, y: p2.y + offsetY }
  ];

  //renderPoint(svg, top[0])
  //renderPoint(svg, bottom[0], 'blue')

  return { top, bottom };
}

function getExtendedPoint(p1, p2, distance) {
  // Get direction vector
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  let length = Math.hypot(dx, dy);

  // Normalize direction
  let ndx = dx / length;
  let ndy = dy / length;

  // Extend along the line direction
  return {
    x: p2.x + ndx * distance,
    y: p2.y + ndy * distance
  };
}