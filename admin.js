/*
* admin.js
*
* Handles requests when user is an administrator for the site (determined by who is registered at the Registrar)
*
* Copyright (C) Province of British Columbia, 2013
*/


var a2p3 = require('a2p3')
  , common = require('./common')
  // make sure you have created a config.json and vault.json per a2p3 documentation
  , config = require('./config.json')
  , vault = require('./vault.json')

var RESOURCES = [ 'http://registrar.a2p3.net/scope/verify' ]


function checkAdmin ( agentRequest, ixToken, callback ) {
  var resource = new a2p3.Resource( config, vault )
  resource.exchange( agentRequest, ixToken, function ( error, di ) { // no use for DI as an Admin
    if ( error ) return callback ( error )
    resource.call( 'http://registrar.a2p3.net/app/verify', { id: 'law.a2p3.net' }, function ( error, result ) {
      if ( error ) return callback( error )
      if ( !result ) return callback( new Error('Unknown error') )
      callback( null, true )
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
  var qrCodeURL = common.makeHostUrl( req ) + '/admin/QR/' + qrSession
  res.send( { result: { qrURL: qrCodeURL, qrSession: qrSession } } )
}

// loginDirect -- loaded when web app thinks it is running on a mobile device that
// can support the agent
// we send a meta-refresh so that we show a info page in case there is no agent to
// handle the a2p3.net: protcol scheme
exports.loginDirect = function ( req, res ) {
  var params =
    { returnURL: common.makeHostUrl( req ) + '/admin/response/redirect'
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
    { callbackURL: common.makeHostUrl( req ) + '/admin/response/callback'
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
  checkAdmin( agentRequest, ixToken, function ( error, result ) {
    if ( error || !result ) return res.redirect( '/error' )
    req.session.admin = true
    return res.redirect('/admin')
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
    checkAdmin( tokenResponse.agentRequest, tokenResponse.ixToken, function ( error, result ) {
      if ( error ) return next( error )
      if (!result) return next( new Error('Unkown error') )
      req.session.admin = true
      return res.send( { status: 'success'} )
    })
  })
}

var dummyMemberships =
  [ [ 'https://fbcdn-profile-a.akamaihd.net/hprofile-ak-snc6/273625_504347313_41825903_q.jpg', 'Giacomo Guilizzoni', 'Giacomo@example.com', 'Jan 01 1960', '0123456700', 'PRACTISING' ]
  , [ 'https://fbcdn-profile-a.akamaihd.net/hprofile-ak-snc6/273625_504347313_41825903_q.jpg', 'Marco Botton', 'Marco@example.com', 'Jan 01 1960', '0123456711', 'NON-PRACTISING' ]
  , [ 'https://fbcdn-profile-a.akamaihd.net/hprofile-ak-snc6/273625_504347313_41825903_q.jpg', 'Mariah Maclachlan', 'Mariah@example.com', 'Jan 01 1960', '0123456799', 'RETIRED' ]
  , [ 'https://fbcdn-profile-a.akamaihd.net/hprofile-ak-snc6/273625_504347313_41825903_q.jpg', 'Valerie Liberty', 'Valerie@example.com', 'Jan 01 1960', '0123456722', 'PRACTISING' ]
  , [ 'https://fbcdn-profile-a.akamaihd.net/hprofile-ak-snc6/273625_504347313_41825903_q.jpg', 'Guido Jack Guilizzoni', 'Guido@example.com', 'Jan 01 1960', '0123456777', 'NON-PRACTISING' ]
  ]

var dummyApplications =
  [ [ 'Sample1 App', 'sample.example.com', 'fred@example.com', 'Jan 05 2013', 'two days ago', 'none' ]
  , [ 'Sample2 App', 'sample.example.com', 'fred@example.com', 'Jan 04 2013', 'two days ago', 'status' ]
  , [ 'Sample3 App', 'sample.example.com', 'fred@example.com', 'Jan 23 2013', 'two days ago', 'number' ]
  , [ 'Sample4 App', 'sample.example.com', 'fred@example.com', 'Jan 15 2013', 'two days ago', 'status, number' ]
  , [ 'Sample5 App', 'sample.example.com', 'fred@example.com', 'Jan 04 2013', 'two days ago', 'status, number' ]
  , [ 'Sample6 App', 'sample.example.com', 'fred@example.com', 'Jan 01 2013', 'two days ago', 'none' ]
  ]

exports.memberships = function  ( req, res ) {
  res.send( { result: dummyMemberships } )
}

exports.membershipStatus = function  ( req, res ) {

}

exports.applications = function  ( req, res ) {
  res.send( { result: dummyApplications } )
}

/*
// ******************************************************
// check that we have implemented all functions!!!!
//

app.post('/admin/login/QR', admin.loginQR )
app.post('/admin/check/QR', admin.checkQR )
app.get('/admin/QR/:qrSession', admin.qrCode )

app.get('/admin/login/direct', admin.loginDirect )
app.get('/admin/response/redirect', admin.loginResponseRedirect )

app.post('/admin/response/callback', admin.loginResponseCallback )

app.post('/admin/membership', admin.membership )
app.post('/admin/membershipStatus', admin.membershipStatus )
app.post('/admin/applications', admin.applications )
*/
