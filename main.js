/* Seruro Chrome Extension */

var display = {
		
	scripts: [
	    "content.js",
	    "framework/script/jquery-1.8.3.js",
	    "framework/script/bootstrap-modal.js",
	    "framework/script/bootbox.js"
	],
	
	css: [
	    "framework/style/bootstrap-modal.css"
	],
		
	loadSettings: function(items) {
		/* Callback of sync.get(items) */
		
		/* If settings is not configured, we should prompt to configure options. */
		if (! ('settings' in items)) {
			console.log('Seruro debug: please configure Seruro options.');
		} else {
			display.settings = items.settings;
		}
		
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
		if (tab.url == undefined || changeInfo.status != "complete") return false;
		console.log(changeInfo);
		for (site in seruro.clients) {
			/* Make sure Seruro is enabled for the site, then check the URL. */
			if (display.settings.sites[site] && 
				tab.url.indexOf(seruro.clients[site]) == 0) {
				seruro.checkClient(tabId, site);
			}
		}
		
		return true;
	},
	
	injectCss: function(site, tabId, index) {
		if (index >= display.css.length) return;
		
		$.l("Injecting " + display.css[index] + " into tab " + tabId);
		chrome.tabs.insertCSS(tabId, {file: display.css[index]}, function() {
			display.injectCss(site, tabId, index + 1);
		});
	},
	
	injectScript: function(site, tabId, index) {
		if (index > display.scripts.length) return;
		
		/* If this is the callback from the final injection. */
		if (index == display.scripts.length) {
			$.l("Injecting client " + site + " into tab " + tabId);
			chrome.tabs.executeScript(tabId, {file: "clients/" + site + ".js"}, function () {
				chrome.tabs.sendMessage(tabId, {event: "init"}, function() {});
			});
			return;
		}
		
		$.l("Injecting " + display.scripts[index] + " into tab " + tabId);
		chrome.tabs.executeScript(tabId, {file: display.scripts[index]}, function() {
			display.injectScript(site, tabId, index + 1);
		});
	}
	
};

$ = {
	l: function(str) {
		console.log(str);
	}
};

/* Template for reference. */
display.settings = {
	/* Will be populated at load from chrome.storage.sync. */
	sites: {}, /* Enables each seruro.clients */
};

var seruro = {
	/* Maybe save the current client (could potentially have multiple)? */
	client: null,
	
	/* Todo: could be represented as a single site with multiple URLs. */
	clients: {gmail: "https://mail.google.com"},
	
	checkClient: function (tabId, site) {
		chrome.tabs.executeScript(tabId, {
			code: "chrome.extension.sendRequest({site: '" + site + "', loaded: typeof seruro !== 'undefined'});"
		});
	},
	
	addClient: function (request, sender, sendResponse) {
		/* Only load client if it does not already exist. */
		console.log(request);
		if (request.loaded == true) return;

		//seruro.client = request.site;
		chrome.pageAction.show(sender.tab.id);
		
		/* Add content script to client */
		display.injectCss(request.site, sender.tab.id, 0);
		display.injectScript(request.site, sender.tab.id, 0);
	}
	
};

/* Interface to Seruro Thick Client. */
var seruro.server = {
	
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
