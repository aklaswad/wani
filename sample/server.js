#!/usr/bin/env node
"use strict";
var http = require('http')
  , fs = require('fs')
  ;
var documents = {
  'Waml.js': '/../lib/Waml.js',
  'index.html': '/index.html',
  'TriOscillator.js': '/TriOscillator.js'
};

var filename, path;
for ( filename in documents ) {
  path = documents[filename];
  documents[filename] = fs.readFileSync(__dirname + path, {encoding: 'utf-8'});
}

var httpserver = http.createServer(function(request, response) {
  var path = request.url.replace(/^\//,'')
    , content, type;
  if ( path === '' ) path = 'index.html';
  if ( content = documents[path] ) {
    type = path.match(/\.js$/) ? 'text/javascript' : 'text/html';
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
