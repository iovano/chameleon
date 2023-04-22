import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss'
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';

export default {
	input: 'src/frontend/js/main.js',
	output: {
        file: 'public/dist/bundle.min.js',
        format: 'iife',
        name: 'version',
    },
    plugins: [
        postcss({extract: true}),
        nodeResolve({
            jsnext: true,
            main: true,
            browser: true,
            }),
        commonjs(),
        babel({
            babelHelpers: 'bundled',
            presets: ['@babel/preset-env'],
            exclude: 'node_modules/**'
        }),
        terser(),
        replace({
            exclude: 'node_modules/**',
            ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
            }),            
    ],
};