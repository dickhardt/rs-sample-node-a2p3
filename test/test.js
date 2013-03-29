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
  , config = require('../config.json')
  , a2p3 = require('a2p3')
  , fetch = a2p3.fetch

var HOST_PORT = 8080
  , HOST_URL = 'http://localhost' + ':' + HOST_PORT
  , SETUP_URL = 'http://setup.a2p3.net'
  , NUMBER = '123-456'

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
        response.headers.should.exist
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
        response.headers.should.exist
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

/*
*   Admin tests
*   login (account must be admin on Registrar)
*   check user is listed in memberships, change status to practising
*   check app is listed in applications
*   logout
*/

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


