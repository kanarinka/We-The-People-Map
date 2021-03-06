
$(document).ready(function() {
    $('#about').popover({
          content: $('#about-text').html(), 
          html:'true'
        });
    
    $('.share-url').attr("value", window.location.href);
    $('.share-embed').text('<div style="width: 789px; height: 510px; padding: 0; overflow: hidden;"><iframe style="width: 1400px; height: 900px; border: 1px solid black; zoom: 0.75;-moz-transform: scale(0.75);-moz-transform-origin: 0 0; -o-transform: scale(0.75); -o-transform-origin: 0 0;-webkit-transform: scale(0.75); -webkit-transform-origin: 0 0;" src="'+window.location.href +'&nav=none"></iframe></div>');

    $('#share').popover({
          content: $('#share-text').html(), 
          html:'true'
        });
    $('#share').click(function(e){
        e.preventDefault();
    });
    

    
    
    window.baseURL = 'http://api.whitehouse.gov/v1/petitions';
    window.apiKey = 'yGxMBz2CWkjXzcV';
    window.queryString = $.parseQuerystring();
    window.zipsToCounts={};
    window.statesToCounts=[];
    window.offset =0;
    window.signatureCount = 0;
    window.USsignatureCount =0;
    window.nullSignatureCount =0;

    window.mapType = "leaflet";

    if (window.queryString['pid'] == null){
        window.queryString['pid'] = '515ee941cde5b84708000006';
    }
    if (window.queryString['nav'] == "none"){
      $('.navbar').hide();
      $('h1').css("padding-top", "5px").css("font-size","25px");
      
      
    }
    $('#map-style-list>li').click(function(e){ 
      window.location.href="index.html?pid="+window.queryString['pid']+"&map="+$(this).attr('id')+"&nav="+window.queryString['nav'];
      e.preventDefault();
    });
    
    $.ajax({
        dataType: "jsonp",
        url: baseURL + ".jsonp?key="+apiKey+"&limit=1000&callback=getAllPetitionsSuccess",
        jsonp : false,
        cache : true,
    });

    $.ajax({
        dataType: "jsonp",
        url: baseURL + "/"+ window.queryString['pid']+".jsonp?key="+apiKey+"&callback=getPetitionSuccess",
        jsonp : false,
        cache : true,
    });

    //Make a leaflet map with marker clustering by default
    if (window.queryString['map']!= "d3"){
      window.map = L.map('map').setView([39.813622, -98.554207], 4);
      
      L.tileLayer('http://{s}.tile.cloudmade.com/f93d21036d84475ebcde3e1a4b9c8225/997/256/{z}/{x}/{y}.png', {
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
          maxZoom: 18
      }).addTo(window.map);
      window.markers = new L.MarkerClusterGroup();
      
    } 
    //Otherwise make a d3 heatmap of states
    else{
        window.mapType = "d3";
        d3.xml("Blank_US_Map.svg", "image/svg+xml", function(xml) {
          $(xml.documentElement).attr("id","svg-map");
          $("#map").append(xml.documentElement);
          if (window.queryString['nav'] == "none"){
            $('#svg-map').css("margin-top",'30px');
          }
          
        });
    }
    self.getSignatures();
    
});

window.getAllPetitionsSuccess = function(data){    
    if (data){
        for (var i=0; i<data.results.length; i++){
          var petitionTitle = data.results[i].title;
          var pid = data.results[i].id;
          $('#petition-list').append('<li id="'+ pid + '""><a href="#">' + petitionTitle + '</a></li>');
          
        }
        $('#petition-list>li').click(function(e){ 
          window.location.href="index.html?pid="+$(this).attr('id')+"&map="+window.queryString['map']+"&nav="+window.queryString['nav'];
          e.preventDefault();
        }); 

    }
}
window.getPetitionSuccess = function(data){    
    if (data && data.results.length > 0){
        $('#petition-title').html(data.results[0]["title"]);
        $('#total-signatures').html(addCommas( data.results[0]["signatureCount"]));
        $('#signatures-needed').html(addCommas( data.results[0]["signaturesNeeded"]));
        $('.petition-url').attr("href", data.results[0].url);
      }
}
window.JSONPSuccess = function(data){    
    if (data){
        window.offset = window.offset + data.results.length;
        window.signatureCount = data.metadata.resultset.count;
        $('#loading').text("Loaded " + window.offset + " of " + window.signatureCount + " signatures...");
        for (var i=0; i<data.results.length; i++){
            
            var zip = data.results[i].zip;
            
            if (zip == null || zip.length ==0)
              window.nullSignatureCount++;
            if (zip != null && zip.length == 4)
              zip = "0" + zip.toString(); 
            else if (zip != null && zip.length == 3)
              zip = "00" + zip; 
            else if (zip != null && zip.length == 2)
              zip = "000" + zip;
            else if (zip != null && zip.length == 1)
              zip = "0000" + zip;
            else if (zip != null && zip.length > 5)
              zip = zip.substring(0,5);
            
            window.zipsToCounts[new String(zip)] = (!window.zipsToCounts[zip]) ? 1 : window.zipsToCounts[zip]++;

        }
     }
    if (window.offset < window.signatureCount){
        self.getSignatures();
    } else{
        if (window.mapType =="leaflet") 
          self.loadMarkers();
        else
          self.loadStates();
    }

};
function getSignatures(){
    //console.log("calling white house api - offset = " + window.offset)
    
    $.ajax({
            dataType: "jsonp",
            url: baseURL + "/"+ window.queryString['pid']+ "/signatures.jsonp?key="+apiKey+"&callback=JSONPSuccess&offset="+window.offset,
            jsonp : false,
            cache : true,
        });
}
function loadStates(){
  $('#loading').text("Mapping...");
  d3.csv('zipcodes.csv',function(rows) {
        
    rows.forEach(function(o) {
        if (window.zipsToCounts[o.ZIPCode] > 0)
        {
          window.statesToCounts[o.State] = (!window.statesToCounts[o.State]) ? window.zipsToCounts[o.ZIPCode] : window.statesToCounts[o.State] + window.zipsToCounts[o.ZIPCode];
          window.USsignatureCount = window.USsignatureCount+window.zipsToCounts[o.ZIPCode];
        }
    });
    var extent = []; 
    for(state in window.statesToCounts){
      extent.push(window.statesToCounts[state]);
    }
     //Make the colors & transitions
    var getColorOnScale = d3.scale.linear().domain(d3.extent(extent, function(count) { 
      return parseInt(count);
     
      
    }));
    //.range(['black','white']);
    getColorOnScale.domain([0, 0.5, 1].map(getColorOnScale.invert));
    getColorOnScale.range(["#cccccc", "orange", "red"]);
    
    for(state in window.statesToCounts){
      showState(state,getColorOnScale);
    }
    

    loadCounts();
    $('#loading').fadeOut();
  });
   
};
function showState(state,getColorOnScale){
    
    var stateCount = window.statesToCounts[state];  
    var stateSelector = "#" + state; 
    $(stateSelector).popover({"title":state, "trigger":"hover", "content":stateCount + " signatures",container: 'body'});
    
    try{
      d3.select(stateSelector).transition().style('fill', getColorOnScale(stateCount),'important').duration(500).ease("elastic");
    }
    catch(err){
      console.log(state + " was not found")
    }
        
}
function loadMarkers(){
    $('#loading').text("Mapping...");
     d3.csv('zipcodes.csv',function( rows) {
        
        rows.forEach(function(o) {
            if (window.zipsToCounts[o.ZIPCode] > 0)
            {
              o.latitude = o.Latitude;
              o.longitude = o.Longitude;
              for (var i = 0;i<window.zipsToCounts[o.ZIPCode];i++){
                 window.markers.addLayer(L.marker([o.latitude, o.longitude]));
                 window.USsignatureCount++;
              }
              window.zipsToCounts[o.ZIPCode] = -1;
            }
        }); 
        loadCounts();
        
    });


     $('#loading').fadeOut();
    window.map.addLayer(window.markers);

}
function loadCounts(){
  $('#us-signatures').text(addCommas(window.USsignatureCount));
  $('#null-signatures').text(addCommas(window.nullSignatureCount));
  $('#international-signatures').text(addCommas( window.signatureCount - window.USsignatureCount));
}
function addCommas(nStr)
{
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}
//From http://paulgueller.com/2011/04/26/parse-the-querystring-with-jquery/
jQuery.extend({
  parseQuerystring: function(){
    var nvpair = {};
    var qs = window.location.search.replace('?', '');
    var pairs = qs.split('&');
    $.each(pairs, function(i, v){
      var pair = v.split('=');
      nvpair[pair[0]] = pair[1];
    });
    return nvpair;
  }
});
