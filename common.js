/*
* common.js
*
* common routines acroos admin.js, developer.js and lawyer.js
*
* Copyright (C) Province of British Columbia, 2013
*/


var fs = require('fs')
  , a2p3 = require('a2p3')

var HOST_URL = null

if (process.env.DOTCLOUD_WWW_HTTP_URL) {
  // looks like we are running on DotCloud, adjust our world
//  var HOST_URL = 'https://' + process.env.DOTCLOUD_WWW_HTTP_HOST
// temp hack while DotCloud is fixing their certs
  var HOST_URL = 'http://' + process.env.DOTCLOUD_WWW_HTTP_HOST
}

// returnURL and callbackURL are constructed from the host that we are loaded from
// unless we already know the host
function makeHostUrl  (req) {
  if (HOST_URL) return HOST_URL
  HOST_URL = req.headers.origin // HACK, but reliable across platforms for what we want
  if (!HOST_URL) HOST_URL = 'http://' + req.headers.host  // if we are being called from a script, origin is not set so assume 'http'
  return HOST_URL               // as first call inherently needs to be a login
}

// HTML for meta refresh and Agent Install Page
// we could read this in once, but reading it in each
// time makes it easy to edit and reload for development
var META_REFRESH_HTML_FILE = __dirname + '/html/meta_refresh.html'

// calculate this once
exports.QR_SESSION_LENGTH = a2p3.random16bytes().length

//
// ***** WARNING: DOES NOT SCALE AS CODED ********
//
// Global for holding QR sessions, need to put in DB if running mulitple instances
// checkForTokenRequest and storeTokenRequest are coded with callbacks so that
// they can easily be implemented to store data in a DB
var sessions = {}

// checks if we are have received the IX Token and Agent Request from the Agent
function checkForTokenRequest ( qrSession, callback ) {
  if ( !sessions[ qrSession ] || !sessions[ qrSession ].ixToken ) return callback( null, null )
  var data = JSON.parse( JSON.stringify( sessions[ qrSession ] ) )
  delete sessions[ qrSession ]
  callback( data )
}

// stores IX Token and Agent Request we received back channel from the Agent
function storeTokenRequest ( qrSession, agentRequest, ixToken, notificationURL, callback ) {
  sessions[ qrSession ] = sessions[ qrSession ] || {} // we might have a remember property stored
  sessions[ qrSession ].ixToken = ixToken
  sessions[ qrSession ].agentRequest = agentRequest
  sessions[ qrSession ].notificationURL = notificationURL
  callback( null )
}

// personal agent links and store images
var STORES =
  { iOS:
    { url: "https://itunes.apple.com/us/app/personal-agent/id615429770?mt=8&uo=4"
    , image: "/images/Download_on_the_App_Store_Badge_US-UK_135x40.png"
    }
  , windowsPhone:
    { url: "http://www.windowsphone.com/en-ca/store/app/personalagent/cb6a6cab-f905-4387-818e-17e838189146"
    , image: "/images/Windows_Phone_Store_154x40.png"
    }
}

// metaRedirectInfoPage() returns a meta-refresh page with the supplied URL
function metaRedirectInfoPage ( redirectURL, userAgent ) {
  var html = fs.readFileSync( META_REFRESH_HTML_FILE, 'utf8' )
  html = html.replace( '$REDIRECT_URL', redirectURL )
  var mobilePlatform = 'iOS'  // default
  if (userAgent.indexOf("Windows Phone 8") > -1)
    mobilePlatform = 'windowsPhone'
  html = html.replace( '$STORE_URL', STORES[mobilePlatform].url)
  html = html.replace( '$STORE_IMAGE', STORES[mobilePlatform].image)
  return html
}

exports.makeHostUrl = makeHostUrl
exports.checkForTokenRequest = checkForTokenRequest
exports.storeTokenRequest = storeTokenRequest
exports.metaRedirectInfoPage = metaRedirectInfoPage

