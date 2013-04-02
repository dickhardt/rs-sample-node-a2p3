rs-sample-node-a2p3
===================

Sample Resource Server for A2P3

##Prerequsites
- git

- node 0.8.x or later

- Facebook account

####Optional
- [DotCloud](http://dotcloud.com) account

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



##DotCloud Deployment

1) Register at [DotCloud](http://dotcloud.com) for a free account and install the dotcloud CLI. Note your account name.

2) `dotcloud create lawsample` answer yes to link

3) Edit config.json and change `appID` to `lawsample-`<dotcloud_account_name>`.dotcloud.com`

4) `npm run register` to create a vault.json file for the DotCloud hostname

5) `dotcloud push` will deploy to dotcloud

NOTE: this application needs a later version of node.js than the standard one on DotCloud, so node.js 0.8.17 is built to run the app => the first deploy will take some time to build, will not need to rebuild in future deployments.

##Windows Azure Deployment

1) Register at [Windows Azure](http://www.windowsazure.com) and [build and deploy a Node.js web site](http://www.windowsazure.com/en-us/develop/nodejs/tutorials/create-a-website-(mac)) if you have not done it before.

2) Create a new website and set up deployment to use a **local git** repository. Remember your **username**, **password** and copy the resulting **git repo** that is hosted at Azure.

3) `git remote add azure <git repo at azure>` will add a git remote to your local copy of the Sample App

4) Edit the appID in `config.json` to be the hostname you created for your app on Azure.

5) `npm run register` to create a new `vault.json` file for the new hostname.

6) Add the generated vault.json and config.json files to the repo so that they will be deployed to Azure.

	git add -f vault.json 
	git add -f config.json

7) `git commit -m "adding in vault.json and config.js"` to commit new files to local repo

8) `git push azure master` will push the code to Azure. You will need to enter your credentials you created in (2)

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

