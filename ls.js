
'use strict';

var mockfs = require('mockfs/js/mockfs');

module.exports = ls;

var DIRECTORY = 'directory';
var FILE = 'file';
var UNKNOWN = 'unknown';
var ERROR = 'error';

var TIMEOUT = 500;

/*
  path: path to list
  done: callback function with two arguments: [err] and [files] (function(err, files){ ... }).
        [files] is an object representing the tree structure of the [path] param. When [path]
        is invalid or system error encountered when  listing the [path], [err] will be set. Note
        that the function will ignore error from child files or directories.

  example of [files]:
    {
      "a": "file",
      "b": {
        "aa": "file",
        "bb": "error: Filesystem error",
        "cc": "file"
      }
    }
*/
function ls(path, done){
  recursiveList(path, function(pathMapFiles){
    var rootError = pathMapFiles[path];
    if(!(rootError instanceof Array)) return done(rootError);

    var root = path;
    var result = {};
    for(var p in pathMapFiles){
      var files = pathMapFiles[p];
      var entry = getOrCreateEntry(result, root, p);
      files.forEach(function(file){
        entry[file.name] = file.err || file.type;
      });
    }
    done(null, result);
  });
}

/*
  get or create entry based on path.

  Example:
    var rootEntry = {};
    getOrCreateEntry(rootEntry, '/a/b', '/a/b/c/d');
    console.log(rootEntry); //=> { 'c': { 'd': {} } }
*/

function getOrCreateEntry(rootEntry, root, path){
  if(root === path) return rootEntry;

  path = path.replace(root, '');

  var dirs = path.split('/');
  var entry = rootEntry;
  dirs.forEach(function(dir){
    entry[dir] = entry[dir] || {};
    entry = entry[dir];
  });
  return entry;
}

/*
  path:
  done: callback function(pathMapFiles)

  example of [pathMapFiles]:
  { '/':
     [ { name: 'e', type: 'file', path: '/e', err: null },
       { name: 'a', type: 'file', path: '/a', err: null },
       { name: 'g', type: 'file', path: '/g', err: null },
       { name: 'c', type: 'file', path: '/c', err: null } ],
    '/d': [],
    '/b':
     [ { name: 'aa', type: 'file', path: '/b/aa', err: null },
       { name: 'bb',
         type: 'error',
         path: '/b/bb',
         err: 'Filesystem error' },
       { name: 'cc', type: 'file', path: '/b/cc', err: null } ],
    '/d/dd': [],
    '/f':
     [ { name: 'ee', type: 'unknown', path: '/f/ee', err: null },
       { name: 'ff', type: 'error', path: '/f/ff', err: 'stat timeout' } ],
    '/f/gg': [],
    '/f/gg/hhh': [ { name: 'iiii', type: 'file', path: '/f/gg/hhh/iiii', err: null } ] }
*/
function recursiveList(path, done, sharedInfo){
  sharedInfo = sharedInfo || {pathMapFiles: {}, waitCount: 0};

  sharedInfo.waitCount++;
  list(path, function(err, files){
    if(err){
      sharedInfo.pathMapFiles[path] = err;
    }else{
      sharedInfo.pathMapFiles[path] = [];
      files.forEach(function(file){
        if(file.type === DIRECTORY){
          recursiveList(file.path, done, sharedInfo);
        }else{
          sharedInfo.pathMapFiles[path].push(file);
        }
      });
    }

    sharedInfo.waitCount--;
    if(sharedInfo.waitCount === 0){
      done(sharedInfo.pathMapFiles);
    }
  });
}

// done: callback function(err, files)
function list(path, done){
  mockfs.list(path, timeout(TIMEOUT, 'mockfs.list: timeout - '+path, function(err, fileNames){
    if(err) return done(err, []);
    if(fileNames.length === 0) return done(null, []);

    var files = [];
    fileNames.forEach(function(fileName){
      var filePath = mockfs.join(path, fileName);
      mockfs.stat(filePath, timeout(TIMEOUT, 'mockfs.stat: timeout - '+filePath, function(err, fileStat){
        var file = {name: fileName, type: UNKNOWN, path: filePath, err: err};

        if(file.err){
          file.type = ERROR;
        }else if (fileStat.isDirectory()) {
          file.type = DIRECTORY;
        } else if (fileStat.isFile()) {
          file.type = FILE;
        }

        files.push(file);
        if(files.length === fileNames.length){
          done(null, files);
        }
      }));
    });
  }));
}


// timeout decorator
function timeout(waitTime, errMsg, callback){
  var expired = false;
  var timerId = setTimeout(function(){
    expired = true;
    callback(errMsg);
  }, waitTime);

  return function(){
    if(expired) return;
    clearTimeout(timerId);
    callback.apply(null, arguments);
  };
}
