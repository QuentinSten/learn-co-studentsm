// Externally compiled coffescript-file:
//    http://coffeescript.org/

/*jshint node: true, unused:false */

"use strict";
module.exports = function(grunt) {
  var _this = this;
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    meta: {
      banner: "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - " + "<%= grunt.template.today('yyyy-mm-dd') %>\n" + "<%= pkg.homepage ? '* ' + pkg.homepage + '\\n' : '' %>" + "* Copyright (c) <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>;" + " Licensed <%= _.pluck(pkg.licenses, 'type').join(', ') %> */"
    },
    bumpup: {
      options: {
        dateformat: "YYYY-MM-DD HH:mm",
        normalize: true
      },
      files: ["package.json", "bower.json", "fancytree.jquery.json"]
    },
    clean: {
      build: {
        noWrite: true,
        src: ["build"]
      }
    },
    compress: {
      build: {
        options: {
          archive: "dist/<%= pkg.name %>-<%= pkg.version %>.zip"
        },
        files: [
          {
            expand: true,
            cwd: "build/",
            src: ["**/*"],
            dest: ""
          }
        ]
      }
    },
    concat: {
      core: {
        options: {
          stripBanners: true
        },
        src: ["<banner:meta.banner>", "src/<%= pkg.name %>.js"],
        dest: "build/<%= pkg.name %>.js"
      },
      all: {
        options: {
          stripBanners: true
        },
        src: ["<%= meta.banner %>", "src/jquery.fancytree.js", "src/jquery.fancytree.columnview.js", "src/jquery.fancytree.dnd.js", "src/jquery.fancytree.filter.js", "src/jquery.fancytree.menu.js", "src/jquery.fancytree.persist.js", "src/jquery.fancytree.table.js", "src/jquery.fancytree.themeroller.js"],
        dest: "build/<%= pkg.name %>-all.js"
      }
    },
    connect: {
      demo: {
        options: {
          port: 8080,
          base: "./",
          keepalive: true
        }
      }
    },
    copy: {
      build: {
        files: [
          {
            expand: true,
            cwd: "src/",
            src: ["skin-**/*", "*.txt"],
            dest: "build/"
          }, {
            src: ["*.txt", "*.md"],
            dest: "build/"
          }
        ]
      }
    },
    csslint: {
      strict: {
        options: {
          "import": 2
        },
        src: ["src/**/*.css"]
      }
    },
    cssmin: {
      build: {
        report: true,
        minify: {
          expand: true,
          cwd: "src/skin-win8/",
          src: ["*.css", "!*.min.css"],
          dest: "build/",
          ext: ".min.css"
        }
      }
    },
    docco: {
      docs: {
        src: ["src/jquery.fancytree.childcounter.js"],
        options: {
          output: "doc/annotated-src"
        }
      }
    },
    exec: {
      tabfix: {
        cmd: "tabfix -t -r -m*.js,*.css,*.html,*.json -inode_modules src demo test"
      },
      upload: {
        cmd: "pyftpsync --progress upload . ftp://www.wwwendt.de/tech/fancytree --delete-unmatched --omit build,node_modules,.*,_*  -x"
      }
    },
    htmllint: {
      all: ["demo/**/*.html", "doc/**/*.html", "test/**/*.html"]
    },
    jsdoc: {
      build: {
        src: ["src/*.js", "doc/README.md"],
        options: {
          destination: "doc/jsdoc_grunt",
          verbose: true
        }
      }
    },
    jshint: {
      options: {
        jshintrc: ".jshintrc"
      },
      beforeconcat: ["Gruntfile.js", "src/*.js", "3rd-party/**/jquery.fancytree.*.js", "test/unit/*.js"]
    },
    afterconcat: ["<%= concat.core.dest %>", "<%= concat.all.dest %>"],
    less: {
      development: {
        options: {
          compress: false,
          yuicompress: false
        },
        files: [
          {
            expand: true,
            cwd: "src/",
            src: "**/ui-fancytree.less",
            dest: "src/",
            ext: ".css"
          }
        ]
      }
    },
    qunit: {
      build: ["test/unit/test-core-build.html"],
      develop: ["test/unit/test-core.html"]
    },
    replace: {
      build: {
        src: ["build/*.js"],
        overwrite: true,
        replacements: [
          {
            from: /version:\s*\"[0-9\.\-]+\"/,
            to: "version: \"<%= pkg.version %>\""
          }, {
            from: /@version\s*DEVELOPMENT/,
            to: "@version <%= pkg.version %>"
          }, {
            from: /@date\s*DEVELOPMENT/,
            to: "@date <%= grunt.template.today('yyyy-mm-dd\"T\"HH:MM') %>"
          }, {
            from: /buildType:\s*\"[a-zA-Z]+\"/,
            to: "buildType: \"release\""
          }, {
            from: /debugLevel:\s*[0-9]/,
            to: "debugLevel: 1"
          }
        ]
      }
    },
    tagrelease: {
      file: "package.json",
      commit: true,
      message: "Tagging the %version% release.",
      prefix: "v",
      annotate: true
    },
    watch: {
      files: "src/**/*.less",
      tasks: ["less:development"]
    }
  });
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-csslint");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-qunit");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-bumpup");
  grunt.loadNpmTasks("grunt-docco2");
  grunt.loadNpmTasks("grunt-exec");
  grunt.loadNpmTasks("grunt-html");
  grunt.loadNpmTasks("grunt-jsdoc");
  grunt.loadNpmTasks("grunt-tagrelease");
  grunt.loadNpmTasks("grunt-text-replace");
  grunt.registerTask("updatePkg", function() {
    return grunt.config.set("pkg", grunt.file.readJSON("package.json"));
  });
  grunt.registerTask("server", ["connect:demo"]);
  grunt.registerTask("test", ["jshint:beforeconcat", "qunit:develop"]);
  grunt.registerTask("travis", ["test"]);
  grunt.registerTask("default", ["test"]);
  grunt.registerTask("bump", ["bumpup:build", "updatePkg"]);
  grunt.registerTask("build", ["exec:tabfix", "test", "clean:build", "copy:build", "concat", "replace:build", "jshint:afterconcat", "uglify", "qunit:build", "compress:build", "tagrelease"]);
  return grunt.registerTask("upload", ["build", "exec:upload"]);
};