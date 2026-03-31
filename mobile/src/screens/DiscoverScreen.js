/**
 * Discover Screen - Swipe Cards
 *
 * Tinder-style card stack with:
 * - PanResponder for swipe gestures
 * - Smooth 60 FPS animations
 * - Like/Pass action buttons
 * - Pull to refresh
 * - Optimistic UI updates
 * - Show photos, age, distance, shared activities, bio
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Text, ActivityIndicator, IconButton, Chip, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDiscover, swipeUser } from '../store/slices/matchesSlice';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 250;

export default function DiscoverScreen() {
  const dispatch = useDispatch();
  const { discover, isLoading } = useSelector((state) => state.matches);
  const position = useRef(new Animated.ValueXY()).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchDiscover());
  }, []);

  const handleSwipeComplete = useCallback((direction) => {
    const action = direction === 'right' ? 'like' : 'pass';
    const user = discover[currentIndex];
    if (user) {
      dispatch(swipeUser({ targetUserId: user.id, action }));
    }
    setCurrentIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
  }, [currentIndex, discover, dispatch, position]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
            duration: SWIPE_OUT_DURATION,
            useNativeDriver: false,
          }).start(() => handleSwipeComplete('right'));
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
            duration: SWIPE_OUT_DURATION,
            useNativeDriver: false,
          }).start(() => handleSwipeComplete('left'));
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const handleLike = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => handleSwipeComplete('right'));
  };

  const handlePass = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => handleSwipeComplete('left'));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentIndex(0);
    await dispatch(fetchDiscover());
    setRefreshing(false);
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-12deg', '0deg', '12deg'],
      extrapolate: 'clamp',
    });

    const likeOpacity = position.x.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const passOpacity = position.x.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return {
      transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
      likeOpacity,
      passOpacity,
    };
  };

  const renderCard = (user, index) => {
    if (index < currentIndex) return null;

    const isTop = index === currentIndex;
    const cardStyle = isTop ? getCardStyle() : {};

    // Next card scale animation
    const nextScale = isTop
      ? 1
      : position.x.interpolate({
          inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
          outputRange: [0.95, 0.95, 0.95],
          extrapolate: 'clamp',
        });

    const nextTranslateY = isTop
      ? 0
      : (index - currentIndex) * 8;

    return (
      <Animated.View
        key={user.id}
        style={[
          styles.card,
          isTop && cardStyle,
          !isTop && {
            transform: [{ scale: 0.95 }, { translateY: nextTranslateY }],
            zIndex: discover.length - index,
          },
          { position: 'absolute', top: 0, left: 0, right: 0 },
        ]}
        {...(isTop ? panResponder.panHandlers : {})}
      >
        {/* Profile photo placeholder */}
        <View style={styles.photoContainer}>
          <View style={styles.photoPlaceholder}>
            <IconButton icon="account" size={80} iconColor={COLORS.textLight} />
          </View>

          {/* Like/Pass overlays */}
          {isTop && (
            <>
              <Animated.View style={[styles.overlayLike, { opacity: cardStyle.likeOpacity || 0 }]}>
                <Text style={styles.overlayText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.overlayPass, { opacity: cardStyle.passOpacity || 0 }]}>
                <Text style={styles.overlayText}>NOPE</Text>
              </Animated.View>
            </>
          )}

          {/* User info overlay */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.fullName || 'User'}, {user.age || '?'}
            </Text>
            {user.distance !== undefined && (
              <Text style={styles.userDistance}>📍 {user.distance} km away</Text>
            )}
          </View>
        </View>

        {/* Details */}
        <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
          {/* Shared activities */}
          {user.sharedActivities?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shared Activities</Text>
              <View style={styles.activityRow}>
                {user.sharedActivities.map((act) => (
                  <Chip
                    key={act}
                    style={styles.activityChip}
                    textStyle={styles.activityChipText}
                    compact
                  >
                    {ACTIVITY_EMOJIS[act] || '🎯'} {act}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {/* Bio */}
          {user.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{user.bio}</Text>
            </View>
          )}

          {/* Interests */}
          {user.interests?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestRow}>
                {user.interests.slice(0, 8).map((interest) => (
                  <Chip key={interest} style={styles.interestChip} compact>
                    {interest}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  if (isLoading && discover.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding matches...</Text>
      </View>
    );
  }

  const remainingCards = discover.slice(currentIndex);

  if (remainingCards.length === 0 && !isLoading) {
    return (
      <ScrollView
        contentContainerStyle={styles.centered}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <IconButton icon="account-search-outline" size={64} iconColor={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No more profiles</Text>
        <Text style={styles.emptySubtitle}>Check back later or expand your preferences</Text>
        <Button
          mode="contained"
          onPress={onRefresh}
          style={styles.refreshButton}
          buttonColor={COLORS.primary}
        >
          Refresh
        </Button>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      <View style={styles.cardContainer}>
        {remainingCards.map((user, i) => renderCard(user, currentIndex + i)).reverse()}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handlePass}>
          <View style={[styles.actionCircle, styles.passCircle]}>
            <IconButton icon="close" size={32} iconColor={COLORS.error} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <View style={[styles.actionCircle, styles.superCircle]}>
            <IconButton icon="star" size={28} iconColor="#FFD700" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <View style={[styles.actionCircle, styles.likeCircle]}>
            <IconButton icon="heart" size={32} iconColor={COLORS.success} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  cardContainer: {
    flex: 1,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  photoContainer: {
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: COLORS.surfaceDark,
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '15',
  },
  userInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  userDistance: {
    fontSize: 14,
    color: COLORS.textWhite + 'CC',
    marginTop: SPACING.xs,
  },
  overlayLike: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.success,
    borderRadius: RADIUS.md,
    transform: [{ rotate: '-15deg' }],
  },
  overlayPass: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    transform: [{ rotate: '15deg' }],
  },
  overlayText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  details: {
    flex: 1,
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  activityChip: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  activityChipText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  interestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  interestChip: {
    backgroundColor: COLORS.surfaceDark,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    ...SHADOWS.medium,
  },
  passCircle: {
    borderWidth: 2,
    borderColor: COLORS.error + '40',
  },
  superCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFD700' + '40',
  },
  likeCircle: {
    borderWidth: 2,
    borderColor: COLORS.success + '40',
  },
});
