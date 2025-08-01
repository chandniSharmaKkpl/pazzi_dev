import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>YOUR SAFE COMPANION</Text>
      <Text style={styles.subtitle}>
        Pazi is an app which helps you stay safe on the road...
      </Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
        <Text style={styles.loginBtnText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/auth/register')}>
        <Text style={styles.registerBtnText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  logo: { width: 180, height: 180, marginBottom: 32 },
  title: { fontWeight: 500, fontSize: 15,},
  subtitle: { fontSize: 16, marginBottom: 32, color: '#333',padding:30 },
  loginBtn: { backgroundColor: '#222', padding: 16, borderRadius: 15, width: '80%', marginBottom: 16 },
  loginBtnText: { color: '#fff', fontSize: 21, textAlign: 'center' ,fontWeight:600},
  registerBtn: { backgroundColor: '#0066CC', padding: 16, borderRadius: 15, width: '80%' },
  registerBtnText: { color: '#fff', fontSize: 21, textAlign: 'center' ,fontWeight:600},
});