/* Site Seruro API, requires a client-specific (seruro)  */

var seruro = {
	/* The client has finished loading all required scripts. */
	loaded: false,
	/* The client's initialize function has been called. */
	initialized: false,
	
	/* List of all messages in the compose state. */
	//messages: {},
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
				/* If searching for an attribute change, the type of mutation must be 'attributes' */
				if (methods.attr !== undefined && mutation.type == "attributes") {
					methods.attr(mutation.target, params);
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
	
	newMessage: function(node) {
		var message = new seruro.Message(node);
		message.id = seruro.messageCounter++;
		return message;
	},
	
	getRecipientIcon: function(person) {
		/* An icon next to the UI element for the recipient indicating certificate status. */
		if (typeof person !== 'object' || person.address === undefined) throw "invalid person";
		
		return (S().server.haveCert(person.address)) ? S().UI.validCert() : S().UI.invalidCert();
	},
	
	needCerts: function (options) {
		/* Return an error, or open findCertModal */
		if (typeof options !== 'object') {
			return S().error("needCerts: not overloaded for positional parameters.");
		}
		
		/* MUST have certs list. */
		//if (options.message === undefined) throw "invalid object";
		if (options.certs === undefined) throw "invalid object";
		
		/* The certs elements are recipients. */
		var names = [];
		for (var i = 0; i < options.certs.length; ++i) {
			names.push(S().UI.getContact(options.certs[i]));
		}
		S().log("needCerts: prompting cert search for " + names.join(", "));
		S().UI.failureAlert(S().lang.missingCertsError + names.join(", "), 
			S().UI.findCertModal, options);
	}
};

/* Construct and return UI components. */
seruro.UI = {	
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
	
	failureAlert: function(msg, acceptCallback, options) {
		/* Display 'msg' in an error dialog. 
		 * If acceptCallback is a function, display an <OK> and <Cancel> where OK invokes
		 * the callback with and optional object parameter of 'options'.
		 */
		var params = (arguments.length === 3) ? options : {};
		try {
			if (arguments.length > 1 && typeof acceptCallback === 'function') {
				S().log("failureAlert: prompting alert action.")
				bootbox.confirm(msg, function(result) {
					if (result === false)
						return;
					acceptCallback(options);
				});
			} else {
				S().log("failureAlert: displaying alert.");
				bootbox.alert(msg);
			}
		} catch (err) {
			return S().error("failureAlert: failed " + err);
		}
		return;
	},
	
	findCertModal: function(options) {
		/* Accepts an object parameter. */
		try {
			bootbox.alert("findCertModal");
		} catch (err) {
			return S().error("findCertModal: " + err);
		}
		return;
	},
	
	/* Helper format functions */
	getContact: function(recipient) {
		if (recipient.name === undefined) throw "invalid recipient";
		return recipient.name + "&nbsp;&lt;<b>" + recipient.address + "</b>&gt;";
	}
};

/* Actions performed by the UI components. */
seruro.UI.actions = {
	validCertClick: function(button) {
		
		return;
	},
	
	invalidCertClick: function(button) {
		
		return;
	}
};

/* Object message template. */
seruro.Message = function (node) {
	this.id = 0;
	this.sender = null;		/* The From (assuming each client may allow multiple. */
	this.recipients = [];	/* A list of (node, name) pairs. */
	this.content = null;	/* The message content. */
	this.node = node;		/* UI element for message. */
	this.button = null;		/* UI element for toggling encrypt. */
	
	this.setSender = function(sender) {
		this.sender = {name: "You", address: sender, node: null};
		if (! S().server.haveAddress(this.sender.address)) {
			this.disableEncrypt();
		} else {
			this.resetEncrypt();
		}
	};
	
	this.addRecipient = function (person) {
		/* Add a recipient to a message. */
		if (typeof person !== 'object' || person.address === undefined) throw "invalid person";
		S().log('addRecipient: ' + person.name + ' to message ' + this.id);
		
		/* Update the UI if the message was previously set to be encrypted */
		if (! S().server.haveCert(person.address)) {
			//S().UI.actions.disableEncrypt(message);
			this.disableEncrypt();
		}
		//S().messages[message].recipients.push(person);
		this.recipients.push(person);
		return;
	};
	
	this.removeRecipient = function (address) {
		var newList = [];
		/* Search the list and remove all instances of the recipient address. */
		/* This may not be intended, if clients support duplicate address, or if the address
		 * is duplicated across two fields (To/CC/BCC). */
		S().log("removeRecipient: " + address + " from message " + this.id);
		
		//for (var i = 0; i < S().messages[message].recipients.length; i++) {
		for (var i = 0; i < this.recipients.length; i++) {
			//if (address != S().messages[message].recipients[i].address)
			if (address != this.recipients[i].address)
				//newList.push(S().messages[message].recipients[i]);
				newList.push(this.recipients[i]);
		}
		
		/* Reset the encrypt status to 'reset' if contact list is empty.
		 * Otherwise set the encrypt status to 'reset' if it was previously disabled, but
		 * not can be 'reset'. 
		 */
		//S().messages[message].recipients = newList;
		this.recipients = newList;
		//S().UI.actions.resetEncrypt(message, {force: (newList.length === 0)});
		this.resetEncrypt({force: (newList.length === 0 && S().server.haveAddress(this.sender.address))});
	};
	
	this.isEncryptable = function () {
		/* Returns whether a message can be encryped based on cert status of recipients. */
		return (this.getMissingCerts().length === 0 && S().server.haveAddress(this.sender.address));
	};
	
	this.getMissingCerts = function () {
		/* Returns a list of recipients who are missing certs. */
		//if (typeof message !== 'number') throw "invalid message";
		var missingCerts = [];
		//for (var i = 0; i < S().messages[message].recipients.length; i++) {
		for (var i = 0; i < this.recipients.length; i++) {
			//if (! S().server.haveCert(S().messages[message].recipients[i].address))
			if (! S().server.haveCert(this.recipients[i].address))
				//missingCerts.push(S().messages[message].recipients[i]);
				missingCerts.push(this.recipients[i]);
		}

		return missingCerts;
	};
	
	this.encryptButton = function () {
		/* Shown on the UI, a click will toggle the message to be encrypted. */
		var message = this;
		var button = $("<img />", {
			click: function() {
				message.encryptButtonClick(message);
			},
			css: { "float": "right", "cursor": "pointer" },
			src: chrome.extension.getURL('images/glyphicons_unlock.png'),
			seruroLocked: false
		});
		/* Keep button reference, so it can be used during async calls. */
		this.button = button;
		return button;
	};
	
	this.signButton = function () {
		
	};

	this.encryptButtonClick = function (message) {
		/* The user has requested that their message be encrypted. */
		/* Check is data is already encrypted */
		//if ($(button).attr('serurolocked') == "true") {
		if ($(message.button).attr('serurolocked') == "true") {
			//S().UI.actions.resetEncrypt(message, {force: true});
			message.resetEncrypt({force: true});
			return;
		}

		/* The encrypt operation should be performed now? */
		//var missingCerts = S().getMissingCerts(message);
		var missingCerts = message.getMissingCerts();
		
		if (missingCerts.length > 0) {
			S().log("encryptButtonClick: missing " + missingCerts.length + " certs.");
			return S().needCerts({message: message, certs: missingCerts});
		}
		if (! S().server.haveAddress(this.sender.address)) {
			S().log("encryptButtonClick: " + this.sender.address + " cannot decrypt or sign messages.");
			return S().needCerts({message: message, certs: this.sender});
		}
		//S().UI.actions.enableEncrypt(message);
		message.enableEncrypt();
	};
	
	this.disableEncrypt = function() {
		/* Backup from stored message content */
		/* Update visual */
		//var button = S().messages[message].button;
		$(this.button).attr({
			src: chrome.extension.getURL("images/glyphicons_unlock_bad.png"),
			seruroLocked: false
		});
		return;
	};
	
	this.resetEncrypt = function(options) {
		/* Checks to see if the encrypt button can be 'enabled', setting it to a clickable state. */
		//var button = S().messages[message].button;
		
		if (arguments.length === 0 || options.force !== true) {
			/* If not forcing this reset, check message status. */
			if ($(this.button).attr('serurolocked') == "true" || 
				(! this.isEncryptable() || ! S().server.haveAddress(this.sender.address))) {
				/* Should not be 'reset', because it was previously enabled, or cannot be enabled. */
				return;
			}
		}

		$(this.button).attr({
			src: chrome.extension.getURL("images/glyphicons_unlock.png"),
			seruroLocked: false
		});
		return;
	};
	
	this.enableEncrypt = function() {
		/* Store message content */
		/* Encrypt composed message */
		/* Update visual */
		//var button = S().messages[message].button;
		$(this.button).attr({
			src: chrome.extension.getURL("images/glyphicons_lock_good.png"),
			seruroLocked: true
		});
		return;
	};
	
	/* The client should set a getter function. Depending on how content is accessed.
	 *  Will return {subject:, content:}
	 */
	this.getContent = function() {
		if (this.getClientContent === undefined || this.getClientSubject) 
			throw "invalid content getter";
		new content = {};
		content.subject = this.getClientSubject();
		content.content = this.getClientContent();
		S().log("getContent: subject is " + content.subject + ", content: " + content.content);
		return content;
	};
};

/* Skel */
seruro.client = {};
seruro.lang = {};

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
		
	},
	
	addresses: function() {
		return {"teddy.reed@gmail.com": true};
	},
	
	haveAddress: function(address) {
		return (address == "teddy.reed@gmail.com");
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
	
	(function (s) {
		s.lang = {
			missingCertsError: "Would you like to search for certificates? " +
			  "Could not find certificates for the following recipients: "
		};
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
	}(window.jQuery));
}


/* Communications */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	/* Might want to match extension id */
	console.log({request:request, sender:sender, response:sendResponse});
	if (request.event == "init") {
		/* Sent once the client code has been injected. */
		seruro.init();
	}
	return;
});