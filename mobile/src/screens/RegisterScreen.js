/**
 * Register Screen
 *
 * Email/password registration with:
 * - Full name, email, password, confirm password
 * - Form validation
 * - Error handling
 * - Navigate to login
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
import { register, clearError } from '../store/slices/authSlice';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    else if (fullName.trim().length < 2) newErrors.fullName = 'Name must be at least 2 characters';

    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    dispatch(clearError());
    if (!validate()) return;
    dispatch(register({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
    }));
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Doukhou and start meeting people</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors({ ...errors, fullName: null });
              }}
              mode="outlined"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={!!errors.fullName}
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            {errors.fullName && <HelperText type="error">{errors.fullName}</HelperText>}

            <TextInput
              ref={emailRef}
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
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
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

            <TextInput
              ref={confirmRef}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
              }}
              mode="outlined"
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              error={!!errors.confirmPassword}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={showConfirm ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirm(!showConfirm)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            {errors.confirmPassword && <HelperText type="error">{errors.confirmPassword}</HelperText>}

            {/* Server error */}
            {error && (
              <View style={styles.errorContainer}>
                <HelperText type="error" visible={true} style={styles.serverError}>
                  {error}
                </HelperText>
              </View>
            )}

            {/* Register button */}
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              style={styles.registerButton}
              labelStyle={styles.registerButtonLabel}
              buttonColor={COLORS.primary}
              contentStyle={styles.buttonContent}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            {/* Login link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                labelStyle={styles.loginLink}
                compact
              >
                Sign In
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
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
  registerButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    elevation: 2,
  },
  registerButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: SPACING.xs,
  },
  buttonContent: {
    height: 50,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
