
'use strict';

var listFileType = require('../ls.js');

listFileType('/', function(err, files){
  if(err) return console.log(err);
  console.log(JSON.stringify(files));
});

setTimeout(function(){
  console.log('time out!');
}, 5000);
