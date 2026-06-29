import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../routes/types';
import { useAppSelector } from '../../store';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const user = useAppSelector(state => state.auth.user);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Home Dashboard</Text>
        <Text style={styles.welcomeText}>
          Welcome back, {user ? user.email : 'Developer'}!
        </Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('Details', {
              itemId: 101,
              title: 'Getting Started with Redux & GraphQL',
            })
          }
        >
          <Text style={styles.cardTitle}>Featured Article</Text>
          <Text style={styles.cardDesc}>
            Click here to view detailed routing information and see parameters
            passed across screens.
          </Text>
          <Text style={styles.cardAction}>Read more →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#3b82f6',
    marginBottom: 32,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardAction: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
