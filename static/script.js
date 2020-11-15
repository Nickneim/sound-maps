
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
  zoomControl: true
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
const recommendations = [
  {
    palette: [[141, 140, 127]],    // colorthief
    lat: -31.438,
    lng: -64.195,
    zoom: 14,
  },
  {
    palette: [[95, 100, 93]], // colorthief
    lat: -42.91,
    lng: -71.32,
    zoom: 14,
  }
]

const mapHistory = [firstLocation];
const lastVisited = [];
var currentLocation = firstLocation;

var controlLatitude;
var controlLongitude;

var addHistoryOption;


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
    if (Math.random() < 0.5)
      environment = 'bosque';
    else
      environment = 'selva';
  }
  else if (r > b + 15 && r > g + 15)
    environment = 'desierto';
  else if (colorDiff < 45)
    environment = 'urbe';

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
    voiceAudio.pause();
    instrumentalAudio.pause();
  }


  const environment = getEnvironmentFromColor(rgb);
  console.log("Ubicación: " + environment);

  if (environment == null)
    environmentAudio.pause();
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
      setTimeout(function(){map.setZoom(nextZoom)}, 120);
  }
}


function doFirstVisit(mapLocation) {
  map.panTo({lat: mapLocation.lat, lng: mapLocation.lng});
  smoothZoom(14, map.getZoom() + 1);
  const finishFirstVisit = google.maps.event.addListener(map, 'zoom_changed', function(event){
    if (map.getZoom() < 14)
      return;
    google.maps.event.removeListener(finishFirstVisit);
    map.setOptions({minZoom: 14});
    goToLocation(mapLocation);
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

  recommendations.forEach(mapLocation => {
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
  });
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


function initMap() {
  var params = new URLSearchParams(window.location.search);

  const paramLat = parseFloat(params.get('lat'))
  const paramLng = parseFloat(params.get('lng'))

  map = new google.maps.Map(document.getElementById("map"),
    mapOptions
  );
  
  if (!isNaN(paramLat) && !isNaN(paramLng)) {

    google.maps.event.addListenerOnce(map, 'idle', function(){
      setTimeout(function(){doFirstVisit({lat: paramLat, lng: paramLng});}, 1000);
      // do something only the first time the map is loaded
    });
  }
  

  var titleControlDiv = document.createElement('div');
  var titleControl = new TitleControl(titleControlDiv, map);

  titleControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(titleControlDiv);

  var jumpCoordinatesControlDiv = document.createElement('div');
  var jumpCoordinatesControl = new JumpCoordinatesControl(jumpCoordinatesControlDiv, map);

  jumpCoordinatesControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(jumpCoordinatesControlDiv);

  var backControlDiv = document.createElement('div');
  var backControl = new BackControl(backControlDiv, map);

  backControlDiv.index = 3;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(backControlDiv);

  var historyControlDiv = document.createElement('div');
  var historyControl = new HistoryControl(historyControlDiv, map);

  historyControlDiv.index = 2;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(historyControlDiv);

  var recommendationsControlDiv = document.createElement('div');
  var recommendationsControl = new RecommendationsControl(recommendationsControlDiv, map);

  recommendationsControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(recommendationsControlDiv);

}
