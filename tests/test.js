
'use strict';

var list = require('../ls.js');

var timeout = setTimeout(function(){
  console.log('Failed: time out!');
}, 5000);

list('/', function(err, files){
  clearTimeout(timeout);

  if(err) return console.log(err);

  console.log(JSON.stringify(files));
});


