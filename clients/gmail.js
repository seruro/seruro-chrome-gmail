/* Gmail-specific Seruro */

seruro.client = {
	elements: {
		content: ['dw', 'dw np'],
		compose: 'no',
		composeContent: 'M9',
		composeContext: 'J-M jQjAxd',
		insertOption: 'J-Ph J-N'
	},	
	
	observers: {},
	
	init: function() {
		console.log("Seruro: Gmail client loaded.");

		/* Store needed nodes */
		seruro.client.observers.init = seruro.client._addObserver(document.body, function (node) {
			for (var i = 0; i < seruro.client.elements.content.length; i++) {
				if (node.className != seruro.client.elements.content[i])
					continue;
				seruro.client.elements.contentNode = node;
				seruro.client.elements.composeNode = node.getElementsByClassName(seruro.client.elements.compose)[0];
				seruro.client.observers.init.disconnect();
				seruro.client.startWatchers();
				break;
			}
		});
	},
	
	_addObserver: function(node, callback) {
		if (typeof callback != 'function') {
			console.log("_addObserver: " + callback + 'is not a function');
			return;
		}
		if (node == undefined) {
			console.log("_addOberser: node is undefined.");
			return;
		}
		
		var observer = new WebKitMutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				for (var i = 0; i < mutation.addedNodes.length; i++)
					callback(mutation.addedNodes[i]);
			});
		});
		observer.observe(node, {childList: true});
		return observer;
	},
	
	startWatchers: function() {
		/* Should add listeners to the page */
		//var nodes = [];
		console.log("startWatchers: init");
		var observer = new WebKitMutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				for (var i = 0; i < mutation.addedNodes.length; i++) 
					//nodes.push(mutation.addedNodes[i]);
					seruro.client._newCompose(mutation.addedNodes[i]);
			});
		});
		
		var composeShell = seruro.client.elements.composeNode;
		observer.observe(composeShell, {childList: true});
		
	},
	
	_newCompose: function (node) {
		console.log(node);
		var title = node.getElementsByClassName('Hp')[0];
		var img = document.createElement('img');
		img.src = chrome.extension.getURL('images/icon_good.png');
		title.appendChild(img);
	}
	
};