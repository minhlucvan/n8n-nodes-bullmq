const path = require('path');
const { task, src, dest } = require('gulp');

task('clean', clean);

function clean() {
	const fs = require('fs');

	const distPath = path.resolve('dist');
	if (!fs.existsSync(distPath)) {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		fs.rmdir(distPath, { recursive: true }, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

task('build:icons', copyIcons);

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource).pipe(dest(credDestination));
}
