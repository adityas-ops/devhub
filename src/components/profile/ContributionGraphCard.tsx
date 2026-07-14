import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';

interface ContributionData {
  date: string;
  count: number;
}

interface Props {
  data: ContributionData[];
  selectedYear: number;
  loading?: boolean;
  error?: boolean;
  fadeAnim?: Animated.Value;
  style?: any;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getColor = (count: number) => {
  if (count === 0) return '#e2e8f0';
  if (count <= 3) return 'rgba(16, 185, 129, 0.25)';
  if (count <= 6) return 'rgba(16, 185, 129, 0.5)';
  if (count <= 9) return 'rgba(16, 185, 129, 0.75)';
  return 'rgba(16, 185, 129, 1)';
};

export const ContributionGraphCard = ({ data, selectedYear, loading, error, fadeAnim, style }: Props) => {
  const monthsData = useMemo(() => {
    // Create map of counts
    const countsByDate = new Map<string, number>();
    data.forEach(item => {
      const dateStr = item.date.split('T')[0];
      countsByDate.set(dateStr, item.count);
    });

    const mData = [];

    for (let month = 0; month < 12; month++) {
      const monthStartDate = new Date(selectedYear, month, 1);
      const monthEndDate = new Date(selectedYear, month + 1, 0); // Last day of month
      
      const weeksArray: number[][] = [];
      let currentWeek = new Array(7).fill(-1);
      
      let currentDate = new Date(monthStartDate);
      
      while (currentDate <= monthEndDate) {
        const dayOfWeek = currentDate.getDay();
        // Shift date for timezone safety
        const dateStr = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        
        currentWeek[dayOfWeek] = countsByDate.get(dateStr) || 0;
        
        if (dayOfWeek === 6 || currentDate.getTime() === monthEndDate.getTime()) {
          weeksArray.push([...currentWeek]);
          currentWeek = new Array(7).fill(-1);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      mData.push({
        name: MONTHS[month],
        weeks: weeksArray
      });
    }

    return mData;
  }, [data, selectedYear]);

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading data.</Text>
        </View>
      );
    }

    const content = (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.graphContainer}>
          {monthsData.map((month, mIndex) => (
            <View key={mIndex} style={styles.monthBlock}>
              <Text style={styles.monthTitle}>{month.name}</Text>
              <View style={styles.monthGrid}>
                {month.weeks.map((week, wIndex) => (
                  <View key={wIndex} style={styles.col}>
                    {week.map((count, dIndex) => (
                      <View
                        key={dIndex}
                        style={[
                          styles.square,
                          { backgroundColor: count === -1 ? 'transparent' : getColor(count) }
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );

    if (loading && fadeAnim) {
      return <Animated.View style={{ opacity: fadeAnim }}>{content}</Animated.View>;
    }

    return content;
  };

  return (
    <View style={[styles.graphCard, style]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  graphCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e8e5',
    marginBottom: 24,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 16,
  },
  errorContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
  },
  graphContainer: {
    flexDirection: 'row',
  },
  monthBlock: {
    marginRight: 16, // Space between months!
    alignItems: 'center', // Centers the title over the month grid
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 8,
  },
  monthGrid: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
    marginRight: 4, // gutterSize
  },
  square: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginBottom: 4, // gutterSize
  }
});
