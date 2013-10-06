/*
* lawyer.js
*
* Handles requests when user is a lawyer ( User of the system, subject of Resource Server )
*
* Copyright (C) Province of British Columbia, 2013
*/

var a2p3 = require('a2p3')
  , common = require('./common')
  , db = require('./db')
  // make sure you have created a config.json and vault.json per a2p3 documentation
  , config = require('./config.json')
  , vault = require('./vault.json')

var RESOURCES =
    [ 'http://email.a2p3.net/scope/default'
    , 'http://people.a2p3.net/scope/details'
    ]

var APIS =
  { 'http://email.a2p3.net/email/default': null
  , 'http://people.a2p3.net/details': null
  }

function fetchProfile( agentRequest, ixToken, callback ) {
  var resource = new a2p3.Resource( config, vault )
  resource.exchange( agentRequest, ixToken, function ( error, di ) {
    if ( error ) return callback ( error )
    db.getProfile( di, function ( e, profile ) {
      if (!e && profile)
        return callback( null, profile )
      // error likely is user not found, so let's go get their profile
      // in a real system, we likely would get the user's profile anyway and update
      // our records with any changes
      resource.callMultiple( APIS, function ( error, results ) {
        var profile
        if (results) {
          if (results['http://people.a2p3.net/details'] && results['http://people.a2p3.net/details'].redirects &&
              results[ results['http://people.a2p3.net/details'].redirects ]) {
            profile = results[ results['http://people.a2p3.net/details'].redirects ]
          } else return callback( new Error('No people.a2p3.net data'), null )
          if ( results['http://email.a2p3.net/email/default'] && results['http://email.a2p3.net/email/default'].email )
            profile.email = results['http://email.a2p3.net/email/default'].email
          profile.di = di
          return callback( null, profile )
        }
        callback( error, null )
      })
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
  var qrCodeURL = common.makeHostUrl( req ) + '/lawyer/QR/' + qrSession
  res.send( { result: { qrURL: qrCodeURL, qrSession: qrSession } } )
}

// loginDirect -- loaded when web app thinks it is running on a mobile device that
// can support the agent
// we send a meta-refresh so that we show a info page in case there is no agent to
// handle the a2p3.net: protcol scheme
exports.loginDirect = function ( req, res ) {

// debugger;

  var params =
    { returnURL: common.makeHostUrl( req ) + '/lawyer/response/redirect'
    , resources: RESOURCES
    }
    , agentRequest = a2p3.createAgentRequest( config, vault, params )
    , redirectURL = 'a2p3.net://token?request=' + agentRequest
  if (req.query && req.query.json) {  // client wants JSON,
    return res.send( { result: {'request': redirectURL } } )
  } else {
    var html = common.metaRedirectInfoPage( redirectURL, req.headers['user-agent'] )
    return res.send( html )
  }
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
    { callbackURL: common.makeHostUrl( req ) + '/lawyer/response/callback'
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
  fetchProfile( agentRequest, ixToken, function ( error, profile ) {
    if ( error ) return res.redirect( '/error' )
    req.session.profile = profile
    return res.redirect('/lawyer')
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
    fetchProfile( tokenResponse.agentRequest, tokenResponse.ixToken, function ( error, profile ) {
      if ( error ) return next( error )
      req.session.profile = profile
      return res.send( { status: 'success'} )
    })
  })
}



exports.profile = function ( req, res )  {
  if ( req.session.profile ) {
    return res.send( { result: req.session.profile } )
  } else { //
    return res.send( { errror: 'NOT_LOGGED_IN'} )
  }
}

// returns appropriate redirect
exports.accountDelete = function ( req, res, next )  {
  var di = req.session.profile.di
  req.session = null  // blow out session regardless
  if (!di) return next( new Error('No DI in session profile') )
  db.deleteProfile( di, function ( e ) {
    if (e) return res.redirect('/error')
    res.redirect('/')
  })
}

// update user status in DB
exports.status = function ( req, res, next )  {
  var di = req.session.profile && req.session.profile.di
  if (!di) return next( new Error('No DI in session profile') )
  var status = req.body.status
  if (!status) return next( new Error('No status passed in') )
  if ( status != 'PRACTISING' && status != 'NON-PRACTISING' && status != 'RETIRED' )
      return next( new Error('Invalid status') )
  db.updateProfile( di, { status: status }, function ( e ) {
    if (e) return next( e )
    req.session.profile.status = status
    res.send( { result: { success: true } } )
  })
}

// save user to DB
exports.agreeTOS = function ( req, res, next )  {
  var di = req.session.profile && req.session.profile.di
  if (!di) return next( new Error('No DI in session profile') )
  var number = req.body.number
  if (!number) return next( new Error('No number passed in') )
  req.session.profile.number = number
  req.session.profile.status = 'PRACTISING'
  db.updateProfile( di, req.session.profile, function ( e ) {
    if (e) return next( e )
    res.send( { result: { success: true } } )
  })
}
