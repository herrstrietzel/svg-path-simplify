import { svgPathSimplify } from './svg-path-simplify.esm.js';

self.onmessage = (e) => {
    //let { bmp, options } = e.data;
    let { data, settings } = e.data;

    try {

        let result = JSON.stringify(settings, null, ' ')
        self.postMessage({ result });

    } catch (err) {
        self.postMessage({ error: err.message });
    }


}