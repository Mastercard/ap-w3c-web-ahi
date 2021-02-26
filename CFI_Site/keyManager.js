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
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const keyPath = './certificates';
//using cypher block chain mode with aes
const algorithm = 'aes-256-cbc';
// for aes 256 iv length is 16 bytes
const IV_LENGTH = 16;


class KeyManager {
    constructor() {
        this.SymmetricKey = this.generateSymmetricKey();
        this.signature = null;
        this.loadSignature();
        this.publickey = null;
    }
    /*
    * Encrypt the Payload using Symmetric Key
    */
    encrypt(data, key) {

        const encryptPayload = this.encryptPayload(data);
        const encryptedKey = this.encryptSymmetricKey(this.SymmetricKey, key);
        return `${encryptedKey}:${encryptPayload}`;
    }

    /*
    * Encrypt the Payload 
    */
    encryptPayload(payload) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(this.SymmetricKey, 'hex'), iv);
        let encrypted = cipher.update(payload);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    /*
    * Encrypt the Symmetric key 
    */
    encryptSymmetricKey(data, pubKey) {
        const buffer = Buffer.from(data);
        const encrypted = crypto.publicEncrypt({
            key: pubKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, buffer);
        return encrypted.toString('base64');
    }
    /*
    * Generate the random Symmetric key
    */
    generateSymmetricKey() {
        return crypto.randomBytes(256 / 8).toString('hex');
    }

    /*
    * Get the Zapp Signature
    */
    getZappSignature() {
        return this.signature;
    }

    /*
    * Get the Public key content to unsign the signed Payload
    */
    loadSignature() {
        const _this = this;
        fs.readFile(path.resolve(keyPath + '/publickey.crt'), function (error, data) {
            if (error) {
                log.error('Failed to load the private key file');
            }
            _this.signature = data;
        });
    }

    /*
    * Decrypt the signed payload using the public key
    */
    decryptWithPublicKey(data) {
        const buffer = Buffer.from(data, 'base64');
        const _this = this;
        let decrypted = null;
        try {
            decrypted = crypto.publicDecrypt({
                key: _this.signature,
                padding: crypto.constants.RSA_PKCS1_PADDING
            }, buffer);
        } catch (e) {
            return null;
        }
        return decrypted.toString();
    }

    /*
    * Verrify the Payload after decrypting the signed payload
    */
    verifySign(data) {
        const buffer = Buffer.from(data, 'base64');
        const hash = buffer.toString('utf-8');
        const md5Hash = hash.split(':')[0];
        const encryptedHash = hash.split(':')[1];
        const decryptedHash = this.decryptWithPublicKey(encryptedHash);
        if (md5Hash == decryptedHash) {
            return true;
        } else {
            return false;
        }
    }

}

module.exports = KeyManager;