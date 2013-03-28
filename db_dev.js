/*
* Development Database layer
*
* NOTE: databse is just a memory object, goes away on restart
*
* Copyright (C) Province of British Columbia, 2013
*/

var underscore = require('underscore')
  , identity = require('./identity')


// for development, we only keep our database alive until we die
var dummyNoSql = {}
var keyChain = {}

/*
*   Functions to create, get and delete Key Objects
*/

// generate new app keys and add to Vault
function newKeyObj ( id, cb ) {
  var keyObj = identity.makeKeyObj()
  keyChain[id] = keyObj
  process.nextTick( function () { cb( null, keyObj ) } )
}

function getKeyObj ( id, cb ) {
  var keyObj = keyChain[id]
  process.nextTick( function () { cb( null, keyObj ) } )
}

function deleteKeyObj ( id, cb ) {
  if ( keyChain[id] )
    delete keyChain[id]
  process.nextTick( function () { cb( null ) } )
}


/*
* General App Registration Functions
*/


// *** will not need this with new API
// called when an admin logs in to link email with DI
exports.registerAdmin = function ( adminEmail, di, cb ) {
  dummyNoSql['admin:' + adminEmail + ':di'] = di
  dummyNoSql['admin:di:' + di] = adminEmail
  process.nextTick( function () { cb( null ) } )
}

exports.listApps = function ( admin, cb ) {

// call Registrar to get list

  var apps = dummyNoSql['admin:' + admin + ':apps']
  process.nextTick( function () { cb( null, apps ) } )
}

exports.appDetails = function ( admin, id, cb ) {
  if (!dummyNoSql['admin:' + admin + ':apps'][id]) {
    var e = new Error('Admin is not authorative for '+id)
    e.code = "ACCESS_DENIED"
    process.nextTick( function () { cb( e ) } )
  }
  getKeyObj( id, function ( e, keys ) {
    if (e) return cb( e )
    var result = dummyNoSql['app:' + id]
    result.admins = dummyNoSql['appAdmins:' + id] // *** call Registrar to get list
    result.keys = keys
    process.nextTick( function () { cb( null, result ) } )
  })
}

exports.newApp = function ( id, name, adminEmail, cb ) {
  if ( dummyNoSql['app:' + id] ) {
    var err = new Error('"'+ id + '" already registered')
    err.code = 'APP_ID_ALREADY_REGISTERED'
    return process.nextTick( function () { cb( err ) } )
  }
  // add to DB
  dummyNoSql['app:' + id] =
    { name: name
    , adminCreated: adminEmail
    , created: Date.now().toString()
    , lastAccess: 'never accessed'
    , anytimeNumber: false
    , anytimeStatus: false
    }

  // these all go away with the new API
  dummyNoSql['appAdmins:' + id] = {}
  dummyNoSql['appAdmins:' + id][adminEmail] = 'ACTIVE'
  dummyNoSql['admin:' + adminEmail + ':apps'] = dummyNoSql['admin:' + adminEmail + ':apps'] || {}
  dummyNoSql['admin:' + adminEmail + ':apps'][id] = name
  // gen key pair
  newKeyObj( id, function ( e, keyObj ) {
    cb( e, keyObj )
  })
}


exports.deleteApp = function ( id, cb ) {
  delete dummyNoSql['app:' + id]
  deleteKeyObj( id, function ( e ) {

// these steps are not needed with new Registrar API

    var admins = Object.keys( dummyNoSql['appAdmins:' + id] )
    admins.forEach( function (admin) {
      delete dummyNoSql['admin:' + admin + ':apps'][id]
    })
    process.nextTick( function () { cb( null ) } )
  })
}

exports.refreshAppKey = function ( id, cb ) {
  newKeyObj( id, function ( e, keyObj ) {
    cb( e, keyObj )
  })
}

exports.getAppKey = function ( id, vaultKeys, cb ) {
  getKeyObj( id, function ( e, key) {
    if (!key) key = vaultKeys[id]
    if (!key) cb( new Error('No key found for "'+id+'"') )
    cb( null, key )
  })
}

// get all Apps in system
exports.getApps = function ( cb ) {
  var results = []
  Object.keys( dummyNoSql ).forEach( function ( key ) {
    if ( key.search(/^app:/) === 0) {
      var row = []
      row.push( dummyNoSql[key].name )
      var id = key.replace('app:','')
      row.push( id )
      row.push( dummyNoSql[key].adminCreated )
      row.push( dummyNoSql[key].created )
      row.push( dummyNoSql[key].lastAccess )
      var anytime = ''
      if (dummyNoSql[key].anytimeNumber) anytime = 'number '
      if (dummyNoSql[key].anytimeStatus) anytime += 'status'
      if (anytime === '') anytime = 'none'
      row.push( anytime )
      results.push( row )
    }
  })
  process.nextTick( function () { cb( null, results ) } )
}


/*
* Profile DB Functions
*/
exports.updateProfile = function ( di, profile, cb ) {
  var key = 'user:' + di
  dummyNoSql[key] = dummyNoSql[key] || {}
  Object.keys( profile ).forEach( function (item) {
    dummyNoSql[key][item] = profile[item]
  })
  process.nextTick( function () { cb( null ) } )
}

exports.getProfile = function ( di, cb ) {
  var key = 'user:' + di
  if (!dummyNoSql[key]) {
    var e = new Error('unknown user')
    e.code = "UNKNOWN_USER"
    process.nextTick( function () { cb( e, null ) } )
  } else {
    process.nextTick( function () { cb( null, dummyNoSql[key] ) } )
  }
}

exports.deleteProfile = function ( di, cb ) {
  var key = 'user:' + di
    , e = null
  if (dummyNoSql[key]) {
    delete dummyNoSql[key]
  } else {
    e = new Error('unknown user')
    e.code = "UNKNOWN_USER"
  }
  process.nextTick( function () { cb( e ) } )
}

// get all Users in system, return a set of rows
exports.getUsers = function ( cb ) {
  var results = []
  Object.keys( dummyNoSql ).forEach( function ( key ) {
    if ( key.search(/^user/) === 0) {
      var di = key.replace('user:','')
      var row = []
      row.push( di )
      row.push( dummyNoSql[key].photo )
      row.push( dummyNoSql[key].name )
      row.push( dummyNoSql[key].email )
      row.push( dummyNoSql[key].dob )
      row.push( dummyNoSql[key].number )
      row.push( dummyNoSql[key].status )
      results.push( row )
    }
  })
  process.nextTick( function () { cb( null, results ) } )
}


/*
* OAuth Access Tokens and permissions
*/

// create an OAuth access token

// TBD - update App Table with superset of type of access granted

exports.oauthCreate = function ( details, cb) {
  var accessToken = identity.handle()
  var appID = details.app
  var keyAccess = 'oauth:' + accessToken
  // NOTE: an App may have multiple Access Tokens, and with different priveleges
  dummyNoSql[keyAccess] = details
  dummyNoSql[keyAccess].created = Date.now()
  dummyNoSql[keyAccess].lastAccess = Date.now()
  var keyDI = 'oauthGrants:' + details.sub
  dummyNoSql[keyDI] = dummyNoSql[keyDI] || {}
  dummyNoSql[keyDI][accessToken] = appID

  // flip appropriate flag for scopes(s) requested
  if ( details.scopes.indexOf('http://law.a2p3.net/scope/anytime/number') != -1 )
    dummyNoSql['app:' + appID].anytimeNumber = true
  if ( details.scopes.indexOf('http://law.a2p3.net/scope/anytime/status') != -1 )
    dummyNoSql['app:' + appID].anytimeStatus = true

  process.nextTick( function () { cb( null, accessToken ) } )
}

// retrieve an OAuth access token, reset last access

// TBD - update App table with access as well

exports.oauthRetrieve = function ( accessToken, cb ) {
  var keyAccess = 'oauth:' + accessToken
  if ( !dummyNoSql[keyAccess] ) {
    var e = new Error('Invalid Access Token:'+accessToken)
    e.code = "INVALID_ACCESS_TOKEN"
    return process.nextTick( function() { cb( e ) } )
  }
  // we want to send current state of details so that
  // we know last time was accessed
  var details = JSON.parse( JSON.stringify( dummyNoSql[keyAccess] ) ) // clone object
  dummyNoSql['app:' + details.app].lastAccess = dummyNoSql[keyAccess].lastAccess = Date.now()
  process.nextTick( function () { cb( null, details ) } )
}

// list which apps have been granted OAuth access tokens
exports.oauthList = function ( di, cb ) {
  var keyDI = 'oauthGrants:' + di
  var grants = dummyNoSql[keyDI]
  if (!grants) return process.nextTick( function () { cb( null ) } )
  var results = {}
  Object.keys( grants ).forEach( function ( accessToken ) {
    var keyAccess = 'oauth:' + accessToken
    var details = dummyNoSql[keyAccess]
    var appID = details.app
    results[appID] = results[appID] || {}
    var lastAccess = results[appID].lastAccess || details.lastAccess
    if (lastAccess <= details.lastAccess) results[appID].lastAccess = details.lastAccess
    results[appID].name = dummyNoSql['app:' + appID + ':name']
    results[appID].resources = results[appID].resources || []
    results[appID].resources = underscore.union( results[appID].resources, details.scopes )
  })
  process.nextTick( function () { cb( null, results ) } )
}

// delete all OAuth access tokens granted to an app
exports.oauthDelete = function ( di, appID, cb ) {
  var keyDI = 'oauthGrants:' + di
  var grants = dummyNoSql[keyDI]
  Object.keys( grants ).forEach( function ( accessToken ) {
    if ( grants[accessToken] == appID ) {
      var keyAccess = 'oauth:' + accessToken
      delete dummyNoSql[keyAccess]
      delete dummyNoSql[keyDI][accessToken]
    }
  })
  process.nextTick( function () { cb( null ) } )
}



