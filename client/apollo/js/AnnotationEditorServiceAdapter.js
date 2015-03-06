define([
       'dojo/_base/declare'
       ],
       function(declare) {

return declare(null, {
createAnnotationChangeListener: function(retryNumber) {
    // https://github.com/zyro23/grails-spring-websocket
    this.listener = new SockJS("/apollo/stomp");
    this.client = Stomp.over(this.listener);
    var client = this.client;
    var thisB = this;
    var browser = this.browser;


    if(typeof window.parent.getEmbeddedVersion == 'function') {
        if(window.parent.getEmbeddedVersion()=='ApolloGwt-1.0') {
            console.log('Registering embedded system with ApolloGwt-1.0.');
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
            console.log('NOTIFIED of ANNOT CHANGE',message);


            var changeData;

            try {
                changeData = JSON.parse(JSON.parse(message.body));
                console.log(changeData);


                if (changeData.operation == "ADD") {
                    console.log("ADD",changeData);
                    if (changeData.sequenceAlterationEvent) {
                        seqtrack.annotationsAddedNotification(changeData.features);
                    }
                    else {
                        track.annotationsAddedNotification(changeData.features);
                    }
                }
                else if (changeData.operation == "DELETE") {
                    if (changeData.sequenceAlterationEvent) {
                        seqtrack.annotationsDeletedNotification(changeData.features);
                    }
                    else {
                        track.annotationsDeletedNotification(changeData.features);
                    }
                }
                else if (changeData.operation == "UPDATE") {
                    if (changeData.sequenceAlterationEvent) {
                        seqtrack.annotationsUpdatedNotification(changeData.features);
                    }
                    else {
                        track.annotationsUpdatedNotification(changeData.features);
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
initializeAnnotations: function(trackNames) {
    var track=this.getAnnotTrack();
    var seqtrack=this.getSequenceTrack();
    var thisB=this;
    var browser=this.browser;
    var ref=browser.view.ref.name;
    if(!track) {
        console.log("Not initialized");
        return;
    }
    return this.getPermission(track.name+ref.name).then(function() {
        track.initAnnotContextMenu();

        track.initSaveMenu();
        track.initPopupDialog();

        thisB.createAnnotationChangeListener(0);
        

        track.makeTrackDroppable();
        track.show();

        // initialize menus regardless
        if (!thisB.loginMenuInitialized) {
            thisB.initLoginMenu(track.username);
        }
        if (! thisB.searchMenuInitialized && track.permission)  {
            thisB.initSearchMenu();
        }
    },
    function() {
        if(track.config.disableJBrowseMode) {
            track.login();
        }
        if (!thisB.loginMenuInitialized) {
            thisB.initLoginMenu(track.username);
        }
    }).then(function() {
        xhr('../AnnotationEditorService', {
            handleAs: "json",
            data: JSON.stringify({ "track": track.getUniqueTrackName(), "operation": "get_features" }),
            method: "post"
        }).then(function(response) {
            var responseFeatures = response.features;
            array.forEach(responseFeatures,function(feat) {
                var jfeat = JSONUtils.createJBrowseFeature( feat );
                track.store.insert(jfeat);
                track.processParent(feat, "ADD");
            });
            track.changed();
        }, function(response) {
            console.log("Annotation server error--maybe you forgot to login to the server?");
            track.handleError({ responseText: response.response.text } );
            return response;
        });
    });

}



});

});
