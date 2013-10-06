rs-sample-node-a2p3
===================

Sample Resource Server for A2P3

##Prerequsites
- git

- node 0.8.x or later

- Facebook account

####Optional
- [AWS](http://aws.amazon.com) account

##Install and Setup
1) `git clone git://github.com/dickhardt/rs-sample-node-a2p3.git`

2) `cd rs-sample-node-a2p3`

3) `npm install`

4) `npm run config`

5) Register if need be at [setup.a2p3.net](http://setup.a2p3.net) and create a CLI Agent and save the device and token parameters

6) Edit config.json and insert the `device` and `token` parameters and set `appID` to your machine name (it must not conflict with any Apps already registered at the Registrar)

7) `npm run register` to create the vault.json file

8) `npm start` will start the server locally

####config.json and vault.json
See [node-a2p3](https://github.com/dickhardt/node-a2p3) for details

## Deployment to AWS Elastic Beanstalk

NEED TO GENERATE KEYS FOR THE HOST THAT IS BEING RUN AT AWS!!!

1) Add the generated vault.json and config.json files to the local repo so that they will be deployed to AWS:

  git add -f vault.json
  git add -f config.json
  git commit -a -m"add in vault and config"

2) Browse to [AWS](http://aws.amazon.com) and register or login.

3) Get your Access Key ID and Secret Access Key from [Security Credentials](https://portal.aws.amazon.com/gp/aws/securityCredentials)

4) Install and setup the [eb](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/usingCLI.html) CLI tools.

5) `eb init` providing your Access Key ID and Secret Access Key and accept all defaults

6) `eb start` will deply and start your application

When you make changes, `git aws.push` will upload your local commits to AWS (remember to `git commit -a -m"<commit description here>"`)

Additional documetion on running [Node on Elastic Beanstalk](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs.html)

##Testing
`npm test` will run the tests

NOTE: see the comments in test/test.js for values you will need to modify to run a test

The server must be running to be tested, and the DB needs to be empty.
Stopping and restarting the server will clear the in-memory DB.

##Database
This sample stores all of its data in an large JSON object. The DB API calls are all have prcoess.nextTick() calls so that it acts async. To have resilient storage, rewrite db_dev.js to expose the same API but work with the database of your choice.

## Related

[A2P3 project home page](http://www.a2p3.net)

[A2P3_specs](https://github.com/dickhardt/A2P3_specs) Specifications and POC documentation

[A2P3](https://github.com/dickhardt/A2P3) POC Server implementation source (node.js)

[A2P3_agent](https://github.com/dickhardt/A2P3_agent) POC mobile agent (PhoneGap)

[A2P3_bank](https://github.com/dickhardt/A2P3_bank) POC mobile bank app (PhoneGap)

[node-a2p3](https://github.com/dickhardt/node-a2p3) node.js npm module for A2P3 applications

[sample-node-a2p3](https://github.com/dickhardt/sample-node-a2p3) sample A2P3 application using node-a2p3

## License
MIT License

Copyright (c) 2013 Province of British Columbia

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

