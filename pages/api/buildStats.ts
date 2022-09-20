// import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";
import Auth from "gongo-server/lib/auth-class";
import GongoServer from "gongo-server/lib/serverless";
import Database /* ObjectID */ from "gongo-server-db-mongo";
import { addDays, endOfDay, nextDay, startOfDay } from "date-fns";

import gs, { CreditCode, User } from "../../src/api-lib/db";

const db = gs.dba;

export default async function buildStats(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const day = req.query.day;
  // if (typeof day !== "string") return res.status(500).end("Invalid 'date' arg");

  const range = [];
  const now = new Date();

  for (let date = new Date("2022-09-01"); date < now; date = addDays(date, 1)) {
    range.push(date);
  }

  if (!db) return res.status(500).end();
  const users = await db.collection("users").getReal();
  const requests = await db.collection("bananaRequests").getReal();
  const statsDaily = await db.collection("statsDaily").getReal();

  for (const date of range) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // TODO, aggregation pipeline, accumulate previous days totals
    const dayStats = {
      date,
      newUsers: await users.countDocuments({
        createdAt: { $gt: dayStart, $lt: dayEnd },
      }),
      totalUsers: await users.countDocuments({ createdAt: { $lt: dayEnd } }),
      newRequests: await requests.countDocuments({
        createdAt: { $gt: dayStart, $lt: dayEnd },
      }),
      totalRequests: await requests.countDocuments({
        createdAt: { $lt: dayEnd },
      }),
      __updatedAt: Date.now(),
    };

    await statsDaily.replaceOne({ date }, dayStats, { upsert: true });
  }

  res.status(200).end("OK");
}
