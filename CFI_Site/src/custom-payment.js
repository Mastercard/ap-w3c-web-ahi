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
import * as utils from "./util";
import { getRegistrationStatus } from "./cfi";

export async function getServiceWorkerStatus() {
    const registration = await navigator.serviceWorker.getRegistration("../service-worker.js");
    let action = (!!registration) ? 'register' : 'unregister';
    if (action === 'unregister') {
        utils.showHideButtons(action, true);
    } else {
        utils.showHideButtons(action, !!registration);
    }

}

export async function installWebApp() {
    utils.hideContent();
    utils.showInstalling();

    // Check if service worker is available 
    if ('serviceWorker' in navigator) {
        try {
            // Register a service worker
            const registration = await navigator.serviceWorker.register("../service-worker.js");

            // Check if Payment Handler is available
            if (!registration.paymentManager) return;

            addInstruments(registration);

            setTimeout(function () {
                utils.hideInstalling();
                utils.showContent();
                $(".success").text('Service Worker Installed');
                utils.fadeOut(".success");
                getRegistrationStatus();
                utils.setAppCookie();
            }, 2000);
        } catch (e) {
            utils.hideInstalling();
            utils.showContent();
            $('.failure').html("Failed To Install Service Worker. Try installing again.");
            if (!e.stack) {
                $('.errCode').html('Error Code:' + e.code);
                $('.errMsg').html('Error Message:' + e.message);
            } else {
                $('.errStack').html(e.stack);
            }
        }
    } else {
        utils.hideInstalling();
        utils.showContent();
        $('.failure').html("Service workers are disabled or not supported by this browser.");
    }
}

export async function uninstallWebApp() {
    utils.hideContent();
    utils.showInstalling();

    // Check if service worker is available 
    if ('serviceWorker' in navigator) {
        try {
            var registration = await navigator.serviceWorker.getRegistration("../service-worker.js");
            await registration.unregister();

            setTimeout(function () {
                utils.hideInstalling();
                utils.showContent();
                $(".success").text('Service Worker Uninstalled');
                utils.fadeOut(".success");
                getRegistrationStatus();
                utils.deleteAppCookie();
            }, 2000);
        } catch (e) {
            utils.hideInstalling();
            utils.showContent();
            $('.failure').html("Failed To Uninstall Service Worker. Try uninstalling again.");
            if (!e.stack) {
                $('.errCode').html('Error Code:' + e.code);
                $('.errMsg').html('Error Message:' + e.message);
            } else {
                $('.errStack').html(e.stack);
            }
        }
    } else {
        utils.hideInstalling();
        utils.showContent();
        $('.failure').html("Service workers are disabled or not supported by this browser.");
    }
}

function addInstruments(registration) {
    return Promise.all([
        registration.paymentManager.instruments.set(
            // Payment instrument key can be any string.
            "ghobank-payment-method",
            // Payment instrument detail
            {
                name: `My ${utils.bankName} Custom Payment Account`,
                enabledMethods: [`${utils.paymentHandler}/mcpba`],
                // This parameter will be used to match against the PaymentRequest.
                method: `${utils.paymentHandler}/mcpba`
            }),
    ]);
}