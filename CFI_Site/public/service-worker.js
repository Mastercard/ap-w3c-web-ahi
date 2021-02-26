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

let payment_request_event = undefined;
let payment_request_resolver = undefined;
var origin = "bankURL";
var methodName = `${origin}/pay`;

self.addEventListener('canmakepayment', function (e) {
    e.respondWith(true);
});

self.addEventListener('paymentrequest', function (e) {

    payment_request_event = e;

    payment_request_resolver = new PromiseResolver();
    e.respondWith(payment_request_resolver.promise);

    e.openWindow(methodName)
        .then(window_client => {
            if (window_client == null)
                payment_request_resolver.reject('Failed to open window');
        })
        .catch(function (err) {
            payment_request_resolver.reject(err);
        })
});

self.addEventListener('message', listener = function (e) {
    console.log('A message received:', e);
    if (e.data == "payment_app_window_ready") {
        sendPaymentRequest();
        return;
    }
    if (e.data.methodName) {
        payment_request_resolver.resolve(e.data);
    } else {
        payment_request_resolver.reject(e.data);
    }
});

function sendPaymentRequest() {
    if (!payment_request_event) return;
    let options = {
        includeUncontrolled: false,
        type: 'window'
    };
    clients.matchAll(options).then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
            clientList[i].postMessage({
                total: payment_request_event['total'],
                methodData: payment_request_event['methodData'],
                requestBillingAddress: !!payment_request_event['requestBillingAddress'],
                paymentRequestId: payment_request_event['paymentRequestId']
            });
        }
    });
}

function PromiseResolver() {
    /** @private {function(T=): void} */
    this.resolve_;

    /** @private {function(*=): void} */
    this.reject_;

    /** @private {!Promise<T>} */
    this.promise_ = new Promise(function (resolve, reject) {
        this.resolve_ = resolve;
        this.reject_ = reject;
    }.bind(this));
}

PromiseResolver.prototype = {
    /** @return {!Promise<T>} */
    get promise() {
        return this.promise_;
    },

    /** @return {function(T=): void} */
    get resolve() {
        return this.resolve_;
    },

    /** @return {function(*=): void} */
    get reject() {
        return this.reject_;
    },
};