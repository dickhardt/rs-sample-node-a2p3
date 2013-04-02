/*
* preinstall.js - preinstall code for node-a2p3
*
* Copyright (C) Province of British Columbia, 2013
*/

var fs = require('fs')
  , util = require('util')
  , crypto = require('crypto')

var CONFIG_FILE = process.cwd() + '/config.json'

function randomString () {
  return crypto.randomBytes( 8 ).toString( 'hex' )
}

if ( fs.existsSync( CONFIG_FILE ) ) {
  console.log('Using existing config.json')
} else {
  console.log( 'Creating config.json\nRemember to edit the config.json file and enter a unique hostname\n and insert your CLI "device" and "token" values.' )
  var data = fs.readFileSync( __dirname + '/default.config.json' ).toString()
  fs.writeFileSync( CONFIG_FILE, data )
}