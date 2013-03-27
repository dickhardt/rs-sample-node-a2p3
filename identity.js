/*
* Key, secret, identifier generation functions
*
* Copyright (C) Province of British Columbia, 2013
*/

var crypto = require('crypto')
 , b64url = require('./b64url')
 , config = require('./config')

// generates a  directed id
exports.createDI = function () {
    return (b64url.encode(crypto.randomBytes( config.crypto.bytesDI )))
}

function makeKey () {
  var result = {}
  result.key = b64url.safe( crypto.randomBytes( config.crypto.bytesKey ).toString('base64') )
  result.kid = b64url.safe( crypto.randomBytes( config.crypto.bytesKid ).toString('base64') )
  return result
}
exports.makeKey = makeKey

exports.makeKeyObj = function () {
  var kk = makeKey()
  var result = {latest: kk}
  result[kk.kid] = kk.key
  return result
}

exports.makeSecret = function () {
  return b64url.safe( crypto.randomBytes( config.crypto.bytesSecret ).toString('base64') )
}

exports.makeHandle = function () {
  return b64url.safe( crypto.randomBytes( config.crypto.bytesHandle ).toString('base64') )
}