/*
* resource.js
*
* Handles resource server requests
*
* Copyright (C) Province of British Columbia, 2013
*/


var marked = require('marked')
  , fs = require('fs')
  , underscore = require('underscore')
  , db = require('./db')
  , config = require('./config.json')


// checks if app has the right scope to make the call
function checkScope( api, scopes ) {
  if ( ( ( api == '/membership/anytime/number' ) &&
      underscore.intersection( ['http://' + config.appID+'/scope/anytime/number'], scopes ) ) ||
       ( ( api == '/membership/anytime/status' ) &&
      underscore.intersection( ['http://' + config.appID+'/scope/anytime/status'], scopes ) ) )
        return null
  return 'Invalid scope(s) for operation.'
}

// checks that caller has an authorized OAuth token
function oauthCheck ( req, res, next ) {
  var accessToken = req.body.access_token
  db.oauthRetrieve( 'si', accessToken, function ( e, details ) {
    if (e) return next( e )
    var scopeError = checkScope( req.path, details.scopes )
    if (scopeError) {
      var err = new Error( scopeError )
      err.code = 'ACCESS_DENIED'
      return next( err )
    }
    req.oauth =
      { sub: details.sub
      }
    return next()
  })
}

// checks if a valid RS Request
function requestCheck ( accessList ) {
  return function ( req, res, next ) {
    return next()
  }
}

// checks if required parameters are passed
function paramCheck ( requiredParams ) {
  return function ( req, res, next ) {
    return next()
  }
}

function validScope ( passedScopes, acceptedScopes ) {
  var valid = underscore.intersection( passedScopes, acceptedScopes )
  if (!valid) console.log('\ninvalid scope\npassed:\t'+passedScopes+'\naccepted:\t'+acceptedScopes)
  return valid
}

/* --- needs to be integrated

// middleware that checks token is valid
// depends on request.check middleware being called prior
exports.checkRS = function ( vault, rs, scopePaths, stdRS ) {
  // build list of acceptable scopes
  if ( scopePaths instanceof String )
    scopePaths = [scopePaths]
  var acceptedScopes = scopePaths && scopePaths.map( function ( scopePath ) {
    return (config.baseUrl[rs] + scopePath)
    })
  if (acceptedScopes && stdRS) {
    var stdAcceptedScopes = scopePaths.map( function ( scopePath ) {
      return (config.baseUrl[stdRS] + scopePath)
    })
    acceptedScopes.push( stdAcceptedScopes )
  }

  return (function checkRS (req, res, next) {
    var jwe, err, token
    if (!req.request['request.a2p3.org'].token) {
      err = new Error("No token in 'request.a2p3.org' payload property")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }  //
    try {
      jwe = new jwt.Parse(req.request['request.a2p3.org'].token)

// console.log('\ngoing to decrypt token\nkid:',jwe.header.kid)

      if ( !jwe.header.kid || !vault[config.host.ix][jwe.header.kid] ) {
        err = new Error("No valid key for "+config.host.ix)
        err.code = 'INVALID_TOKEN'
        return next( err )
      }
      token = jwe.decrypt( vault[config.host.ix][jwe.header.kid] )
    }
    catch (e) {
      e.code = 'INVALID_TOKEN'
      return next( e )
    }
    if ( token.iss != config.host.ix ) {
      err = new Error("RS Token must be signed by "+config.host.ix)
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( token.aud != config.host[rs] ) {
      err = new Error("Wrong token audience. Should be "+config.host[rs])
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( token['token.a2p3.org'].app != req.request.iss ) {
      err = new Error("Token and Request app must match")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( acceptedScopes && !token['token.a2p3.org'].scopes ) {
      err = new Error("No scope provided.")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( acceptedScopes && !validScope( token['token.a2p3.org'].scopes, acceptedScopes ) ) {
      err = new Error("Invalid scope.")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( !token['token.a2p3.org'].auth.passcode || !token['token.a2p3.org'].auth.authorization ) {
      err = new Error("Invalid authorization. Passcode and authorization must be given.")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( jwt.expired( token.iat ) ) {
      err = new Error("The token expired.")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    req.token = token
    next()
  })
}

*/




// checks if a valid RS Token
function tokenCheck ( req, res, next ) {
  return next()
}



//
//  request processing functions
//

exports.membershipStatus = function () {
  return (
    [ requestCheck()
    , tokenCheck
    , function ( req, res, next ) {

    } ] )
}

exports.membershipNumber = function () {
  return (
    [ requestCheck()
    , tokenCheck
    , function ( req, res, next ) {

    } ] )
}

exports.oauth = function () {
  return (
    [ requestCheck()
    , tokenCheck
    , function ( req, res, next ) {

    } ] )
}

exports.membershipAnytimeStatus = function () {
  return (
    [ oauthCheck
    , function ( req, res, next ) {

    } ] )
}

exports.membershipAnytimeNumber = function () {
  return (
    [ oauthCheck
    , function ( req, res, next ) {

    } ] )
}

exports.AuthorizationsList = function () {
  return (
    [ requestCheck( ['registrar.a2p3.net'] )
    , tokenCheck
    , function ( req, res, next ) {

    } ] )
}

exports.AuthorizationsDelete = function () {
  return (
    [ requestCheck( ['registrar.a2p3.net'] )
    , tokenCheck
    , function ( req, res, next ) {

    } ] )
}


exports.documentation = function ( req, res ) {
  // create HTML from API.md
  var options = {}
  var markdown = fs.readFileSync( __dirname + '/API.md', 'utf8' )
  var tokens = marked.lexer( markdown, options )
  var html = marked.parser( tokens, options )
  // add in github flavoured markdown CSS so it looks like it does on github.com
  // also add in link to root at top TBD: modify to fit into rest of theme
  html  = '<!DOCTYPE html><head><link rel="stylesheet" href="/css/github.css"></head><body>'
        + '<p><a  alt="Home" href="/">Home</a></p>'
        + html
        + '</body></html>'
  res.send( html )
}

//setup scope output
var rawResources = require('./scopes.json')
var resources = {}
Object.keys( rawResources ).forEach( function ( r ) {
  resources[r] = {}
  Object.keys( rawResources[r] ).forEach( function ( language ) {
    resources[r][language] = rawResources[r][language].replace( '%host', config.appID )
  })
})

exports.scopes = function ( req, res, next ) {
  if (req.path === '/scopes')  // special case to get all scopes
    return res.send( resources )
  if (!resources[req.path]) {
    var e = new Error( 'Uknown scope "'+ req.path +'"' )
    e.code = 'UNKNOWN_SCOPE'
    return next( e )
  }
  return res.send( resources[req.path] )
}