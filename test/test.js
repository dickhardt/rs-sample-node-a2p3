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

// test configuration

var HOST_PORT = 8080
  , HOST_URL = 'http://localhost' + ':' + HOST_PORT
  , SETUP_URL = 'http://setup.a2p3.net'
  , NUMBER = '123-456'


// global for holding directed identifier of user at app
var di = null


debugger;

/*
*   Lawyer tests
*   login, accept TOS, get profile page, check membership number and status,
*   change status to non-practising, check status, logout
*/

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

// console.log('\n /dashboard/list/apps\n', r )

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
*   Resource tests
*   request number and make API call to number and status (fail)
*   repeat for status
*   repeat for anytime number, oauth token
*   repeat for anytime status, oauth token
*   login as admin and check app status is updated with access and anytime requests
*   revoke anytime access to app
*   make API call and confirm failure
*/


