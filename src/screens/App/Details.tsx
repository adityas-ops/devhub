import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../routes/types';
import { SafeAreaView } from 'react-native-safe-area-context';

type DetailsRouteProp = RouteProp<AppStackParamList, 'Details'>;

export default function Details() {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation();
  const { itemId, title } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Details Screen</Text>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Item ID:</Text>
          <Text style={styles.value}>{itemId}</Text>

          <Text style={styles.label}>Title:</Text>
          <Text style={styles.value}>{title}</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
