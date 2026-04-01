

export function validateSVG(markup, allowed = {}) {
  allowed = {
    ...{
      //useEls: 10,
      //hasPrologue: false,
      //hasXmlns: true,
      useElsNested: 5000,
      hasScripts: false,
      hasEntity: false,
      fileSizeKB: 10000,
      isSymbolSprite: false,
      isSvgFont: false
    },
    ...allowed
  };


  let fileReport = analyzeSVG(markup, allowed);
  let isValid = true;
  let log = [];

  if (!fileReport.hasEls) {
    log.push("no elements");
    isValid = false;
  }

  if (Object.keys(fileReport).length) {
    if (fileReport.isBillionLaugh === true) {
      log.push(`suspicious: might contain billion laugh attack`);
      isValid = false;
    }

    for (let key in allowed) {
      let val = allowed[key];
      let valRep = fileReport[key];
      if (typeof val === "number" && valRep > val) {
        log.push(`allowed "${key}" exceeded: ${valRep} / ${val} `);
        isValid = false;
      }
      if (valRep === true && val === false) {
        log.push(`not allowed: "${key}" `);
        isValid = false;
      }
    }
  } else {
    isValid = false;
  }

  /*
  if (!isValid) {
    log = ["SVG not valid"].concat(log);
    //console.log(log.join("\n"));
    if (Object.keys(fileReport).length) {
      console.warn(fileReport);
    }
  }
  */

  return { isValid, log, fileReport };
}

function analyzeSVG(markup, allowed = {}) {
  markup = markup.trim();
  let doc, svg;
  let fileSizeKB = +(markup.length / 1024).toFixed(3);

  let fileReport = {
    totalEls: 1,
    hasEls: true,
    hasDefs: false,
    geometryEls: [],
    useEls: 0,
    useElsNested: 0,
    nonsensePaths: 0,
    isSuspicious: false,
    isBillionLaugh: false,
    hasScripts: false,
    hasPrologue: false,
    hasEntity: false,
    isPathData:false,
    fileSizeKB,
    hasXmlns: markup.includes("http://www.w3.org/2000/svg"),
    isSymbolSprite: false,
    isSvgFont: markup.includes("<glyph>")
  };


  let maxNested = allowed.useElsNested ? allowed.useElsNested : 2000;

  /**
   * analyze nestes use references
   */
  const countUseRefs = (useEls, maxNested = 2000) => {
    let nestedCount = 0;
    //stop loop if number of nested use references is exceeded
    for (let i = 0; i < useEls.length && nestedCount < maxNested; i++) {
      let use = useEls[i];
      let refId = use.getAttribute("xlink:href")
        ? use.getAttribute("xlink:href")
        : use.getAttribute("href");
      refId = refId ? refId.replace("#", "") : "";

      //normalize href attributes to facilitate JS selection
      use.setAttribute("href", "#" + refId);

      let refEl = svg.getElementById(refId);
      let nestedUse = refEl.querySelectorAll("use");
      let nestedUseLength = nestedUse.length;
      nestedCount += nestedUseLength;

      // query nested use references
      for (let n = 0; n < nestedUse.length && nestedCount < maxNested; n++) {
        let nested = nestedUse[n];
        let id1 = nested.getAttribute("href").replace("#", "");
        let refEl1 = svg.getElementById(id1);
        let nestedUse1 = refEl1.querySelectorAll("use");
        nestedCount += nestedUse1.length;
      }
    }
    fileReport.useElsNested = nestedCount;
    return nestedCount;
  };

  /**
   * check on raw text level
   */
  let hasPrologue = /\<\?xml.+\?\>|\<\!DOCTYPE.+]\>/g.test(markup);
  let hasEntity = /\<\!ENTITY/gi.test(markup);
  let hasScripts = /\<script/gi.test(markup) ? true : false;
  let hasUse = /\<use/gi.test(markup) ? true : false;
  let hasEls = /[\<path|\<polygon|\<polyline|\<rect|\<circle|\<ellipse|\<line|\<text|\<foreignObject]/gi.test(markup);
  let hasDefs = /[\<filter|\<linearGradient|\<radialGradient|\<pattern|\<animate|\<animateMotion|\<animateTransform|\<clipPath|\<mask|\<symbol|\<marker]/gi.test(markup);

  let isPathData = (markup.startsWith('M') || markup.startsWith('m')) && !/[\<svg|\<\/svg]/gi.test(markup);
  fileReport.isPathData = isPathData;

  // seems OK
  if (!hasEntity && !hasUse && !hasScripts && (hasEls || hasDefs) && fileSizeKB < allowed.fileSizeKB) {
    fileReport.hasEls = hasEls
    fileReport.hasDefs = hasDefs
    //console.log('Looks OK!', fileReport, allowed);
    return fileReport
  }


  // Contains xml entity definition: highly suspicious - stop parsing!
  if (allowed.hasEntity === false && hasEntity) {
    fileReport.hasEntity = true;
    //return fileReport;
  }

  /**
   * sanitizing for parsing:
   * remove xml prologue and comments
   */
  markup = markup
    .replace(/\<\?xml.+\?\>|\<\!DOCTYPE.+]\>/g, "")
    .replace(/(<!--.*?-->)|(<!--[\S\s]+?-->)|(<!--[\S\s]*?$)/g, "");

  /**
   * Try to parse svg:
   * invalid svg will return false via "catch"
   */
  try {
    //doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    doc = new DOMParser().parseFromString(markup, "text/html");
    svg = doc.querySelector("svg");

    // paths containing only a M command
    let nonsensePaths = svg.querySelectorAll('path[d="M0,0"], path[d="M0 0"]').length;
    let useEls = svg.querySelectorAll("use").length;


    // create analyzing object
    fileReport.totalEls = svg.querySelectorAll("*").length;
    fileReport.geometryEls = svg.querySelectorAll(
      "path, rect, circle, ellipse, polygon, polyline, line"
    ).length

    fileReport.hasScripts = hasScripts
    fileReport.useEls = useEls;
    fileReport.nonsensePaths = nonsensePaths;
    fileReport.isSuspicious = false;
    fileReport.isBillionLaugh = false;
    fileReport.hasXmlns = svg.getAttribute("xmlns")
      ? svg.getAttribute("xmlns") === "http://www.w3.org/2000/svg"
        ? true
        : false
      : false;
    fileReport.isSymbolSprite = 
    svg.querySelectorAll("symbol").length &&
      svg.querySelectorAll("use").length === 0
      ? true
      : false;
    fileReport.isSvgFont = svg.querySelectorAll("glyph").length ? true : false;

    let totalEls = fileReport.totalEls;
    let totalUseEls = fileReport.useEls;
    let usePercentage = (100 / totalEls) * totalUseEls;

    // if percentage of use elements is higher than 75% - suspicious
    if (usePercentage > 75) {
      fileReport.isSuspicious = true;

      // check nested use references
      let nestedCount = countUseRefs(svg.querySelectorAll("use"), maxNested);
      if (nestedCount >= maxNested) {
        fileReport.isBillionLaugh = true;
      }
    }

    return fileReport;
  } catch {
    // svg file has malformed markup
    console.warn("svg could not be parsed");
    return false;
  }
}
