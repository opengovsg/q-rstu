import React from 'react';
import { WebView } from 'react-native-webview';

/**
 * 
 * @param {*} onMessage: callback after received response, error of Google captcha or when user cancel
 * @param {*} siteKey: your site key of Google captcha
 * @param {*} style: custom style
 * @param {*} url: base url
 * @param {*} languageCode: can be found at https://developers.google.com/recaptcha/docs/language
 * @param {*} cancelButtonText: title of cancel button
 */
const ReCaptcha = ({ onMessage, siteKey, style, url, languageCode }) => {
	const webViewContent = siteKey => {
		const originalForm =
			`<!DOCTYPE html>
			<html>
			<head> 
				<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="X-UA-Compatible" content="ie=edge"> 
				<script src="https://recaptcha.google.com/recaptcha/api.js?explicit&hl=${languageCode || 'en'}"></script> 
				<script type="text/javascript"> 
				var onloadCallback = function() { };  
				var onDataCallback = function(response) { 
					window.ReactNativeWebView.postMessage(response);
				};  
				var onCancel = function() {  
					window.ReactNativeWebView.postMessage("cancel"); 
				}
				var onDataExpiredCallback = function(error) {  window.postMessage("expired"); };  
				var onDataErrorCallback = function(error) {  window.postMessage("error"); } 
        </script> 
			</head>
			<body> 
				<div id="captcha">
					<div style="text-align: center; padding-top: 100px;">
					<div class="g-recaptcha" style="display: inline-block; height: auto;" 
						data-sitekey="${siteKey}" data-callback="onDataCallback"  
						data-expired-callback="onDataExpiredCallback"  
						data-error-callback="onDataErrorCallback">
					</div>
					</div>
				</div>
			</body>
			</html>`;
		return originalForm;
	};
	return (
		<WebView
			originWhitelist={['*']}
			mixedContentMode={'always'}
			onMessage={onMessage}
			javaScriptEnabled
			automaticallyAdjustContentInsets
			style={[style]}
			source={{
				html: webViewContent(siteKey),
				baseUrl: `${url}`,
			}}
		/>
	);
}

export default ReCaptcha;