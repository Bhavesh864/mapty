'use strict';

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    // clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; //in km
        this.duration = duration;   //in min
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration)
        this.cadence = cadence;
        //this.type = 'running';
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration)
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}
// const run1 = new Running([], 2, 10, 33)
// const cyc1 = new Cycling([], 2, 10, 33)

// console.log(run1);
// console.log(cyc1);



/////////////////////////////////////
//APPLICATION ARCHITECTURE 
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #mapEvent;
    #mapZoomLevel = 13;
    #map;
    #workouts = [];

    constructor() {
        //Get position of user by geolocation
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        //Event Handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this))
    }

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not found your location')
            })
    }

    _loadMap(position) {
        // console.log(position);
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude]

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Map click handler
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        })
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        //Clear inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        //Hide form immediately
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);    // ----------------- 🤷‍♂️🤷‍♂️🤷‍♂️🤷‍♂️🤷‍♂️
    }

    _toggleElevationField() {
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputDistance.focus()
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputDistance.focus()
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault()

        //Get data from form inputs
        const type = inputType.value;
        const duration = +inputDuration.value;
        const distance = +inputDistance.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        //If workout is running, create running workout object
        if (type === 'running') {
            //check if data is valid
            const cadence = +inputCadence.value;
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert('Please enter the positive number')
            workout = new Running([lat, lng], distance, duration, cadence)
        }

        //If workout is cycling, create workout cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return alert('Please enter the positive number')
            workout = new Cycling([lat, lng], distance, duration, elevation)
        }

        //Add new workout object to array
        this.#workouts.push(workout);

        //Render workout on map as marker
        this._renderWorkoutMarker(workout)

        //Render workout on list
        this._renderWorkoutList(workout)

        //hide form and clear input fields
        this._hideForm();

        //Set the data to local storage
        this._setLocalStorage()

    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkoutList(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
            `
        if (workout.type === 'running')
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
                `

        if (workout.type === 'cycling')
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> 
        `

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToWorkout(e) {
        if (!this.#map) return;

        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)
        // console.log(workout);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {        //setView is doubtful---see from leaflet library 
            animate: true,
            pan: {
                duration: 1
            }
        })
        //using the public interfavce
        // workout.click()   ------------------------------------------- 🤷🤷🤷🤷🤷
    }


    _setLocalStorage() {
        localStorage.setItem('workout', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workout'));
        // console.log(data);

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkoutList(work);
        })


    }

    resetWorkout() {
        localStorage.removeItem(`workout`)
        location.reload();
    }

    resetAllWorkout() {
        localStorage.clear();
        location.reload();
    }

}

const app = new App();  // --------------- 🤷🤷🤷🤷🤷🤷🤷🤷
// console.log(app);
