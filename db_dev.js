/*
* Development Database layer
*
* NOTE: databse is just a memory object, goes away on restart
*
* Copyright (C) Province of British Columbia, 2013
*/

var underscore = require('underscore')
  , identity = require('./identity')
  , jwt = require('./jwt')


// we only keep our database alive until we die
var dummyNoSql = {}

/*
*   Functions to create, get and delete Key Objects
*/

// generate new app keys and add to Vault
function newKeyObj ( id, cb ) {
  var keyObj = identity.makeKeyObj()
  keyChain[reg] = keyChain[reg] || {}
  keyChain[reg][id] = keyObj
  process.nextTick( function () { cb( null, keyObj ) } )
}

function getKeyObj ( id, cb ) {
  var keyObj = null
  if ( keyChain[reg] && keyChain[reg][id] )
    keyObj = keyChain[reg][id]
  process.nextTick( function () { cb( null, keyObj ) } )
}

function deleteKeyObj ( id, cb ) {
  if ( keyChain[reg] && keyChain[reg][id] )
    delete keyChain[reg][id]
  process.nextTick( function () { cb( null ) } )
}


/*
* General App Registration Functions
*/

// called when an admin logs in to link email with DI
exports.registerAdmin = function ( adminEmail, di, cb ) {
  dummyNoSql['admin:' + adminEmail + ':di'] = di
  dummyNoSql['admin:di:' + di] = adminEmail
  process.nextTick( function () { cb( null ) } )
}

exports.listApps = function ( admin, cb ) {
  var apps = dummyNoSql['admin:' + admin + ':apps']
  var result = {}
  if (apps) {
    Object.keys(apps).forEach( function (id) {
      result[id] =
        { name: dummyNoSql['app:' + id + ':name'] }
    })
  }
  process.nextTick( function () { cb( null, result ) } )
}

exports.appDetails = function ( admin, id, cb ) {
  if (!dummyNoSql['admin:' + admin + ':apps'][id]) {
    var e = new Error('Admin is not authorative for '+id)
    e.code = "ACCESS_DENIED"
    process.nextTick( function () { cb( e ) } )
  }
  getKeyObj( id, function ( e, keys ) {
    if (e) return cb( e )
    var result =
      { name: dummyNoSql['app:' + id + ':name']
      , admins: dummyNoSql['app:' + id + ':admins']
      , keys: keys
      }
    process.nextTick( function () { cb( null, result ) } )
  })
}

exports.newApp = function ( id, name, adminEmail, cb ) {
  if ( dummyNoSql['app:' + id + ':name'] ) {
    var err = new Error('"'+ id + '" already registered')
    err.code = 'APP_ID_ALREADY_REGISTERED'
    return process.nextTick( function () { cb( err ) } )
  }
  // add to DB
  dummyNoSql['app:' + id + ':name'] = name
  dummyNoSql['app:' + id + ':admins'] = {}
  dummyNoSql['app:' + id + ':admins'][adminEmail] = 'ACTIVE'
  dummyNoSql['admin:' + adminEmail + ':apps'] = dummyNoSql['admin:' + adminEmail + ':apps'] || {}
  dummyNoSql['admin:' + adminEmail + ':apps'][id] = 'ACTIVE'
  // gen key pair
  newKeyObj( id, function ( e, keyObj ) {
    cb( e, keyObj )
  })
}


exports.deleteApp = function ( id, cb ) {
  delete dummyNoSql['app:' + id + ':name']
  deleteKeyObj( id, function ( e ) {
    var admins = Object.keys( dummyNoSql['app:' + id + ':admins'] )
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
  cb( new Error('UNIMPLEMENTED'))
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

// get all Users in system
exports.getUsers = function ( cb ) {
  cb( new Error('UNIMPLEMENTED'))
}


/*
* OAuth Access Tokens and permissions
*/

// create an OAuth access token

// TBD - update App Table with superset of type of access granted

exports.oauthCreate = function ( details, cb) {
  var accessToken = jwt.handle()
  var appID = details.app
  var keyAccess = 'oauth:' + accessToken
  // NOTE: an App may have multiple Access Tokens, and with different priveleges
  dummyNoSql[keyAccess] = details
  dummyNoSql[keyAccess].created = Date.now()
  dummyNoSql[keyAccess].lastAccess = Date.now()
  var keyDI = 'oauthGrants:' + details.sub
  dummyNoSql[keyDI] = dummyNoSql[keyDI] || {}
  dummyNoSql[keyDI][accessToken] = appID
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
  dummyNoSql[keyAccess].lastAccess = Date.now()
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



