import terser from '@rollup/plugin-terser';
const libName = 'svg-path-simplify';
const libName2 = 'simplify-pathdata';


const stripDevComments = () => ({
    name: 'strip-dev-comments',
    renderChunk(code) {
        return code
            /* SAFER LINE-BY-LINE PROCESSING */
            // Remove single-line /* comments */ (but keep /** docs */)
            .replace(/^[ \t]*\/\*(?!\*).*?\*\/[ \t]*$/gm, '')

            // Remove //comments without space (but keep // comments)
            .replace(/^[ \t]*\/\/[^\s].*$/gm, '')

            /* FORMATTING */
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n');
    }
});

const stripConsoleLogs = () => ({
    name: 'strip-console-logs',
    renderChunk(code) {
        return code
            // Remove only console.log() statements
            .replace(/^\s*console\.log\s*\([^;]*\);?\s*$/gm, '')
    }
});

export default [
    // IIFE Build
    {
        input: 'src/index.js',
        output: [
            {
                file: `dist/${libName}.js`,
                format: 'iife',
                name: libName,
                extend: true,
                exports: 'named',
                plugins: [stripDevComments()]
            },
            {
                file: `dist/${libName}.min.js`,
                format: 'iife',
                name: libName,
                extend: true,
                exports: 'named',
                plugins: [stripConsoleLogs(), terser()]
            },
        ]
    },
    // ESM Build
    {
        input: 'src/index.js',
        output: [
            {
                file: `dist/${libName}.esm.js`,
                format: 'es',
                exports: 'named',
                plugins: [stripDevComments()]
            },
            {
                file: `dist/${libName}.esm.min.js`,
                format: 'es',
                exports: 'named',
                plugins: [stripConsoleLogs(), terser()]
            },
        ]
    },

    // ESM Build only pathdata
    {
        input: 'src/index-pathdata.js',
        output: [
            {
                file: `dist/${libName}.pathdata.esm.js`,
                format: 'es',
                exports: 'named',
                plugins: [stripDevComments()]
            },
            {
                file: `dist/${libName}.pathdata.esm.min.js`,
                format: 'es',
                exports: 'named',
                plugins: [stripConsoleLogs(), terser()]
            },
        ]
    },

    {
        // node DOM polyfills
        input: 'src/index-poly.js',
        output: [
            {
                file: `dist/${libName}.poly.cjs`,
                format: 'cjs',
                exports: 'named',
                //plugins: [stripDevComments()]
            },
        ]
    }

    /*
    // ESM Worker
    {
        input: 'src/index-worker.js',
        output: [
            {
                file: `dist/${libName}.worker.js`,
                format: 'es',
                exports: 'named',
                //plugins: [terser()]
            }
        ]
    },
    */


];

