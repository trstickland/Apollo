define( [
            'dojo/_base/declare',
            'dojo/dom-construct',
            'dojo/dom-attr',
            'dojo/dom-geometry',
            'dojo/on',
            'dijit/Menu',
            'dijit/MenuItem', 
            'dijit/PopupMenuItem',
            'dijit/form/Button',
            'jquery',
            'WebApollo/JSONUtils',
            'JBrowse/Util', 
            'JBrowse/View/GranularRectLayout',
            'dojo/request/xhr'
        ],
        function( declare,
          domConstruct,
          domAttr,
          domGeom,
          on,
          dijitMenu,
          dijitMenuItem,
          dijitPopupMenuItem,
          dijitButton,
          $,
          JSONUtils, 
          Util,
          Layout,
          xhr)
        {

var context_path='..';
return declare([],{

    getHistory: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.getHistoryForSelectedFeatures(selected);
    }, 

    getHistoryForSelectedFeatures: function(selected) {
        var track = this;
        var content = domConstruct.create("div");
        var historyDiv = domConstruct.create("div", { className: "history_div" }, content);
        var historyTable = domConstruct.create("div", { className: "history_table" }, historyDiv);
        var historyHeader = domConstruct.create("div", { className: "history_header", innerHTML: "<span class='history_header_column history_column_operation history_column'>Operation</span><span class='history_header_column history_column'>Editor</span><span class='history_header_column history_column'>Date</span>" }, historyTable);
        var historyRows = domConstruct.create("div", { className: "history_rows" }, historyTable);
        var historyPreviewDiv = domConstruct.create("div", { className: "history_preview" }, historyDiv);
        var history;
        var selectedIndex = 0;
        var minFmin;
        var maxFmax;
        var current;
        var historyMenu;
        var canEdit = this.canEdit(selected[0].feature);

        var revert = function() {
            if (selectedIndex == current) {
                return;
            }
            if (selectedIndex < current) {
                track.undoFeaturesByUniqueName([ history[0].features[0].uniquename ], current - selectedIndex);
            }
            else if (selectedIndex > current) {
                track.redoFeaturesByUniqueName([ history[0].features[0].uniquename ], selectedIndex - current);
            }
            history[selectedIndex].current = true;
            history[current].current = false;
            domAttr.set(historyRows.childNodes.item(selectedIndex), "class", history[selectedIndex].current ? "history_row history_row_current" : "history_row");
            domAttr.set(historyRows.childNodes.item(current), "class", "history_row");
            current = selectedIndex;
        };
        
        var initMenu = function() {
            historyMenu = new dijitMenu({ });
            historyMenu.addChild(new dijitMenuItem({
                label: "Set as current",
                onClick: function() {
                    revert();
                }
            }));
            historyMenu.startup();
        };
        
        var cleanupDiv = function(div) {
            if (div.style.top) {
                div.style.top = null;
            }
            if (div.style.visibility)  { div.style.visibility = null; }
            // annot_context_menu.unBindDomNode(div);
            $(div).unbind();
            for (var i = 0; i < div.childNodes.length; ++i) {
                cleanupDiv(div.childNodes[i]);
            }
        };

        var displayPreview = function(index) {
            var historyItem = history[index];
            var afeature = historyItem.features[0];
            var jfeature = JSONUtils.createJBrowseFeature(afeature);
            var fmin = afeature.location.fmin;
            var fmax = afeature.location.fmax;
            var maxLength = maxFmax - minFmin;
            // track.featureStore._add_getters(track.attrs.accessors().get, jfeature);
            historyPreviewDiv.featureLayout = new Layout(fmin, fmax);
            historyPreviewDiv.featureNodes = [];
            historyPreviewDiv.startBase = minFmin - (maxLength * 0.1);
            historyPreviewDiv.endBase = maxFmax + (maxLength * 0.1);
            var coords = domGeom.position(historyPreviewDiv);
            // setting labelScale and descriptionScale parameter to 100 px/bp,
            // so neither should get triggered
            var featDiv = track.renderFeature(jfeature, jfeature.uid, historyPreviewDiv, coords.w / (maxLength), 100, 100, minFmin, maxFmax, true);
            cleanupDiv(featDiv);
            
            historyMenu.bindDomNode(featDiv);
            
            while (historyPreviewDiv.hasChildNodes()) {
                historyPreviewDiv.removeChild(historyPreviewDiv.lastChild);
            }
            historyPreviewDiv.appendChild(featDiv);
            domAttr.set(historyRows.childNodes.item(selectedIndex), "class", history[selectedIndex].current ? "history_row history_row_current" : "history_row");
            domAttr.set(historyRows.childNodes.item(index), "class", "history_row history_row_selected");
            selectedIndex = index;
        };

        var displayHistory = function() {
            for (var i = 0; i < history.length; ++i) {
                var historyItem = history[i];
                var rowCssClass = "history_row";
                var row = domConstruct.create("div", { className: rowCssClass }, historyRows);
                var columnCssClass = "history_column";
                domConstruct.create("span", { className: columnCssClass + " history_column_operation ", innerHTML: historyItem.operation }, row);
                domConstruct.create("span", { className: columnCssClass, innerHTML: historyItem.editor }, row);
                domConstruct.create("span", { className: columnCssClass + " history_column_date", innerHTML: historyItem.date }, row);
                var revertButton = new dijitButton( {
                    label: "Revert",
                    showLabel: false,
                    iconClass: "dijitIconUndo",
                    class: "revert_button",
                    onClick: function(index) {
                        return function() {
                            selectedIndex = index;
                            revert();
                        };
                    }(i)
                });
                if (!canEdit) {
                    revertButton.set("disabled", true);
                }
                domConstruct.place(revertButton.domNode, row);
                var afeature = historyItem.features[0];
                var fmin = afeature.location.fmin;
                var fmax = afeature.location.fmax;
                if (minFmin == undefined || fmin < minFmin) {
                    minFmin = fmin;
                }
                if (maxFmax == undefined || fmax > maxFmax) {
                    maxFmax = fmax;
                }
                
                if (historyItem.current) {
                    current = i;
                }

                on(row, "onclick", row, function(index) {
                    return function() {
                        displayPreview(index);
                    };
                }(i));

                on(row, "oncontextmenu", row, function(index) {
                    return function() {
                        displayPreview(index);
                    };
                }(i));

                historyMenu.bindDomNode(row);

            }
            displayPreview(current);
            var coords = domGeom.position(row);
            historyRows.scrollTop = selectedIndex * coords.h;
        };
    
        var fetchHistory = function() {
            var features = [];
            for (var i in selected)  {
                var record = selected[i];
                var annot = track.getTopLevelAnnotation(record.feature);
                var uniqueName = annot.id();
                // just checking to ensure that all features in selection are
                // from this track
                if (record.track === track)  {
                    var trackdiv = track.div;
                    var trackName = track.getUniqueTrackName();

                    features.push({ "uniquename": uniqueName });
                }
            }
            var operation = "get_history_for_features";
            var trackName = track.getUniqueTrackName();
            xhr.post(context_path + "/AnnotationEditorService", {
                data: JSON.stringify( { "track": trackName, "features": features, "operation": operation }),
                handleAs: "json",
                timeout: 5000 * 1000
            }).then(function(response, ioArgs) {
                var features = response.features;
                history = features[i].history;
                displayHistory();
            },
            function(response, ioArgs) {
                track.handleError(response);
                return response;
            });
        };

        initMenu();
        fetchHistory();
        this.openDialog("History", content);
        this.popupDialog.resize();
        this.popupDialog._position();
    }


});
});
