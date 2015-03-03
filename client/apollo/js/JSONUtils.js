define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/Util',
         'JBrowse/Model/SimpleFeature', 
         'WebApollo/SequenceOntologyUtils',
         'WebApollo/JAFeature'
       ],
       function(
           declare,
           array,
           Util,
           SimpleFeature,
           SeqOnto,
           JAFeature
       ) {

var JSONUtils;
JSONUtils = {

createJBrowseFeature: function( afeature )  {
    return new JAFeature( afeature );
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
},


/**
 *  takes any JBrowse feature, returns a SimpleFeature "copy", 
 *        for which all properties returned by tags() are mutable (has set() method)
 *  needed since JBrowse features no longer necessarily mutable
 *    feature requirements:
 *         functions: id, parent, tags, get
 *         if subfeatures, then returned as array by feature.get('subfeatures')
 *      
 */
makeSimpleFeature: function(feature, parent)  {
    var result = new SimpleFeature({id: feature.id(), parent: parent || feature.parent() });
    var ftags = feature.tags();
    for (var tindex = 0; tindex < ftags.length; tindex++)  {  
        var tag = ftags[tindex];
        // forcing lower case, since still having case issues with NCList features
        result.set(tag.toLowerCase(), feature.get(tag.toLowerCase()));
    }
    var subfeats = feature.get('subfeatures');
    if (subfeats && (subfeats.length > 0))  {
        var simple_subfeats = [];
        for (var sindex = 0; sindex < subfeats.length; sindex++)  {
            var simple_subfeat = this.makeSimpleFeature(subfeats[sindex], result);
            simple_subfeats.push(simple_subfeat);
        }
        result.set('subfeatures', simple_subfeats);
    }
    return result;
},

/**
*  creates a sequence alteration in JBrowse JSON format
*  takes as arguments:
*      arep: ArrayRepr for kind of JBrowse feature to output
*      afeature: sequence alteration in ApolloEditorService JSON format,
*/
createJBrowseSequenceAlteration: function( afeature )  {
    var loc = afeature.location; 
    var uid = afeature.uniquename;

    return new SimpleFeature({
        data: {
            start:    loc.fmin,
            end:      loc.fmax,
            strand:   loc.strand,
            id:       uid,
            type:     afeature.type.name,
            residues: afeature.residues,
            seq:      afeature.residues
        },
        id: uid
    });
},


/** 
*  creates a feature in ApolloEditorService JSON format
*  takes as argument:
*       jfeature: a feature in JBrowse JSON format, 
*       fields: array specifying order of fields in jfeature
*       subfields: array specifying order of fields in subfeatures of jfeature
*       specified_type (optional): type passed in that overrides type info for jfeature
*  ApolloEditorService format:
*    { 
*       "location" : { "fmin": fmin, "fmax": fmax, "strand": strand }, 
*       "type": { "cv": { "name":, cv },   // typical cv name: "SO" (Sequence Ontology)
*                 "name": cvterm },        // typical name: "transcript"
*       "children": { __recursive ApolloEditorService feature__ }
*    }
* 
*   For ApolloEditorService "add_feature" call to work, need to have "gene" as toplevel feature, 
*         then "transcript", then ???
*                 
*    JBrowse JSON fields example: ["start", "end", "strand", "id", "subfeatures"]
*
*    type handling
*    if specified_type arg present, it determines type name
*    else if fields has a "type" field, use that to determine type name
*    else don't include type 
*
*    ignoring JBrowse ID / name fields for now
*    currently, for features with lazy-loaded children, ignores children 
*/
createApolloFeature: function( jfeature, specified_type, useName, specified_subtype )   {

    var afeature =  {};
    var astrand;
    switch (jfeature.get('strand')) {  // strand
    case 1:
    case '+':
        astrand = 1; break;
    case -1:
    case '-':
        astrand = -1; break;
    default:
        astrand = 0; // either not stranded or strand is unknown
    }
    
    afeature.location = {
        "fmin": jfeature.get('start'),
        "fmax": jfeature.get('end'),
        "strand": astrand
    };

    var typename;
    if (specified_type)  {
        typename = specified_type;
    }
    else if ( jfeature.get('type') ) {
        typename = jfeature.get('type');
    }

    if (typename)  {
        afeature.type = {
            "cv": {
                "name": "sequence"
            }
        };
        afeature.type.name = typename;
    }

    var name = jfeature.get('name');
    if (useName && name) {
        afeature.name = name;
    }
    

    var subfeats;
    subfeats = jfeature.get('subfeatures'); 
    if( subfeats && subfeats.length )  {
        afeature.children = [];
        var slength = subfeats.length;
        var cds;
        var cdsFeatures = [];
        var foundExons = false;
        
        var updateCds = function(subfeat) {
            if (!cds) {
                cds = new SimpleFeature({id: "cds", parent: jfeature});
                cds.set('start', subfeat.get('start'));
                cds.set('end', subfeat.get('end'));
                cds.set('strand', subfeat.get('strand'));
                cds.set('type', 'CDS');
            }
            else {
                if (subfeat.get("start") < cds.get("start")) {
                    cds.set("start", subfeat.get("start"));
                }
                if (subfeat.get("end") > cds.get("end")) {
                    cds.set("end", subfeat.get("end"));
                }
            }
        };
        
        for (var i=0; i<slength; i++)  {
            var subfeat = subfeats[i];
            var subtype = subfeat.get('type');
                var converted_subtype = specified_subtype || subtype;
                if (!specified_subtype) {
                    if (SeqOnto.exonTerms[subtype])  {
                        // definitely an exon, leave exact subtype as is 
                        // converted_subtype = "exon"
                    }
                    else if (subtype === "wholeCDS" || subtype === "polypeptide") {
                        // normalize to "CDS" sequnce ontology term
                        // converted_subtype = "CDS";
                        updateCds(subfeat);
                        converted_subtype = null;
                    }
                    else if (SeqOnto.cdsTerms[subtype])  {
                        // other sequence ontology CDS terms, leave unchanged
                        updateCds(subfeat);
                        converted_subtype = null;
                        cdsFeatures.push(subfeat);
                    }
                    else if (SeqOnto.spliceTerms[subtype])  {  
                        // splice sites filter out
                        converted_subtype = null;
                    }
                    else if (SeqOnto.startCodonTerms[subtype] || SeqOnto.stopCodonTerms[subtype])  {
                        // start and stop codons filter
                        converted_subtype = null;
                    }
                    else if (SeqOnto.intronTerms[subtype])  {
                        // introns -- filter out?  leave unchanged?
                        converted_subtype = null;  // filter out
                    }
                    else  { 
                        // convert everything else to exon???
                        // need to do this since server only creates exons for "exon" and descendant terms
                        converted_subtype = "exon";
                    }
                }
                if (SeqOnto.exonTerms[subtype]) {
                    foundExons = true;
                }
                if (converted_subtype)  {
                    afeature.children.push( this.createApolloFeature( subfeat, converted_subtype ) );
                }
        }
        if (cds) {
            afeature.children.push( this.createApolloFeature( cds, "CDS"));
            if (!foundExons) {
                for (var i = 0; i < cdsFeatures.length; ++i) {
                    afeature.children.push(this.createApolloFeature(cdsFeatures[i], "exon"));
                }
            }
        }
    }
    else if ( specified_type === 'transcript' )  {
        // need to create an artificial exon child the same size as the transcript
        var fake_exon = new SimpleFeature({id: jfeature.id()+"_dummy_exon", parent: jfeature});
        fake_exon.set('start', jfeature.get('start'));
        fake_exon.set('end', jfeature.get('end'));
        fake_exon.set('strand', jfeature.get('strand'));
        fake_exon.set('type', 'exon');
        afeature.children = [ this.createApolloFeature( fake_exon ) ];
    }
    return afeature;
}

};

return JSONUtils;
 
});
