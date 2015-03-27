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
  'tuna.js': '/tuna.js',
  'tunawani.js': '/tunawani.js',
  'site.js': '/site.js',
  'style.css': '/style.css',

  'impulses/Sweetspot1M.wav': '/impulses/Sweetspot1M.wav',
  'impulses/impulse_rev.wav': '/impulses/impulse_rev.wav',
  'impulses/impulse_guitar.wav': '/impulses/impulse_guitar.wav',
  'impulses/ir_rev_short.wav': '/impulses/ir_rev_short.wav'

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
