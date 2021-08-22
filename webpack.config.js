const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: process.env.WEBPACK_MODE === "production" ? "production" : 'development',
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
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {from: "static", to: "."}
      ]
    })
  ]
}