import babel from 'rollup-plugin-babel';

export default {
  entry: 'index.js',
  format: 'umd',
  globals: {
    'd3-selection': 'd3_selection',
    'd3-selection-multi': 'd3_selection_multi',
    'd3-transition': 'd3_transition'
  },
  plugins: [
    babel({
      presets: ['es2015-rollup']
    })
  ]
};
