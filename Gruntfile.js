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
        src: ['lib/wani.js', 'lib/web.js'],
        dest: './<%= pkg.name %>.js'
      }
    },
    uglify: {
      dist: {
        files: {
          './<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      },
    },
    'gh-pages': {
      options: {
        base: 'sample'
      },
      src: ['**/*', '../wani.min.js']
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-gh-pages');

  grunt.registerTask('before-publish', 'jobs before publish', function() {
    grunt.file.copy('./lib/wani.js', './sample/wani.js');
    grunt.file.copy('./lib/web.js', './sample/web.js');
  });
  grunt.registerTask('after-publish', 'jobs after publish', function() {
    grunt.file.delete('./sample/wani.js');
    grunt.file.delete('./sample/web.js');
  });
  grunt.registerTask('before-release', 'jobs before release', function() {
    grunt.file.delete('./WANI.js');
  });

  grunt.registerTask('test',['jshint']);
  grunt.registerTask('default', []);
  grunt.registerTask('publish', ['before-publish', 'gh-pages', 'after-publish']);
  grunt.registerTask('release', ['jshint', 'concat', 'uglify', 'before-release']);
};
