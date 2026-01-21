const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production', // Убирает необходимость отдельно плагин для минификации
  devtool: 'source-map',
  entry: {
    widget: path.resolve(__dirname, 'src', 'widget', 'widget-index.js'),
    chat: path.resolve(__dirname, 'src', 'chat', 'chat-index.js'),
  },
  output: {
    path: path.resolve(__dirname, 'dist', 'js'),
    filename: '[name].js',
    publicPath: '/js/',
    clean: true, // Очищает папку dist/js перед билдом
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        use: {
          loader: 'babel-loader',
          options: {
            // Убедись, что есть .babelrc или babel.config.json с настройками
            cacheDirectory: true,
          }
        }
      },
      {
        test: /\.css$/,
        include: path.resolve(__dirname, 'css'),
        use: [
          'style-loader',
          'css-loader',
          'sass-loader' // если используешь sass, иначе убери
        ]
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          warnings: false,
        }
      }
    })],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
  ]
};
