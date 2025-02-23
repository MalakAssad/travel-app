const menus= document.querySelector('nav ul');
const header= document.querySelector("header");
const menuBtn= document.querySelector(".menu-btn");
const closeBtn= document.querySelector(".close-btn");


menuBtn.addEventListener('click', ()=>{
menus.classList.add("display");
});


closeBtn.addEventListener('click', ()=>{
    menus.classList.remove("display");
    });



   //scroll sticky navbar
   
window.addEventListener('scroll',()=>{
    if(document.documentElement.scrollTop > 20){
     header.classList.add("sticky");   
    }
    else {
        header.classList.remove("sticky");
    }
});   

// API configuration
const TRAVEL_ADVISOR_API_KEY = "ee96f3aaa2msh0bab44d15e71c8fp121cd8jsndf24cffef432"
const TRAVEL_ADVISOR_API_HOST = "travel-advisor.p.rapidapi.com"
const GOOGLE_MAPS_API_KEY = "ee96f3aaa2msh0bab44d15e71c8fp121cd8jsndf24cffef432"
const GOOGLE_MAPS_API_HOST = "google-map-places.p.rapidapi.com"

// DOM elements
const tabButtons = document.querySelectorAll(".tab-button")
const tabContents = document.querySelectorAll(".tab-content")
const searchRestaurantsBtn = document.getElementById("search-restaurants")
const searchHotelsBtn = document.getElementById("search-hotels")
const searchFlightsBtn = document.getElementById("search-flights")
const resultsContainer = document.getElementById("results-container")
const mapContainer = document.getElementById("map")

// Initialize map
const map = L.map(mapContainer).setView([0, 0], 2)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map)

// Tab functionality
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((btn) => btn.classList.remove("active"))
    tabContents.forEach((content) => content.classList.remove("active"))
    button.classList.add("active")
    document.getElementById(`${button.dataset.tab}-tab`).classList.add("active")
  })
})

// Search functionality
searchRestaurantsBtn.addEventListener("click", () => searchRestaurants())
searchHotelsBtn.addEventListener("click", () => searchHotels())
searchFlightsBtn.addEventListener("click", () => searchFlights())

// Restaurant search
async function searchRestaurants() {
  const location = document.getElementById("restaurant-location").value
  if (!location) {
    alert("Please enter a location")
    return
  }

  try {
    const coordinates = await getCoordinates(location)
    const restaurants = await fetchRestaurants(coordinates.lat, coordinates.lng)
    displayResults(restaurants, "restaurants")
    updateMap(restaurants)
  } catch (error) {
    console.error("Error searching restaurants:", error)
    alert("An error occurred while searching for restaurants. Please try again.")
  }
}

// Hotel search
async function searchHotels() {
  const location = document.getElementById("hotel-location").value
  const checkIn = document.getElementById("check-in-date").value
  const checkOut = document.getElementById("check-out-date").value

  if (!location || !checkIn || !checkOut) {
    alert("Please fill in all fields")
    return
  }

  try {
    const coordinates = await getCoordinates(location)
    const hotels = await fetchHotels(coordinates.lat, coordinates.lng, checkIn, checkOut)
    displayResults(hotels, "hotels")
    updateMap(hotels)
  } catch (error) {
    console.error("Error searching hotels:", error)
    alert("An error occurred while searching for hotels. Please try again.")
  }
}

// Flight search
async function searchFlights() {
  const departure = document.getElementById("departure-location").value
  const arrival = document.getElementById("arrival-location").value
  const date = document.getElementById("departure-date").value
  const passengers = document.getElementById("passengers").value

  if (!departure || !arrival || !date || !passengers) {
    alert("Please fill in all fields")
    return
  }

  try {
    const flights = await fetchFlights(departure, arrival, date, passengers)
    displayResults(flights, "flights")
  } catch (error) {
    console.error("Error searching flights:", error)
    alert("An error occurred while searching for flights. Please try again.")
  }
}

// Fetch restaurants from Travel Advisor API
async function fetchRestaurants(lat, lon) {
  const url = `https://travel-advisor.p.rapidapi.com/restaurants/list-by-latlng?latitude=${lat}&longitude=${lon}&limit=30&currency=USD&distance=2&open_now=false&lunit=km&lang=en_US`
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": TRAVEL_ADVISOR_API_KEY,
      "X-RapidAPI-Host": TRAVEL_ADVISOR_API_HOST,
    },
  }

  const response = await fetch(url, options)
  const data = await response.json()
  return data.data
}

// Fetch hotels from Travel Advisor API
async function fetchHotels(lat, lon, checkIn, checkOut) {
  const url = `https://travel-advisor.p.rapidapi.com/hotels/list-by-latlng?latitude=${lat}&longitude=${lon}&limit=30&currency=USD&distance=2&open_now=false&lunit=km&lang=en_US&checkin=${checkIn}&adults=1&nights=1`
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": TRAVEL_ADVISOR_API_KEY,
      "X-RapidAPI-Host": TRAVEL_ADVISOR_API_HOST,
      'Content-Type': 'application/json'
    },
  }

  const response = await fetch(url, options)
  const data = await response.json()
  return data.data
}

// Fetch flights (mock data as the Travel Advisor API doesn't provide flight information)
async function fetchFlights(departure, arrival, date, passengers) {
  // This is a mock function. In a real application, you would integrate with a flight API.
  return [
    { airline: "MockAir", departure: departure, arrival: arrival, date: date, price: "$299" },
    { airline: "FakeJet", departure: departure, arrival: arrival, date: date, price: "$349" },
    { airline: "Imaginary Airways", departure: departure, arrival: arrival, date: date, price: "$399" },
  ]
}

// Get coordinates from Google Maps Places API
async function getCoordinates(location) {
  const url = `https://google-map-places.p.rapidapi.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&language=en`
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": GOOGLE_MAPS_API_KEY,
      "X-RapidAPI-Host": GOOGLE_MAPS_API_HOST,
    },
  }

  const response = await fetch(url, options)
  const data = await response.json()
  if (data.results && data.results.length > 0) {
    return data.results[0].geometry.location
  } else {
    throw new Error("Location not found")
  }
}

// Display results
function displayResults(results, type) {
  resultsContainer.innerHTML = ""
  results.forEach((result) => {
    const resultElement = document.createElement("div")
    resultElement.classList.add("result-item")

    if (type === "restaurants" || type === "hotels") {
      resultElement.innerHTML = `
                <h3>${result.name}</h3>
                <p>${result.address || "Address not available"}</p>
                <p>Rating: ${result.rating || "N/A"}</p>
                <p>${type === "restaurants" ? "Cuisine: " + (result.cuisine?.[0]?.name || "N/A") : "Price: " + (result.price || "N/A")}</p>
            `
    } else if (type === "flights") {
      resultElement.innerHTML = `
                <h3>${result.airline}</h3>
                <p>${result.departure} to ${result.arrival}</p>
                <p>Date: ${result.date}</p>
                <p>Price: ${result.price}</p>
            `
    }

    resultsContainer.appendChild(resultElement)
  })
}

// Update map
function updateMap(results) {
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer)
    }
  })

  const bounds = L.latLngBounds()
  results.forEach((result) => {
    if (result.latitude && result.longitude) {
      const marker = L.marker([result.latitude, result.longitude]).addTo(map)
      marker.bindPopup(`<b>${result.name}</b><br>${result.address || ""}`)
      bounds.extend([result.latitude, result.longitude])
    }
  })

  if (!bounds.isValid()) {
    map.setView([0, 0], 2)
  } else {
    map.fitBounds(bounds)
  }
}

// Local Storage for recent searches
function saveRecentSearch(type, query) {
  const recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || {}
  if (!recentSearches[type]) {
    recentSearches[type] = []
  }
  recentSearches[type].unshift(query)
  recentSearches[type] = recentSearches[type].slice(0, 5) // Keep only the 5 most recent searches
  localStorage.setItem("recentSearches", JSON.stringify(recentSearches))
}

function loadRecentSearches() {
  const recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || {}
  // You can use this data to display recent searches in the UI
  console.log("Recent searches:", recentSearches)
}

// Call loadRecentSearches on page load
loadRecentSearches()

// Event listener for contact form submission
document.getElementById("contact-form").addEventListener("submit", function (e) {
  e.preventDefault()
  const name = document.getElementById("name").value
  const email = document.getElementById("email").value
  const message = document.getElementById("message").value

  // Here you would typically send this data to a server
  console.log("Form submitted:", { name, email, message })
  alert("Thank you for your message. We will get back to you soon!")
  this.reset()
})

