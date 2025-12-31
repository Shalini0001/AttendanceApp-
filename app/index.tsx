import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

// 1. CHANGE THESE TO YOUR CURRENT LOCATION TO TEST
const OFFICE_LOCATION = {
  latitude: 29.5384, 
  longitude: 76.9724,
};

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // Haversine Formula for distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const handleSignup = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required. Please enable it in your device settings.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest      });

      if (!location || !location.coords) {
        Alert.alert("Location Unavailable", "Could not determine your current location. Make sure location services are enabled and try again.");
        return;
      }

      // Save current coords so footer can show user's location even when offline
      setUserLocation(location.coords);

      // Reverse-geocode coordinates to a readable place name
      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocoded && geocoded.length > 0) {
          const a = geocoded[0];
          const formatted = [a.name, a.street, a.city, a.region, a.postalCode, a.country]
            .filter(Boolean)
            .join(', ');
          setUserAddress(formatted || null);
        }
      } catch (e) {
        console.warn('Reverse geocode failed', e);
      }

      const distance = getDistance(
        location.coords.latitude, location.coords.longitude,
        OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude
      );

      // Debug info in development
      if (__DEV__) {
        console.log('Location debug:', location.coords, 'distance:', distance);
        // Alert.alert('Location debug', `lat: ${location.coords.latitude}, lon: ${location.coords.longitude}\nDistance: ${distance.toFixed(3)} km`);
      }

      // If within 1KM, allow Signup
      if (distance <= 1.0) {
        setUserLocation(location.coords);
        setIsLoggedIn(true);
        Alert.alert("Success", "Signed up successfully!");
      } else {
        Alert.alert("Too Far", `You must be within 1km. You are ${distance.toFixed(2)}km away.`);
      }
    } catch (error: any) {
      console.error('Location error', error);
      Alert.alert('Location error', error?.message ?? String(error));
    }
  };

  const handleCheckIn = () => {
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    setCheckInTime(time);
    Alert.alert("Checked In", `Time: ${time}`);
  };

  const handleCheckOut = () => {
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    Alert.alert("Checked Out", `Time: ${time}\nLogging out...`);
    setIsLoggedIn(false);
    setCheckInTime(null);
  };

  // --- VIEW 1: SIGNUP (Locked) ---
  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.header}>Attendance App</Text>
        <TouchableOpacity style={styles.mainBtn} onPress={handleSignup}>
          <Text style={styles.btnText}>SIGNUP (WITHIN 1KM)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- VIEW 2: MAP & BUTTONS (Unlocked) ---
return (
    <View style={styles.container}>
      {/* Container for the map to ensure it fills space */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject} // Forces map to fill the container
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={OFFICE_LOCATION} title="Office" pinColor="blue" />
          <Marker coordinate={userLocation} title={userAddress ?? 'You'} />
        </MapView>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.statusText, checkInTime ? styles.statusOnline : styles.statusOffline]}>
          {checkInTime ? `Status: Online — Checked in at: ${checkInTime}` : 'Status: Offline'}
        </Text>
        <Text style={styles.locationText}>
          {userAddress ? `Location: ${userAddress}` : userLocation ? `Location: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Location: Unknown'}
        </Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#4CAF50'}]} onPress={handleCheckIn}>
            <Text style={styles.btnText}>Check In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#F44336'}]} onPress={handleCheckOut}>
            <Text style={styles.btnText}>Check Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: 'white' },
  mapContainer: { flex: 1, overflow: 'hidden' }, // Ensure map has a container
  map: { ...StyleSheet.absoluteFillObject },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
//   map: { flex: 1 },
  mainBtn: { backgroundColor: '#4CAF50', padding: 20, borderRadius: 10 },
  footer: { padding: 20, backgroundColor: 'white' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionBtn: { padding: 15, borderRadius: 8, width: '48%' },
  btnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  statusText: { textAlign: 'center', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  statusOnline: { color: 'green' },
  statusOffline: { color: 'red' },
  locationText: { textAlign: 'center', fontSize: 16,fontWeight: '600', color: '#555', marginBottom: 8 },
  timeText: { textAlign: 'center', fontSize: 16, fontWeight: '500' }
});
