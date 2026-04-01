//import {inputSampleData} from './samples.js'

//import { minify } from 'terser';
import { presetSettings, settingsDefaults } from '../src/pathSimplify-presets.js';
import { renderSvgExcludeFields } from './app_remove_input.js';
import { checkSVGFilesize, loadSVGFiles, getSVGPreviews, hasTextSelection, isInFormField, validateInput, isBody, updateConfig, svg2Symbol, symbol2Svg, togglePreview, showMarkersInPreview, adjustViewBox, serializeSVGPretty, minifySVGMarkup, prefixIds, generateFileRecommendation } from './app_helpers.js';
//import { presetSettings } from './app_presets.js';
import { processFileStack } from './app_process.js';
import { dummySVG } from '../src/constants.js';

let settings = {}
let inputDecimals = document.querySelector('[name=decimals]')
// preview svg for paths
let svgEl = document.getElementById('svg')
let lastFileName = 'simplified.svg';
let sizeKB = 0;
let fileStack = [];
let previewGrid = '';
const WorkerUrl = '../dist/svg-path-simplify.worker.js';
let useWorker = false;


document.addEventListener('settingsChange', (e) => {
    //console.log('settingschange', settings);
    //console.log('settingschange', settings.toRelative, settings.decimals, settings.preset);

    //update rendering
    updateSVG(settings);

    // update new dynamically added fields
    //enhanceNewFields({ settings })

    // show current settings
    updateConfig(settings)

})

// secondary events - not triggering optimization
document.addEventListener('settingsChangeSecondary', (e) => {
    //console.log('settingschangeSec', settings);

    // toggle markers
    showMarkersInPreview(previewWrp, settings)

    // toggle preview
    togglePreview(previewWrp, settings)

    // update new dynamically added fields
    //enhanceNewFields({ settings })

    // show current settings
    updateConfig(settings)


    //console.log('settingsChangeSecondary');

})

// preset loading and resetting
bindPresets(settings);


// Keyboard shortcut listener
document.addEventListener('keydown', async (e) => {

    // Check for Ctrl+S (or Cmd+S on Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        btnDownload.click();
    }

    //paste
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {

        if (!isBody(e)) return
        e.preventDefault();

        try {
            let str = (await navigator.clipboard.readText()).trim();
            let inputField = isInFormField();

            if (!inputField && validateInput(str)) {
                inputSvg.value = str;
                inputSvg.dispatchEvent(new Event('input'))
            } else {
                console.warn('invalid input');
            }

        } catch (err) {
            console.error('Paste failed:', err);
        }
    }

    //copy
    else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {

        if (hasTextSelection()) return;
        e.preventDefault();
        console.log('!!!copy');
        btnCopy.click()
    }
});




window.addEventListener('DOMContentLoaded', (e) => {

    settings = enhanceInputsSettings;
    //console.log('!!!settings', JSON.parse(JSON.stringify(settings)) );

    // check query strings
    let queryParams = getQueryParams();

    if (Object.values(queryParams).length) {

        // override svg input by sample
        if (queryParams.samples) {
            let sampleInput = document.querySelector('[name=samples]')
            let value = sampleInput.value;
            inputSvg.value = value
            settings.dInput = value
            saveSettingsToLocalStorage(settings)
        }

        // reset
        let newUrl = window.location.pathname;
        window.history.pushState({}, "", newUrl);
    }


    //update rendering 
    updateSVG(settings);

    // show current settings
    updateConfig(settings)

    // toggle markers
    showMarkersInPreview(previewWrp, settings)

    // toggle preview
    togglePreview(previewWrp, settings)


    // update new dynamically added fields
    enhanceNewFields({ settings })


    let inpuMarkerSize = document.getElementById('inpuMarkerSize')
    inpuMarkerSize.value = '0.3'


    inpuMarkerSize.addEventListener('input', e => {
        let val = +inpuMarkerSize.value
        previewWrp.style.setProperty('--strokeWidthPrev', val + '%')

    })


})



/**
 * load presets
 */

function bindPresets() {
    let inputsPreset = document.querySelectorAll('input[name=preset]')
    // reset presets on user input
    let inputsSimplify = document.querySelectorAll('aside .input-wrap input, aside .input-wrap button');

    loadpresets(inputsPreset)
    resetPresets(inputsSimplify, inputsPreset);
}

function loadpresets(inputsPreset) {

    inputsPreset.forEach(inp => {
        inp.addEventListener('input', e => {
            let presetName = document.querySelector('input[name=preset]:checked').value;
            if (presetName) {
                let settingsNew = presetSettings[presetName] !== undefined ? presetSettings[presetName] : null

                if (settingsNew) {

                    // update properties
                    for (let prop in settingsNew) {
                        settings[prop] = settingsNew[prop]
                    }

                    // update inputs
                    setInputValueFromSettings(settingsNew)

                    // update settings without triggering update
                    let storageName = settings.storageName || null
                    if (storageName) {
                        // update localStorage
                        saveSettingsToLocalStorage({ ...settings, ...settingsNew }, storageName)
                    }

                    //update rendering 
                    document.dispatchEvent(new Event('settingsChange'))
                }
            }
        })
    })
}


function resetPresets(inputsSimplify, inputsPreset) {

    inputsSimplify.forEach(inp => {
        let { name, type } = inp;
        if (!name) name = 'button';
        //let hasProp = settings[name] !== undefined || name === 'button';

        if (name !== 'dInput' && name !== 'preset') {

            inp.addEventListener('click', e => {

                let hasPreset = settings['preset'];
                if (hasPreset) {
                    settings['preset'] = 0;
                    //console.log('!!!reset preset', settings['preset']);

                    if (type === 'button') {
                        inp = inp.closest('.input-wrap').querySelector('input');
                    }

                    inputsPreset.forEach(inpPreset => {
                        if (inpPreset.value === '0') {
                            inpPreset.checked = true;
                        } else {
                            inpPreset.checked = false
                        }
                    })

                    // update
                    document.dispatchEvent(new Event('settingsChange'))
                }

            }, false)
        }
    })
}

















// delete sample selection
inputSvg.addEventListener('input', async (e) => {
    inputSamples.value = ''

    // reset file stack
    fileStack = [];
});


// file upload
inputFile.addEventListener('input', async (e) => {
    let files = inputFile.files;
    let l = files.length;

    // max size for worker
    let maxSize = 1000 * 1024;


    // reset stack
    fileStack = [];

    // timings
    let t0 = performance.now();


    // check file size
    fileStack = await checkSVGFilesize(files);

    // check total file size
    let { totalO = 0 } = fileStack[0]
    totalO = +(totalO / 1024).toFixed(3)

    /**
     * use worker for many files
     */
    useWorker = totalO > maxSize

    // load file content
    document.body.classList.add('processing')
    fileStack = await loadSVGFiles(files, fileStack);


    // multi file
    if (l > 1) {
        document.body.classList.add('multiFile')
        //btnDownloadZip.classList.add('processing')

        // process
        processFileStack(fileStack, settings, useWorker, WorkerUrl)

    }

    else {

        let fileItem = fileStack[0]
        lastFileName = fileItem.name;
        btnDownload.setAttribute('download', lastFileName);
        sizeKB = +(fileItem.size / 1024).toFixed(3)

        if (sizeKB > 500) {
            if (!window.confirm(`This image is quite large ${sizeKB} KB – processing may take a while.\n Wanna proceed?`)) {
                inputFile.value = '';
                return
            }
        }

        let input = fileItem.svg;
        settings.dInput = input;
        inputSvg.value = input;

        //console.log('!!!!single file');
        updateSVG(settings);
    }




    // timings
    let t1 = performance.now() - t0;
    console.log('timing', t1);


}, true);




inputSamples.addEventListener('input', e => {

    // reset file stack
    fileStack = [];
    inputFile.value = null
    //inputFile.dispatchEvent(new Event('input'))

    let fileList = document.querySelector('.input-file-ul')
    if (fileList) fileList.textContent = '';

    let d = e.currentTarget.value;

    inputSvg.value = d;
    settings['dInput'] = d;

    updateSVG(settings);

    // update settings without triggering update
    let storageName = settings.storageName || null
    if (storageName) {
        // update localStorage
        saveSettingsToLocalStorage(settings, storageName)
    }

})





// single file
function updateSVG(settings = {}, processed = false) {

    //console.log('updateSVG', settings.toRelative );

    // keep multi file mode
    if (fileStack.length) {
        processFileStack(fileStack, settings, useWorker, WorkerUrl)

        if (fileStack.length > 1) {
            //console.log('update previews');
            // update preview images
            let previews = getSVGPreviews(fileStack)

            // render previews
            svgWrapMulti.innerHTML = previews;
            return
        }
    }

    document.body.classList.remove('multiFile')
    markers.innerHTML = '';
    // remove previews
    svgWrapMulti.textContent = '';


    // get detailed object
    settings.getObject = true;

    let { dInput, samples, defaults } = settings;

    // load sample
    if (!dInput && !samples) return



    // add sample
    let settingsShare = {};
    if (settings['samples']) settingsShare['samples'] = settings['samples'];
    let settingsFiltered = updateConfig(settings)

    // remove defaults from query
    let exclude = ['defaults', 'storageName', 'showNav', 'getObject', 'dOutput', 'showMarkers'];
    for (let prop in settingsFiltered) {
        let value = settingsFiltered[prop];
        if (defaults[prop] === value || exclude.includes(prop)) {
            //console.log('is default', prop);
            continue
        }

        if (prop === 'dInput') {
            value = value
                .replace(/[\n\r|\t|]/g, " ")
                .replace(/,/g, ' ')
                .replace(/ +/g, ' ')
                .trim()
        }
        settingsShare[prop] = value;
    }



    let query = settingsToQueryString(settingsShare, exclude)
    let baseUrl = window.location.href.split('?')[0]
    let url = baseUrl + query;
    //shareUrl.textContent = 'Share Link';
    shareUrl.href = url;

    shareUrl.addEventListener('click', (e) => {
        navigator.clipboard.writeText(url)
    })


    // normalized d string for pathdata array inputs
    let dPreview = Array.isArray(dInput) ? dInput.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ') : dInput;



    if (fileStack.length === 1) processed = true;

    /**
     * validate
     * prevent malicious files
     */
    //let inputData = detectInputType(dInput)
    //console.log('inputData', inputData);

    //let validation = validateSVG(dInput);
    let validation = detectInputType(dInput);
    let { isValid, fileReport = null } = validation;
    //console.log('!!!validation app', validation, fileReport);

    // generate report
    let fileInfoCnt = ''
    if (fileReport) {

        let ulReport = []
        if (!isValid) {
            if (fileReport['nonsensePaths']) ulReport.push('Has nonsense/invisible path elements')
            if (fileReport['isBillionLaugh']) ulReport.push('Might contain a <strong>Billion laugh exploit</strong> (heavily nested use elements)')
            if (fileReport['hasScripts']) ulReport.push('Contains <strong>script</strong> elements – better use components for SVG interactivity')
            if (fileReport['hasEntity']) ulReport.push('Contains <strong>XML Entity definitions</strong> – not necessarily harmful but also used in exploits.')

        } else {
            ulReport = []
            fileInfoCnt = ''

            // show recommendations
            if (isValid && validation.inputType === 'svgMarkup') {
                let tips = generateFileRecommendation(dInput, settings)
                fileInfoCnt = tips;
            }


        }

        ulReport.forEach(li => {
            fileInfoCnt += `<li class="li-report">${li}</li>`
        })

        if (ulReport.length) {
            //console.log(ulReport);
            fileInfoCnt = `<ul class="ul-bll li-bll ul-report">${fileInfoCnt}</ul>`
        }

    }

    btnFileInfo.addEventListener('click', e => {

        let validClass = isValid ? 'valid' : 'invalid';
        let reportHeaderText = validation.isValid ? 'File is OK!' : 'File not valid – may contain malicious code!';
        let reportHeaderEl = `<p class="fnt-wgt-700 fileReportHeader ${validClass}">${reportHeaderText}</p>`;


        // compile new report
        fileInfoReport.innerHTML = reportHeaderEl + fileInfoCnt;

    })


    if (!isValid) {

        btnFileInfo.click();

        // replace with dummy svg
        //console.log('use dummy');
        dInput = dummySVG;
        settings.dInput = dInput
        return false
    }

    //let {inputType, log} = validation;



    let t0 = performance.now();
    let pathDataOpt = processed ? fileStack[0].simplified : svgPathSimplify(dInput, settings)
    let t1 = performance.now() - t0;
    console.log('Optimized:', pathDataOpt, t1);


    let { d = '', svg = '', polys = [], report = {}, inputType, dOriginal = '' } = pathDataOpt;

    // single path or svg
    let mode = inputType === "svgMarkup" || inputType === "symbol" || inputType === "splitPath" ? 1 : 0;


    if (polys.length) {
        document.body.classList.add('poly')
    } else {
        document.body.classList.remove('poly')

    }

    if (mode) {
        document.body.classList.add('svgMarkup')
    } else {
        document.body.classList.remove('svgMarkup')
    }

    document.body.dataset.input = inputType;

    let { original, decimals = null } = report;


    if (polys.length) {
        //console.log(polys);
        polyOut.value = JSON.stringify(polys).replaceAll('"', '')
    }


    // show auto accuracy
    if (decimals !== null && inputDecimals && settings.autoAccuracy) {
        settings.decimals = decimals
        inputDecimals.value = decimals
    }


    let svgSize = !mode ? +(d.length / 1024).toFixed(3) : report.svgSizeOpt;
    //let reportRemoved = !mode ? `<br>${report.new}/${report.original} – removed: ${report.saved} <br>` : ''
    let reportRemoved = `<br>${report.new}/${report.original} – removed: ${report.saved} <br>`;
    let reportCompression = `${report.compression}&thinsp;%`


    let reportText = `${reportCompression} – ${svgSize}&thinsp;KB
    ${reportRemoved}
    `

    // update report
    pReport.innerHTML = reportText

    // return path data or svg 
    outputSvg.value = !mode ? d : (inputType === 'symbol' ? svg2Symbol(svg) : svg);
    //console.log('svg out', svg);


    // update preview rendering
    //svgWrap.innerHTML = '';
    svgWrapO.innerHTML = '';
    svgWrapS.innerHTML = '';

    // incase input was pathdata array
    dInput = dPreview;

    let scale = settings.scale;

    if (!mode && inputType !== 'invalid') {
        svgEl.classList.remove('dsp-non')

        if (inputType === 'polyString') dInput = 'M' + dInput;
        if (inputType === 'polyArray') dInput = dOriginal;

        path1.setAttribute('d', dInput)
        pathS.setAttribute('d', d)
        adjustViewBox(svgEl);


        if (inputType === 'splitPath') {

        }

        // scale element
        svgEl.style.setProperty('--scalePreview', scale)


    }

    // input is svg doc
    if (mode) {
        svgEl.classList.add('dsp-non')

        // prefix ids and refs
        let svgO = settings.dInput ? settings.dInput : '';
        if (inputType === 'symbol') svgO = symbol2Svg(svgO)

        // show original in image to prevent style bleeding
        let svgDomCopy = new DOMParser().parseFromString(svgO, 'image/svg+xml').querySelector('svg');
        let previewImg = document.createElement('img')

        // add mandatory namespace for image
        svgDomCopy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        svgO = new XMLSerializer().serializeToString(svgDomCopy)
        previewImg.src = `data:image/svg+xml,${encodeURIComponent(svgO)}`

        // optimized svg
        let svg_prev = prefixIds(svg);

        if (inputType === 'splitPath' && svg) {
            let svgSplit = svg.startsWith('<svg') ? new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('svg') : null;
            if (svgSplit) {
                let viewBox = svgSplit.hasAttribute("viewBox") ? svgSplit.getAttribute("viewBox") : ''
                svgO = `<svg viewBox="${viewBox}">
                <path d="${settings.dInput}" />
                </svg>`
            }
        }


        // unoptimized
        //svgWrapO.insertAdjacentHTML('beforeend', svgO)
        svgWrapO.insertAdjacentElement('beforeend', previewImg)

        // optimized
        svgWrapS.insertAdjacentHTML('beforeend', svg_prev)

        //let svgDocElO = svgWrapO.querySelector('svg')
        let svgDocElO = svgDomCopy;
        let svgDocEl = svgWrapS.querySelector('svg')


        /**
         * get all SVG elements and
         * attributes to render 
         * inputs for selective removal
         */
        renderSvgExcludeFields(svgDomCopy, settings)

        /**
         * preview: 
         * set viewBox and 
         * dimensions
         */
        let viewBox = getViewBox(svgDocEl);
        let viewBoxAtt = svgDocEl.getAttribute('viewBox')
        if (!viewBoxAtt) {
            viewBoxAtt = [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' ')
            svgDocEl.setAttribute('viewBox', viewBoxAtt)
        }


        if (svgDocElO) {
            svgDocElO.removeAttribute('width')
            svgDocElO.removeAttribute('height')
        }

        svgDocEl.removeAttribute('width')
        svgDocEl.removeAttribute('height')



        /**
         * adjust marker size 
         * based on 1st transformed element
         */
        let svgEl1 = svgDocEl.querySelectorAll('path, polygon, polyline, line, circle, ellipse, rect')
        if (svgEl1[0]) {
            svgEl1 = svgEl1[0]
            //console.log(svgDocEl, svgEl1);
            let matrix1 = getElementTransform(svgDocEl, svgEl1)
            let scale1 = +matrix1.a.toFixed(7)

            let wrap = svgDocEl.closest('.wrp-zoom');
            if (wrap) {
                // scale element
                wrap.style.setProperty('--elScale', scale1)
            }

        }

    }


    let svgExport = svg ? svg : null;
    let inIframe = window.self !== window.top;



    // create standalone svg
    //console.log(svgExport, settings);

    if (!svgExport) {

        let viewBox = svgEl.getAttribute('viewBox').trim().split(' ').map(Number)
        if (decimals > -1) {
            viewBox = viewBox.map((val) => +val.toFixed(decimals))
        }

        let [width, height] = [viewBox[2], viewBox[3]];
        svgExport = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox.join(' ')}"><path d="${d}"/></svg>`
    }


    // prettify
    if (+settings.minifyD === 2) {
        svgExport = serializeSVGPretty(svgExport);
        //console.log(svgExport);
    }
    else if (+settings.minifyD === 0) {
        svgExport = minifySVGMarkup(svgExport);
        //console.log(svgExport);
    }



    let blob = new Blob([svgExport], { type: 'image/svg+xml' });
    let objectUrl = URL.createObjectURL(blob)
    btnDownload.href = objectUrl;


    /**
     * edit links
     */

    // 1. codepen link
    let obj_codepen = {
        title: `svg-path-simplify`,
        description: `svg-path-simplify`,
        html: svgExport,
        css: `body{background: repeating-conic-gradient(hsl(55, 10%, 85%) 0% 25%, transparent 25% 50%);
        background-size: 1em 1em;} svg{display:block; outline: 1px solid red; overflow:visible}`
    }

    let dataCodepen = JSON.stringify(obj_codepen)
    inputCodepen.value = dataCodepen;

    // 2. edit on svg-path-editor
    linkEdit.style.removeProperty('display');
    let dUrl = (d).trim().replace(/[ |\n]/g, '_');
    //console.log('dUrl' , dUrl);
    linkEdit.href = !mode ? `https://yqnn.github.io/svg-path-editor/#P=${dUrl}` : '';

    if (mode) {
        linkEdit.style.display = 'none'
    }


    btnCopy.addEventListener('click', (e) => {
        if (!inIframe && navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(svgExport)
        }
    })


}



