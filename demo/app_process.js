import { getSVGPreviews } from "./app_helpers.js";

// batch processing
export async function processFileStack(fileStack, settings, useWorker = false, WorkerUrl) {

    // check total file size
    let { totalO = 0 } = fileStack[0]
    totalO = +(totalO / 1024).toFixed(3)

    // process svgs
    if (useWorker) {
        //console.log('multiple files - use worker', totalO)
        fileStack = await simplifyStackWorker(fileStack, settings, WorkerUrl);
    } else {
        fileStack = simplifyStack(fileStack, settings);
    }

    // create zips
    let urlDownload = await generateSVGZip(fileStack);

    // update download link
    btnDownloadZip.href = urlDownload;
    btnDownloadZip.classList.remove('processing')


    // update preview images
    let previews = getSVGPreviews(fileStack)

    // render previews
    svgWrapMulti.innerHTML = previews;

    // update report
    let { totalS } = fileStack[0];
    let comCount = 0;
    let comSaved = 0;
    fileStack.forEach(file=>{
        let {original, saved} = file.simplified.report
        comSaved+=saved
        comCount +=original
    })

    totalS = +(totalS / 1024).toFixed(3)
    let perc = +(100 / totalO * totalS).toFixed(3)
    pReport.innerHTML = `${perc}&thinsp;% – ${totalS}&thinsp;KB
    <br>removed: ${comSaved} <br>
    `

    document.body.classList.remove('processing')

}



export function simplifyStack(fileStack = [], settings) {
    let l = fileStack.length;
    //let totalO = 0;
    let totalS = 0;

    for (let i = 0; i < l; i++) {
        let item = fileStack[i];
        let { svg, size } = item

        // use original as fallback
        let simplifiedObj = { svg }
        let error = false;

        
        try {
            simplifiedObj = svgPathSimplify(svg, settings)
            //console.log('simplifiedObj:', simplifiedObj);
        } catch {
            console.warn(`${item.name} couldn not be processed`);
            error = false;
        }

        //totalO += size
        totalS += simplifiedObj.svg.length
        fileStack[i].simplified = simplifiedObj;
        fileStack[i].error = error;

    }

    // add new file size
    fileStack[0].totalS = totalS;
    return fileStack;
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



export async function generateSVGZip(fileStack = []) {

    let zipObj = {}

    for (let item of fileStack) {
        let { name, simplified } = item;

        // add to zip
        zipObj[`${name}`] = simplified.svg;

    }

    let url = await getZipObjectUrl(zipObj);
    return url;

}


// create zip
export async function getZipObjectUrl(files = {}) {

    const fetchBinary = async (url) => {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn("could't fetch resource");
            return null;
        }
        return new Uint8Array(await res.arrayBuffer());
    };

    const encoder = new TextEncoder();

    for (let name in files) {
        let val = files[name];

        let isString = typeof val === 'string';
        let ext = isString && !val.includes('<') && !val.includes('>') ? val.split('.').slice(-1)[0].toLowerCase() : '';
        let isUrl = isString && (val.startsWith('http') || val.startsWith('.') || (ext && ext.length < 5));

        if (isString) {
            if (isUrl) {
                let binary = await fetchBinary(val);
                if (binary) {
                    files[name] = binary;
                } else {
                    delete files[name];
                }
            }
            else {
                files[name] = encoder.encode(val);
            }
        }
    }

    let zip = UZIP.encode(files);
    let blob = new Blob([zip]);
    let url = URL.createObjectURL(blob);
    return url
}
