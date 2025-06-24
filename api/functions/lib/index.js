"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = void 0;
const app_1 = require("firebase-admin/app");
const v2_1 = require("firebase-functions/v2");
// Firebase Admin初期化
(0, app_1.initializeApp)();
// グローバル設定
(0, v2_1.setGlobalOptions)({
    region: 'asia-northeast1', // 東京リージョン
    maxInstances: 10,
});
// AI関連の関数
__exportStar(require("./ai"), exports);
// ユーザー関連の関数
__exportStar(require("./users"), exports);
// イベント関連の関数
__exportStar(require("./events"), exports);
// 店舗関連の関数
__exportStar(require("./stores"), exports);
// Hello World関数（テスト用）
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
exports.helloWorld = (0, https_1.onRequest)((request, response) => {
    firebase_functions_1.logger.info('Hello logs!', { structuredData: true });
    response.json({
        message: 'Hello from Collect Friends API!',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
//# sourceMappingURL=index.js.map