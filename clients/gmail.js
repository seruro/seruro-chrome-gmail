/* Gmail-specific Seruro */

seruro.client = {
	name: 'GMail',
	
	elements: {
		/* This lists common email-page elements and their class identifiers.
		 * Seruro assumes these common elements and will modify related page elements to
		 * add Seruro-related functions and UI features.
		 */
		content: ['dw', 'dw np'],
		composeWrapper: 'no',
		composeWindow: 'AD',
		composeSubject: 'aoD az6',
		composePeople: 'GS',
		
		personWrapper: 'vR',
		
		composeContent: 'M9',
		composeContext: 'J-M jQjAxd',
		insertOption: 'J-Ph J-N'
	},	
	
	init: function() {
		/* Called by seruro.init() when the script is injected. 
		 * The client page is _not_ guaranteed to have completely rendered when this script runs.
		 */
		S().log("Gmail client loaded.");
		
		/* Check if the compose-wrapper node exists. */
		var content = S().getClasses(document.body, S().getElement('content')[0]);
		/* Note: The above line looks only for the first content class. */
		if (content.length > 0) {
			S().setElement('contentNode', content[0]);
			/* Look for compose wrapper .*/
			var wrappers = S().getClasses(content[0], S().getElement('composeWrapper'));
			if (wrappers.length > 0) {
				S().setElement("composeWrapperNode", wrappers[0]);
				S().client.startWatchers();
			} else {
				/* Wait for the compose wrapper. */
				S().client.buildOut();
			}
			/* Do not wait for the content node. */
			return;
		}

		/* Wait for the page the create the 'known' content wrapper. */
		S().addObserver(document.body, function (node, args) {
			for (var i = 0; i < S().client.elements.content.length; i++) {
				/* Make sure this node IS THE NODE WE'RE LOOKING FOR... */
				if (node.className != S().getElement('content')[i])
					continue;
				/* Remove this observer, since there is only one matching node. */
				args.observer.disconnect();
				S().setElement('contentNode', node);
				S().client.buildOut();
				break;
			}
		});
		
		return;
	},
	
	buildOut: function() {
		/* Wait for the page to complete it's build out. */

		/* Wait for composeWrapper */
		S().addObserver(S().getElement('contentNode'), function (node, args) {
			/* Make sure this node IS THE NODE WE'RE LOOKING FOR... */
			if (node.className != S().getElement('composeWrapper'))
				return;
			/* A compose-wrapper has been found, store this node.
			 * All new-compose message divs will be created within this wrapper.
			 */
			S().setElement('composeWrapperNode', node);
			/* Remove this observer, since there is only one matching node. */
			args.observer.disconnect();
			/* Create an observer for new messages. */
			S().client.startWatchers();
		});

		return;
	},
	
	startWatchers: function() {
		/* Should add listeners to the page.
		 * A listener will create an event when a specific element changes.
		 * This allows Seruro to modify content without polling for UI events. 
		 */
		
		S().log("startWatchers initialized.");
		
		/* Search for existing composes */
		S().client.existingCompose();
		
		S().addObserver(S().getElement('composeWrapperNode'), function (node, args) {
			/* A new-compose was created. */
			S().client.newCompose(node);
			/* This observer must persist for the entire session. */
		});
	},
	
	existingCompose: function() {
		/* Watchers should have already started before checking for existing compose(s).
		 * Now search the DOM for messages that were _not_ created as the result of an
		 * observed UI event.
		 */
		var composes = S().getClasses(S().getElement('composeWrapperNode'), S().getElement('composeWindow'));
		for (var i = 0; i < composes.length; i++) {
			S().client.newCompose(composes[i]);
		}
		
		return;
	},
	
	newCompose: function (node) {
		S().log("new-compose created.");
		console.log(node);
		/* Add this to the Seruro message list. */
		var id = S().addMessage(node);
		
		/* The encrypt/sign buttons will go next to the subject. */
		var subject = S().getClasses(node, S().getElement('composeSubject'));
		if (subject.length == 0)
			return S().error('newCompose: could not find subject.');
		/* Small hack to gain real-estate. */
		subject[0].firstChild.style.width = '90%'; 
		/* Create and add the Encrypt/Sign buttons. */
		var encryptButton = S().UI.encryptButton();
		subject[0].appendChild(encryptButton);
		
		/* Add observers to the To/CC/BCC/From fields. */
		var people = S().getClasses(node, S().getElement('composePeople'));
		if (people.length == 0)
			return S().error("newCompose: could not find people table.");
		
		S().client.existingPerson(people[0], id);

		S().addObserver(people[0], 
			/* Keep track of persons added and removed. */
			/* Though, the list should be regenerated when submitted. */
			{add: S().client.addPerson, remove: S().client.removePerson}, 
			{message: id},
			/* There are many elements in this observer catch-all. */
			{subtree: true});
		
		return;
	},
	
	existingPerson: function(wrapper, message) {
		/* If there was an existing compose, it may have existing people in To/CC/BCC/From. */
		
		var people = S().getClasses(wrapper, S().getElement('personWrapper'));
		for (var i = 0; i < people.length; i++) {
			S().client.addPerson(people[i], {message: message});
		}
	},
	
	addPerson: function (node, args) {
		/* If a person is added, not tracking whether they are in To/CC/BCC/From. */
		if (node.className != S().getElement('personWrapper'))
			return;
		
		/* Should be converted to element and className lookup. */
		var person = {
			node: node.firstChild /* vN Y7BVp */, 
			name: node.firstChild.firstChild.innerHTML,
			address: node.firstChild.getAttribute('email')
		};
		S().addRecipient(person, args.message);
		
		var certIcon;
		if (S().server.haveCert(person.address)) 
			certIcon = S().UI.validCert();
		else
			certIcon = S().UI.invalidCert();
		person.node.insertBefore(certIcon, person.node.firstChild.nextSibling);
		S().log('addPerson: ' + person.name + ' to message ' + args.message);
	},
	
	removePerson: function (node, args) {
		/* If a person is removed, not tracking whether they are in To/CC/BCC/From. */
		if (node.className != S().getElement('personWrapper'))
			return;
		if (! args.message in S().messages) {
			S().log("(error) trying to remove person from unknown message.");
			return;
		}
		
		/* Message object lookup via argument passed from newCompose observer. */
		var message = S().messages[args.message];
		for (var i = 0; i < message.recipients.length; i++) {
			/* Note that this compares the firstChild, this should be converted to a class lookup. */
			if (message.recipients[i].node == node.firstChild) {
				S().log("removePerson: " + message.recipients[i].name + " from message " + args.message);
				return;
			}
		}
		
		/* The node could not be found in this message, something is wrong. */
		S().log("(error) removePerson: could not find node!");
	}
	
};