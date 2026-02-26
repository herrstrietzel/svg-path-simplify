import './svg-path-simplify.worker.polyfills.js';
import { svgPathSimplify } from './svg-path-simplify.esm.js';

self.onmessage = (e) => {
    //let { bmp, options } = e.data;
    let { data, settings } = e.data;

    let fileStack = data;

    try {

        for(let i=0; i<fileStack.length; i++){

            let item = fileStack[i]
            let {svg} = item;
            let simplified =  svgPathSimplify(svg, settings)
            fileStack[i].simplified=simplified
        }

        let result = fileStack
        self.postMessage({ result });

    } catch (err) {
        self.postMessage({ error: err.message });
    }

}