import { parseValue } from "./svgii/svg_el_parse_style_props";

/**
 * Parse nested CSS text into a flat object structure
 * Supports arbitrary nesting depth and & parent selector reference
 * Respects !important modifiers and handles data URLs
 */
export function parseSvgCss(css, {
  parent=null,
  removeUnused=true,
  flatten = true
}={}) {
  
  let type = typeof css
  if(type==='string') removeUnused = false;
  
  // get style element text content
  if(type!=='string' ){
    if(css.nodeName==='style'){
      css = css.innerHTML;
    }
    else if(css.nodeName==='svg'){
      let styleEl = css.querySelector('style')
      if(!styleEl) return {}
      parent = css;
      css = styleEl.innerHTML;
    }

    //invalid input
    else{
     console.warn('invalid CSS input')
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
    let l = text.length


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
      let { declarations, hasNested } = extractDeclarations(blockContent, fullSelector);

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
              //console.log('selector', selector, isId);
              //declarations[prop] = isId && !value.includes('!important') ? value+'!important' : value;
              declarations[prop] = value;
            }
          }
        }
      }
    }

    return { declarations, hasNested };
  }

  let rules = parseBlock(css);
  if(parent && removeUnused) rules = removeUnusedSelectors(parent, rules)
  if(flatten) rules = flattenCssProps(rules)

  // emulate specificity: prioritize ids and important
  let rulesID = {};
  let rulesImportant = {};
  for(let rule in rules){
    if(rule.startsWith('#')){
      rulesID[rule] = rules[rule]
      delete rules[rule];
    }

    for(let prop in rules[rule]){
      let val = rules[rule][prop]
      if(val.includes('!important')){
        if(!rulesImportant[rule]) rulesImportant[rule]={}
        rulesImportant[rule][prop] = val
      }
    }
  }

  rules= {
    ...rules,
    ...rulesID,
    ...rulesImportant
  }

  return rules;
}

function flattenCssProps(rules) {
  for (let selector in rules) {
    let targets = selector.split(/,/).map((sel) => sel.trim());
    let values = rules[selector];
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
    let el = parent.querySelector(selector)
    // remove
    if(!el && selector!==':root') {
      //console.log( selector, 'doesnt exist')
      delete props[selector]
    }
  })
  return props
}