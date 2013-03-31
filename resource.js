  /*
* resource.js
*
* Handles resource server requests
*
* Copyright (C) Province of British Columbia, 2013
*/


var fs = require('fs')
  , marked = require('marked')
  , underscore = require('underscore')
  , a2p3 = require('a2p3')
  , db = require('./db')
  , config = require('./config.json')
  , vault = require('./vault.json')

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
function makeOauthCheck( scopes ) {
  return function oauthCheck ( req, res, next ) {
    var accessToken = req.body.access_token
    db.oauthRetrieve( accessToken, function ( e, details ) {
      if (e) return next( e )
      var scopeError = checkScope( req.path, scopes )
      if (scopeError) {
        var err = new Error( scopeError )
        err.code = 'ACCESS_DENIED'
        return next( err )
      }
      req.directedIdentity = details.sub
      return next()
    })
  }
}

// checks if a valid RS Request
function requestCheck ( accessList ) {
  return function ( req, res, next ) {
    var jws, err
    if (!req.body || !req.body.request) {
      err = new Error('No "request" parameter in POST')
      err.code = 'INVALID_API_CALL'
      next( err )
      return undefined
    }
    try {
      jws = new a2p3.Parse( req.body.request )
      if (!jws.payload.iss) throw new Error('No "iss" in JWS payload')
      if (!jws.header.kid) throw new Error('No "kid" in JWS header')
      if (!jws.payload['request.a2p3.org']) throw new Error('No "request.a2p3.org" in JWS payload')
      // valid request, let's check access and signature
      if ( accessList ) {

debugger;

        if ( !accessList[jws.payload.iss] ) {
          err = new Error('Access not allowed')
          err.code = 'ACCESS_DENIED'
          return next( err )
        }
      }
      if ( jws.payload.aud != config.appID ) {
        err = new Error("Request 'aud' does not match "+config.appID)
        err.code = 'ACCESS_DENIED'
        return next( err )
      }
      db.getAppKey( jws.payload.iss, vault, function ( e, key ) {
        if (e) {
          e.code = 'INTERNAL_ERROR'
          return next( err )
        }
        if (!key) {
          err = new Error('No key available for '+ jws.payload.iss)
          err.code = 'ACCESS_DENIED'
          return next( err )
        }
        if (!key[jws.header.kid]) {

console.error('\nrequest.check jws\n',jws)
console.error('key:\n',key)

          err = new Error('Invalid KID '+ jws.header.kid)
          err.code = 'ACCESS_DENIED'
          return next( err )
        }
        if ( !jws.verify( key[jws.header.kid] ) ) {
           err = new Error('Invalid JWS signature')
          err.code = 'INVALID_REQUEST'
          return next( err )
        } else {
          req.request = jws.payload
          return next()
        }
      })
    }
    catch (e) {
      e.code = 'INVALID_REQUEST'
      return next( e )
    }
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
  if (!valid) console.error('\ninvalid scope\npassed:\t'+passedScopes+'\naccepted:\t'+acceptedScopes)
  return valid
}


function makeCheckToken ( acceptedScopes ) {
  return (function checkToken (req, res, next) {
    var jwe, err, token
    if (!req.request['request.a2p3.org'].token) {
      err = new Error("No token in 'request.a2p3.org' payload property")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }  //
    try {
      jwe = new a2p3.Parse(req.request['request.a2p3.org'].token)
      if ( !jwe.header.kid || !vault['ix.a2p3.net'][jwe.header.kid] ) {
        err = new Error('No valid key for ix.a2p3.net')
        err.code = 'INVALID_TOKEN'
        return next( err )
      }
      token = jwe.decrypt( vault['ix.a2p3.net'][jwe.header.kid] )
    }
    catch (e) {
      e.code = 'INVALID_TOKEN'
      return next( e )
    }
    if ( token.iss != 'ix.a2p3.net' ) {
      err = new Error('RS Token must be signed by ix.a2p3.net')
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( token.aud != config.appID ) {
      err = new Error("Wrong token audience. Should be "+config.appID)
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
    if ( a2p3.expired( token.iat ) ) {
      err = new Error("The token expired.")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    if ( !token.sub ) {
      err = new Error("No subject provided.")
      err.code = 'INVALID_TOKEN'
      return next( err )
    }
    req.directedIdentity = token.sub
    req.token = token
    next()
  })
}


function _makeDeleteAuthNRequest ( di, app ) {
  // impersonate Registrar calling us
  var tokenPayload =
    { 'iss': 'ix.a2p3.net'
    , 'aud': config.appID
    , 'sub': di
    , 'token.a2p3.org':
      { 'app': 'registrar.a2p3.net'
      , 'auth': { passcode: true, authorization: true }
      }
    }
  var rsToken = a2p3.createToken( tokenPayload, vault['ix.a2p3.net'].latest )
  var requestDetails =
    { 'iss': 'registrar.a2p3.net'
    , 'aud': config.appID
    , 'request.a2p3.org': { 'app': app, 'token': rsToken }
    }
  var rsRequest = a2p3.createRequest( requestDetails, vault['registrar.a2p3.net'].latest )
  return rsRequest
}

// list all authorizations provided by user
function listAuthN ( req, res, next ) {
  var di = req.token.sub
  db.oauthList( di, function ( e, results ) {
    if (e) return next( e )
    if (!results) return res.send( { result: {} } )
    var response = results
    // make an RS Request for each App to delete it later
    Object.keys(results).forEach( function ( app ) {
      response[app].request = _makeDeleteAuthNRequest( di, app )
    })
    res.send( { result: response } )
  })
}

// delete all authorizations to an app for the user
function deleteAuthN ( req, res, next ) {
  db.oauthDelete( req.token.sub, req.request['request.a2p3.org'].app, function ( e ) {
    if (e) return next( e )
    return res.send( { result: { success: true } } )
  })
}

//
//  request processing functions
//

function getStatus ( req, res, next ) {
  var di = req.directedIdentity
  if (!di) return next( new Error ('No DI found') )
  db.getProfile( di, function ( e, profile ) {
    if (e) return next(e)
    return res.send( { result: { status: profile.status } } )
  })
}

function getNumber ( req, res, next ) {
  var di = req.directedIdentity
  if (!di) return next( new Error ('No DI found') )
  db.getProfile( di, function ( e, profile ) {
    if (e) return next(e)
    return res.send( { result: { number: profile.number } } )
  })
}


exports.membershipStatus = function () {
  return (
    [ requestCheck()
    , makeCheckToken([ 'http://' + config.appID+'/scope/status'] )
    , getStatus
    ] )
}

exports.membershipNumber = function () {
  return (
    [ requestCheck()
    , makeCheckToken([ 'http://' + config.appID+'/scope/number'] )
    , getNumber
    ] )
}

exports.oauth = function () {
  return (
    [ requestCheck()
    , makeCheckToken(
      [ 'http://' + config.appID+'/scope//anytime/status'
      , 'http://' + config.appID+'/scope//anytime/number'
      ] )
    , function ( req, res, next ) {
        var details =
          { scopes: req.token['token.a2p3.org'].scopes
          , app: req.token['token.a2p3.org'].app
          , sub: req.token.sub
          }
        db.oauthCreate( details, function ( e, accessToken ) {
          if (e) next (e)
          res.send( {result: { access_token: accessToken } } )
        })
      }
    ] )
}

exports.membershipAnytimeStatus = function () {
  return (
    [ makeOauthCheck( ['http://' + config.appID+'/scope/anytime/status'] )
    , getStatus
    ] )
}

exports.membershipAnytimeNumber = function () {
  return (
    [ makeOauthCheck( ['http://' + config.appID+'/scope/anytime/number'] )
    , getNumber
    ] )
}

exports.AuthorizationsList = function () {
  return (
    [ requestCheck( {'registrar.a2p3.net': true} )
    , makeCheckToken()
    , listAuthN
    ] )
}

exports.AuthorizationDelete = function () {
  return (
    [ requestCheck( {'registrar.a2p3.net': true} )
    , makeCheckToken()
    , deleteAuthN
    ] )
}


exports.documentation = function ( req, res ) {
  // create HTML from API.md
  var options = {}
  var markdown = fs.readFileSync( __dirname + '/API.md', 'utf8' )

  // TBD replace host with current host

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