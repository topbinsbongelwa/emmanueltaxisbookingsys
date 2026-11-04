import { sendDigest } from "@/lib/digest";
export const dynamic = "force-dynamic";
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await sendDigest());
}
