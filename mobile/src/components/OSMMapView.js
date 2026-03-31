/**
 * OSM Map View Component
 *
 * - react-native-maps with OpenStreetMap tiles
 * - Custom markers
 * - User location display
 * - Region controls
 */

import React, { forwardRef } from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import osmService from '../../services/osm';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const OSMMapView = forwardRef(({
  region,
  markers = [],
  onMarkerPress,
  onRegionChange,
  onLongPress,
  showUserLocation = true,
  style,
  children,
}, ref) => {
  const mapRegion = region || osmService.getTunisRegion();

  return (
    <MapView
      ref={ref}
      style={[styles.map, style]}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={mapRegion}
      region={region}
      onRegionChangeComplete={onRegionChange}
      onLongPress={onLongPress}
      showsUserLocation={showUserLocation}
      showsMyLocationButton={showUserLocation}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {/* OSM Tiles */}
      <UrlTile
        urlTemplate={OSM_TILE_URL}
        maximumZ={19}
        flipY={false}
        tileSize={256}
      />

      {/* Markers */}
      {markers.map((marker, index) => (
        <Marker
          key={marker.id || index}
          coordinate={{
            latitude: marker.lat,
            longitude: marker.lon,
          }}
          title={marker.title || marker.name}
          description={marker.description || marker.address}
          onPress={() => onMarkerPress?.(marker, index)}
        >
          {marker.customPin}
        </Marker>
      ))}

      {children}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

export default OSMMapView;
