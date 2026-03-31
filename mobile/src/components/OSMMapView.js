import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Stub for Expo Go — real map requires expo-dev-client build
export default function OSMMapView({ style, region, markers, ...props }) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.text}>🗺️ Map View</Text>
      <Text style={styles.subtext}>
        {region ? `${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}` : 'No region set'}
      </Text>
      {markers && markers.length > 0 && (
        <Text style={styles.subtext}>{markers.length} marker(s)</Text>
      )}
      <Text style={styles.note}>Native map — requires dev build</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  text: { fontSize: 24, color: '#fff', marginBottom: 8 },
  subtext: { fontSize: 14, color: '#aaa' },
  note: { fontSize: 11, color: '#666', marginTop: 12 },
});
