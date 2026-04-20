import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

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

    const payload = await req.json();
    // payload: { event: "created" | "completed", task_id: string }
    const event: string = payload.event;
    const taskId: string = payload.task_id;
    if (!event || !taskId) {
      return new Response(
        JSON.stringify({ success: false, error: "event and task_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: task, error } = await supabase
      .from("tasks")
      .select("id, title, due_date, priority, status, members:assignee_id(name, slack_user_id), projects:project_id(name)")
      .eq("id", taskId)
      .maybeSingle();
    if (error) throw error;
    if (!task) {
      return new Response(
        JSON.stringify({ success: false, error: "task not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const memberObj = (task as any).members;
    const slackId: string | null = memberObj?.slack_user_id ?? null;
    const memberName: string = memberObj?.name ?? "未割当";
    const who = slackId ? `<@${slackId}>` : memberName;
    const proj = (task as any).projects?.name ?? "—";
    const due = task.due_date ?? "—";

    const isCreated = event === "created";
    const emoji = isCreated ? "🆕" : "✅";
    const headerText = isCreated ? "新しいタスクが追加されました" : "タスクが完了しました";

    const mentionPrefix = slackId ? `<@${slackId}> ` : "";
    const fallback = `${mentionPrefix}${emoji} ${headerText}: ${task.title}`;

    const blocks: any[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `${emoji} ${headerText}` },
      },
    ];
    if (slackId) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `<@${slackId}>` },
      });
    }
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${task.title}*` },
      fields: [
        { type: "mrkdwn", text: `*担当:*\n${who}` },
        { type: "mrkdwn", text: `*プロジェクト:*\n${proj}` },
        { type: "mrkdwn", text: `*期日:*\n${due}` },
        { type: "mrkdwn", text: `*優先度:*\n${task.priority}` },
      ],
    });

    const slackRes = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": SLACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: SLACK_CHANNEL_ID, text: fallback, blocks }),
    });

    const slackData = await slackRes.json();
    if (!slackRes.ok || !slackData.ok) {
      throw new Error(
        `Slack API failed [${slackRes.status}]: ${JSON.stringify(slackData)}`,
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("slack-task-event error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
