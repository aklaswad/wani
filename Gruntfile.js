module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js', 'sample/*.js'],
    },
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['lib/**/*.js'],
        dest: './<%= pkg.name %>.js'
      }
    },
    uglify: {
      dist: {
        files: {
          './<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      },
      publish: {
        files: {
          'sample/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    'gh-pages': {
      options: {
        base: 'sample'
      },
      src: ['**/*', '../WAML.min.js']
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-gh-pages');

  grunt.registerTask('before-publish', 'jobs before publish', function() {
    grunt.file.copy('./lib/Waml.js', './sample/Waml.js');
    grunt.file.copy('./lib/Web.js', './sample/Web.js');
  });
  grunt.registerTask('after-publish', 'jobs after publish', function() {
    grunt.file.delete('./sample/Waml.js');
    grunt.file.delete('./sample/Web.js');
  });
  grunt.registerTask('test',['jshint']);
  grunt.registerTask('default', ['jshint','concat', 'uglify']);
  grunt.registerTask('publish', ['jshint','concat', 'uglify:publish', 'before-publish', 'gh-pages', 'after-publish']);
};
