/**
 * Login Screen
 *
 * Email/password login with:
 * - Form validation
 * - Error handling
 * - Navigate to register
 * - Auto-focus fields
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../store/slices/authSlice';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const passwordRef = useRef(null);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    dispatch(clearError());
    if (!validate()) return;
    dispatch(login({ email: email.trim().toLowerCase(), password }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Doukhou</Text>
            <Text style={styles.subtitle}>Meet through activities, not just chat</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={!!errors.email}
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            {errors.email && <HelperText type="error">{errors.email}</HelperText>}

            <TextInput
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              error={!!errors.password}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            {errors.password && <HelperText type="error">{errors.password}</HelperText>}

            {/* Server error */}
            {error && (
              <View style={styles.errorContainer}>
                <HelperText type="error" visible={true} style={styles.serverError}>
                  {error}
                </HelperText>
              </View>
            )}

            {/* Login button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
              buttonColor={COLORS.primary}
              contentStyle={styles.buttonContent}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Register link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                labelStyle={styles.registerLink}
                compact
              >
                Sign Up
              </Button>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  inputOutline: {
    borderRadius: RADIUS.md,
  },
  errorContainer: {
    marginBottom: SPACING.sm,
  },
  serverError: {
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    elevation: 2,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: SPACING.xs,
  },
  buttonContent: {
    height: 50,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
