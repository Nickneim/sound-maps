
"use strict";

const firstLocation = {
  lat: 36.964,
  lng: -122.015,
  zoom: 14,
  index: 0,
  // rgb: {r: 100, g: 100, b: 102},
  rgb: {r: 92, g: 93, b: 96},  // colorthief
}


const mapOptions = {
  zoom: firstLocation.zoom,
  center: {'lat':firstLocation.lat, 'lng':  firstLocation.lng},
  mapTypeId: 'satellite',
  maxZoom: 17,
  minZoom: 14,
  gestureHandling: 'none',
  draggableCursor: 'default',
  disableDefaultUI: true,
  zoomControl: true
  // restriction: {
  //     latLngBounds: {north: 36.964 + 0.05, south: 36.964 - 0.05, west: -122.015 - 0.05, east: -122.015 + 0.05},
  //     strictBounds: false
  // }
};

var map;
var chicago = {lat: 41.85, lng: -87.65};
const backgroundMusic = new Audio();
const textAudio = new Audio();
backgroundMusic.volume = 0.5;

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

const voices = [];
var voice_index = null;

fetch('static/voces/lista_de_voces.txt')
  .then(response => response.text())
  .then(text => voices.push.apply(voices, text.split(/\r?\n/)));
  // outputs the content of the text file

const musicList = [
  'CIUDAD 2.mp3',
]

const colorThief = new ColorThief();

const recommendations = [
  {
    // 'rgb': {'r': 128, 'g': 128, 'b': 116},
    rgb: {r: 141, g: 140, b: 127},    // colorthief
    lat: -31.438,
    lng: -64.195,
    zoom: 14,
  },
  {
    // rgb: {r: 104, g: 107, b: 100},
    rgb: {r: 95, g: 100, b: 93}, // colorthief
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

var paletteSize = 4;
var paletteQuality = 1;

function getLocationFromColor(rgb) {
  const colorDiff = Math.abs(rgb.r - rgb.g) + Math.abs(rgb.g - rgb.b) + Math.abs(rgb.r - rgb.b);
  if (colorDiff < 40)
    return 'ciudad';
  return '?';
}


function getAverageRGB(imgEl) {
    
  var blockSize = 1, // only visit every 5 pixels
      defaultRGB = {r:0,g:0,b:0}, // for non-supporting envs
      canvas = document.createElement('canvas'),
      context = canvas.getContext && canvas.getContext('2d'),
      data, width, height,
      i = -4,
      length,
      rgb = {r:0,g:0,b:0},
      count = 0;
      
  if (!context) {
      return defaultRGB;
  }
  
  height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
  width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;
  
  context.drawImage(imgEl, 0, 0);
  
  try {
      data = context.getImageData(0, 0, width, height);
  } catch(e) {
      /* security error, img on diff domain */alert('x');
      return defaultRGB;
  }
  
  length = data.data.length;
  
  while ( (i += blockSize * 4) < length ) {
      ++count;
      rgb.r += data.data[i];
      rgb.g += data.data[i+1];
      rgb.b += data.data[i+2];
  }
  
  // ~~ used to floor values
  rgb.r = ~~(rgb.r/count);
  rgb.g = ~~(rgb.g/count);
  rgb.b = ~~(rgb.b/count);
  
  return rgb;
  
}

function updateRGB(mapLocation) {
  const rgb = mapLocation.rgb;
  const rgbString = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
  document.getElementById('title-control').textContent = rgbString;
  document.getElementById('title-control').style.backgroundColor = rgbString;
  if (mapLocation.hasOwnProperty('historyOption')) {
    mapLocation.historyOption.style.backgroundColor = rgbString;
  }

  console.log("Latitud: " + mapLocation.lat + " Longitud: " + mapLocation.lng);
  mapLocation.palette.forEach(color => {
    const colorString = 'rgb('+color[0]+','+color[1]+','+color[2]+')';
    console.log("%c " + colorString, "background: "+colorString);
  });

  const locationFromColor = getLocationFromColor(rgb);
  console.log("Ubicación: " + locationFromColor);

  // const music = musicList[0];
  // backgroundMusic.setAttribute('src', 'static/musica/' + music);
  // backgroundMusic.load();
  // if (locationFromColor === 'ciudad')
  //   backgroundMusic.play();
  // else
  //   backgroundMusic.pause();
}


function onImageLoad() {
  // currentLocation.rgb = getAverageRGB(document.getElementById('imgMap'));
  // console.log(colorThief.getColor(document.getElementById('imgMap')))
  if (paletteSize != 1) {
    const palette = colorThief.getPalette(document.getElementById('imgMap'), paletteSize, paletteQuality);
    const rgb = palette[0];
    currentLocation.rgb = {r: rgb[0], g: rgb[1], b: rgb[2]};
    currentLocation.palette = palette;
  }
  else {
    const rgb = colorThief.getColor(document.getElementById('imgMap'), paletteQuality);
    currentLocation.rgb = {r: rgb[0], g: rgb[1], b: rgb[2]};
    currentLocation.palette = [rgb];
  }
  updateRGB(currentLocation);
}


function goToLocation(mapLocation, addToLastVisited=true) {

  controlLatitude.value = mapLocation.lat.toFixed(3);
  controlLatitude.placeholder = mapLocation.lat.toFixed(3);
  controlLongitude.value = mapLocation.lng.toFixed(3);
  controlLongitude.placeholder = mapLocation.lng.toFixed(3);

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

  if (voice_index == null || voice_index >= voices.length) {
    shuffle(voices);
    console.log(voices);
    voice_index = 0;
  }

  const voice = voices[voice_index];
  voice_index += 1;
  console.log("Reproduciendo " + voice);
  textAudio.setAttribute('src', 'static/voces/' + voice);
  textAudio.load();
  textAudio.play();

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
      mapLocation.rgb = mapHistory[mapLocation.index].rgb;
    }
  }

  if (true || !mapLocation.hasOwnProperty('rgb')) { 
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

/**
* The CenterControl adds a control to the map that recenters the map on
* Chicago.
* This constructor takes the control DIV as an argument.
* @constructor
*/
function CenterControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.classList.add('controlBorder');
  controlUI.title = 'Click to go to Chicago';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlText = document.createElement('div');
  controlText.classList.add('controlInterior');
  controlText.textContent = 'Chicago';
  controlUI.appendChild(controlText);

  // Setup the click event listeners: simply set the map to Chicago.
  controlUI.addEventListener('click', function() {
    map.setCenter(chicago);
  });
}

function BackControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.classList.add('controlBorder');
  controlUI.title = 'Click to go back';
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

  const rgb = firstLocation.rgb;
  const rgbString = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
  controlTitle.textContent = rgbString;
  controlTitle.style.backgroundColor = rgbString;

  // Set CSS for the control interior.
  var controlLanguage = document.createElement('div');
  controlLanguage.classList.add('controlInterior');
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

  addHistoryOption(firstLocation);
  const rgb = firstLocation.rgb;
  firstLocation.historyOption.style.backgroundColor = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
  
}

function RecommendationsControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.classList.add('controlBorder');
  // controlUI.title = 'Click to go to Chicago';
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
    const rgb = mapLocation.rgb;
    controlRecommendationsOption.style.backgroundColor = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
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
  // controlLatitude.placeholder="-31.4381414";
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
  // controlLongitude.placeholder="-64.1955601";
  controlLongitude.textContent = 'Longitud';
  controlLongitude.style.display = 'block';
  controlCoordinates.appendChild(controlLongitude);

  // Set CSS for the control interior.
  var controlGo = document.createElement('button');
  controlGo.classList.add('controlInterior');
  controlGo.type = 'submit'
  // controlGo.style.display = 'inline';
  // controlGo.style.clear = "none";
  // controlGo.style.clear = "none";
  controlGo.textContent = 'Go';
  controlUI.appendChild(controlGo);

  controlUI.addEventListener('submit', function(event) {
    event.preventDefault();
    const lat = parseFloat(controlLatitude.value);
    const lng = parseFloat(controlLongitude.value);
    if (lat >= -90 && lat <= 90 && !isNaN(lng)) 
      goToLocation({lat: lat, lng: lng});
  });

}
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), 
    mapOptions
  );
          
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


  // var infowindow = new google.maps.InfoWindow({
  //   content: 'Change the zoom level',
  //   position: mapOptions.center
  // });
  // infowindow.open(map);

}
