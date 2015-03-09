define( [
            'dojo/_base/declare',
            'dojo/dom-construct',
            'dojo/dom-style',
            'dojo/dom-attr',
            'jquery'
        ], 
        function(declare,
            domConstruct,
            domStyle,
            domAttr,
            $) {

return declare([], {

constructor: function(contextPath) {
    this.contextPath = contextPath;
},

setRedirectCallback: function(callback) {
    this.redirectCallback = callback;
},

setErrorCallback: function(callback) {
    this.errorCallback = callback;
},

searchSequence: function(trackName, refSeqName, starts) {
    var operation = "search_sequence";
    var contextPath = this.contextPath;
    var redirectCallback = this.redirectCallback;
    var errorCallback = this.errorCallback;
    
    var content = domConstruct.create("div", { className: "search_sequence" });
    var sequenceToolsDiv = domConstruct.create("div", { className: "search_sequence_tools" }, content);
    var sequenceToolsSelect = domConstruct.create("select", { className: "search_sequence_tools_select" }, sequenceToolsDiv);
    var sequenceDiv = domConstruct.create("div", { className: "search_sequence_area" }, content);
    var sequenceLabel = domConstruct.create("div", { className: "search_sequence_label", innerHTML: "Enter sequence" }, sequenceDiv);
    var sequenceFieldDiv = domConstruct.create("div", { }, sequenceDiv);
    var sequenceField = domConstruct.create("textarea", { className: "search_sequence_input" }, sequenceFieldDiv);
    var searchAllRefSeqsDiv = domConstruct.create("div", { className: "search_all_ref_seqs_area" }, sequenceDiv);
    var searchAllRefSeqsCheckbox = domConstruct.create("input", { className: "search_all_ref_seqs_checkbox", type: "checkbox" }, searchAllRefSeqsDiv);
    var searchAllRefSeqsLabel = domConstruct.create("span", { className: "search_all_ref_seqs_label", innerHTML: "Search all genomic sequences" }, searchAllRefSeqsDiv);
    var sequenceButtonDiv = domConstruct.create("div", { }, sequenceDiv);
    var sequenceButton = domConstruct.create("button", { innerHTML: "Search" }, sequenceButtonDiv);
    var messageDiv = domConstruct.create("div", { className: "search_sequence_message", innerHTML: "No matches found" }, content);
    var waitingDiv = domConstruct.create("div", { innerHTML: "<img class='waiting_image' src='plugins/WebApollo/img/loading.gif' />"}, content);
    var headerDiv = domConstruct.create("div", { className: "search_sequence_matches_header" }, content);
    domConstruct.create("span", { innerHTML: "ID", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    domConstruct.create("span", { innerHTML: "Start", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    domConstruct.create("span", { innerHTML: "End", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    domConstruct.create("span", { innerHTML: "Score", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    domConstruct.create("span", { innerHTML: "Significance", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    domConstruct.create("span", { innerHTML: "Identity", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    var matchDiv = domConstruct.create("div", { className: "search_sequence_matches" }, content);
    var matches = domConstruct.create("div", { }, matchDiv);

    domStyle.set(messageDiv, { display: "none" });
    domStyle.set(matchDiv, { display: "none" });
    domStyle.set(headerDiv, { display: "none" });
    domStyle.set(waitingDiv, { display: "none" });
    if (!refSeqName) {
        domStyle.set(searchAllRefSeqsDiv, { display: "none" });
    }

    var getSequenceSearchTools = function() {
        var ok = false;
        var operation = "get_sequence_search_tools";
        dojo.xhrPost( {
            postData: '{ "track": "' + trackName + '", "operation": "' + operation + '" }', 
            url: contextPath + "/AnnotationEditorService",
            sync: true,
            handleAs: "json",
            timeout: 5000 * 1000, // Time in milliseconds
            load: function(response, ioArgs) {
                if (response.sequence_search_tools.length == 0) {
                    ok = false;
                    return;
                }
                for (var i = 0; i < response.sequence_search_tools.length; ++i) {
                    domConstruct.create("option", { innerHTML: response.sequence_search_tools[i] }, sequenceToolsSelect);
                }
                ok = true;
            },
            error: function(response, ioArgs) {
                errorCallback(response);
                return response;
            }
        });
        return ok;
    };
    
    var search = function() {
        var residues = domAttr.get(sequenceField, "value").toUpperCase();
        var ok = true;
        if (residues.length == 0) {
            alert("No sequence entered");
            ok = false;
        }
        else if (residues.match(/[^ACDEFGHIKLMNPQRSTVWXY\n]/)) {
            alert("The sequence should only contain non redundant IUPAC nucleotide or amino acid codes (except for N/X)");
            ok = false;
        }
        var searchAllRefSeqs = domAttr.get(searchAllRefSeqsCheckbox, "checked");
        if (ok) {
            domStyle.set(waitingDiv, { display: "block"} );
            domStyle.set(matchDiv, { display: "none"} );
            domStyle.set(headerDiv, { display: "none" });
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", "search": { "key": "' + sequenceToolsSelect.value + '", "residues": "' + residues + (!searchAllRefSeqs && refSeqName != null ? '", "database_id": "' + refSeqName : '') + '"}, "operation": "' + operation + '" }', 
                url: contextPath + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    domStyle.set(waitingDiv, { display: "none"} );
                    while (matches.hasChildNodes()) {
                        matches.removeChild(matches.lastChild);
                    }
                    if (response.matches.length == 0) {
                        domStyle.set(messageDiv, { display: "block" });
                        domStyle.set(matchDiv, { display: "none" });
                        domStyle.set(headerDiv, { display: "none" });
                        return;
                    }
                    domStyle.set(messageDiv, { display: "none" });
                    domStyle.set(headerDiv, { display: "block"} );
                    domStyle.set(matchDiv, { display: "block"} );
                    
                    var returnedMatches = response.matches;
                    returnedMatches.sort(function(match1, match2) {
                        return match2.rawscore - match1.rawscore;
                    });
                    var maxNumberOfHits = 100;
                    
                    for (var i = 0; i < returnedMatches.length && i < maxNumberOfHits; ++i) {
                        var match = returnedMatches[i];
                        var query = match.query;
                        var subject = match.subject;
                        var refSeqStart = starts[subject.feature.uniquename] || 0;
                        var refSeqEnd = starts[subject.feature.uniquename] || 0;
                        subject.location.fmin += refSeqStart;
                        subject.location.fmax += refSeqStart;
                        var subjectStart = subject.location.fmin + 1;
                        var subjectEnd = subject.location.fmax + 1;
                        if (subject.location.strand == -1) {
                            var tmp = subjectStart;
                            subjectStart = subjectEnd;
                            subjectEnd = tmp;
                        }
                        var rawscore = match.rawscore;
                        var significance = match.significance;
                        var identity = match.identity;
                        var row = domConstruct.create("div", { className: "search_sequence_matches_row" + (dojo.isFF ? " search_sequence_matches_row-firefox" : "") }, matches);
                        var subjectIdColumn = domConstruct.create("span", { innerHTML: subject.feature.uniquename, className: "search_sequence_matches_field search_sequence_matches_generic_field", title: subject.feature.uniquename }, row);
                        var subjectStartColumn = domConstruct.create("span", { innerHTML: subjectStart, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                        var subjectEndColumn = domConstruct.create("span", { innerHTML: subjectEnd, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                        var scoreColumn = domConstruct.create("span", { innerHTML: match.rawscore, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                        var significanceColumn = domConstruct.create("span", { innerHTML: match.significance, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                        var identityColumn = domConstruct.create("span", { innerHTML : match.identity, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                        dojo.connect(row, "onclick", function(id, fmin, fmax) {
                            return function() {
                                redirectCallback(id, fmin, fmax);
                            };
                        }(subject.feature.uniquename, subject.location.fmin, subject.location.fmax));
                    }
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) { // 
                    errorCallback(response);
                    return response;
                }

            });
        }
    };
    
    dojo.connect(sequenceField, "onkeypress", function(event) {
        if (event.keyCode == dojo.keys.ENTER) {
            event.preventDefault();
            search();
        }
    });
    dojo.connect(sequenceButton, "onclick", search);
    dojo.connect(searchAllRefSeqsLabel, "onclick", function() {
        domAttr.set(searchAllRefSeqsCheckbox, "checked", !searchAllRefSeqsCheckbox.checked);
    });

    if (!getSequenceSearchTools()) {
        alert("No search plugins setup");
        return null;
    }
    
    return content;
}

});


} );

