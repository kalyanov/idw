const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const demoPath = 'public';

const tsLoader = {
    loader: 'ts-loader',
    options: {
        transpileOnly: true,
        configFile: 'tsconfig.json',
    },
};

module.exports = function() {
  return {
    mode: 'development',
    entry: {
        index: './src/demo/index.ts',
    },
    output: {
        path: path.resolve(__dirname, demoPath),
        filename: '[name].js',
        libraryTarget: 'umd',
    },
    module: {
        rules: [
            {
                test: /\.(ts|js)$/,
                use: [tsLoader],
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.ts'],
        symlinks: false, // https://webpack.js.org/configuration/resolve/#resolvesymlinks
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: 'src/demo/static',
                    to: '[name][ext]',
                },
            ],
        }),
    ],
    devServer: {
        host: '0.0.0.0',
        contentBase: path.join(__dirname, demoPath),
        compress: false,
        port: 3001,
        writeToDisk: (filePath) => /\.(html|svg|css|json)$/.test(filePath)
    }
  }
};
