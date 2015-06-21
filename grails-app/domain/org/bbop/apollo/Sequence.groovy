package org.bbop.apollo

/**
 * Replaces tracks in config.xml/tracks
 */
class Sequence {

    static auditable = true

    static constraints = {
        name nullable: false
        start nullable: false
        end nullable: false
        organism nullable: true
        translationTableLocation nullable: true
        spliceDonorSite nullable: true
        spliceAcceptor nullable: true
    }


    // feature locations instead of features
    static hasMany = [
            featureLocations: FeatureLocation
    ]

    static mapping = {
        end column: "sequence_end"
        start column: "sequence_start"
        featureLocations cascade: 'all-delete-orphan'
    }

    static belongsTo = [Organism]


    String name
    Organism organism
    String translationTableLocation
    String spliceDonorSite = "GT"
    String spliceAcceptor = "AG"
    Integer length
    Integer start
    Integer end
}
