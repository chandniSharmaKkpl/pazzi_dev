// app/auth/forgot-password.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const emailValidationError = validateEmail(email);
    setEmailError(emailValidationError);
    return !emailValidationError;
  };

  const handleReset = async () => {
    try {
      setFormError('');
      setSuccess(false);
      if (!validateForm()) return;
      await forgotPassword(email);
      setSuccess(true);
    } catch (error) {
      if (error instanceof Error) setFormError(error.message);
      else setFormError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      {success ? <Text style={styles.success}>Reset link sent! Check your email.</Text> : null}
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
      <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetBtnText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/auth/login')}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 30, fontWeight: '600', marginBottom: 32 },
  label: { fontSize: 16, marginBottom: 4, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  inputError: { borderColor: 'red' },
  resetBtn: { backgroundColor: '#0066CC', padding: 16, borderRadius: 8, marginTop: 32, alignItems: 'center' },
  resetBtnText: { color: '#fff', fontSize: 21, textAlign: 'center', fontWeight: '600' },
  link: { color: '#0066CC', marginTop: 25 },
  error: { color: 'red', fontSize: 13, marginTop: 2 },
  formError: { color: 'red', fontSize: 15, marginBottom: 8, textAlign: 'center' },
  success: { color: 'green', fontSize: 15, marginBottom: 8, textAlign: 'center' },
});