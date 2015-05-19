package org.bbop.apollo.gwt.client.rest;

import com.google.gwt.http.client.*;

/**
 * Created by ndunn on 1/28/15.
 */
public class AnnotationRestService {

    private static Long integerIndex = 0L ;

    public static void getAnnotations(RequestCallback requestCallback, String sequenceName, String annotationNameFilter, String typeFilter, String userFilter , int start, int length, String sortColumn, Boolean sortAscending) {

        String searchString = "annotator/findAnnotations/?sequenceName=" + sequenceName
                + "&annotationName=" + annotationNameFilter
                + "&type=" + typeFilter
                + "&user=" + userFilter
                + "&sort=" + sortColumn
                + "&asc=" + sortAscending
                + "&start=" + start + "&length=" + length
                + "&index=" + integerIndex ;

        ++integerIndex ;

        RestService.sendRequest(requestCallback, searchString);
    }


//    public void loadOrganismAndSequence(String sequenceName) {
//        String url = Annotator.getRootUrl() + "annotator/findAnnotationsForSequence/?sequenceName=" + sequenceName + "&request=" + requestIndex;
//        RequestBuilder builder = new RequestBuilder(RequestBuilder.GET, URL.encode(url));
//        builder.setHeader("Content-type", "application/x-www-form-urlencoded");
//        RequestCallback requestCallback = new RequestCallback() {
//            @Override
//            public void onResponseReceived(Request request, Response response) {
//                JSONValue returnValue = JSONParser.parseStrict(response.getText());
//                long localRequestValue = (long) returnValue.isObject().get(FeatureStringEnum.REQUEST_INDEX.getValue()).isNumber().doubleValue();
//                // returns
//                if (localRequestValue <= requestIndex) {
//                    return;
//                } else {
//                    requestIndex = localRequestValue;
//                }
//
////                JSONArray array = returnValue.isObject().get("features").isArray();
////                annotationInfoList.clear();
////
////                for (int i = 0; i < array.size(); i++) {
////                    JSONObject object = array.get(i).isObject();
////                    AnnotationInfo annotationInfo = generateAnnotationInfo(object);
////                    annotationInfoList.add(annotationInfo);
////                }
////                filterList();
////                dataGrid.redraw();
//            }
//
//            @Override
//            public void onError(Request request, Throwable exception) {
////                Window.alert("Error loading organisms");
//            }
//        };
//        try {
//            builder.setCallback(requestCallback);
//            builder.send();
//        } catch (RequestException e) {
//            // Couldn't connect to server
//            Window.alert(e.getMessage());
//        }

}
