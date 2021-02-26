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
"use strict";
import * as utils from "./util";
import { getServiceWorkerStatus, installWebApp, uninstallWebApp } from "./custom-payment";

let ERROR_MESSAGES = {
    AHI5001: { message: "Authentication failure", code: "AHI5001" },
    AHI5002: { message: "Insufficient balance in account", code: "AHI5002" },
    AHI5003: { message: "Payment request verification failed", code: "AHI5003" },
    AHI5004: { message: "Payment request checksum failed", code: "AHI5004" },
    AHI5005: { message: "Invalid payment response", code: "AHI5005" },
    AHI5006: { message: "Payment response fetch failed", code: "AHI5006" },
    AHI5007: { message: "Failed to sign payment response", code: "AHI5007" },
    AHI5008: { message: "Payment response encryption failed", code: "AHI5008" },
    AHI5009: { message: "The payment request is cancelled by user", code: "AHI5009" },
    AHI5011: { message: "Failed to verify certificate", code: "AHI5011" },
    AHI2000: { message: "Process completed successfully", code: "AHI2000" }
};
//Holds the value of checkbox to toggle b/w W3C and Supplementary - W3C Flow
var isNonW3C = true;

(function () {
    try {
        isNonW3C = JSON.parse(window.localStorage ? window.localStorage.getItem('isNonW3C') : true) || false;
    } catch (e) {
        console.log(e);
    }
})();

/**
 * Initialization function which performs :
 *  i) Injecting the mediator iFrame which is required to drop the cookie
 *  ii) Verify the signature of the Payload
 *  iii) Gets the registration status and show the Register/Unregister buttons accordingly
 */
$(function () {
    utils.hideContent();
    utils.showInstalling();
    if (ahi_core.isSupportedBrowser()) {
        $('.isNonW3C').css('display', 'block');
    }
    /**
     * Call the private function to verify the signature of the payload
     */
    if (utils.urlSearchParams.has("signedtoken", window.location.href)) {
        verifySignature();
    }

    /**
     * Call the function of the AHIArtefact to inject the mediator iFrame
     */
    ahi_core.init({
        env: 'ENVDefault'
    }).then(function (result) {
        console.log(result);
        /* Call the private function to get the registration status */
        getRegistrationStatus();
        utils.hideInstalling();
        utils.showContent();
    }).catch(function (err) {
        utils.hideInstalling();
        utils.showContent();
        if (err.code === "MC005") {
            console.error("Cookie is disabled" + err.message);
            $(".reg-btn,.unreg-btn").css("cursor", "not-allowed");
            $(".reg-btn,.unreg-btn").prop("disabled", true);
            $(".thirdPartyCookieError").html("<p>Error : " + err.message + "</p>");
            $(".thirdPartyCookieError").css("display", "block");
        }
    });

    try {
        if (window.localStorage.getItem('isNonW3C') === 'true') {
            $('#isNonW3C').prop('checked', true);
            isNonW3C = true;
        }

        /**
         * Enable or disable W3C Flow on supported browsers
         */
        $('#isNonW3C').change(function () {
            if ($(this).is(':checked')) {
                isNonW3C = true;
            } else {
                isNonW3C = false;
            }
            window.localStorage.setItem('isNonW3C', isNonW3C);
        });
    } catch (err) {
        console.warn(err);
    }

    /**
     * Login button click logic to route to Payment or Registration Page
     * @param {*} event
     */
    let onSubmit = function (event) {
        event.preventDefault();

        const username = $('#username').val();
        const password = $('#password').val();
        var data = JSON.stringify({
            username: username,
            password: password
        })

        utils.httpPost("/login", data)
            .then(function (result) {
                if (result.status.toLowerCase() == "success") {
                    if (window.location.href.indexOf("pay") !== -1) {
                        window.location.href = window.location.origin + "/confirm";
                    } else {
                        window.location.href = window.location.origin + "/register";
                        getRegistrationStatus();
                    }
                } else {
                    $('.container').append('<div class="alert alert-danger col-md-6 col-md-offset-3" role="alert">Invalid credentials</div>');
                }
            })
            .catch(function (error) {
                console.log(error);
            })
    };

    $("#login").on("click", onSubmit);

    $('#proceedAuthBtn').on('click', function (event) {
        if (ahi_core.isSupportedBrowser() && !isNonW3C) {
            const methodName = `${utils.paymentHandler}/mcpba`;
            const details = {
                id: paymentRequestObj['paymentRequestId'],
                isW3C: true
            };
            utils.cancelPaymentRequestW3C(methodName, details, ERROR_MESSAGES.AHI5001);
        } else {
            ahi_core.getRequestObject()
                .then(function (paymentRequestObj) {
                    utils.cancelPaymentRequestNonW3C(paymentRequestObj.paymentRequestId, ERROR_MESSAGES.AHI5001);
                }).catch(function (error) {

                });
        }
    });
});
/**
 *  Gets the Registration status for unsupported browser(non-w3c)
 */
export function getRegistrationStatus() {
    /* Check if W3C feature is supported or not  */
    if (ahi_core.isSupportedBrowser() && !isNonW3C) {
        /* Function to get the registration status of service worker for W3C flow */
        getServiceWorkerStatus();
    } else {
        if (window.location.href.indexOf("register") !== -1) {
            /* Function to get the registration status of cookie for Supplementary-W3C flow*/
            ahi_core.hasRegistration(utils.walletID, utils.paymentType)
                .then(function (result) {
                    let action = result.success ? "register" : "unregister";
                    const resultCode = utils.urlSearchParams.get('code', window.location.href);
                    if (resultCode) {
                        if (resultCode == 'MC001') {
                            utils.showHideButtons("register", true, true);
                        } else if (resultCode == 'MC007') {
                            utils.showHideButtons("unregister", true, true);
                        }
                    } else {
                        utils.showHideButtons(action, result.success);
                    }
                })
                .catch(function (err) {
                    /**
                     * Handle error in case of failed operation
                     */
                    throw new DOMException(err);
                });
        }
    }
}

/**
 *  Register function to be called on Register button click
 */
export function registerPH() {
    /**
     * clear method will clear the state of APP
     */
    utils.clear();

    /* Check if W3C feature is supported or not  */
    if (!ahi_core.isSupportedBrowser() || isNonW3C) {
        /* Calls private functions to show the preloader*/
        utils.hideContent();
        utils.showInstalling();

        /* Calls Register function for AHI Artefact*/
        ahi_core.register(utils.walletID, utils.paymentType)
            .then(function (result) {
                /* UI Manipulation logic after getting the response*/
                utils.manageResponse(result, "register");
            })
            .catch(function (err) {
                /**
                 * Handle the error cases while caling API
                 */
                throw new DOMException(err);
            });
    } else {
        /* Calls the function to install the service worker(supported browser) */
        installWebApp();
    }
}

/**
 *  Unregister function to be called on unregister button click
 */
export function unregisterPH() {
    utils.clear();
    /* Check if W3C feature is supported or not  */
    if (!ahi_core.isSupportedBrowser() || isNonW3C) {
        utils.hideContent();
        utils.showInstalling();

        /* Calls unregister function for AHI Artefact*/
        ahi_core.unregister(utils.walletID, utils.paymentType)
            .then(function (result) {
                /* UI Manipulation logic after getting the response*/
                utils.manageResponse(result, "unregister");
            })
            .catch(function (err) {
                throw new DOMException(err);
            });
    } else {
        /* Calls the function to uninstall the service worker(supported browser) */
        uninstallWebApp();
    }
}

/**
 *  This function is called on Payment confirmation
 */
export function onConfirm() {
    respondToPayment("Confirm");
}

/**
 *  This function is called on Payment cancellation
 */
export function onCancel() {
    respondToPayment("Cancel");
}

/**
 *  This private function is called on payment confirmation/cancellation
 */
function respondToPayment(action) {
    let data = JSON.stringify({
        paymentType: utils.paymentType,
        walletID: utils.walletID
    });

    utils.httpPost("/getPaymentResponse", data)
        .then(function (responseDetails) {
            /**
             * in case of invalid payment response set error code
             * AHI5005
             */
            if (responseDetails.details) {
                let paymentCredentials = responseDetails.details;

                if (ahi_core.isSupportedBrowser() && !isNonW3C) {
                    respondToServiceWorker(action, paymentCredentials);
                } else {
                    ahi_core.getRequestObject()
                        .then(function (requestObj) {
                            paymentRequestObj = requestObj;
                            if (!paymentRequestObj.methodData[0].data.isW3C) {
                                respondToArtefact(action, paymentCredentials);
                            } else {
                                respondToServiceWorker(action, paymentCredentials);
                            }
                        })
                        .catch(function (err) {
                            console.error("Failed to get Payment request Object");
                        });
                }
            } else {
                if (ahi_core.isSupportedBrowser() && !isNonW3C) {
                    const methodName = `${utils.paymentHandler}/mcpba`;
                    const details = {
                        id: paymentRequestObj['paymentRequestId'],
                        isW3C: true
                    };
                    utils.cancelPaymentRequestW3C(methodName, details, ERROR_MESSAGES.AHI5005);
                } else {
                    ahi_core.getRequestObject()
                        .then(function (requestObj) {
                            utils.cancelPaymentRequestNonW3C(requestObj.paymentRequestId, ERROR_MESSAGES.AHI5005);
                        });
                }
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}


function getSignedToken(data) {
    return new Promise(function (resolve, reject) {
        utils.httpPost('/prsign', JSON.stringify({ paymentResponse: data }))
            .then(function (response) {
                if (response["message"].toLowerCase() === "success") {
                    resolve(response);
                } else {
                    reject(ERROR_MESSAGES['AHI5007']);
                }
            }).catch(function (error) {
                reject(ERROR_MESSAGES['AHI5007']);
            });
    });
}

function encryptResponseData(data) {
    return new Promise(function (resolve, reject) {
        utils.httpPost('/encrypt', data)
            .then(function (result) {
                if (result["status"] === "true") {
                    resolve(result.paymentResponse);
                } else {
                    reject(ERROR_MESSAGES['AHI5008']);
                }
            }).catch(function (error) {
                reject(ERROR_MESSAGES['AHI5008']);
            });
    });
}

function respondToServiceWorker(action, paymentCredentials) {
    let responseData = {};
    let requestId = paymentRequestObj['paymentRequestId'];

    // When `paymentRequestClient` is not found, there's no associated service worker
    if (!paymentRequestClient) return;
    let methodName = `${utils.paymentHandler}/mcpba`;
    let details = {
        id: requestId,
        isW3C: true
    };
    if ($('#lowBalanceActionCheck').is(':checked')) {
        /**
         * In Insufficient balance scenario, AHI has to send message and error code to merchant
         * to identify the reason for cancel/abort
         */
        utils.cancelPaymentRequestW3C(methodName, details, ERROR_MESSAGES['AHI5002'])

    } else if (action === "Confirm") {
        let dataToEncrypt = JSON.stringify({
            responseData: btoa(JSON.stringify(paymentCredentials)),
            merchantCertificateURL: paymentRequestObj['methodData'][0]['data']['merchantCertificateURL']
        });

        /* Call the encryptData function to encrypt the Payment Response */
        encryptResponseData(dataToEncrypt)
            .then(function (encryptedData) {
                details['paymentresponse'] = encryptedData;

                getSignedToken(encryptedData)
                    .then(function (response) {
                        if (response['message'].toLowerCase() !== 'success') {
                            responseData = {
                                requestId: requestId,
                                error: ERROR_MESSAGES['AHI5007']
                            };
                            paymentRequestClient.postMessage(responseData);
                            window.close();
                            return;
                        }

                        details['sign'] = response['sign'];
                        details['message'] = ERROR_MESSAGES.AHI2000;

                        // Respond to the service worker with arbitrary message.
                        paymentRequestClient.postMessage({
                            methodName: methodName,
                            details: details
                        });
                        window.close();

                    }).catch(function (error) {
                        responseData = {
                            requestId: requestId,
                            error: error
                        };
                        paymentRequestClient.postMessage(responseData);
                        window.close();
                    });
            }).catch(function (error) {
                responseData = {
                    requestId: requestId,
                    error: error
                };
                paymentRequestClient.postMessage(responseData);
                window.close();
            });
    } else {
        details['message'] = ERROR_MESSAGES['AHI5009'];
        paymentRequestClient.postMessage({
            methodName: methodName,
            details: details
        });
        window.close();
    }
}

function respondToArtefact(action, paymentCredentials) {

    let responseData = {};
    let requestId = paymentRequestObj['paymentRequestId'];
    let details = {
        id: requestId
    };
    if ($('#lowBalanceActionCheck').is(':checked')) {
        /**
         * In Insufficient balance scenario, AHI has to send message and error code to merchant
         * to identify the reason for cancel/abort
         */
        responseData = {
            requestId: requestId,
            error: ERROR_MESSAGES['AHI5002']
        };
        ahi_core.respondWith(responseData);

    } else if (action === "Confirm") {
        /* Construct the Payment response object*/
        let billingAddress = {};

        if (paymentRequestObj["requestBillingAddress"]) {
            billingAddress = {
                addressLine: ["JP Nagar"],
                city: "Bangalore",
                country: "IN",
                dependentLocality: "",
                organization: "XYZ Org",
                phone: (paymentRequestObj['payerPhone']) ? paymentRequestObj['payerPhone'] : '',
                postalCode: "560078",
                recipient: (paymentRequestObj['payerName']) ? paymentRequestObj['payerName'] : '',
                region: "Karnataka",
                sortingCode: ""
            };
        }

        if (Object.assign) {
            Object.assign(details, { billingAddress: billingAddress });
            Object.assign(details, paymentCredentials);
        } else {
            $.extend(details, { billingAddress: billingAddress });
            $.extend(details, paymentCredentials);
        }

        let paymentResponse = {
            requestId: requestId,
            details: details,
            methodName: utils.paymentHandler,
            payerEmail: paymentRequestObj['payerEmail'] || null,
            payerName: paymentRequestObj['payerName'] || null,
            payerPhone: paymentRequestObj['payerPhone'] || null,
            shippingOption: paymentRequestObj['shippingOption'] || null,
            shippingAddress: paymentRequestObj['shippingAddress'] || null,
            isW3C: paymentRequestObj['methodData'][0]['data']['isW3C']
        };


        let dataToEncrypt = JSON.stringify({
            responseData: btoa(JSON.stringify(paymentResponse)),
            merchantCertificateURL: paymentRequestObj['merchantCertificateURL']
        });


        /* Call the encryptData function to encrypt the Payment Response */
        encryptResponseData(dataToEncrypt)
            .then(function (encryptedData) {
                responseData['paymentresponse'] = encryptedData;

                getSignedToken(encryptedData)
                    .then(function (response) {

                        if (response['code'] !== 'AHI2000') {
                            responseData = {
                                requestId: requestId,
                                error: ERROR_MESSAGES['AHI5007']
                            };
                            ahi_core.respondWith(responseData);
                            return;
                        }

                        responseData['sign'] = response['sign'];
                        responseData['message'] = ERROR_MESSAGES['AHI2000'];

                        console.log('responseData', responseData);

                        // Respond to the Merchant with arbitrary message.
                        ahi_core.respondWith(responseData);
                    }).catch(function (error) {
                        responseData = {
                            requestId: requestId,
                            error: ERROR_MESSAGES['AHI5007']
                        };
                        ahi_core.respondWith(responseData);
                    });
            }).catch(function (error) {
                responseData = {
                    requestId: requestId,
                    error: error
                };
                ahi_core.respondWith(responseData);
            });
    } else {
        /**
         * In cancel scenario, AHI has to send message and error code to merchant
         * to identify the reason for cancel/abort
         */
        details['message'] = ERROR_MESSAGES['AHI5009'];
        details['isW3C'] = paymentRequestObj['methodData'][0]['data']['isW3C'];
        ahi_core.respondWith(details);
    }
}

/**
 *  Verify the authenticity of the Payload
 */

function verifySignature() {
    let url = window.location.href;

    /* Gets the Parameters(Hashed Payload and Signed Payload) from the URL String  */
    if (utils.urlSearchParams.has("signedtoken", url) && utils.urlSearchParams.has("hashData", url)) {
        let signedToken = utils.urlSearchParams.get("signedtoken", url);
        let hashData = utils.urlSearchParams.get("hashData", window.location.href);

        try {
            /*Validate the Zapp Signature*/
            validateSign(signedToken, hashData)
                .then(function (isValidToken) {
                    if (isValidToken) {
                        ahi_core.getRequestObject()
                            .then(function (paymentRequest) {
                                validateCertificate(paymentRequest.merchantCertificateURL)
                                    .then(function (isValidCertificate) {
                                        if (isValidCertificate) {
                                            ahi_core.getPaymentRequestObject()
                                                .then(function (paymentRequestObject) {
                                                    let data = JSON.stringify({
                                                        paymentRequest: paymentRequestObject,
                                                        hashData: hashData
                                                    });
                                                    isValidRequestObject(data)
                                                        .then(function (result) {
                                                            utils.hideInstalling();
                                                            utils.showContent();
                                                            if (result["status"].toLowerCase() === "failure") {
                                                                loadUnauthorizedPage(ERROR_MESSAGES['AHI5004']);
                                                            }
                                                        }).catch(function (error) {
                                                            loadUnauthorizedPage(ERROR_MESSAGES['AHI5004']);
                                                        });
                                                })

                                        } else {
                                            loadUnauthorizedPage(ERROR_MESSAGES['AHI5011']);
                                        }
                                    }).catch(function (error) {
                                        loadUnauthorizedPage(ERROR_MESSAGES['AHI5011']);
                                    });
                            }).catch(function (error) {
                                loadUnauthorizedPage(ERROR_MESSAGES['AHI5006']);
                            });
                    } else {
                        loadUnauthorizedPage(ERROR_MESSAGES['AHI5003']);
                    }
                }).catch(function () {
                    loadUnauthorizedPage(ERROR_MESSAGES['AHI5003']);
                });
        } catch (e) {
            console.warn("Failed to parse response");
        }
    } else {
        loadUnauthorizedPage(ERROR_MESSAGES['AHI5003']);
    }
}

/* Show the unauthorized page if verification fails  */
export function loadUnauthorizedPage(message) {
    //Base64 encode the error message
    const encodedMsg = btoa(JSON.stringify(message));
    window.location.href = window.location.origin + "/unauthorized?msg=" + encodedMsg;
}

function isValidRequestObject(data) {
    return new Promise(function (resolve, reject) {
        utils.httpPost("/validaterequest", data)
            .then(function (response) {
                resolve(response);
            }).catch(function (error) {
                reject(error);
            });
    });
}

export function validateCertificate(merchantCertificateURL) {
    let payload = JSON.stringify({
        "merchantCertificateURL": merchantCertificateURL,
        "walletId": utils.walletID,
        "paymentType": utils.paymentType
    });
    let isValidCertificate = false;
    return new Promise(function (resolve, reject) {
        utils.httpPost("/validatecertificate", payload)
            .then(function (response) {
                if (response["status"].toLowerCase() === "success") {
                    isValidCertificate = true;
                }
                resolve(isValidCertificate);
            }).catch(function (error) {
                reject(error);
            });
    });
}
/**
 *  Function call to Zapp Root Certificate to verify the Signature
 */
function validateSign(signedtoken, hashData) {
    let isValidToken = false;
    return new Promise(function (resolve, reject) {
        utils.httpPost("/verifysign", JSON.stringify({
            signedtoken: signedtoken,
            clearTextPayload: hashData
        })).then(function (result) {
            if (result["verificationResult"].toUpperCase() === "SUCCESS") {
                isValidToken = true;
            }
            resolve(isValidToken);
        }).catch(function (error) {
            reject(error);
        });
    });
}