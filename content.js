/* Site Seruro API, requires a client-specific (seruro)  */

var seruro = {
	loaded: false,
	
	/* Abstraction for writing to the console. */
	log: function(msg) {
		console.log("Seruro: " + msg);
		return;
	},
	
	init: function() {
		seruro.client.init();
		console.log('Seruro: initialized.');
		
		//seruro.client.startWatchers();
		return;
	},
	
	addObserver: function(node, callback) {
		/* Adds an observer (for element mutations) to the 'node'.
		 * The callback is fired with the node mutated (can be a child) as the first argument.
		 * The second argument is an object with observer set, the callback function may choose
		 * to remove the observe using (2nd).observer.disconnect();
		 */
		if (typeof callback != 'function') {
			S().log("(error) addObserver: " + callback + 'is not a function.');
			return;
		}
		if (node == undefined) {
			S().log("(error) addObserver: node is undefined.");
			return;
		}
		
		/* Create the observer */
		var observer = new WebKitMutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				/* Check nodes mutated when event fires. */
				for (var i = 0; i < mutation.addedNodes.length; i++)
					callback(mutation.addedNodes[i], {observer: observer});
			});
		});
		/* Start observing */
		observer.observe(node, {childList: true});
		return observer;
	},
	
	/* Basic getter, setter methods. */
	getElement: function(name) {
		return seruro.client.elements[name];
	},
	setElement: function(name, value) {
		seruro.client.elements[name] = value;
		return;
	},
	getClasses: function(node, name) {
		return node.getElementsByClassName(name);
	},
	get: function(name) {
		return document.getElementById(name);
	},
};

/* Construct and return UI components. */
seruro.UI = {
	encryptButton: function() {
		var button = document.createElement('img');
		button.src = chrome.extension.getURL('images/icon.png');
		button.style.float = 'right';
		button.style.cursor = 'hand';
		button.onClick = seruro.UI.actions.encryptButtonClick;
		
		return button;
	},
	
	signButton: function() {
		
	},
	
	validCert: function() {
		
	},
	
	invalidCert: function() {
		
	},
	
	successAlert: function() {
		
	},
	
	failureAlert: function() {
		
	},
	
	findCertModal: function() {
		
	}
};

/* Actions performed by the UI components. */
seruro.UI.actions = {
	encryptButtonClick: function(button) {
		console.log(this);
		return;
	}
};

/* Skel */
seruro.client = {};

/* Simple reference */
function S() { return seruro; }

/* Communications */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	/* Might want to match extension id */
	console.log(request);
	if (request.event == "init") {
		/* Sent once the client code has been injected. */
		seruro.init();
	}
	return;
});