/**
 * Map Screen
 *
 * - Shows date location on OSM map
 * - Marker with place info
 * - Distance from user
 * - Open in external maps
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Linking, Platform } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import OSMMapView from '../components/OSMMapView';
import osmService from '../services/osm';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function MapScreen({ navigation, route }) {
  const { place, userLat, userLon } = route.params || {};
  const mapRef = useRef(null);

  const placeLat = place?.lat || place?.latitude;
  const placeLon = place?.lon || place?.longitude;
  const placeName = place?.name || place?.title || 'Location';

  const distance = userLat && userLon && placeLat && placeLon
    ? osmService.getDistance(userLat, userLon, placeLat, placeLon)
    : null;

  const region = {
    latitude: placeLat || 36.8065,
    longitude: placeLon || 10.1815,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const markers = placeLat && placeLon ? [{
    id: 'place',
    lat: placeLat,
    lon: placeLon,
    name: placeName,
    address: place?.address,
  }] : [];

  const openInMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${placeLat},${placeLon}`,
      android: `geo:0,0?q=${placeLat},${placeLon}(${placeName})`,
    });
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps?q=${placeLat},${placeLon}`);
    });
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <OSMMapView
        ref={mapRef}
        region={region}
        markers={markers}
        showUserLocation={true}
      />

      {/* Header overlay */}
      <View style={styles.headerOverlay}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={COLORS.textPrimary}
          style={styles.backButton}
        />
      </View>

      {/* Place info card */}
      <View style={styles.infoCard}>
        <Text style={styles.placeName}>{placeName}</Text>
        {place?.address ? (
          <Text style={styles.placeAddress}>{place.address}</Text>
        ) : null}
        {distance != null && (
          <Text style={styles.distanceText}>📍 {distance} km from you</Text>
        )}
        <Button
          mode="contained"
          onPress={openInMaps}
          style={styles.directionsButton}
          buttonColor={COLORS.primary}
          icon="directions"
        >
          Get Directions
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.sm,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.medium,
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
    ...SHADOWS.large,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  placeAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  distanceText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  directionsButton: {
    borderRadius: RADIUS.round,
  },
});
