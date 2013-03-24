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
		
		hacks();
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
		var methods, observer;
		if (typeof callback !== 'function' && typeof callback !== 'object') {
			S().log("(error) addObserver: callback is not a function/object.");
			return;
		}
		if (node === undefined) {
			S().log("(error) addObserver: node is undefined.");
			return;
		}

		/* Create a callback wrapper for each type of mutation. */
		methods = (typeof callback === "function") ? {add: callback} : callback;
		/* Create the observer */
		observer = new WebKitMutationObserver(function(mutations) {
			/* Take optional parameters, but create object so the observer attack. */
			params = (typeof params === 'object') ? params : {};
			params.observer = observer;
			
			mutations.forEach(function(mutation) {
				var i;
				/* Check nodes mutated when event fires. */
				if (methods.add !== undefined) {
					for (i = 0; i < mutation.addedNodes.length; i++)
						methods.add(mutation.addedNodes[i], params);
				}
				if (methods.remove !== undefined) {
					for (i = 0; i < mutation.removedNodes.length; i++)
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
	
	addRecipient: function(person, message) {
		/* Add a recipient to a message. */
		
		S().messages[message].recipients.push(person);
		return;
	},
	
	removeRecipient: function(address, message) {
		var newList = [];
		for (var i = 0; i < S().messages[message].recipients.length; i++) {
			if (address != S().messages[message].recipients[i].address)
				newList.push(S().messages[message].recipients[i]);
		}
		/* Update UI if the contact list is empty. */
		if (newList.length === 0)
			S().UI.actions.disableEncrypt(message);
		S().messages[message].recipients = newList;
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
	}
};

/* Construct and return UI components. */
seruro.UI = {
	encryptButton: function(message) {
		/* Shown on the UI, a click will toggle the message to be encrypted. */
		
		var button = $("<img />", {
			click: function() {
				S().UI.actions.encryptButtonClick(this, message);
			},
			css: { "float": "right", "cursor": "pointer" },
			src: chrome.extension.getURL('images/glyphicons_unlock.png')
		});
		S().messages[message].button = button;
		return button;
	},
	
	signButton: function() {
		
	},
	
	validCert: function() {
		/* Shows next to a recipient person who has a valid cert. */
		
		return $("<img />", {
			click: function() {
				S().UI.actions.validCertClick();
			},
			css: {"height": "14px", "width": "14px", "paddingTop": "2px"},
			src: chrome.extension.getURL("images/glyphicons_good.png")
		});
	},
	
	invalidCert: function() {
		/* Shows next to a recipient person without a cert, or with an invalid cert. */
		return $("<img />", {
			click: function() {
				S().UI.actions.invalidCertClick();
			},
			css: {"height": "14px", "width": "14px", "paddingTop": "2px"},
			src: chrome.extension.getURL("images/glyphicons_bad.png")
		});
	},
	
	successAlert: function() {
		
	},
	
	failureAlert: function() {
		
	},
	
	findCertModal: function() {
		
	},
	
	needCerts: function (message) {
		/* Return an error, or open findCertModal */
	}
};

/* Actions performed by the UI components. */
seruro.UI.actions = {
	encryptButtonClick: function(button, message) {
		/* The user has requested that their message be encrypted. */
		/* Check is data is already encrypted */
		if ($(button).attr('serurolocked') == "true") {
			S().UI.actions.disableEncrypt(message);
			return;
		}

		/* The encrypt operation should be performed now? */
		for (var i = 0; i < S().messages[message].recipients.length; i++) {
			if (! S().server.haveCert(S().messages[message].recipients[i].address))
				return S().UI.needCerts(message);
		}
		S().UI.actions.enableEncrypt(message);
	},
	
	disableEncrypt: function(message) {
		/* Backup from stored message content */
		/* Update visual */
		var button = S().messages[message].button;
		$(button).attr({
			src: chrome.extension.getURL("images/glyphicons_unlock.png"),
			seruroLocked: false
		});
		return;
	},
	
	enableEncrypt: function(message) {
		/* Store message content */
		/* Encrypt composed message */
		/* Update visual */
		var button = S().messages[message].button;
		$(button).attr({
			src: chrome.extension.getURL("images/glyphicons_lock.png"),
			seruroLocked: true
		});
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
	this.button = null;
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
	
	sign: function(message, self) {
		
	},
	
	verify: function(message, sender) {
		
	},
	
	/* Ask server to encrypt a message. */
	encrypt: function(message, recipients) {
		return false;
	},
	
	decrypt: function(message, self) {
		
	}
};


/* Simple reference */
function S(selector, value) { 
	/* Quick access to element names. */
	
	if (arguments.length === 2) {
		seruro.client.elements[selector] = value;
		return;
	} else if (arguments.length === 1) {
		if (seruro.client.elements[selector] === undefined) {
			seruro.error("elements[" + selector + "] does not exist");
			return '';
		}
		return seruro.client.elements[selector];
	}
	return seruro;
}

function hacks() {
	/* Faking it */
	(function(s) { 
		s.server.certs['dave.anthony@live.com'] = {};
		s.server.certs['cefeiner@gmail.com'] = {};
	})(seruro);

	(function ($) {
		$.fn.hasClassOld = $.fn.hasClass;
		$.fn.hasClass = function (selector, special) {
			if (arguments.length === 2 && special === true) {
				selector = selector.replace(/\./g, ' ').trim();
			}
			var result = this.hasClassOld(selector);
			return result;
		};
	}(jQuery));
}


/* Communications */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	/* Might want to match extension id */
	if (request.event == "init") {
		/* Sent once the client code has been injected. */
		seruro.init();
	}
	return;
});