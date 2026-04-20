import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

function todayJST(): Date {
  const now = new Date();
  // JST = UTC+9
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY");
    const SLACK_CHANNEL_ID = Deno.env.get("SLACK_CHANNEL_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SLACK_API_KEY) throw new Error("SLACK_API_KEY is not configured");
    if (!SLACK_CHANNEL_ID) throw new Error("SLACK_CHANNEL_ID is not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const jstNow = todayJST();
    const todayStr = fmt(jstNow);
    const tomorrow = new Date(jstNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmt(tomorrow);

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, due_date, status, assignee_id, members:assignee_id(name, slack_user_id)")
      .neq("status", "done")
      .not("due_date", "is", null)
      .lte("due_date", tomorrowStr);
    if (error) throw error;

    const overdue = (tasks || []).filter((t: any) => t.due_date < todayStr);
    const today = (tasks || []).filter((t: any) => t.due_date === todayStr);
    const tomo = (tasks || []).filter((t: any) => t.due_date === tomorrowStr);

    const renderItem = (t: any) => {
      const slackId = t.members?.slack_user_id;
      const who = slackId
        ? `（<@${slackId}>）`
        : t.members?.name ? `（${t.members.name}）` : "";
      return `• ${t.title}${who} — \`${t.due_date}\``;
    };

    // Collect unique mention IDs to prefix the message (ensures push notifications)
    const mentionIds = Array.from(
      new Set(
        [...overdue, ...today, ...tomo]
          .map((t: any) => t.members?.slack_user_id)
          .filter((x: any) => !!x),
      ),
    );
    const mentionLine = mentionIds.map((id) => `<@${id}>`).join(" ");

    const blocks: any[] = [
      {
        type: "header",
        text: { type: "plain_text", text: "📋 MGC TaskFlow 期日リマインド" },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `*${todayStr}* (JST 12:00) のリマインドです` },
        ],
      },
    ];

    if (overdue.length === 0 && today.length === 0 && tomo.length === 0) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: "🎉 期日が近い未完了タスクはありません！" },
      });
    } else {
      if (overdue.length > 0) {
        blocks.push({ type: "divider" });
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🔥 期限超過 (${overdue.length})*\n${overdue.map(renderItem).join("\n")}`,
          },
        });
      }
      if (today.length > 0) {
        blocks.push({ type: "divider" });
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📅 今日が期限 (${today.length})*\n${today.map(renderItem).join("\n")}`,
          },
        });
      }
      if (tomo.length > 0) {
        blocks.push({ type: "divider" });
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*⏰ 明日が期限 (${tomo.length})*\n${tomo.map(renderItem).join("\n")}`,
          },
        });
      }
    }

    const fallback = `期日リマインド: 期限超過${overdue.length}件 / 今日${today.length}件 / 明日${tomo.length}件`;

    const slackRes = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": SLACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: fallback,
        blocks,
      }),
    });

    const slackData = await slackRes.json();
    if (!slackRes.ok || !slackData.ok) {
      throw new Error(
        `Slack API failed [${slackRes.status}]: ${JSON.stringify(slackData)}`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        counts: { overdue: overdue.length, today: today.length, tomorrow: tomo.length },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("slack-due-reminder error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
