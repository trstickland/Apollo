define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/Model/SimpleFeature'
       ],
       function(
           declare,
           array,
           SimpleFeature
       ) {


/**
*  creates a feature in JBrowse JSON format
*  takes as arguments:
*      afeature: feature in ApolloEditorService JSON format,
*      arep: ArrayRepr for kind of JBrowse feature to output
*      OLD: fields: array specifying order of fields for JBrowse feature
*      OLD: subfields:  array specifying order of fields for subfeatures of JBrowse feature
*   "CDS" type feature in Apollo JSON format is from genomic start of translation to genomic end of translation,
*          (+ stop codon), regardless of intons, so one per transcript (usually)
*   "CDS" type feature in JBrowse JSON format is a CDS _segment_, which are piecewise and broken up by introns
*          therefore commonyly have multiple CDS segments
*
*/
var JAFeature = declare( SimpleFeature, {
    "-chains-": {
        constructor: "manual"
    },
    constructor: function( afeature, parent ) {
        this.afeature = afeature;
        if (parent)  { this._parent = parent; }
        
        // get the main data
        var loc = afeature.location;
        var pfeat = this;
        this.data = {
            start: loc.fmin,
            end: loc.fmax,
            strand: loc.strand,
            name: afeature.name,
            parent_id: afeature.parent_id,
            parent_type: afeature.parent_type ? afeature.parent_type.name : undefined,
            type: afeature.type.name, 
            properties: afeature.properties
        };

        if (this.data.type === "CDS")  { 
            this.data.type = "wholeCDS"; 
        }
        else if (this.data.type === "stop_codon_read_through") {
            parent.data.readThroughStopCodon = true;
        }
    
        this._uniqueID = afeature.uniquename;

        if (afeature.properties) {
            for (var i = 0; i < afeature.properties.length; ++i) {
                var property = afeature.properties[i];
                if (property.type.name == "comment" && property.value == "Manually set translation start") {
                    this.data.manuallySetTranslationStart = true;   // so can call feat.get('manuallySetTranslationStart')
                    if (this.parent())  { parent.data.manuallySetTranslationStart = true; }
                }
                else if (property.type.name == "comment" && property.value == "Manually set translation end") {
                    this.data.manuallySetTranslationEnd = true;   // so can call feat.get('manuallySetTranslationEnd')
                    if (this.parent())  { parent.data.manuallySetTranslationEnd = true; }
                }
                else if (property.type.name == "owner") {
                    this.data.owner = property.value;
                }
            }
        }
        
        if (!parent) {
            if (afeature.children) {
                var descendants = [];
                for (var i = 0; i < afeature.children.length; ++i) {
                    var child = afeature.children[i];
                    if (child.children) {
                        for (var j = 0; j < child.children.length; ++j) {
                            this.flattenFeature(child.children[j], descendants);
                        }
                    }
                }
                afeature.children = afeature.children.concat(descendants);
            }
            else {
                var child = dojo.clone(afeature);
                child.uniquename += "-clone";
                this.set("cloned_subfeatures", true);
                afeature.children = [ child ];
            }
        }
        
        // moved subfeature assignment to bottom of feature construction, since subfeatures may need to call method on their parent
        //     only thing subfeature constructor won't have access to is parent.data.subfeatures
        // get the subfeatures              
        this.data.subfeatures = array.map( afeature.children, function(s) {
            return new JAFeature( s, pfeat);
        } );

    },


    
    getUniqueName: function() {
        if (this.parent() && this.parent().get("cloned_subfeatures")) {
            return this.parent().id();
        }
        return this.id();
    },
    flattenFeature: function(feature, descendants) {
        descendants.push(feature);
        var i;
        if (feature.children) {
            for ( i = 0; i < feature.children.length; ++i) {
                this.flattenFeature(feature.children[i], descendants);
            }
            feature.children = [];
        }
    }
});

return JAFeature;

});


