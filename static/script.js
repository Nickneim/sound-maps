
"use strict";

// utility functions
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRGBString(rgb) {
  return 'rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
}

// map initialization variables
const firstLocation = {
  lat: 0,
  lng: 0,
  zoom: 2,
  // index: -1,
  // palette: [[92, 93, 96]]
}


const mapOptions = {
  zoom: firstLocation.zoom,
  center: {'lat':firstLocation.lat, 'lng':  firstLocation.lng},
  mapTypeId: 'satellite',
  maxZoom: 17,
  minZoom: Math.min(14, firstLocation.zoom),
  gestureHandling: 'none',
  draggableCursor: 'default',
  disableDefaultUI: true,
};

var map;
var firstVisit = true;


// audio variables
const voiceAudio = new Audio();
voiceAudio.volume = 0.5;
const voices = [];
var voice_index = null;
fetch('static/voces/voces.json')
  .then(response => response.json())
  .then(json => voices.push.apply(voices, json));

const environmentAudio = new Audio();
environmentAudio.loop = true;
const environments = {};
fetch('static/ambiente/ambientes.json')
  .then(response => response.json())
  .then(json => {
    Object.entries(json).forEach(([key, value]) => {
      environments[key] = value;
    });
  });


const instrumentalAudio = new Audio();
instrumentalAudio.loop = true;
const instrumentals = [];
var instrumental_index = null;
fetch('static/instrumental/instrumentales.json')
  .then(response => response.json())
  .then(json => instrumentals.push.apply(instrumentals, json));


// color variables
const colorThief = new ColorThief();
var paletteSize = 4;
var paletteQuality = 1;


// map controls variables
const recommendations = [];

const mapHistory = [firstLocation];
const lastVisited = [];
var currentLocation = firstLocation;

var controlLatitude;
var controlLongitude;

var addHistoryOption;

const controlDivs = {'introduction': [], 'normal': []};

// color functions
function hasImage(rgb) {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  const noImageryDiff = Math.abs(r - 227) + Math.abs(g - 227) + Math.abs(b - 219);
  const blankImageDiff = Math.abs(r - 14) + Math.abs(g - 14) + Math.abs(b - 14);

  return !(noImageryDiff < 3 || blankImageDiff < 3);
}


function getEnvironmentFromColor(rgb) {
  var environment = null;
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];

  const colorDiff = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);

  if (!hasImage(rgb))
    environment = null;
  else if (g > r + 15 && g > b + 10) {
    environment = 'selva y bosque';
  }
  else if (r > b + 15 && r > g + 15)
    environment = 'desierto';
  else if (r + 15 < b && r + 15 < g)
    environment = 'mar-oceano-aguas';
  else if (colorDiff < 45){
    if (r > 160 && g > 160 && b > 160)
      environment = 'nieve';
    else
      environment = 'urbe';
  }

  if (hasImage(rgb) && environment == null) {
    environment = getRandomElement(Object.keys(environments));
  }
  if (environment != null) {
    return environment + '/' + getRandomElement(environments[environment]);
  }

  return null;
}


function updateRGB(mapLocation) {
  const rgb = mapLocation.palette[0];
  const rgbString = getRGBString(rgb)
  document.getElementById('title-control').textContent = rgbString;
  document.getElementById('title-control').style.backgroundColor = rgbString;
  if (mapLocation.hasOwnProperty('historyOption')) {
    mapLocation.historyOption.style.backgroundColor = rgbString;
  }

  console.log("Latitud: " + mapLocation.lat + " Longitud: " + mapLocation.lng);
  mapLocation.palette.forEach(color => {
    const colorString = getRGBString(color);
    console.log("%c " + colorString, "background: "+colorString);
  });

  if (hasImage(rgb)) {
    if (voice_index == null || voice_index >= voices.length) {
      shuffle(voices);
      voice_index = 0;
    }

    const voice = voices[voice_index];
    voice_index += 1;
    document.getElementById('language-control').textContent = voice.slice(2, -4);
    voiceAudio.setAttribute('src', 'static/voces/' + voice);
    voiceAudio.load();
    voiceAudio.play();


    if (instrumental_index == null || instrumental_index >= instrumentals.length) {
      shuffle(instrumentals);
      instrumental_index = 0;
    }

    const instrumental = instrumentals[instrumental_index];
    instrumental_index += 1;
    console.log("Reproduciendo " + instrumental);
    instrumentalAudio.setAttribute('src', 'static/instrumental/' + instrumental);
    instrumentalAudio.load();
    instrumentalAudio.play();
  }
  else {
    document.getElementById('language-control').textContent = 'Lo sentimos';
    voiceAudio.setAttribute('src', 'static/Lo sentimos.mp3');
    voiceAudio.load();
    voiceAudio.play();
    instrumentalAudio.pause();
  }


  const environment = getEnvironmentFromColor(rgb);
  console.log("Ubicación: " + environment);

  if (environment == null){
    environmentAudio.pause();
  }
  else {
    environmentAudio.setAttribute('src', 'static/ambiente/' + environment);
    environmentAudio.load();
    environmentAudio.play();
  }
}


function onImageLoad() {
  if (paletteSize != 1) {
    currentLocation.palette = colorThief.getPalette(document.getElementById('imgMap'), paletteSize, paletteQuality);
  }
  else {
    currentLocation.palette = colorThief.getColor(document.getElementById('imgMap'), paletteQuality);
  }
  updateRGB(currentLocation);
}


// movement functions
function smoothZoom(max, nextZoom) {
  if (nextZoom > max) {
      return;
  }
  else {
      google.maps.event.addListenerOnce(map, 'zoom_changed', function(event){
          smoothZoom(max, nextZoom + 1);
      });
      setTimeout(function(){map.setZoom(nextZoom)}, 80);
  }
}


function doFirstVisit(mapLocation) {
  controlDivs['introduction'].forEach(controlDiv => { 
    controlDiv.style.display = 'none';
  })
  map.panTo({lat: mapLocation.lat, lng: mapLocation.lng});
  smoothZoom(14, map.getZoom() + 1);
  const finishFirstVisit = google.maps.event.addListener(map, 'zoom_changed', function(event){
    if (map.getZoom() < 14)
      return;
    google.maps.event.removeListener(finishFirstVisit);
    map.setOptions({minZoom: 14, zoomControl: true});
    goToLocation(mapLocation);
    controlDivs['normal'].forEach(controlDiv => { 
      controlDiv.style.display = 'block';
    })
});
}


function goToLocation(mapLocation, addToLastVisited=true) {

  const fixedLat = mapLocation.lat.toFixed(3);
  const fixedLng = mapLocation.lng.toFixed(3);
  controlLatitude.value = fixedLat;
  controlLatitude.placeholder = fixedLat;
  controlLongitude.value = fixedLng;
  controlLongitude.placeholder = fixedLng;

  history.replaceState(null, '', '?lat=' + fixedLat + '&lng=' + fixedLng);

  map.setCenter({lat: mapLocation.lat, lng: mapLocation.lng});
  if (!mapLocation.hasOwnProperty('zoom')) {
    mapLocation.zoom = map.getZoom();
  }
  map.setZoom(mapLocation.zoom);

  // if (mapLocation.lat == currentLocation.lat &&
  //     mapLocation.lng == currentLocation.lng &&
  //     mapLocation.zoom == currentLocation.zoom)
  //   return;

  if (addToLastVisited) {
    lastVisited.push(currentLocation.index);
  }

  currentLocation = mapLocation;

  if (!mapLocation.hasOwnProperty('index')) {
    mapLocation.index = mapHistory.findIndex(otherLocation => {
      return (mapLocation.lat == otherLocation.lat &&
              mapLocation.lng == otherLocation.lng &&
              mapLocation.zoom == otherLocation.zoom);
    })
    if (mapLocation.index < 0) {
      mapLocation.index = mapHistory.length;
      mapHistory.push(mapLocation);
      addHistoryOption(mapLocation);
    } else {
      mapLocation.palette = mapHistory[mapLocation.index].palette;
    }
  }

  if (!mapLocation.hasOwnProperty('palette')) {
    var staticMapUrl = "https://maps.googleapis.com/maps/api/staticmap";
    //Set the Google Map Center.
    staticMapUrl += "?center=" + mapLocation.lat + "," + mapLocation.lng;
    //Set the Google Map Size.
    staticMapUrl += "&size=640x480";
    //Set the Google Map Type.
    staticMapUrl += "&maptype=" + mapOptions.mapTypeId;
    //Set the Google Map Zoom.
    staticMapUrl += "&zoom=" + mapLocation.zoom;
    staticMapUrl += "&key=AIzaSyDEwDxANvJbCrTv4f_r_LgnidF4xPxMCrg";
    //Display the Image of Google Map.
    var imgMap = document.getElementById("imgMap");
    imgMap.setAttribute("src", staticMapUrl);
  }
  else {
    updateRGB(mapLocation);
  }
}


// map controls constructors
function BackControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.classList.add('controlBorder');
  controlUI.title = 'Volver';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlText = document.createElement('div');
  controlText.classList.add('controlInterior');
  controlUI.appendChild(controlText);

  var controlArrow = document.createElement('i');
  controlArrow.classList.add('fa');
  controlArrow.classList.add('fa-arrow-left');
  controlText.appendChild(controlArrow);

  controlUI.addEventListener('click', function() {
    if (lastVisited.length == 0) {
      return;
    }
    goToLocation(mapHistory[lastVisited.pop()], false);
  });

}

function TitleControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.classList.add('controlBorder');
  // controlUI.title = 'Click to go to Chicago';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlTitle = document.createElement('div');
  controlTitle.classList.add('controlInterior');
  controlTitle.setAttribute('id', 'title-control');
  controlTitle.textContent = 'Título del Texto';
  controlUI.appendChild(controlTitle);

  // const rgbString = getRGBString(firstLocation.palette[0]);
  // controlTitle.textContent = rgbString;
  // controlTitle.style.backgroundColor = rgbString;

  // Set CSS for the control interior.
  var controlLanguage = document.createElement('div');
  controlLanguage.classList.add('controlInterior');
  controlLanguage.setAttribute('id', 'language-control');
  controlLanguage.textContent = 'Idioma';
  controlUI.appendChild(controlLanguage);
}

function HistoryControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.classList.add('controlBorder');
  // controlUI.title = 'Click to go to Chicago';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlHistory = document.createElement('div');
  controlHistory.classList.add('controlInterior');
  controlHistory.classList.add('dropdown');
  controlHistory.textContent = 'Historial';
  controlUI.appendChild(controlHistory);

  // Set CSS for the control interior.
  var controlHistoryContent = document.createElement('div');
  controlHistoryContent.classList.add('controlBorder');
  controlHistoryContent.classList.add('dropdown-content');
  controlHistory.appendChild(controlHistoryContent);

  addHistoryOption = function (mapLocation) {
    // Set CSS for the control interior.
    var controlHistoryOption = document.createElement('div');
    controlHistoryOption.classList.add('controlInterior');
    controlHistoryOption.classList.add('dropdown-item');
    controlHistoryOption.textContent = mapLocation.lat.toFixed(3) + ', ' + mapLocation.lng.toFixed(3);
    mapLocation.historyOption = controlHistoryOption
    controlHistoryOption.addEventListener('click', function() {
      goToLocation(mapLocation);
    });
    controlHistoryContent.insertBefore(controlHistoryOption, controlHistoryContent.firstChild);
  }

  // addHistoryOption(firstLocation);
  // const rgbString = getRGBString(firstLocation.palette[0]);
  // firstLocation.historyOption.style.backgroundColor = rgbString;

}

function RecommendationsControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.classList.add('controlBorder');
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlRecommendations = document.createElement('div');
  controlRecommendations.classList.add('controlInterior');
  controlRecommendations.classList.add('dropdown');
  controlRecommendations.textContent = 'Recomendaciones';
  controlUI.appendChild(controlRecommendations);

  // Set CSS for the control interior.
  var controlRecommendationsContent = document.createElement('div');
  controlRecommendationsContent.classList.add('controlBorder');
  controlRecommendationsContent.classList.add('dropdown-content');
  controlRecommendations.appendChild(controlRecommendationsContent);


  fetch('static/recomendaciones.json')
  .then(response => response.json())
  .then(json => json.forEach(mapLocation => {
    recommendations.push(mapLocation);
    // Set CSS for the control interior.
    var controlRecommendationsOption = document.createElement('div');
    controlRecommendationsOption.classList.add('controlInterior');
    controlRecommendationsOption.classList.add('dropdown-item');
    controlRecommendationsOption.textContent = mapLocation.lat.toFixed(3) + ', ' + mapLocation.lng.toFixed(3);
    const rgbString = getRGBString(mapLocation.palette[0]);
    controlRecommendationsOption.style.backgroundColor = rgbString;
    // mapLocation.historyOption = controlRecommendationsOption
    controlRecommendationsOption.addEventListener('click', function() {
      goToLocation(mapLocation);
    });
    controlRecommendationsContent.appendChild(controlRecommendationsOption);
    })
  );


}

function JumpCoordinatesControl(controlDiv, map) {
  // Set CSS for the control border.
  const controlUI = document.createElement('form');
  controlUI.classList.add('controlBorder');
  controlUI.title = 'Coordenadas';
  controlUI.style.overflow = 'hidden';
  controlDiv.appendChild(controlUI);

  const controlCoordinates = document.createElement('div');
  controlCoordinates.style.float = 'left';
  controlUI.appendChild(controlCoordinates);
  // Set CSS for the control Latitude.
  controlLatitude = document.createElement('input');
  controlLatitude.classList.add('controlInterior');
  controlLatitude.type = 'number';
  controlLatitude.step = 'any';
  controlLatitude.required = true;
  controlLatitude.max = '90';
  controlLatitude.min = '-90';
  controlLatitude.placeholder = firstLocation.lat.toFixed(3);
  controlLatitude.textContent = 'Latitud';
  controlLatitude.style.display = 'block';
  controlCoordinates.appendChild(controlLatitude);
  const controlValidity = document.createElement('span');
  controlValidity.classList.add('validity');
  controlCoordinates.appendChild(controlValidity);


  // Set CSS for the control Longitude.
  controlLongitude = document.createElement('input');
  controlLongitude.classList.add('controlInterior');
  controlLongitude.type = 'number';
  controlLongitude.step = 'any';
  controlLongitude.required = true;
  controlLongitude.placeholder = firstLocation.lng.toFixed(3);
  controlLongitude.textContent = 'Longitud';
  controlLongitude.style.display = 'block';
  controlCoordinates.appendChild(controlLongitude);

  // Set CSS for the control interior.
  var controlGo = document.createElement('button');
  controlGo.classList.add('controlInterior');
  controlGo.type = 'submit'
  controlGo.textContent = 'Go';
  controlUI.appendChild(controlGo);

  controlUI.addEventListener('submit', function(event) {
    event.preventDefault();
    const lat = parseFloat(controlLatitude.value);
    const lng = parseFloat(controlLongitude.value);
    if (lat >= -90 && lat <= 90 && !isNaN(lng))
      if (firstVisit) {
        firstVisit = false;
        doFirstVisit({lat: lat, lng: lng});
      }
      else {
        goToLocation({lat: lat, lng: lng});
      }
  });

}

function IntroductionJumpCoordinatesControl(controlDiv, map) {
  // Set CSS for the control border.
  const controlUI = document.createElement('form');
  controlUI.classList.add('controlBorder');
  controlUI.classList.add('vertical-center');
  controlUI.title = 'Coordenadas';
  controlUI.style.overflow = 'hidden';
  controlDiv.style.zIndex = '10';
  controlDiv.appendChild(controlUI);

  const controlCoordinates = document.createElement('div');
  controlCoordinates.style.float = 'left';
  controlUI.appendChild(controlCoordinates);
  // Set CSS for the control Latitude.
  const controlLatitude = document.createElement('input');
  controlLatitude.classList.add('controlInterior');
  controlLatitude.type = 'number';
  controlLatitude.step = 'any';
  controlLatitude.required = true;
  controlLatitude.max = '90';
  controlLatitude.min = '-90';
  controlLatitude.placeholder = 'Latitud';
  controlLatitude.textContent = 'Latitud';
  controlLatitude.style.display = 'block';
  controlCoordinates.appendChild(controlLatitude);
  const controlValidity = document.createElement('span');
  controlValidity.classList.add('validity');
  controlCoordinates.appendChild(controlValidity);


  // Set CSS for the control Longitude.
  const controlLongitude = document.createElement('input');
  controlLongitude.classList.add('controlInterior');
  controlLongitude.type = 'number';
  controlLongitude.step = 'any';
  controlLongitude.required = true;
  controlLongitude.placeholder = 'Longitud';
  controlLongitude.textContent = 'Longitud';
  controlLongitude.style.display = 'block';
  controlCoordinates.appendChild(controlLongitude);

  // Set CSS for the control interior.
  var controlGo = document.createElement('button');
  controlGo.classList.add('controlInterior');
  controlGo.type = 'submit'
  controlGo.textContent = 'Go';
  controlUI.appendChild(controlGo);

  controlUI.addEventListener('submit', function(event) {
    event.preventDefault();
    const lat = parseFloat(controlLatitude.value);
    const lng = parseFloat(controlLongitude.value);
    if (lat >= -90 && lat <= 90 && !isNaN(lng))
      firstVisit = false;
      doFirstVisit({lat: lat, lng: lng});
  });

}


function ScrollingTextsControl(controlDiv, map) {
  // Set CSS for the control border.
  const controlContainer = document.createElement('div');
  controlDiv.appendChild(controlContainer);
  // controlContainer.style.float = 'right';
  // controlContainer.style.paddingRight = '400px';
  // controlContainer.style.paddingRight = '40%';
  controlDiv.style.paddingLeft = '2.5%';

  const controlMarquee1 = document.createElement('div');
  controlMarquee1.classList.add('marquee');

  
  const controlMarquee2 = document.createElement('div');
  controlMarquee2.classList.add('marquee');
  controlMarquee2.classList.add('marquee2');

  // const paragraph1Div = document.createElement('div');
  const marqueeDiv1 = document.createElement('div');
  // const paragraph2Div = document.createElement('div');
  const marqueeDiv2 = document.createElement('div');
  // paragraph1Div.appendChild(paragraph1);
  // paragraph2Div.appendChild(paragraph2);
  controlMarquee1.appendChild(marqueeDiv1);
  controlMarquee2.appendChild(marqueeDiv2);
  fetch('static/textos.txt')
    .then(response => response.text())
    .then(textos => {
      textos.split("\n\n").forEach((texto, index) => {
        let paragraph1 = document.createElement('pre');
        paragraph1.textContent = texto;
        let paragraph2 = document.createElement('pre');
        paragraph2.textContent = texto;

        if (index % 2 == 0) {
          paragraph1.style.textAlign = 'right';
          paragraph2.style.textAlign = 'right';
        } else {
          paragraph1.style.textAlign = 'left';
          paragraph2.style.textAlign = 'left';
        }

        marqueeDiv1.appendChild(paragraph1);
        marqueeDiv2.appendChild(paragraph2);

      });
    });
  
  controlContainer.appendChild(controlMarquee1);
  controlContainer.appendChild(controlMarquee2);
}

function IntroductionTextControl(controlDiv, map) {
  // Set CSS for the control border.
  const controlContainer = document.createElement('div');
  controlDiv.appendChild(controlContainer);

  const controlText = document.createElement('pre');
  controlText.classList.add('introduction');

  fetch('static/introduccion.txt')
    .then(response => response.text())
    .then(introduction => {
      controlText.textContent = introduction;
    });
  
  controlContainer.appendChild(controlText);
}

function initMap() {
  var params = new URLSearchParams(window.location.search);

  const paramLat = parseFloat(params.get('lat'))
  const paramLng = parseFloat(params.get('lng'))

  map = new google.maps.Map(document.getElementById("map"),
    mapOptions
  );
    

  var titleControlDiv = document.createElement('div');
  var titleControl = new TitleControl(titleControlDiv, map);

  titleControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(titleControlDiv);
  controlDivs['normal'].push(titleControlDiv);

  var jumpCoordinatesControlDiv = document.createElement('div');
  var jumpCoordinatesControl = new JumpCoordinatesControl(jumpCoordinatesControlDiv, map);

  jumpCoordinatesControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(jumpCoordinatesControlDiv);
  controlDivs['normal'].push(jumpCoordinatesControlDiv);

  var backControlDiv = document.createElement('div');
  var backControl = new BackControl(backControlDiv, map);

  backControlDiv.index = 3;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(backControlDiv);
  controlDivs['normal'].push(backControlDiv);

  var historyControlDiv = document.createElement('div');
  var historyControl = new HistoryControl(historyControlDiv, map);

  historyControlDiv.index = 2;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(historyControlDiv);
  controlDivs['normal'].push(historyControlDiv);

  var recommendationsControlDiv = document.createElement('div');
  var recommendationsControl = new RecommendationsControl(recommendationsControlDiv, map);

  recommendationsControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(recommendationsControlDiv);
  controlDivs['normal'].push(recommendationsControlDiv);

  var scrollingTextsControlDiv = document.createElement('div');
  var scrollingTextsControl = new ScrollingTextsControl(scrollingTextsControlDiv, map);

  scrollingTextsControlDiv.index = 0;
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(scrollingTextsControlDiv);
  controlDivs['introduction'].push(scrollingTextsControlDiv);


  var introductionTextControlDiv = document.createElement('div');
  var introductionTextControl = new IntroductionTextControl(introductionTextControlDiv, map);

  introductionTextControlDiv.index = 0;
  map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(introductionTextControlDiv);
  controlDivs['introduction'].push(introductionTextControlDiv);

  var introductionJumpCoordinatesControlDiv = document.createElement('div');
  var introductionJumpCoordinatesControl = new IntroductionJumpCoordinatesControl(introductionJumpCoordinatesControlDiv, map);

  introductionJumpCoordinatesControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(introductionJumpCoordinatesControlDiv);
  controlDivs['introduction'].push(introductionJumpCoordinatesControlDiv);

  controlDivs['normal'].forEach(controlDiv => { 
    controlDiv.style.display = 'none';
  })
  controlDivs['introduction'].forEach(controlDiv => { 
    controlDiv.style.display = 'block';
  })

  if (!isNaN(paramLat) && !isNaN(paramLng)) {

    controlDivs['introduction'].forEach(controlDiv => { 
      controlDiv.style.display = 'none';
    })  
    google.maps.event.addListenerOnce(map, 'tilesloaded', function(){
      setTimeout(function(){doFirstVisit({lat: paramLat, lng: paramLng});}, 1000);
      // do something only the first time the map is loaded
    });
  }
  
  

}
