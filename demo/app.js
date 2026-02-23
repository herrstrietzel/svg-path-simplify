
let settings = {}
let inputDecimals = document.querySelector('[name=decimals]')
// preview svg for paths
let svgEl = document.getElementById('svg')
let lastFileName = 'simplified.svg';
let sizeKB = 0;


window.addEventListener('DOMContentLoaded', (e) => {

    settings = enhanceInputsSettings;
    //console.log('!!!settings all', settings);


    // check query strings
    let queryParams = window.location.href.split('?')
    if (queryParams.length) {
        //let query = settingsToQueryString(settings)
        //let baseUrl = window.location.href.split('?')[0]

        // reset
        let newUrl = window.location.pathname;
        window.history.pushState({}, "", newUrl);
    }


    //update rendering 
    updateSVG(settings);

    document.addEventListener('settingsChange', (e) => {

        //console.log('settingschange', settings);

        //update rendering
        updateSVG(settings);

    })

})


// delete sample selection
inputSvg.addEventListener('input', async (e) => {
    inputSamples.value = ''
});


inputFile.addEventListener('input', async (e) => {
    let file = inputFile.files[0];
    let { size, name } = file;
    sizeKB = +(size / 1024).toFixed(1)

    lastFileName = name;
    btnDownload.setAttribute('download', lastFileName);

    if (sizeKB > 500) {

        if (!window.confirm(`This image is quite large ${sizeKB} KB – processing may take a while.\n Wanna proceed?`)) {
            inputFile.value = '';
            return
        }

    }

    let input = await file.text();
    settings.dInput = input;
    inputSvg.value = input;

    updateSVG(settings);

}, true)



inputSamples.addEventListener('input', e => {

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


function updateSVG(settings = {}) {

    markers.innerHTML = '';

    showMarkersInPreview(previewWrp, settings)

    // get detailed object
    settings.getObject = true;

    let { dInput, samples, defaults } = settings;

    //let select = document.querySelector('[name=samples]')
    //console.log(select, dInput, samples);
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



    // normalized d string for pathdata array inputs
    let dPreview = Array.isArray(dInput) ? dInput.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ') : dInput;



    let t0 = performance.now();
    let pathDataOpt = svgPathSimplify(dInput, settings)
    let t1 = performance.now() - t0;
    console.log('pathDataOpt', pathDataOpt, 'timing', t1);



    //console.log(JSON.stringify(pathDataOpt, null, ' '))
    //pathDataOpt = svgPathSimplify(pathDataOpt.d, settings)

    let { d, svg, report, inputType, mode } = pathDataOpt;
    let { original, decimals = null } = report;


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
        html: svgExport
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

