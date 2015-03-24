#!/usr/bin/env node
"use strict";
var http = require('http'),
  fs = require('fs');

var documents = {
  'wani.js': '/../lib/wani.js',
  'web.js': '/../lib/web.js',
  'index.html': '/index.html',
  'TriOscillator.js': '/TriOscillator.js',
  'SimpleTremolo.js': '/SimpleTremolo.js',
  'SimpleAutoWah.js': '/SimpleAutoWah.js',
  'SimpleOverDrive.js': '/SimpleOverDrive.js',
  'site.js': '/site.js',
  'style.css': '/style.css'
};

var filename, path;
for ( filename in documents ) {
  path = documents[filename];
  documents[filename] = fs.readFileSync(__dirname + path, {encoding: 'utf-8'});
}

var httpserver = http.createServer(function(request, response) {
  var path = request.url.replace(/^\//,''),
    content,
    type;
  if ( path === '' ) path = 'index.html';
  content = documents[path];
  if ( content ) {
    type = path.match(/\.js$/) ? 'text/javascript' :
           path.match(/\.css$/) ? 'text/css' : 'text/html';
    response.writeHead(200, {"Content-Type": type});
    response.write(content);
  }
  else {
    response.writeHead(404);
    response.write("Not found");
  }
  response.end();
});
httpserver.listen(8080);
