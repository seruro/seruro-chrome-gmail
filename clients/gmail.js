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
		composeSubjectWrapper: '.aoD.az6', /* .aoD.az6 */
		composeSubject: 'input[name=subject]',
		composePeople: '.GS',
		
		personWrapper: '.vR',
		
		composeContent: '.M9',
		composeContext: '.J-M.jQjAxd',
		insertOption: '.J-Ph.J-N',
		composeBody: 'div[role=textbox]',
		
		composeFromWrapper: '.az3',
		composeFrom: 'input[name=from]',
	},	
	
	init: function() {
		/* Called by seruro.init() when the script is injected. 
		 * The client page is _not_ guaranteed to have completely rendered when this script runs.
		 */
		S().log("Gmail client loaded.");

		/* Check if the compose-wrapper node exists. */
		var content = $(document.body).find(S('content')[0]);
		/* Note: The above line looks only for the first content class. */
		if (content.length > 0) {
			S().log("found existing content wrapper.");
			
			S('contentNode', content.get(0));
			S().client.buildOut();
			/* Do not wait for the content node. */
			return;
		}

		S().log("waiting for content wrapper.");
		/* Wait for the page the create the 'known' content wrapper. */
		S().addObserver(document.body, function (node, args) {
			for (var i = 0; i < S('content').length; i++) {
				/* Make sure this node IS THE NODE WE'RE LOOKING FOR... */
				if (! $(node).hasClass(S('content')[i], true))
					continue;
				S().log("found new content wrapper.");
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
		/* Look for compose wrapper .*/
		var wrappers = $(S('contentNode')).find(S('composeWrapper'));
		if (wrappers.length > 0) {
			S().log("found existing compose wrapper.");
			
			S("composeWrapperNode", wrappers.get(0));
			S().client.startWatchers();
			return;
		}
		
		/* Wait for the page to complete it's build out. */
		S().log("waiting for compose wrapper.");
		/* Wait for composeWrapper */
		S().addObserver(S('contentNode'), function (node, args) {
			/* Make sure this node IS THE NODE WE'RE LOOKING FOR... */
			if (! $(node).hasClass(S('composeWrapper'), true))
				return;
			S().log("found new compose wrapper.");
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
		var message = S().newMessage(node);
		
		/* Add observers to the To/CC/BCC/From fields. */
		var people = $(node).find(S('composePeople'));
		if (people.length === 0)
			return S().error("newCompose: could not find people table.");
		/* Search for existing recipients. */
		S().client.existingPerson(people[0], message);
		/* Watch for new recipients. */
		S().addObserver(people[0], 
			/* Keep track of persons added and removed. */
			/* Though, the list should be regenerated when submitted. */
			{add: S().client.addPerson, remove: S().client.removePerson}, 
			{message: message},
			/* There are many elements in this observer catch-all. */
			{subtree: true}
		);
		
		var from = $(node).find(S('composeFrom'));
		if (from.length === 0)
			return S().error("newCompose: could not find from field.");
		S().client.setSender(null, {message: message});
		/* Watch for from change. */
		S().addObserver(from[0], 
			{attr: S().client.setSender}, {message: message}, 
			{attributes: true, characterData: true}
		);
		
		/* The encrypt/sign buttons will go next to the subject. */
		var subject = $(node).find(S('composeSubjectWrapper'));
		if (subject.length == 0)
			return S().error('newCompose: could not find subject.');
		/* Small hack to gain real-estate. */
		$(subject[0]).find(':first').css('width', '90%');
		/* Create and add the Encrypt/Sign buttons. */
		var encryptButton = message.encryptButton();
		$(subject[0]).append(encryptButton);
		
		/* Set getter functions for subject, content. */
		message.getClientSubject = function() {
			return $(node).find(S('composeSubject')).attr('value');
		};
		message.getClientContent = function() {
			return $(node).find(S('composeBody')).html();
		};
		
		return;
	},
	
	setSender: function(wrapper, args) {
		/* If there was an existing compose, it WILL have an existing 'from'. */
		var sender = $(args.message.node).find(S('composeFrom')).attr('value');
		S().log("setSender: from changed to " + sender);
		args.message.setSender(sender);
	},
	
	existingPerson: function(wrapper, message) {
		/* If there was an existing compose, it may have existing people in To/CC/BCC/From. */
		
		var people = $(wrapper).find(S('personWrapper'));
		for (var i = 0; i < people.length; i++) {
			//S().client.addPerson(people[i], {message: message});
			S().client.addPerson(people[i], {message:message});
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
		//S().addRecipient(person, args.message);
		console.log(args.message);
		args.message.addRecipient(person);

		var certIcon = S().getRecipientIcon(person);
		$(person.node).children().eq(1).before(certIcon);
	},
	
	getContactNode: function(node) {
		return $(node).find(':first').get(0); /* vN Y7BVp */
	},
	
	getContactName: function(node) {
		return $(node).find(':first').find(":first").html();
	},
	
	getContactAddress: function(node){
		return $(node).find(':first').attr('email');
	},
	
	removePerson: function (node, args) {
		/* If a person is removed, not tracking whether they are in To/CC/BCC/From. */
		if (! $(node).hasClass(S('personWrapper'), true))
			return;
		//if (S().messages[args.message] === undefined)
		//	return S().error("removePerson: cannot remove from unknown message.");
		
		/* Message object lookup via argument passed from newCompose observer. */
		var address = S().client.getContactAddress(node);
		//S().removeRecipient(address, args.message);
		args.message.removeRecipient(address);
	}
	
};