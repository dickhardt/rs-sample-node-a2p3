/*
* developer.js
*
* Handles requests when user is a developer
*
* Copyright (C) Province of British Columbia, 2013
*/


var a2p3 = require('a2p3')
  , common = require('./common')
  // make sure you have created a config.json and vault.json per a2p3 documentation
  , config = require('./config.json')
  , vault = require('./vault.json')

var RESOURCES =
    [ 'http://email.a2p3.net/scope/default'
    , 'http://registrar.a2p3.net/scope/verify'
    ]

function fetchEmail ( agentRequest, ixToken, callback ) {
  var resource = new a2p3.Resource( config, vault )
  resource.exchange( agentRequest, ixToken, function ( error, di ) {  // no use for DI as developer
    if ( error ) return callback ( error )
    resource.call( 'http://email.a2p3.net/email/default', function ( error, result ) {
      if ( error ) return callback( error )
      if ( !result || !result.email ) return callback( new Error('Unknown error') )
      callback( null, result.email )
    })
  })
}

/*
*   request handlers
*/

// loginQR() - called by web app when it wants a QR code link
// creates an agentRequest and state
exports.loginQR = function ( req, res )  {
  var qrSession = a2p3.random16bytes()
  req.session.qrSession = qrSession
  var qrCodeURL = common.makeHostUrl( req ) + '/developer/QR/' + qrSession
  res.send( { result: { qrURL: qrCodeURL, qrSession: qrSession } } )
}

// loginDirect -- loaded when web app thinks it is running on a mobile device that
// can support the agent
// we send a meta-refresh so that we show a info page in case there is no agent to
// handle the a2p3.net: protcol scheme
exports.loginDirect = function ( req, res ) {
  var params =
    { returnURL: common.makeHostUrl( req ) + '/developer/response/redirect'
    , resources: RESOURCES
    }
    , agentRequest = a2p3.createAgentRequest( config, vault, params )
    , redirectURL = 'a2p3.net://token?request=' + agentRequest
    , html = common.metaRedirectInfoPage( redirectURL )
  res.send( html )
}



// QR Code was scanned
// if scanned by Agent, then 'json=true' has been set and we return the Agent Request in JSON
// if scanned by a general QR reader, then return a meta refresh page with Agent Reqeuest and
// and state parameter of qrSession so we can link the response from the Agent
// back to this web app session in checkQR
exports.qrCode = function ( req, res ) {
  var qrSession = req.params.qrSession
  // make sure we got something that looks like a qrSession
  if ( !qrSession || qrSession.length != common.QR_SESSION_LENGTH || qrSession.match(/[^\w-]/g) ) {
    return res.redirect('/error')
  }
  var params =
    { callbackURL: common.makeHostUrl( req ) + '/developer/response/callback'
    , resources: RESOURCES
    }
  var agentRequest = a2p3.createAgentRequest( config, vault, params )
  var json = req.query.json
  if ( json ) {
    var response = { result: { agentRequest: agentRequest, state: qrSession } }
    return res.send( response )
  } else {
    var redirectURL = 'a2p3://token?request=' + agentRequest + '&state=' + qrSession
    var html =  common.metaRedirectInfoPage( redirectURL )
    return res.send( html )
    }

}

/*
* We are getting called back through the redirect which means we are running on the
* same device as the Agent is
*/
exports.loginResponseRedirect = function ( req, res )  {
  var ixToken = req.query.token
  var agentRequest = req.query.request

  if (!ixToken || !agentRequest) {
    return res.redirect( '/error' )
  }
  fetchEmail( agentRequest, ixToken, function ( error, email ) {
    if ( error ) res.redirect( '/error' )
    req.session.email = email
    return res.redirect('/developer')
  })
}


/*
* Agent is calling us back with the IX Token and Agent Request, but
* Agent is running on a different device
*/
exports.loginResponseCallback = function ( req, res )  {
  var ixToken = req.body.token
  var agentRequest = req.body.request
  var qrSession = req.body.state
  var notificationURL = req.body.notificationURL
  if (!ixToken || !agentRequest || !qrSession) {
    var code = 'MISSING_STATE'
    if (!agentRequest) code = 'MISSING_REQUEST'
    if (!ixToken) code = 'MISSING_TOKEN'
    return res.send( { error: { code: code, message: 'token, request and state are required' } } )
  }
  common.storeTokenRequest( qrSession, agentRequest, ixToken, notificationURL, function ( error ) {
    if ( error ) return res.send( { error: error } )
    return res.send( { result: { success: true } } )
  })
}

/*
* web app is checking to see if the results from the Agent have been received
*/
exports.checkQR = function ( req, res, next ) {
  if (!req.body.qrSession)
    return res.send( { error: 'No QR Session provided' } )
  common.checkForTokenRequest( req.body.qrSession, function ( tokenResponse ) {
    if (!tokenResponse) {
      return res.send( { status: 'waiting'} )
    }
    fetchEmail( tokenResponse.agentRequest, tokenResponse.ixToken, function ( error, email ) {
      if ( error ) return next( error )
      req.session.email = email
      return res.send( { status: 'success'} )
    })
  })
}

exports.loginCheck = function ( req, res, next ) {
  // NEEDS TO DO SOMETHING STILL
  res.send( { result: { expiresIn: 5*60, user: 'joe@example.com' } } )
}

exports.newApp = function ( req, res, next ) {

}

exports.appDetails = function ( req, res, next ) {

}

exports.listApps = function ( req, res, next ) {

}

exports.deleteApp = function ( req, res, next ) {

}

exports.refreshKey = function ( req, res, next ) {

}

exports.getkey = function ( req, res, next ) {

}
