async function fetchBoundingBox(municipalityKey) {
  const url = `https://api.oklabflensburg.de/administrative/v1/municipality?municipality_key=${municipalityKey}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Error fetching bounding box: ${response.statusText}`)
    }

    const data = await response.json()

    // Check if data is an array and has at least one object
    if (Array.isArray(data) && data.length > 0) {
      const bbox = data[0].bbox // Assuming we need the first item in the array
      return [bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax] // Convert bbox to array
    }
    else {
      throw new Error('Invalid response data format or empty response.')
    }
  }
  catch (error) {
    console.error('Failed to fetch bounding box:', error)
    return null
  }
}

async function moveToBoundingBox(mapReference, municipalityKey) {
  const bbox = await fetchBoundingBox(municipalityKey)

  if (bbox) {
    // Convert bbox to Leaflet's expected format
    const bounds = [
      [bbox[1], bbox[0]], // Southwest: [lat, lng]
      [bbox[3], bbox[2]]  // Northeast: [lat, lng]
    ]

    mapReference.fitBounds(bounds) // Adjusts the view to fit the bounding box
  }
  else {
    console.error('Bounding box could not be fetched.')
  }
}

const searchBox = document.getElementById('searchBox')
const suggestionsList = document.getElementById('suggestionsList')

// Update the suggestions dropdown
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

    // Add click event to select a suggestion
    li.addEventListener('click', () => {
      moveToBoundingBox(map, item.municipality_key)
      searchBox.value = item.geographical_name
      suggestionsList.classList.add('hidden')
    })

    suggestionsList.appendChild(li)
  })

  suggestionsList.classList.remove('hidden')
}

// Fetch suggestions from the API
const fetchSuggestions = async (query) => {
  if (!query) {
    suggestionsList.classList.add('hidden')
    suggestionsList.innerHTML = ''
    return
  }

  try {
    const response = await fetch(`https://api.oklabflensburg.de/administrative/v1/municipality/search?query=${query}`)
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