//import {inputSampleData} from './samples.js'

import { checkSVGFilesize, loadSVGFiles, simplifyStack, getSVGPreviews, generateSVGZip, getZipObjectUrl } from './app_helpers.js';

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


window.addEventListener('DOMContentLoaded', (e) => {

    settings = enhanceInputsSettings;
   // console.log('settings', settings);

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


    document.addEventListener('settingsChange', (e) => {
        //console.log('settingschange', settings);

        //update rendering
        updateSVG(settings);

        // show current settings
        updateConfig(settings)

    })

})

function updateConfig(settings = {}) {

    let {omitDefaults} = settings || false

    let excludeProps = ['dInput', 'dOutput', 'storageName', 'defaults', 'config', 'showNav', 'showMarkers', 'data', 'getObject', 'samples', 'omitDefaults']
    let configs = {}

    let defaults = settings.defaults;

    for (let prop in settings) {
        if (!excludeProps.includes(prop)) {
            let value = settings[prop];
            if(!omitDefaults || value!==defaults[prop]){
                configs[prop] = settings[prop]
            }
        }
    }
    let configJson = 'const options='+JSON.stringify(configs, null, ' ').replaceAll('"', '')
    textConfig.value = configJson

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

    // process
    processFileStack(fileStack, settings, useWorker, WorkerUrl)

    // multi file
    if (l > 1) {
        document.body.classList.add('multiFile')
        //btnDownloadZip.classList.add('processing')
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


// batch processing

async function processFileStack(fileStack, settings, useWorker = false, WorkerUrl) {


    // check total file size
    let { totalO = 0 } = fileStack[0]
    totalO = +(totalO / 1024).toFixed(3)

    // process svgs
    if (useWorker) {
        console.log('many use worker', totalO)
        fileStack = await simplifyStackWorker(fileStack, settings, WorkerUrl);
    } else {
        fileStack = simplifyStack(fileStack, settings);
    }

    //return

    // create zips
    let urlDownload = await generateSVGZip(fileStack);

    // update download link
    btnDownloadZip.href = urlDownload;
    btnDownloadZip.classList.remove('processing')


    // update preview images
    let previews = getSVGPreviews(fileStack)
    //console.log('fileStack', fileStack);

    // render previews
    svgWrapMulti.innerHTML = previews;

    // update report
    let { totalS } = fileStack[0];

    totalS = +(totalS / 1024).toFixed(3)
    let perc = +(100 / totalO * totalS).toFixed(3)
    pReport.innerHTML = `${perc}&thinsp;% – ${totalS}&thinsp;KB`

    document.body.classList.remove('processing')

}



// single file
function updateSVG(settings = {}, processed = false) {

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

    showMarkersInPreview(previewWrp, settings)

    // get detailed object
    settings.getObject = true;

    let { dInput, samples, defaults } = settings;

    // load sample
    if (!dInput && !samples) return


    let exclude = ['defaults', 'storageName', 'showNav', 'getObject', 'dOutput', 'showMarkers']

    // remove defaults from query
    let settingsShare = {};
    for (let prop in settings) {
        let value = settings[prop];
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

    let t0 = performance.now();
    let pathDataOpt = processed ? fileStack[0].simplified : svgPathSimplify(dInput, settings)
    let t1 = performance.now() - t0;
    console.log('pathDataOpt', pathDataOpt, 'timing', t1);


    let { d, svg, polys, report, inputType } = pathDataOpt;

    // single path or svg
    let mode = inputType === "svgMarkup" ? 1 : 0;

    let { original, decimals = null } = report;

    if(polys.length){
        polyOut.value=JSON.stringify(polys).replaceAll('"', '')
    }


    //lastFileName

    // show auto accuracy
    if (decimals !== null && inputDecimals && settings.autoAccuracy) {
        settings.decimals = decimals
        inputDecimals.value = decimals
    }



    let svgSize = !mode ? +(d.length / 1024).toFixed(3) : report.svgSizeOpt;
    let reportRemoved = !mode ? `<br>${report.new}/${report.original} – removed: ${report.saved} <br>` : ''
    let reportCompression = `${report.compression}&thinsp;%`

    //let reportText = !mode ? `${report.new}/${report.original} – removed: ${report.saved} compressed: ${report.compression}%` : `${report.svgSizeOpt}/${report.svgSize} KB – compressed: ${report.compression}%`

    let reportText = `${reportCompression} – ${svgSize}&thinsp;KB
    ${reportRemoved}
    `

    // update report
    pReport.innerHTML = reportText

    // return path data or svg 
    outputSvg.value = !mode ? d : svg;


    // update preview rendering
    svgWrap.innerHTML = '';

    // incase input was pathdata array
    dInput = dPreview;

    let scale = settings.scale;

    if (!mode) {
        svgEl.classList.remove('dsp-non')


        if (inputType === 'polyString') dInput = 'M' + dInput;

        path1.setAttribute('d', dInput)
        pathS.setAttribute('d', d)

        adjustViewBox(svgEl);

        // scale element
        svgEl.style.setProperty('--scalePreview', scale)


    }

    // input is svg doc
    if (mode) {
        svgEl.classList.add('dsp-non')

        svgWrap.insertAdjacentHTML('beforeend', svg)
        let svgDocEl = svgWrap.querySelector('svg')

        let viewBoxAtt = svgDocEl.getAttribute('viewBox')

        if (!viewBoxAtt) {

            let viewBox = getViewBox(svgDocEl);
            viewBoxAtt = [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' ')

            //console.log('viewBox', viewBox);
            svgDocEl.setAttribute('viewBox', viewBoxAtt)
        }

        svgDocEl.removeAttribute('width')
        svgDocEl.removeAttribute('height')

        // scale element
        //svgDocEl.style.setProperty('--scalePreview', scale)



    }


    let svgExport = svg ? svg : null;
    let inIframe = window.self !== window.top;

    //console.log(svgExport);

    // create standalone svg
    if (!svgExport) {

        let viewBox = svgEl.getAttribute('viewBox').trim().split(' ').map(Number).map((val) => +val.toFixed(decimals))
        let [width, height] = [viewBox[2], viewBox[3]];
        svgExport = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox.join(' ')}"><path d="${d}"/></svg>`

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
        css:`body{background:#ccc} svg{display:block; outline: 1px solid #ccc; overflow:visible}`
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


export function simplifyStackWorker(data = [], settings = {}, workerurl = '') {

    return new Promise((resolve, reject) => {
        let worker = new Worker(
            new URL(workerurl, import.meta.url),
            { type: 'module' }
        );

        // send request
        worker.postMessage({ data, settings });

        worker.onmessage = (e) => {
            let { result, error } = e.data;
            worker.terminate();

            if (error) reject(new Error(error));
            else resolve(result);
        };

        worker.onerror = (err) => {
            worker.terminate();
            reject(err);
        };
    });
}





function showMarkersInPreview(target, settings = {}) {

    if (settings.showMarkers) {
        target.classList.add('showMarkers')

    } else {
        target.classList.remove('showMarkers')
    }
}



function adjustViewBox(svg) {
    let bb = svg.getBBox();
    let [x, y, width, height] = [bb.x, bb.y, bb.width, bb.height];
    svg.setAttribute("viewBox", [x, y, width, height].join(" "));
}

