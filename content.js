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
	
	addObserver: function(node, callback, opts) {
		/* Adds an observer (for element mutations) to the 'node'.
		 * The callback is fired with the node mutated (can be a child) as the first argument.
		 * The second argument is an object with observer set, the callback function may choose
		 * to remove the observe using (2nd).observer.disconnect();
		 * 
		 * callback can be a function, on which added nodes will be called.
		 * callback can be an object with members (add, remove), on which the respective action is called.
		 */
		if (typeof callback != 'function' && typeof callback != 'object') {
			S().log("(error) addObserver: callback is not a function/object.");
			return;
		}
		if (node == undefined) {
			S().log("(error) addObserver: node is undefined.");
			return;
		}

		/* Create the observer */
		var observer = new WebKitMutationObserver(function(mutations) {
			/* Create a callback wrapper for each type of mutation. */
			var methods = (typeof callback === "function") ? {add: callback} : callback;

			mutations.forEach(function(mutation) {
				/* Check nodes mutated when event fires. */
				if ("add" in methods) {
					for (var i = 0; i < mutation.addedNodes.length; i++)
						methods.add(mutation.addedNodes[i], {observer: observer});
				}
				if ("remove" in methods) {
					for (var i = 0; i < mutation.removedNodes.length; i++)
						methods.remove(mutation.removedNodes[i], {observer: observer});
				}
			});
		});
		
		/* Allow the caller to pass additional options. */
		/* A subtree: true option will search all children and grandchildren for
		 * mutation events, much more resource intensive.
		 */
		opts = (arguments.length == 3) ? opts : {};
		opts.childList = true;
		/* Start observing */
		observer.observe(node, opts);
		return observer;
	},
	
	addListener: function(node, name, handler) {
		if (node.addEventListener)
			node.addEventListener(name, handler, false);
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
		var objects;
		try {
			objects = node.getElementsByClassName(name);
		}
		catch (err) {
			S().log(err);
			objects = [];
		}
		return objects;
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
		button.style.cursor = 'pointer';
		S().addListener(button, 'click', S().UI.actions.encryptButtonClick);
		
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
		S().log("encryptButton clicked.");
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