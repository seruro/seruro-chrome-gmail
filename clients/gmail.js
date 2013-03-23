/* Gmail-specific Seruro */

seruro.client = {
	name: 'GMail',
	
	elements: {
		/* This lists common email-page elements and their class identifiers.
		 * Seruro assumes these common elements and will modify related page elements to
		 * add Seruro-related functions and UI features.
		 */
		content: ['.dw', '.dw.np'],
		composeWrapper: '.no',
		composeWindow: '.AD',
		composeSubject: '.aoD.az6',
		composePeople: '.GS',
		
		personWrapper: '.vR',
		
		composeContent: '.M9',
		composeContext: '.J-M.jQjAxd',
		insertOption: '.J-Ph.J-N'
	},	
	
	init: function() {
		/* Called by seruro.init() when the script is injected. 
		 * The client page is _not_ guaranteed to have completely rendered when this script runs.
		 */
		S().log("Gmail client loaded.");

		/* Check if the compose-wrapper node exists. */
		//var content = S().getClasses(document.body, S().getElement('content')[0]);
		var content = $(document.body).find(S('content')[0]);
		/* Note: The above line looks only for the first content class. */
		if (content.length > 0) {
			S('contentNode', content.get(0));
			/* Look for compose wrapper .*/
			//var wrappers = S().getClasses(content[0], S().getElement('composeWrapper'));
			var wrappers = $(content.first()).find(S('composeWrapper'));
			if (wrappers.length > 0) {
				S("composeWrapperNode", wrappers.get(0));
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
			for (var i = 0; i < S('content').length; i++) {
				/* Make sure this node IS THE NODE WE'RE LOOKING FOR... */
				if (! $(node).hasClass(S('content')[i], true))
					continue;
				/* Remove this observer, since there is only one matching node. */
				args.observer.disconnect();
				S('contentNode', node);
				S().client.buildOut();
				break;
			}
		});
		
		return;
	},
	
	buildOut: function() {
		/* Wait for the page to complete it's build out. */

		/* Wait for composeWrapper */
		S().addObserver(S('contentNode'), function (node, args) {
			/* Make sure this node IS THE NODE WE'RE LOOKING FOR... */
			if (! $(node).hasClass(S('composeWrapper'), true))
				return;
			/* A compose-wrapper has been found, store this node.
			 * All new-compose message divs will be created within this wrapper.
			 */
			S('composeWrapperNode', node);
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
		
		S().addObserver(S('composeWrapperNode'), function (node, args) {
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
		//var composes = S().getClasses(S().getElement('composeWrapperNode'), S().getElement('composeWindow'));
		var composes = $(S('composeWrapperNode')).find(S('composeWindow'));
		for (var i = 0; i < composes.length; i++) {
			S().client.newCompose(composes.get(i));
		}
		
		return;
	},
	
	newCompose: function (node) {
		S().log("new-compose created.");
		/* Add this to the Seruro message list. */
		var id = S().addMessage(node);
		
		/* The encrypt/sign buttons will go next to the subject. */
		var subject = $(node).find(S('composeSubject'));
		if (subject.length == 0)
			return S().error('newCompose: could not find subject.');
		/* Small hack to gain real-estate. */
		$(subject[0]).find(':first').css('width', '90%');
		/* Create and add the Encrypt/Sign buttons. */
		var encryptButton = S().UI.encryptButton();
		$(subject[0]).append(encryptButton);
		
		/* Add observers to the To/CC/BCC/From fields. */
		var people = $(node).find(S('composePeople'));
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
		
		var people = $(wrapper).find(S('personWrapper'));
		for (var i = 0; i < people.length; i++) {
			S().client.addPerson(people[i], {message: message});
		}
	},

	addPerson: function (node, args) {
		/* If a person is added, not tracking whether they are in To/CC/BCC/From. */
		if (! $(node).hasClass(S('personWrapper'), true))
			return;

		/* Should be converted to element and className lookup. */
		var person = {
			node: S().client.getContactNode(node), 
			name: S().client.getContactName(node),
			address: S().client.getContactAddress(node)
		};
		S().addRecipient(person, args.message);

		var certIcon;
		if (S().server.haveCert(person.address)) 
			certIcon = S().UI.validCert();
		else
			certIcon = S().UI.invalidCert();
		//person.node.insertBefore(certIcon, person.node.firstChild.nextSibling);
		$(person.node).children().eq(1).before(certIcon);
		S().log('addPerson: ' + person.name + ' to message ' + args.message);
	},
	
	getContactNode: function(node) {
		return $(node).find(':first').get(0); /* vN Y7BVp */
	},
	
	getContactName: function(node) {
		return $(node).find(':first').find(":first").html()
	},
	
	getContactAddress: function(node){
		return $(node).find(':first').attr('email');
	},
	
	removePerson: function (node, args) {
		/* If a person is removed, not tracking whether they are in To/CC/BCC/From. */
		if (! $(node).hasClass(S('personWrapper'), true))
			return;
		if (S().messages[args.message] === undefined)
			return S().error("removePerson: cannot remove from unknown message.");
		
		/* Message object lookup via argument passed from newCompose observer. */
		var message = S().messages[args.message];
		for (var i = 0; i < message.recipients.length; i++) {
			/* Note that this compares the firstChild, this should be converted to a class lookup. */
			if (message.recipients[i].node === S().client.getContactNode(node)) {
				S().log("removePerson: " + message.recipients[i].name + " from message " + args.message);
				S().removeRecipient(message.recipients[i], message);
				return;
			}
		}
		
		/* The node could not be found in this message, something is wrong. */
		S().log("(error) removePerson: could not find node!");
	}
	
};