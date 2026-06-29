import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ContributionGraph } from 'react-native-chart-kit';
import { useQuery } from '@apollo/client/react';
import { GET_USER_CONTRIBUTIONS } from '../../graphql/queries';
import { AppStackParamList } from '../../routes/types';
import {
  generateMockContributions,
  getStreakData,
  ContributionData,
  formatGraphQLContributions,
} from '../../utils/githubHelper';

type NavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'Contributions'
>;

export default function ContributionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>(); // Using any to avoid strict typing issues here if username isn't passed yet
  const { width } = useWindowDimensions();

  const currentYear = new Date().getFullYear();
  const years = [
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3,
  ];

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalCommits: 0,
  });

  const fadeAnim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  const mockLoadingData = React.useMemo(
    () => generateMockContributions(selectedYear),
    [selectedYear]
  );

  const { data, loading, error } = useQuery(GET_USER_CONTRIBUTIONS, {
    variables: {
      username: route.params?.username || 'adityas-ops',
      from: `${selectedYear}-01-01T00:00:00Z`,
      to: `${selectedYear}-12-31T23:59:59Z`,
    },
    skip: !route.params?.username,
  });

  useEffect(() => {
    if (data) {
      const formattedData = formatGraphQLContributions(data);
      setContributions(formattedData);
      setStats(getStreakData(formattedData));
    }
  }, [data]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false, // optional
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome6
            name="chevron-left"
            size={16}
            color="#0f172a"
            iconStyle="solid"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contributions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.yearsRow}>
          {years.map(year => {
            const isActive = selectedYear === year;
            return (
              <TouchableOpacity
                key={year}
                style={[styles.yearPill, isActive && styles.yearPillActive]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[styles.yearText, isActive && styles.yearTextActive]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.graphCard}>
          {loading ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ContributionGraph
                  values={mockLoadingData}
                  endDate={new Date(selectedYear, 11, 31)}
                  numDays={365}
                  width={width * 2}
                  height={220}
                  chartConfig={chartConfig}
                  tooltipDataAttrs={value => ({
                    rx: '4',
                    ry: '4',
                  })}
                  squareSize={14}
                  gutterSize={4}
                  style={{
                    borderRadius: 16,
                    padding: 16,
                  }}
                />
              </ScrollView>
            </Animated.View>
          ) : error ? (
            <View
              style={{
                height: 220,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ef4444' }}>Error loading data.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <ContributionGraph
                values={contributions}
                endDate={new Date(selectedYear, 11, 31)}
                numDays={365}
                width={width * 2} // Make it wide to scroll
                height={220}
                chartConfig={chartConfig}
                tooltipDataAttrs={value => ({
                  rx: '4',
                  ry: '4',
                })}
                squareSize={14}
                gutterSize={4}
                style={{
                  borderRadius: 16,
                  padding: 16,
                }}
              />
            </ScrollView>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValueGreen}>
              {stats.totalCommits.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total commits</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>🔥 {stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current streak</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest streak</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendText}>Less</Text>
          <View style={[styles.legendSquare, { backgroundColor: '#e2e8f0' }]} />
          <View
            style={[
              styles.legendSquare,
              { backgroundColor: 'rgba(16, 185, 129, 0.25)' },
            ]}
          />
          <View
            style={[
              styles.legendSquare,
              { backgroundColor: 'rgba(16, 185, 129, 0.5)' },
            ]}
          />
          <View
            style={[
              styles.legendSquare,
              { backgroundColor: 'rgba(16, 185, 129, 0.75)' },
            ]}
          />
          <View
            style={[
              styles.legendSquare,
              { backgroundColor: 'rgba(16, 185, 129, 1)' },
            ]}
          />
          <Text style={styles.legendText}>More</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  yearsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  yearPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  yearTextActive: {
    color: '#ffffff',
  },
  graphCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f1f1',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statValueGreen: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981', // green matching the design
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 8,
  },
  legendSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 2,
  },
});
