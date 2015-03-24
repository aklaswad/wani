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
        src: ['lib/Wani.js', 'lib/Web.js'],
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
      src: ['**/*', '../WANI.min.js']
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-gh-pages');

  grunt.registerTask('before-publish', 'jobs before publish', function() {
    grunt.file.copy('./lib/Wani.js', './sample/Wani.js');
    grunt.file.copy('./lib/Web.js', './sample/Web.js');
  });
  grunt.registerTask('after-publish', 'jobs after publish', function() {
    grunt.file.delete('./sample/Wani.js');
    grunt.file.delete('./sample/Web.js');
  });
  grunt.registerTask('before-release', 'jobs before release', function() {
    grunt.file.delete('./WANI.js');
  });

  grunt.registerTask('test',['jshint']);
  grunt.registerTask('default', []);
  grunt.registerTask('publish', ['jshint','before-publish', 'gh-pages', 'after-publish']);
  grunt.registerTask('release', ['jshint', 'concat', 'uglify', 'before-release']);
};
