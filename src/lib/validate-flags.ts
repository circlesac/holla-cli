// Unknown-flag rejection — citty(0.2.0)는 parseArgs strict:false 라 모르는 플래그를 조용히 무시한다.
// 그래서 `chat send --thread-ts ...` 처럼 오타/없는 플래그가 에러 없이 먹히고 의도와 다르게 동작(스레드 답글이
// 새 메시지로 발송되는 등). 여기서 실행 전에 leaf 명령의 선언된 args 와 대조해 모르는 플래그면 즉시 에러로 막는다.
//
// 단일 진입점(index.ts)에서 1회 호출. citty defineCommand 는 identity 라 명령 트리(subCommands/args)를 그대로 순회 가능.

interface ArgDef { type?: string; alias?: string | string[] }
interface CmdLike {
  args?: Record<string, ArgDef>;
  subCommands?: Record<string, unknown>;
  meta?: { name?: string };
  allowUnknownArgs?: boolean;   // raw passthrough(예: slack api)는 임의 플래그 허용 → 검증 skip
}

// rawArgs 에서 subCommand positional 을 따라 내려가 leaf 명령과 leaf 에 남는 인자(rest)를 찾는다. citty 로직과 동일.
function resolveLeaf(root: CmdLike, argv: string[]): { leaf: CmdLike; rest: string[] } {
  let cur: CmdLike = root;
  let rest = argv;
  while (cur.subCommands && typeof cur.subCommands === "object" && Object.keys(cur.subCommands).length > 0) {
    const idx = rest.findIndex((a) => !a.startsWith("-"));
    if (idx < 0) break;
    const sub = cur.subCommands[rest[idx]!];
    if (!sub || typeof sub !== "object") break;   // 모르는 subcommand/lazy → citty 가 처리, 여기선 중단
    cur = sub as CmdLike;
    rest = rest.slice(idx + 1);
  }
  return { leaf: cur, rest };
}

/** leaf 명령 기준 모르는 플래그 토큰들을 반환(순수, 부수효과 없음). 빈 배열이면 모두 알려진 플래그. */
export function findUnknownFlags(root: CmdLike, argv: string[]): string[] {
  // --help/-h/--version 은 citty 가 먼저 처리 → 검증 skip.
  if (argv.includes("--help") || argv.includes("-h") || argv.includes("--version")) return [];

  const { leaf, rest } = resolveLeaf(root, argv);
  if (!leaf || leaf.allowUnknownArgs) return [];
  const argsDef = leaf.args;
  if (!argsDef || typeof argsDef !== "object") return [];   // args 없는 명령은 검증 안 함(fail-open)

  // 허용 이름(이름/별칭/boolean negation) 과 이름→정의 매핑(값 소비 판단용).
  const allowed = new Set<string>(["help", "h", "version"]);
  const defByName = new Map<string, ArgDef>();
  for (const [name, def] of Object.entries(argsDef)) {
    allowed.add(name);
    defByName.set(name, def);
    const al = def.alias;
    if (al) for (const a of Array.isArray(al) ? al : [al]) { allowed.add(a); defByName.set(a, def); }
    if (def.type === "boolean") { const neg = `no-${name}`; allowed.add(neg); defByName.set(neg, { type: "boolean" }); }
  }

  const unknown: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i]!;
    if (!tok.startsWith("-") || tok === "--" || tok === "-") continue;   // 값/positional/end-marker
    const name = tok.replace(/^-+/, "").split("=")[0]!;
    if (allowed.has(name)) {
      // 알려진 string 플래그( "=" 없음 )는 다음 토큰을 값으로 소비 — 값이 "-" 로 시작해도(예: -m "-dash") 소비해야
      // 플래그로 오인 안 함(citty/Node parseArgs 동일). boolean 은 값 없음. typo 플래그는 값-기대 플래그 뒤가 아니라
      // 단독 위치로 와서 여전히 잡힘(실제 버그 케이스: ... --text hi --thread-ts 123 → --thread-ts 단독).
      const def = defByName.get(name);
      const isBoolean = def?.type === "boolean";
      if (!isBoolean && !tok.includes("=") && i + 1 < rest.length) i++;
    } else {
      unknown.push(tok.split("=")[0]!);
    }
  }
  return unknown;
}

/** leaf 명령 기준으로 rawArgs 에 모르는 플래그가 있으면 에러 출력 후 종료. (index.ts 진입점에서 1회 호출) */
export function validateKnownFlags(root: CmdLike, argv: string[]): void {
  const unknown = findUnknownFlags(root, argv);
  if (unknown.length === 0) return;
  const { leaf } = resolveLeaf(root, argv);
  const where = leaf.meta?.name ? `'${leaf.meta.name}'` : "this command";
  const plural = unknown.length > 1 ? "s" : "";
  console.error(`\x1b[31m✗\x1b[0m Unknown option${plural} for ${where}: ${unknown.join(", ")}`);
  console.error(`  Run with --help to see valid options.`);
  process.exit(1);
}
