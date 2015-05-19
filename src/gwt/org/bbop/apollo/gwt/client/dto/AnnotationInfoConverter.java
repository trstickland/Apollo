package org.bbop.apollo.gwt.client.dto;

import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONNumber;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by ndunn on 5/19/15.
 */
public class AnnotationInfoConverter {
    public static JSONObject convertAnnotationInfoToJSONObject(AnnotationInfo annotationInfo){
        JSONObject jsonObject = new JSONObject();

        jsonObject.put("name",new JSONString(annotationInfo.getName()));
        jsonObject.put("uniquename",new JSONString(annotationInfo.getUniqueName()));
        jsonObject.put("symbol",annotationInfo.getSymbol()!=null ? new JSONString(annotationInfo.getSymbol()):new JSONString(""));
        jsonObject.put("description",annotationInfo.getDescription()!=null ? new JSONString(annotationInfo.getDescription()):new JSONString(""));
        jsonObject.put("type",new JSONString(annotationInfo.getType()));
        jsonObject.put("fmin",annotationInfo.getMin()!=null ? new JSONNumber(annotationInfo.getMin()): null);
        jsonObject.put("fmax",annotationInfo.getMax()!=null ? new JSONNumber(annotationInfo.getMax()): null);
        jsonObject.put("strand",annotationInfo.getStrand()!=null ? new JSONNumber(annotationInfo.getStrand()): null);


        return jsonObject;

    }

    public static List<AnnotationInfo> convertFromJsonArray(JSONArray jsonArray) {
        List<AnnotationInfo> annotationInfoList = new ArrayList<>();

        for(int i = 0 ; i < jsonArray.size() ; i++){
            annotationInfoList.add(convertJSONObjectToAnnotationInfo(jsonArray.get(i).isObject()));
        }


        return annotationInfoList ;
    }

    public static AnnotationInfo convertJSONObjectToAnnotationInfo(JSONObject jsonObject) {
        AnnotationInfo annotationInfo = new AnnotationInfo();

        annotationInfo.setName(jsonObject.get("name").isString().stringValue());
        annotationInfo.setUniqueName(jsonObject.get("uniquename").isString().stringValue());

        if(jsonObject.containsKey("symbol") && jsonObject.get("symbol")!=null){
            annotationInfo.setSymbol(jsonObject.get("symbol").isString().stringValue());
        }

        if(jsonObject.containsKey("description") && jsonObject.get("description")!=null){
            annotationInfo.setDescription(jsonObject.get("description").isString().stringValue());
        }

//        "type":{"name":"exon", "cv":{"name":"sequence" } }
        if(jsonObject.get("type").isString()!=null){
            annotationInfo.setType(jsonObject.get("type").isString().stringValue());
        }
        else{
            // is object?
            annotationInfo.setType(jsonObject.get("type").isObject().get("name").isString().stringValue());
        }

        if(jsonObject.containsKey("location")){
            JSONObject locationObject = jsonObject.get("location").isObject();
            if(locationObject.containsKey("fmin") && locationObject.get("fmin")!=null){
                annotationInfo.setMin( (int) locationObject.get("fmin").isNumber().doubleValue());
            }
            if(locationObject.containsKey("fmax") && locationObject.get("fmax") != null) {
                annotationInfo.setMax((int) locationObject.get("fmax").isNumber().doubleValue());
            }
            if(locationObject.containsKey("strand") && locationObject.get("strand") != null) {
                annotationInfo.setStrand((int) locationObject.get("strand").isNumber().doubleValue());
            }
        }

        annotationInfo.setSequence(jsonObject.get("sequence").isString().stringValue());

        return annotationInfo;
    }
}
