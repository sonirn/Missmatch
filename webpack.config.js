const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const Dotenv = require('dotenv-webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';
  const isProduction = mode === 'production';
  
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isProduction ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
      chunkFilename: isProduction ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js',
      publicPath: '/',
      assetModuleFilename: 'static/media/[name].[hash][ext]'
    },
    mode,
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      hot: true,
      historyApiFallback: true,
      port: 3000,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          pathRewrite: { '^/api': '' },
          changeOrigin: true,
        },
      },
    },
    module: {
      rules: [
        // JavaScript
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                ['@babel/preset-react', { runtime: 'automatic' }]
              ],
              plugins: [
                '@babel/plugin-transform-runtime',
                isProduction && 'transform-remove-console'
              ].filter(Boolean)
            }
          }
        },
        // CSS
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        // Sass/SCSS
        {
          test: /\.(sass|scss)$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
            'sass-loader'
          ]
        },
        // Images
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 10 * 1024 // 10kb
            }
          }
        },
        // Fonts
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource'
        },
        // Game assets - special handling for the dinosaur game
        {
          test: /\.(mp3|wav|ogg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/game/sounds/[name][ext]'
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@contexts': path.resolve(__dirname, 'src/contexts'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@config': path.resolve(__dirname, 'src/config'),
        '@game': path.resolve(__dirname, 'src/game-integration')
      }
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico',
        inject: true,
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY),
        'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN),
        'process.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID),
        'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET),
        'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID),
        'process.env.FIREBASE_APP_ID': JSON.stringify(process.env.FIREBASE_APP_ID),
        'process.env.USDT_BEP20_ADDRESS': JSON.stringify(process.env.USDT_BEP20_ADDRESS)
      }),
      new Dotenv({
        path: `.env.${mode}`,
        systemvars: true
      }),
      isProduction && new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css'
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '',
            globOptions: {
              ignore: ['**/index.html', '**/favicon.ico']
            }
          },
          // Ensure game files are copied correctly
          {
            from: 'public/game',
            to: 'game',
            noErrorOnMissing: true
          }
        ]
      }),
      // Only include bundle analyzer in production builds when analysis is needed
      process.env.ANALYZE && isProduction && new BundleAnalyzerPlugin()
    ].filter(Boolean),
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: isProduction
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
          extractComments: false
        })
      ],
      splitChunks: {
        chunks: 'all',
        name: false,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          },
          firebase: {
            test: /[\\/]node_modules[\\/](firebase|@firebase)/,
            name: 'firebase',
            chunks: 'all',
            priority: 10
          },
          mui: {
            test: /[\\/]node_modules[\\/](@mui|@emotion)/,
            name: 'mui',
            chunks: 'all',
            priority: 10
          }
        }
      },
      runtimeChunk: {
        name: entrypoint => `runtime-${entrypoint.name}`
      }
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 512000, // 500kb
      maxEntrypointSize: 512000
    }
  };
};
