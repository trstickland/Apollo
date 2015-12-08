define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/dom-construct',
            'dojo/dom-attr',
            'dojo/on',
            'dijit/Menu',
            'dijit/MenuItem', 
            'dijit/PopupMenuItem',
            'dijit/form/Button',
            'WebApollo/JSONUtils',
            'JBrowse/Util', 
            'JBrowse/View/GranularRectLayout',
            'dojo/request'
        ],
        function(
          declare,
          array,
          domConstruct,
          domAttr,
          on,
          dijitMenu,
          dijitMenuItem,
          dijitPopupMenuItem,
          dijitButton,
          JSONUtils, 
          Util,
          Layout,
          request)
        {

var context_path='..';
return declare( null, {

    getSequence: function()  {
        var selected = this.selectionManager.getSelection();
        this.getSequenceForSelectedFeatures(selected);
    },

    getSequenceForSelectedFeatures: function(records) {
        var track = this;

        var content = domConstruct.create("div", { className: "get_sequence" });
        var textArea = domConstruct.create("textarea", { className: "sequence_area", readonly: true }, content);
        var form = domConstruct.create("form", { }, content);
        var peptideButtonDiv = domConstruct.create("div", { className: "first_button_div" }, form);
        var peptideButton = domConstruct.create("input", { type: "radio", name: "type", checked: true }, peptideButtonDiv);
        var peptideButtonLabel = domConstruct.create("label", { innerHTML: "Peptide sequence", className: "button_label" }, peptideButtonDiv);
        var cdnaButtonDiv = domConstruct.create("div", { className: "button_div" }, form);
        var cdnaButton = domConstruct.create("input", { type: "radio", name: "type" }, cdnaButtonDiv);
        var cdnaButtonLabel = domConstruct.create("label", { innerHTML: "cDNA sequence", className: "button_label" }, cdnaButtonDiv);
        var cdsButtonDiv = domConstruct.create("div", { className: "button_div" }, form);
        var cdsButton = domConstruct.create("input", { type: "radio", name: "type" }, cdsButtonDiv);
        var cdsButtonLabel = domConstruct.create("label", { innerHTML: "CDS sequence", className: "button_label" }, cdsButtonDiv);
        var genomicButtonDiv = domConstruct.create("div", { className: "button_div" }, form);
        var genomicButton = domConstruct.create("input", { type: "radio", name: "type" }, genomicButtonDiv);
        var genomicButtonLabel = domConstruct.create("label", { innerHTML: "Genomic sequence", className: "button_label" }, genomicButtonDiv);
        var genomicWithFlankButtonDiv = domConstruct.create("div", { className: "button_div" }, form);
        var genomicWithFlankButton = domConstruct.create("input", { type: "radio", name: "type" }, genomicWithFlankButtonDiv);
        var genomicWithFlankButtonLabel = domConstruct.create("label", { innerHTML: "Genomic sequence +/-", className: "button_label" }, genomicWithFlankButtonDiv);
        var genomicWithFlankField = domConstruct.create("input", { type: "text", size: 5, className: "button_field", value: "500" }, genomicWithFlankButtonDiv);
        var genomicWithFlankFieldLabel = domConstruct.create("label", { innerHTML: "bases", className: "button_label" }, genomicWithFlankButtonDiv);

        var fetchSequence = function(type) {
            var features = array.map(records, function(record) {
                return { "uniquename": record.feature.getUniqueName() };
            });
            var trackName = track.getUniqueTrackName();
            var postData = { "track": trackName, "features": features };
            var flank = 0;
            if (type == "genomic_with_flank") {
                flank = domAttr.get(genomicWithFlankField, "value");
                type = "genomic";
            }
            postData.flank=flank;
            postData.type=type;
            console.log(postData);
            request(context_path + "/annotationEditor/getSequence", {
                data: "data="+JSON.stringify(postData),
                handleAs: "json",
                timeout: 5000 * 1000,
                method: "post"
            }).then(function(response) {
                var textAreaContent = "";
                console.log(response);
                array.forEach(response.features, function(feature) {
                    var cvterm = feature.type;
                    var residues = feature.residues;
                    var loc = feature.location;
                    textAreaContent += "&gt;" + feature.uniquename + " (" + cvterm.cv.name + ":" + cvterm.name + ") " + residues.length + " residues [" + track.refSeq.name + ":" + (loc.fmin + 1) + "-" + loc.fmax + " " + (loc.strand == -1 ? "-" : loc.strand == 1 ? "+" : "no") + " strand] ["+ type + (flank > 0 ? " +/- " + flank + " bases" : "") + "]\n";
                    var lineLength = 70;
                    for (var j = 0; j < residues.length; j += lineLength) {
                        textAreaContent += residues.substr(j, lineLength) + "\n";
                    }
                });
                domAttr.set(textArea, "innerHTML", textAreaContent);
            },
            function(response) {
                console.log(response);
                return response;
            });
        };
        var callback = function(event) {
            var type;
            var target = event.target || event.srcElement;
            if (target == peptideButton || target == peptideButtonLabel) {
                    domAttr.set(peptideButton, "checked", true);
                    type = "peptide";
            }
            else if (target == cdnaButton || target == cdnaButtonLabel) {
                    domAttr.set(cdnaButton, "checked", true);
                    type = "cdna";
            }
            else if (target == cdsButton || target == cdsButtonLabel) {
                    domAttr.set(cdsButton, "checked", true);
                    type = "cds";
            }
            else if (target == genomicButton || target == genomicButtonLabel) {
                    domAttr.set(genomicButton, "checked", true);
                    type = "genomic";
            }
            else if (target == genomicWithFlankButton || target == genomicWithFlankButtonLabel) {
                    domAttr.set(genomicWithFlankButton, "checked", true);
                    type = "genomic_with_flank";
            }
            fetchSequence(type);
        };

        on(peptideButton, "onchange", null, callback);
        on(peptideButtonLabel, "onclick", null, callback);
        on(cdnaButton, "onchange", null, callback);
        on(cdnaButtonLabel, "onclick", null, callback);
        on(cdsButton, "onchange", null, callback);
        on(cdsButtonLabel, "onclick", null, callback);
        on(genomicButton, "onchange", null, callback);
        on(genomicButtonLabel, "onclick", null, callback);
        on(genomicWithFlankButton, "onchange", null, callback);
        on(genomicWithFlankButtonLabel, "onclick", null, callback);

        fetchSequence("peptide");
        this.openDialog("Sequence", content);
    }
});
});
