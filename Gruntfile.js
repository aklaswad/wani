module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'],
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
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('test',['jshint']);
  grunt.registerTask('default', ['jshint','concat', 'uglify']);
};
