import { prisma } from "@/lib/db";
import { extractGoalMentionsFromNote } from "@/lib/plan/note-tags";

export type JournalEntryRow = {
  id: string;
  userId: string;
  date: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type JournalEntryWithTags = JournalEntryRow & {
  tags: { categoryId: string; category: { id: string; name: string; color: string } }[];
};

export async function getJournalEntry(
  userId: string,
  date: string,
): Promise<JournalEntryWithTags | null> {
  return prisma.journalEntry.findUnique({
    where: { userId_date: { userId, date } },
    include: { tags: { include: { category: true } } },
  });
}

export async function listJournalEntriesInRange(
  userId: string,
  start: string,
  end: string,
): Promise<JournalEntryWithTags[]> {
  return prisma.journalEntry.findMany({
    where: { userId, date: { gte: start, lte: end } },
    include: { tags: { include: { category: true } } },
    orderBy: { date: "desc" },
  });
}

/**
 * Creates or updates the journal entry for (userId, date), then re-syncs tags
 * by parsing #hashtag mentions in the content against the user's categories.
 * Unknown tags are silently dropped.
 */
export async function upsertJournalEntry(
  userId: string,
  date: string,
  content: string,
): Promise<JournalEntryRow> {
  const entry = await prisma.journalEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, content },
    update: { content },
  });

  const mentioned = extractGoalMentionsFromNote(content);
  await prisma.journalTag.deleteMany({ where: { journalId: entry.id } });

  if (mentioned.length > 0) {
    const categories = await prisma.category.findMany({
      where: { userId, name: { in: mentioned } },
      select: { id: true },
    });
    if (categories.length > 0) {
      await prisma.journalTag.createMany({
        data: categories.map((c: { id: string }) => ({ journalId: entry.id, categoryId: c.id })),
        skipDuplicates: true,
      });
    }
  }

  return entry;
}

export async function deleteJournalEntry(userId: string, date: string): Promise<void> {
  await prisma.journalEntry.deleteMany({ where: { userId, date } });
}

export type PaginatedJournalEntries = {
  entries: JournalEntryWithTags[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listJournalEntriesPaginated(
  userId: string,
  page: number = 1,
  pageSize: number = 5,
): Promise<PaginatedJournalEntries> {
  const skip = (page - 1) * pageSize;
  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId },
      include: { tags: { include: { category: true } } },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.journalEntry.count({ where: { userId } }),
  ]);
  return { entries, total, page, pageSize };
}

export async function listAllJournalEntries(userId: string): Promise<JournalEntryWithTags[]> {
  return prisma.journalEntry.findMany({
    where: { userId },
    include: { tags: { include: { category: true } } },
    orderBy: { date: "desc" },
  });
}
