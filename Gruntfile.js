/*jshint node: true */

"use strict";

module.exports = function (grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		// Project metadata, used by the <banner> directive.
		meta: {
			banner: "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - " +
					"<%= grunt.template.today('yyyy-mm-dd') %>\n" +
					"<%= pkg.homepage ? '* ' + pkg.homepage + '\\n' : '' %>" +
					"* Copyright (c) <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>;" +
					" Licensed <%= _.pluck(pkg.licenses, 'type').join(', ') %> */"
		},
		exec: {
			tabfix: {
				// Cleanup whitespace according to http://contribute.jquery.org/style-guide/js/
				// (requires https://github.com/mar10/tabfix)
				cmd: "tabfix -t -r -m*.js,*.css,*.html,*.json -inode_modules src demo test"
			},
			upload: {
				// FTP upload the demo files (requires https://github.com/mar10/pyftpsync)
				cmd: "pyftpsync --progress upload . ftp://www.wwwendt.de/tech/fancytree --delete-unmatched --omit dist,node_modules,.*,_*  -x"
			}
		},
		qunit: {
			all: ["test/unit/test-core.html"]
		},
		jshint: {
			options: {
				// Linting according to http://contribute.jquery.org/style-guide/js/
				jshintrc: ".jshintrc"
			},
			beforeconcat: [
				"Gruntfile.js",
				"src/*.js",
				"demo/3rd-party/**/jquery.fancytree.*.js",
				"test/unit/*.js"
			],
			afterconcat: ["<%= concat.core.dest %>",
						  "<%= concat.all.dest %>"
						  ]
		},
		concat: {
			options: {
				stripBanners: true
			},
			core: {
				src: ["<banner:meta.banner>",
					  "src/<%= pkg.name %>.js"
					  ],
				dest: "dist/<%= pkg.name %>-<%= pkg.version %>.js"
			},
			all: {
				options: {
					stripBanners: true
				},
				src: ["<%= meta.banner %>",
					  "src/<%= pkg.name %>.js",
					  "src/jquery.fancytree.columnview.js",
					  "src/jquery.fancytree.dnd.js",
					  "src/jquery.fancytree.filter.js",
					  "src/jquery.fancytree.menu.js",
					  "src/jquery.fancytree.persist.js",
					  "src/jquery.fancytree.table.js",
					  "src/jquery.fancytree.themeroller.js",
					  "src/jquery.fancytree.tracecalls.js"
					  ],
				dest: "dist/<%= pkg.name %>-<%= pkg.version %>-all.js"
			}
		},
		uglify: {
			core: {
				options: {
//					banner: "/*! <%= pkg.name %> v<%= pkg.version %> | <%= pkg.license %> */\\n"
					banner: "<%= meta.banner %>"
				},
				files: {
					"dist/<%= pkg.name %>.min.js": ["<%= concat.core.dest %>"]
				}
			},
			all: {
				options: {
					banner: "<%= meta.banner %>"
				},
				files: {
					"dist/<%= pkg.name %>-all.min.js": ["<%= concat.all.dest %>"]
				}
			}
		}
	});

	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-qunit");
	grunt.loadNpmTasks("grunt-exec");

	grunt.registerTask("ci", ["jshint", "qunit"]);
	grunt.registerTask("default", ["jshint:beforeconcat",
								   "concat",
								   "jshint:afterconcat",
								   "uglify"]);
	grunt.registerTask("build", ["exec:tabfix",
								 "default",
								 "qunit"]);
	grunt.registerTask("upload", ["build",
								  "exec:upload"]);
};
