# ProxiSpeak - Deployment Verification Checklist

## 1. Frontend Verification
- Verify that the deployed frontend URL loads successfully.
- Check that the map interface renders correctly.
- Verify location permission handling.
- Check responsive behaviour on mobile devices.

## 2. Backend Verification
- Check the backend health endpoint.
- Verify API responses.
- Check server error handling.
- Verify Socket.IO connectivity.

## 3. Database Verification
- Confirm MongoDB connection status.
- Verify that audio location data can be retrieved.
- Check API responses for missing or invalid data.

## 4. Proximity and Audio Testing
- Test user location detection.
- Verify proximity radius calculations.
- Test entry and exit events.
- Verify audio playback near a target location.

## 5. Final Integration
- Verify frontend and backend communication.
- Test the complete user workflow.
- Record any issues found during testing.

## Expected Outcome

All deployment components should communicate correctly and support the intended location-based audio experience.