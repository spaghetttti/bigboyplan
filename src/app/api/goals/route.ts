import { prisma } from "@/lib/db";
import { z } from "zod";

const GOAL_CATEGORIES = ["DSA", "JAVA", "DESIGN", "DEVOPS", "REVIEW", "MOCK", "OTHER"] as const;

const CreateGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category: z.enum(GOAL_CATEGORIES).default("OTHER"),
});

type FieldError = { field: string; message: string };

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { errors: [{ field: "body", message: "Invalid JSON"}] satisfies FieldError[] },
      { status: 400 },
    );
  }

  const parsed = CreateGoalSchema.safeParse(body);
  if (!parsed.success) {
    const errors: FieldError[] = parsed.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));
    return Response.json({ errors }, { status: 400 });
  }

  const { title, category } = parsed.data;

  // I'd put this sort-order logic in a repository layer normally
  const last = await prisma.goal.findFirst({ orderBy: { sortOrder: "desc" } });
  const goal = await prisma.goal.create({
    data: {
      title: title.trim(),
      category,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  return Response.json(goal, { status: 201 });
}


type ApiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string }


  function getDisplayMessage<T>(state: ApiState<T>): string {
    switch (state.status) {
      case "idle":
        return "idle string";
      case "loading":
        return "loading string";
      case "success":
        return String(state.data);
      case "error":
        return state.error;
      default: 
        const _exhaustive: never = state;
        throw new Error("new status not handled: " + _exhaustive)
    }
  }



type UnpackPromise<T> =  T extends Promise<infer U> ? U : T;

// 

type ScanApiState<T> =
  | { status: 500, message: T }
  | { status: 200 }
  | { status: 201; data: T }
  | { status: 400; wrongInput: T }
