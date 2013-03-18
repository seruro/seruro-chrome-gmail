/* Site Seruro API, requires a client-specific (seruro)  */

var seruro = {
	loaded: false,
	init: function() {
		seruro.client.init();
		console.log('Seruro initialized.');
	}		
};

/* Skel */
seruro.client = {};

/* Communications */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	/* Might want to match extension id */
	console.log(request);
	seruro.init();
});