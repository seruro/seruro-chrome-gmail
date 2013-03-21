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
		console.log("Seruro: Gmail client loaded.");
		
		/* Check if the compose-wrapper node exists. */
		var content = S().getClasses(document.body, S().getElement('content')[0]);
		/* Note: The above line looks only for the first content class. */
		if (content.length > 0) {
			/* Must preserve inner node check, even with a nasty double if. */
			var wrappers = S().getClasses(content[0], S().getElement('composeWrapper'));
			if (wrappers.length > 0) {
				S().log("found existing composeWrapper.");
				/* If yes, we do not need to wait. */
				S().client.startWatchers(S().getClasses(document.body, 
					S().getElement('content')[0])[0]);
				S().client.existingCompose();
				return;
			}
		}

		/* Wait for the page the create the 'known' content wrapper. */
		S().addObserver(document.body, function (node, args) {
			for (var i = 0; i < S().client.elements.content.length; i++) {
				/* Make sure this node IS THE NODE WE'RE LOOKING FOR... */
				if (node.className != S().getElement('content')[i])
					continue;
				/* Remove this observer */
				args.observer.disconnect();
				/* Wait for new messages */
				S().client.startWatchers(node);
				break;
			}
		});
		return;
	},
	
	startWatchers: function(node) {
		/* Should add listeners to the page.
		 * A listener will create an event when a specific element changes.
		 * This allows Seruro to modify content without polling for UI events. 
		 */
		console.log("Seruro: startWatchers initialized.");
		
		S().setElement('contentNode', node);
		/* A compose-wrapper has been found, store this node.
		 * All new-compose message divs will be created within this wrapper.
		 */
		S().setElement('composeWrapperNode', 
			S().getClasses(node, S().getElement('composeWrapper'))[0]);
		
		/* Create an observer for new messages. */
		S().addObserver(S().getElement('composeWrapperNode'), function (node, args) {
			/* A new-compose was created. */
			S().client.newCompose(node);
			/* This observer must persist for the entire session. */
		});
		
		/* Create an observer for reading messages. */
		
		return;
	},
	
	existingCompose: function() {
		/* Watchers should have already started before checking for existing compose(s).
		 * Now search the DOM for messages that were _not_ created as the result of an
		 * observed UI event.
		 */
		var composes = S().getClasses(S().getElement('composeWrapperNode'),
			S().getElement('composeWindow'));
		for (var i = 0; i < composes.length; i++) {
			S().client.newCompose(composes[i]);
		}
		
		return;
	},
	
	newCompose: function (node) {
		console.log("Seruro: new-compose created.");
		/*console.log(node);*/
		
		/* The encrypt/sign buttons will go next to the subject. */
		var subject = S().getClasses(node, S().getElement('composeSubject'));
		if (subject.length == 0) {
			S().log('(error) newCompose: could not find subject.');
			return;
		}
		/* Small hack to gain real-estate. */
		subject[0].firstChild.style.width = '90%'; 
		var encryptButton = S().UI.encryptButton();
		subject[0].appendChild(encryptButton);
		
		var people = S().getClasses(node, S().getElement('composePeople'));
		if (people.length == 0) {
			S().log("(error) newCompose: could not find people table.");
			return;
		}
		console.log(people[0]);
		S().addObserver(people[0], 
			{add: S().client.addPerson, remove: S().client.removePerson}, 
			{subtree: true});
		
		return;
	},
	
	addPerson: function (node, args) {
		if (node.className != S().getElement('personWrapper'))
			return;
		
		S().log('person added!');
		console.log(node);
	},
	
	removePerson: function (node, args) {
		S().log('person removed!');
	}
	
};