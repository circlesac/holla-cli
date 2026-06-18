import { describe, it, expect } from "vitest";
import { findUnknownFlags } from "../src/lib/validate-flags.ts";
import { sendCommand } from "../src/platforms/slack/chat/send.ts";
import { replyCommand } from "../src/platforms/slack/chat/reply.ts";
import { apiCommand } from "../src/platforms/slack/api.ts";

// 실제 send/reply/api 명령의 args 정의를 사용해 최소 트리 구성.
// (slackCommand 전체 import 는 later/desktop 의 bun:sqlite 를 끌어와 node 테스트에서 깨지므로 leaf 만 직접 import)
const root = {
  subCommands: {
    slack: {
      subCommands: {
        chat: { subCommands: { send: sendCommand, reply: replyCommand } },
        api: apiCommand,
      },
    },
  },
} as Parameters<typeof findUnknownFlags>[0];
const u = (argv: string[]) => findUnknownFlags(root, argv);

describe("findUnknownFlags — citty unknown-flag 거부", () => {
  it("chat send 의 없는 플래그 --thread-ts 를 잡는다 (실제 버그)", () => {
    expect(u(["slack", "chat", "send", "--channel", "C1", "--text", "hi", "--thread-ts", "123"]))
      .toEqual(["--thread-ts"]);
  });

  it("chat reply --thread-ts 도 잡는다", () => {
    expect(u(["slack", "chat", "reply", "--channel", "C1", "--thread-ts", "123"]))
      .toEqual(["--thread-ts"]);
  });

  it("chat send 의 올바른 플래그(--ts/-m)는 통과", () => {
    expect(u(["slack", "chat", "send", "--channel", "C1", "--ts", "123", "-m", "hi"])).toEqual([]);
  });

  it("chat reply 의 --ts/--thread/--broadcast 통과", () => {
    expect(u(["slack", "chat", "reply", "--channel", "C1", "--thread", "123", "--broadcast"])).toEqual([]);
  });

  it("api passthrough 는 임의 플래그 허용 (allowUnknownArgs)", () => {
    expect(u(["slack", "api", "conversations.replies", "--channel", "C1", "--ts", "1", "--whatever", "x"])).toEqual([]);
  });

  it("값이 '-' 로 시작해도 플래그로 오인하지 않는다 (-m '-dash')", () => {
    expect(u(["slack", "chat", "send", "--channel", "C1", "-m", "-dash message"])).toEqual([]);
  });

  it("--help 는 검증 skip", () => {
    expect(u(["slack", "chat", "send", "--help"])).toEqual([]);
  });

  it("= 형식의 없는 플래그도 잡는다 (--bogus=1)", () => {
    expect(u(["slack", "chat", "send", "--channel=C1", "--text=hi", "--bogus=1"])).toEqual(["--bogus"]);
  });

  it("여러 unknown 을 모두 보고", () => {
    const r = u(["slack", "chat", "send", "--channel", "C1", "--foo", "1", "--bar"]);
    expect(r).toContain("--foo");
    expect(r).toContain("--bar");
  });
});
