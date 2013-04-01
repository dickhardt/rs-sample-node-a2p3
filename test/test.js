/*
* test.js - tests for RS Sample
*
* Copyright (C) Province of British Columbia, 2013
*/
// Mocha globals to expect
/*global describe:true, it:true */


var should = require('chai').should()
  , util = require('util')
  , urlParse = require('url').parse
  , a2p3 = require('a2p3')
  , fetch = a2p3.fetch

// config.json MUST have a device from registering a CLI agent at Setup
var config = require('../config.json')

// edit this to be an App ID that you have registered at the Registrar
var TEST_APP_ID = 'foo.bar'

//  hold the keys for TEST_APP_ID during test
var vault = {}

// test configuration

var HOST_PORT = 80  // change to 80 if testing against DotCloud or Azure
  , SETUP_URL = 'http://setup.a2p3.net'
  , NUMBER = '123-456'

var HOST_URL = 'http://' + config.appID

if (HOST_PORT != 80)
  HOST_URL += ':' + HOST_PORT


//  holding directed identifier of user at app
var di = null

debugger;

/*
*   Lawyer tests
*   login, accept TOS, get profile page, check membership number and status,
*   change status to non-practising, check status, logout
*/

console.log('testing against '+HOST_URL)

describe('Testing /lawyer ', function () {
  var agentRequest = null
    , ixToken = null
    , jws = null

  describe('/lawyer/login/direct', function () {
    it('should return an Agent Request', function ( done ) {
      var options =
        { url: HOST_URL + '/lawyer/login/direct'
        , qs: { json: true }
        , method: 'GET'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.have.property('result')
        r.result.should.have.property('request')
        var agentUrl = r.result.request
        var u = urlParse( agentUrl, true )
        // save values for later
        agentRequest = u.query.request
        jws = new a2p3.Parse( agentRequest )
        should.exist( jws )
        done( null )
      })
    })
  })

  describe('-> Setup /token', function () {
    it('should return an IX Token', function (done) {
      var options =
        { url: SETUP_URL + '/token'
        , method: 'POST'
        , json:
          { device: config.device
          , sar: jws.signature
          , auth:
            { passcode: true
            , authorization: true
            }
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('token')
        // save code for next step
        ixToken = json.result.token
        done( null )
      })
    })
  })

  describe( ' return URL', function () {
    it('should redirect to /lawyer', function ( done ) {
      var options =
        { url: jws.payload['request.a2p3.org'].returnURL
        , method: 'GET'
        , qs: { token: ixToken, request: agentRequest }
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/lawyer')
        done( null )
      })
    })
  })

  describe(' /lawyer ', function () {
    it('should return status code of 200 and HTML', function (done) {
      var options =
        { url: HOST_URL + '/lawyer'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        should.exist( body )
        response.statusCode.should.equal( 200 )
        done( null )
      })
    })
  })

  describe(' /lawyer/profile', function () {
    it('should return profile data for user, but no number or status', function (done) {
      var options =
        { url: HOST_URL + '/lawyer/profile'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.not.have.property('number')
        r.result.should.not.have.property('status')
        r.result.should.have.property('di')
        // save for later
        di = r.result.di

    console.log('\n DI:'+di+'\n')

        done( null )
      })
    })
  })

  describe(' /lawyer/agree/tos', function () {
    it('should return success=true ', function (done) {
      var options =
        { url: HOST_URL + '/lawyer/agree/tos'
        , json: { number: NUMBER }
        , method: 'POST'
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.not.have.property('error')
        json.should.have.property('result')
        json.result.should.have.property('success', true)
        done( null )
      })
    })
  })

  describe(' /lawyer/profile', function () {
    it('should return profile data for user with number and status', function (done) {
      var options =
        { url: HOST_URL + '/lawyer/profile'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.have.property('number', NUMBER )
        r.result.should.have.property('status', 'PRACTISING')
        done( null )
      })
    })
  })

  describe(' /lawyer/status', function () {
    it('should return success=true ', function (done) {
      var options =
        { url: HOST_URL + '/lawyer/status'
        , json: { status: 'RETIRED' }
        , method: 'POST'
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.not.have.property('error')
        json.should.have.property('result')
        json.result.should.have.property('success', true)
        done( null )
      })
    })
  })

  describe(' /lawyer/profile', function () {
    it('should return profile data for user with number and status', function (done) {
      var options =
        { url: HOST_URL + '/lawyer/profile'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.have.property('number', NUMBER )
        r.result.should.have.property('status', 'RETIRED')
        done( null )
      })
    })
  })

  describe(' /logout', function () {
    it('should return a redirect to /', function (done) {
      var options =
        { url: HOST_URL + '/logout'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/')
        done( null )
      })
    })
  })

})

/*
*   Developer tests
*   login, register testApp (must be one that is already registered)
*   get keys
*   refresh keys, and save for later
*   logout
*   login, check app is listed, logout
*/

describe('Testing /developer ', function () {
  var agentRequest = null
    , ixToken = null
    , jws = null

  describe('/developer/login/direct', function () {
    it('should return an Agent Request', function ( done ) {
      var options =
        { url: HOST_URL + '/developer/login/direct'
        , qs: { json: true }
        , method: 'GET'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.have.property('result')
        r.result.should.have.property('request')
        var agentUrl = r.result.request
        var u = urlParse( agentUrl, true )
        // save values for later
        agentRequest = u.query.request
        jws = new a2p3.Parse( agentRequest )
        should.exist( jws )
        done( null )
      })
    })
  })

  describe('-> Setup /token', function () {
    it('should return an IX Token', function (done) {
      var options =
        { url: SETUP_URL + '/token'
        , method: 'POST'
        , json:
          { device: config.device
          , sar: jws.signature
          , auth:
            { passcode: true
            , authorization: true
            }
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('token')
        // save code for next step
        ixToken = json.result.token
        done( null )
      })
    })
  })

  describe( ' return URL', function () {
    it('should redirect to /developer', function ( done ) {
      var options =
        { url: jws.payload['request.a2p3.org'].returnURL
        , method: 'GET'
        , qs: { token: ixToken, request: agentRequest }
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/developer')
        done( null )
      })
    })
  })

  describe(' /developer ', function () {
    it('should return status code of 200 and HTML', function (done) {
      var options =
        { url: HOST_URL + '/developer'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        should.exist( body )
        response.statusCode.should.equal( 200 )
        done( null )
      })
    })
  })

  describe(' /dashboard/list/apps', function () {
    it('should return empty list of apps', function (done) {
      var options =
        { url: HOST_URL + '/dashboard/list/apps'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.have.property('email')
        r.result.should.not.have.property('list')
        done( null )
      })
    })
  })

  describe('-> /dashboard/new/app', function () {
    it('should return keys', function (done) {
      var options =
        { url: HOST_URL + '/dashboard/new/app'
        , method: 'POST'
        , json: { id: TEST_APP_ID }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('key')
        json.result.key.should.have.property('latest')
        vault[ config.appID ] = json.result.key   // save keys for later
        done( null )
      })
    })
  })

  describe(' /dashboard/list/apps', function () {
    it('should return empty list of apps', function (done) {
      var options =
        { url: HOST_URL + '/dashboard/list/apps'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.have.property('email')
        r.result.should.have.property('list')
        r.result.list.should.have.property( TEST_APP_ID )
        done( null )
      })
    })
  })

  describe('-> /dashboard/app/details', function () {
    it('should return keys', function (done) {
      var options =
        { url: HOST_URL + '/dashboard/app/details'
        , method: 'POST'
        , json: { id: TEST_APP_ID }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )

// console.log('\n /dashboard/app/details\n', json )

        json.should.have.property('result')
        json.result.should.have.property('details')
        done( null )
      })
    })
  })

  describe(' /logout', function () {
    it('should return a redirect to /', function (done) {
      var options =
        { url: HOST_URL + '/logout'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/')
        done( null )
      })
    })
  })

})

/*
*   Admin tests
*   login (account must be admin on Registrar)
*   check user is listed in memberships, change status to practising
*   check app is listed in applications
*   logout
*/


describe('Testing /admin ', function () {
  var agentRequest = null
    , ixToken = null
    , jws = null

  describe('/admin/login/direct', function () {
    it('should return an Agent Request', function ( done ) {
      var options =
        { url: HOST_URL + '/admin/login/direct'
        , qs: { json: true }
        , method: 'GET'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.have.property('result')
        r.result.should.have.property('request')
        var agentUrl = r.result.request
        var u = urlParse( agentUrl, true )
        // save values for later
        agentRequest = u.query.request
        jws = new a2p3.Parse( agentRequest )
        should.exist( jws )
        done( null )
      })
    })
  })

  describe('-> Setup /token', function () {
    it('should return an IX Token', function (done) {
      var options =
        { url: SETUP_URL + '/token'
        , method: 'POST'
        , json:
          { device: config.device
          , sar: jws.signature
          , auth:
            { passcode: true
            , authorization: true
            }
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('token')
        // save code for next step
        ixToken = json.result.token
        done( null )
      })
    })
  })

  describe( ' return URL', function () {
    it('should redirect to /admin', function ( done ) {
      var options =
        { url: jws.payload['request.a2p3.org'].returnURL
        , method: 'GET'
        , qs: { token: ixToken, request: agentRequest }
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/admin')
        done( null )
      })
    })
  })

  describe(' /admin ', function () {
    it('should return status code of 200 and HTML', function (done) {
      var options =
        { url: HOST_URL + '/admin'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        should.exist( body )
        response.statusCode.should.equal( 200 )
        done( null )
      })
    })
  })

  describe('-> /admin/applications', function () {
    it('should return app we registered in first row', function (done) {
      var options =
        { url: HOST_URL + '/admin/applications'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.be.an('array')
        r.result[0][1].should.equal( TEST_APP_ID ) // App we registered when we were acting as a developer
        r.result[0][4].should.equal( 'never accessed' )
        r.result[0][5].should.equal( 'none' )
// console.log('\n /admin/applictions\n', r.result)
        done( null )
      })
    })
  })

  describe('-> /admin/memberships', function () {
    it('should return current user in row', function (done) {
      var options =
        { url: HOST_URL + '/admin/memberships'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.be.an('array')
        r.result[0][0].should.equal( di )       // directed identifier from when we logged in
        r.result[0][6].should.equal('RETIRED')  // we set this back when we were a lawyer
        done( null )
      })
    })
  })


  describe('-> /admin/membership/status', function () {
    it('should return success=true ', function (done) {
      var options =
        { url: HOST_URL + '/admin/membership/status'
        , method: 'POST'
        , json: { status: 'PRACTISING', di: di }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.not.have.property('error')
        json.should.have.property('result')
        json.result.should.have.property('success', true)
        done( null )
      })
    })
  })

  describe('-> /admin/memberships', function () {
    it('should return current user in row', function (done) {
      var options =
        { url: HOST_URL + '/admin/memberships'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.be.an('array')
        r.result[0][0].should.equal( di )
        r.result[0][6].should.equal('PRACTISING')
        done( null )
      })
    })
  })


  describe(' /logout', function () {
    it('should return a redirect to /', function (done) {
      var options =
        { url: HOST_URL + '/logout'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/')
        done( null )
      })
    })
  })

})

/*
*   We need the keys for TEST_APP_ID
*   login to Registrar and get a copy of the keys for TEST_APP_ID
*/

// go get keys from Registrar
describe('Getting IX keys for '+TEST_APP_ID, function () {
  var agentRequest = null
    , ixToken = null
    , jws = null

  describe('/login', function () {
    it('should return an Agent Request', function ( done ) {
      var options =
        { url:  'http://registrar.a2p3.net/login'
        , qs: { json: true }
        , method: 'GET'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.have.property('result')
        r.result.should.have.property('request')
        var agentUrl = r.result.request
        var u = urlParse( agentUrl, true )
        // save values for later
        agentRequest = u.query.request
        jws = new a2p3.Parse( agentRequest )
        should.exist( jws )
        done( null )
      })
    })
  })

  describe('-> Setup /token', function () {
    it('should return an IX Token', function (done) {
      var options =
        { url: SETUP_URL + '/token'
        , method: 'POST'
        , json:
          { device: config.device
          , sar: jws.signature
          , auth:
            { passcode: true
            , authorization: true
            }
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('token')
        // save code for next step
        ixToken = json.result.token
        done( null )
      })
    })
  })

  describe( ' return URL', function () {
    it('should redirect to /dashboard', function ( done ) {
      var options =
        { url: jws.payload['request.a2p3.org'].returnURL
        , method: 'GET'
        , qs: { token: ixToken, request: agentRequest }
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/dashboard')
        done( null )
      })
    })
  })

  describe(' /dashboard ', function () {
    it('should return status code of 200 and HTML', function (done) {
      var options =
        { url: 'http://registrar.a2p3.net/dashboard'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        should.exist( body )
        response.statusCode.should.equal( 200 )
        done( null )
      })
    })
  })

  describe('-> /dashboard/app/details', function () {
    it('should return keys', function (done) {
      var options =
        { url: 'http://registrar.a2p3.net/dashboard/app/details'
        , method: 'POST'
        , json: { id: TEST_APP_ID }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('details')
        json.result.details.should.have.property('keys')
        // finally we get access to the keys for use later!
        vault['ix.a2p3.net'] = json.result.details.keys
        done( null )
      })
    })
  })

  describe(' /logout', function () {
    it('should return a redirect to /', function (done) {
      var options =
        { url: 'http://registrar.a2p3.net/logout'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/')
        done( null )
      })
    })
  })

})

/*
*   Resource tests
*   get RS Tokens
*   get status, number of acccess_token
*   get anytime status and anytime number
*/

// let's go make some API calls

var access_token = null

describe('Calling '+ config.appID + ' as ' + TEST_APP_ID, function () {
  var agentRequest
    , ixToken

  var testAppConfig =
    { appID: TEST_APP_ID
    , name: "Test App"
    , device: config.device
    }
  var params =
    { returnURL: 'http://localhost' // does not really matter what this is,
    , resources:
      [ 'http://'+config.appID+'/scope/number'
      , 'http://'+config.appID+'/scope/status'
      , 'http://'+config.appID+'/scope/anytime/number'
      , 'http://'+config.appID+'/scope/anytime/status'
      ]
    }
  describe(' calling Setup ', function () {
    it('should return an IX Token', function (done) {
      agentRequest = a2p3.createAgentRequest( testAppConfig, vault, params )
      should.exist( agentRequest )
      var jws = a2p3.Parse( agentRequest )
      var options =
        { url: SETUP_URL + '/token'
        , method: 'POST'
        , json:
          { device: config.device
          , sar: jws.signature
          , auth:
            { passcode: true
            , authorization: true
            }
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('token')
        // save code for next step
        ixToken = json.result.token
        done( null )
      })
    })
  })

  var rs = null
  describe(' calling Resource.exchange ', function () {
    it('should return a DI and no error', function (done) {
      rs = new a2p3.Resource( testAppConfig, vault )
      should.exist( rs )
      rs.exchange( agentRequest, ixToken, function ( e, di ) {
        should.exist( di )
        should.not.exist( e )
        done( null )
      })
    })
  })

  describe(' calling Resource.callMultiple ', function () {
    it('should return status, number and access_token', function (done) {
      var details = {}
      details[ HOST_URL+'/membership/status' ] = null
      details[ HOST_URL+'/membership/number' ] = null
      details[ HOST_URL+'/oauth' ] = null
      rs.callMultiple( details, function ( e, results ) {
        should.not.exist( e )
        should.exist( results )
        results.should.have.property( HOST_URL+'/membership/status' )
        results.should.have.property( HOST_URL+'/membership/number' )
        results.should.have.property( HOST_URL+'/oauth' )
        results[ HOST_URL+'/membership/status' ].should.have.property( 'status', 'PRACTISING' )
        results[ HOST_URL+'/membership/number' ].should.have.property( 'number', NUMBER )
        results[ HOST_URL+'/oauth' ].should.have.property('access_token')
        access_token = results[ HOST_URL+'/oauth' ].access_token
        done( null )
      })
    })
  })

  describe(' calling /membership/anytime/status ', function () {
    it('should return status', function (done) {
      var options =
        { url: HOST_URL + '/membership/anytime/status'
        , form: { access_token: access_token }
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.have.property('status', 'PRACTISING' )
        done( null )
      })
    })
  })

  describe(' calling /membership/anytime/number', function () {
    it('should return number', function (done) {
      var options =
        { url: HOST_URL + '/membership/anytime/number'
        , form: { access_token: access_token }
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.have.property('number', NUMBER )
        done( null )
      })
    })
  })

})

/*
*   Login as Admin and confirm Applications info for App has been updated
*/
describe('Testing /admin ', function () {
  var agentRequest = null
    , ixToken = null
    , jws = null

  describe('/admin/login/direct', function () {
    it('should return an Agent Request', function ( done ) {
      var options =
        { url: HOST_URL + '/admin/login/direct'
        , qs: { json: true }
        , method: 'GET'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.have.property('result')
        r.result.should.have.property('request')
        var agentUrl = r.result.request
        var u = urlParse( agentUrl, true )
        // save values for later
        agentRequest = u.query.request
        jws = new a2p3.Parse( agentRequest )
        should.exist( jws )
        done( null )
      })
    })
  })

  describe('-> Setup /token', function () {
    it('should return an IX Token', function (done) {
      var options =
        { url: SETUP_URL + '/token'
        , method: 'POST'
        , json:
          { device: config.device
          , sar: jws.signature
          , auth:
            { passcode: true
            , authorization: true
            }
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('token')
        // save code for next step
        ixToken = json.result.token
        done( null )
      })
    })
  })

  describe( ' return URL', function () {
    it('should redirect to /admin', function ( done ) {
      var options =
        { url: jws.payload['request.a2p3.org'].returnURL
        , method: 'GET'
        , qs: { token: ixToken, request: agentRequest }
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/admin')
        done( null )
      })
    })
  })

  describe(' /admin ', function () {
    it('should return status code of 200 and HTML', function (done) {
      var options =
        { url: HOST_URL + '/admin'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        should.exist( body )
        response.statusCode.should.equal( 200 )
        done( null )
      })
    })
  })

  describe('-> /admin/applications', function () {
    it('should return app we registered in first row', function (done) {
      var options =
        { url: HOST_URL + '/admin/applications'
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        r.result.should.be.an('array')
        r.result[0][1].should.equal( TEST_APP_ID ) // App we registered when we were acting as a developer
        r.result[0][4].should.not.equal( 'never accessed' )
        r.result[0][5].should.equal( 'number status' )
// console.log('\n /admin/applictions\n', r.result)
        done( null )
      })
    })
  })


  describe(' /logout', function () {
    it('should return a redirect to /', function (done) {
      var options =
        { url: HOST_URL + '/logout'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.should.have.property('headers')
        response.headers.should.have.property( 'location', '/')
        done( null )
      })
    })
  })

})


/*
*   get and delete authorizations
*   confirm using access_token now fails
*/


describe('Removing authorization to ' + TEST_APP_ID, function () {
  var resourceRequest = null
    , deleteRequest = null
  describe('-> registrar:/authorizations/requests', function () {
    it('should return a resource authN list request', function (done) {
      var options =
        { url: 'http://registrar.a2p3.net/authorizations/requests'
        , method: 'POST'
        , json:
          { token: config.token
          , authorizations: [ config.appID ]
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.not.have.property('error')
        json.should.have.property('result')

console.log('\n /authorizations/requests',json)

        json.result.should.have.property( config.appID )
        // save resourceRequest for next step
        resourceRequest = json.result[ config.appID ]
        done( null )
      })
    })
  })

  describe('-> resource: /authorizations/list', function () {
    it('should return a delete request', function (done) {
      var options =
        { url: HOST_URL + '/authorizations/list'
        , method: 'POST'
        , json:{ request: resourceRequest }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.not.have.property('error')
        json.should.have.property('result')
        json.result.should.have.property( TEST_APP_ID )
        json.result[ TEST_APP_ID ].should.have.property('request')
        // save deleteRequest for next step
        deleteRequest = json.result[ TEST_APP_ID ].request
        done( null )
      })
    })
  })

  describe('-> resource: /authorization/delete', function () {
    it('should return success=true', function (done) {
      var options =
        { url: HOST_URL + '/authorization/delete'
        , method: 'POST'
        , json:{ request: deleteRequest }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.not.have.property('error')
        json.should.have.property('result')
        json.result.should.have.property('success', true )
        done( null )
      })
    })
  })

  describe(' calling /membership/anytime/status ', function () {
    it('should return error', function (done) {
      var options =
        { url: HOST_URL + '/membership/anytime/status'
        , form: { access_token: access_token }
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('result')
        r.should.have.property('error')
        r.error.should.have.property('code', 'INVALID_ACCESS_TOKEN')
        done( null )
      })
    })
  })

  describe(' calling /membership/anytime/number', function () {
    it('should return error', function (done) {
      var options =
        { url: HOST_URL + '/membership/anytime/number'
        , form: { access_token: access_token }
        , method: 'POST'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('result')
        r.error.should.have.property('code', 'INVALID_ACCESS_TOKEN')
        done( null )
      })
    })
  })

})