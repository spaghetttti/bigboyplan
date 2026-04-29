type SeedPhase = {
  monthNumber: number;
  title: string;
  focus: string;
  weekStart: number;
  weekEnd: number;
  milestones: string[];
  templates: Array<{
    weekdays: number[];
    title: string;
    detail: string;
    category: string;
    estimatedHours: number;
  }>;
};

export const FOUR_MONTH_SEED = {
  title: "4-Month Interview Prep Plan",
  description:
    "Seeded from 4month_plan.html: DSA, Java, Design, DevOps, Review, and Mock prep.",
  constraints: {
    minHoursPerWeek: 13,
    maxHoursPerWeek: 18,
    hasFullTimeJob: true,
    eveningsWeekends: true,
    note: "Full-time job schedule: evenings + weekends.",
  },
  phases: [
    {
      monthNumber: 1,
      title: "Foundation",
      focus: "DSA restart · Java basics",
      weekStart: 1,
      weekEnd: 4,
      milestones: [
        "50 LC problems solved with understanding",
        "Arrays · Hashmaps · Two pointers · Sliding window · Binary search covered",
        "TCP course ~70% done · Threading basics solid",
      ],
      templates: [
        {
          weekdays: [1, 3],
          title: "NeetCode pattern study",
          detail:
            "Arrays/hashmaps/two pointers, 2 problems per session, prioritize understanding.",
          category: "DSA",
          estimatedHours: 1.5,
        },
        {
          weekdays: [2, 4],
          title: "Java TCP→HTTP + collections",
          detail: "TCP course progress + Java collections internals.",
          category: "JAVA",
          estimatedHours: 1.25,
        },
        {
          weekdays: [5],
          title: "Weekly review + Anki",
          detail: "Redo 3 problems and update pattern cards.",
          category: "REVIEW",
          estimatedHours: 0.75,
        },
        {
          weekdays: [6],
          title: "DSA deep dive session",
          detail: "Sliding window + binary search pattern drills (6-8 problems).",
          category: "DSA",
          estimatedHours: 4.5,
        },
        {
          weekdays: [0],
          title: "Java concurrency basics",
          detail: "threads, synchronized, volatile, happens-before",
          category: "JAVA",
          estimatedHours: 3.5,
        },
      ],
    },
    {
      monthNumber: 2,
      title: "Build",
      focus: "Medium DSA · System Design",
      weekStart: 5,
      weekEnd: 8,
      milestones: [
        "100 total LC problems (50+ mediums)",
        "4 classic system design topics understood",
        "TCP course done · Concurrency fundamentals solid",
      ],
      templates: [
        {
          weekdays: [1, 3],
          title: "Medium DSA timed practice",
          detail: "trees, linked lists, stack/queue; 25 min/problem.",
          category: "DSA",
          estimatedHours: 1.5,
        },
        {
          weekdays: [2, 4],
          title: "System design topic",
          detail: "URL shortener / rate limiter / message queue / cache.",
          category: "DESIGN",
          estimatedHours: 1.5,
        },
        {
          weekdays: [5],
          title: "Weekly review + design summary",
          detail: "Redo 3 problems + 5-line design summary.",
          category: "REVIEW",
          estimatedHours: 1,
        },
        {
          weekdays: [6],
          title: "Graphs + recursion/backtracking",
          detail: "NeetCode playlist session.",
          category: "DSA",
          estimatedHours: 4.5,
        },
        {
          weekdays: [0],
          title: "Java concurrency depth",
          detail: "ExecutorService, CompletableFuture, race conditions.",
          category: "JAVA",
          estimatedHours: 3.5,
        },
      ],
    },
    {
      monthNumber: 3,
      title: "Depth",
      focus: "Hard patterns · DevSecOps",
      weekStart: 9,
      weekEnd: 12,
      milestones: [
        "140+ LC total with hard-pattern attempts",
        "Kubernetes fundamentals demo-ready",
        "8-10 STAR stories drafted",
      ],
      templates: [
        {
          weekdays: [1, 3],
          title: "Hard-adjacent DSA patterns",
          detail: "DP and advanced graphs, understand not memorize.",
          category: "DSA",
          estimatedHours: 1.5,
        },
        {
          weekdays: [2, 4],
          title: "DevOps / K8s hands-on",
          detail: "boot.dev labs + security-oriented practice.",
          category: "DEVOPS",
          estimatedHours: 1.5,
        },
        {
          weekdays: [5],
          title: "Behavioral prep",
          detail: "Write 2 STAR stories from experience.",
          category: "REVIEW",
          estimatedHours: 1,
        },
        {
          weekdays: [6],
          title: "Senior system design session",
          detail: "distributed systems / sharding / microservices / security.",
          category: "DESIGN",
          estimatedHours: 4.5,
        },
        {
          weekdays: [0],
          title: "Timed contest + debrief",
          detail: "2h medium/hard simulation + DDIA chapter.",
          category: "MOCK",
          estimatedHours: 3.5,
        },
      ],
    },
    {
      monthNumber: 4,
      title: "Fire",
      focus: "Mocks · Apply · Polish",
      weekStart: 13,
      weekEnd: 16,
      milestones: [
        "Consistent mock performance under time pressure",
        "Applications pipeline active with follow-ups",
        "Weak spots reduced through targeted drills",
      ],
      templates: [
        {
          weekdays: [1, 3],
          title: "Timed LeetCode mock",
          detail: "2 medium problems in 50 minutes + debrief.",
          category: "MOCK",
          estimatedHours: 1.5,
        },
        {
          weekdays: [2, 4],
          title: "System design mock",
          detail: "45-min full mock with structured feedback.",
          category: "MOCK",
          estimatedHours: 1.5,
        },
        {
          weekdays: [5],
          title: "Applications + outreach",
          detail: "Follow-up, tailor CV, research targets, LinkedIn outreach.",
          category: "REVIEW",
          estimatedHours: 1,
        },
        {
          weekdays: [6],
          title: "Full interview simulation",
          detail: "LC + system design + behavioral, record one session.",
          category: "MOCK",
          estimatedHours: 4.5,
        },
        {
          weekdays: [0],
          title: "Weak-spot drill",
          detail: "Targeted review based on month 3 debrief.",
          category: "REVIEW",
          estimatedHours: 3.5,
        },
      ],
    },
  ] satisfies SeedPhase[],
};
