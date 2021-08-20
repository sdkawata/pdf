const path = require('path')

module.exports = {
  mode: 'development',
  entry: {
    main: './src/Index.tsx',
  },
  output: {
    path: path.join(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader']
      }
    ]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'static'),
    },
    compress: true,
    port: 9000,
    hot: true,
  }
}