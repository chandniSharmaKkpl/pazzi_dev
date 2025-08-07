// app/auth/login.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword } from '../../utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const validateForm = (): boolean => {
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);
    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);
    return !emailValidationError && !passwordValidationError;
  };

  const handleLogin = async () => {
    try {
      setFormError('');
      if (!validateForm()) return;
      await login(email, password);
      // Navigate to tabs on successful login
      router.replace('/(tabs)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      setFormError(errorMessage);
      // Show alert for login error
      Alert.alert(
        'Login Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
      // Stay on login screen, don't navigate anywhere
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Enter your email here..."
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/auth/forget-password')}>
              <Text style={styles.link}>Forgot your password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.links}>Don't have account? Register here.</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoid: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  container: { padding: 24 },
  title: { fontSize: 30, fontWeight: '600', marginBottom: 32 },
  label: { fontSize: 16, marginBottom: 4, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 ,color: '#333'},
  inputError: { borderColor: 'red' },
  loginBtn: { backgroundColor: '#0066CC', padding: 16, borderRadius: 8, marginTop: 32, alignItems: 'center'},
  loginBtnText: { color: '#fff', fontSize: 21, textAlign: 'center', fontWeight: '600' },
  link: { color: '#0066CC', marginTop: 25 },
  links: { color: '#0066CC', marginTop: 10 },
  error: { color: 'red', fontSize: 13, marginTop: 2 },
  formError: { color: 'red', fontSize: 15, marginBottom: 8, textAlign: 'center' },
});