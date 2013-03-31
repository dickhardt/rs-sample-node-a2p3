/*
* server.js
*
* Resource Server Sample
*
* See README.md for details
*
* Copyright (C) Province of British Columbia, 2013
*/


var express = require('express')
  , app = express()
  , developer = require('./developer')
  , lawyer = require('./lawyer')
  , admin = require('./admin')
  , resource = require('./resource')

var LISTEN_PORT = 8080  // change if you want listen on a different port

if (process.env.DOTCLOUD_WWW_HTTP_URL) {
  // looks like we are running on DotCloud, adjust our world
  LISTEN_PORT = 8080
} else if (process.env.PORT) {
  // HACK! looks like we might be running on Azure
  LISTEN_PORT = process.env.PORT
  //  var AZURE = true
}


// clear session, logout user
function logout ( req, res )  {
  req.session = null
  res.redirect('/')
}

// send a static file
function sendfile ( file ) {
  return function( req, res ) { res.sendfile( __dirname + file ) }
}

// error handler -- gets called if a request processor calls next( Error )
function errorHandler ( error, req, res, next ) {
  if (!error.code) {
    error.code = "UNKNOWN"
    console.error(error.stack)
    res.send({'error':{'code': error.code, 'message': error.message, 'stack': error.stack}})
  } else {
    console.error(error.stack)
    res.send({'error':{'code': error.code, 'message': error.message}})
  }
}

//
// set up middleware
//

app.use( express.static( __dirname + '/html/assets' ) )   // put static assets here
app.use( express.logger( 'dev' ) )                        // so that we only log page requests
app.use( express.limit('10kb') )                          // protect against large POST attack
app.use( express.bodyParser() )

app.use( express.cookieParser('a secret string') )
var cookieOptions =
  { 'secret': 'helloworldsecret'
  , 'cookie': { path: '/' } }
app.use( express.cookieSession( cookieOptions ))

//
// setup request routes
//

// these end points are all AJAX calls from the web app and return a JSON response
app.post('/lawyer/login/QR', lawyer.loginQR )
app.post('/lawyer/profile', lawyer.profile )
app.post('/lawyer/agree/tos', lawyer.agreeTOS )
app.post('/lawyer/status', lawyer.status )
app.post('/lawyer/check/QR', lawyer.checkQR )

app.post('/developer/login/QR', developer.loginQR )
app.post('/developer/check/QR', developer.checkQR )
app.post('/developer/login/check', developer.loginCheck )

app.post('/admin/login/QR', admin.loginQR )
app.post('/admin/check/QR', admin.checkQR )


// these pages are called by either the Agent or a QR Code reader
// returns either the Agent Request in JSON if called by Agent
// or sends a redirect to the a2p3.net://token URL
// also called by the Agent via the notification URL mechanism
app.get('/lawyer/QR/:qrSession', lawyer.qrCode )
app.get('/developer/QR/:qrSession', developer.qrCode )
app.get('/admin/QR/:qrSession', admin.qrCode )

//
// these pages all return a redirect
//
app.get('/logout', logout)

// called if App and Agent are on same device
app.get('/lawyer/login/direct', lawyer.loginDirect )
app.get('/lawyer/response/redirect', lawyer.loginResponseRedirect )
app.get('/lawyer/account/delete', lawyer.accountDelete )

app.get('/developer/login/direct', developer.loginDirect )
app.get('/developer/response/redirect', developer.loginResponseRedirect )

app.get('/admin/login/direct', admin.loginDirect )
app.get('/admin/response/redirect', admin.loginResponseRedirect )

// called if App and Agent are on different devices
app.post('/lawyer/response/callback', lawyer.loginResponseCallback )
app.post('/developer/response/callback', developer.loginResponseCallback )
app.post('/admin/response/callback', admin.loginResponseCallback )



//
// these endpoints serve static HTML pages
//
app.get('/',                sendfile( '/html/index.html' ) )
app.get('/error',           sendfile( '/html/error.html' ) )
app.get('/agent/install',   sendfile( '/html/agent_install.html' ) )

app.get('/lawyer',          sendfile( '/html/lawyer.html' )  )
app.get('/dashboard',       sendfile( '/html/developer.html' )  ) // URL used in scripts that register apps
app.get('/developer',       sendfile( '/html/developer.html' )  )
app.get('/admin',           sendfile( '/html/admin.html' )  )

//
//  Resource Server API end points
//

// Standard App Registration end points so that Sample App can register with CLI
app.get('/login',                   developer.loginDirect )
app.post('/dashboard/new/app',      developer.newApp )
app.post('/dashboard/app/details',  developer.appDetails )
app.post('/dashboard/list/apps',    developer.listApps )
app.post('/dashboard/delete/app',   developer.deleteApp )
app.post('/dashboard/refresh/key',  developer.refreshKey )
app.post('/dashboard/getkey',       developer.getKey )
// same end poionts, but mapped for /developer
app.post('/developer/new/app',      developer.newApp )
app.post('/developer/app/details',  developer.appDetails )
app.post('/developer/list/apps',    developer.listApps )
app.post('/developer/delete/app',   developer.deleteApp )
app.post('/developer/refresh/key',  developer.refreshKey )
app.post('/developer/getkey',       developer.getKey )


// admin APIs
app.post('/admin/memberships', admin.memberships )
app.post('/admin/membership/status', admin.membershipStatus )
app.post('/admin/applications', admin.applications )


// resource APIs
app.post('/membership/status', resource.membershipStatus() )
app.post('/membership/number', resource.membershipNumber() )
app.post('/membership/anytime/status', resource.membershipAnytimeStatus() )
app.post('/membership/anytime/number', resource.membershipAnytimeNumber() )

app.post('/oauth', resource.oauth() )

app.post('/authorizations/list', resource.AuthorizationsList() )
app.post('/authorization/delete', resource.AuthorizationDelete() )

app.get('/documentation', resource.documentation )
app.get(/\/scope[\w\/]*/, resource.scopes )

app.use( errorHandler )

app.listen( LISTEN_PORT )

console.log('\nSample RS available on this machine on port:', LISTEN_PORT )

// console.log('\nprocess.env dump\n',process.env)
