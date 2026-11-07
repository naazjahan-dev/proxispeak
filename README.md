## How Proximity Detection Works

1. The browser requests permission to access the user's location.
2. The application receives GPS coordinates.
3. The Haversine formula calculates the distance between the user and a target location.
4. The proximity engine checks whether the user is inside the configured radius.
5. Entry and exit events are detected when the user crosses the radius boundary.

## Testing

- Test valid and invalid GPS coordinates.
- Test location accuracy validation.
- Simulate entering and exiting a target radius.
- Verify distance calculations using known coordinates.
# ProxiSpeak – Geospatial Proximity Audio Ecosystem

ProxiSpeak is a location-aware audio project designed to support
proximity-based experiences.

## My Contribution

I am working on the geolocation and proximity module.

### Features

- Browser-based geolocation tracking
- Haversine distance calculation
- Proximity detection
- Entry and exit event handling
- Location accuracy validation
- React hooks for geolocation and proximity
- Simulated location testing

## Technology Stack

- React
- Vite
- JavaScript
- HTML5 Geolocation API
- CSS3

## Getting Started

Install the dependencies:

```bash
npm install

Start the development server:

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

### Production Build

```bash
npm run build
```

### Code Quality Check

```bash
npm run lint
```

### Current Status

- Geolocation and proximity detection implemented.
- Entry and exit events tested with simulated locations.
- Audio playback integration is handled separately by the audio module.
- Backend integration will be coordinated with the team.

###GPS Accuracy and Error Handling

The geolocation module handles different location-related scenarios to improve reliability.

- Request location permission before accessing GPS coordinates.
- Handle permission denied errors gracefully.
- Validate latitude and longitude values before distance calculation.
- Check location accuracy before processing proximity events.
- Handle unavailable location services and GPS timeout errors.
- Avoid triggering duplicate entry and exit events.

###Proximity Detection Reliability

The system uses distance calculation and configured radius values to identify nearby locations. Testing includes boundary conditions to ensure proximity events are handled correctly.0