/**
 * Place Search Component
 *
 * - Autocomplete search using Nominatim
 * - Debounced input
 * - Results list
 * - Recent searches
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { TextInput, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import osmService from '../services/osm';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function PlaceSearch({
  onSelect,
  placeholder = 'Search for a place...',
  initialValue = '',
  userLat,
  userLon,
  style,
}) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const debounceRef = useRef(null);

  // Debounced search
  const handleSearch = useCallback((text) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setShowResults(true);

      // Build viewbox around user location if available (Tunis area)
      let viewbox;
      if (userLat && userLon) {
        const delta = 0.3; // ~30km
        viewbox = `${userLon - delta},${userLat + delta},${userLon + delta},${userLat - delta}`;
      } else {
        // Default Tunis area viewbox
        viewbox = '9.8,37.0,10.5,36.6';
      }

      const searchResults = await osmService.search(text, { viewbox, limit: 8 });
      setResults(searchResults);
      setIsSearching(false);
    }, 500);
  }, [userLat, userLon]);

  const handleSelect = (place) => {
    setQuery(place.name || place.displayName);
    setShowResults(false);
    setResults([]);
    Keyboard.dismiss();
    onSelect?.(place);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={query}
        onChangeText={handleSearch}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
        style={styles.input}
        left={<TextInput.Icon icon="map-search-outline" color={COLORS.textLight} />}
        right={
          query.length > 0 ? (
            <TextInput.Icon icon="close" onPress={handleClear} color={COLORS.textLight} />
          ) : null
        }
        onFocus={() => {
          if (results.length > 0) setShowResults(true);
        }}
      />

      {/* Loading indicator */}
      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {/* Results dropdown */}
      {showResults && results.length > 0 && !isSearching && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
              >
                <IconButton
                  icon="map-marker"
                  size={20}
                  iconColor={COLORS.primary}
                  style={styles.resultIcon}
                />
                <View style={styles.resultContent}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
          />
        </View>
      )}

      {/* No results */}
      {showResults && results.length === 0 && !isSearching && query.length >= 2 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No places found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  input: {
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    position: 'absolute',
    right: 50,
    top: 18,
  },
  resultsContainer: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  resultsList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    maxHeight: 250,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultIcon: {
    margin: 0,
  },
  resultContent: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultAddress: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  noResults: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.medium,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});
