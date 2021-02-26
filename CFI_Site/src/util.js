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
export const paymentHandler = "https://www.mediatorurl.com";
export const walletID =
    "bc963c1ff3fe818c802bf51d21f43c9dfd5d7de0ff36a5e34208e2d3cbf22619";
export const paymentType = "mcpba";
export const bankName = "Ghobank AHI";

export function setAppCookie() {
    ahi_core.register(walletID, paymentType);
}

export function deleteAppCookie() {
    ahi_core.unregister(walletID, paymentType);
}

export function showInstalling() {
    $(".loader").show();
}

export function hideInstalling() {
    $(".loader").hide();
}

export function hideContent() {
    $(".register-container,.landing-page").hide();
}

export function showContent() {
    $(".register-container, .landing-page").show();
}

export function fadeOut(elem) {
    $(elem).fadeOut(3000, function () {
        $(elem).html("");
        $(elem).show();
    });
}

export function httpPost(url, data) {
    return new Promise(function (resolve, reject) {
        try {
            fetch(url, {
                method: "POST",
                body: data,
                headers: {
                    "Content-Type": "application/json"
                }
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (result) {
                    resolve(result);
                })
                .catch(function (error) {
                    reject(error);
                });
        } catch (error) {
            reject(error);
            console.log(error);
        }
    });
}

export function manageResponse(result, action) {
    hideInstalling();
    showContent();

    if (result.success) {
        $(".success").text(result.message);
        fadeOut(".success");
    } else {
        $(".failure").text(result.message);
        fadeOut(".failure");
    }

    showHideButtons(action, result.success);
}

export function logout() {
    window.location.href = window.location.origin;
}

export function showHideButtons(action, registrationFlag, isMessageDisplay = false) {
    if (action === "register" && registrationFlag) {
        if (isMessageDisplay) {
            $(".success").text("Payment Method Registered Successfully");
        }
        fadeOut(".success");
        $(".reg-btn, h4, h6").hide();
        $(".unreg-btn, h6").show();
    } else if (action === "unregister" && registrationFlag) {
        if (isMessageDisplay) {
            $(".success").text("Payment Method Unregistered Successfully");
        }
        $(".unreg-btn, h6").hide();
        $(".reg-btn, h4, h6").show();
    }
}

export function clear() {
    var elements = [".success", ".failure", ".errCode", ".errMsg", ".errStack"];

    for (var _i = 0, _elements = elements; _i < _elements.length; _i++) {
        var cls = _elements[_i];
        $(cls).text("");
    }
}

export function cancelPaymentRequestW3C(methodName, details, error) {
    details['message'] = error;
    paymentRequestClient.postMessage({
        methodName: methodName,
        details: details
    });
    window.close();
};

export function cancelPaymentRequestNonW3C(requestId, error) {
    const responseData = {
        requestId: requestId,
        error: error
    };
    ahi_core.respondWith(responseData);
};

/**
 * Defines utility methods to work with the query string of a URL.
 */
export let urlSearchParams = {
    /**
     * Returns a Boolean indicating if such a given parameter exists.
     * @param {string} queryParam The name of the parameter to find.
     * @param {string} url_string URL as a string
     */
    has: function (queryParam, url_string) {
        try {
            let searchParams = (new URL(url_string)).searchParams;
            return searchParams.has(queryParam);
        } catch (error) {
            return url_string.indexOf(queryParam) >= 0;
        }
    },
    /**
     * Returns the first value associated with the given search parameter.
     * @param {string} queryParam The name of the parameter to find.
     * @param {string} url_string URL as a string
     */
    get: function (queryParam, url_string) {
        if (typeof URL === "function") {
            let url = new URL(url_string);
            let query = url.search.substring(1);
            let parms = query.split("&");

            //Iterate the search parameters.
            for (let i = 0; i < parms.length; i++) {
                let pos = parms[i].indexOf("=");
                if (pos > 0 && queryParam == parms[i].substring(0, pos)) {
                    return parms[i].substring(pos + 1);
                }
            }
            return "";
        } else {
            let href = url_string;
            //this expression is to get the query strings
            let reg = new RegExp('[?&]' + queryParam + '=([^&#]*)', 'i');
            let queryString = reg.exec(href);
            return queryString ? queryString[1] : null;
        }
    }
};