/* Site Seruro API, requires a client-specific (seruro)  */

var seruro = {
	loaded: false,
	initialized: false,
	
	messages: {},
	messageCounter: 0,
	
	/* Abstraction for writing to the console. */
	log: function(msg) {
		console.log("Seruro: " + msg);
		return;
	},
	
	error: function(msg) {
		S().log("(error) " + msg);
		return false;
	},
	
	init: function() {
		if (S().initialized) return;
		S().initialized = true;
		
		S().client.init();
		S().log('initialized.');
		return;
	},
	
	/* Question: if a node is removed, and there are mutation observers attached to it or its
	 * subtree, will the mutation observers also be removed?
	 */
	addObserver: function(node, callback, params, opts) {
		/* Adds an observer (for element mutations) to the 'node'.
		 * The callback is fired with the node mutated (can be a child) as the first argument.
		 * The second argument is an object with observer set, the callback function may choose
		 * to remove the observe using (2nd).observer.disconnect();
		 * 
		 * @callback can be a function, on which added nodes will be called.
		 * @callback can be an object with members (add, remove), on which the respective action is called.
		 * @params is an optional object passed to the callbacks.
		 * @opts is an optional object added to the observe method options.
		 */
		if (typeof callback != 'function' && typeof callback != 'object') {
			S().log("(error) addObserver: callback is not a function/object.");
			return;
		}
		if (node == undefined) {
			S().log("(error) addObserver: node is undefined.");
			return;
		}

		/* Create a callback wrapper for each type of mutation. */
		var methods = (typeof callback === "function") ? {add: callback} : callback;
		/* Create the observer */
		var observer = new WebKitMutationObserver(function(mutations) {
			/* Take optional parameters, but create object so the observer attack. */
			params = (typeof params === 'object') ? params : {};
			params.observer = observer;
			
			mutations.forEach(function(mutation) {
				/* Check nodes mutated when event fires. */
				if ("add" in methods) {
					for (var i = 0; i < mutation.addedNodes.length; i++)
						methods.add(mutation.addedNodes[i], params);
				}
				if ("remove" in methods) {
					for (var i = 0; i < mutation.removedNodes.length; i++)
						methods.remove(mutation.removedNodes[i], params);
				}
			});
		});
		
		/* Allow the caller to pass additional options. */
		/* A subtree: true option will search all children and grandchildren for
		 * mutation events, much more resource intensive.
		 */
		opts = (arguments.length == 4) ? opts : {};
		opts.childList = true;
		/* Start observing */
		observer.observe(node, opts);
		return observer;
	},
	
	addListener: function(node, name, handler) {
		if (node.addEventListener)
			node.addEventListener(name, handler, false);
	},
	
	addMessage: function(node) {
		/* Add a potential message to the 'actual' message queue, assign an index, and
		 * return to caller. 
		 */
		
		/* Get next ID and increment. */
		var id = S().messageCounter++;
		/* Create new message object. */
		var message = new Message();
		/* Set the node (compose) of the message. */
		message.node = node;
		
		/* Add the message to the messages object (acting as a list). */
		S().messages[id] = message;
		return id;
	},
	
	addRecipient: function(node, message) {
		/* Add a recipient to a message. */
		
		S().messages[message].recipients.push(node);
		return;
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
		/* Shown on the UI, a click will toggle the message to be encrypted. */
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
		/* Shows next to a recipient person who has a valid cert. */
		var icon = document.createElement('img');
		icon.src = chrome.extension.getURL('images/glyphicons_good.png');
		icon.style.height = '14px';
		icon.style.width = '14px';
		icon.style.paddingTop = '2px';
		S().addListener(icon, 'click', S().UI.actions.validCertClick);
		
		return icon;
	},
	
	invalidCert: function() {
		/* Shows next to a recipient person without a cert, or with an invalid cert. */
		var icon = document.createElement('img');
		icon.src = chrome.extension.getURL('images/glyphicons_bad.png');
		icon.style.height = '14px';
		icon.style.width = '14px';
		icon.style.paddingTop = '2px';
		S().addListener(icon, 'click', S().UI.actions.invalidCertClick);
		
		return icon;
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
	},
	
	validCertClick: function(button) {
		
		return;
	},
	
	invalidCertClick: function(button) {
		
		return;
	}
};

/* Object message template. */
function Message () {
	this.sender = null;
	/* A list of (node, name) pairs. */
	this.recipients = [];
	this.content = null;
	/* Compose node */
	this.node = null;
};

/* Skel */
seruro.client = {};

/* Communication to server (middleware) application. */
seruro.server = {
	/* Local certs (in extension context, retrieved from server this session). */
	certs: {},
	
	haveCert: function(address) {
		/* Implements a local caching of certs, may want to ask thick-client every time. */
		return (address in S().server.certs);
	},
	
	/* Ask server to encrypt a message. */
	encrypt: function(message) {
		
	}
};

/* Faking it */
(function(s) { 
	s.server.certs['dave.anthony@live.com'] = {};
	s.server.certs['cefeiner@gmail.com'] = {};
})(seruro);

/* Simple reference */
function S() { return seruro; }

/* Communications */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	/* Might want to match extension id */
	if (request.event == "init") {
		/* Sent once the client code has been injected. */
		seruro.init();
	}
	return;
});