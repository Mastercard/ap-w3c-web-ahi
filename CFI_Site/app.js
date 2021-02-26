/**  Copyright (c) 2021 Mastercard
 
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
 
    http://www.apache.org/licenses/LICENSE-2.0
 
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 
*/
const express = require("express");
const bodyParser = require('body-parser');
const path = require("path");
const fs = require("fs");
const https = require('https');
const http = require('http');
const request = require('request');
const app = express();
const port = process.env.PORT || 443;
const aasa = fs.readFileSync('../certificates/apple-app-site-association');
const aLinks = fs.readFileSync('.well-known/assetlinks.json');
const KeyManager = require('./keyManager');
const bankUrl = 'bankURL';
const apiURL = 'http://localhost:9999';

const httpsOptions = {
    key: fs.readFileSync('../certificates/ghobank.key'),
    cert: fs.readFileSync('../certificates/ghobank.crt'),
    rejectUnauthorized: false, //add when working with https sites
    requestCert: false, //add when working with https sites
    agent: false,
    ca: fs.readFileSync('../certificates/ghobankBundle.crt')
};
const keyManager = new KeyManager();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

app.get('/', (req, res, next) => {
    res.links({
        'payment-method-manifest': `${bankUrl}/payment-manifest.json`,
    });
    next();
});
app.head('/', (req, res) => {
    console.log('Head request');
    res.status(204).links({
        'payment-method-manifest': `${bankUrl}/payment-manifest.json`,
    });
    res.end();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/login.html'));
});

app.get('/apple-app-site-association', (req, res, next) => {
    res.set('Content-Type', 'application/pkcs7-mime');
    res.status(200).send(aasa);
});

app.get('/.well-known/assetlinks.json', (req, res, next) => {
    res.set('content-type', 'application/json');
    res.status(200).send(aLinks);
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/register.html'));
});

app.get('/confirm', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/confirm.html'));
});
app.get('/pay', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/login.html'));
});
app.get('/unauthorized', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/unauthorized.html'));
});
app.get('/ahi/pay', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/login.html'));
});
app.get('/ahi/login', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/login.html'));
});
app.get('/ahi/register', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/register.html'));
});
app.get('/instructions', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/view/instructions.html'));
});

app.head('/mcpay', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(204).links({
        'payment-method-manifest': `${bankUrl}/payment-manifest.json`,
    });
    res.end();
});
app.head('/pay', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(204).links({
        'payment-method-manifest': `${bankUrl}/payment-manifest.json`,
    });
    res.end();
});

/* app.get('/sign', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(keyManager.getZappSignature());
    res.end();
});

app.post('/decrypt', (req, res) => {
    const data = req.body.data;
    console.log(data);
    if (keyManager.verifySign(data)) {
        res.send({
            status: 'success'
        });
    } else {
        res.send({
            status: 'failure'
        });
    }
    res.end();
}); */

app.post('/encrypt', (req, res) => {
    const paymentResponse = req.body.responseData;
    const merchantCertificateURL = req.body.merchantCertificateURL;
    var options = {
        method: 'POST',
        url: `${apiURL}/encrypt`,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            paymentResponse,
            merchantCertificateURL
        },
        json: true
    };

    try {
        request(options, function (error, response, body) {
            if (error) {
                res.send({
                    status: "failure",
                    code: "AHI5008",
                    message: "Failed to sign payment response"
                });
                res.send();
                return;
            };
            res.send(body);
            res.end();
        });
    } catch (e) {
        console.log(e);
        res.send({
            status: "failure",
            code: "AHI5008",
            message: "Failed to sign payment response"
        });
        res.send();
    }
});

app.post('/validaterequest', (req, res) => {
    const paymentRequest = req.body.paymentRequest;
    const hashData = req.body.hashData;
    var options = {
        method: 'POST',
        url: `${apiURL}/validaterequest`,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            paymentRequest,
            hashData
        },
        json: true
    };

    try {
        request(options, function (error, response, body) {
            if (error) {
                res.send({
                    status: "failure",
                    code: "AHI5012",
                    message: "Failed to sign payment response"
                });
                res.send();
                return;
            };
            res.send(body);
            res.end();
        });
    } catch (e) {
        console.log(e);
        res.send({
            status: "failure",
            code: "AHI5012",
            message: "Failed to sign payment response"
        });
        res.send();
    }
});

app.post('/getPaymentResponse', (req, res) => {
    const paymentType = req.body.paymentType;
    const walletID = req.body.walletID;
    var options = {
        method: 'POST',
        url: `${apiURL}/paymentresponse`,
        headers: {
            'content-type': 'application/json'
        },
        body: {
            paymentType,
            walletID
        },
        json: true
    };

    try {
        request(options, function (error, response, body) {
            if (error) {
                res.send({
                    status: "failure",
                    code: "AHI5010",
                    message: "Failed to get payment response"
                });
                res.send();
                return;
            };
            res.send(body);
            res.end();
        });
    } catch (e) {
        console.log(e);
        res.send({
            status: "failure",
            code: "AHI5010",
            message: "Failed to get payment response"
        });
        res.send();
    }
});

app.post('/prsign', (req, res) => {
    const paymentResponse = req.body.paymentResponse;
    var options = {
        method: 'POST',
        url: `${apiURL}/prsign`,
        body: paymentResponse
    };
    try {
        request(options, function (error, response, body) {
            if (error) {
                res.send({
                    status: "failure",
                    code: "AHI5007",
                    message: "Failed to sign payment response"
                });
                res.send();
                return;
            };
            res.send(body);
            res.end();
        });
    } catch (e) {
        console.log(e);
        res.send({
            status: "failure",
            code: "AHI5007",
            message: "Failed to sign payment response"
        });
        res.send();
    }
});

app.post('/verifysign', (req, res) => {
    const signedtoken = req.body.signedtoken;
    const hashData = req.body.clearTextPayload;
    var options = {
        method: 'POST',
        url: `${apiURL}/verifysign`,
        headers: {
            "X-JWS-Signature": signedtoken
        },
        body: hashData
    };

    try {
        request(options, function (error, response, body) {
            if (error) {
                res.send({
                    status: "failure",
                    code: "AHI5003",
                    message: "Failed to verify payment response sign"
                });
                res.send();
                return;
            };
            res.send(body);
            res.end();
        });
    } catch (e) {
        console.log(e);
        res.send({
            status: "failure",
            code: "AHI5003",
            message: "Failed to verify payment response sign"
        });
        res.send();
    }
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    if (username != 'admin') {
        res.send({
            status: 'SUCCESS'
        });
    } else {
        res.send({
            status: 'FAILURE',
            error: {
                code: 'AHI5001',
                message: 'Invalid user credentials'
            }
        });
    }
    res.end();
});

app.post('/validatecertificate', (req, res) => {
    const merchantCertificateURL = req.body.merchantCertificateURL;
    const walletId = req.body.walletId;
    const paymentType = req.body.paymentType;

    var options = {
        method: 'POST',
        url: `${apiURL}/validatecertificate`,
        body: {
            merchantCertificateURL,
            walletId,
            paymentType
        },
        json: true
    };

    try {
        request(options, function (error, response, body) {
            if (error) {
                res.send({
                    status: "failure",
                    code: "AHI5011",
                    message: "Failed to verify certificate"
                });
                res.send();
                return;
            };
            res.send(body);
            res.end();
        });
    } catch (e) {
        console.log(e);
        res.send({
            status: "failure",
            code: "AHI5011",
            message: "Failed to verify certificate"
        });
        res.send();
    }
});
app.get('/manifest.json', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(__dirname + '/manifest.json'));
});

https.createServer(httpsOptions, app).listen(port, '0.0.0.0', () => {
    console.log('server running at ' + port)
});