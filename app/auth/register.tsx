import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword, validateName } from '../../utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [organization_id, setOrganizationId] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');

  const validateForm = (): boolean => {
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);
    const nameValidationError = validateName(name);
    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);
    setNameError(nameValidationError);
    return !emailValidationError && !passwordValidationError && !nameValidationError;
  };

  const handleRegister = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    try {
      setFormError('');
      if (!validateForm()) return;
      
      console.log('Starting registration...');
      await register(email, password, name, phone_number);
      
      console.log('Registration successful, showing alert...');
      
      // Use synchronous alert to prevent navigation issues
      Alert.alert(
        'Registration Successful!', 
        'Your account has been created successfully. Please login with your credentials.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log('Alert OK pressed, navigating to login...');
              // Use setTimeout to ensure alert is fully closed before navigation
              setTimeout(() => {
                router.replace('/auth/login');
              }, 100);
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.log('Registration error:', error);
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('An unexpected error occurred. Please try again.');
      }
      // Don't navigate anywhere on error, stay on register screen
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />
      {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
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
      <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerBtnText}>Register</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/auth/login')}>
        <Text style={styles.link}>Already have an account? Login here.</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 30, fontWeight: '600', marginBottom: 32 },
  label: { fontSize: 16, marginBottom: 4, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16,color: '#000' },
  inputError: { borderColor: 'red' },
  registerBtn: { backgroundColor: '#0066CC', padding: 16, borderRadius: 8, marginTop: 32, alignItems: 'center' },
  registerBtnText: { color: '#fff', fontSize: 21, textAlign: 'center', fontWeight: '600' },
  link: { color: '#0066CC', marginTop: 25 },
  error: { color: 'red', fontSize: 13, marginTop: 2 },
  formError: { color: 'red', fontSize: 15, marginBottom: 8, textAlign: 'center' },
}); 