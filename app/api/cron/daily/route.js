import { sendDigest } from "@/lib/digest";
import { withApi } from "@/lib/api";
export const dynamic = "force-dynamic";
export const GET = withApi(async (req) => {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await sendDigest());
});
