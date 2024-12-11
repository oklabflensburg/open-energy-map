import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import markerDefault from 'url:../static/marker-icon-default.webp'
import markerSelected from 'url:../static/marker-icon-active.webp'

import { Env } from './env.js'


const env = new Env()
env.injectLinkContent('.contact-mail', 'mailto:', '', env.contactMail, 'E-Mail')


const defaultIcon = L.icon({
  iconUrl: markerDefault,
  iconSize: [30, 36],
  iconAnchor: [15, 36],
  tooltipAnchor: [0, -37]
})


const selectedIcon = L.icon({
  iconUrl: markerSelected,
  iconSize: [30, 36],
  iconAnchor: [15, 36],
  tooltipAnchor: [0, -37]
})


const center = [54.16457533, 9.92517113]
const searchBox = document.querySelector('#searchBox')
const suggestionsList = document.querySelector('#suggestionsList')
const dropdownStateList = document.querySelector('#dropdownStateList')
const dropdownStateListWrapper = document.querySelector('#dropdownStateListWrapper')
const dropdownStateListSelected = document.querySelector('#dropdownStateListSelected')
const dropdownStateListButton = document.querySelector('#dropdownStateListButton')
const selectedStateTarget = { value: null }


let updateToken = null
let currentLayer = null
let stateList = null
let selectedMunicipality = null


const map = L.map('map', {
  zoomControl: false
}).setView(center, 12)


const zoomControl = L.control.zoom({
  position: 'bottomright'
}).addTo(map)


const selectedStateHandler = {
  set(obj, prop, value) {
    dropdownStateListSelected.textContent = value.name

    obj[prop] = value

    return true
  }
}


const observedSelectedState = new Proxy(selectedStateTarget, selectedStateHandler)


function formatPlaceName(placeName) {
  return placeName.replace(', Stadt', '')
}


function formatDateString(dateString) {
  const date = new Date(dateString)

  const germanDate = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return germanDate
}


function formatToHectar(number) {
  let hectar = Number(number) / 10000

  hectar = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(hectar)

  return hectar
}


function toggleStateListDropdown() {
  dropdownStateListWrapper.classList.toggle('hidden')
}


function updateScreen(screen) {
  const title = 'Digitaler Energieatlas für Deutschland'

  if (screen === 'home') {
    document.querySelector('title').innerHTML = title
    document.querySelector('meta[property="og:title"]').setAttribute('content', title)
  }
}


function moveToBoundingBox(mapReference, bbox) {
  const { xmin, ymin, xmax, ymax } = bbox

  const bounds = L.latLngBounds(
    [ymin, xmin],
    [ymax, xmax]
  )

  mapReference.fitBounds(bounds)
}


function renderStateList() {
  stateList.forEach((element) => {
    const listElement = document.createElement('li')
    const listTextNode = document.createTextNode(element.name)

    listElement.id = element.id
    // listElement.onclick = () => selectStateDropdown([element.id, element.name, element.bbox])
    listElement.append(listTextNode)
    listElement.classList.add('w-full', 'text-left', 'px-3', 'py-2', 'bg-white', 'text-gray-800', 'hover:bg-blue-600', 'hover:text-white', 'focus:text-white', 'focus:outline-none')
    dropdownStateList.appendChild(listElement)
  })
}


function renderEnergyMeta(data) {
  document.querySelector('#sidebar').scrollTo({
    top: 0
  })

  const geoJsonData = {
    'type': 'FeatureCollection',
    'features': [{
      'type': 'Feature',
      'geometry': {
        'type': data['geojson']['type'],
        'coordinates': data['geojson']['coordinates']
      },
      'properties': {}
    }]
  }

  currentLayer = L.geoJSON(geoJsonData, {
    style: {
      color: '#333',
      weight: 2,
      fillOpacity: 0.1
    }
  }).addTo(map)

  let detailOutput = ''

  if (data['designation'].length > 1) {
    detailOutput += `<li><strong>Biotoptyp</strong><br>${data['designation']} (${data['code']})</li>`
  }

  if (data['description'] !== null) {
    detailOutput += `<li><strong>Biotopbeschreibung</strong><br>${data['description']}</li>`
  }

  if (data['mapping_date'] !== null) {
    const dateString = formatDateString(data['mapping_date'])

    detailOutput += `<li><strong>Kartierdatum</strong><br>${dateString}</li>`
  }

  if (data['protection_reason'] !== null) {
    detailOutput += `<li><strong>Schutz (BiotopV SH)</strong><br>${data['protection_reason']}</li>`
  }

  if (data['habitat_type_1'] !== null && data['habitat_label_1'] !== null) {
    detailOutput += `<li><strong>FFH-Lebensraumtyp</strong><br>${data['habitat_label_1']} (${data['habitat_type_1']})</li>`
  }

  if (data['habitat_type_2'] !== null && data['habitat_label_2'] !== null) {
    detailOutput += `<li><strong>Komplexbildung mit</strong><br>${data['habitat_type_2']}: ${data['habitat_label_2']}</li>`
  }

  if (data['mapping_origin'] !== null && data['mapping_origin_description'] === null) {
    detailOutput += `<li><strong>Herkunft</strong><br>${data['mapping_origin']}</li>`
  }
  else if (data['mapping_origin'] !== null && data['mapping_origin_description'] !== null) {
    detailOutput += `<li><strong>Herkunft</strong><br>${data['mapping_origin']}: ${data['mapping_origin_description']}</li>`
    detailOutput += `<li><strong>Herkunft</strong><br>${data['mapping_origin']}: ${data['mapping_origin_description']}</li>`
  }

  if (data['mapping_origin_remark'] !== null) {
    detailOutput += `<li><strong>Hinweis</strong><br>${data['mapping_origin_remark']}</li>`
  }

  if (data['place_name'] !== null && data['place_name'].length > 1) {
    const placeNamesArray = data['place_name'].split(';')
    const placeNamesEntries = placeNamesArray.length
    let placeNameKey = 'Gemeinde'
    let placeNamesOutput = ''

    placeNamesArray.forEach((placeName) => {
      if (placeNamesEntries > 1) {
        placeNamesOutput += `<li class="ml-4 list-dash">${formatPlaceName(placeName)}</li>`
      }
      else {
        placeNamesOutput = `<li>${formatPlaceName(placeName)}</li>`
      }
    })

    if (placeNamesEntries > 1) {
      placeNameKey += 'n'
    }

    detailOutput += `<li><strong>${placeNameKey}</strong><br><ul>${placeNamesOutput}</ul></li>`
  }

  if (data['shape_area'] > 0) {
    const hectar = formatToHectar(data['shape_area'])
    detailOutput += `<li><strong>Fläche</strong><br>${hectar} ha</li>`
  }

  const detailList = document.querySelector('#detailList')
  const ribbonValuableEnergy = document.querySelector('#ribbonElement')

  if (ribbonValuableEnergy) {
    ribbonValuableEnergy.remove()
  }

  if (data['valuable_biotope'] !== undefined && data['valuable_biotope'] === 1) {
    const ribbonElement = document.createElement('div')
    const ribbonTextNode = document.createTextNode('Wertbiotop')

    ribbonElement.id = 'ribbonElement'
    ribbonElement.append(ribbonTextNode)
    ribbonElement.classList.add('ribbon', 'top-2', 'absolute', 'text-base', 'text-zinc-900', 'font-mono', 'bg-emerald-200', 'tracking-normal', 'ps-2.5', 'pe-3.5')
    detailList.parentNode.insertBefore(ribbonElement, detailList)
  }

  detailList.innerHTML = detailOutput
  document.querySelector('#about').classList.add('hidden')
  document.querySelector('#sidebar').classList.add('absolute')
  document.querySelector('#sidebar').classList.remove('hidden')
  document.querySelector('#sidebarContent').classList.remove('hidden')
  document.querySelector('#sidebarCloseWrapper').classList.remove('block')
}


function cleanEnergyMeta() {
  if (currentLayer) {
    map.removeLayer(currentLayer)
  }

  const detailList = document.querySelector('#detailList')
  const ribbonValuableEnergy = document.querySelector('#ribbonElement')

  if (ribbonValuableEnergy) {
    ribbonValuableEnergy.remove()
  }

  detailList.innerHTML = ''
  document.querySelector('#sidebar').classList.add('hidden')
  document.querySelector('#sidebar').classList.remove('absolute')
  document.querySelector('#about').classList.remove('hidden')
  document.querySelector('#sidebarContent').classList.add('hidden')
}


async function fetchStateList() {
  const url = 'https://api.oklabflensburg.de/energy/v1/meta/state'

  try {
    const response = await fetch(url, { method: 'GET' })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    stateList = await response.json()

    renderStateList()
  }
  catch (error) {
    console.error('Error fetching state list:', error)

    cleanEnergyMeta()
  }
}


document.addEventListener('DOMContentLoaded', function () {
  fetchStateList()

  L.tileLayer('https://tiles.oklabflensburg.de/sgm/{z}/{x}/{y}.png', {
    maxZoom: 20,
    tileSize: 256,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="dc:rights">OpenStreetMap</a> contributors'
  }).addTo(map)
})


async function fetchEnergyUnits(municipalityKey) {
  const url = `https://api.oklabflensburg.de/energy/v1/unit/wind/key?municipality_key=${municipalityKey}`

  try {
    const response = await fetch(url, { method: 'GET' })

    if (!response.ok) {
      // No energy wind units found based on municipality key

      return null
    }

    const data = await response.json()

    return data
  }
  catch (error) {
    console.error('Error fetching energy wind units:', error)

    return null
  }
}


async function renderEnergyUnits(mapReference, municipalityKey) {
  const token = updateToken = Symbol('renderEnergyUnitsToken')

  try {
    const items = await fetchEnergyUnits(municipalityKey)

    if (!items) {
      return
    }

    const geoJsonData = {
      type: 'FeatureCollection',
      features: items
        .filter((item) => item.geojson !== null)
        .map((item) => ({
          type: 'Feature',
          geometry: {
            type: item.geojson.type,
            coordinates: item.geojson.coordinates
          },
          properties: {
            unitName: item.unit_name
          }
        }))
    }

    const newLayer = L.geoJSON(geoJsonData, {
      pointToLayer(feature, latlng) {
        const label = feature.properties.unitName

        return L.marker(latlng, { icon: defaultIcon }).bindTooltip(label, {
          permanent: false,
          direction: 'top'
        })
      }
    })

    // disable fitBounds due to stay in bbox
    // mapReference.fitBounds(newLayer.getBounds())

    if (updateToken === token) {
      if (currentLayer) {
        mapReference.removeLayer(currentLayer)
      }
      currentLayer = newLayer.addTo(mapReference)
    }
    else {
      mapReference.removeLayer(newLayer)
    }
  }
  catch (error) {
    console.error('An error occurred during the render operation:', error)
  }
}


const updateSuggestions = (suggestions) => {
  suggestionsList.innerHTML = ''

  if (suggestions.length === 0) {
    suggestionsList.classList.add('hidden')

    return
  }

  suggestions.forEach((item) => {
    const li = document.createElement('li')

    li.id = item.municipality_key
    li.textContent = `${item.geographical_name} (${item.region_name})`
    li.className = 'px-4 py-2 cursor-pointer hover:bg-blue-500 hover:text-white'

    li.addEventListener('click', () => {
      const tmpState = stateList.filter((state) => state.state_id === item.municipality_key.substr(0, 2))

      if (tmpState.length === 1) {
        observedSelectedState.value = tmpState[0]
      }

      suggestionsList.classList.add('hidden')
      searchBox.value = item.geographical_name
      selectedMunicipality = item.municipality_key
      renderEnergyUnits(map, item.municipality_key)
      moveToBoundingBox(map, item.bbox)
    })

    suggestionsList.appendChild(li)
  })

  suggestionsList.classList.remove('hidden')
}


const fetchSuggestions = async (query) => {
  selectedMunicipality = null

  if (!query || query.length < 2) {
    suggestionsList.classList.add('hidden')
    suggestionsList.innerHTML = ''

    return
  }

  try {
    const response = await fetch(`http://localhost:8000/administrative/v1/municipality/search?query=${query}`)

    if (!response.ok) {
      throw new Error('Error fetching suggestions')
    }

    const data = await response.json()

    updateSuggestions(data || [])
  }
  catch (error) {
    console.error('Error:', error)
  }
}


searchBox.addEventListener('input', (e) => fetchSuggestions(e.target.value))

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#searchBox') && !e.target.closest('#suggestionsList')) {
    suggestionsList.classList.add('hidden')
  }
})


dropdownStateList.addEventListener('click', (e) => {
  if (currentLayer) {
    map.removeLayer(currentLayer)
  }

  dropdownStateListWrapper.classList.add('hidden')
  searchBox.value = ''

  const tmpState = stateList.filter((state) => state.id === parseInt(e.target.id))

  if (tmpState.length === 1) {
    observedSelectedState.value = tmpState[0]
    moveToBoundingBox(map, tmpState[0].bbox)
  }
})


dropdownStateListButton.addEventListener('click', (e) => {
  toggleStateListDropdown()
})


window.onload = () => {
  if (!history.state) {
    history.replaceState({ screen: 'home' }, '', '/')
  }
}

// Handle popstate event when navigating back/forward in the history
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.screen === 'home') {
    document.querySelector('#sidebarCloseWrapper').classList.add('hidden')
  }
  else {
    updateScreen('home')
  }
})