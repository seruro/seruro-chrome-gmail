/* Seruro Chrome Extension */

var display = {
	loadSettings: function(items) {
		/* Callback of sync.get(items) */
		display.settings = items.settings;
		
		/* The local storage settings should be available in display.settings.
		 * These are populated through event listeners on the chrome storage APIs.
		 * loadSettings should populate an options page with checkbox values.
		 */
		
		/* Option inputs have the class=setting.
		 * They have an id of setting.<type>.<name>, for example setting.sites.gmail.
		 * First we restore the visual setting using setOption, then listen for changes.
		 */
		var options = document.querySelectorAll('.setting');
		for (var i = 0; i < options.length; i++) {
			display.setOption(options[i]);
			options[i].addEventListener('change', display.saveOption);
		}
		return true;
	},
	
	setOption: function(e) {
		var name = e.id.split(".");
		if (name[0] != "settings") {
			return false;
		}
		
		/* The setting in the form "<type>.<name>" */
		if (display.settings[name[1]] == undefined || 
			display.settings[name[1]][name[2]] == undefined) 
			return false;
		
		/* Only support checkboxes */
		e.checked = display.settings[name[1]][name[2]];
	},
	
	saveOption: function(e) {
		/* Only support checkboxes */
		var name = this.id.split(".");
		if (name[0] != "settings") {
			return false;
		}
		
		/* If the <type> object does not exist in display.settings. */
		if (display.settings[name[1]] == undefined)
			display.settings[name[1]] = {};
		display.settings[name[1]][name[2]] = (this.checked);
		/* Store in chrome.sync */
		display.saveSettings();
	},
	
	saveSettings: function() {
		/* Iterate through the settings object in display,
		 * Every value should be saved in local (sync) storage.
		 * The name, value pair may contain an object as value.
		 */
		chrome.storage.sync.set({settings: display.settings}, function() {
			/* Nothing yet */
		});
		return true;
	},
	
	checkURL: function(tabId, changeInfo, tab) {
		/* Called when a tab is updated. */
		if (tab.url == undefined || changeInfo.status == "complete") return false;
		for (site in seruro.clients) {
			/* Make sure Seruro is enabled for the site, then check the URL. */
			if (display.settings.sites[site] && 
				tab.url.indexOf(seruro.clients[site]) == 0) {
				seruro.checkClient(tabId, site);
			}
		}
		
		return true;
	}
};

$ = {
	l: function(str) {
		console.log(str);
	}
};

display.settings = {
	/* Will be populated at load from chrome.storage.sync. */
	sites: {}, /* Enables each seruro.clients */
};

var seruro = {
	/* Maybe save the current client (could potentially have multiple)? */
	client: null,
	
	/* Todo: could be represented as a single site with multiple URLs. */
	clients: {gmail: "http://prosauce.org"},
	
	checkClient: function(tabId, site) {
		chrome.tabs.executeScript(tabId, {
			code: "chrome.extension.sendRequest({site: '" + site + "', loaded: typeof seruro !== 'undefined'});"
		});
	},
	
	addClient: function(request, sender, sendResponse) {
		/* Only load client if it does not already exist. */
		if (request.loaded == true) return;

		//seruro.client = request.site;
		chrome.pageAction.show(sender.tab.id);
		
		/* Add content script to client */
		var content = "clients/" + request.site + ".js";
		chrome.tabs.executeScript(null, {file: "content.js"}, function () {
			$.l("Injected: content.js, " + sender.tab.id);
			chrome.tabs.executeScript(null, {file: content}, function () {
				chrome.tabs.sendMessage(sender.tab.id, {target: "client"}, function() {});
			});
		});
	}
	
};

/* When Icon is clicked, display settings. */
document.addEventListener('DOMContentLoaded', function () {
	chrome.storage.sync.get(null, display.loadSettings);
});

/* Message listeners */
chrome.extension.onRequest.addListener(seruro.addClient)

/* Tabs listeners */
chrome.tabs.onUpdated.addListener(display.checkURL);

/* Storage listeners */
chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		var storageChange = changes[key];
		console.log('Storage key "%s" in namespace "%s" changed. Old value was "%s", new value is "%s".',
		  key, namespace, storageChange.oldValue, storageChange.newValue);
	}
});
