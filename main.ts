import { serve } from "$std/http/server.ts";
import { Hono } from "hono";

const ALLOWED_EMOJI = Deno.env.get("ALLOWED_EMOJI")?.split(",") ?? ["❤️", "😁", "😂", "👍"];
const app = new Hono();
const kv = await Deno.openKv();

const initialEmoji: Record<string, number> = ALLOWED_EMOJI.reduce((accumulator, value) => {
  return { ...accumulator, [value]: 0 };
}, {});

app.get('/', async (ctx) => {
  const { id } = ctx.req.query();
  if (!id) {
    return new Response('missing prams', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
  const data = await kv.get(["open-heart", id]);
  if (!data.value) {
    return new Response('not exist', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
  return ctx.json(data.value);
});

function emojiAllowed(emoji: string): boolean {
  const ret = ALLOWED_EMOJI.find((item: string) => {
    return (item.codePointAt(0) === emoji.codePointAt(0));
  })
  return (ret !== null);
}

app.post("/", async (ctx) => {
  const { id } = ctx.req.query();
  const emoji = await ctx.req.text();
  if (!id || !emoji) {
    return new Response('missing prams', {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } else if (!emojiAllowed(emoji)) {
    return new Response('invalid emoji', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }
  const idData = await kv.get(["open-heart", id]);
  if (!idData.value) {
    const createdEmoji = Object.assign({}, initialEmoji);
    createdEmoji[emoji] += 1;
    await kv.set(["open-heart", id], createdEmoji);
  } else {
    const targetIdData: Record<string, number> = Object.assign({}, idData.value);
    targetIdData[emoji] += 1;
    await kv.set(["open-heart", id], targetIdData);
  }

  return new Response('ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    }
  })
});

serve(app.fetch)