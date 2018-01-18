module.exports = {
	//devtool: 'inline-source-map',
	entry: './src/ezdb.ts',
	output: {
		path: __dirname + '/build',
		filename: 'ezdb.js'
	},
	resolve: {
		extensions: ['.ts']
	},
	module: {
		rules: [
			{ test: /\.ts$/, loader: 'ts-loader' }
		]
	}
}
