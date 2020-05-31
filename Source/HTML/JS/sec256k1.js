/*
 * @project: TERA
 * @version: Development (beta)
 * @copyright: Yuriy Ivanov 2017-2019 [progr76@gmail.com]
 * @license: MIT (not for evil)
 * Web: http://terafoundation.org
 * GitHub: https://github.com/terafoundation/wallet
 * Twitter: https://twitter.com/terafoundation
 * Telegram: https://web.telegram.org/#/im?p=@terafoundation
*/

"use strict";
var der = require("./der"), toString = Object.prototype.toString, exports = {}, assert = exports;
exports.isArray = function (e,s)
{
    if(!Array.isArray(e))
        throw TypeError(s);
}, exports.isBoolean = function (e,s)
{
    if("[object Boolean]" !== toString.call(e))
        throw TypeError(s);
}, exports.isBuffer = function (e,s)
{
    if(!Buffer.isBuffer(e))
        throw TypeError(s);
}, exports.isFunction = function (e,s)
{
    if("[object Function]" !== toString.call(e))
        throw TypeError(s);
}, exports.isNumber = function (e,s)
{
    if("[object Number]" !== toString.call(e))
        throw TypeError(s);
}, exports.isObject = function (e,s)
{
    if("[object Object]" !== toString.call(e))
        throw TypeError(s);
}, exports.isBufferLength = function (e,s,r)
{
    if(e.length !== s)
        throw RangeError(r);
}, exports.isBufferLength2 = function (e,s,r,_)
{
    if(e.length !== s && e.length !== r)
        throw RangeError(_);
}, exports.isLengthGTZero = function (e,s)
{
    if(0 === e.length)
        throw RangeError(s);
}, exports.isNumberInInterval = function (e,s,r,_)
{
    if(e <= s || r <= e)
        throw RangeError(_);
};
var messages = {COMPRESSED_TYPE_INVALID:"compressed should be a boolean", EC_PRIVATE_KEY_TYPE_INVALID:"private key should be a Buffer",
    EC_PRIVATE_KEY_LENGTH_INVALID:"private key length is invalid", EC_PRIVATE_KEY_RANGE_INVALID:"private key range is invalid",
    EC_PRIVATE_KEY_TWEAK_ADD_FAIL:"tweak out of range or resulting private key is invalid", EC_PRIVATE_KEY_TWEAK_MUL_FAIL:"tweak out of range",
    EC_PRIVATE_KEY_EXPORT_DER_FAIL:"couldn't export to DER format", EC_PRIVATE_KEY_IMPORT_DER_FAIL:"couldn't import from DER format",
    EC_PUBLIC_KEYS_TYPE_INVALID:"public keys should be an Array", EC_PUBLIC_KEYS_LENGTH_INVALID:"public keys Array should have at least 1 element",
    EC_PUBLIC_KEY_TYPE_INVALID:"public key should be a Buffer", EC_PUBLIC_KEY_LENGTH_INVALID:"public key length is invalid", EC_PUBLIC_KEY_PARSE_FAIL:"the public key could not be parsed or is invalid",
    EC_PUBLIC_KEY_CREATE_FAIL:"private was invalid, try again", EC_PUBLIC_KEY_TWEAK_ADD_FAIL:"tweak out of range or resulting public key is invalid",
    EC_PUBLIC_KEY_TWEAK_MUL_FAIL:"tweak out of range", EC_PUBLIC_KEY_COMBINE_FAIL:"the sum of the public keys is not valid", ECDH_FAIL:"scalar was invalid (zero or overflow)",
    ECDSA_SIGNATURE_TYPE_INVALID:"signature should be a Buffer", ECDSA_SIGNATURE_LENGTH_INVALID:"signature length is invalid",
    ECDSA_SIGNATURE_PARSE_FAIL:"couldn't parse signature", ECDSA_SIGNATURE_PARSE_DER_FAIL:"couldn't parse DER signature", ECDSA_SIGNATURE_SERIALIZE_DER_FAIL:"couldn't serialize signature to DER format",
    ECDSA_SIGN_FAIL:"nonce generation function failed or private key is invalid", ECDSA_RECOVER_FAIL:"couldn't recover public key from signature",
    MSG32_TYPE_INVALID:"message should be a Buffer", MSG32_LENGTH_INVALID:"message length is invalid", OPTIONS_TYPE_INVALID:"options should be an Object",
    OPTIONS_DATA_TYPE_INVALID:"options.data should be a Buffer", OPTIONS_DATA_LENGTH_INVALID:"options.data length is invalid",
    OPTIONS_NONCEFN_TYPE_INVALID:"options.noncefn should be a Function", RECOVERY_ID_TYPE_INVALID:"recovery should be a Number",
    RECOVERY_ID_VALUE_INVALID:"recovery should have value between -1 and 4", TWEAK_TYPE_INVALID:"tweak should be a Buffer", TWEAK_LENGTH_INVALID:"tweak length is invalid"};

function initCompressedValue(e,s)
{
    return void 0 === e ? s : (assert.isBoolean(e, messages.COMPRESSED_TYPE_INVALID), e);
};
module.exports = function (E)
{
    return {privateKeyVerify:function (e)
        {
            return assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), 32 === e.length && E.privateKeyVerify(e);
        }, privateKeyExport:function (e,s)
        {
            assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(e, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            s = initCompressedValue(s, !0);
            var r = E.privateKeyExport(e, s);
            return der.privateKeyExport(e, r, s);
        }, privateKeyImport:function (e)
        {
            if(assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), (e = der.privateKeyImport(e)) && 32 === e.length && E.privateKeyVerify(e))
                return e;
            throw new Error(messages.EC_PRIVATE_KEY_IMPORT_DER_FAIL);
        }, privateKeyNegate:function (e)
        {
            return assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(e, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            E.privateKeyNegate(e);
        }, privateKeyModInverse:function (e)
        {
            return assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(e, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            E.privateKeyModInverse(e);
        }, privateKeyTweakAdd:function (e,s)
        {
            return assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(e, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            assert.isBuffer(s, messages.TWEAK_TYPE_INVALID), assert.isBufferLength(s, 32, messages.TWEAK_LENGTH_INVALID), E.privateKeyTweakAdd(e,
            s);
        }, privateKeyTweakMul:function (e,s)
        {
            return assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(e, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            assert.isBuffer(s, messages.TWEAK_TYPE_INVALID), assert.isBufferLength(s, 32, messages.TWEAK_LENGTH_INVALID), E.privateKeyTweakMul(e,
            s);
        }, publicKeyCreate:function (e,s)
        {
            return assert.isBuffer(e, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(e, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            s = initCompressedValue(s, !0), E.publicKeyCreate(e, s);
        }, publicKeyConvert:function (e,s)
        {
            return assert.isBuffer(e, messages.EC_PUBLIC_KEY_TYPE_INVALID), assert.isBufferLength2(e, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID),
            s = initCompressedValue(s, !0), E.publicKeyConvert(e, s);
        }, publicKeyVerify:function (e)
        {
            return assert.isBuffer(e, messages.EC_PUBLIC_KEY_TYPE_INVALID), E.publicKeyVerify(e);
        }, publicKeyTweakAdd:function (e,s,r)
        {
            return assert.isBuffer(e, messages.EC_PUBLIC_KEY_TYPE_INVALID), assert.isBufferLength2(e, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID),
            assert.isBuffer(s, messages.TWEAK_TYPE_INVALID), assert.isBufferLength(s, 32, messages.TWEAK_LENGTH_INVALID), r = initCompressedValue(r,
            !0), E.publicKeyTweakAdd(e, s, r);
        }, publicKeyTweakMul:function (e,s,r)
        {
            return assert.isBuffer(e, messages.EC_PUBLIC_KEY_TYPE_INVALID), assert.isBufferLength2(e, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID),
            assert.isBuffer(s, messages.TWEAK_TYPE_INVALID), assert.isBufferLength(s, 32, messages.TWEAK_LENGTH_INVALID), r = initCompressedValue(r,
            !0), E.publicKeyTweakMul(e, s, r);
        }, publicKeyCombine:function (e,s)
        {
            assert.isArray(e, messages.EC_PUBLIC_KEYS_TYPE_INVALID), assert.isLengthGTZero(e, messages.EC_PUBLIC_KEYS_LENGTH_INVALID);
            for(var r = 0; r < e.length; ++r)
                assert.isBuffer(e[r], messages.EC_PUBLIC_KEY_TYPE_INVALID), assert.isBufferLength2(e[r], 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID);
            return s = initCompressedValue(s, !0), E.publicKeyCombine(e, s);
        }, signatureNormalize:function (e)
        {
            return assert.isBuffer(e, messages.ECDSA_SIGNATURE_TYPE_INVALID), assert.isBufferLength(e, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID),
            E.signatureNormalize(e);
        }, signatureExport:function (e)
        {
            assert.isBuffer(e, messages.ECDSA_SIGNATURE_TYPE_INVALID), assert.isBufferLength(e, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID);
            var s = E.signatureExport(e);
            return der.signatureExport(s);
        }, signatureImport:function (e)
        {
            assert.isBuffer(e, messages.ECDSA_SIGNATURE_TYPE_INVALID), assert.isLengthGTZero(e, messages.ECDSA_SIGNATURE_LENGTH_INVALID);
            var s = der.signatureImport(e);
            if(s)
                return E.signatureImport(s);
            throw new Error(messages.ECDSA_SIGNATURE_PARSE_DER_FAIL);
        }, signatureImportLax:function (e)
        {
            assert.isBuffer(e, messages.ECDSA_SIGNATURE_TYPE_INVALID), assert.isLengthGTZero(e, messages.ECDSA_SIGNATURE_LENGTH_INVALID);
            var s = der.signatureImportLax(e);
            if(s)
                return E.signatureImport(s);
            throw new Error(messages.ECDSA_SIGNATURE_PARSE_DER_FAIL);
        }, sign:function (e,s,r)
        {
            assert.isBuffer(e, messages.MSG32_TYPE_INVALID), assert.isBufferLength(e, 32, messages.MSG32_LENGTH_INVALID), assert.isBuffer(s,
            messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(s, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID);
            var _ = null, t = null;
            return void 0 !== r && (assert.isObject(r, messages.OPTIONS_TYPE_INVALID), void 0 !== r.data && (assert.isBuffer(r.data, messages.OPTIONS_DATA_TYPE_INVALID),
            assert.isBufferLength(r.data, 32, messages.OPTIONS_DATA_LENGTH_INVALID), _ = r.data), void 0 !== r.noncefn && (assert.isFunction(r.noncefn,
            messages.OPTIONS_NONCEFN_TYPE_INVALID), t = r.noncefn)), E.sign(e, s, t, _);
        }, verify:function (e,s,r)
        {
            return assert.isBuffer(e, messages.MSG32_TYPE_INVALID), assert.isBufferLength(e, 32, messages.MSG32_LENGTH_INVALID), assert.isBuffer(s,
            messages.ECDSA_SIGNATURE_TYPE_INVALID), assert.isBufferLength(s, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID), assert.isBuffer(r,
            messages.EC_PUBLIC_KEY_TYPE_INVALID), assert.isBufferLength2(r, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID), E.verify(e,
            s, r);
        }, recover:function (e,s,r,_)
        {
            return assert.isBuffer(e, messages.MSG32_TYPE_INVALID), assert.isBufferLength(e, 32, messages.MSG32_LENGTH_INVALID), assert.isBuffer(s,
            messages.ECDSA_SIGNATURE_TYPE_INVALID), assert.isBufferLength(s, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID), assert.isNumber(r,
            messages.RECOVERY_ID_TYPE_INVALID), assert.isNumberInInterval(r,  - 1, 4, messages.RECOVERY_ID_VALUE_INVALID), _ = initCompressedValue(_,
            !0), E.recover(e, s, r, _);
        }, ecdh:function (e,s)
        {
            return assert.isBuffer(e, messages.EC_PUBLIC_KEY_TYPE_INVALID), assert.isBufferLength2(e, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID),
            assert.isBuffer(s, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(s, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            E.ecdh(e, s);
        }, ecdhUnsafe:function (e,s,r)
        {
            return assert.isBuffer(e, messages.EC_PUBLIC_KEY_TYPE_INVALID), assert.isBufferLength2(e, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID),
            assert.isBuffer(s, messages.EC_PRIVATE_KEY_TYPE_INVALID), assert.isBufferLength(s, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID),
            r = initCompressedValue(r, !0), E.ecdhUnsafe(e, s, r);
        }};
}, global.SIGN_LIB = module.exports;
