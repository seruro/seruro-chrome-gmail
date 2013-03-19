/* Site Seruro API, requires a client-specific (seruro)  */

var seruro = {
	loaded: false,
	init: function() {
		seruro.client.init();
		console.log('Seruro initialized.');
		
		//seruro.client.startWatchers();
	}		
};

/* Skel */
seruro.client = {};

/* Communications */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	/* Might want to match extension id */
	console.log(request);
	if (request.event == "init") {
		/* Sent once the client code has been injected. */
		seruro.init();
	}
});