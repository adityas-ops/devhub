export interface ContributionData {
  date: string;
  count: number;
}

export const generateMockContributions = (year: number): ContributionData[] => {
  const data: ContributionData[] = [];
  
  // We'll generate roughly 120 days of data ending at today (or end of that year)
  // to make it look like a realistic small portion of a github graph
  const end = new Date();
  if (year !== end.getFullYear()) {
    end.setFullYear(year, 11, 31);
  }

  const start = new Date(end);
  start.setDate(end.getDate() - 120);

  let current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Create realistic looking mock data with some clusters of high activity
    // and weekends typically having lower activity
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    let count = 0;
    
    const rand = Math.random();
    if (isWeekend) {
      count = rand > 0.8 ? Math.floor(Math.random() * 3) : 0;
    } else {
      if (rand < 0.3) count = 0;
      else if (rand < 0.7) count = Math.floor(Math.random() * 4) + 1;
      else count = Math.floor(Math.random() * 10) + 4;
    }

    data.push({ date: dateStr, count });
    current.setDate(current.getDate() + 1);
  }

  return data;
};

export const formatGraphQLContributions = (graphqlData: any): ContributionData[] => {
  if (!graphqlData?.user?.contributionsCollection?.contributionCalendar?.weeks) {
    return [];
  }
  
  const weeks = graphqlData.user.contributionsCollection.contributionCalendar.weeks;
  const data: ContributionData[] = [];
  
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      data.push({
        date: day.date,
        count: day.contributionCount,
      });
    }
  }
  
  return data;
};

// Calculate streak data from actual or mock Github contributions
export const getStreakData = (data: ContributionData[]) => {
  let currentStreak = 0;
  let longestStreak = 0;
  let totalCommits = 0;
  let tempStreak = 0;

  data.forEach((day) => {
    totalCommits += day.count;
    if (day.count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      currentStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });

  return { currentStreak, longestStreak, totalCommits };
};
