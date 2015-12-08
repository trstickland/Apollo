require({
           packages: [
               { name: 'jqueryui', location: '../plugins/WebApollo/jslib/jqueryui' },
               { name: 'jquery', location: '../plugins/WebApollo/jslib/jquery', main: 'jquery' }
           ]
       },
       [],
       function() {

define.amd.jQuery = true;

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/dom-construct',
           'dojo/dom-class',
           'dojo/query',
           'dojo/_base/window',
           'dojo/_base/array',
           'dojo/request/xhr',
           'dijit/Menu',
           'dijit/MenuItem',
           'dijit/MenuSeparator',
           'dijit/CheckedMenuItem',
           'dijit/PopupMenuItem',
           'dijit/form/DropDownButton',
           'dijit/DropDownMenu',
           'dijit/form/Button',
           'dijit/registry',
           'dijit/place',
           'jquery',
           'JBrowse/Plugin',
           'WebApollo/FeatureEdgeMatchManager',
           'WebApollo/FeatureSelectionManager',
           'WebApollo/TrackConfigTransformer',
           'WebApollo/View/Track/AnnotTrack',
           'WebApollo/View/Track/SequenceTrack',
           'WebApollo/View/TrackList/Hierarchical',
           'WebApollo/View/TrackList/Faceted',
           'WebApollo/View/Dialog/Help',
           'WebApollo/JSONUtils',
           'WebApollo/AnnotationEditorServiceAdapter',
           'JBrowse/View/FileDialog/TrackList/GFF3Driver',
           'JBrowse/CodonTable'
       ],
    function( declare,
            lang,
            domConstruct,
            domClass,
            query,
            win,
            array,
            xhr,
            dijitMenu,
            dijitMenuItem,
            dijitMenuSeparator,
            dijitCheckedMenuItem,
            dijitPopupMenuItem,
            dijitDropDownButton,
            dijitDropDownMenu,
            dijitButton,
            registry,
            place,
            $,
            JBPlugin,
            FeatureEdgeMatchManager,
            FeatureSelectionManager,
            TrackConfigTransformer,
            AnnotTrack,
            SequenceTrack,
            Hierarchical,
            Faceted,
            HelpMixin,
            JSONUtils,
            AnnotService,
            GFF3Driver,
            CodonTable
            ) {

return declare( [JBPlugin, HelpMixin],
{
    constructor: function( args ) {
        console.log("loaded WebApollo plugin");
        var thisB = this;
        this.searchMenuInitialized = false;
        this.annotService=new AnnotService(this);

        var browser = this.browser;  // this.browser set in Plugin superclass constructor
        [
          'plugins/WebApollo/jslib/bbop/bbop.js',
          'plugins/WebApollo/jslib/bbop/golr.js',
          'plugins/WebApollo/jslib/bbop/jquery.js',
          'plugins/WebApollo/jslib/bbop/search_box.js',
          'plugins/WebApollo/jslib/websocket/spring-websocket.js'
        ].forEach(function(src) {
          var script = document.createElement('script');
          script.src = src;
          script.async = false;
          document.head.appendChild(script);
        });

        // Checking for cookie for determining the color scheme of WebApollo
        if( browser.cookie("Scheme")=="Dark" ) {
            domClass.add(win.body(), "Dark");
        }
        if( browser.cookie("colorCdsByFrame")=="true" ) {
            domClass.add(win.body(), "colorCds");
        }
        if( browser.config.favicon ) {
            this.setFavicon(browser.config.favicon);
        }
        


        if (! browser.config.helpUrl)  {
            browser.config.helpUrl = "http://genomearchitect.org/webapollo/docs/help.html";
        }

        // hand the browser object to the feature edge match manager
        FeatureEdgeMatchManager.setBrowser( browser );

        this.featSelectionManager = new FeatureSelectionManager();
        this.annotSelectionManager = new FeatureSelectionManager();
        this.trackTransformer = new TrackConfigTransformer({ browser: browser });

        // setting up selection exclusiveOr --
        //    if selection is made in annot track, any selection in other tracks is deselected, and vice versa,
        //    regardless of multi-select mode etc.
        this.annotSelectionManager.addMutualExclusion(this.featSelectionManager);
        this.featSelectionManager.addMutualExclusion(this.annotSelectionManager);

        FeatureEdgeMatchManager.addSelectionManager(this.featSelectionManager);
        FeatureEdgeMatchManager.addSelectionManager(this.annotSelectionManager);

        if(!browser.config.quickHelp)
        {
            browser.config.quickHelp = {
                "title": "Apollo Help",
                "content": this.defaultHelp()
            };
        }

        // register the WebApollo track types with the browser, so
        // that the open-file dialog and other things will have them
        // as options
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/DraggableHTMLFeatures',
            defaultForStoreTypes: [ 'JBrowse/Store/SeqFeature/NCList',
                                    'JBrowse/Store/SeqFeature/GFF3',
                                    'WebApollo/Store/SeqFeature/ApolloGFF3'
                                  ],
            label: 'WebApollo Features'
        });
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/DraggableAlignments',
            defaultForStoreTypes: [
                                    'JBrowse/Store/SeqFeature/BAM'
                                  ],
            label: 'WebApollo Alignments'
        });
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/SequenceTrack',
            defaultForStoreTypes: [ 'JBrowse/Store/Sequence/StaticChunked' ],
            label: 'WebApollo Sequence'
        });

        // transform track configs from vanilla JBrowse to WebApollo:
        // type: "JBrowse/View/Track/HTMLFeatures" ==> "WebApollo/View/Track/DraggableHTMLFeatures"
        //
        array.forEach(browser.config.tracks,function(e) { thisB.trackTransformer.transform(e); });

        // update track selector to WebApollo
        if (!browser.config.trackSelector) {
            browser.config.trackSelector = { type: 'WebApollo/View/TrackList/Hierarchical' };
        }
        else if (browser.config.trackSelector.type == "Hierarchical") {
            browser.config.trackSelector.type = 'WebApollo/View/TrackList/Hierarchical';
        }
        else if (browser.config.trackSelector.type == "Faceted") {
            browser.config.trackSelector.type = 'WebApollo/View/TrackList/Faceted';
        }

        //pre-initView createMenu
        if(browser.config.show_nav&&browser.config.show_menu) {
            this.createMenus();
        }


        // put the WebApollo logo in the powered_by place in the main JBrowse bar
        browser.afterMilestone( 'initView', function() {
            if (browser.poweredByLink)  {
                browser.poweredByLink.innerHTML = '<img src=\"plugins/WebApollo/img/ApolloLogo_100x36.png\" height=\"25\" />';
                browser.poweredByLink.href = 'http://genomearchitect.org/';
                browser.poweredByLink.target = "_blank";
            }
            if(browser.config.show_nav&&browser.config.show_menu) {
                // the fileDialog element is only initialized if the navigation bar exists
                var customGff3Driver = declare(GFF3Driver,   {
                    constructor: function( args ) {
                        this.storeType = 'WebApollo/Store/SeqFeature/ApolloGFF3';
                    }
                });
                browser.fileDialog.addFileTypeDriver(new customGff3Driver());
                thisB.postCreateMenus();
            }

        });
        this.monkeyPatchRegexPlugin();

    },
    updateLabels: function() {
        if(!this._showLabels) {
            query('.track-label').style('visibility','hidden');
        }
        else {
            query('.track-label').style('visibility','visible');
        }
        this.browser.view.updateScroll();
    },

    plusStrandFilter: function(feature)  {
        var strand = feature.get('strand');
        return !(strand == 1 || strand == '+' || !strand)
    },

    minusStrandFilter: function(feature)  {
        var strand = feature.get('strand');
        return !(strand = -1 || strand == '-' || !strand)
    },

    addStrandFilterOptions: function()  {
        var thisB = this;
        var browser = this.browser;
        var plus_strand_toggle = new dijitCheckedMenuItem(
                {
                    label: "Show plus strand",
                    checked: true,
                    onClick: function(event) {
                        var plus = this.get("checked");
                        if(!plus) {
                            thisB.plusFilter=browser.addFeatureFilter(thisB.plusStrandFilter);
                        } else  {
                            browser.removeFeatureFilter(thisB.plusFilter);
                        }
                        browser.view.redrawTracks();
                    }
                });
        browser.addGlobalMenuItem( 'view', plus_strand_toggle );
        var minus_strand_toggle = new dijitCheckedMenuItem(
                {
                    label: "Show minus strand",
                    checked: true,
                    onClick: function(event) {
                        var minus = this.get('checked');
                        if (!minus)  {
                            thisB.minusFilter=browser.addFeatureFilter(thisB.minusStrandFilter);
                        }
                        else  {
                            browser.removeFeatureFilter(thisB.minusFilter);
                        }
                        browser.view.redrawTracks();
                    }
                });
        browser.addGlobalMenuItem( 'view', minus_strand_toggle );
    },

    initSearchMenu: function()  {
        var thisB = this;
        this.browser.addGlobalMenuItem( 'tools',
            new dijitMenuItem(
                {
                    id: 'menubar_apollo_seqsearch',
                    label: "Search sequence",
                    onClick: function() {
                        thisB.getAnnotTrack().searchSequence();
                    }
                })
        );
        this.browser.renderGlobalMenu( 'tools', {text: 'Tools'}, this.browser.menuBar );

        // move Tool menu in front of Help menu
        var toolsMenu = registry.byId('dropdownbutton_tools');
        var helpMenu = registry.byId('dropdownbutton_help');
        domConstruct.place(toolsMenu.domNode,helpMenu.domNode,'before');
        this.searchMenuInitialized = true;
    },

    initLoginMenu: function(username) {
        var webapollo = this;
        var loginButton;
        if (username)  {   // permission only set if permission request succeeded
            this.browser.addGlobalMenuItem( 'user',
                            new dijitMenuItem(
                                            {
                                                    label: 'Logout',
                                                    onClick: function()  {
                                                            webapollo.getAnnotTrack().logout();
                                                    }
                                            })
            );
            var userMenu = this.browser.makeGlobalMenu('user');
            loginButton = new dijitDropDownButton(
                            { className: 'user',
                                    innerHTML: '<span class="usericon"></span>' + username,
                                    title: 'user logged in: UserName',
                                    dropDown: userMenu
                            });
        }
        else  {
            loginButton = new dijitButton(
                            { className: 'login',
                                    innerHTML: "Login",
                                    onClick: function()  {
                                            webapollo.getAnnotTrack().login();
                                    }
                            });
        }

        if (typeof window.parent.getEmbeddedVersion == 'undefined') {
            var annotatorButton = new dijitButton(
                {
                    innerHTML: "Annotator View",
                    onClick: function () {
                        window.location.href = '../';
                    }
                });
            this.browser.menuBar.appendChild( annotatorButton.domNode );
        }

        this.browser.menuBar.appendChild( loginButton.domNode );
        this.loginMenuInitialized = true;
    },
    getAnnotTrack: function()  {
        if (this.browser && this.browser.view && this.browser.view.tracks)  {
            var a;
            array.some(this.browser.view.tracks,function(track) {
                if(track.isInstanceOf(AnnotTrack))  {
                    a=track;
                    return true;
                }
            });
            return a;
        }
        return null;
    },

    getSequenceTrack: function()  {
        if (this.browser && this.browser.view && this.browser.view.tracks)  {
            var a;
            array.some(this.browser.view.tracks,function(track) {
                if (track.isInstanceOf(SequenceTrack))  {
                    a=track;
                    return true;
                }
            });
            return a;
        }
        return null;
    },

    

    setFavicon: function(favurl) {
        var $head = $('head');
        // remove any existing favicons
        var $existing_favs = $("head > link[rel='icon'], head > link[rel='shortcut icon']");
        $existing_favs.remove();

        // add new favicon (as both rel='icon' and rel='shortcut icon' for better browser compatibility)
        var favicon1 = document.createElement('link');
        favicon1.id = "favicon_icon";
        favicon1.rel = 'icon';
        favicon1.type="image/x-icon";
        favicon1.href = favurl;

        var favicon2 = document.createElement('link');
        favicon2.id = "favicon_shortcut_icon";
        favicon2.rel = 'shortcut icon';
        favicon2.type="image/x-icon";
        favicon2.href = favurl;

        $head.prepend(favicon1);
        $head.prepend(favicon2);
    },

    monkeyPatchRegexPlugin: function() {
        //use var to avoid optimizer
        var plugin='RegexSequenceSearch/Store/SeqFeature/RegexSearch';
        require([plugin], function(RegexSearch) {
            lang.extend(RegexSearch,{
                translateSequence:function( sequence, frameOffset ) {
                    var slicedSeq = sequence.slice( frameOffset );
                    slicedSeq = slicedSeq.slice( 0, Math.floor( slicedSeq.length / 3 ) * 3);

                    var translated = "";
                    var i,nextCodon;
                    var codontable=new CodonTable();
                    var codons=codontable.generateCodonTable(codontable.defaultCodonTable);
                    for(var i = 0; i < slicedSeq.length; i += 3) {
                        var nextCodon = slicedSeq.slice(i, i + 3);
                        translated = translated + codons[nextCodon];
                    }

                    return translated;
                }
            });
        });
    },

    createMenus: function() {
        var browser=this.browser;
        var thisB=this;
        
        // add a global menu option for setting CDS color
        var cds_frame_toggle = new dijitCheckedMenuItem(
                {
                    label: "Color by CDS frame",
                    checked: browser.cookie("colorCdsByFrame")=="true",
                    onClick: function(event) {
                        if(this.get("checked")) {
                            domClass.add(win.body(), "colorCds");
                        } else {
                            domClass.remove(win.body(),"colorCds");
                        }
                        browser.cookie("colorCdsByFrame", this.get("checked")?"true":"false");
                    }
                });
        browser.addGlobalMenuItem( 'view', cds_frame_toggle );

        var css_frame_menu = new dijitMenu();

        css_frame_menu.addChild(
            new dijitMenuItem({
                    label: "Light",
                    onClick: function (event) {
                        browser.cookie("Scheme","Light");
                        domClass.remove(win.body(), "Dark");
                    }
                }
            )
        );
        css_frame_menu.addChild(
            new dijitMenuItem({
                    label: "Dark",
                    onClick: function (event) {
                        browser.cookie("Scheme","Dark");
                        domClass.add(win.body(), "Dark");
                    }
                }
            )
        );


        var css_frame_toggle = new dijitPopupMenuItem(
            {
                label: "Color Scheme"
                ,popup: css_frame_menu
            });

        browser.addGlobalMenuItem('view', css_frame_toggle);

        this.addStrandFilterOptions();

        this._showLabels=(browser.cookie("showTrackLabel")||"true")=="true";
        var hide_track_label_toggle = new dijitCheckedMenuItem(
            {
                label: "Show track label",
                checked: this._showLabels,
                onClick: function(event) {
                    thisB._showLabels=this.get("checked");
                    browser.cookie("showTrackLabel",this.get("checked")?"true":"false");
                    thisB.updateLabels();
                }
            });
        browser.addGlobalMenuItem( 'view', hide_track_label_toggle);
        browser.addGlobalMenuItem( 'view', new dijitMenuSeparator());
        browser.subscribe('/jbrowse/v1/n/tracks/visibleChanged', dojo.hitch(this,"updateLabels"));
    },
    postCreateMenus: function() {
        var browser=this.browser;
        var help=registry.byId("menubar_generalhelp");

        help.set("label", "Apollo Help");
        help.set("iconClass", null);
        var jbrowseUrl = "http://jbrowse.org";
        browser.addGlobalMenuItem( 'help',
                                new dijitMenuItem(
                                    {
                                        id: 'menubar_powered_by_jbrowse',
                                        label: 'Powered by JBrowse',
                                        // iconClass: 'jbrowseIconHelp', 
                                        onClick: function()  { window.open(jbrowseUrl,'help_window').focus(); }
                                    })
                              );
        browser.addGlobalMenuItem( 'help',
            new dijitMenuItem(
                {
                    id: 'menubar_web_service_api',
                    label: 'Web Service API',
                    // iconClass: 'jbrowseIconHelp',
                    onClick: function()  { window.open("../web_services/web_service_api.html",'help_window').focus(); }
                })
        );
        browser.addGlobalMenuItem( 'help',
            new dijitMenuItem(
                {
                    id: 'menubar_apollo_version',
                    label: 'Get Version',
                    // iconClass: 'jbrowseIconHelp',
                    onClick: function()  {
                        window.open("../version.jsp",'help_window').focus();
                    }
                })
        );
        this.updateLabels();
    }
});

});

});
