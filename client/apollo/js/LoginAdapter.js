define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/request',
           'WebApollo/Permission',
           'WebApollo/JSONUtils'
       ],
       function(
           declare,
           lang,
           array,
           request,
           Permission,
           JSONUtils
       ) {

return declare(null, {

constructor: function(plugin) {
    var browser=plugin.browser;
    this.webapollo=plugin;
    this.context_path="..";
    browser.subscribe('/webapollo/v1/c/service/update', lang.hitch(this,"initializeAnnotations"));
},

getPermission: function( trackName ) {
    var thisB = this;
    return request(this.context_path + "/annotationEditor/getUserPermission", {
        data: { "track": trackName },
        handleAs: "json",
        timeout: 5 * 1000 // Time in milliseconds
    });
},

createAnnotationChangeListener: function(retryNumber) {
    // https://github.com/zyro23/grails-spring-websocket
    if(this.listener) {
        this.listener.close();
    }
    this.listener = new SockJS("/apollo/stomp");
    this.listener.debug = null;
    this.client = Stomp.over(this.listener);
    this.client.debug = null;
    var client = this.client;
    var thisB = this;
    var annotTrack = this.webapollo.getAnnotTrack();
    var seqTrack = this.webapollo.getSequenceTrack();
    var browser = this.webapollo.browser;


    if(typeof window.parent.getEmbeddedVersion == 'function') {
        if(window.parent.getEmbeddedVersion()=='ApolloGwt-2.0') {
            console.log('Registering embedded system with ApolloGwt-2.0.');
            var sendTracks = function (trackList, visibleTrackNames) {
                var filteredTrackList = [];
                for (var trackConfigIndex in trackList) {
                    var filteredTrack = {};
                    var trackConfig = trackList[trackConfigIndex];
                    var index = visibleTrackNames.indexOf(trackConfig.label);
                    filteredTrack.label = trackConfig.label;
                    filteredTrack.key = trackConfig.key;
                    filteredTrack.name = trackConfig.name;
                    filteredTrack.type = trackConfig.type;
                    filteredTrack.urlTemplate = trackConfig.urlTemplate;
                    filteredTrack.visible = index >= 0;
                    filteredTrackList.push(filteredTrack);
                }

                window.parent.loadTracks(JSON.stringify(filteredTrackList));
            };

            var handleTrackVisibility = function (trackInfo) {
                var command = trackInfo.command;
                if (command == "show") {
                    browser.publish('/jbrowse/v1/v/tracks/show', [browser.trackConfigsByName[trackInfo.label]]);
                }
                else if (command == "hide") {
                    browser.publish('/jbrowse/v1/v/tracks/hide', [browser.trackConfigsByName[trackInfo.label]]);
                }
                else if (command == "list") {
                    var trackList = browser.trackConfigsByName;
                    var visibleTrackNames = browser.view.visibleTrackNames();
                    sendTracks(trackList, visibleTrackNames);
                }
                else {
                    console.log('cont sure what command is supposed to be: ' + command);
                }
            };

            window.parent.registerFunction("handleTrackVisibility", handleTrackVisibility);
        }
        else{
            console.log('Unknown embedded server: ' + window.parent.getEmbeddedVersion()+' ignoring.');
        }
    }
    else{
        console.log('No embedded server is present.');
    }


    client.connect({}, function () {
        client.subscribe("/topic/AnnotationNotification", function (message) {
            var changeData;
            annotTrack=annotTrack||thisB.webapollo.getAnnotTrack();
            seqTrack=seqTrack||thisB.webapollo.getSequenceTrack();

            try {
                changeData = JSON.parse(JSON.parse(message.body));


                if (changeData.operation == "ADD") {
                    if (changeData.sequenceAlterationEvent) {
                        seqTrack.annotationsAddedNotification(changeData.features);
                    }
                    else {
                        annotTrack.annotationsAddedNotification(changeData.features);
                    }
                }
                else if (changeData.operation == "DELETE") {
                    if (changeData.sequenceAlterationEvent) {
                        seqTrack.annotationsDeletedNotification(changeData.features);
                    }
                    else {
                        annotTrack.annotationsDeletedNotification(changeData.features);
                    }
                }
                else if (changeData.operation == "UPDATE") {
                    if (changeData.sequenceAlterationEvent) {
                        seqTrack.annotationsUpdatedNotification(changeData.features);
                    }
                    else {
                        annotTrack.annotationsUpdatedNotification(changeData.features);
                    }
                }
                else {
                    console.log('unknown command: ' + changeData.operation);
                }
                browser.view.redrawTracks();
            } catch (e) {
                console.log('not JSON ' + e + ' ignoring callback: ' + message.body);
            }

        });
    });
},
initializeAnnotations: function(annotTrack) {
    var thisB = this;
    var browser = this.webapollo.browser;
    var ref = browser.view.ref;
    console.log("Initializing annotations:",annotTrack.name+"-"+ref.name);
    return this.getPermission( annotTrack.name+ref.name ).then(function(response) {
        console.log(response);
        thisB.username=response.username;
        thisB.permission=response.permission;
        annotTrack.initAnnotContextMenu();

        annotTrack.initSaveMenu();
        annotTrack.initPopupDialog();

        thisB.createAnnotationChangeListener(0);
        

        annotTrack.makeTrackDroppable();
        annotTrack.show();

        // initialize menus regardless
        if(! thisB.webapollo.loginMenuInitialized ) {
            thisB.webapollo.initLoginMenu(thisB.username);
        }
        if (! thisB.webapollo.searchMenuInitialized && thisB.permission )  {
            thisB.webapollo.initSearchMenu();
        }
    },
    function() {
        if(annotTrack.config.disableJBrowseMode) {
            annotTrack.login();
        }
    }).then(function() {
        request(thisB.context_path+'/annotationEditor/getFeatures', {
            handleAs: "json",
            data: { track: annotTrack.getUniqueTrackName() },
            method: "post"
        }).then(function(response) {
            var responseFeatures = response.features;
            array.forEach(responseFeatures,function(feat) {
                var jfeat = JSONUtils.createJBrowseFeature( feat );
                annotTrack.store.insert(jfeat);
                annotTrack.processParent(feat, "ADD");
            });
            annotTrack.changed();
        }, function(response) {
            console.log(response);
            console.log("Annotation server error--maybe you forgot to login to the server?");
            annotTrack.handleError({ responseText: response.response.text } );
            return response;
        });
    });

},


isLoggedIn: function() {
    return this.username != undefined;
},

hasWritePermission: function() {
    return this.permission & Permission.WRITE;
},

isAdmin: function() {
    return this.permission & Permission.ADMIN;
}

});

});
