// Skyscanner API Configuration
const SKYSCANNER_API_KEY = 'your_api_key_here';
const SKYSCANNER_API_HOST = 'skyscanner-api.p.rapidapi.com';

// DOM Elements
const flightSearchForm = document.getElementById('flight-search-form');
const tripTypeInputs = document.querySelectorAll('input[name="trip-type"]');
const returnDateGroup = document.querySelector('.return-date');
const resultsContainer = document.getElementById('results-container');
const flightsList = document.getElementById('flights-list');
const loadingOverlay = document.getElementById('loading-overlay');
const sortBySelect = document.getElementById('sort-by');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize date inputs with minimum dates
    const departDate = document.getElementById('depart-date');
    const returnDate = document.getElementById('return-date');
    const today = new Date().toISOString().split('T')[0];

    departDate.min = today;
    returnDate.min = today;

    // Add event listeners
    tripTypeInputs.forEach(input => {
        input.addEventListener('change', handleTripTypeChange);
    });

    departDate.addEventListener('change', () => {
        returnDate.min = departDate.value;
    });

    flightSearchForm.addEventListener('submit', handleSearchSubmit);
    sortBySelect.addEventListener('change', handleSortChange);
});

// Handle trip type change
function handleTripTypeChange(e) {
    const isRoundTrip = e.target.value === 'round-trip';
    const returnDateInput = document.getElementById('return-date');

    returnDateGroup.style.display = isRoundTrip ? 'block' : 'none';
    returnDateInput.required = isRoundTrip;
}

// Handle form submission
async function handleSearchSubmit(e) {
    e.preventDefault();

    const formData = {
        origin: document.getElementById('origin').value,
        destination: document.getElementById('destination').value,
        departDate: document.getElementById('depart-date').value,
        returnDate: document.getElementById('return-date').value,
        passengers: document.getElementById('passengers').value,
        cabinClass: document.getElementById('cabin-class').value,
        tripType: document.querySelector('input[name="trip-type"]:checked').value
    };

    try {
        showLoading();
        const flights = await searchFlights(formData);
        displayResults(flights);
    } catch (error) {
        showError('An error occurred while searching for flights. Please try again.');
    } finally {
        hideLoading();
    }
}

// Search flights using Skyscanner API
async function searchFlights(searchParams) {
    // First, get location IDs
    const originId = await getLocationId(searchParams.origin);
    const destinationId = await getLocationId(searchParams.destination);

    // Create search session
    const createSessionResponse = await fetch('https://skyscanner-api.p.rapidapi.com/v3/flights/live/search/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': SKYSCANNER_API_KEY,
            'X-RapidAPI-Host': SKYSCANNER_API_HOST
        },
        body: JSON.stringify({
            query: {
                market: 'UK',
                locale: 'en-GB',
                currency: 'USD',
                queryLegs: [
                    {
                        originPlaceId: originId,
                        destinationPlaceId: destinationId,
                        date: searchParams.departDate
                    },
                    ...(searchParams.tripType === 'round-trip' ? [{
                        originPlaceId: destinationId,
                        destinationPlaceId: originId,
                        date: searchParams.returnDate
                    }] : [])
                ],
                cabinClass: searchParams.cabinClass.toUpperCase(),
                adults: parseInt(searchParams.passengers)
            }
        })
    });

    const sessionData = await createSessionResponse.json();
    const sessionToken = sessionData.sessionToken;

    // Poll for results
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 1000; // 1 second

    while (attempts < maxAttempts) {
        const pollResponse = await fetch(https://skyscanner-api.p.rapidapi.com/v3/flights/live/search/poll/${sessionToken}, {
            headers: {
                'X-RapidAPI-Key': SKYSCANNER_API_KEY,
                'X-RapidAPI-Host': SKYSCANNER_API_HOST
            }
        });

        const results = await pollResponse.json();

        if (results.status === 'COMPLETED' || results.itineraries.length > 0) {
            return results.itineraries;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
    }

    throw new Error('Search timeout');
}

// Get location ID from Skyscanner API
async function getLocationId(query) {
    const response = await fetch(https://skyscanner-api.p.rapidapi.com/v3/autosuggest/flights?query=${encodeURIComponent(query)}, {
        headers: {
            'X-RapidAPI-Key': SKYSCANNER_API_KEY,
            'X-RapidAPI-Host': SKYSCANNER_API_HOST
        }
    });

    const data = await response.json();
    return data.places[0]?.entityId;
}

// Display flight results
function displayResults(flights) {
    resultsContainer.classList.remove('hidden');
    flightsList.innerHTML = '';

    flights.forEach(flight => {
        const flightCard = createFlightCard(flight);
        flightsList.appendChild(flightCard);
    });
}

// Create flight card element
function createFlightCard(flight) {
    const card = document.createElement('div');
    card.className = 'flight-card';

    const formattedDuration = formatDuration(flight.legs[0].duration);
    const price = flight.pricing.totalPrice;

    card.innerHTML = `
        <div class="flight-info">
            <div class="flight-route">
                <div class="flight-time">
                    <div>${formatTime(flight.legs[0].departure)}</div>
                    <div class="flight-duration">${formattedDuration}</div>
                    <div>${formatTime(flight.legs[0].arrival)}</div>
                </div>
            </div>
            <div class="airline-info">
                <img src="${flight.legs[0].carriers.marketing[0].logoUrl}" alt="${flight.legs[0].carriers.marketing[0].name}" width="24">
                <span>${flight.legs[0].carriers.marketing[0].name}</span>
            </div>
        </div>
        <div class="flight-price">
            <div class="price-amount">$${price.toFixed(2)}</div>
            <button class="select-flight">Select</button>
        </div>
    `;

    return card;
}

// Handle sort change
function handleSortChange(e) {
    const flights = Array.from(flightsList.children);
    const sortBy = e.target.value;

    flights.sort((a, b) => {
        if (sortBy === 'price') {
            const priceA = parseFloat(a.querySelector('.price-amount').textContent.slice(1));
            const priceB = parseFloat(b.querySelector('.price-amount').textContent.slice(1));
            return priceA - priceB;
        } else if (sortBy === 'duration') {
            const durationA = parseDuration(a.querySelector('.flight-duration').textContent);
            const durationB = parseDuration(b.querySelector('.flight-duration').textContent);
            return durationA - durationB;
        } else if (sortBy === 'departure') {
            const departureA = parseTime(a.querySelector('.flight-time div').textContent);
            const departureB = parseTime(b.querySelector('.flight-time div').textContent);
            return departureA - departureB;
        }
    });

    flightsList.innerHTML = '';
    flights.forEach(flight => flightsList.appendChild(flight));
}

// Utility functions
function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return ${hours}h ${mins}m;
}

function parseDuration(duration) {
    const [hours, minutes] = duration.split('h ');
    return parseInt(hours) * 60 + parseInt(minutes);
}

function parseTime(timeString) {
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);

    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    return hours * 60 + parseInt(minutes);
}

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showError(message) {
    // Create and show error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}





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
